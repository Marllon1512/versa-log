import { useState, useEffect, createElement as h } from 'react'

const listeners = new Set()

function emit(type, msg) {
  const id = Date.now() + Math.random()
  listeners.forEach(fn => fn({ id, type, msg }))
}

export const toast = {
  success: (msg) => emit('success', msg),
  error: (msg) => emit('error', msg),
  info: (msg) => emit('info', msg),
}

export function Toaster() {
  const [items, setItems] = useState([])

  useEffect(() => {
    const handler = (item) => {
      setItems(prev => [...prev.slice(-4), item])
      setTimeout(() => setItems(prev => prev.filter(x => x.id !== item.id)), 3800)
    }
    listeners.add(handler)
    return () => listeners.delete(handler)
  }, [])

  if (!items.length) return null
  return h('div', {
    style: { position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none', maxWidth: 340 }
  },
    items.map(it =>
      h('div', { key: it.id, className: `toast toast-${it.type}` },
        h('span', null, it.type === 'success' ? '✓' : it.type === 'error' ? '✗' : 'ℹ'),
        h('span', null, it.msg)
      )
    )
  )
}
