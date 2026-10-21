# Testes da integração financeira da rota interna da Viber (etapa 4,
# lote B3b): reserva durável antes de gerar, fechamento com usage real
# ou conservador, pausa imposta no servidor, replay de UUID, bloqueios,
# prazos de tempo e contagem oficial de tokens. Nenhuma chamada paga à
# OpenAI: SDK e contagem são simulados em todos os casos.
import asyncio
import json
import os
import tempfile
import unittest
import uuid
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import httpx
import openai
from fastapi.testclient import TestClient

from src.contagem import ContagemIndisponivelError, contar_tokens_entrada
from src.orcamento import (
    calcular_custo_micros,
    calcular_reserva_micros,
    carregar,
    inicializar,
    salvar,
)
from src.viber import slot_geracao
from src.main import app

from test_viber import _cliente_falso, _evento_sdk

TOKEN_TESTE = "token-interno-orcamento-xyz"
CONTAGEM_TESTE = 100


class BaseRotaOrcamentoTests(unittest.TestCase):
    """Base com orçamento temporário, contagem simulada e cliente HTTP."""

    url = "/internal/v1/viber/responses"

    def setUp(self):
        self._token_anterior = os.environ.get("VIBER_INTERNAL_TOKEN")
        os.environ["VIBER_INTERNAL_TOKEN"] = TOKEN_TESTE
        slot_geracao.liberar()
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.caminho = Path(self._tmp.name) / "budget.json"
        self._caminho_anterior = os.environ.get("VIBER_BUDGET_PATH")
        os.environ["VIBER_BUDGET_PATH"] = str(self.caminho)
        inicializar(self.caminho)
        self._chave_anterior = os.environ.get("OPENAI_API_KEY")
        os.environ["OPENAI_API_KEY"] = "sk-teste-fake-sem-rede"
        contagem = patch(
            "src.api.viber.contar_tokens_entrada",
            new=AsyncMock(return_value=CONTAGEM_TESTE),
        )
        contagem.start()
        self.addCleanup(contagem.stop)
        import src.orcamento as orcamento_mod

        orcamento_mod._BLOQUEIO_MEMORIA = None
        self.cliente_teste = TestClient(app)

    def tearDown(self):
        if self._token_anterior is None:
            os.environ.pop("VIBER_INTERNAL_TOKEN", None)
        else:
            os.environ["VIBER_INTERNAL_TOKEN"] = self._token_anterior
        if self._caminho_anterior is None:
            os.environ.pop("VIBER_BUDGET_PATH", None)
        else:
            os.environ["VIBER_BUDGET_PATH"] = self._caminho_anterior
        if self._chave_anterior is None:
            os.environ.pop("OPENAI_API_KEY", None)
        else:
            os.environ["OPENAI_API_KEY"] = self._chave_anterior
        import src.orcamento as orcamento_mod

        orcamento_mod._BLOQUEIO_MEMORIA = None
        slot_geracao.liberar()

    def _cabecalhos(self):
        return {"X-Viber-Internal-Token": TOKEN_TESTE}

    def _corpo(self, **extras):
        corpo = {
            "clientRequestId": str(uuid.uuid4()),
            "message": "O que é o VERS?",
            "history": [],
            "explain": False,
        }
        corpo.update(extras)
        return corpo

    def _eventos_sse(self, texto):
        eventos = []
        for bloco in texto.split("\n\n"):
            nome = None
            linhas_dados = []
            for linha in bloco.splitlines():
                if linha.startswith("event: "):
                    nome = linha[len("event: "):]
                elif linha.startswith("data: "):
                    linhas_dados.append(linha[len("data: "):])
            if nome is not None and linhas_dados:
                eventos.append((nome, json.loads("\n".join(linhas_dados))))
        return eventos

    def _consumir_stream(self, cliente_falso, corpo):
        # Executa o POST em streaming com o cliente falso injetado e
        # devolve (status, headers, texto SSE).
        with patch("src.api.viber._obter_cliente", return_value=cliente_falso):
            with self.cliente_teste.stream(
                "POST", self.url, headers=self._cabecalhos(), json=corpo
            ) as resposta:
                status = resposta.status_code
                cabecalhos = dict(resposta.headers)
                texto = "".join(linha + "\n" for linha in resposta.iter_lines())
        return status, cabecalhos, texto

    def _fluxo_completo(self, cliente_falso, corpo=None):
        corpo = corpo or self._corpo()
        status, _, texto = self._consumir_stream(cliente_falso, corpo)
        return corpo, status, texto


