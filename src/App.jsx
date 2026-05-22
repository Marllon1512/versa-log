import { useState, useEffect, useRef, useCallback } from 'react'
import './styles.css'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useData, useAction, useDateInfo, usePrazo } from './hooks/index'
import { Btn, Badge, Modal, Ic, Logo, Alert, Spinner, Empty, Input } from './components/ui/index'
import * as XLSX from 'xlsx'
import { supabase } from './lib/supabase'
import { pedidosService } from './services/pedidos'
import {
  produtosService, usuariosService, equipesService,
  assistenciasService, conferenciasService, pontoService, assinaturasService
} from './services/index'

// ============================================================
// LOGIN
// ============================================================
function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e, overrideEmail, overridePw) => {
    e?.preventDefault()
    const finalEmail = overrideEmail || email
    const finalPw = overridePw || pw
    if (!finalEmail || !finalPw) return
    setLoading(true)
    setErr('')
    try {
      await login(finalEmail, finalPw)
    } catch {
      setErr('Email ou senha incorretos. Verifique suas credenciais.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg0)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 20, padding: 40, width: '100%', maxWidth: 380 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, background: 'var(--t1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg0)', flexShrink: 0 }}>
            <Logo size={28} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '.04em' }}>VERSA LOG</div>
            <div style={{ fontSize: 11, color: 'var(--t3)' }}>Sistema de logística</div>
          </div>
        </div>

        {err && <Alert type="error">{err}</Alert>}

        <form onSubmit={handleLogin}>
          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
          <Input label="Senha" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" required />
          <Btn type="submit" style={{ width: '100%', justifyContent: 'center', padding: 12, marginTop: 4 }} loading={loading}>
            Entrar
          </Btn>
        </form>

        <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 10, textAlign: 'center' }}>Acesso rápido:</div>
          {[['Admin', 'admin@versalog.com'], ['Gestor', 'gestor@versalog.com'], ['Entregador', 'entregador@versalog.com']].map(([label, e]) => (
            <button key={label} className="btn btn-s" style={{ width: '100%', justifyContent: 'center', marginBottom: 6 }}
              onClick={() => handleLogin(null, e, 'Versa@2026')} disabled={loading}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// TOPBAR
// ============================================================
function Topbar({ page, setPage }) {
  const { perfil, logout, isGestor } = useAuth()

  const items = [
    ...(isGestor ? [
      { id: 'dashboard', label: 'Painel' },
      { id: 'pedidos', label: 'Pedidos' },
      { id: 'separacao', label: 'Separação' },
      { id: 'agenda', label: 'Agenda' },
      { id: 'assistencia', label: 'Assistência' },
      { id: 'roteiro', label: 'Roteiro' },
      { id: 'conferencia', label: 'Conferência' },
      { id: 'equipe', label: 'Equipe' },
      { id: 'ranking', label: 'Ranking' },
      { id: 'mapa', label: 'Mapa' },
    ] : []),
    ...(!isGestor && ['estoque', 'conferente'].includes(perfil?.role) ? [{ id: 'separacao', label: 'Separação' }] : []),
    { id: 'rota', label: 'Minha Rota' },
    { id: 'ponto', label: 'Ponto' },
    ...(isGestor ? [{ id: 'config', label: 'Configurações' }] : []),
  ]

  return (
    <div className="topbar">
      <div className="logo">
        <Logo size={18} />
        <span>VERSA LOG</span>
      </div>
      {items.map(it => (
        <button key={it.id} className={`nav${page === it.id ? ' on' : ''}`} onClick={() => setPage(it.id)}>
          {it.label}
        </button>
      ))}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: 'var(--t3)' }}>{perfil?.full_name}</span>
        <button className="btn btn-g btn-ico btn-sm" onClick={logout} title="Sair"><Ic n="logout" /></button>
      </div>
    </div>
  )
}

// ============================================================
// SEPARACAO
// ============================================================
function Separacao() {
  const { perfil, isGestor } = useAuth()
  const [selectedId, setSelectedId] = useState(null)
  const { data: pedidos, loading, reload } = useData(() => pedidosService.list(), [])

  const hoje = new Date().toISOString().split('T')[0]
  const amanha = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const seteD = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  // Filtra pedidos que precisam de separação (não entregues nem cancelados)
  const pendentes = (pedidos || []).filter(p =>
    !['Entregue', 'Cancelado', 'Pronto para Rota', 'Em Rota'].includes(p.status)
  )

  const deHoje = pendentes.filter(p => p.data_entrega === hoje)
  const deAmanha = pendentes.filter(p => p.data_entrega === amanha)
  const de7Dias = pendentes.filter(p => p.data_entrega > amanha && p.data_entrega <= seteD)

  if (selectedId) return <SeparacaoDetalhe pedidoId={selectedId} onBack={() => { setSelectedId(null); reload() }} />

  return (
    <div className="page">
      <div className="ph">
        <div>
          <h1>Separação</h1>
          <div className="ph-sub">Agenda dos próximos 7 dias</div>
        </div>
        <Btn variant="secondary" size="sm" onClick={reload}><Ic n="refresh" s={13} /></Btn>
      </div>

      {/* Stats */}
      <div className="stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        {[
          { label: 'Hoje', val: deHoje.length, color: deHoje.length > 0 ? 'var(--red)' : 'var(--green)', bg: deHoje.length > 0 ? 'var(--rdim)' : 'var(--gdim)' },
          { label: 'Amanhã', val: deAmanha.length, color: 'var(--amber)', bg: 'var(--adim2)' },
          { label: '7 dias', val: de7Dias.length, color: 'var(--accent)', bg: 'var(--adim)' },
        ].map(s => (
          <div className="stat" key={s.label}>
            <div className="stat-val" style={{ color: s.color }}>{loading ? '—' : s.val}</div>
            <div className="stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <>
          {deHoje.length > 0 && <SeparacaoGrupo titulo="Hoje" pedidos={deHoje} onSelect={setSelectedId} urgente />}
          {deAmanha.length > 0 && <SeparacaoGrupo titulo="Amanhã" pedidos={deAmanha} onSelect={setSelectedId} />}
          {de7Dias.length > 0 && <SeparacaoGrupo titulo="Próximos 7 dias" pedidos={de7Dias} onSelect={setSelectedId} />}
          {pendentes.length === 0 && <Empty icon="📦" text="Nenhum pedido pendente de separação" />}
        </>
      )}
    </div>
  )
}

function SeparacaoGrupo({ titulo, pedidos, onSelect, urgente }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: urgente ? 'var(--red)' : 'var(--t1)' }}>{titulo}</div>
          <span className="badge bg" style={{ fontSize: 11 }}>{pedidos.length}</span>
        </div>
        <Ic n="chev" s={13} style={{ color: 'var(--t3)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }} />
      </div>
      {open && pedidos.map(p => <SeparacaoCard key={p.id} pedido={p} onClick={() => onSelect(p.id)} />)}
    </div>
  )
}

function SeparacaoCard({ pedido: p, onClick }) {
  return (
    <div className="li" onClick={onClick}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Ic n="save" s={14} style={{ color: 'var(--accent)' }} />
      </div>
      <div className="li-main">
        <div className="li-title">{p.cliente}</div>
        <div className="li-sub">#{p.numero_pedido}{p.local_separacao ? ` · ${p.local_separacao}` : ''}</div>
        {p.data_entrega && (
          <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>
            📅 {new Date(p.data_entrega + 'T12:00').toLocaleDateString('pt-BR')}
          </div>
        )}
      </div>
      <Badge status={p.status} />
      <Ic n="chev" s={13} style={{ color: 'var(--t3)', flexShrink: 0 }} />
    </div>
  )
}

