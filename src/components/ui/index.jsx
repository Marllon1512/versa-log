import { useEffect } from 'react'

// ── Button ────────────────────────────────────────────────
export function Btn({ children, variant = 'primary', size = 'md', disabled, loading, onClick, style, type = 'button' }) {
  const cls = {
    primary: 'btn btn-p',
    secondary: 'btn btn-s',
    ghost: 'btn btn-g',
    danger: 'btn btn-d',
    success: 'btn btn-success',
  }[variant] || 'btn btn-p'
  const sz = size === 'sm' ? ' btn-sm' : size === 'icon' ? ' btn-ico btn-sm' : ''
  return (
    <button
      type={type}
      className={cls + sz}
      disabled={disabled || loading}
      onClick={onClick}
      style={style}
    >
      {loading ? <span style={{ opacity: 0.7 }}>Aguarde...</span> : children}
    </button>
  )
}

// ── Badge ─────────────────────────────────────────────────
const BADGE_MAP = {
  Pendente: 'bg', Separando: 'bg-accent', 'Pronto para Rota': 'bg-blue',
  'Em Rota': 'bg-blue', Entregue: 'bg-green', Problema: 'bg-red',
  Remarcado: 'bg-amber', Cancelado: 'bg',
  Aberto: 'bg-amber', 'Em andamento': 'bg-blue', Concluído: 'bg-green',
  Aprovado: 'bg-green', Reprovado: 'bg-red',
  Ativa: 'bg-green', Inativa: 'bg',
  Normal: 'bg', Alta: 'bg-amber', Urgente: 'bg-red',
}
export function Badge({ status, children, style }) {
  const cls = BADGE_MAP[status || children] || 'bg'
  return <span className={`badge ${cls}`} style={style}>{children || status}</span>
}

// ── Modal ─────────────────────────────────────────────────
export function Modal({ title, subtitle, onClose, children, footer, size = 'md' }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${size === 'lg' ? 'modal-lg' : ''}`}>
        <div className="mh">
          <div>
            <h2>{title}</h2>
            {subtitle && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          {onClose && <button className="btn btn-g btn-ico" onClick={onClose}><Ic n="x" /></button>}
        </div>
        <div className="mb">{children}</div>
        {footer && <div className="mf">{footer}</div>}
      </div>
    </div>
  )
}

// ── Form fields ───────────────────────────────────────────
export function Field({ label, children, required }) {
  return (
    <div className="fg">
      <label className="fl">{label}{required && ' *'}</label>
      {children}
    </div>
  )
}

export function Input({ label, required, ...props }) {
  return (
    <div className="fg">
      {label && <label className="fl">{label}{required && ' *'}</label>}
      <input className="fi" {...props} />
    </div>
  )
}

export function Select({ label, required, options = [], placeholder, ...props }) {
  return (
    <div className="fg">
      {label && <label className="fl">{label}{required && ' *'}</label>}
      <select className="fi" {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    </div>
  )
}

export function Textarea({ label, ...props }) {
  return (
    <div className="fg">
      {label && <label className="fl">{label}</label>}
      <textarea className="fi" {...props} />
    </div>
  )
}

// ── Alert ─────────────────────────────────────────────────
export function Alert({ type = 'info', children, style }) {
  const cls = { warning: 'alert-w', error: 'alert-e', success: 'alert-s', info: 'alert-w' }[type]
  return <div className={`alert ${cls}`} style={style}>{children}</div>
}

// ── Loading spinner ───────────────────────────────────────
export function Spinner({ text = 'Carregando...' }) {
  return <div className="empty">{text}</div>
}

// ── Empty state ───────────────────────────────────────────
export function Empty({ icon = '📭', text = 'Nenhum item encontrado' }) {
  return <div className="empty"><div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div><div>{text}</div></div>
}

// ── Icons ─────────────────────────────────────────────────
const ICONS = {
  x: 'M18 6 6 18M6 6l12 12',
  plus: 'M12 5v14M5 12h14',
  edit: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
  trash: 'M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2',
  save: 'M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8',
  upload: 'M16 16l-4-4-4 4M12 12v9M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3',
  pdf: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  check: 'M20 6L9 17l-5-5',
  chev: 'M9 18l6-6-6-6',
  back: 'M15 18l-6-6 6-6',
  logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  search: 'M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z',
  cam: 'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a4 4 0 100-8 4 4 0 000 8z',
  pin: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 10m-3 0a3 3 0 106 0 3 3 0 00-6 0',
  phone: 'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.07 8.91a2 2 0 012-2.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 6.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 13.92z',
  truck: 'M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  clock: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2',
  alert: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01',
  team: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  map: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6zM9 3v15M15 6v15',
  bar: 'M18 20V10M12 20V4M6 20v-6',
  wrench: 'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
  wa: 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z',
  calendar: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18',
}

export function Ic({ n, s = 15, style }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d={ICONS[n] || ''} />
    </svg>
  )
}

// ── VA Logo ───────────────────────────────────────────────
export function Logo({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="5" />
      <path d="M14 34 L31 69 L48 34" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M52 69 L69 34 L86 69" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
