import { useState, useRef, useEffect } from 'react'

import { Ic } from './ui/index'

import { useLojaFiltro } from '../context/LojaContext'

export function LojaSelect({ value, onChange, className, style, placeholder }) {
  const { lojas } = useLojaFiltro()
  const nomesLojas = (lojas ?? []).map(l => l.nome)
  const [outra, setOutra] = useState(() => !!(value && !nomesLojas.includes(value)))
  const selVal = outra ? '__outra__' : (nomesLojas.includes(value) ? value : '')
  const cls = className !== undefined ? className : 'fi'
  return (
    <div>
      <select className={cls} style={style} value={selVal}
        onChange={e => {
          if (e.target.value === '__outra__') { setOutra(true); onChange('') }
          else { setOutra(false); onChange(e.target.value) }
        }}
      >
        <option value="">{placeholder || 'Selecione a loja...'}</option>
        {nomesLojas.map(l => <option key={l} value={l}>{l}</option>)}
        <option value="__outra__">Outra (digitar manualmente)</option>
      </select>
      {outra && (
        <input className={cls} style={{ ...(style || {}), marginTop: 6 }}
          value={value} onChange={e => onChange(e.target.value)}
          placeholder="Nome da loja" autoFocus />
      )}
    </div>
  )
}

export function LojaMultiSelect({ value, onChange }) {
  const { lojas } = useLojaFiltro()
  const nomesLojas = (lojas ?? []).map(l => l.nome)
  const [open, setOpen] = useState(false)
  const ref = useRef()
  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])
  const todas = value.length === 0
  const toggle = l => onChange(value.includes(l) ? value.filter(v => v !== l) : [...value, l])
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" className="fi"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', width: '100%', padding: '6px 10px', textAlign: 'left' }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ fontSize: 13 }}>{todas ? 'Todas as lojas' : `${value.length} loja(s)`}</span>
        <Ic n="chev" s={11} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, minWidth: '100%', background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 10, zIndex: 200, padding: '6px 4px', boxShadow: '0 4px 16px rgba(0,0,0,.12)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={todas} onChange={() => onChange([])} />
            <span style={{ fontWeight: todas ? 600 : 400 }}>Todas as lojas</span>
          </label>
          {nomesLojas.map(l => (
            <label key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={value.includes(l)} onChange={() => toggle(l)} />
              {l}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
