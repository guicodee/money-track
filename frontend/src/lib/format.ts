const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** R$ 1.234,56 */
export function formatBRL(value: number) {
  return brl.format(value)
}

/** R$ 1.234 (sem centavos, truncado) */
export function formatBRLWhole(value: number) {
  return brl.format(Math.trunc(value)).replace(/,00$/, '')
}

/** Separa "R$ 35.972" de ",25" para destacar os centavos */
export function splitBRL(value: number): [string, string] {
  const full = formatBRL(value)
  const i = full.lastIndexOf(',')
  return [full.slice(0, i), full.slice(i)]
}

/** +R$ 600,00 / –R$ 8,50 */
export function formatSignedBRL(value: number) {
  return `${value < 0 ? '–' : '+'}${formatBRL(Math.abs(value))}`
}

/** +2,4k / -1k */
export function formatCompactNet(value: number) {
  const k = (Math.abs(value) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  return `${value < 0 ? '-' : '+'}${k}k`
}