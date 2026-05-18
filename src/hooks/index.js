import { useState, useEffect, useCallback } from 'react'

// Generic async data fetcher with loading/error/reload
export function useData(fetcher, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setData(result)
    } catch (e) {
      setError(e.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { reload() }, [reload])

  return { data, loading, error, reload, setData }
}

// Async action with loading/error state
export function useAction() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const run = useCallback(async (fn) => {
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const result = await fn()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
      return result
    } catch (e) {
      setError(e.message || 'Erro ao executar ação')
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, success, run, setError }
}

// Date helpers
export function useDateInfo(dateStr) {
  if (!dateStr) return null
  const dt = new Date(dateStr + 'T12:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const fmt = dt.toLocaleDateString('pt-BR')
  if (dt < today) return { text: `Atrasado — ${fmt}`, color: 'var(--red)' }
  if (dt.toDateString() === today.toDateString()) return { text: `Hoje, ${fmt}`, color: 'var(--green)' }
  return { text: fmt, color: 'var(--t2)' }
}

// Prazo de assistência (30 dias)
export function usePrazo(dataAbertura) {
  if (!dataAbertura) return null
  const prazo = new Date(dataAbertura)
  prazo.setDate(prazo.getDate() + 30)
  const diff = Math.floor((prazo - new Date()) / 86400000)
  if (diff < 0) return { text: `Atrasado ${Math.abs(diff)}d`, color: 'var(--red)', badge: 'bg-red' }
  if (diff <= 5) return { text: `${diff}d restantes`, color: 'var(--red)', badge: 'bg-red' }
  if (diff <= 10) return { text: `${diff}d restantes`, color: 'var(--amber)', badge: 'bg-amber' }
  return { text: `${diff}d restantes`, color: 'var(--t2)', badge: 'bg' }
}
