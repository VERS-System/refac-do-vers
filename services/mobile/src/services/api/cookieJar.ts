/**
 * Jar manual de cookies para o cliente nativo do VERS.
 *
 * O React Native não gerencia cookies como o navegador; o backend exige a
 * tripla vers_access/vers_refresh/vers_csrf em cada requisição relevante.
 * Este módulo mantém o par nome→valor em memória (com expiração), absorve
 * os cabeçalhos Set-Cookie das respostas e monta o header Cookie.
 */

/** Par de cookies expostos pelo jar (persistido sem expiração). */
export type CookieSnapshot = Record<string, string>;

/** Cookie parseado de um cabeçalho Set-Cookie. */
export type ParsedCookie = {
  name: string;
  value: string;
  /** Max-Age em segundos, quando presente. */
  maxAgeSeconds?: number;
  /** Data de expiração em epoch ms, quando presente. */
  expiresAtMs?: number;
};

/** Relógio injetável para testar expiração sem depender do tempo real. */
export type Now = () => number;

/** Contrato do jar usado pelo httpClient. */
export type CookieJar = {
  /** Devolve o header Cookie com todos os pares não expirados, ou null. */
  getHeader(): string | null;
  /** Absorve os cabeçalhos Set-Cookie (vazios/removidos descartam o par). */
  absorbSetCookie(values: readonly string[]): void;
  /** Informa se um cookie com o nome existe e não expirou. */
  has(name: string): boolean;
  /** Remove todos os cookies (ex.: sessão perdida). */
  clear(): void;
  /** Expõe o estado para persistência segura (restore via createCookieJar). */
  snapshot(): CookieSnapshot;
};

/** Guarda um cookie com expiração opcional. */
type StoredCookie = {
  value: string;
  expiresAtMs?: number;
};

/** Converte uma linha Set-Cookie em seus atributos relevantes. */
function parseSetCookieValue(value: string): ParsedCookie | null {
  const parts = value.split(';');
  const first = parts[0]?.trim();
  if (!first || !first.includes('=')) return null;
  const separator = first.indexOf('=');
  const name = first.slice(0, separator).trim();
  const cookieValue = first.slice(separator + 1).trim();
  if (!name) return null;

  const parsed: ParsedCookie = { name, value: cookieValue };
  for (const attribute of parts.slice(1)) {
    const trimmed = attribute.trim();
    const eq = trimmed.indexOf('=');
    const key = (eq === -1 ? trimmed : trimmed.slice(0, eq)).trim().toLowerCase();
    const attrValue = eq === -1 ? '' : trimmed.slice(eq + 1).trim();
    if (key === 'max-age') {
      const seconds = Number(attrValue);
      if (Number.isFinite(seconds)) parsed.maxAgeSeconds = seconds;
    } else if (key === 'expires') {
      const at = Date.parse(attrValue);
      if (!Number.isNaN(at)) parsed.expiresAtMs = at;
    }
  }
  return parsed;
}

/** Parseia uma linha Set-Cookie completa (nome, valor e atributos úteis). */
export function parseSetCookie(value: string): ParsedCookie | null {
  return parseSetCookieValue(value);
}

/**
 * Cria um jar vazio ou restaurado a partir de um snapshot persistido.
 * O snapshot não guarda expiração: o valor restaurado vale até nova troca.
 * `now` injeta o relógio (padrão Date.now) para testes de expiração.
 */
export function createCookieJar(
  initial?: CookieSnapshot,
  now: Now = Date.now,
): CookieJar {
  const cookies = new Map<string, StoredCookie>();
  for (const [name, value] of Object.entries(initial ?? {})) {
    cookies.set(name, { value });
  }

  /** Devolve os pares vivos no relógio do jar, na ordem de inserção. */
  function liveEntries(): Array<[string, string]> {
    const at = now();
    return [...cookies.entries()]
      .filter(([, cookie]) => cookie.expiresAtMs === undefined || cookie.expiresAtMs > at)
      .map(([name, cookie]) => [name, cookie.value] as [string, string]);
  }

  return {
    getHeader() {
      const entries = liveEntries();
      if (entries.length === 0) return null;
      return entries.map(([name, value]) => `${name}=${value}`).join('; ');
    },
    absorbSetCookie(values) {
      const at = now();
      for (const raw of values) {
        const parsed = parseSetCookieValue(raw);
        if (!parsed) continue;
        const expired =
          (parsed.maxAgeSeconds !== undefined && parsed.maxAgeSeconds <= 0) ||
          (parsed.expiresAtMs !== undefined && parsed.expiresAtMs <= at) ||
          parsed.value === '';
        if (expired) {
          cookies.delete(parsed.name);
          continue;
        }
        const stored: StoredCookie = { value: parsed.value };
        if (parsed.maxAgeSeconds !== undefined) {
          stored.expiresAtMs = at + parsed.maxAgeSeconds * 1000;
        } else if (parsed.expiresAtMs !== undefined) {
          stored.expiresAtMs = parsed.expiresAtMs;
        }
        cookies.set(parsed.name, stored);
      }
    },
    has(name) {
      return liveEntries().some(([entryName]) => entryName === name);
    },
    clear() {
      cookies.clear();
    },
    snapshot() {
      return Object.fromEntries(liveEntries());
    },
  };
}
