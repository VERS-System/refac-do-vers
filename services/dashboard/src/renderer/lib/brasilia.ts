/** Compartilha a apresentação de instantes em Brasília sem fixar um offset histórico. */
const DATA_BRASILIA = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3, hourCycle: 'h23' });

/** Formata ISO em Brasília preservando o instante, inclusive em datas históricas com outro offset. */
export function isoBrasilia(valor: string): string {
  const data = new Date(valor);
  const p = Object.fromEntries(DATA_BRASILIA.formatToParts(data).map(p => [p.type, p.value]));
  const local = `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}.${p.fractionalSecond}`;
  const minutos = Math.round((Date.parse(`${local}Z`) - data.getTime()) / 60000);
  const absoluto = Math.abs(minutos);
  return `${local}${minutos < 0 ? '-' : '+'}${String(Math.floor(absoluto / 60)).padStart(2, '0')}:${String(absoluto % 60).padStart(2, '0')}`;
}
