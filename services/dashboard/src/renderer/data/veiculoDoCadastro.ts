/**
 * Veículo digitado no Criar conta, guardado neste computador até o primeiro
 * acesso.
 *
 * Na API, o veículo só pode ser criado por uma conta logada (`POST
 * /vehicles`), e a conta nova ainda não entra. Por isso o Criar conta guarda
 * aqui placa, fabricante, modelo e ano (nunca a senha), e o Login, ao
 * reconhecer o e-mail, leva ao Primeiro veículo com os campos preenchidos.
 * Há um só registro (o último cadastro). Leitura e escrita toleram
 * armazenamento bloqueado ou registro corrompido: nesses casos, o app segue
 * como se não houvesse veículo guardado. Plano em
 * `.AIs/docs/plans/desktop-frontend-veiculo-no-cadastro.md`.
 */

/** Campos do veículo como digitados na etapa Veículo. */
export interface VeiculoDoCadastro {
  placa: string;
  fabricante: string;
  modelo: string;
  ano: string;
}

/** Registro guardado: o veículo e o e-mail da conta que o digitou. */
interface Registro extends VeiculoDoCadastro {
  email: string;
}

const CHAVE = 'vers:veiculo-do-cadastro';

/** E-mail comparável: sem espaços nas pontas e em minúsculas, como o backend grava. */
function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Confere que o registro lido tem todos os campos em texto. */
function registroValido(valor: unknown): valor is Registro {
  if (typeof valor !== 'object' || valor === null) return false;
  const campos = valor as Record<string, unknown>;
  return ['email', 'placa', 'fabricante', 'modelo', 'ano'].every(
    (campo) => typeof campos[campo] === 'string',
  );
}

/** Guarda o veículo do cadastro para o e-mail, substituindo o anterior. */
export function guardarVeiculoDoCadastro(email: string, veiculo: VeiculoDoCadastro): void {
  const registro: Registro = {
    email: normalizarEmail(email),
    placa: veiculo.placa,
    fabricante: veiculo.fabricante,
    modelo: veiculo.modelo,
    ano: veiculo.ano,
  };
  try {
    localStorage.setItem(CHAVE, JSON.stringify(registro));
  } catch {
    // Sem armazenamento, o veículo é cadastrado depois pela tela Veículos.
  }
}

/**
 * Lê o veículo guardado. Com `email`, só devolve se for da mesma conta; sem
 * ele, devolve o que houver (a tela Primeiro veículo só é aberta pelo Login
 * depois dessa conferência).
 */
export function lerVeiculoDoCadastro(email?: string): VeiculoDoCadastro | null {
  let registro: unknown;
  try {
    registro = JSON.parse(localStorage.getItem(CHAVE) ?? 'null');
  } catch {
    return null;
  }
  if (!registroValido(registro)) return null;
  if (email !== undefined && registro.email !== normalizarEmail(email)) return null;
  const { placa, fabricante, modelo, ano } = registro;
  return { placa, fabricante, modelo, ano };
}

/** Apaga o veículo guardado, depois de cadastrado ou pulado. */
export function apagarVeiculoDoCadastro(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // Nada a fazer: sem armazenamento, também não há o que apagar.
  }
}
