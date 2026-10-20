# Carregamento e validação da base de conhecimento empacotada da Viber.
#
# A base é lida uma única vez a partir de caminho fixo dentro do pacote do
# serviço (nunca de caminho enviado pelo cliente nem do repositório inteiro).
# Base ausente, vazia ou acima do limite de tamanho invalida o recurso: quem
# chamar carregar_base recebe BaseInvalidaError e nenhuma geração acontece
# sem contexto (regra da etapa 2 do roadmap Viber).

from dataclasses import dataclass
from pathlib import Path

# Versão identificadora da base de execução; reportada no evento "started"
# do stream e registrada nas evidências de entrega (etapa 7).
KNOWLEDGE_VERSION = "vers-2026-10-20-v1"

# Limite de tamanho do arquivo da base em bytes. Evita que uma cópia
# corrompida ou acidentalmente trocada estoure o teto de tokens de entrada
# (12.000) silenciosamente; a base atual tem menos de 32 KiB.
MAX_KNOWLEDGE_BYTES = 256 * 1024

# Caminho fixo da cópia de execução: sempre ao lado deste módulo, dentro de
# src/knowledge/, que é copiado inteiro para a imagem do serviço.
_CAMINHO_PADRAO = Path(__file__).resolve().parent / "vers.md"


class BaseInvalidaError(Exception):
    """Base ausente, vazia, não decodificável ou acima do tamanho máximo."""


@dataclass(frozen=True)
class BaseConhecimento:
    """Base de conhecimento válida, imutável após o carregamento."""

    conteudo: str
    versao: str


def carregar_base(caminho: Path | str | None = None) -> BaseConhecimento:
    # Carrega e valida a base de conhecimento empacotada.
    # Por que existe: garantir que toda geração use a mesma base revisada,
    # com versão conhecida, falhando de forma explícita quando o arquivo
    # estiver indisponível. Como funciona: lê os bytes do caminho fixo
    # (ou do informado), valida existência, tamanho e decodificação UTF-8,
    # e devolve a base congelada; nunca varre pastas nem aceita URL.
    alvo = Path(caminho) if caminho is not None else _CAMINHO_PADRAO
    try:
        dados = alvo.read_bytes()
    except FileNotFoundError as exc:
        raise BaseInvalidaError(f"Base não encontrada: {alvo.name}") from exc
    except OSError as exc:
        raise BaseInvalidaError(f"Base ilegível: {alvo.name}") from exc
    if len(dados) > MAX_KNOWLEDGE_BYTES:
        raise BaseInvalidaError(
            f"Base acima do limite de {MAX_KNOWLEDGE_BYTES} bytes"
        )
    try:
        conteudo = dados.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise BaseInvalidaError("Base não é um texto UTF-8 válido") from exc
    if not conteudo.strip():
        raise BaseInvalidaError("Base vazia")
    return BaseConhecimento(conteudo=conteudo, versao=KNOWLEDGE_VERSION)
