import { useState, useEffect, useRef, useCallback } from 'react'
import './styles.css'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useData, useAction, useDateInfo, usePrazo } from './hooks/index'
import { Btn, Badge, Modal, Ic, Logo, Alert, Spinner, Empty, Input, Select, Textarea } from './components/ui/index'
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
      { id: 'agenda', label: 'Agenda' },
      { id: 'assistencia', label: 'Assistência' },
      { id: 'conferencia', label: 'Conferência' },
      { id: 'equipe', label: 'Equipe' },
      { id: 'ranking', label: 'Ranking' },
      { id: 'mapa', label: 'Mapa' },
    ] : []),
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
// DASHBOARD
// ============================================================
function Dashboard() {
  const hoje = new Date().toISOString().split('T')[0]
  const { data: pedidos, loading, reload } = useData(() => pedidosService.list(), [])

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
            <div className="li" key={p.id} style={{ cursor: 'default' }}>
              <div className="li-main">
                <div className="li-title">{p.cliente}</div>
                <div className="li-sub">#{p.numero_pedido} · {p.endereco}</div>
              </div>
              <Badge status={p.status} />
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

// ── Pedido Detalhe ────────────────────────────────────────
function PedidoDetalhe({ pedidoId, onBack }) {
  const { perfil, isGestor } = useAuth()
  const [showEdit, setShowEdit] = useState(false)
  const [showTroca, setShowTroca] = useState(false)
  const { run: runAction, loading: actionLoading } = useAction()

  const { data: pedido, loading, reload } = useData(() => pedidosService.getById(pedidoId), [pedidoId])
  const { data: historico, reload: reloadHist } = useData(() => pedidosService.getHistorico(pedidoId), [pedidoId])
  const { data: assinatura } = useData(() => assinaturasService.getByPedido(pedidoId), [pedidoId])
  const { data: entregadores } = useData(() => usuariosService.listEntregadores(), [])

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

  if (loading) return <div className="page"><Spinner /></div>
  if (!pedido) return <div className="page"><Empty text="Pedido não encontrado" /></div>

  const produtos = pedido.produtos || []

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
        <Btn variant="ghost" size="sm" onClick={onBack}><Ic n="back" s={13} /> Voltar</Btn>
        <div className="row">
          <Btn variant="secondary" size="sm" onClick={() => {/* TODO: gerar PDF */}}><Ic n="pdf" s={13} /> Gerar PDF</Btn>
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
              <a href={`https://wa.me/55${pedido.telefone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                <Btn variant="success" size="sm"><Ic n="wa" s={12} /> WhatsApp</Btn>
              </a>
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
          <button className="btn btn-s" style={{ flex: 1, justifyContent: 'center', color: 'var(--amber)' }}>📅 Remarcar</button>
          <button className="btn btn-d" style={{ flex: 1, justifyContent: 'center' }}>Cancelar</button>
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

      <div style={{ fontWeight: 600, marginBottom: 12 }}>Histórico</div>
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
// ASSISTENCIA
// ============================================================
function Assistencia() {
  const { perfil } = useAuth()
  const [sf, setSf] = useState('Todos')
  const [showNew, setShowNew] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const { data: assistencias, loading, reload } = useData(() => assistenciasService.list(), [])
  const statuses = ['Todos', 'Aberto', 'Em andamento', 'Aguardando fábrica', 'Aguardando peça', 'Concluído', 'Cancelado']

  const filtered = (assistencias || []).filter(a => sf === 'Todos' || a.status === sf)

  const handleCreate = async (dados) => {
    const { itens, ...assistencia } = dados
    const nova = await assistenciasService.create({ ...assistencia, created_by: perfil?.id })
    if (itens?.length) {
      for (const item of itens) {
        await assistenciasService.createItem({ ...item, assistencia_id: nova.id })
      }
    }
    await reload()
    setShowNew(false)
  }

  if (selectedId) return <AssistenciaDetalhe id={selectedId} onBack={() => { setSelectedId(null); reload() }} />

  return (
    <div className="page">
      <div className="ph">
        <h1>Assistência Técnica</h1>
        <Btn size="sm" onClick={() => setShowNew(true)}><Ic n="plus" s={13} /> Nova Assistência</Btn>
      </div>
      <div className="filters">
        {statuses.map(s => <button key={s} className={`fb${sf === s ? ' on' : ''}`} onClick={() => setSf(s)}>{s}</button>)}
      </div>
      {loading ? <Spinner /> : filtered.length === 0 ? <Empty icon="🔧" text="Nenhuma assistência" /> :
        filtered.map(a => <AssistenciaCard key={a.id} assistencia={a} onClick={() => setSelectedId(a.id)} />)}
      {showNew && <NovaAssistenciaModal onClose={() => setShowNew(false)} onSave={handleCreate} />}
    </div>
  )
}

function AssistenciaCard({ assistencia: a, onClick }) {
  const pr = usePrazo(a.data_abertura)
  return (
    <div className="li" onClick={onClick}>
      <div className="li-main">
        <div className="li-title">{a.cliente}</div>
        <div className="li-sub">{a.tipo_problema} · {a.responsavel_nome || 'Sem responsável'}</div>
        {pr && <div style={{ fontSize: 11, color: pr.color, marginTop: 2 }}>⏱ {pr.text}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <Badge status={a.status} />
        {pr && <span className={`badge ${pr.badge}`} style={{ fontSize: 10 }}>{pr.text}</span>}
      </div>
      <Ic n="chev" s={13} style={{ color: 'var(--t3)' }} />
    </div>
  )
}

function AssistenciaDetalhe({ id, onBack }) {
  const { data: a, loading, reload } = useData(() => assistenciasService.getById(id), [id])
  const { run, loading: actionLoading } = useAction()

  const updateStatus = async (status) => {
    await run(() => assistenciasService.update(id, { status }))
    reload()
  }

  if (loading) return <div className="page"><Spinner /></div>
  if (!a) return <div className="page"><Empty text="Não encontrado" /></div>

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
        <Btn variant="ghost" size="sm" onClick={onBack}><Ic n="back" s={13} /> Voltar</Btn>
        <select className="fi" style={{ width: 'auto' }} value={a.status} onChange={e => updateStatus(e.target.value)} disabled={actionLoading}>
          {['Aberto', 'Em andamento', 'Aguardando fábrica', 'Aguardando peça', 'Agendado', 'Concluído', 'Cancelado'].map(s => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <Badge status={a.status} style={{ marginBottom: 8 }} />
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>{a.cliente}</h1>
      <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16 }}>
        Aberto em {new Date(a.data_abertura + 'T12:00').toLocaleDateString('pt-BR')} · {a.origem || 'app'}
      </div>
      {a.observacoes && <Alert type="warning">{a.observacoes}</Alert>}
      <div style={{ fontWeight: 600, marginBottom: 10 }}>Itens ({(a.assistencia_itens || []).length})</div>
      {(a.assistencia_itens || []).map(item => (
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

function NovaAssistenciaModal({ onClose, onSave, prefill }) {
  const { perfil } = useAuth()
  const [step, setStep] = useState(0)
  const [dados, setDados] = useState({ solicitante: perfil?.full_name || '', telefone: prefill?.telefone || '', numero_pedido: prefill?.numero_pedido || '', cliente: prefill?.cliente || '' })
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
            <div className="fg"><label className="fl">Nº Pedido</label><input className="fi" value={dados.numero_pedido} onChange={upDados('numero_pedido')} /></div>
            <div className="fg"><label className="fl">Cliente *</label><input className="fi" value={dados.cliente} onChange={upDados('cliente')} /></div>
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

function ConferenciaDetalhe({ id, onBack }) {
  const { data: c, loading } = useData(() => conferenciasService.getById(id), [id])
  if (loading) return <div className="page"><Spinner /></div>
  if (!c) return <div className="page"><Empty text="Não encontrado" /></div>
  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
        <Btn variant="ghost" size="sm" onClick={onBack}><Ic n="back" s={13} /> Voltar</Btn>
        <Btn variant="secondary" size="sm"><Ic n="pdf" s={13} /> Gerar PDF</Btn>
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

  const clearSig = () => { initCanvas() }

  const iniciarEntrega = (p) => {
    setActive(p)
    setStep(0)
    setFotos([])
    setSigNome('')
    setSigDoc('')
    setObs('')
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
      await pedidosService.addHistorico(active.id, 'Entregue', `Concluído por ${perfil?.full_name}. Recebido por: ${sigNome}`, perfil)
      reload()
      setActive(null)
    })
  }

  const steps = ['Iniciar', 'Fotos', 'Assinatura', 'Concluir']
  const pendentes = (pedidos || []).filter(p => p.status !== 'Entregue')
  const entregues = (pedidos || []).filter(p => p.status === 'Entregue')

  if (active) {
    return (
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <Btn variant="ghost" size="sm" onClick={() => setActive(null)}>← Cancelar</Btn>
          <div style={{ fontSize: 12, color: 'var(--t2)' }}>Etapa {step + 1} de {steps.length}</div>
        </div>
        <div className="steps">{steps.map((_, i) => <div key={i} className={`dot${i === step ? ' on' : i < step ? ' done' : ''}`} />)}</div>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>{active.cliente}</div>
        <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 18 }}>#{active.numero_pedido} · {active.endereco}</div>

        {step === 0 && (
          <div>
            <div className="card" style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📍</div>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>Pronto para iniciar?</div>
              <div style={{ fontSize: 12, color: 'var(--t2)' }}>Localização GPS será registrada automaticamente</div>
            </div>
            <Btn style={{ width: '100%', justifyContent: 'center', padding: 13 }} loading={actionLoading}
              onClick={() => run(async () => {
                await pedidosService.update(active.id, { status: 'Em Rota', hora_inicio: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) })
                setStep(1)
              })}>
              Iniciar atendimento
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
                <label className="fl" style={{ margin: 0 }}>Assinatura do cliente</label>
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
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>Assine com o dedo ou mouse</div>
            </div>
            <Btn style={{ width: '100%', justifyContent: 'center', padding: 13 }} disabled={!sigNome} onClick={() => setStep(3)}>
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
              <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 4 }}>✍ Recebido por: {sigNome}</div>
              {obs && <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 4 }}>💬 {obs}</div>}
            </div>
            <Btn style={{ width: '100%', justifyContent: 'center', padding: 13, background: 'var(--green)' }} loading={actionLoading} onClick={concluir}>
              ✓ Concluir entrega
            </Btn>
          </div>
        )}
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
  const { perfil } = useAuth()
  const [time, setTime] = useState(new Date())
  const { data: pontos, reload } = useData(() => pontoService.listHoje(perfil?.id), [perfil?.id])
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
      reload()
    })
  }

  const calcHoras = () => {
    const ps = pontos || []
    const entrada = ps.find(p => p.tipo === 'Entrada')
    const saida = [...ps].reverse().find(p => p.tipo === 'Saída')
    if (!entrada || !saida) return null
    return ((new Date(saida.data_hora) - new Date(entrada.data_hora)) / 3600000).toFixed(1)
  }

  const horas = calcHoras()

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
      <div style={{ fontWeight: 600, marginBottom: 10 }}>Registros de hoje</div>
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
    agenda: <Agenda />,
    assistencia: <Assistencia />,
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
