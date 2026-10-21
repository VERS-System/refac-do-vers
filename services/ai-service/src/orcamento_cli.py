# CLI do operador para o orçamento da Viber (etapa 4 do roadmap).
#
# Inicialização explícita e consulta de status do arquivo durável, sem
# rota HTTP pública e sem comando de reset (segunda inicialização falha
# se o arquivo já existir — regra da etapa 4). Uso no container/host:
#   python -m src.orcamento_cli init [--caminho CAMINHO] [--teto MICROS]
#   python -m src.orcamento_cli status [--caminho CAMINHO]
import argparse
import json
import sys

from src.orcamento import (
    TETO_PADRAO_MICROS,
    OrcamentoIndisponivelError,
    caminho_orcamento,
    carregar,
    inicializar,
)


def main(argv: list[str] | None = None) -> int:
    # Ponto de entrada do CLI; devolve 0 em sucesso e 1 em recusa
    # (arquivo já existente, ilegível ou bloqueado), sem exceção vazada.
    parser = argparse.ArgumentParser(
        prog="orcamento_cli",
        description="Inicialização e status do orçamento da Viber",
    )
    subcomandos = parser.add_subparsers(dest="comando", required=True)
    comando_init = subcomandos.add_parser(
        "init", help="Cria o budget.json zerado (apenas se não existir)"
    )
    comando_init.add_argument("--caminho", default=None)
    comando_init.add_argument(
        "--teto",
        type=int,
        default=TETO_PADRAO_MICROS,
        help="Teto em milionésimos de dólar (padrão: 10.000.000 = US$10)",
    )
    comando_status = subcomandos.add_parser(
        "status", help="Mostra o estado agregado do orçamento"
    )
    comando_status.add_argument("--caminho", default=None)
    argumentos = parser.parse_args(argv)
    destino = caminho_orcamento(argumentos.caminho)
    try:
        if argumentos.comando == "init":
            orcamento = inicializar(destino, teto=argumentos.teto)
            print(f"Orçamento inicializado em {destino}")
            print(
                json.dumps(
                    orcamento.para_dict(), ensure_ascii=False, indent=2
                )
            )
            return 0
        orcamento = carregar(destino)
        print(json.dumps(orcamento.para_dict(), ensure_ascii=False, indent=2))
        return 0
    except OrcamentoIndisponivelError as exc:
        print(f"Recusado: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
