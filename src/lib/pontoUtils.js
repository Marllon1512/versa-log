export const PONTO_LABELS = { entrada: 'Entrada', saida_almoco: 'Saída Almoço', retorno_almoco: 'Retorno Almoço', saida: 'Saída' }
export const PONTO_COLORS = { entrada: 'var(--green)', saida_almoco: 'var(--amber)', retorno_almoco: 'var(--blue)', saida: 'var(--red)' }
export const PONTO_BG     = { entrada: 'var(--gdim)',  saida_almoco: 'var(--adim2)', retorno_almoco: 'var(--bdim)', saida: 'var(--rdim)' }

export function normTipoMarcacao(p) {
  const t = p.tipo_marcacao || p.tipo || ''
  if (t === 'Entrada') return 'entrada'
  if (t === 'Almoço' || t === 'saida_almoco') return 'saida_almoco'
  if (t === 'Retorno' || t === 'retorno_almoco') return 'retorno_almoco'
  if (t === 'Saída' || t === 'saida') return 'saida'
  return t
}

export function calcSaldoHoras(ps) {
  let totalMs = 0, lastEntrada = null
  for (const p of (ps || [])) {
    const t = normTipoMarcacao(p)
    if (t === 'entrada' || t === 'retorno_almoco') lastEntrada = new Date(p.data_hora)
    else if ((t === 'saida_almoco' || t === 'saida') && lastEntrada) {
      totalMs += new Date(p.data_hora) - lastEntrada
      lastEntrada = null
    }
  }
  if (lastEntrada) totalMs += Date.now() - lastEntrada
  if (totalMs <= 0) return null
  const h = Math.floor(totalMs / 3600000)
  const m = Math.floor((totalMs % 3600000) / 60000)
  return `${h}h${m > 0 ? `${m}min` : ''}`
}
