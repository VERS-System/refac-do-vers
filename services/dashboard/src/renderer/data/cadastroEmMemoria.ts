/**
 * Cadastro de veículos em memória, para o repositório de exemplo.
 *
 * Imita as regras do backend para veículos (task D09): a placa é validada,
 * única e não muda depois do cadastro; só um veículo é principal (marcar um
 * desmarca o anterior); o ano precisa ser plausível. As mudanças valem só
 * para esta instância e somem ao recarregar a página.
 */

import { formatarIsoComFuso, normalizarPlaca } from './calculos';
import { ErroRepositorio } from './erros';
import { VEICULOS_EXEMPLO } from './fixtures/sistema';
import type { AtualizacaoVeiculo, NovoVeiculo, Veiculo } from './tipos';

/** Primeiro ano aceito para um veículo. */
const ANO_MINIMO = 1950;

/** Fuso de Brasília em minutos, para a data de cadastro. */
const FUSO_MINUTOS = -180;

/** Limpa um texto opcional: vazio vira `null`. */
function textoOpcional(valor: string | null | undefined): string | null {
  const limpo = valor?.trim();
  return limpo ? limpo : null;
}

/**
 * Cria o cadastro com os veículos de exemplo.
 *
 * `agora` dá a data dos cadastros novos e o limite do ano (até o ano
 * seguinte, para modelos lançados antes da virada).
 */
export function criarCadastroEmMemoria(agora: () => Date) {
  const veiculos: Veiculo[] = structuredClone(VEICULOS_EXEMPLO);

  /** Confere o ano informado (ausente é aceito: o contrato o deixa opcional). */
  function validarAno(ano: number | null | undefined) {
    if (ano === null || ano === undefined) return;
    const maximo = agora().getFullYear() + 1;
    if (!Number.isInteger(ano) || ano < ANO_MINIMO || ano > maximo) {
      throw new ErroRepositorio('validacao', `Informe um ano entre ${ANO_MINIMO} e ${maximo}.`);
    }
  }

  /** Acha o veículo ou recusa com "não encontrado". */
  function achar(veiculoId: string): Veiculo {
    const veiculo = veiculos.find((v) => v.id === veiculoId);
    if (!veiculo) throw new ErroRepositorio('nao-encontrado', 'Veículo não encontrado.');
    return veiculo;
  }

  /** Veículos na ordem de cadastro (o principal costuma ser o primeiro). */
  function listar(): Veiculo[] {
    return veiculos;
  }

  /** O veículo principal (há sempre um enquanto houver veículos). */
  function principal(): Veiculo {
    return veiculos.find((v) => v.principal) ?? veiculos[0];
  }

  /** Cadastra com placa válida e única; entra como não principal. */
  function criar(novo: NovoVeiculo): Veiculo {
    const placa = normalizarPlaca(novo.placa);
    if (!placa)
      throw new ErroRepositorio('validacao', 'Placa inválida. Use o formato ABC1D23 ou ABC1234.');
    if (veiculos.some((v) => v.placa === placa)) {
      throw new ErroRepositorio('conflito', `Já existe um veículo com a placa ${placa}.`);
    }
    validarAno(novo.ano);
    const veiculo: Veiculo = {
      id: `veiculo-${placa.toLowerCase()}`,
      placa,
      fabricante: textoOpcional(novo.fabricante),
      modelo: textoOpcional(novo.modelo),
      ano: novo.ano ?? null,
      relacao: 'proprietario',
      principal: veiculos.length === 0,
      criadoEm: formatarIsoComFuso(agora(), FUSO_MINUTOS),
    };
    veiculos.push(veiculo);
    return veiculo;
  }

  /**
   * Edita fabricante, modelo e ano, ou marca como principal (desmarcando o
   * anterior). Desmarcar o principal diretamente não é permitido: é preciso
   * escolher outro.
   */
  function atualizar(veiculoId: string, atualizacao: AtualizacaoVeiculo): Veiculo {
    const veiculo = achar(veiculoId);
    validarAno(atualizacao.ano);
    if (atualizacao.principal === false && veiculo.principal) {
      throw new ErroRepositorio('validacao', 'Escolha outro veículo como principal.');
    }
    if ('fabricante' in atualizacao) veiculo.fabricante = textoOpcional(atualizacao.fabricante);
    if ('modelo' in atualizacao) veiculo.modelo = textoOpcional(atualizacao.modelo);
    if ('ano' in atualizacao) veiculo.ano = atualizacao.ano ?? null;
    if (atualizacao.principal) {
      for (const outro of veiculos) outro.principal = outro.id === veiculo.id;
    }
    return veiculo;
  }

  return { listar, principal, criar, atualizar };
}