function SeparacaoDetalhe({ pedidoId, onBack }) {
  const { perfil } = useAuth()
  const { data: pedido, loading, reload } = useData(() => pedidosService.getById(pedidoId), [pedidoId])
  const { run, loading: saving } = useAction()
  const [produtos, setProdutos] = useState([])
  const [sucesso, setSucesso] = useState('')

  useEffect(() => {
    if (pedido?.produtos) {
      setProdutos(pedido.produtos.map(p => ({ ...p, _volumes: p.volumes || '', _local: p.local_separacao || '', _peso: p.nivel_peso || '', _foto: p.foto_separacao || null })))
    }
  }, [pedido?.id])

  const updateProd = (id, field, value) => {
    setProdutos(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const marcarSeparado = async (prod) => {
    if (!prod._local) { alert('Informe o local do produto antes de marcar como separado.'); return }
    await run(async () => {
      await produtosService.update(prod.id, {
        status_produto: 'Separado',
        volumes: prod._volumes ? parseInt(prod._volumes) : null,
        local_separacao: prod._local,
        nivel_peso: prod._peso,
      })
      // Atualiza local
      setProdutos(prev => prev.map(p => p.id === prod.id ? { ...p, status_produto: 'Separado' } : p))
      setSucesso(prod.id)
      setTimeout(() => setSucesso(''), 2000)

      // Verifica se todos foram separados
      const todos = produtos.map(p => p.id === prod.id ? { ...p, status_produto: 'Separado' } : p)
      const allDone = todos.every(p => p.status_produto === 'Separado')
      if (allDone) {
        await pedidosService.update(pedidoId, { status: 'Pronto para Rota' })
        await pedidosService.addHistorico(pedidoId, 'Pronto para Rota', 'Todos os produtos separados. Pedido pronto para rota.', perfil)
        reload()
      }
    })
  }

  if (loading) return <div className="page"><Spinner /></div>
  if (!pedido) return <div className="page"><Empty text="Pedido não encontrado" /></div>

  const todosSeparados = produtos.every(p => p.status_produto === 'Separado')

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
        <Btn variant="ghost" size="sm" onClick={onBack}><Ic n="back" s={13} /> Voltar</Btn>
        <Badge status={pedido.status} />
      </div>

      <h1 style={{ fontSize: 20, marginBottom: 2 }}>{pedido.cliente}</h1>
      <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 4 }}>Pedido #{pedido.numero_pedido}</div>
      <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 16 }}>
        📅 Entrega: {pedido.data_entrega ? new Date(pedido.data_entrega + 'T12:00').toLocaleDateString('pt-BR') : '—'}
      </div>

      {todosSeparados && (
        <Alert type="success" style={{ marginBottom: 16 }}>✓ Todos os produtos separados! Pedido marcado como Pronto para Rota.</Alert>
      )}

      <div style={{ fontWeight: 600, marginBottom: 12 }}>Produtos ({produtos.length})</div>

      {produtos.map(pr => (
        <div key={pr.id} style={{
          background: pr.status_produto === 'Separado' ? 'rgba(34,197,94,0.05)' : 'var(--bg1)',
          border: `1px solid ${pr.status_produto === 'Separado' ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
          borderRadius: 12, padding: 16, marginBottom: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{pr.nome_produto}</div>
              <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>Qtd: {pr.quantidade}</div>
            </div>
            <Badge status={pr.status_produto || 'Pendente'} />
          </div>

          {pr.status_produto !== 'Separado' ? (
            <>
              <div className="grid2" style={{ marginBottom: 10 }}>
                <div className="fg" style={{ marginBottom: 0 }}>
                  <label className="fl">Volumes (caixas)</label>
                  <input className="fi" type="number" value={pr._volumes} onChange={e => updateProd(pr.id, '_volumes', e.target.value)} placeholder="Qtd caixas" min="0" />
                </div>
                <div className="fg" style={{ marginBottom: 0 }}>
                  <label className="fl">Local *</label>
                  <input className="fi" value={pr._local} onChange={e => updateProd(pr.id, '_local', e.target.value)} placeholder="Ex: A3, Corredor 2" />
                </div>
              </div>

              <div className="fg" style={{ marginBottom: 12 }}>
                <label className="fl">Peso</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['1','Muito Leve'],['2','Leve'],['3','Médio'],['4','Pesado'],['5','Muito Pesado']].map(([val, label]) => (
                    <button key={val}
                      className={`btn ${pr._peso === val ? 'btn-p' : 'btn-s'} btn-sm`}
                      style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}
                      onClick={() => updateProd(pr.id, '_peso', val)}
                      title={label}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fg" style={{ marginBottom: 12 }}>
                <label className="fl">Foto da separação *</label>
                <div className="upload-zone" style={{ padding: 16 }} onClick={() => updateProd(pr.id, '_foto', `foto_${Date.now()}`)}>
                  {pr._foto ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                      <span style={{ fontSize: 20 }}>📷</span>
                      <span style={{ fontSize: 13, color: 'var(--green)' }}>✓ Foto registrada</span>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 24, marginBottom: 4 }}>📷</div>
                      <div style={{ fontSize: 13 }}>Toque para fotografar</div>
                    </>
                  )}
                </div>
              </div>

              <Btn
                style={{ width: '100%', justifyContent: 'center', padding: 12, background: sucesso === pr.id ? 'var(--green)' : undefined }}
                disabled={!pr._local || saving}
                loading={saving}
                onClick={() => marcarSeparado(pr)}
              >
                {sucesso === pr.id ? '✓ Separado!' : '📦 Marcar Separado'}
              </Btn>
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--t2)' }}>
              {pr.local_separacao && <div>📍 Local: <span style={{ color: 'var(--t1)' }}>{pr.local_separacao}</span></div>}
              {pr.volumes && <div style={{ marginTop: 4 }}>📦 Volumes: <span style={{ color: 'var(--t1)' }}>{pr.volumes}</span></div>}
              {pr.nivel_peso && <div style={{ marginTop: 4 }}>⚖️ Peso: <span style={{ color: 'var(--t1)' }}>{['','Muito Leve','Leve','Médio','Pesado','Muito Pesado'][parseInt(pr.nivel_peso)] || pr.nivel_peso}</span></div>}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}


// ============================================================
// DASHBOARD
// ============================================================
function Dashboard() {
  const hoje = new Date().toISOString().split('T')[0]
  const [selected, setSelected] = useState(null)
  const { data: pedidos, loading, reload } = useData(() => pedidosService.list(), [])

  if (selected) return <PedidoDetalhe pedidoId={selected} onBack={() => { setSelected(null); reload() }} />

  const ph = (pedidos || []).filter(p => p.data_entrega === hoje)

  const stats = [
    { label: 'Total hoje', val: ph.length, color: 'var(--accent)', bg: 'var(--adim)', icon: 'truck' },
    { label: 'Entregues', val: ph.filter(p => p.status === 'Entregue').length, color: 'var(--green)', bg: 'var(--gdim)', icon: 'check' },
    { label: 'Em Rota', val: ph.filter(p => p.status === 'Em Rota').length, color: 'var(--blue)', bg: 'var(--bdim)', icon: 'truck' },
    { label: 'Problemas', val: ph.filter(p => p.status === 'Problema').length, color: 'var(--red)', bg: 'var(--rdim)', icon: 'alert' },
    { label: 'Remarcados', val: (pedidos || []).filter(p => p.status === 'Remarcado').length, color: 'var(--amber)', bg: 'var(--adim2)', icon: 'calendar' },
  ]

  return (
    <div className="page">
      <div className="ph">
        <div>
          <h1>Painel de Operações</h1>
          <div className="ph-sub">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
        <Btn variant="secondary" size="sm" onClick={reload}><Ic n="refresh" s={13} /> Atualizar</Btn>
      </div>

      <div className="stats">
        {stats.map(s => (
          <div className="stat" key={s.label}>
            <div className="stat-ico" style={{ background: s.bg, color: s.color }}><Ic n={s.icon} s={14} /></div>
            <div className="stat-val" style={{ color: s.color }}>{loading ? '—' : s.val}</div>
            <div className="stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 14 }}>Entregas de hoje</div>
        {loading ? <Spinner /> : ph.length === 0 ? <Empty icon="📦" text="Nenhum pedido para hoje" /> :
          ph.map(p => (
            <div className="li" key={p.id} onClick={() => setSelected(p.id)} style={{ cursor: 'pointer' }}>
              <div className="li-main">
                <div className="li-title">{p.cliente}</div>
                <div className="li-sub">#{p.numero_pedido} · {p.endereco}</div>
              </div>
              <Badge status={p.status} />
              <Ic n="chev" s={13} style={{ color: 'var(--t3)', flexShrink: 0 }} />
            </div>
          ))}
      </div>
    </div>
  )
}

// ============================================================
// PEDIDOS
// ============================================================
function Pedidos() {
  const { perfil, isGestor } = useAuth()
  const [search, setSearch] = useState('')
  const [statusFil, setStatusFil] = useState('Todos')
  const [lojaFil, setLojaFil] = useState('Todas')
  const [selected, setSelected] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const { data: pedidos, loading, reload } = useData(() => pedidosService.list(), [])

  const lojas = ['Todas', ...new Set((pedidos || []).map(p => p.local_separacao).filter(Boolean))]
  const statuses = ['Todos', 'Pendente', 'Separando', 'Pronto para Rota', 'Em Rota', 'Entregue', 'Problema', 'Remarcado', 'Cancelado']

  const filtered = (pedidos || []).filter(p => {
    const mSearch = !search || p.cliente?.toLowerCase().includes(search.toLowerCase()) || p.numero_pedido?.includes(search)
    const mStatus = statusFil === 'Todos' || p.status === statusFil
    const mLoja = lojaFil === 'Todas' || p.local_separacao === lojaFil
    return mSearch && mStatus && mLoja
  })

  const handleCreate = async (dados) => {
    await pedidosService.create({ ...dados, created_by: perfil?.id })
    await reload()
    setShowNew(false)
  }

  const handleImport = async (lista) => {
    for (const item of lista) {
      const { produtos, selected: _s, erro: _e, _confidence: _c, _filename: _f, ...pedido } = item
      const novo = await pedidosService.create(pedido)
      if (produtos?.length) {
        await produtosService.createMany(produtos.map(pr => ({ ...pr, pedido_id: novo.id, status_produto: 'Pendente' })))
      }
    }
    await reload()
    setShowImport(false)
  }

  if (selected) {
    return (
      <PedidoDetalhe
        pedidoId={selected}
        onBack={() => { setSelected(null); reload() }}
      />
    )
  }

  return (
    <div className="page">
      <div className="ph">
        <div>
          <h1>Pedidos</h1>
          <div className="ph-sub">{filtered.length} pedido(s) encontrado(s)</div>
        </div>
        {isGestor && (
          <div className="row">
            <Btn variant="secondary" size="sm" onClick={() => setShowImport(true)}><Ic n="upload" s={13} /> Importar em Lote</Btn>
            <Btn size="sm" onClick={() => setShowNew(true)}><Ic n="plus" s={13} /> Novo Pedido</Btn>
          </div>
        )}
      </div>

      <div className="filters">
        <input className="search" placeholder="Buscar cliente ou pedido..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="fi" style={{ width: 'auto', padding: '6px 10px' }} value={lojaFil} onChange={e => setLojaFil(e.target.value)}>
          {lojas.map(l => <option key={l}>{l}</option>)}
        </select>
      </div>
      <div className="filters">
        {statuses.map(s => (
          <button key={s} className={`fb${statusFil === s ? ' on' : ''}`} onClick={() => setStatusFil(s)}>{s}</button>
        ))}
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? <Empty icon="📦" /> :
        filtered.map(p => <PedidoCard key={p.id} pedido={p} onClick={() => setSelected(p.id)} />)}

      {showNew && (
        <NovoPedidoModal onClose={() => setShowNew(false)} onSave={handleCreate} />
      )}
      {showImport && (
        <ImportarLoteModal onClose={() => setShowImport(false)} onImport={handleImport} />
      )}
    </div>
  )
}

function PedidoCard({ pedido: p, onClick }) {
  const d = useDateInfo(p.data_entrega)
  return (
    <div className="li" onClick={onClick}>
      <div className="li-main">
        <div className="li-title">{p.cliente}</div>
        <div className="li-sub">#{p.numero_pedido} · {p.endereco}{p.cidade ? `, ${p.cidade}` : ''}</div>
        {d && <div style={{ fontSize: 11, color: d.color, marginTop: 2 }}>📅 {d.text}</div>}
        {p.local_separacao && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>🏪 {p.local_separacao}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <Badge status={p.status} />
        {p.prioridade && p.prioridade !== 'Normal' && <Badge status={p.prioridade} style={{ fontSize: 10 }} />}
      </div>
      <Ic n="chev" s={13} style={{ color: 'var(--t3)', flexShrink: 0 }} />
    </div>
  )
}

// ── PDF simples ───────────────────────────────────────────
function gerarPDFSimples(pedido, produtos) {
  const w = window.open('', '_blank')
  if (!w) { alert('Permita popups para gerar o PDF.'); return }
  const rows = produtos.map(p =>
    `<tr><td>${p.nome_produto}</td><td>${p.quantidade}</td><td>${p.status_produto || 'Pendente'}</td></tr>`
  ).join('')
  w.document.write(`
    <html><head><title>Pedido #${pedido.numero_pedido}</title>
    <style>
      body{font-family:sans-serif;padding:24px;color:#111}
      h1{font-size:20px;margin-bottom:4px}
      .sub{color:#666;font-size:13px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{border:1px solid #ddd;padding:8px 10px;text-align:left;font-size:13px}
      th{background:#f5f5f5;font-weight:600}
    </style>
    </head><body>
    <h1>Pedido #${pedido.numero_pedido}</h1>
    <div class="sub">Status: ${pedido.status}</div>
    <p><b>Cliente:</b> ${pedido.cliente}</p>
    <p><b>Endereço:</b> ${pedido.endereco}${pedido.cidade ? ', ' + pedido.cidade : ''}</p>
    <p><b>Entrega:</b> ${pedido.data_entrega ? new Date(pedido.data_entrega + 'T12:00').toLocaleDateString('pt-BR') : '—'}</p>
    ${pedido.entregador_nome ? `<p><b>Entregador:</b> ${pedido.entregador_nome}</p>` : ''}
    ${pedido.observacoes ? `<p><b>Obs:</b> ${pedido.observacoes}</p>` : ''}
    ${produtos.length > 0 ? `<table><thead><tr><th>Produto</th><th>Qtd</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>` : ''}
    <script>window.onload=()=>{window.print()}</script>
    </body></html>
  `)
  w.document.close()
}

// ── Pedido Detalhe ────────────────────────────────────────
function PedidoDetalhe({ pedidoId, onBack }) {
  const { perfil, isGestor } = useAuth()
  const [showEdit, setShowEdit] = useState(false)
  const [showTroca, setShowTroca] = useState(false)
  const [showRemarcar, setShowRemarcar] = useState(false)
  const [showCancelar, setShowCancelar] = useState(false)
  const [showWaGestor, setShowWaGestor] = useState(false)
  const { run: runAction, loading: actionLoading } = useAction()

  const { data: pedido, loading, reload } = useData(() => pedidosService.getById(pedidoId), [pedidoId])
  const { data: historico, reload: reloadHist } = useData(() => pedidosService.getHistorico(pedidoId), [pedidoId])
  const { data: assinatura } = useData(() => assinaturasService.getByPedido(pedidoId), [pedidoId])
  const { data: entregadores } = useData(() => usuariosService.listEntregadores(), [])
  const { data: histCliente } = useData(
    () => pedido?.cliente ? pedidosService.list({ cliente: pedido.cliente }) : Promise.resolve([]),
    [pedido?.cliente]
  )

  const d = useDateInfo(pedido?.data_entrega)

  const FLOW = { Pendente: 'Separando', Separando: 'Pronto para Rota', 'Pronto para Rota': 'Em Rota', 'Em Rota': 'Entregue' }
  const canRota = pedido?.entregador_id && pedido?.entregador_nome
  const proximoStatus = FLOW[pedido?.status]

  const avancar = async () => {
    if (!proximoStatus) return
    if (pedido.status === 'Pronto para Rota' && !canRota) {
      alert('Defina um entregador antes de enviar para rota.')
      return
    }
    await runAction(async () => {
      await pedidosService.update(pedidoId, { status: proximoStatus })
      await pedidosService.addHistorico(pedidoId, 'Status alterado', `Status alterado para ${proximoStatus}`, perfil)
      reload()
      reloadHist()
    })
  }

  const handleTroca = async (entId, entNome, motivo) => {
    const anterior = pedido?.entregador_nome || 'nenhum'
    await runAction(async () => {
      await pedidosService.update(pedidoId, { entregador_id: entId, entregador_nome: entNome })
      await pedidosService.addHistorico(pedidoId, 'Status alterado',
        `Entregador alterado de ${anterior} para ${entNome}. Motivo: ${motivo || 'Não informado'}`, perfil)
      reload()
      reloadHist()
      setShowTroca(false)
    })
  }

  const handleEdit = async (dados) => {
    await runAction(async () => {
      await pedidosService.update(pedidoId, dados)
      reload()
      setShowEdit(false)
    })
  }

  const handleRemarcar = async ({ novaData, motivo }) => {
    await runAction(async () => {
      await pedidosService.update(pedidoId, { status: 'Remarcado', data_entrega: novaData })
      await pedidosService.addHistorico(pedidoId, 'Remarcado',
        `Entrega remarcada para ${new Date(novaData + 'T12:00').toLocaleDateString('pt-BR')}. Motivo: ${motivo || 'Não informado'}`, perfil)
      reload()
      reloadHist()
      setShowRemarcar(false)
    })
  }

  const handleCancelar = async (motivo) => {
    await runAction(async () => {
      await pedidosService.update(pedidoId, { status: 'Cancelado' })
      await pedidosService.addHistorico(pedidoId, 'Cancelado',
        `Pedido cancelado. Motivo: ${motivo || 'Não informado'}`, perfil)
      reload()
      reloadHist()
      setShowCancelar(false)
    })
  }

  if (loading) return <div className="page"><Spinner /></div>
  if (!pedido) return <div className="page"><Empty text="Pedido não encontrado" /></div>

  const produtos = pedido.produtos || []

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
        <Btn variant="ghost" size="sm" onClick={onBack}><Ic n="back" s={13} /> Voltar</Btn>
        <div className="row">
          <Btn variant="secondary" size="sm" onClick={() => gerarPDFSimples(pedido, produtos || [])}><Ic n="pdf" s={13} /> Gerar PDF</Btn>
          {isGestor && <Btn variant="secondary" size="sm" onClick={() => setShowEdit(true)}><Ic n="edit" s={13} /></Btn>}
        </div>
      </div>

      <Badge status={pedido.status} style={{ marginBottom: 8 }} />
      <h1 style={{ fontSize: 20, marginBottom: 2 }}>{pedido.cliente}</h1>
      <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 4 }}>Pedido #{pedido.numero_pedido}</div>
      {d && <div style={{ fontSize: 13, color: d.color, marginBottom: 4 }}>📅 Entrega: {d.text}</div>}
      {pedido.local_separacao && <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 16 }}>🏪 {pedido.local_separacao}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        <div className="card-sm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Ic n="pin" s={14} />
            <div>
              <div style={{ fontSize: 13 }}>{pedido.endereco}</div>
              <div style={{ fontSize: 12, color: 'var(--t2)' }}>{pedido.cidade}</div>
            </div>
          </div>
          <a href={`https://maps.google.com/?q=${encodeURIComponent((pedido.endereco || '') + ', ' + (pedido.cidade || ''))}`} target="_blank" rel="noreferrer">
            <Btn variant="secondary" size="sm">Maps</Btn>
          </a>
        </div>

        {pedido.telefone && (
          <div className="card-sm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Ic n="phone" s={14} />
              <span style={{ fontSize: 13 }}>{pedido.telefone}</span>
            </div>
            <div className="row">
              <a href={`tel:${pedido.telefone}`}><Btn variant="secondary" size="sm">Ligar</Btn></a>
              <Btn variant="success" size="sm" onClick={() => setShowWaGestor(true)}>
                <Ic n="wa" s={12} /> WhatsApp
              </Btn>
            </div>
          </div>
        )}

        <div className="card-sm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Ic n="team" s={14} />
            <span style={{ fontSize: 13, color: pedido.entregador_nome ? 'var(--t1)' : 'var(--t3)' }}>
              {pedido.entregador_nome || 'Sem entregador atribuído'}
            </span>
          </div>
          {isGestor && ['Pendente', 'Separando', 'Pronto para Rota', 'Em Rota'].includes(pedido.status) && (
            <Btn variant="secondary" size="sm" onClick={() => setShowTroca(true)}><Ic n="edit" s={12} /> Alterar</Btn>
          )}
        </div>
      </div>

      {pedido.observacoes && <Alert type="warning" style={{ marginBottom: 14 }}>{pedido.observacoes}</Alert>}

      {!canRota && ['Pendente', 'Separando', 'Pronto para Rota'].includes(pedido.status) && (
        <Alert type="error">⚠ Defina um entregador antes de enviar para rota.</Alert>
      )}

      {produtos.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Produtos ({produtos.length})</div>
          {produtos.map(pr => (
            <div key={pr.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{pr.nome_produto}</div>
                <div style={{ fontSize: 12, color: 'var(--t2)' }}>Qtd: {pr.quantidade}{pr.local_separacao ? ` · ${pr.local_separacao}` : ''}</div>
              </div>
              <Badge status={pr.status_produto || 'Pendente'} />
            </div>
          ))}
        </div>
      )}

      {isGestor && !['Entregue', 'Cancelado'].includes(pedido.status) && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button className="btn btn-s" style={{ flex: 1, justifyContent: 'center', color: 'var(--amber)' }} onClick={() => setShowRemarcar(true)}>📅 Remarcar</button>
          <button className="btn btn-d" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowCancelar(true)}>Cancelar</button>
        </div>
      )}

      {isGestor && proximoStatus && (
        <Btn
          style={{ width: '100%', justifyContent: 'center', padding: 13, marginBottom: 18, opacity: pedido.status === 'Pronto para Rota' && !canRota ? 0.4 : 1 }}
          disabled={(pedido.status === 'Pronto para Rota' && !canRota) || actionLoading}
          loading={actionLoading}
          onClick={avancar}
        >
          Avançar para {proximoStatus} →
        </Btn>
      )}

      <div style={{ fontWeight: 600, marginBottom: 12 }}>Histórico do pedido</div>
      {(historico || []).length === 0 ? <Empty text="Nenhum registro" /> :
        (historico || []).map(h => (
          <div key={h.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--adim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Ic n="check" s={12} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <div style={{ fontSize: 13 }}>{h.descricao || h.tipo}</div>
              <div style={{ fontSize: 11, color: 'var(--t2)' }}>por {h.usuario_nome} · {new Date(h.data_hora).toLocaleString('pt-BR')}</div>
            </div>
          </div>
        ))}

      <HistoricoCliente pedidos={histCliente} pedidoAtualId={pedidoId} />

      {showEdit && (
        <NovoPedidoModal
          inicial={pedido}
          onClose={() => setShowEdit(false)}
          onSave={handleEdit}
          title={`Editar Pedido #${pedido.numero_pedido}`}
        />
      )}

      {showTroca && (
        <TrocarEntregadorModal
          pedido={pedido}
          entregadores={entregadores || []}
          onClose={() => setShowTroca(false)}
          onSave={handleTroca}
          loading={actionLoading}
        />
      )}

      {showRemarcar && (
        <RemarcarModal
          pedido={pedido}
          onClose={() => setShowRemarcar(false)}
          onSave={handleRemarcar}
          loading={actionLoading}
        />
      )}

      {showCancelar && (
        <CancelarModal
          pedido={pedido}
          onClose={() => setShowCancelar(false)}
          onSave={handleCancelar}
          loading={actionLoading}
        />
      )}

      {showWaGestor && pedido.telefone && (
        <WaTemplatesModal pedido={pedido} tipo="gestor" onClose={() => setShowWaGestor(false)} />
      )}
    </div>
  )
}

// ── Histórico do cliente (usado dentro de PedidoDetalhe) ──
function HistoricoCliente({ pedidos, pedidoAtualId }) {
  const outros = (pedidos || []).filter(p => p.id !== pedidoAtualId)
  if (outros.length === 0) return null
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontWeight: 600, marginBottom: 12 }}>Outros pedidos do cliente ({outros.length})</div>
      {outros.slice(0, 6).map(p => (
        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>#{p.numero_pedido}</div>
            <div style={{ fontSize: 12, color: 'var(--t2)' }}>
              {p.data_entrega ? new Date(p.data_entrega + 'T12:00').toLocaleDateString('pt-BR') : '—'}
              {p.local_separacao ? ` · ${p.local_separacao}` : ''}
            </div>
          </div>
          <Badge status={p.status} />
        </div>
      ))}
    </div>
  )
}

// ── Modais de Pedido ─────────────────────────────────────
function NovoPedidoModal({ onClose, onSave, inicial, title }) {
  const [form, setForm] = useState({
    numero_pedido: '', cliente: '', telefone: '', endereco: '',
    cidade: 'Belo Horizonte', data_entrega: '', prioridade: 'Normal',
    observacoes: '', local_separacao: '', status: 'Pendente',
    ...inicial,
  })
  const [errors, setErrors] = useState({})
  const { run, loading } = useAction()

  const up = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))

  const validate = () => {
    const errs = {}
    if (!form.cliente) errs.cliente = 'Obrigatório'
    if (!form.endereco) errs.endereco = 'Obrigatório'
    if (!form.data_entrega) errs.data_entrega = 'Obrigatório'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    await run(() => onSave(form))
  }

  return (
    <Modal
      title={title || 'Novo Pedido'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn loading={loading} onClick={handleSave}><Ic n="save" s={13} /> Salvar</Btn>
        </>
      }
    >
      <div className="grid2">
        <div className="fg">
          <label className="fl">Nº Pedido</label>
          <input className="fi" value={form.numero_pedido} onChange={up('numero_pedido')} placeholder="Ex: 40001" />
        </div>
        <div className="fg">
          <label className="fl">Prioridade</label>
          <select className="fi" value={form.prioridade} onChange={up('prioridade')}>
            <option>Normal</option><option>Alta</option><option>Urgente</option>
          </select>
        </div>
      </div>
      <div className="fg">
        <label className="fl">Nome do Cliente *</label>
        <input className={`fi${errors.cliente ? ' fi-error' : ''}`} value={form.cliente} onChange={up('cliente')} placeholder="Nome completo" />
        {errors.cliente && <div className="field-error">{errors.cliente}</div>}
      </div>
      <div className="grid2">
        <div className="fg">
          <label className="fl">Telefone</label>
          <input className="fi" value={form.telefone} onChange={up('telefone')} placeholder="(31) 99999-9999" />
        </div>
        <div className="fg">
          <label className="fl">Data de Entrega *</label>
          <input className={`fi${errors.data_entrega ? ' fi-error' : ''}`} type="date" value={form.data_entrega} onChange={up('data_entrega')} />
          {errors.data_entrega && <div className="field-error">{errors.data_entrega}</div>}
        </div>
      </div>
      <div className="fg">
        <label className="fl">Endereço *</label>
        <input className={`fi${errors.endereco ? ' fi-error' : ''}`} value={form.endereco} onChange={up('endereco')} placeholder="Rua, número, complemento" />
        {errors.endereco && <div className="field-error">{errors.endereco}</div>}
      </div>
      <div className="grid2">
        <div className="fg">
          <label className="fl">Cidade</label>
          <input className="fi" value={form.cidade} onChange={up('cidade')} />
        </div>
        <div className="fg">
          <label className="fl">Loja</label>
          <input className="fi" value={form.local_separacao} onChange={up('local_separacao')} placeholder="Ex: Templum Minas" />
        </div>
      </div>
      <div className="fg">
        <label className="fl">Observações</label>
        <textarea className="fi" rows={2} value={form.observacoes} onChange={up('observacoes')} />
      </div>
    </Modal>
  )
}

function TrocarEntregadorModal({ pedido, entregadores, onClose, onSave, loading }) {
  const [entId, setEntId] = useState(pedido.entregador_id || '')
  const [motivo, setMotivo] = useState('')
  const ent = entregadores.find(u => u.id === entId)

  return (
    <Modal
      title="Trocar Entregador"
      onClose={onClose}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn disabled={!entId} loading={loading} onClick={() => onSave(entId, ent?.full_name, motivo)}>Confirmar</Btn>
        </>
      }
    >
      <div className="fg">
        <label className="fl">Novo Entregador *</label>
        <select className="fi" value={entId} onChange={e => setEntId(e.target.value)}>
          <option value="">Selecione...</option>
          {entregadores.map(u => (
            <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
          ))}
        </select>
      </div>
      <div className="fg">
        <label className="fl">Motivo (opcional)</label>
        <input className="fi" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: entregador indisponível..." />
      </div>
    </Modal>
  )
}

