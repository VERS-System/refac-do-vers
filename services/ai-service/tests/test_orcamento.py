# Testes do módulo de orçamento da Viber (etapa 4 do roadmap, lote B3a).
# Cobrem aritmética em milionésimos, inicialização explícita pelo operador,
# persistência durável e atômica, admissão sob trava, pausa, fechamento
# conservador de reservas e bloqueios. Nenhuma chamada ao provedor: o
# módulo não conhece rede, HTTP nem o provedor. Tarifas do Gemini
# (plano 09-migracao-gemini): entrada 1, saída 3 micros por token.
import json
import math
import os
import tempfile
import unittest
import uuid
from pathlib import Path
from unittest.mock import patch

from src.orcamento import (
    CAMINHO_PADRAO,
    MARGEM_TECNICA_MICROS,
    PAUSA_SEGUNDOS,
    PRECO_ENTRADA_MICROS,
    PRECO_SAIDA_MICROS,
    TETO_PADRAO_MICROS,
    VERSAO_FORMATO,
    GravacaoFalhouError,
    OrcamentoError,
    OrcamentoIndisponivelError,
    PausaAtivaError,
    ReservaExcedidaError,
    SaldoInsuficienteError,
    TentativaRepetidaError,
    carregar,
    calcular_custo_micros,
    calcular_reserva_micros,
    caminho_orcamento,
    fechar_reserva,
    inicializar,
    liberar,
    reservar,
    salvar,
    verificar_admissao,
)


class AritmeticaTests(unittest.TestCase):
    """Aritmética de custo e reserva em milionésimos de dólar."""

    def test_constantes_do_contrato(self):
        self.assertEqual(TETO_PADRAO_MICROS, 10_000_000)
        self.assertEqual(PRECO_ENTRADA_MICROS, 1)
        self.assertEqual(PRECO_SAIDA_MICROS, 3)
        self.assertEqual(MARGEM_TECNICA_MICROS, 1_000)
        self.assertEqual(VERSAO_FORMATO, 1)

    def test_custo_exato_do_cenario_de_referencia(self):
        # 2.000 entrada × 1 + 200 saída × 3 = 2.600 milionésimos
        # (US$0,0026; entrada real US$0,50/M arredondada para cima).
        self.assertEqual(calcular_custo_micros(2000, 200), 2_600)

    def test_custo_usa_inteiros_sem_float(self):
        self.assertIsInstance(calcular_custo_micros(1, 1), int)
        self.assertEqual(calcular_custo_micros(1, 1), 4)

    def test_reserva_inclui_saida_inteira_e_margem(self):
        # Entrada 2.000 × 1 + saída teto 400 × 3 + margem 1.000 = 4.200.
        self.assertEqual(calcular_reserva_micros(2000), 4_200)