class FechamentoFinanceiroTests(BaseRotaOrcamentoTests):
    """Fechamento da reserva com usage real, conservador ou ausente."""

    def _cliente_completed(self, usage=None):
        campos = {}
        if usage is not None:
            campos["response"] = SimpleNamespace(
                usage=SimpleNamespace(
                    input_tokens=usage[0], output_tokens=usage[1]
                )
            )
        else:
            campos["response"] = SimpleNamespace(usage=None)
        return _cliente_falso(
            eventos=[
                _evento_sdk("response.output_text.delta", delta="Olá"),
                _evento_sdk("response.completed", **campos),
            ]
        )

    def test_fechamento_com_usage_cobra_custo_real(self):
        # Reserva de 100 tokens = 13.500 micros; usage (2.000, 100) custa
        # 13.000 — cabe na reserva e a diferença é liberada.
        cliente = self._cliente_completed(usage=(2000, 100))
        corpo, status, texto = self._fluxo_completo(cliente)
        self.assertEqual(status, 200)
        orcamento = carregar(self.caminho)
        self.assertEqual(orcamento.consumo, calcular_custo_micros(2000, 100))
        self.assertEqual(orcamento.reservas, {})
        self.assertIn(corpo["clientRequestId"], orcamento.tentativas_encerradas)
        self.assertIsNotNone(orcamento.proxima_admissao)

    def test_completed_sem_usage_conserva_reserva_inteira(self):
        cliente = self._cliente_completed(usage=None)
        _, status, _ = self._fluxo_completo(cliente)
        self.assertEqual(status, 200)
        orcamento = carregar(self.caminho)
        self.assertEqual(
            orcamento.consumo, calcular_reserva_micros(CONTAGEM_TESTE)
        )

    def test_erro_apos_inicio_conserva_reserva(self):
        falha = openai.APIConnectionError(
            request=httpx.Request("POST", "http://openai.local")
        )
        cliente = _cliente_falso(
            eventos=[_evento_sdk("response.output_text.delta", delta="x")],
            erro_iteracao=falha,
        )
        _, status, texto = self._fluxo_completo(cliente)
        self.assertIn("UPSTREAM_UNAVAILABLE", texto)
        orcamento = carregar(self.caminho)
        self.assertEqual(
            orcamento.consumo, calcular_reserva_micros(CONTAGEM_TESTE)
        )

    def test_falha_antes_de_enviar_libera_reserva(self):
        falha = openai.APIConnectionError(
            request=httpx.Request("POST", "http://openai.local")
        )
        cliente = _cliente_falso(erro_criacao=falha)
        _, status, _ = self._fluxo_completo(cliente)
        self.assertEqual(status, 503)
        orcamento = carregar(self.caminho)
        self.assertEqual(orcamento.reservas, {})
        self.assertEqual(orcamento.consumo, 0)
        self.assertIsNone(orcamento.proxima_admissao)

    def test_reserva_ja_gravada_quando_a_geracao_abre(self):
        # Nenhuma chamada OpenAI começa antes da persistência da reserva.
        orcamento_no_momento = {}

        def ao_criar():
            orcamento_no_momento.update(carregar(self.caminho).reservas)

        cliente = _cliente_falso(
            eventos=[
                _evento_sdk(
                    "response.completed",
                    response=SimpleNamespace(usage=None),
                ),
            ],
            ao_criar=ao_criar,
        )
        corpo, _, _ = self._fluxo_completo(cliente)
        self.assertIn(corpo["clientRequestId"], orcamento_no_momento)

    def test_usage_acima_da_reserva_bloqueia_futuras_geracoes(self):
        cliente = self._cliente_completed(usage=(999_999, 400))
        _, status, texto = self._fluxo_completo(cliente)
        # A tentativa atual é entregue; o bloqueio vale para as próximas.
        self.assertIn("event: completed", texto)
        orcamento = carregar(self.caminho)
        self.assertIsNotNone(orcamento.bloqueio)
        cliente2 = self._cliente_completed(usage=(10, 10))
        with patch("src.api.viber._obter_cliente", return_value=cliente2):
            resposta = self.cliente_teste.post(
                self.url, headers=self._cabecalhos(), json=self._corpo()
            )
        self.assertEqual(resposta.status_code, 503)
        self.assertEqual(cliente2.chamadas, [])