function RemarcarModal({ pedido, onClose, onSave, loading }) {
  const [novaData, setNovaData] = useState(pedido.data_entrega || '')
  const [motivo, setMotivo] = useState('')
  return (
    <Modal
      title="Remarcar Entrega"
      onClose={onClose}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn disabled={!novaData || !motivo} loading={loading} onClick={() => onSave({ novaData, motivo })}>Confirmar</Btn>
        </>
      }
    >
      <div className="fg">
        <label className="fl">Nova data de entrega *</label>
        <input className="fi" type="date" value={novaData} onChange={e => setNovaData(e.target.value)} />
      </div>
      <div className="fg">
        <label className="fl">Motivo *</label>
        <textarea className="fi" rows={3} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: cliente ausente, reagendamento solicitado..." />
      </div>
    </Modal>
  )
}

function CancelarModal({ pedido, onClose, onSave, loading }) {
  const [motivo, setMotivo] = useState('')
  const [confirmar, setConfirmar] = useState(false)
  return (
    <Modal
      title="Cancelar Pedido"
      onClose={onClose}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Voltar</Btn>
          <Btn
            disabled={!motivo || !confirmar}
            loading={loading}
            onClick={() => onSave(motivo)}
            style={{ background: 'var(--red)', color: '#fff', borderColor: 'var(--red)' }}
          >
            Cancelar pedido
          </Btn>
        </>
      }
    >
      <Alert type="error">Esta ação não pode ser desfeita. O pedido #{pedido.numero_pedido} será marcado como Cancelado.</Alert>
      <div className="fg" style={{ marginTop: 12 }}>
        <label className="fl">Motivo do cancelamento *</label>
        <textarea className="fi" rows={3} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: cliente desistiu, pagamento não confirmado..." />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginTop: 10 }}>
        <input type="checkbox" checked={confirmar} onChange={e => setConfirmar(e.target.checked)} />
        Confirmo que desejo cancelar este pedido
      </label>
    </Modal>
  )
}

// ── Importar em Lote ──────────────────────────────────────
function ImportarLoteModal({ onClose, onImport }) {
  const [step, setStep] = useState(0)
  const [files, setFiles] = useState([])
  const [items, setItems] = useState([])
  const [prog, setProg] = useState(0)
  const { run, loading } = useAction()

  const processar = async () => {
    await run(async () => {
      const result = []
      for (let i = 0; i < files.length; i++) {
        setProg(Math.round(((i + 1) / files.length) * 100))
        // Mock extraction — replace with real PDF extraction in production
        await new Promise(r => setTimeout(r, 400))
        result.push({
          numero_pedido: `MOCK-${Date.now()}-${i}`,
          cliente: files[i].name.replace('.pdf', '').toUpperCase(),
          endereco: 'A preencher',
          cidade: 'Belo Horizonte',
          data_entrega: new Date().toISOString().split('T')[0],
          status: 'Pendente',
          prioridade: 'Normal',
          local_separacao: '',
          produtos: [],
          selected: true,
          erro: null,
        })
      }
      setItems(result)
      setStep(1)
    })
  }

  const toggle = (i) => setItems(prev => prev.map((p, idx) => idx === i ? { ...p, selected: !p.selected } : p))
  const upd = (i, k, v) => setItems(prev => prev.map((p, idx) => idx === i ? { ...p, [k]: v } : p))
  const selecionados = items.filter(p => p.selected && !p.erro)

  const confirmar = async () => {
    await run(async () => {
      await onImport(selecionados)
      setStep(2)
    })
  }

  const isPassado = (d) => d && new Date(d + 'T12:00') < new Date(new Date().toDateString())

  return (
    <Modal
      title="Importar Fichas em Lote"
      subtitle={step === 0 ? 'Selecione os PDFs' : step === 1 ? `${selecionados.length} pronto(s)` : 'Concluído'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          {step === 0 && (
            <>
              <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
              <Btn disabled={files.length === 0} loading={loading} onClick={processar}>
                Processar {files.length} ficha(s)
              </Btn>
            </>
          )}
          {step === 1 && (
            <>
              <Btn variant="secondary" onClick={() => setStep(0)}>← Voltar</Btn>
              <Btn disabled={selecionados.length === 0} loading={loading} onClick={confirmar}>
                ✓ Importar {selecionados.length}
              </Btn>
            </>
          )}
          {step === 2 && <Btn onClick={onClose}>Fechar</Btn>}
        </>
      }
    >
      {step === 0 && (
        <div>
          <label className="upload-zone" style={{ display: 'block' }}>
            <input type="file" multiple accept=".pdf,.jpg,.png" style={{ display: 'none' }} onChange={e => setFiles(Array.from(e.target.files))} />
            <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Toque para selecionar fichas</div>
            <div style={{ fontSize: 12, color: 'var(--t2)' }}>PDF, JPG ou PNG · múltiplos arquivos</div>
          </label>
          {files.length > 0 && (
            <div style={{ marginTop: 14 }}>
              {files.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--bg2)', borderRadius: 6, marginBottom: 5 }}>
                  <span>📄</span>
                  <span style={{ flex: 1, fontSize: 12 }}>{f.name}</span>
                  <button className="btn btn-g btn-ico btn-sm" style={{ color: 'var(--red)' }} onClick={() => setFiles(prev => prev.filter((_, fi) => fi !== i))}>
                    <Ic n="x" s={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {loading && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 6 }}>Processando... {prog}%</div>
              <div className="progress"><div className="progress-fill" style={{ width: `${prog}%` }} /></div>
            </div>
          )}
        </div>
      )}

      {step === 1 && items.map((p, i) => (
        <div key={i} style={{
          background: p.erro ? 'var(--rdim)' : isPassado(p.data_entrega) ? 'rgba(245,158,11,.05)' : 'var(--bg2)',
          border: `1px solid ${p.erro ? 'rgba(239,68,68,.3)' : isPassado(p.data_entrega) ? 'rgba(245,158,11,.3)' : 'var(--border)'}`,
          borderRadius: 10, padding: 13, marginBottom: 9,
        }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <input type="checkbox" checked={!!p.selected && !p.erro} disabled={!!p.erro} onChange={() => toggle(i)} style={{ marginTop: 3 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{p.cliente}</div>
                <span style={{ fontSize: 11, color: 'var(--t2)' }}>#{p.numero_pedido}</span>
              </div>
              {!p.erro && (
                <>
                  <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 6 }}>{p.endereco}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input type="date" value={p.data_entrega || ''} onChange={e => upd(i, 'data_entrega', e.target.value)}
                      style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--t1)', fontSize: 12, fontFamily: 'var(--font)' }} />
                    <select value={p.prioridade} onChange={e => upd(i, 'prioridade', e.target.value)}
                      style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--t1)', fontSize: 12, fontFamily: 'var(--font)' }}>
                      <option>Normal</option><option>Alta</option><option>Urgente</option>
                    </select>
                  </div>
                  {isPassado(p.data_entrega) && <div style={{ marginTop: 6, fontSize: 11, color: 'var(--amber)' }}>⚠ Data no passado — verifique</div>}
                </>
              )}
              {p.erro && <div style={{ fontSize: 12, color: 'var(--red)' }}>Erro: {p.erro}</div>}
            </div>
          </div>
        </div>
      ))}

      {step === 2 && (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{selecionados.length} pedido(s) importado(s)!</div>
          <div style={{ fontSize: 13, color: 'var(--t2)' }}>Os pedidos já estão disponíveis na listagem.</div>
        </div>
      )}
    </Modal>
  )
}