class BaseTemporariaTests(unittest.TestCase):
    """Cria um diretório temporário isolado para cada teste."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.caminho = Path(self._tmp.name) / "budget.json"


class InicializacaoTests(BaseTemporariaTests):
    """Inicialização explícita pelo operador (sem reset automático)."""

    def test_init_cria_arquivo_zerado(self):
        orc = inicializar(self.caminho)
        self.assertEqual(orc.consumo, 0)
        self.assertEqual(orc.reservas, {})
        self.assertEqual(orc.teto, TETO_PADRAO_MICROS)
        self.assertEqual(orc.modelo, "gemini-3-flash-preview")
        self.assertIsNone(orc.bloqueio)
        self.assertTrue(self.caminho.exists())

    def test_init_preenche_apresentacao_unica(self):
        orc = inicializar(self.caminho)
        self.assertTrue(orc.apresentacao)
        uuid.UUID(orc.apresentacao)

    def test_init_dois_vezes_nao_reseta(self):
        inicializar(self.caminho)
        with self.assertRaises(OrcamentoIndisponivelError):
            inicializar(self.caminho)

    def test_init_com_teto_customizado(self):
        orc = inicializar(self.caminho, teto=1_000)
        self.assertEqual(orc.teto, 1_000)

    def test_init_cria_diretorios_pais(self):
        alvo = Path(self._tmp.name) / "a" / "b" / "budget.json"
        orc = inicializar(alvo)
        self.assertTrue(alvo.exists())
        self.assertEqual(orc.teto, TETO_PADRAO_MICROS)


class PersistenciaTests(BaseTemporariaTests):
    """Leitura, gravação atômica e validação do arquivo durável."""

    def _roundtrip(self, **campos):
        orc = inicializar(self.caminho)
        for nome, valor in campos.items():
            setattr(orc, nome, valor)
        salvar(self.caminho, orc)
        return carregar(self.caminho)

    def test_roundtrip_preserva_estado(self):
        carimbado = self._roundtrip(consumo=12_345)
        self.assertEqual(carimbado.consumo, 12_345)
        self.assertEqual(carimbado.teto, TETO_PADRAO_MICROS)

    def test_arquivo_ausente_bloqueia_sem_resetar(self):
        with self.assertRaises(OrcamentoIndisponivelError):
            carregar(self.caminho)

    def test_arquivo_corrompido_bloqueia(self):
        self.caminho.write_bytes(b"{{{lixo")
        with self.assertRaises(OrcamentoIndisponivelError):
            carregar(self.caminho)

    def test_versao_desconhecida_bloqueia(self):
        orc = inicializar(self.caminho)
        dados = orc.para_dict()
        dados["versao"] = 99
        self.caminho.write_text(json.dumps(dados), encoding="utf-8")
        with self.assertRaises(OrcamentoIndisponivelError):
            carregar(self.caminho)

    def test_consumo_negativo_bloqueia(self):
        with self.assertRaises(OrcamentoIndisponivelError):
            self._roundtrip(consumo=-1)

    def test_teto_nao_inteiro_bloqueia(self):
        orc = inicializar(self.caminho)
        dados = orc.para_dict()
        dados["teto"] = "10000000"
        self.caminho.write_text(json.dumps(dados), encoding="utf-8")
        with self.assertRaises(OrcamentoIndisponivelError):
            carregar(self.caminho)

    def test_reserva_negativa_bloqueia(self):
        orc = inicializar(self.caminho)
        orc.reservas[str(uuid.uuid4())] = -5
        with self.assertRaises(OrcamentoIndisponivelError):
            salvar(self.caminho, orc)

    def test_gravacao_com_falha_preserva_arquivo_anterior(self):
        # Substituição atômica: se o replace falhar, o arquivo anterior
        # permanece íntegro e a gravação vira GravacaoFalhouError.
        inicializar(self.caminho)
        antes = self.caminho.read_text(encoding="utf-8")
        with patch("src.orcamento.os.replace", side_effect=OSError("disco")):
            with self.assertRaises(GravacaoFalhouError):
                salvar(self.caminho, carregar(self.caminho))
        self.assertEqual(self.caminho.read_text(encoding="utf-8"), antes)

    def test_caminho_padrao_e_por_env(self):
        self.assertEqual(caminho_orcamento("x.json"), Path("x.json"))
        with patch.dict(os.environ, {"VIBER_BUDGET_PATH": "/tmp/outro.json"}):
            self.assertEqual(caminho_orcamento(), Path("/tmp/outro.json"))
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("VIBER_BUDGET_PATH", None)
            self.assertEqual(caminho_orcamento(), Path(CAMINHO_PADRAO))


class AdmissaoTests(BaseTemporariaTests):
    """Trava de saldo: conservador, por inteiros, com reserva prévia."""

    def setUp(self):
        super().setUp()
        self.reserva = calcular_reserva_micros(100)

    def test_reserva_que_cabe_exatamente_e_admitida(self):
        orc = inicializar(self.caminho, teto=self.reserva)
        reservar(orc, "t1", 100)
        self.assertEqual(orc.reservas["t1"], self.reserva)

    def test_um_milionésimo_a_mais_e_negado(self):
        orc = inicializar(self.caminho, teto=self.reserva - 1)
        with self.assertRaises(SaldoInsuficienteError):
            reservar(orc, "t1", 100)

    def test_duas_admissoes_nao_usam_o_mesmo_saldo(self):
        orc = inicializar(self.caminho, teto=self.reserva * 2)
        reservar(orc, "t1", 100)
        reservar(orc, "t2", 100)
        with self.assertRaises(SaldoInsuficienteError):
            reservar(orc, "t3", 100)

    def test_consumo_fechado_conta_contra_o_teto(self):
        orc = inicializar(self.caminho, teto=self.reserva + 1)
        reservar(orc, "t1", 100)
        fechar_reserva(orc, "t1", agora=100.0, usage=(100, 50))
        with self.assertRaises(SaldoInsuficienteError):
            reservar(orc, "t2", 100)

    def test_reinicio_com_orcamento_esgotado_continua_bloqueado(self):
        orc = inicializar(self.caminho, teto=self.reserva)
        reservar(orc, "t1", 100)
        fechar_reserva(orc, "t1", agora=100.0, usage=None)
        salvar(self.caminho, orc)
        recarregado = carregar(self.caminho)
        with self.assertRaises(SaldoInsuficienteError):
            reservar(recarregado, "t2", 100)

    def test_bloqueio_persistido_bloqueia_admissao(self):
        orc = inicializar(self.caminho)
        orc.bloqueio = "reconciliação pendente"
        with self.assertRaises(OrcamentoIndisponivelError):
            verificar_admissao(orc, "t1", agora=0.0)

    def test_bloqueio_em_memoria_bloqueia_admissao(self):
        import src.orcamento as orcamento_mod

        orcamento_mod._BLOQUEIO_MEMORIA = "gravação falhou"
        self.addCleanup(setattr, orcamento_mod, "_BLOQUEIO_MEMORIA", None)
        orc = inicializar(self.caminho)
        with self.assertRaises(OrcamentoIndisponivelError):
            verificar_admissao(orc, "t1", agora=0.0)


class PausaTests(BaseTemporariaTests):
    """Pausa global após o encerramento de uma geração."""

    def test_fechamento_marca_proxima_admissao(self):
        orc = inicializar(self.caminho)
        reservar(orc, "t1", 100)
        fechar_reserva(orc, "t1", agora=1000.0, usage=None)
        self.assertEqual(orc.proxima_admissao, 1000.0 + PAUSA_SEGUNDOS)

    def test_pausa_ativa_retorna_segundos_restantes(self):
        orc = inicializar(self.caminho)
        reservar(orc, "t1", 100)
        fechar_reserva(orc, "t1", agora=1000.0, usage=None)
        with self.assertRaises(PausaAtivaError) as contexto:
            verificar_admissao(orc, "t2", agora=1000.5)
        self.assertEqual(
            contexto.exception.segundos, math.ceil(PAUSA_SEGUNDOS - 0.5)
        )

    def test_pausa_encerrada_permite_admissao(self):
        orc = inicializar(self.caminho)
        reservar(orc, "t1", 100)
        fechar_reserva(orc, "t1", agora=1000.0, usage=None)
        verificar_admissao(
            orc, "t2", agora=1000.0 + PAUSA_SEGUNDOS
        )


class FechamentoTests(BaseTemporariaTests):
    """Conversão de reserva em consumo e tratamento de usage incerto."""

    def setUp(self):
        super().setUp()
        self.orc = inicializar(self.caminho, teto=1_000_000)
        self.id_tentativa = str(uuid.uuid4())
        reservar(self.orc, self.id_tentativa, 2000)

    def test_usage_menor_libera_somente_a_diferenca(self):
        # Reserva 4.200; usage (2.000, 100) custa 2.300; diferença 1.900.
        fechar_reserva(
            self.orc, self.id_tentativa, agora=5.0, usage=(2000, 100)
        )
        self.assertEqual(self.orc.consumo, 2_300)
        self.assertEqual(self.orc.reservas, {})

    def test_falta_de_usage_conserva_reserva_inteira(self):
        fechar_reserva(self.orc, self.id_tentativa, agora=5.0, usage=None)
        self.assertEqual(self.orc.consumo, 4_200)
        self.assertEqual(self.orc.reservas, {})

    def test_usage_maior_que_reserva_bloqueia(self):
        with self.assertRaises(ReservaExcedidaError):
            fechar_reserva(
                self.orc, self.id_tentativa, agora=5.0, usage=(100_000, 400)
            )
        self.assertIsNotNone(self.orc.bloqueio)
        self.assertEqual(self.orc.consumo, 4_200)

    def test_fechamento_registra_tentativa_encerrada(self):
        fechar_reserva(self.orc, self.id_tentativa, agora=5.0, usage=None)
        self.assertIn(self.id_tentativa, self.orc.tentativas_encerradas)

    def test_uuid_encerrado_nao_inicia_nova_geracao(self):
        fechar_reserva(self.orc, self.id_tentativa, agora=5.0, usage=None)
        with self.assertRaises(TentativaRepetidaError):
            verificar_admissao(self.orc, self.id_tentativa, agora=100.0)

    def test_liberar_reserva_sem_geracao_nao_cobra(self):
        liberar(self.orc, self.id_tentativa)
        self.assertEqual(self.orc.reservas, {})
        self.assertEqual(self.orc.consumo, 0)
        self.assertIsNone(self.orc.proxima_admissao)

    def test_fechamento_de_reserva_desconhecida_e_erro(self):
        with self.assertRaises(OrcamentoError):
            fechar_reserva(self.orc, "inexistente", agora=1.0, usage=None)

    def test_liberar_reserva_desconhecida_e_erro(self):
        with self.assertRaises(OrcamentoError):
            liberar(self.orc, "inexistente")


class OrcamentoCliTests(BaseTemporariaTests):
    """CLI do operador: init e status, sem reset público."""

    def test_init_e_status_passam(self):
        from src.orcamento_cli import main

        codigo_init = main(["init", "--caminho", str(self.caminho)])
        codigo_status = main(["status", "--caminho", str(self.caminho)])
        self.assertEqual(codigo_init, 0)
        self.assertEqual(codigo_status, 0)

    def test_init_repetido_falha_sem_resetar(self):
        from src.orcamento_cli import main

        main(["init", "--caminho", str(self.caminho)])
        orc = carregar(self.caminho)
        orc.consumo = 999
        salvar(self.caminho, orc)
        codigo = main(["init", "--caminho", str(self.caminho)])
        self.assertEqual(codigo, 1)
        self.assertEqual(carregar(self.caminho).consumo, 999)


if __name__ == "__main__":
    unittest.main()