class TravaEBloqueiosTests(BaseRotaOrcamentoTests):
    """Saldo, pausa, replay e bloqueios impostos no servidor."""

    def test_saldo_insuficiente_retorna_503_sem_gerar(self):
        # Recria o arquivo com teto menor que uma reserva de 100 tokens.
        self.caminho.unlink()
        inicializar(self.caminho, teto=1_000)
        cliente = _cliente_falso(
            eventos=[
                _evento_sdk(
                    "response.completed",
                    response=SimpleNamespace(usage=None),
                ),
            ]
        )
        with patch("src.api.viber._obter_cliente", return_value=cliente):
            resposta = self.cliente_teste.post(
                self.url, headers=self._cabecalhos(), json=self._corpo()
            )
        self.assertEqual(resposta.status_code, 503)
        self.assertEqual(cliente.chamadas, [])

    def test_pausa_apos_geracao_retorna_429_com_retry_after(self):
        cliente = _cliente_falso(
            eventos=[
                _evento_sdk(
                    "response.completed",
                    response=SimpleNamespace(usage=None),
                ),
            ]
        )
        _, status, _ = self._fluxo_completo(cliente)
        self.assertEqual(status, 200)
        resposta = self.cliente_teste.post(
            self.url, headers=self._cabecalhos(), json=self._corpo()
        )
        self.assertEqual(resposta.status_code, 429)
        retry_after = int(resposta.headers["retry-after"])
        self.assertGreaterEqual(retry_after, 1)
        self.assertLessEqual(retry_after, 10)

    def test_uuid_encerrado_retorna_409_sem_replay(self):
        cliente = _cliente_falso(
            eventos=[
                _evento_sdk(
                    "response.completed",
                    response=SimpleNamespace(usage=None),
                ),
            ]
        )
        corpo = self._corpo()
        _, status, _ = self._fluxo_completo(cliente, corpo)
        self.assertEqual(status, 200)
        # Reenvio do mesmo UUID: 409 mesmo durante a pausa (replay antes
        # da checagem de pausa), sem nova geração paga.
        resposta = self.cliente_teste.post(
            self.url, headers=self._cabecalhos(), json=corpo
        )
        self.assertEqual(resposta.status_code, 409)

    def test_bloqueio_persistido_retorna_503(self):
        orcamento = carregar(self.caminho)
        orcamento.bloqueio = "reconciliação pendente"
        salvar(self.caminho, orcamento)
        resposta = self.cliente_teste.post(
            self.url, headers=self._cabecalhos(), json=self._corpo()
        )
        self.assertEqual(resposta.status_code, 503)

    def test_arquivo_de_orcamento_ausente_retorna_503(self):
        os.environ["VIBER_BUDGET_PATH"] = str(self.caminho.parent / "sumiu.json")
        resposta = self.cliente_teste.post(
            self.url, headers=self._cabecalhos(), json=self._corpo()
        )
        self.assertEqual(resposta.status_code, 503)

    def test_contagem_falha_retorna_503_sem_reserva(self):
        with patch(
            "src.api.viber.contar_tokens_entrada",
            new=AsyncMock(side_effect=ContagemIndisponivelError("sem contagem")),
        ):
            resposta = self.cliente_teste.post(
                self.url, headers=self._cabecalhos(), json=self._corpo()
            )
        self.assertEqual(resposta.status_code, 503)
        self.assertEqual(carregar(self.caminho).reservas, {})

    def test_contagem_acima_do_teto_retorna_400_sem_reserva(self):
        with patch(
            "src.api.viber.contar_tokens_entrada",
            new=AsyncMock(return_value=12_001),
        ):
            resposta = self.cliente_teste.post(
                self.url, headers=self._cabecalhos(), json=self._corpo()
            )
        self.assertEqual(resposta.status_code, 400)
        self.assertEqual(carregar(self.caminho).reservas, {})