// ============================================================
// AGENDA
// ============================================================
function Agenda() {
  const [cur, setCur] = useState(new Date())
  const { data: pedidos } = useData(() => pedidosService.list(), [])

  const y = cur.getFullYear(), m = cur.getMonth()
  const first = new Date(y, m, 1).getDay()
  const days = new Date(y, m + 1, 0).getDate()
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  const byDay = (d) => {
    const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    return (pedidos || []).filter(p => p.data_entrega === ds)
  }

  return (
    <div className="page">
      <div className="ph">
        <h1 style={{ textTransform: 'capitalize' }}>{cur.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h1>
        <div className="row">
          <Btn variant="secondary" size="sm" onClick={() => setCur(new Date(y, m - 1, 1))}>←</Btn>
          <Btn variant="secondary" size="sm" onClick={() => setCur(new Date(y, m + 1, 1))}>→</Btn>
        </div>
      </div>
      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
          {diasSemana.map(d => (
            <div key={d} style={{ padding: '6px 4px', textAlign: 'center', fontSize: 11, color: 'var(--t3)', fontWeight: 500 }}>{d}</div>
          ))}
          {Array(first).fill(null).map((_, i) => <div key={`e${i}`} />)}
          {Array(days).fill(null).map((_, i) => {
            const day = i + 1
            const ps = byDay(day)
            const isToday = new Date().getDate() === day && new Date().getMonth() === m && new Date().getFullYear() === y
            return (
              <div key={day} style={{
                padding: '6px 5px', minHeight: 56, borderRadius: 6,
                background: isToday ? 'var(--adim)' : 'transparent',
                border: isToday ? '1px solid var(--accent)' : '1px solid transparent',
              }}>
                <div style={{ fontSize: 11, fontWeight: isToday ? 600 : 400, color: isToday ? 'var(--accent)' : 'var(--t2)', marginBottom: 3 }}>{day}</div>
                {ps.slice(0, 2).map(p => (
                  <div key={p.id} style={{ fontSize: 9, padding: '1px 3px', borderRadius: 3, background: 'var(--bg3)', color: 'var(--t2)', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.cliente?.split(' ')[0]}
                  </div>
                ))}
                {ps.length > 2 && <div style={{ fontSize: 9, color: 'var(--accent)' }}>+{ps.length - 2}</div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// ASSISTENCIA - CENTRAL
// ============================================================
function Assistencia() {
  const { perfil } = useAuth()
  const [sf, setSf] = useState('Todos')
  const [busca, setBusca] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [showRelatorio, setShowRelatorio] = useState(false)
  const { data: assistencias, loading, reload } = useData(() => assistenciasService.list(), [])

  const hoje = new Date()
  const diasAberto = (d) => !d ? 0 : Math.floor((hoje - new Date(d)) / 86400000)

  const lista = assistencias || []
  const ativas = lista.filter(a => !['Concluído', 'Cancelado'].includes(a.status))
  const criticas = ativas.filter(a => diasAberto(a.data_abertura) >= 30)
  const urgentes = ativas.filter(a => { const d = diasAberto(a.data_abertura); return d >= 20 && d < 30 })

  const statuses = ['Todos', 'Aberto', 'Em andamento', 'Aguardando fábrica', 'Aguardando peça', 'Agendado', 'Concluído', 'Cancelado']
  const filtered = lista.filter(a => {
    const okStatus = sf === 'Todos' || a.status === sf
    const okBusca = !busca || [a.cliente, a.pedido_ref, a.loja, a.tipo_problema].some(v => v?.toLowerCase().includes(busca.toLowerCase()))
    return okStatus && okBusca
  })

  const handleCreate = async (dados) => {
    const { itens, ...assistencia } = dados
    const nova = await assistenciasService.create({ ...assistencia, created_by: perfil?.id })
    if (itens?.length) {
      for (const item of itens) await assistenciasService.createItem({ ...item, assistencia_id: nova.id })
    }
    await reload()
    setShowNew(false)
  }

  const handleImport = async (rows, onProgress) => {
    const BATCH = 20
    let done = 0, criadas = 0, atualizadas = 0, erros = 0

    // Agrupa por pedido_ref+cliente → 1 assistência por grupo (evita duplicatas internas ao import)
    const gruposMap = new Map()
    for (const row of rows) {
      const key = `${row.pedido_ref || ''}||${row.cliente}`
      if (!gruposMap.has(key)) gruposMap.set(key, { principal: row, itens: [] })
      gruposMap.get(key).itens.push(row)
    }
    const grupos = Array.from(gruposMap.values())
    const total = grupos.length

    const paraAtualizar = grupos.filter(g => g.principal.pedido_ref && lista.find(a => a.pedido_ref === g.principal.pedido_ref && a.cliente === g.principal.cliente))
    const paraCriar = grupos.filter(g => !g.principal.pedido_ref || !lista.find(a => a.pedido_ref === g.principal.pedido_ref && a.cliente === g.principal.cliente))

    // Atualiza existentes + adiciona itens novos
    for (const { principal, itens } of paraAtualizar) {
      const existing = lista.find(a => a.pedido_ref === principal.pedido_ref && a.cliente === principal.cliente)
      try {
        await assistenciasService.update(existing.id, {
          loja: principal.loja || existing.loja,
          categoria: principal.categoria || existing.categoria,
        })
        const itemsNovas = itens.filter(r => (r.produto || r.descricao || r.categoria))
        for (const row of itemsNovas) {
          await supabase.from('assistencia_itens').insert({
            assistencia_id: existing.id,
            produto: (row.produto || row.categoria || row.descricao || 'Item importado').trim(),
            fornecedor: row.fornecedor || null, motivo: row.categoria || 'Outros',
            descricao: row.descricao || null, status: 'Aberto',
            prazo: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          })
        }
        atualizadas++
      } catch (e) { console.error('[Import] Erro atualizar', existing?.id, e); erros++ }
      done++
      onProgress?.(done, total)
    }

    // Cria novos em batches de 20
    for (let i = 0; i < paraCriar.length; i += BATCH) {
      const lote = paraCriar.slice(i, i + BATCH)
      const payload = lote.map(({ principal }) => ({
        cliente: principal.cliente,
        pedido_ref: principal.pedido_ref || null,
        loja: principal.loja || null,
        categoria: principal.categoria || null,
        tipo_problema: principal.categoria || principal.produto || 'Outros',
        observacoes: principal.descricao || null,
        data_abertura: principal.data_abertura || hoje.toISOString().split('T')[0],
        status: 'Aberto',
        origem: 'excel',
      }))

      try {
        const { data: inseridos, error } = await supabase
          .from('assistencias').insert(payload).select('id, cliente, pedido_ref')

        if (error) {
          console.error(`[Import] ❌ Batch ${Math.floor(i / BATCH) + 1}:`, error.code, error.message, error.details)
          erros += lote.length
        } else {
          // Para cada assistência criada, insere TODOS os produtos do grupo (posição garante match)
          const itemsPayload = []
          for (let j = 0; j < inseridos.length; j++) {
            for (const row of lote[j].itens) {
              itemsPayload.push({
                assistencia_id: inseridos[j].id,
                produto: (row.produto || row.categoria || row.descricao || 'Item importado').trim(),
                fornecedor: row.fornecedor || null, motivo: row.categoria || 'Outros',
                descricao: row.descricao || null, status: 'Aberto',
                prazo: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
              })
            }
          }
          if (itemsPayload.length) {
            const { error: ie } = await supabase.from('assistencia_itens').insert(itemsPayload)
            if (ie) console.error(`[Import] ❌ Itens batch ${Math.floor(i / BATCH) + 1}:`, ie.code, ie.message)
            else console.log(`[Import] ✅ Batch ${Math.floor(i / BATCH) + 1}: ${inseridos.length} assist + ${itemsPayload.length} itens`)
          }
          criadas += inseridos.length
        }
      } catch (e) { console.error(`[Import] ❌ Exceção batch ${Math.floor(i / BATCH) + 1}:`, e); erros += lote.length }

      done += lote.length
      onProgress?.(Math.min(done, total), total)
    }

    await reload()
    setShowImport(false)
    alert(`Importação: ${criadas} assistências criadas${atualizadas > 0 ? `, ${atualizadas} atualizadas` : ''}${erros > 0 ? `, ${erros} com erro (F12)` : ''}.`)
  }

  if (selectedId) return <AssistenciaDetalhe id={selectedId} onBack={() => { setSelectedId(null); reload() }} />
  if (showRelatorio) return <RelatorioAssistencias onBack={() => setShowRelatorio(false)} />

  return (
    <div className="page">
      <div className="ph">
        <div>
          <h1>Central de Assistências</h1>
          <div className="ph-sub">{ativas.length} em andamento</div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Btn variant="ghost" size="sm" onClick={() => setShowRelatorio(true)}><Ic n="bar" s={13} /> Relatório</Btn>
          <Btn variant="secondary" size="sm" onClick={() => setShowImport(true)}><Ic n="save" s={13} /> Excel</Btn>
          <Btn size="sm" onClick={() => setShowNew(true)}><Ic n="plus" s={13} /> Nova</Btn>
        </div>
      </div>

      <div className="stats" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
        {[
          { label: 'Críticas +30d', val: criticas.length, color: 'var(--red)', bg: 'var(--rdim)' },
          { label: 'Urgentes +20d', val: urgentes.length, color: 'var(--amber)', bg: 'var(--adim2)' },
          { label: 'Abertas', val: ativas.length, color: 'var(--accent)', bg: 'var(--adim)' },
        ].map(s => (
          <div className="stat" key={s.label}>
            <div className="stat-val" style={{ color: s.color }}>{loading ? '—' : s.val}</div>
            <div className="stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="fg" style={{ marginBottom: 12 }}>
        <input className="fi" placeholder="Buscar cliente, pedido, loja..." value={busca} onChange={e => setBusca(e.target.value)} />
      </div>
      <div className="filters" style={{ marginBottom: 16 }}>
        {statuses.map(s => <button key={s} className={`fb${sf === s ? ' on' : ''}`} onClick={() => setSf(s)}>{s}</button>)}
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? <Empty icon="🔧" text="Nenhuma assistência encontrada" /> :
        filtered.map(a => <AssistenciaCard key={a.id} assistencia={a} onClick={() => setSelectedId(a.id)} />)}

      {showNew && <NovaAssistenciaModal onClose={() => setShowNew(false)} onSave={handleCreate} />}
      {showImport && <ImportarExcelAssistenciaModal onClose={() => setShowImport(false)} onImport={handleImport} existentes={lista} />}
    </div>
  )
}

function AssistenciaCard({ assistencia: a, onClick }) {
  const dias = Math.floor((new Date() - new Date(a.data_abertura)) / 86400000)
  const ativo = !['Concluído', 'Cancelado'].includes(a.status)
  const cor = ativo ? (dias >= 30 ? '#ef4444' : dias >= 20 ? '#f59e0b' : dias >= 10 ? '#3b82f6' : 'var(--t3)') : 'var(--t3)'
  const bg = ativo ? (dias >= 30 ? 'rgba(239,68,68,0.06)' : dias >= 20 ? 'rgba(245,158,11,0.06)' : dias >= 10 ? 'rgba(59,130,246,0.06)' : 'transparent') : 'transparent'
  return (
    <div className="li" style={{ borderLeft: `3px solid ${cor}`, background: bg }} onClick={onClick}>
      <div className="li-main">
        <div className="li-title" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span>{a.cliente}</span>
          {a.pedido_ref && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'var(--adim)', borderRadius: 4, padding: '1px 6px' }}>#{a.pedido_ref}</span>}
          {a.loja && <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 400 }}>{a.loja}</span>}
        </div>
        <div className="li-sub">{a.tipo_problema || 'Sem categoria'}{a.categoria ? ` · ${a.categoria}` : ''}</div>
        {ativo && <div style={{ fontSize: 11, color: cor, marginTop: 2 }}>⏱ {dias} dias aberto</div>}
      </div>
      <Badge status={a.status} />
      <Ic n="chev" s={13} style={{ color: 'var(--t3)', flexShrink: 0 }} />
    </div>
  )
}

function AssistenciaDetalhe({ id, onBack }) {
  const { perfil } = useAuth()
  const { data: a, loading, reload } = useData(() => assistenciasService.getById(id), [id])
  const { run, loading: actionLoading } = useAction()
  const [aba, setAba] = useState(0)

  useEffect(() => {
    if (!a) return
    const dias = Math.floor((new Date() - new Date(a.updated_at || a.data_abertura)) / 86400000)
    if (dias >= 7 && !['Concluído', 'Cancelado'].includes(a.status)) {
      supabase.from('assistencia_tarefas').select('id').eq('assistencia_id', id).eq('criado_automaticamente', true).eq('status', 'pendente')
        .then(({ data }) => {
          if (!data?.length) {
            supabase.from('assistencia_tarefas').insert({ assistencia_id: id, titulo: 'Assistência sem atualização há +7 dias', descricao: `Verificar e atualizar o status (${dias} dias sem alteração)`, tipo: 'follow_up', status: 'pendente', criado_automaticamente: true, prazo: new Date().toISOString().split('T')[0] })
          }
        })
    }
  }, [a?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = async (status) => {
    await run(() => assistenciasService.update(id, { status }))
    reload()
  }

  if (loading) return <div className="page"><Spinner /></div>
  if (!a) return <div className="page"><Empty text="Não encontrado" /></div>

  const dias = Math.floor((new Date() - new Date(a.data_abertura)) / 86400000)

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
        <Btn variant="ghost" size="sm" onClick={onBack}><Ic n="back" s={13} /> Voltar</Btn>
        <select className="fi" style={{ width: 'auto' }} value={a.status} onChange={e => updateStatus(e.target.value)} disabled={actionLoading}>
          {['Aberto', 'Em andamento', 'Aguardando fábrica', 'Aguardando peça', 'Agendado', 'Concluído', 'Cancelado'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <Badge status={a.status} style={{ marginBottom: 8 }} />
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>{a.cliente}</h1>
      <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 4 }}>
        {a.loja && <span>{a.loja} · </span>}
        {a.pedido_ref && <span>#{a.pedido_ref} · </span>}
        {dias} dias aberto
      </div>
      <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 16 }}>
        Aberto em {new Date(a.data_abertura + 'T12:00').toLocaleDateString('pt-BR')}
        {a.responsavel_nome && ` · ${a.responsavel_nome}`}
      </div>

      <div className="filters" style={{ marginBottom: 16 }}>
        {['Produtos', 'Mensagens', 'Tarefas'].map((tab, i) => (
          <button key={tab} className={`fb${aba === i ? ' on' : ''}`} onClick={() => setAba(i)}>{tab}</button>
        ))}
      </div>

      {aba === 0 && <AssistenciaProdutosAba itens={a.assistencia_itens || []} />}
      {aba === 1 && <AssistenciaMensagensAba assistenciaId={id} assistencia={a} perfil={perfil} />}
      {aba === 2 && <AssistenciaTarefasAba assistenciaId={id} perfil={perfil} />}
    </div>
  )
}

function AssistenciaProdutosAba({ itens }) {
  if (!itens.length) return <Empty icon="📦" text="Nenhum produto cadastrado" />
  return (
    <div>
      {itens.map(item => (
        <div className="card-sm" key={item.id} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{item.produto}</div>
            <Badge status={item.status} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--t2)' }}>{item.motivo}{item.fornecedor ? ` · ${item.fornecedor}` : ''}</div>
          {item.descricao && <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 4 }}>{item.descricao}</div>}
          {item.prazo && <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 6 }}>⏱ Prazo: {new Date(item.prazo + 'T12:00').toLocaleDateString('pt-BR')}</div>}
        </div>
      ))}
    </div>
  )
}

const TEMPLATES_WPP = [
  { label: 'Saudação', icon: '👋', gerar: (a) => `Olá ${a.cliente?.split(' ')[0] || 'cliente'}, tudo bem? Aqui é da ${a.loja || 'Versa Log'}, referente ao seu pedido${a.pedido_ref ? ` #${a.pedido_ref}` : ''}. Entramos em contato sobre a assistência técnica solicitada. Como podemos ajudar?` },
  { label: 'Atualização', icon: '📋', gerar: (a) => `Olá ${a.cliente?.split(' ')[0] || 'cliente'}! Temos uma atualização sobre sua assistência${a.pedido_ref ? ` do pedido #${a.pedido_ref}` : ''}. Estamos trabalhando para resolver o mais rápido possível. Qualquer novidade, entramos em contato. Obrigado pela paciência! 🙏` },
  { label: 'Desculpas', icon: '😔', gerar: (a) => `Olá ${a.cliente?.split(' ')[0] || 'cliente'}, pedimos desculpas pelo inconveniente com o seu produto${a.pedido_ref ? ` (pedido #${a.pedido_ref})` : ''}. Estamos tomando as providências necessárias para resolver a situação o quanto antes. Agradecemos sua compreensão!` },
]

const TEMPLATES_EMAIL = [
  { label: 'Cobrança fábrica', icon: '📧', assunto: (a) => `Cobrança de retorno - Assistência cliente ${a.cliente}`, gerar: (a) => `Prezados,\n\nEstamos aguardando retorno sobre a assistência técnica do cliente ${a.cliente}${a.pedido_ref ? `, pedido #${a.pedido_ref}` : ''}.\n\nA solicitação foi aberta há ${Math.floor((new Date() - new Date(a.data_abertura)) / 86400000)} dias e ainda não recebemos posicionamento.\n\nSolicitamos urgência na resolução deste caso.\n\nAtenciosamente,\nEquipe ${a.loja || 'Versa Log'}` },
  { label: 'Defeito fábrica', icon: '⚠️', assunto: (a) => `Defeito de fabricação - ${a.cliente} - Pedido #${a.pedido_ref || '—'}`, gerar: (a) => `Prezados,\n\nIdentificamos defeito de fabricação no(s) produto(s) do cliente ${a.cliente}, referente ao pedido #${a.pedido_ref || '—'}.\n\nSolicitamos análise e providências para troca/reparo dos itens afetados.\n\nAguardamos retorno.\n\nAtenciosamente,\nEquipe ${a.loja || 'Versa Log'}` },
  { label: 'Medida errada', icon: '📐', assunto: (a) => `Produto com medida incorreta - ${a.cliente}`, gerar: (a) => `Prezados,\n\nO produto entregue ao cliente ${a.cliente} (pedido #${a.pedido_ref || '—'}) apresenta medidas incorretas em relação ao pedido realizado.\n\nSolicitamos verificação e envio do produto correto com urgência.\n\nAtenciosamente,\nEquipe ${a.loja || 'Versa Log'}` },
]

function AssistenciaMensagensAba({ assistenciaId, assistencia: a, perfil }) {
  const [interacoes, setInteracoes] = useState([])
  const [loadingI, setLoadingI] = useState(true)
  const [showTpl, setShowTpl] = useState(false)
  const [tipo, setTipo] = useState('wpp')
  const [texto, setTexto] = useState('')
  const [assunto, setAssunto] = useState('')
  const [saving, setSaving] = useState(false)
  const [copiado, setCopiado] = useState('')

  useEffect(() => {
    supabase.from('assistencia_interacoes').select('*').eq('assistencia_id', assistenciaId).order('created_at', { ascending: false })
      .then(({ data }) => { setInteracoes(data || []); setLoadingI(false) })
  }, [assistenciaId])

  const salvar = async (t, dest, subj, cont) => {
    setSaving(true)
    const { data } = await supabase.from('assistencia_interacoes').insert({ assistencia_id: assistenciaId, tipo: t, destinatario: dest, assunto: subj, conteudo: cont, usuario_nome: perfil?.full_name || '', created_at: new Date().toISOString() }).select().single()
    if (data) setInteracoes(prev => [data, ...prev])
    setSaving(false); setTexto(''); setAssunto(''); setShowTpl(false)
  }

  const copiar = (t, k) => { navigator.clipboard.writeText(t); setCopiado(k); setTimeout(() => setCopiado(''), 2000) }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Btn variant={tipo === 'wpp' && showTpl ? 'primary' : 'secondary'} size="sm" onClick={() => { setTipo('wpp'); setShowTpl(true) }}>💬 WhatsApp</Btn>
        <Btn variant={tipo === 'email' && showTpl ? 'primary' : 'secondary'} size="sm" onClick={() => { setTipo('email'); setShowTpl(true) }}>📧 Email Fábrica</Btn>
      </div>

      {showTpl && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>{tipo === 'wpp' ? '💬 Templates WhatsApp (cliente)' : '📧 Templates Email (fábrica)'}</div>
          {(tipo === 'wpp' ? TEMPLATES_WPP : TEMPLATES_EMAIL).map((tpl, i) => {
            const txt = tpl.gerar(a); const subj = tpl.assunto ? tpl.assunto(a) : ''; const k = `${tipo}_${i}`
            return (
              <div key={i} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                <div style={{ fontWeight: 500, fontSize: 12, marginBottom: 6 }}>{tpl.icon} {tpl.label}</div>
                {subj && <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>Assunto: {subj}</div>}
                <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 8, whiteSpace: 'pre-line' }}>{txt}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Btn variant="secondary" size="sm" onClick={() => copiar(txt, k)}>{copiado === k ? '✓ Copiado!' : '📋 Copiar'}</Btn>
                  <Btn size="sm" loading={saving} onClick={() => salvar(tipo, tipo === 'wpp' ? 'cliente' : 'fabrica', subj, txt)}>Salvar registro</Btn>
                </div>
              </div>
            )
          })}
          <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Mensagem manual:</div>
            {tipo === 'email' && <div className="fg" style={{ marginBottom: 8 }}><input className="fi" placeholder="Assunto" value={assunto} onChange={e => setAssunto(e.target.value)} /></div>}
            <div className="fg" style={{ marginBottom: 8 }}><textarea className="fi" rows={3} placeholder="Mensagem..." value={texto} onChange={e => setTexto(e.target.value)} /></div>
            <Btn size="sm" disabled={!texto.trim()} loading={saving} onClick={() => salvar(tipo, tipo === 'wpp' ? 'cliente' : 'fabrica', assunto, texto)}>Salvar</Btn>
          </div>
          <Btn variant="ghost" size="sm" style={{ marginTop: 8 }} onClick={() => setShowTpl(false)}>Fechar</Btn>
        </div>
      )}

      {loadingI ? <Spinner /> : interacoes.length === 0 ? <Empty icon="💬" text="Nenhuma mensagem registrada" /> :
        interacoes.map(i => (
          <div key={i.id} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: i.tipo === 'wpp' ? '#25d366' : 'var(--accent)' }}>{i.tipo === 'wpp' ? '💬 WhatsApp' : '📧 Email'}</span>
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>→ {i.destinatario}</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--t3)' }}>{new Date(i.created_at).toLocaleDateString('pt-BR')} · {i.usuario_nome}</span>
            </div>
            {i.assunto && <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>Assunto: {i.assunto}</div>}
            <div style={{ fontSize: 12, color: 'var(--t2)', whiteSpace: 'pre-line' }}>{i.conteudo}</div>
          </div>
        ))
      }
    </div>
  )
}

function AssistenciaTarefasAba({ assistenciaId, perfil }) {
  const [tarefas, setTarefas] = useState([])
  const [loadingT, setLoadingT] = useState(true)
  const [showNova, setShowNova] = useState(false)
  const [showConcluir, setShowConcluir] = useState(null)

  const carregar = () => {
    setLoadingT(true)
    supabase.from('assistencia_tarefas').select('*').eq('assistencia_id', assistenciaId).order('created_at', { ascending: false })
      .then(({ data }) => { setTarefas(data || []); setLoadingT(false) })
  }

  useEffect(() => { carregar() }, [assistenciaId]) // eslint-disable-line react-hooks/exhaustive-deps

  const criar = async (dados) => {
    await supabase.from('assistencia_tarefas').insert({ ...dados, assistencia_id: assistenciaId, status: 'pendente', criado_automaticamente: false, usuario_nome: perfil?.full_name || '', created_at: new Date().toISOString() })
    carregar(); setShowNova(false)
  }

  const concluir = async (tarId, obs) => {
    await supabase.from('assistencia_tarefas').update({ status: 'concluída', observacao_conclusao: obs, concluido_em: new Date().toISOString() }).eq('id', tarId)
    carregar(); setShowConcluir(null)
  }

  const pendentes = tarefas.filter(t => t.status === 'pendente')
  const concluidas = tarefas.filter(t => t.status === 'concluída')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--t2)' }}>{pendentes.length} pendente(s)</div>
        <Btn size="sm" onClick={() => setShowNova(true)}><Ic n="plus" s={12} /> Nova Tarefa</Btn>
      </div>
      {loadingT ? <Spinner /> : (
        <>
          {pendentes.length === 0 && concluidas.length === 0 && <Empty icon="✅" text="Nenhuma tarefa" />}
          {pendentes.map(t => (
            <div key={t.id} style={{ background: t.criado_automaticamente ? 'rgba(245,158,11,0.05)' : 'var(--bg1)', border: `1px solid ${t.criado_automaticamente ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ fontWeight: 500, fontSize: 13 }}>
                  {t.criado_automaticamente && <span style={{ fontSize: 10, color: 'var(--amber)', marginRight: 6 }}>⚡ AUTO</span>}
                  {t.titulo}
                </div>
                <Btn size="sm" variant="secondary" onClick={() => setShowConcluir(t)}>Concluir</Btn>
              </div>
              {t.descricao && <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 4 }}>{t.descricao}</div>}
              {t.prazo && <div style={{ fontSize: 11, color: 'var(--amber)' }}>⏱ Prazo: {new Date(t.prazo + 'T12:00').toLocaleDateString('pt-BR')}</div>}
            </div>
          ))}
          {concluidas.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 8 }}>Concluídas ({concluidas.length})</div>
              {concluidas.map(t => (
                <div key={t.id} style={{ opacity: 0.55, background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 10, padding: 10, marginBottom: 6 }}>
                  <div style={{ fontSize: 12, textDecoration: 'line-through' }}>✓ {t.titulo}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {showNova && (
        <Modal title="Nova Tarefa" onClose={() => setShowNova(false)} footer={null}>
          <NovaTarefaForm onSave={criar} onCancel={() => setShowNova(false)} />
        </Modal>
      )}
      {showConcluir && (
        <Modal title="Concluir Tarefa" onClose={() => setShowConcluir(null)} footer={null}>
          <ConcluirTarefaForm tarefa={showConcluir} onSave={(obs) => concluir(showConcluir.id, obs)} onCancel={() => setShowConcluir(null)} />
        </Modal>
      )}
    </div>
  )
}

function NovaTarefaForm({ onSave, onCancel }) {
  const [form, setForm] = useState({ titulo: '', descricao: '', tipo: 'follow_up', prazo: '' })
  const [saving, setSaving] = useState(false)
  const up = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))
  return (
    <>
      <div className="fg"><label className="fl">Título *</label><input className="fi" value={form.titulo} onChange={up('titulo')} /></div>
      <div className="fg">
        <label className="fl">Tipo</label>
        <select className="fi" value={form.tipo} onChange={up('tipo')}>
          {['follow_up', 'visita', 'contato_fabrica', 'agendamento', 'outro'].map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="fg"><label className="fl">Prazo</label><input className="fi" type="date" value={form.prazo} onChange={up('prazo')} /></div>
      <div className="fg"><label className="fl">Descrição</label><textarea className="fi" rows={2} value={form.descricao} onChange={up('descricao')} /></div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
        <Btn disabled={!form.titulo.trim()} loading={saving} onClick={async () => { setSaving(true); await onSave(form); setSaving(false) }}>Salvar</Btn>
      </div>
    </>
  )
}

function ConcluirTarefaForm({ tarefa, onSave, onCancel }) {
  const [obs, setObs] = useState('')
  const [saving, setSaving] = useState(false)
  return (
    <>
      <div style={{ fontWeight: 500, marginBottom: 8 }}>{tarefa.titulo}</div>
      <div className="fg"><label className="fl">Observação da conclusão</label><textarea className="fi" rows={3} value={obs} onChange={e => setObs(e.target.value)} placeholder="O que foi feito..." /></div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
        <Btn style={{ background: 'var(--green)' }} loading={saving} onClick={async () => { setSaving(true); await onSave(obs); setSaving(false) }}>✓ Concluir</Btn>
      </div>
    </>
  )
}

function ImportarExcelAssistenciaModal({ onClose, onImport, existentes }) {
  const [rows, setRows] = useState([])
  const [rawDebug, setRawDebug] = useState(null)  // linhas brutas para diagnóstico
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

      // Diagnóstico: mostra cabeçalho (linha 5) + primeiras 3 linhas de dados
      setRawDebug({
        cabecalho: raw[4] || [],   // linha 5 (índice 4)
        linha1: raw[5] || [],      // linha 6 (índice 5)
        linha2: raw[6] || [],      // linha 7
        linha3: raw[7] || [],      // linha 8
        totalLinhas: raw.length,
      })

      const dataRows = raw.slice(5)

      const parseDate = (v) => {
        if (!v) return ''
        if (typeof v === 'number') {
          const d = new Date(Math.round((v - 25569) * 86400 * 1000))
          return d.toISOString().split('T')[0]
        }
        const s = String(v).trim()
        if (s.includes('/')) {
          const parts = s.split('/')
          if (parts.length === 3) {
            const [d, m, y] = parts
            return `${y.padStart(4, '20')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
          }
        }
        return s.slice(0, 10)
      }

      const norm = dataRows.map(r => ({
        pedido_ref:    String(r[2] ?? '').trim(),   // índice 2 = Pedido
        produto:       String(r[3] ?? '').trim(),   // índice 3 = Produto
        qtd:           String(r[4] ?? '').trim(),   // índice 4 = Quant.
        // índice 5 = Unid. → ignorado
        fornecedor:    String(r[6] ?? '').trim(),   // índice 6 = Fornecedor
        cliente:       String(r[7] ?? '').trim(),   // índice 7 = Cliente
        loja:          String(r[8] ?? '').trim(),   // índice 8 = Loja
        data_venda:    parseDate(r[9]),             // índice 9 = Data venda
        data_abertura: parseDate(r[10]),            // índice 10 = Data assist.
        categoria:     String(r[11] ?? '').trim(),  // índice 11 = Categoria
        descricao:     String(r[12] ?? '').trim(),  // índice 12 = Descrição
      })).filter(r => r.cliente !== '')

      setRows(norm); setPreview(true)
    }
    reader.readAsBinaryString(file)
  }

  const novas = rows.filter(r => !existentes.find(e => e.pedido_ref === r.pedido_ref && e.cliente === r.cliente))
  const atualizadas = rows.filter(r => existentes.find(e => e.pedido_ref === r.pedido_ref && e.cliente === r.cliente))

  return (
    <Modal
      title="Importar Excel — Assistências"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          {preview && rows.length > 0 && <Btn loading={saving} onClick={async () => { setSaving(true); setProgress({ done: 0, total: rows.length }); try { await onImport(rows, (done, total) => setProgress({ done, total })) } catch (e) { console.error('[Import] Erro geral:', e); alert('Erro na importação. Abra F12 → Console para detalhes.') } setSaving(false) }}>{saving && progress.total > 0 ? `Salvando ${progress.done}/${progress.total}...` : `Importar ${rows.length} registros`}</Btn>}
        </>
      }
    >
      {!preview ? (
        <div>
          <Alert type="warning" style={{ marginBottom: 16 }}>Cabeçalho na <b>linha 5</b>, dados a partir da <b>linha 6</b>. Colunas: C2=Pedido · C3=Produto · C4=Qtd · C6=Fornecedor · C7=Cliente · C8=Loja · C9=Data venda · C10=Data assist. · C11=Categoria · C12=Descrição</Alert>
          <div className="upload-zone" style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
            <div style={{ marginBottom: 12 }}>Selecione o arquivo .xlsx ou .xls</div>
            <input type="file" accept=".xlsx,.xls" onChange={handleFile} />
          </div>
        </div>
      ) : (
        <div>
          {/* ── Diagnóstico de mapeamento ── */}
          {rawDebug && (
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 11, overflowX: 'auto' }}>
              <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--accent)' }}>Diagnóstico — valores brutos do Excel (confirme se o mapeamento está correto)</div>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 10 }}>
                <thead>
                  <tr>
                    <th style={{ padding: '2px 6px', color: 'var(--t3)', textAlign: 'left', minWidth: 28 }}>Col</th>
                    <th style={{ padding: '2px 6px', color: 'var(--amber)', textAlign: 'left' }}>Cabeçalho (L5)</th>
                    <th style={{ padding: '2px 6px', color: 'var(--green)', textAlign: 'left' }}>Linha 6</th>
                    <th style={{ padding: '2px 6px', color: 'var(--t2)', textAlign: 'left' }}>Linha 7</th>
                    <th style={{ padding: '2px 6px', color: 'var(--t3)', textAlign: 'left', fontStyle: 'italic' }}>Campo salvo como</th>
                  </tr>
                </thead>
                <tbody>
                  {rawDebug.cabecalho.slice(0, 14).map((cab, idx) => {
                    const MAPA = { 1: 'pedido_ref', 2: 'produto', 3: 'qtd', 5: 'fornecedor', 6: 'cliente ⭐', 7: 'loja', 8: 'data_venda', 9: 'data_abertura', 10: 'categoria', 11: 'descricao' }
                    const campo = MAPA[idx] || '—'
                    const destaque = campo.includes('cliente') || campo.includes('pedido')
                    return (
                      <tr key={idx} style={{ background: destaque ? 'rgba(99,102,241,0.08)' : 'transparent' }}>
                        <td style={{ padding: '2px 6px', color: 'var(--t3)', fontWeight: 600 }}>{String.fromCharCode(65 + idx)}</td>
                        <td style={{ padding: '2px 6px', color: 'var(--amber)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(cab || '').slice(0, 30)}</td>
                        <td style={{ padding: '2px 6px', color: 'var(--green)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(rawDebug.linha1[idx] ?? '').slice(0, 30)}</td>
                        <td style={{ padding: '2px 6px', color: 'var(--t2)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(rawDebug.linha2[idx] ?? '').slice(0, 30)}</td>
                        <td style={{ padding: '2px 6px', color: destaque ? 'var(--accent)' : 'var(--t3)', fontStyle: 'italic' }}>{campo}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div style={{ marginTop: 6, color: 'var(--t3)' }}>Total de linhas no arquivo: {rawDebug.totalLinhas} · Dados a partir da linha 6 (índice 5)</div>
            </div>
          )}
          <div className="stats" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16 }}>
            {[{ label: 'Total', val: rows.length, color: 'var(--accent)' }, { label: 'Novas', val: novas.length, color: 'var(--green)' }, { label: 'Atualizar', val: atualizadas.length, color: 'var(--amber)' }].map(s => (
              <div className="stat" key={s.label}><div className="stat-val" style={{ color: s.color }}>{s.val}</div><div className="stat-lbl">{s.label}</div></div>
            ))}
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {rows.slice(0, 30).map((r, i) => {
              const exist = existentes.find(e => e.pedido_ref === r.pedido_ref && e.cliente === r.cliente)
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                  <div>
                    <span style={{ fontWeight: 500 }}>{r.cliente}</span>
                    {r.pedido_ref && <span style={{ color: 'var(--t3)', marginLeft: 6 }}>#{r.pedido_ref}</span>}
                    {r.loja && <span style={{ color: 'var(--t3)', marginLeft: 6 }}>{r.loja}</span>}
                    {r.produto && <div style={{ color: 'var(--t3)', fontSize: 11 }}>{r.produto}{r.qtd ? ` · qtd: ${r.qtd}` : ''}{r.categoria ? ` · ${r.categoria}` : ''}</div>}
                    {r.data_abertura && <div style={{ color: 'var(--t3)', fontSize: 11 }}>Assist: {r.data_abertura}</div>}
                  </div>
                  <span style={{ color: exist ? 'var(--amber)' : 'var(--green)', fontSize: 11, flexShrink: 0, marginLeft: 8 }}>{exist ? '↻ Atualizar' : '+ Nova'}</span>
                </div>
              )
            })}
            {rows.length > 30 && <div style={{ fontSize: 12, color: 'var(--t3)', paddingTop: 8 }}>...e mais {rows.length - 30} registros</div>}
          </div>
        </div>
      )}
    </Modal>
  )
}

function NovaAssistenciaModal({ onClose, onSave, prefill }) {
  const { perfil } = useAuth()
  const [step, setStep] = useState(0)
  const [dados, setDados] = useState({ solicitante: perfil?.full_name || '', telefone: prefill?.telefone || '', numero_pedido: prefill?.numero_pedido || '', cliente: prefill?.cliente || '', loja: prefill?.loja || '' })
  const [itens, setItens] = useState([{ id: 1, produto: '', fornecedor: '', motivo: '', descricao: '' }])
  const { run, loading } = useAction()

  const motivos = ['Avaria', 'Defeito de fabricação', 'Erro de acabamento', 'Item incorreto', 'Outros']
  const addItem = () => setItens(prev => [...prev, { id: Date.now(), produto: '', fornecedor: '', motivo: '', descricao: '' }])
  const remItem = (id) => setItens(prev => prev.filter(x => x.id !== id))
  const upItem = (id, k, v) => setItens(prev => prev.map(x => x.id === id ? { ...x, [k]: v } : x))
  const upDados = (k) => (e) => setDados(prev => ({ ...prev, [k]: e.target.value }))

  const canNext0 = dados.cliente.trim() && dados.solicitante.trim()
  const canNext1 = itens.every(i => i.produto.trim() && i.motivo && i.descricao.trim())

  const handleSave = () => {
    const prazo = new Date()
    prazo.setDate(prazo.getDate() + 30)
    run(() => onSave({
      cliente: dados.cliente,
      telefone: dados.telefone,
      pedido_ref: dados.numero_pedido,
      loja: dados.loja,
      data_abertura: new Date().toISOString().split('T')[0],
      prazo: prazo.toISOString().split('T')[0],
      status: 'Aberto',
      tipo_problema: itens[0]?.motivo || 'Outros',
      observacoes: itens[0]?.descricao || '',
      responsavel_nome: dados.solicitante,
      origem: 'app',
      itens: itens.map(({ id: _, ...rest }) => ({ ...rest, status: 'Aberto', prazo: prazo.toISOString().split('T')[0] })),
    }))
  }

  const steps = ['Dados gerais', 'Produtos', 'Confirmar']

  return (
    <Modal
      title="Nova Assistência Técnica"
      subtitle={`Etapa ${step + 1} de ${steps.length} — ${steps[step]}`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          {step > 0 && <Btn variant="secondary" onClick={() => setStep(s => s - 1)}>← Voltar</Btn>}
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          {step < 2 && <Btn disabled={step === 0 ? !canNext0 : !canNext1} onClick={() => setStep(s => s + 1)}>Continuar →</Btn>}
          {step === 2 && <Btn style={{ background: 'var(--green)' }} loading={loading} onClick={handleSave}>✓ Confirmar</Btn>}
        </>
      }
    >
      <div className="steps">{steps.map((_, i) => <div key={i} className={`dot${i === step ? ' on' : i < step ? ' done' : ''}`} />)}</div>

      {step === 0 && (
        <>
          {prefill && <Alert type="success">✓ Dados preenchidos do pedido #{prefill.numero_pedido}</Alert>}
          <div className="grid2">
            <div className="fg"><label className="fl">Solicitante *</label><input className="fi" value={dados.solicitante} onChange={upDados('solicitante')} /></div>
            <div className="fg"><label className="fl">Telefone</label><input className="fi" value={dados.telefone} onChange={upDados('telefone')} /></div>
          </div>
          <div className="grid2">
            <div className="fg"><label className="fl">Cliente *</label><input className="fi" value={dados.cliente} onChange={upDados('cliente')} /></div>
            <div className="fg"><label className="fl">Loja</label><input className="fi" value={dados.loja} onChange={upDados('loja')} placeholder="Ex: Loja Centro" /></div>
          </div>
          <div className="grid2">
            <div className="fg"><label className="fl">Nº Pedido</label><input className="fi" value={dados.numero_pedido} onChange={upDados('numero_pedido')} /></div>
            <div className="fg"><label className="fl">Prazo padrão</label><input className="fi" value="30 dias" disabled /></div>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--t2)' }}>{itens.length} produto(s)</div>
            <Btn variant="secondary" size="sm" onClick={addItem}><Ic n="plus" s={12} /> Produto</Btn>
          </div>
          {itens.map((item, idx) => (
            <div key={item.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>Produto {idx + 1}</div>
                {itens.length > 1 && <button className="btn btn-g btn-ico btn-sm" style={{ color: 'var(--red)' }} onClick={() => remItem(item.id)}><Ic n="trash" s={12} /></button>}
              </div>
              <div className="grid2">
                <div className="fg"><label className="fl">Nome *</label><input className="fi" value={item.produto} onChange={e => upItem(item.id, 'produto', e.target.value)} placeholder="Ex: Sofá Bless" /></div>
                <div className="fg"><label className="fl">Fornecedor</label><input className="fi" value={item.fornecedor} onChange={e => upItem(item.id, 'fornecedor', e.target.value)} /></div>
              </div>
              <div className="fg">
                <label className="fl">Motivo *</label>
                <select className="fi" value={item.motivo} onChange={e => upItem(item.id, 'motivo', e.target.value)}>
                  <option value="">Selecione...</option>
                  {motivos.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="fg" style={{ marginBottom: 0 }}>
                <label className="fl">Descrição *</label>
                <textarea className="fi" rows={2} value={item.descricao} onChange={e => upItem(item.id, 'descricao', e.target.value)} placeholder="Descreva o problema..." />
              </div>
            </div>
          ))}
        </>
      )}

      {step === 2 && (
        <>
          <div className="card-sm" style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8, textTransform: 'uppercase' }}>Dados gerais</div>
            <div className="grid2" style={{ fontSize: 13, gap: 6 }}>
              <div><span style={{ color: 'var(--t2)' }}>Solicitante: </span>{dados.solicitante}</div>
              <div><span style={{ color: 'var(--t2)' }}>Cliente: </span>{dados.cliente}</div>
              <div><span style={{ color: 'var(--t2)' }}>Pedido: </span>#{dados.numero_pedido || '—'}</div>
              <div><span style={{ color: 'var(--t2)' }}>Prazo: </span>30 dias</div>
            </div>
          </div>
          {itens.map((item, idx) => (
            <div className="card-sm" key={item.id} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 5 }}>Produto {idx + 1}</div>
              <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 3 }}>{item.produto}</div>
              <div style={{ fontSize: 12, color: 'var(--t2)' }}>{item.motivo} · {item.fornecedor || '—'}</div>
              <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 3 }}>{item.descricao}</div>
            </div>
          ))}
        </>
      )}
    </Modal>
  )
}

// ============================================================
// RELATÓRIO DE ASSISTÊNCIAS
// ============================================================
const CHART_PAL = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#a78bfa','#06b6d4','#84cc16']

function GraficoBarras({ dados }) {
  if (!dados?.length) return <div style={{ color: 'var(--t3)', fontSize: 12, padding: 8 }}>Sem dados para o período</div>
  const max = Math.max(...dados.map(d => d.qtd), 1)
  return (
    <div style={{ width: '100%' }}>
      {dados.map((d, i) => (
        <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
          <div style={{ width: 140, fontSize: 11, color: 'var(--t2)', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.name}>{d.name}</div>
          <div style={{ flex: 1, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', height: 22 }}>
            <div style={{ width: `${(d.qtd / max) * 100}%`, minWidth: d.qtd > 0 ? 28 : 0, background: CHART_PAL[i % CHART_PAL.length], height: '100%', borderRadius: 4, display: 'flex', alignItems: 'center', paddingLeft: 6, fontSize: 11, color: '#fff', fontWeight: 600 }}>
              {d.qtd > 0 ? d.qtd : ''}
            </div>
          </div>
          <div style={{ width: 36, fontSize: 11, color: 'var(--t3)', textAlign: 'right', flexShrink: 0 }}>{d.pct}%</div>
        </div>
      ))}
    </div>
  )
}

function TabelaRelatorio({ dados, colunas = ['Descrição', 'Qtd', '%'] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr>{colunas.map(c => <th key={c} style={{ textAlign: c === 'Qtd' || c === '%' ? 'right' : 'left', padding: '4px 8px', color: 'var(--t3)', fontWeight: 500, borderBottom: '1px solid var(--border)' }}>{c}</th>)}</tr>
      </thead>
      <tbody>
        {dados.map((d, i) => (
          <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
            <td style={{ padding: '5px 8px', color: 'var(--t1)' }}>{d.name}</td>
            <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600, color: 'var(--accent)' }}>{d.qtd}</td>
            <td style={{ padding: '5px 8px', textAlign: 'right', color: 'var(--t3)' }}>{d.pct}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function RelatorioAssistencias({ onBack }) {
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [lojaFil, setLojaFil] = useState('')

  const { data: assistencias, loading } = useData(() => assistenciasService.list(), [])
  const { data: todosItens } = useData(async () => {
    const { data, error } = await supabase.from('assistencia_itens').select('assistencia_id, fornecedor')
    if (error) throw error
    return data || []
  }, [])

  const hoje = new Date()
  const diasAberto = (d) => !d ? 0 : Math.floor((hoje - new Date(d)) / 86400000)

  const LOJAS = ['Templum Comércio', 'Movelaria Olga', 'Santa Comércio', 'Alpendre Mobiliário', 'Arca Garden', 'Templum Minas', 'Ferião']
  const CATEGORIAS = ['Defeito de Fábrica', 'Danificado na Entrega', 'Medida Errada', 'Danificado pela Vipex', 'Acabamento Divergente', 'Retoques e Instalações', 'Mau Uso', 'Danificado no Depósito', 'Tecido Divergente', 'Danificado na Loja']
  const FABRICAS = ['Dettagli', 'Clarisa Estofados', 'Onna', 'Alum', 'Mar. Artesanato', 'Linea Top', 'Navarro', 'Corbelli', 'San German', 'Demais Fornecedores']

  const lista = (assistencias || []).filter(a => {
    const okInicio = !dataInicio || (a.data_abertura >= dataInicio)
    const okFim = !dataFim || (a.data_abertura <= dataFim)
    const okLoja = !lojaFil || a.loja === lojaFil
    return okInicio && okFim && okLoja
  })

  const ativas = lista.filter(a => !['Concluído', 'Cancelado'].includes(a.status))
  const criticas = ativas.filter(a => diasAberto(a.data_abertura) >= 30)
  const urgentes = ativas.filter(a => { const d = diasAberto(a.data_abertura); return d >= 20 && d < 30 })

  const buildData = (items, keys, getKey, outros = false) => {
    const counts = Object.fromEntries(keys.map(k => [k, 0]))
    for (const item of items) {
      const k = getKey(item)
      if (counts[k] !== undefined) counts[k]++
      else if (outros) counts['Demais Fornecedores'] = (counts['Demais Fornecedores'] || 0) + 1
    }
    const total = Object.values(counts).reduce((s, v) => s + v, 0)
    return keys
      .map(k => ({ name: k, qtd: counts[k] || 0, pct: total ? Math.round((counts[k] || 0) / total * 100) : 0 }))
      .filter(d => d.qtd > 0)
      .sort((a, b) => b.qtd - a.qtd)
  }

  const dataCategorias = buildData(lista, CATEGORIAS, a => a.categoria || '')
  const dataLojas = buildData(lista, LOJAS, a => a.loja || '')

  const listaIds = new Set(lista.map(a => a.id))
  const itensFiltrados = (todosItens || []).filter(it => listaIds.has(it.assistencia_id))
  const dataFabricas = buildData(itensFiltrados, FABRICAS, it => FABRICAS.includes(it.fornecedor) ? it.fornecedor : 'Demais Fornecedores', true)

  const gerarPDF = () => {
    const w = window.open('', '_blank')
    if (!w) { alert('Permita popups para gerar o PDF.'); return }
    const secao = (titulo, dados) => `
      <h3 style="margin:24px 0 8px;font-size:14px;color:#334155;border-bottom:2px solid #6366f1;padding-bottom:4px">${titulo}</h3>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:#f1f5f9"><th style="text-align:left;padding:6px 8px">Descrição</th><th style="text-align:right;padding:6px 8px">Qtd</th><th style="text-align:right;padding:6px 8px">%</th></tr></thead>
        <tbody>${dados.map(d => `<tr style="border-bottom:1px solid #e2e8f0"><td style="padding:5px 8px">${d.name}</td><td style="padding:5px 8px;text-align:right;font-weight:600">${d.qtd}</td><td style="padding:5px 8px;text-align:right;color:#64748b">${d.pct}%</td></tr>`).join('')}</tbody>
      </table>`
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório de Assistências</title>
      <style>body{font-family:sans-serif;padding:32px;color:#1e293b;max-width:800px;margin:0 auto}h1{font-size:20px;margin:0 0 4px}h2{font-size:18px;color:#6366f1;margin:0 0 16px}</style></head><body>
      <h1>Versa Log — Relatório de Assistências</h1>
      <h2>Período: ${dataInicio || 'Início'} até ${dataFim || 'Hoje'}${lojaFil ? ` · Loja: ${lojaFil}` : ''}</h2>
      <div style="display:flex;gap:24px;margin-bottom:24px">
        <div style="background:#fef2f2;padding:12px 20px;border-radius:8px;text-align:center"><div style="font-size:28px;font-weight:700;color:#ef4444">${criticas.length}</div><div style="font-size:11px;color:#64748b">Críticas +30d</div></div>
        <div style="background:#fffbeb;padding:12px 20px;border-radius:8px;text-align:center"><div style="font-size:28px;font-weight:700;color:#f59e0b">${urgentes.length}</div><div style="font-size:11px;color:#64748b">Urgentes +20d</div></div>
        <div style="background:#eff6ff;padding:12px 20px;border-radius:8px;text-align:center"><div style="font-size:28px;font-weight:700;color:#6366f1">${ativas.length}</div><div style="font-size:11px;color:#64748b">Abertas</div></div>
        <div style="background:#f0fdf4;padding:12px 20px;border-radius:8px;text-align:center"><div style="font-size:28px;font-weight:700;color:#10b981">${lista.length}</div><div style="font-size:11px;color:#64748b">Total filtrado</div></div>
      </div>
      ${secao('Por Categoria', dataCategorias)}
      ${secao('Por Loja', dataLojas)}
      ${secao('Por Fabricante', dataFabricas)}
      <p style="margin-top:32px;font-size:10px;color:#94a3b8">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
      <script>window.print()</script></body></html>`)
    w.document.close()
  }

  if (loading) return <div className="page"><Spinner /></div>

  const SecaoRelatorio = ({ titulo, dados }) => (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>{titulo}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <TabelaRelatorio dados={dados} />
        <GraficoBarras dados={dados} />
      </div>
    </div>
  )

  return (
    <div className="page">
      <div className="ph">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-g btn-ico btn-sm" onClick={onBack}><Ic n="back" /></button>
          <div>
            <h1>Relatório de Assistências</h1>
            <div className="ph-sub">{lista.length} assistências no período</div>
          </div>
        </div>
        <Btn size="sm" onClick={gerarPDF}><Ic n="pdf" s={13} /> Exportar PDF</Btn>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>Filtros</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div className="fg"><label className="fl">Data início</label><input className="fi" type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} /></div>
          <div className="fg"><label className="fl">Data fim</label><input className="fi" type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} /></div>
          <div className="fg"><label className="fl">Loja</label>
            <select className="fi" value={lojaFil} onChange={e => setLojaFil(e.target.value)}>
              <option value="">Todas as lojas</option>
              {LOJAS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="stats" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
        {[
          { label: 'Críticas +30d', val: criticas.length, color: 'var(--red)', bg: 'var(--rdim)' },
          { label: 'Urgentes +20d', val: urgentes.length, color: 'var(--amber)', bg: 'var(--adim2)' },
          { label: 'Abertas', val: ativas.length, color: 'var(--accent)', bg: 'var(--adim)' },
          { label: 'Total', val: lista.length, color: 'var(--green)', bg: 'var(--gdim)' },
        ].map(s => (
          <div className="stat" key={s.label}>
            <div className="stat-val" style={{ color: s.color }}>{s.val}</div>
            <div className="stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      <SecaoRelatorio titulo="Por Categoria" dados={dataCategorias} />
      <SecaoRelatorio titulo="Por Loja" dados={dataLojas} />
      <SecaoRelatorio titulo="Por Fabricante / Fornecedor" dados={dataFabricas} />
    </div>
  )
}

// ============================================================
// CONFERENCIA
// ============================================================
function Conferencia() {
  const { perfil } = useAuth()
  const [showNew, setShowNew] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const { data: items, loading, reload } = useData(() => conferenciasService.list(), [])

  const handleCreate = async (dados) => {
    await conferenciasService.create({ ...dados, conferente_nome: perfil?.full_name, data_hora: new Date().toISOString() })
    await reload()
    setShowNew(false)
  }

  if (selectedId) return <ConferenciaDetalhe id={selectedId} onBack={() => { setSelectedId(null); reload() }} />

  return (
    <div className="page">
      <div className="ph">
        <h1>Conferência</h1>
        <Btn size="sm" onClick={() => setShowNew(true)}><Ic n="plus" s={13} /> Nova Conferência</Btn>
      </div>
      {loading ? <Spinner /> : (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Pedido</th><th>NF</th><th>Produto</th><th>Fornecedor</th><th>Conferente</th><th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {(items || []).length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--t3)', padding: 32 }}>Nenhuma conferência</td></tr>
                ) : (items || []).map(c => (
                  <tr key={c.id} onClick={() => setSelectedId(c.id)}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>#{c.numero_pedido}</td>
                    <td style={{ fontSize: 12, color: 'var(--t2)' }}>{c.numero_nf}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.produto}</td>
                    <td style={{ fontSize: 12, color: 'var(--t2)' }}>{c.fornecedor}</td>
                    <td style={{ fontSize: 12 }}>{c.conferente_nome}</td>
                    <td><Badge status={c.resultado || 'Pendente'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {showNew && <NovaConferenciaModal onClose={() => setShowNew(false)} onSave={handleCreate} />}
    </div>
  )
}

function gerarPDFConferencia(c) {
  const w = window.open('', '_blank')
  w.document.write(`
    <html><head><title>Conferência #${c.numero_pedido}</title>
    <style>body{font-family:sans-serif;padding:24px}h1{font-size:18px}p{font-size:13px;margin:4px 0}.badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;background:${c.resultado==='Aprovado'?'#dcfce7;color:#16a34a':'#fee2e2;color:#dc2626'}}</style>
    </head><body>
    <h1>Conferência — Pedido #${c.numero_pedido}</h1>
    <p><span class="badge">${c.resultado || 'Pendente'}</span></p>
    <p><b>Produto:</b> ${c.produto}</p>
    <p><b>NF:</b> ${c.numero_nf}</p>
    <p><b>Fornecedor:</b> ${c.fornecedor}</p>
    <p><b>Conferente:</b> ${c.conferente_nome}</p>
    <p><b>Data:</b> ${new Date(c.data_hora).toLocaleString('pt-BR')}</p>
    ${c.motivo_reprovacao ? `<p><b>Motivo:</b> ${c.motivo_reprovacao}</p>` : ''}
    ${c.descricao_reprovacao ? `<p><b>Descrição:</b> ${c.descricao_reprovacao}</p>` : ''}
    <script>window.onload=()=>{window.print()}</script>
    </body></html>
  `)
  w.document.close()
}

function ConferenciaDetalhe({ id, onBack }) {
  const { data: c, loading } = useData(() => conferenciasService.getById(id), [id])
  if (loading) return <div className="page"><Spinner /></div>
  if (!c) return <div className="page"><Empty text="Não encontrado" /></div>
  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
        <Btn variant="ghost" size="sm" onClick={onBack}><Ic n="back" s={13} /> Voltar</Btn>
        <Btn variant="secondary" size="sm" onClick={() => gerarPDFConferencia(c)}><Ic n="pdf" s={13} /> Gerar PDF</Btn>
      </div>
      <Badge status={c.resultado || 'Pendente'} style={{ marginBottom: 8 }} />
      <h1 style={{ fontSize: 18, marginBottom: 4 }}>{c.produto}</h1>
      <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16 }}>Pedido #{c.numero_pedido} · NF: {c.numero_nf}</div>
      <div className="card">
        <div className="grid2" style={{ fontSize: 13, gap: 10 }}>
          <div><span style={{ color: 'var(--t2)' }}>Fornecedor: </span>{c.fornecedor}</div>
          <div><span style={{ color: 'var(--t2)' }}>Conferente: </span>{c.conferente_nome}</div>
          <div><span style={{ color: 'var(--t2)' }}>Data: </span>{new Date(c.data_hora).toLocaleString('pt-BR')}</div>
          {c.motivo_reprovacao && <div><span style={{ color: 'var(--t2)' }}>Motivo: </span>{c.motivo_reprovacao}</div>}
        </div>
        {c.descricao_reprovacao && <div style={{ marginTop: 12, fontSize: 13, color: 'var(--t2)' }}>{c.descricao_reprovacao}</div>}
      </div>
    </div>
  )
}

function NovaConferenciaModal({ onClose, onSave }) {
  const [form, setForm] = useState({ numero_pedido: '', numero_nf: '', produto: '', fornecedor: '', resultado: '', motivo_reprovacao: '', descricao_reprovacao: '' })
  const { run, loading } = useAction()
  const up = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))
  const canSave = form.numero_pedido && form.produto && form.fornecedor && form.numero_nf && form.resultado

  return (
    <Modal
      title="Nova Conferência"
      onClose={onClose}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn disabled={!canSave} loading={loading} onClick={() => run(() => onSave(form))}>Salvar</Btn>
        </>
      }
    >
      <div className="grid2">
        <div className="fg"><label className="fl">Nº Pedido *</label><input className="fi" value={form.numero_pedido} onChange={up('numero_pedido')} /></div>
        <div className="fg"><label className="fl">Nota Fiscal *</label><input className="fi" value={form.numero_nf} onChange={up('numero_nf')} /></div>
      </div>
      <div className="fg"><label className="fl">Produto *</label><input className="fi" value={form.produto} onChange={up('produto')} /></div>
      <div className="fg"><label className="fl">Fornecedor *</label><input className="fi" value={form.fornecedor} onChange={up('fornecedor')} /></div>
      <div className="fg">
        <label className="fl">Resultado *</label>
        <select className="fi" value={form.resultado} onChange={up('resultado')}>
          <option value="">Selecione...</option><option>Aprovado</option><option>Reprovado</option>
        </select>
      </div>
      {form.resultado === 'Reprovado' && (
        <>
          <div className="fg">
            <label className="fl">Motivo</label>
            <select className="fi" value={form.motivo_reprovacao} onChange={up('motivo_reprovacao')}>
              <option value="">Selecione...</option>
              {['Avaria', 'Defeito de fabricação', 'Erro de acabamento', 'Item incorreto', 'Outros'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="fg"><label className="fl">Descrição</label><textarea className="fi" rows={2} value={form.descricao_reprovacao} onChange={up('descricao_reprovacao')} /></div>
        </>
      )}
    </Modal>
  )
}

// ============================================================
// ROTEIRO DIGITAL
// ============================================================
function Roteiro() {
  const { isGestor } = useAuth()
  const [roteiros, setRoteiros] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNovo, setShowNovo] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  const carregar = () => {
    setLoading(true)
    supabase.from('roteiros').select('*, roteiro_itens(*)').order('data', { ascending: false })
      .then(({ data }) => { setRoteiros(data || []); setLoading(false) })
  }

  useEffect(() => { carregar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const criar = async (dados) => {
    const { itens, ...roteiro } = dados
    const { data: novo } = await supabase.from('roteiros').insert({ ...roteiro, status: 'planejado', created_at: new Date().toISOString() }).select().single()
    if (novo && itens?.length) {
      await supabase.from('roteiro_itens').insert(itens.map((item, i) => ({ ...item, roteiro_id: novo.id, ordem: i + 1, concluido: false })))
    }
    carregar(); setShowNovo(false)
  }

  if (selectedId) return <RoteiroDetalhe id={selectedId} onBack={() => { setSelectedId(null); carregar() }} />

  return (
    <div className="page">
      <div className="ph">
        <div>
          <h1>Roteiro Diário</h1>
          <div className="ph-sub">{roteiros.length} roteiro(s)</div>
        </div>
        {isGestor && <Btn size="sm" onClick={() => setShowNovo(true)}><Ic n="plus" s={13} /> Novo Roteiro</Btn>}
      </div>

      {loading ? <Spinner /> : roteiros.length === 0 ? <Empty icon="🗺️" text="Nenhum roteiro cadastrado" /> :
        roteiros.map(r => (
          <div key={r.id} className="li" onClick={() => setSelectedId(r.id)}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>🗺️</div>
            <div className="li-main">
              <div className="li-title">Roteiro {r.data ? new Date(r.data + 'T12:00').toLocaleDateString('pt-BR') : '—'}</div>
              <div className="li-sub">{r.motorista_nome || '—'}{r.montador_nome ? ` · ${r.montador_nome}` : ''}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{(r.roteiro_itens || []).length} parada(s)</div>
            </div>
            <Badge status={r.status === 'planejado' ? 'Pendente' : r.status === 'em_andamento' ? 'Em Rota' : 'Entregue'} />
            <Ic n="chev" s={13} style={{ color: 'var(--t3)' }} />
          </div>
        ))
      }

      {showNovo && <NovoRoteiroModal onClose={() => setShowNovo(false)} onSave={criar} />}
    </div>
  )
}

function RoteiroDetalhe({ id, onBack }) {
  const { isGestor } = useAuth()
  const [roteiro, setRoteiro] = useState(null)
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const carregar = () => {
    supabase.from('roteiros').select('*').eq('id', id).single().then(({ data: r }) => {
      setRoteiro(r)
      supabase.from('roteiro_itens').select('*').eq('roteiro_id', id).order('ordem')
        .then(({ data: items }) => { setItens(items || []); setLoading(false) })
    })
  }

  useEffect(() => { carregar() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const registrarHora = async (campo) => {
    const hora = new Date().toTimeString().slice(0, 5)
    setSaving(true)
    const novoStatus = campo === 'hora_saida' ? 'em_andamento' : 'concluído'
    await supabase.from('roteiros').update({ [campo]: hora, status: novoStatus }).eq('id', id)
    setRoteiro(prev => ({ ...prev, [campo]: hora, status: novoStatus }))
    setSaving(false)
  }

  const baixarParada = async (itemId) => {
    const hora = new Date().toTimeString().slice(0, 5)
    setSaving(true)
    await supabase.from('roteiro_itens').update({ concluido: true, hora_conclusao: hora }).eq('id', itemId)
    setItens(prev => prev.map(it => it.id === itemId ? { ...it, concluido: true, hora_conclusao: hora } : it))
    setSaving(false)
  }

  const moverItem = async (idx, dir) => {
    const arr = [...itens]; const swap = idx + dir
    if (swap < 0 || swap >= arr.length) return
    ;[arr[idx], arr[swap]] = [arr[swap], arr[idx]]
    setItens(arr)
    await supabase.from('roteiro_itens').update({ ordem: swap + 1 }).eq('id', arr[swap].id)
    await supabase.from('roteiro_itens').update({ ordem: idx + 1 }).eq('id', arr[idx].id)
  }

  if (loading) return <div className="page"><Spinner /></div>
  if (!roteiro) return <div className="page"><Empty text="Roteiro não encontrado" /></div>

  const concluidos = itens.filter(it => it.concluido).length

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
        <Btn variant="ghost" size="sm" onClick={onBack}><Ic n="back" s={13} /> Voltar</Btn>
        <Btn variant="secondary" size="sm" onClick={() => gerarPDFRoteiro(roteiro, itens)}><Ic n="pdf" s={13} /> Imprimir</Btn>
      </div>

      <h1 style={{ fontSize: 18, marginBottom: 4 }}>
        Roteiro — {roteiro.data ? new Date(roteiro.data + 'T12:00').toLocaleDateString('pt-BR') : '—'}
      </h1>
      <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16 }}>
        🚗 {roteiro.motorista_nome || '—'}{roteiro.montador_nome ? ` · 🔧 ${roteiro.montador_nome}` : ''}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="grid2" style={{ gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>SAÍDA</div>
            {roteiro.hora_saida ? (
              <div style={{ fontWeight: 700, fontSize: 22, color: 'var(--green)' }}>{roteiro.hora_saida}</div>
            ) : (
              <Btn size="sm" style={{ background: 'var(--green)', color: '#fff' }} loading={saving} onClick={() => registrarHora('hora_saida')}>Registrar Saída</Btn>
            )}
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>TÉRMINO</div>
            {roteiro.hora_termino ? (
              <div style={{ fontWeight: 700, fontSize: 22, color: 'var(--accent)' }}>{roteiro.hora_termino}</div>
            ) : (
              <Btn size="sm" variant="secondary" disabled={!roteiro.hora_saida} loading={saving} onClick={() => registrarHora('hora_termino')}>Registrar Término</Btn>
            )}
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--t3)' }}>{concluidos}/{itens.length} paradas concluídas</div>
      </div>

      <div style={{ fontWeight: 600, marginBottom: 12 }}>Paradas ({itens.length})</div>
      {itens.map((item, idx) => (
        <div key={item.id} style={{ background: item.concluido ? 'rgba(34,197,94,0.05)' : 'var(--bg1)', border: `1px solid ${item.concluido ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`, borderRadius: 12, padding: 14, marginBottom: 10, opacity: item.concluido ? 0.75 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: item.concluido ? 'var(--green)' : 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, color: item.concluido ? '#fff' : 'var(--t2)', marginTop: 2 }}>
                {item.concluido ? '✓' : idx + 1}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{item.cliente}</div>
                <div style={{ fontSize: 12, color: 'var(--t2)' }}>{item.loja ? `${item.loja} · ` : ''}{item.pedido_ref ? `#${item.pedido_ref} · ` : ''}{item.bairro}</div>
                <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>{item.status_servico}</div>
                {item.concluido && item.hora_conclusao && <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2 }}>✓ Concluído às {item.hora_conclusao}</div>}
              </div>
            </div>
            {!item.concluido && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
                {isGestor && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-g btn-ico btn-sm" onClick={() => moverItem(idx, -1)} disabled={idx === 0}>↑</button>
                    <button className="btn btn-g btn-ico btn-sm" onClick={() => moverItem(idx, 1)} disabled={idx === itens.length - 1}>↓</button>
                  </div>
                )}
                <Btn size="sm" loading={saving} onClick={() => baixarParada(item.id)}>✓ Baixa</Btn>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function gerarPDFRoteiro(roteiro, itens) {
  const data = roteiro.data ? new Date(roteiro.data + 'T12:00').toLocaleDateString('pt-BR') : '—'
  const rows = itens.map((item, i) => `<tr><td style="text-align:center">${i + 1}</td><td>${item.loja || ''}</td><td>${item.pedido_ref || ''}</td><td>${item.cliente || ''}</td><td>${item.bairro || ''}</td><td>${item.status_servico || ''}</td><td style="text-align:center">${item.concluido ? '✓' : ''}</td></tr>`).join('')
  const w = window.open('', '_blank')
  w.document.write(`<html><head><title>Roteiro ${data}</title><style>body{font-family:Arial,sans-serif;padding:20px;font-size:12px}.header{background:#fbbf24;padding:10px 14px;font-weight:bold;font-size:15px;text-align:center;letter-spacing:.05em}.info{display:flex;gap:32px;padding:8px 14px;border:1px solid #ccc;border-top:none;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:6px}th{background:#fbbf24;padding:6px 8px;text-align:left;border:1px solid #ccc;font-size:11px;font-weight:bold}td{padding:5px 8px;border:1px solid #ccc}tr:nth-child(even){background:#f9f9f9}</style></head><body>
  <div class="header">ROTEIRO DIÁRIO</div>
  <div class="info"><span><b>DATA:</b> ${data}</span><span><b>SAÍDA:</b> ${roteiro.hora_saida || '__:__'}</span><span><b>TÉRMINO:</b> ${roteiro.hora_termino || '__:__'}</span></div>
  <div class="info"><span><b>MOTORISTA:</b> ${roteiro.motorista_nome || '—'}</span><span><b>MONTADOR:</b> ${roteiro.montador_nome || '—'}</span></div>
  <table><thead><tr><th>QTD</th><th>LOJA</th><th>PEDIDO</th><th>CLIENTE</th><th>BAIRRO</th><th>SERVIÇO</th><th>STATUS</th></tr></thead><tbody>${rows}</tbody></table>
  <script>window.onload=()=>{window.print()}</script></body></html>`)
  w.document.close()
}

function NovoRoteiroModal({ onClose, onSave }) {
  const { data: assistencias } = useData(() => assistenciasService.list(), [])
  const [form, setForm] = useState({ data: new Date().toISOString().split('T')[0], motorista_nome: '', montador_nome: '' })
  const [itens, setItens] = useState([])
  const [step, setStep] = useState(0)
  const { run, loading } = useAction()

  const up = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))
  const TIPOS = ['Coleta', 'Vistoria', 'Retoque', 'Visita Técnica', 'Entrega e Instalação']

  const addAssistencia = (a) => {
    if (itens.find(it => it.assistencia_id === a.id)) return
    setItens(prev => [...prev, { assistencia_id: a.id, cliente: a.cliente, pedido_ref: a.pedido_ref || '', loja: a.loja || '', bairro: '', status_servico: 'Visita Técnica' }])
  }

  const upItem = (idx, k, v) => setItens(prev => prev.map((it, i) => i === idx ? { ...it, [k]: v } : it))
  const remItem = (idx) => setItens(prev => prev.filter((_, i) => i !== idx))
  const mover = (idx, dir) => {
    const arr = [...itens]; const swap = idx + dir
    if (swap < 0 || swap >= arr.length) return
    ;[arr[idx], arr[swap]] = [arr[swap], arr[idx]]; setItens(arr)
  }

  const abertas = (assistencias || []).filter(a => !['Concluído', 'Cancelado'].includes(a.status))

  return (
    <Modal
      title="Novo Roteiro"
      subtitle={`Etapa ${step + 1} de 2 — ${['Dados gerais', 'Paradas'][step]}`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          {step > 0 && <Btn variant="secondary" onClick={() => setStep(0)}>← Voltar</Btn>}
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          {step === 0 && <Btn disabled={!form.data || !form.motorista_nome} onClick={() => setStep(1)}>Continuar →</Btn>}
          {step === 1 && <Btn disabled={itens.length === 0} loading={loading} onClick={() => run(() => onSave({ ...form, itens }))}>✓ Criar Roteiro</Btn>}
        </>
      }
    >
      {step === 0 && (
        <>
          <div className="fg"><label className="fl">Data *</label><input className="fi" type="date" value={form.data} onChange={up('data')} /></div>
          <div className="grid2">
            <div className="fg"><label className="fl">Motorista *</label><input className="fi" value={form.motorista_nome} onChange={up('motorista_nome')} /></div>
            <div className="fg"><label className="fl">Montador</label><input className="fi" value={form.montador_nome} onChange={up('montador_nome')} /></div>
          </div>
        </>
      )}
      {step === 1 && (
        <>
          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>Selecionar assistências abertas:</div>
          <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 8, marginBottom: 16 }}>
            {abertas.length === 0 ? <div style={{ fontSize: 12, color: 'var(--t3)', padding: 8 }}>Nenhuma assistência aberta</div> :
              abertas.map(a => {
                const adicionada = !!itens.find(it => it.assistencia_id === a.id)
                return (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 4px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 12 }}>
                      <span style={{ fontWeight: 500 }}>{a.cliente}</span>
                      {a.pedido_ref && <span style={{ color: 'var(--t3)', marginLeft: 6 }}>#{a.pedido_ref}</span>}
                      {a.loja && <span style={{ color: 'var(--t3)', marginLeft: 6 }}>{a.loja}</span>}
                    </div>
                    <Btn size="sm" variant={adicionada ? 'secondary' : 'primary'} onClick={() => addAssistencia(a)} disabled={adicionada}>{adicionada ? '✓' : '+'}</Btn>
                  </div>
                )
              })}
          </div>
          {itens.length > 0 && (
            <div>
              <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>Paradas selecionadas ({itens.length}):</div>
              {itens.map((item, idx) => (
                <div key={idx} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>#{idx + 1} {item.cliente}</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-g btn-ico btn-sm" onClick={() => mover(idx, -1)} disabled={idx === 0}>↑</button>
                      <button className="btn btn-g btn-ico btn-sm" onClick={() => mover(idx, 1)} disabled={idx === itens.length - 1}>↓</button>
                      <button className="btn btn-g btn-ico btn-sm" style={{ color: 'var(--red)' }} onClick={() => remItem(idx)}><Ic n="trash" s={11} /></button>
                    </div>
                  </div>
                  <div className="grid2" style={{ gap: 6 }}>
                    <div className="fg" style={{ marginBottom: 0 }}><label className="fl">Bairro</label><input className="fi" value={item.bairro} onChange={e => upItem(idx, 'bairro', e.target.value)} placeholder="Bairro" /></div>
                    <div className="fg" style={{ marginBottom: 0 }}>
                      <label className="fl">Tipo de Serviço</label>
                      <select className="fi" value={item.status_servico} onChange={e => upItem(idx, 'status_servico', e.target.value)}>
                        {TIPOS.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  )
}

// ============================================================
// EQUIPE
// ============================================================
function Equipe() {
  const { perfil } = useAuth()
  const [showNewEquipe, setShowNewEquipe] = useState(false)
  const [showNewUser, setShowNewUser] = useState(false)
  const { data: equipes, reload: reloadEq } = useData(() => equipesService.list(), [])
  const { data: usuarios, reload: reloadU } = useData(() => usuariosService.list(), [])

  const handleEquipe = async (dados) => {
    await equipesService.create(dados)
    await reloadEq()
    setShowNewEquipe(false)
  }

  const handleUser = async (dados) => {
    await usuariosService.create(dados)
    await reloadU()
    setShowNewUser(false)
  }

  return (
    <div className="page">
      <div className="ph">
        <h1>Equipe</h1>
        <div className="row">
          <Btn variant="secondary" size="sm" onClick={() => setShowNewUser(true)}><Ic n="plus" s={13} /> Usuário</Btn>
          <Btn size="sm" onClick={() => setShowNewEquipe(true)}><Ic n="plus" s={13} /> Equipe</Btn>
        </div>
      </div>

      {(equipes || []).length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12, marginBottom: 24 }}>
          {(equipes || []).map(e => (
            <div className="card" key={e.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontWeight: 600 }}>{e.nome}</div>
                <Badge status={e.status || 'Ativa'} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 4 }}>🚗 {e.motorista_nome || 'Sem motorista'}</div>
              <div style={{ fontSize: 12, color: 'var(--t2)' }}>👤 {(e.entregadores_nomes || []).join(', ') || 'Sem entregadores'}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 16 }}>Usuários</div>
      <div className="card">
        <table className="tbl">
          <thead><tr><th>Nome</th><th>Email</th><th>Cargo</th><th></th></tr></thead>
          <tbody>
            {(usuarios || []).length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--t3)', padding: 24 }}>Nenhum usuário</td></tr>
            ) : (usuarios || []).map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>
                      {u.full_name?.charAt(0)}
                    </div>
                    {u.full_name}
                  </div>
                </td>
                <td style={{ fontSize: 12, color: 'var(--t2)' }}>{u.email}</td>
                <td><span className="badge bg-accent" style={{ textTransform: 'capitalize' }}>{u.role}</span></td>
                <td><button className="btn btn-g btn-ico btn-sm"><Ic n="edit" s={13} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNewEquipe && (
        <Modal title="Nova Equipe" onClose={() => setShowNewEquipe(false)} footer={null}>
          <NovaEquipeForm usuarios={usuarios || []} onClose={() => setShowNewEquipe(false)} onSave={handleEquipe} />
        </Modal>
      )}
      {showNewUser && (
        <Modal title="Novo Usuário" onClose={() => setShowNewUser(false)} footer={null}>
          <NovoUsuarioForm onClose={() => setShowNewUser(false)} onSave={handleUser} />
        </Modal>
      )}
    </div>
  )
}

function NovaEquipeForm({ usuarios, onClose, onSave }) {
  const [form, setForm] = useState({ nome: '', motorista_id: '', motorista_nome: '', entregadores: [], entregadores_nomes: [], status: 'Ativa' })
  const { run, loading } = useAction()
  const motoristas = usuarios.filter(u => ['motorista', 'entregador'].includes(u.role))
  const entregadores = usuarios.filter(u => u.role === 'entregador')

  return (
    <>
      <div className="mb">
        <div className="fg"><label className="fl">Nome *</label><input className="fi" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Equipe Alpha" /></div>
        <div className="fg">
          <label className="fl">Motorista</label>
          <select className="fi" value={form.motorista_id} onChange={e => {
            const u = motoristas.find(x => x.id === e.target.value)
            setForm(p => ({ ...p, motorista_id: e.target.value, motorista_nome: u?.full_name || '' }))
          }}>
            <option value="">Selecione...</option>
            {motoristas.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
        </div>
        {entregadores.length > 0 && (
          <div className="fg">
            <label className="fl">Entregadores</label>
            {entregadores.map(u => (
              <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 13 }}>
                <input type="checkbox" checked={form.entregadores.includes(u.id)} onChange={e => setForm(p => ({
                  ...p,
                  entregadores: e.target.checked ? [...p.entregadores, u.id] : p.entregadores.filter(x => x !== u.id),
                  entregadores_nomes: e.target.checked ? [...p.entregadores_nomes, u.full_name] : p.entregadores_nomes.filter(x => x !== u.full_name),
                }))} />
                {u.full_name}
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="mf">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn disabled={!form.nome} loading={loading} onClick={() => run(() => onSave(form))}>Salvar</Btn>
      </div>
    </>
  )
}

function NovoUsuarioForm({ onClose, onSave }) {
  const [form, setForm] = useState({ full_name: '', email: '', role: 'entregador', telefone: '' })
  const { run, loading } = useAction()
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  return (
    <>
      <div className="mb">
        <div className="fg"><label className="fl">Nome Completo *</label><input className="fi" value={form.full_name} onChange={up('full_name')} /></div>
        <div className="fg"><label className="fl">Email *</label><input className="fi" type="email" value={form.email} onChange={up('email')} /></div>
        <div className="grid2">
          <div className="fg">
            <label className="fl">Cargo</label>
            <select className="fi" value={form.role} onChange={up('role')}>
              {['admin', 'gestor', 'motorista', 'entregador', 'estoque', 'conferente'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="fg"><label className="fl">Telefone</label><input className="fi" value={form.telefone} onChange={up('telefone')} /></div>
        </div>
        <Alert type="warning">Após criar, cadastre a senha em Supabase → Authentication → Users.</Alert>
      </div>
      <div className="mf">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn disabled={!form.full_name || !form.email} loading={loading} onClick={() => run(() => onSave(form))}>Criar</Btn>
      </div>
    </>
  )
}

// ============================================================
// RANKING
// ============================================================
function Ranking() {
  const { data: pedidos, loading } = useData(() => pedidosService.list(), [])
  const map = {}
  ;(pedidos || []).forEach(p => {
    if (!p.entregador_nome) return
    if (!map[p.entregador_nome]) map[p.entregador_nome] = { total: 0, entregues: 0, problemas: 0 }
    map[p.entregador_nome].total++
    if (p.status === 'Entregue') map[p.entregador_nome].entregues++
    if (p.status === 'Problema') map[p.entregador_nome].problemas++
  })
  const rank = Object.entries(map)
    .map(([nome, d]) => ({ nome, ...d, taxa: d.total ? Math.round((d.entregues / d.total) * 100) : 0 }))
    .sort((a, b) => b.taxa - a.taxa)
  const medals = ['gold', 'silver', 'bronze']

  return (
    <div className="page">
      <div className="ph"><div><h1>Ranking de Entregadores</h1><div className="ph-sub">Taxa de conclusão</div></div></div>
      {loading ? <Spinner /> : rank.length === 0 ? <Empty icon="🏆" text="Sem dados suficientes ainda" /> :
        rank.map((r, i) => (
          <div className="rank-item" key={r.nome}>
            <div className={`rank-num${medals[i] ? ` ${medals[i]}` : ''}`}>{i + 1}</div>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
              {r.nome.charAt(0)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{r.nome}</div>
              <div style={{ fontSize: 12, color: 'var(--t2)' }}>{r.entregues} entregues · {r.problemas} problemas</div>
              <div style={{ marginTop: 5, height: 3, background: 'var(--bg3)', borderRadius: 2 }}>
                <div style={{ width: `${r.taxa}%`, height: '100%', background: r.taxa >= 80 ? 'var(--green)' : r.taxa >= 50 ? 'var(--amber)' : 'var(--red)', borderRadius: 2 }} />
              </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--mono)', color: r.taxa >= 80 ? 'var(--green)' : r.taxa >= 50 ? 'var(--amber)' : 'var(--red)' }}>{r.taxa}%</div>
          </div>
        ))}
    </div>
  )
}

// ============================================================
// MAPA
// ============================================================
function Mapa() {
  const hoje = new Date().toISOString().split('T')[0]
  const { data: pedidos, loading, reload } = useData(() => pedidosService.list({ data_entrega: hoje }), [])
  const [sel, setSel] = useState(null)
  const [sf, setSf] = useState('Todos')

  const filtered = (pedidos || []).filter(p => sf === 'Todos' || p.status === sf)
  const mapUrl = sel
    ? `https://maps.google.com/maps?q=${encodeURIComponent((sel.endereco || '') + ', ' + (sel.cidade || 'Belo Horizonte') + ', MG, Brasil')}&output=embed`
    : 'https://maps.google.com/maps?q=Belo+Horizonte,MG,Brasil&output=embed'

  return (
    <div className="page">
      <div className="ph">
        <div><h1>Mapa do Dia</h1><div className="ph-sub">{(pedidos || []).length} entrega(s) hoje</div></div>
        <Btn variant="secondary" size="sm" onClick={reload}><Ic n="refresh" s={13} /> Atualizar</Btn>
      </div>
      <div className="map-layout">
        <div className="map-list">
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {['Todos', 'Pendente', 'Em Rota', 'Entregue', 'Problema'].map(s => (
                <button key={s} className={`fb${sf === s ? ' on' : ''}`} style={{ fontSize: 11, padding: '3px 7px' }} onClick={() => setSf(s)}>{s}</button>
              ))}
            </div>
          </div>
          {loading ? <div className="empty" style={{ padding: 24 }}>Carregando...</div> :
            filtered.length === 0 ? <div className="empty" style={{ padding: 24 }}>Nenhuma entrega</div> :
              filtered.map(p => (
                <div key={p.id} onClick={() => setSel(p)} style={{ padding: '11px 13px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: sel?.id === p.id ? 'var(--bg2)' : 'transparent', borderLeft: `3px solid ${sel?.id === p.id ? 'var(--accent)' : 'transparent'}`, transition: 'all .15s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{p.cliente?.split(' ').slice(0, 2).join(' ')}</div>
                    <Badge status={p.status} style={{ fontSize: 10 }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--t2)' }}>#{p.numero_pedido}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{p.endereco}</div>
                </div>
              ))}
        </div>
        <div style={{ background: 'var(--bg2)' }}>
          <iframe src={mapUrl} allowFullScreen loading="lazy" title="Mapa de entregas" style={{ width: '100%', height: '100%', border: 'none' }} />
        </div>
      </div>
    </div>
  )
}

// ── WhatsApp Templates Modal ──────────────────────────────
function WaTemplatesModal({ pedido, onClose, tipo = 'entregador' }) {
  const nome = pedido.cliente?.split(' ')[0] || pedido.cliente || ''
  const num = pedido.numero_pedido || ''
  const data = pedido.data_entrega ? new Date(pedido.data_entrega + 'T12:00').toLocaleDateString('pt-BR') : ''

  const templates = tipo === 'entregador' ? [
    {
      icon: '🚚', label: 'A caminho',
      msg: `Olá ${nome}! Sou da Versa Log e estou a caminho com seu pedido #${num}. Chego em breve! 🚚`,
    },
    {
      icon: '📦', label: 'Cheguei',
      msg: `Olá ${nome}! Estou na porta com seu pedido #${num}. Por favor me aguarde! 📦`,
    },
    {
      icon: '❌', label: 'Ausente',
      msg: `Olá ${nome}! Tentei entregar seu pedido #${num} mas não encontrei ninguém no endereço. Por favor entre em contato para reagendar. 📞`,
    },
  ] : [
    {
      icon: '✅', label: 'Confirmação',
      msg: `Olá ${nome}! Seu pedido #${num} está confirmado para entrega${data ? ` em ${data}` : ' em breve'}. Qualquer dúvida estamos à disposição! 🗓`,
    },
    {
      icon: '📅', label: 'Remarcação',
      msg: `Olá ${nome}! Informamos que a entrega do pedido #${num} precisou ser remarcada. Em breve entraremos em contato com a nova data. Pedimos desculpas pelo transtorno. 📅`,
    },
    {
      icon: '🚫', label: 'Cancelamento',
      msg: `Olá ${nome}! Infelizmente seu pedido #${num} foi cancelado. Entre em contato com nossa equipe para mais informações. 🚫`,
    },
  ]

  const enviar = (msg) => {
    const tel = pedido.telefone?.replace(/\D/g, '')
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank')
    onClose()
  }

  return (
    <Modal title="Enviar via WhatsApp" subtitle={pedido.telefone} onClose={onClose}>
      {templates.map(t => (
        <div
          key={t.label}
          onClick={() => enviar(t.msg)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8, cursor: 'pointer', gap: 12 }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{t.icon} {t.label}</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t.msg.substring(0, 72)}…
            </div>
          </div>
          <Ic n="wa" s={16} style={{ color: '#25D366', flexShrink: 0 }} />
        </div>
      ))}
    </Modal>
  )
}

// ============================================================
// MINHA ROTA
// ============================================================
function MinhaRota() {
  const { perfil } = useAuth()
  const hoje = new Date().toISOString().split('T')[0]
  const { data: pedidos, loading, reload } = useData(
    () => pedidosService.list({ entregador_id: perfil?.id, data_entrega: hoje }),
    [perfil?.id, hoje]
  )
  const [active, setActive] = useState(null)
  const [step, setStep] = useState(0)
  const [fotos, setFotos] = useState([])
  const [sigNome, setSigNome] = useState('')
  const [sigDoc, setSigDoc] = useState('')
  const [obs, setObs] = useState('')
  const [checklist, setChecklist] = useState({})
  const [sigDrawn, setSigDrawn] = useState(false)
  const [showWa, setShowWa] = useState(false)
  const { run, loading: actionLoading } = useAction()
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const lastPosRef = useRef(null)

  const { data: produtos } = useData(
    () => active ? produtosService.listByPedido(active.id) : Promise.resolve([]),
    [active?.id]
  )

  const initCanvas = useCallback(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, c.width, c.height)
  }, [])

  useEffect(() => {
    if (step === 2) setTimeout(initCanvas, 150)
  }, [step, initCanvas])

  const getPos = (e, c) => {
    const r = c.getBoundingClientRect()
    const sx = c.width / r.width
    const sy = c.height / r.height
    const cx = e.touches ? e.touches[0].clientX : e.clientX
    const cy = e.touches ? e.touches[0].clientY : e.clientY
    return { x: (cx - r.left) * sx, y: (cy - r.top) * sy }
  }

  const startDraw = (e) => {
    e.preventDefault()
    drawingRef.current = true
    lastPosRef.current = getPos(e, canvasRef.current)
    if (!sigDrawn) setSigDrawn(true)
  }

  const draw = (e) => {
    e.preventDefault()
    if (!drawingRef.current || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    const pos = getPos(e, canvasRef.current)
    ctx.beginPath()
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPosRef.current = pos
  }

  const endDraw = () => { drawingRef.current = false }

  const clearSig = () => { initCanvas(); setSigDrawn(false) }

  const iniciarEntrega = (p) => {
    setActive(p)
    setStep(0)
    setFotos([])
    setSigNome('')
    setSigDoc('')
    setObs('')
    setChecklist({})
    setSigDrawn(false)
  }

  const concluir = () => {
    run(async () => {
      const sigData = canvasRef.current?.toDataURL('image/png')
      await pedidosService.update(active.id, {
        status: 'Entregue',
        hora_fim: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      })
      await assinaturasService.create({
        pedido_id: active.id,
        nome_cliente: sigNome,
        documento_cliente: sigDoc,
        assinatura_url: sigData,
        data_hora: new Date().toISOString(),
      })
      await pedidosService.addHistorico(active.id, 'Entregue', `Concluído por ${perfil?.full_name}. Recebido por: ${sigNome}${obs ? `. Obs: ${obs}` : ''}`, perfil)
      reload()
      setActive(null)
    })
  }

  const steps = ['Iniciar', 'Fotos', 'Assinatura', 'Concluir']
  const pendentes = (pedidos || []).filter(p => p.status !== 'Entregue')
  const entregues = (pedidos || []).filter(p => p.status === 'Entregue')

  const checkItems = active ? [
    { id: 'produtos', label: 'Produto(s) conferidos no veículo' },
    { id: 'endereco', label: `Endereço verificado: ${active.endereco}` },
    { id: 'condicao', label: 'Produto em boas condições (sem avaria visível)' },
    ...(active.telefone ? [{ id: 'telefone', label: `Telefone do cliente anotado: ${active.telefone}` }] : []),
  ] : []
  const checklistDone = checkItems.every(i => checklist[i.id])

  if (active) {
    return (
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <Btn variant="ghost" size="sm" onClick={() => setActive(null)}>← Cancelar</Btn>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {active.telefone && (
              <button className="btn btn-s btn-sm" style={{ color: '#25D366', borderColor: '#25D36633' }} onClick={() => setShowWa(true)}>
                <Ic n="wa" s={13} /> WhatsApp
              </button>
            )}
            <div style={{ fontSize: 12, color: 'var(--t2)' }}>Etapa {step + 1}/{steps.length}</div>
          </div>
        </div>
        <div className="steps">{steps.map((_, i) => <div key={i} className={`dot${i === step ? ' on' : i < step ? ' done' : ''}`} />)}</div>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>{active.cliente}</div>
        <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 18 }}>#{active.numero_pedido} · {active.endereco}</div>

        {step === 0 && (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Conferência antes de sair</div>
            {checkItems.map(item => (
              <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: checklist[item.id] ? 'rgba(34,197,94,0.06)' : 'var(--bg1)', border: `1px solid ${checklist[item.id] ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`, borderRadius: 10, marginBottom: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!checklist[item.id]} onChange={e => setChecklist(prev => ({ ...prev, [item.id]: e.target.checked }))} style={{ width: 16, height: 16, accentColor: 'var(--green)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, flex: 1 }}>{item.label}</span>
                {checklist[item.id] && <Ic n="check" s={13} style={{ color: 'var(--green)', flexShrink: 0 }} />}
              </label>
            ))}
            {!checklistDone && (
              <div style={{ fontSize: 12, color: 'var(--t3)', textAlign: 'center', marginBottom: 8 }}>
                Confirme todos os itens acima para liberar o início
              </div>
            )}
            <Btn style={{ width: '100%', justifyContent: 'center', padding: 13, marginTop: 4 }} disabled={!checklistDone || actionLoading} loading={actionLoading}
              onClick={() => run(async () => {
                await pedidosService.update(active.id, { status: 'Em Rota', hora_inicio: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) })
                setStep(1)
              })}>
              ✓ Tudo conferido — Iniciar entrega
            </Btn>
          </div>
        )}

        {step === 1 && (
          <div>
            <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 12 }}>Fotografe cada produto separadamente.</div>
            <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 12 }}>📸 {fotos.length} foto(s) registrada(s)</div>
            {(produtos || []).length > 0 ? (produtos || []).map(pr => (
              <div key={pr.id} className="card-sm" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{pr.nome_produto}</div>
                  <div style={{ fontSize: 12, color: 'var(--t2)' }}>Qtd: {pr.quantidade}</div>
                </div>
                <Btn variant={fotos.some(f => f.startsWith(`foto_${pr.id}`)) ? 'success' : 'secondary'} size="sm"
                  onClick={() => setFotos(prev => [...prev, `foto_${pr.id}_${Date.now()}`])}>
                  <Ic n="cam" s={13} /> {fotos.some(f => f.startsWith(`foto_${pr.id}`)) ? '✓ OK' : 'Foto'}
                </Btn>
              </div>
            )) : (
              <div className="upload-zone" style={{ marginBottom: 12 }} onClick={() => setFotos(prev => [...prev, `foto_${Date.now()}`])}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
                <div>Toque para fotografar</div>
              </div>
            )}
            <Btn style={{ width: '100%', justifyContent: 'center', padding: 13, marginTop: 8 }} disabled={fotos.length === 0} onClick={() => setStep(2)}>
              Continuar ({fotos.length} foto{fotos.length !== 1 ? 's' : ''})
            </Btn>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="grid2" style={{ marginBottom: 12 }}>
              <div className="fg"><label className="fl">Nome do recebedor *</label><input className="fi" value={sigNome} onChange={e => setSigNome(e.target.value)} placeholder="Nome completo" /></div>
              <div className="fg"><label className="fl">CPF / RG</label><input className="fi" value={sigDoc} onChange={e => setSigDoc(e.target.value)} placeholder="000.000.000-00" /></div>
            </div>
            <div className="fg">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="fl" style={{ margin: 0 }}>Assinatura do cliente *</label>
                <button className="btn btn-g btn-sm" onClick={clearSig}>Limpar</button>
              </div>
              <canvas
                ref={canvasRef}
                width={600}
                height={140}
                className="sig-canvas"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
              <div style={{ fontSize: 11, marginTop: 4, color: sigDrawn ? 'var(--green)' : 'var(--t3)' }}>
                {sigDrawn ? '✓ Assinatura registrada' : 'Assine com o dedo ou mouse'}
              </div>
            </div>
            {sigNome && !sigDrawn && (
              <Alert type="warning" style={{ marginBottom: 10 }}>A assinatura do cliente é obrigatória para concluir a entrega.</Alert>
            )}
            <Btn style={{ width: '100%', justifyContent: 'center', padding: 13 }} disabled={!sigNome || !sigDrawn} onClick={() => setStep(3)}>
              Continuar
            </Btn>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="fg">
              <label className="fl">Observações (opcional)</label>
              <textarea className="fi" rows={3} value={obs} onChange={e => setObs(e.target.value)} placeholder="Ex: produto entregue na portaria..." />
            </div>
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>Resumo da entrega</div>
              <div style={{ fontSize: 13, color: 'var(--t2)' }}>📸 {fotos.length} foto(s)</div>
              <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 4 }}>✍ Recebido por: {sigNome}{sigDoc ? ` (${sigDoc})` : ''}</div>
              {obs && <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 4 }}>💬 {obs}</div>}
            </div>
            <Btn style={{ width: '100%', justifyContent: 'center', padding: 13, background: 'var(--green)' }} loading={actionLoading} onClick={concluir}>
              ✓ Concluir entrega
            </Btn>
          </div>
        )}

        {showWa && <WaTemplatesModal pedido={active} tipo="entregador" onClose={() => setShowWa(false)} />}
      </div>
    )
  }

  return (
    <div className="page">
      <div className="ph">
        <div>
          <h1>Minha Rota</h1>
          <div className="ph-sub">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
        <Btn variant="secondary" size="sm" onClick={reload}><Ic n="refresh" s={13} /></Btn>
      </div>

      {loading ? <Spinner /> : (
        <>
          {pendentes.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--t2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Pendentes ({pendentes.length})
              </div>
              {pendentes.map(p => (
                <div className="li" key={p.id}>
                  <div className="li-main">
                    <div className="li-title">{p.cliente}</div>
                    <div className="li-sub">#{p.numero_pedido} · {p.endereco}</div>
                  </div>
                  <Btn size="sm" onClick={() => iniciarEntrega(p)}>Iniciar</Btn>
                </div>
              ))}
            </>
          )}
          {entregues.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--t2)', margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Entregues ({entregues.length})
              </div>
              {entregues.map(p => (
                <div className="li" key={p.id} style={{ opacity: 0.6, cursor: 'default' }}>
                  <div className="li-main">
                    <div className="li-title">{p.cliente}</div>
                    <div className="li-sub">#{p.numero_pedido}</div>
                  </div>
                  <Badge status="Entregue" />
                </div>
              ))}
            </>
          )}
          {(pedidos || []).length === 0 && <Empty icon="🚚" text="Nenhuma entrega atribuída para hoje" />}
        </>
      )}
    </div>
  )
}