class PrazosTests(BaseRotaOrcamentoTests):
    """Timeouts de texto inicial e total encerram a falha com error."""

    class IteradorLento:
        def __init__(self, eventos, atraso_inicial=0.0, atraso=0.0, infinito=False):
            self._eventos = list(eventos)
            self._atraso_inicial = atraso_inicial
            self._atraso = atraso
            self._infinito = infinito
            self._primeiro = True

        def __aiter__(self):
            return self

        async def __anext__(self):
            if self._primeiro:
                self._primeiro = False
                if self._atraso_inicial:
                    await asyncio.sleep(self._atraso_inicial)
            elif self._atraso:
                await asyncio.sleep(self._atraso)
            if self._eventos:
                return self._eventos.pop(0)
            if self._infinito:
                return _evento_sdk("response.output_text.delta", delta="x")
            raise StopAsyncIteration

    class ClienteLento:
        def __init__(self, iterador):
            self._iterador = iterador
            self.chamadas = []
            self.responses = self

        async def create(self, **kwargs):
            self.chamadas.append(kwargs)
            return self._iterador

    def test_texto_inicial_tardio_emite_error_e_conserva(self):
        iterador = self.IteradorLento(
            [_evento_sdk("response.output_text.delta", delta="tarde")],
            atraso_inicial=1.0,
        )
        cliente = self.ClienteLento(iterador)
        with patch("src.api.viber.TEMPO_TEXTO_INICIAL_SEG", 0.05):
            _, status, texto = self._fluxo_completo(cliente)
        self.assertEqual(status, 200)
        eventos = self._eventos_sse(texto)
        self.assertEqual([nome for nome, _ in eventos][0], "started")
        self.assertEqual(eventos[-1][0], "error")
        orcamento = carregar(self.caminho)
        self.assertEqual(
            orcamento.consumo, calcular_reserva_micros(CONTAGEM_TESTE)
        )

    def test_tempo_total_tardio_emite_error_e_conserva(self):
        iterador = self.IteradorLento(
            [_evento_sdk("response.output_text.delta", delta="x")],
            atraso=0.06,
            infinito=True,
        )
        cliente = self.ClienteLento(iterador)
        with patch("src.api.viber.TEMPO_TOTAL_SEG", 0.15):
            _, status, texto = self._fluxo_completo(cliente)
        self.assertEqual(status, 200)
        eventos = self._eventos_sse(texto)
        self.assertEqual(eventos[-1][0], "error")
        orcamento = carregar(self.caminho)
        self.assertEqual(
            orcamento.consumo, calcular_reserva_micros(CONTAGEM_TESTE)
        )


class DesconexaoTests(BaseRotaOrcamentoTests):
    """Cancelamento local após o envio não devolve saldo incerto."""

    def test_desconexao_no_meio_conserva_reserva(self):
        cliente = _cliente_falso(
            eventos=[
                _evento_sdk("response.output_text.delta", delta="parcial"),
                _evento_sdk("response.output_text.delta", delta=" demais"),
                _evento_sdk(
                    "response.completed",
                    response=SimpleNamespace(usage=None),
                ),
            ]
        )
        with patch("src.api.viber._obter_cliente", return_value=cliente):
            with self.cliente_teste.stream(
                "POST", self.url, headers=self._cabecalhos(), json=self._corpo()
            ) as resposta:
                # Lê só o início e derruba a conexão (cancelamento).
                next(resposta.iter_lines())
        orcamento = carregar(self.caminho)
        self.assertEqual(
            orcamento.consumo, calcular_reserva_micros(CONTAGEM_TESTE)
        )


class ContagemOficialTests(unittest.TestCase):
    """Unidade da contagem oficial de tokens de entrada (mock de rede)."""

    def _cliente(self, resposta=None, excecao=None):
        async def post(*args, **kwargs):
            if excecao is not None:
                raise excecao
            return resposta

        return SimpleNamespace(post=post)

    def test_lista_de_tokens_contada(self):
        cliente = self._cliente(
            resposta=httpx.Response(200, json={"tokens": [1, 2, 3, 4, 5]})
        )
        quantidade = asyncio.run(
            contar_tokens_entrada(cliente, [{"role": "user", "content": "oi"}])
        )
        self.assertEqual(quantidade, 5)

    def test_usage_total_tokens_aceito(self):
        cliente = self._cliente(
            resposta=httpx.Response(200, json={"usage": {"total_tokens": 42}})
        )
        quantidade = asyncio.run(contar_tokens_entrada(cliente, []))
        self.assertEqual(quantidade, 42)

    def test_status_diferente_de_200_bloqueia(self):
        cliente = self._cliente(resposta=httpx.Response(404, json={}))
        with self.assertRaises(ContagemIndisponivelError):
            asyncio.run(contar_tokens_entrada(cliente, []))

    def test_formato_desconhecido_bloqueia(self):
        cliente = self._cliente(resposta=httpx.Response(200, json={"outra": 1}))
        with self.assertRaises(ContagemIndisponivelError):
            asyncio.run(contar_tokens_entrada(cliente, []))

    def test_excecao_de_rede_bloqueia(self):
        cliente = self._cliente(excecao=httpx.ConnectError("sem rede"))
        with self.assertRaises(ContagemIndisponivelError):
            asyncio.run(contar_tokens_entrada(cliente, []))


if __name__ == "__main__":
    unittest.main()