// ============================================================
// PONTO
// ============================================================
function Ponto() {
  const { perfil, isGestor } = useAuth()
  const [time, setTime] = useState(new Date())
  const { data: pontos, reload } = useData(() => pontoService.listHoje(perfil?.id), [perfil?.id])
  const { data: todosPontos, reload: reloadTodos } = useData(
    () => isGestor ? pontoService.listAllHoje() : Promise.resolve([]),
    [isGestor]
  )
  const { run, loading } = useAction()

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const registrar = (tipo) => {
    run(async () => {
      await pontoService.registrar({
        usuario_id: perfil?.id,
        usuario_nome: perfil?.full_name,
        tipo,
        data_hora: new Date().toISOString(),
        data: new Date().toISOString().split('T')[0],
      })
      await reload()
      if (isGestor) await reloadTodos()
    })
  }

  const calcHoras = (ps) => {
    const registros = ps || []
    let totalMs = 0
    let lastEntrada = null
    for (const p of registros) {
      if (p.tipo === 'Entrada' || p.tipo === 'Retorno') {
        lastEntrada = new Date(p.data_hora)
      } else if ((p.tipo === 'Almoço' || p.tipo === 'Saída') && lastEntrada) {
        totalMs += new Date(p.data_hora) - lastEntrada
        lastEntrada = null
      }
    }
    if (totalMs === 0) return null
    return (totalMs / 3600000).toFixed(1)
  }

  const horas = calcHoras(pontos)

  const porFuncionario = {}
  ;(todosPontos || []).forEach(p => {
    if (!porFuncionario[p.usuario_id]) porFuncionario[p.usuario_id] = { nome: p.usuario_nome, pontos: [] }
    porFuncionario[p.usuario_id].pontos.push(p)
  })

  return (
    <div className="page">
      <div className="ph"><h1>Ponto Eletrônico</h1></div>
      <div className="card" style={{ textAlign: 'center', marginBottom: 18 }}>
        <div className="clock">{time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
        <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 22 }}>
          {time.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        {horas && <div style={{ fontSize: 13, color: 'var(--green)', marginBottom: 16 }}>⏱ {horas}h trabalhadas hoje</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[['Entrada', 'var(--green)'], ['Saída', 'var(--red)'], ['Almoço', 'var(--amber)'], ['Retorno', 'var(--blue)']].map(([tipo, color]) => (
            <button key={tipo} className="btn btn-s" style={{ justifyContent: 'center', padding: 13, color, borderColor: `${color}33` }}
              onClick={() => registrar(tipo)} disabled={loading}>
              {tipo}
            </button>
          ))}
        </div>
      </div>

      <div style={{ fontWeight: 600, marginBottom: 10 }}>Meus registros de hoje</div>
      {(pontos || []).length === 0 ? <Empty text="Nenhum registro hoje" /> :
        (pontos || []).map(p => (
          <div className="li" key={p.id} style={{ cursor: 'default' }}>
            <Badge status={p.tipo === 'Entrada' || p.tipo === 'Retorno' ? 'Entregue' : p.tipo === 'Saída' ? 'Problema' : 'Remarcado'}>
              {p.tipo}
            </Badge>
            <div className="li-main">
              <div style={{ fontSize: 13 }}>{new Date(p.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        ))}

      {isGestor && Object.keys(porFuncionario).length > 0 && (
        <>
          <div style={{ fontWeight: 600, marginBottom: 12, marginTop: 28 }}>Ponto da equipe hoje</div>
          {Object.values(porFuncionario).map(func => {
            const h = calcHoras(func.pontos)
            return (
              <div className="card" key={func.nome} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' }}>
                  <div style={{ fontWeight: 600 }}>{func.nome}</div>
                  {h && <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>⏱ {h}h trabalhadas</span>}
                </div>
                {func.pontos.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderTop: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: 'var(--t2)' }}>{p.tipo}</span>
                    <span>{new Date(p.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

// ============================================================
// CONFIGURACOES
// ============================================================
function Configuracoes() {
  const { perfil, isAdmin } = useAuth()
  const [msg, setMsg] = useState('')

  return (
    <div className="page">
      <div className="ph"><h1>Configurações</h1></div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 14 }}>Minha conta</div>
        <div className="grid2">
          <div className="fg"><label className="fl">Nome</label><input className="fi" defaultValue={perfil?.full_name} disabled /></div>
          <div className="fg"><label className="fl">Email</label><input className="fi" defaultValue={perfil?.email} disabled /></div>
        </div>
        <div className="fg">
          <label className="fl">Cargo</label>
          <input className="fi" defaultValue={perfil?.role} disabled style={{ textTransform: 'capitalize' }} />
        </div>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 14 }}>Sistema</div>
        <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 8 }}>
          Banco de dados: <span style={{ color: 'var(--green)', fontWeight: 500 }}>● Conectado</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 8 }}>
          Versão: <span style={{ color: 'var(--t1)' }}>2.1.0</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--t2)' }}>
          Projeto: <span style={{ color: 'var(--t1)', fontFamily: 'var(--mono)', fontSize: 12 }}>kwccjkqltllypbmaisio</span>
        </div>
      </div>
      {isAdmin && (
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Administração</div>
          <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 12 }}>
            Para criar novos usuários com senha, acesse o Supabase Dashboard.
          </div>
          <a href="https://supabase.com/dashboard/project/kwccjkqltllypbmaisio/auth/users" target="_blank" rel="noreferrer">
            <Btn variant="secondary" size="sm">Abrir Supabase Auth ↗</Btn>
          </a>
        </div>
      )}
    </div>
  )
}

// ============================================================
// APP ROOT
// ============================================================
function AppContent() {
  const { perfil, loading, isGestor, isEntregador } = useAuth()
  const defaultPage = isEntregador && !isGestor ? 'rota' : 'dashboard'
  const [page, setPage] = useState(defaultPage)

  useEffect(() => {
    if (perfil) setPage(isEntregador && !isGestor ? 'rota' : 'dashboard')
  }, [perfil?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--t2)' }}>Carregando...</div>
      </div>
    )
  }

  if (!perfil) return <Login />

  const PAGES = {
    dashboard: <Dashboard />,
    pedidos: <Pedidos />,
    separacao: <Separacao />,
    agenda: <Agenda />,
    assistencia: <Assistencia />,
    roteiro: <Roteiro />,
    conferencia: <Conferencia />,
    equipe: <Equipe />,
    ranking: <Ranking />,
    mapa: <Mapa />,
    rota: <MinhaRota />,
    ponto: <Ponto />,
    config: <Configuracoes />,
  }

  return (
    <div className="app">
      <Topbar page={page} setPage={setPage} />
      <div className="main">{PAGES[page] || PAGES.dashboard}</div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
