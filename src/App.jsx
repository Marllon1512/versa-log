import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react'
import './styles.css'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useData, useAction, useDateInfo, usePrazo, usePagination, usePullToRefresh } from './hooks/index'
import { Btn, Badge, Modal, ConfirmModal, Ic, Logo, Alert, Spinner, Empty, Input } from './components/ui/index'
import * as XLSX from 'xlsx'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { supabase } from './lib/supabase'
import { toast, Toaster } from './lib/toast'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc
import { pedidosService } from './services/pedidos'
import {
  produtosService, usuariosService, equipesService,
  assistenciasService, conferenciasService, pontoService, assinaturasService,
  clientesService, fornecedoresService, catalogoService, configSistemaService,
  vendasService, comprasService, estoqueService, financeiroService,
  dpService, ordensServicoService,
  lojasService, decoradoresService, crmService, orcamentosService, metasService,
  npsService, devolucoesService, localizacoesService, consignacoesService,
  acabamentosService, tecidosService, representantesService, auditLog,
  perfisAcessoService,
  pedidosTimelineService, pedidosFollowupService, pedidosAnexosService,
  notificacoesService, chatService,
  escalasTrabalhoService, pontoOcorrenciasService, cercasVirtuaisService,
} from './services/index'

// ── Filtro global de loja ─────────────────────────────────
const LojaCtx = createContext({ lojaFiltro: '', setLojaFiltro: () => {} })
export const useLojaFiltro = () => useContext(LojaCtx)

const AppCtx = createContext({ navigateTo: () => {}, chatTarget: null, clearChatTarget: () => {}, openChatWith: () => {}, chatUnread: 0, setChatUnread: () => {}, reloadBgConfig: () => {} })

// Retorna filtro de loja efetivo: automático para usuários sem acesso global
function useEffectiveLoja() {
  const { perfil, podeVerTodasLojas } = useAuth()
  const { lojaFiltro } = useLojaFiltro()
  if (podeVerTodasLojas) return lojaFiltro || null
  return perfil?.loja || null
}

// ── Lojas do grupo (lista fixa) ───────────────────────────
const LOJAS_GRUPO = ['Templum Comércio','Templum Minas','Movelaria Olga','Santa Comércio','Alpendre Mobiliário','Arca Garden','Feirão']

// ── Permissões por perfil (mantido para simulação) ────────
const _ALL_PAGES = ['dashboard','pedidos','separacao','agenda','assistencia','roteiro','conferencia','equipe','ranking','mapa','rota','ponto','config','cadastros','vendas','compras','estoque','financeiro','financeiro_loja','dp','os','fila','crm','catalogo','nf','nps','devolucao','relatorios','chat']
const PROFILE_PAGES = {
  admin:     _ALL_PAGES, gestor: _ALL_PAGES, diretor: _ALL_PAGES,
  gerente:   ['dashboard','pedidos','agenda','assistencia','conferencia','equipe','ranking','ponto','cadastros','vendas','estoque','os','crm','nps','chat'],
  assistente_admin: ['dashboard','pedidos','agenda','ponto','cadastros','compras','estoque','dp','financeiro_loja','chat'],
  vendedor:  ['dashboard','vendas','cadastros','ponto','crm','ranking','chat'],
  gerente_logistica:    ['dashboard','pedidos','separacao','roteiro','conferencia','assistencia','mapa','rota','ponto','estoque','equipe','ranking','chat'],
  supervisor_logistica: ['dashboard','pedidos','separacao','roteiro','conferencia','assistencia','mapa','rota','ponto','estoque','chat'],
  expedidor: ['dashboard','separacao','conferencia','ponto','chat'],
  entregador:['dashboard','rota','pedidos','ponto','ranking','chat'],
  motorista: ['dashboard','rota','pedidos','ponto','ranking','chat'],
  separador: ['dashboard','separacao','pedidos','ponto','chat'],
  conferente:['dashboard','conferencia','pedidos','ponto','chat'],
  estoque:   ['dashboard','separacao','pedidos','ponto','estoque','chat'],
  tecnico:   ['dashboard','roteiro','assistencia','ponto','os','chat'],
  atendente: ['dashboard','assistencia','pedidos','agenda','ponto','chat'],
  contador:  ['financeiro','dp','relatorios'],
}
const PROFILE_LABELS = {
  admin:'Administrador', diretor:'Diretor', gerente:'Gerente de Loja',
  assistente_admin:'Assistente Adm.', vendedor:'Vendedor',
  gerente_logistica:'Ger. Logística', supervisor_logistica:'Supervisor Log.',
  expedidor:'Expedição', gestor:'Gestor',
  entregador:'Entregador', motorista:'Motorista', separador:'Separador',
  conferente:'Conferente', estoque:'Estoque', tecnico:'Téc. Assistência',
  atendente:'Atendente', contador:'Contador',
}
const PAGE_LABELS = { dashboard:'Painel',pedidos:'Pedidos',separacao:'Separação',agenda:'Agenda',assistencia:'Assistência',roteiro:'Roteiro',conferencia:'Conferência',equipe:'Equipe',ranking:'Ranking',mapa:'Mapa',rota:'Minha Rota',ponto:'Ponto',config:'Configurações',cadastros:'Cadastros',vendas:'Vendas',compras:'Compras',estoque:'Estoque',financeiro:'Financeiro',financeiro_loja:'Financeiro (Loja)',dp:'Dep. Pessoal',os:'Ordens de Serviço',fila:'Fila Liberação',crm:'CRM',catalogo:'Catálogo Digital',nf:'Nota Fiscal',nps:'NPS',devolucao:'Devoluções',relatorios:'Relatórios',chat:'Chat' }
const fmtR = (v) => (parseFloat(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})

function LojaSelect({ value, onChange, className, style, placeholder }) {
  const [outra, setOutra] = useState(() => !!(value && !LOJAS_GRUPO.includes(value)))
  const selVal = outra ? '__outra__' : (LOJAS_GRUPO.includes(value) ? value : '')
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
        {LOJAS_GRUPO.map(l => <option key={l} value={l}>{l}</option>)}
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

function LojaMultiSelect({ value, onChange }) {
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
          {LOJAS_GRUPO.map(l => (
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
    <div style={{ minHeight:'100vh', background:'var(--bg0)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      {/* Background glow */}
      <div style={{ position:'fixed', top:'20%', left:'50%', transform:'translateX(-50%)', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle, rgba(110,110,240,0.08) 0%, transparent 70%)', pointerEvents:'none' }} />

      <div style={{ background:'var(--bg1)', border:'1px solid var(--border)', borderRadius:24, padding:'40px 36px', width:'100%', maxWidth:400, position:'relative', boxShadow:'0 24px 64px rgba(0,0,0,0.5)' }}>

        {/* Logo block */}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ width:72, height:72, borderRadius:'50%', background:'#000', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'#fff', marginBottom:16 }}><Logo size={42} /></div>
          <div style={{ fontWeight:800, fontSize:22, letterSpacing:'.06em', color:'var(--t1)', marginBottom:4 }}>VERSA LOG</div>
          <div style={{ fontSize:13, color:'var(--t3)' }}>Sistema de Logística · ERP</div>
        </div>

        {err && <Alert type="error" style={{ marginBottom:16 }}>{err}</Alert>}

        <form onSubmit={handleLogin}>
          <Input label="Email ou usuário" type="text" value={email} onChange={e => setEmail(e.target.value)} placeholder="email ou nome de usuário" required />
          <Input label="Senha" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" required />
          <Btn type="submit" style={{ width:'100%', justifyContent:'center', padding:'13px', marginTop:8, fontSize:14, borderRadius:10 }} loading={loading}>
            Entrar no sistema
          </Btn>
        </form>

        <div style={{ textAlign:'center', marginTop:24, fontSize:11, color:'var(--t3)' }}>v2.1 · Versa Log ERP</div>
      </div>
    </div>
  )
}

// ============================================================
// SIDEBAR
// ============================================================
const MOTIVATIONAL_MSGS = [
  'Cada entrega é uma promessa cumprida. 🚀',
  'Excelência em logística começa com você. 💪',
  'Juntos somos o melhor do Brasil! 🇧🇷',
  'Organização hoje, sucesso amanhã. ⭐',
  'Sua dedicação faz a diferença. 🏆',
]

const SIDEBAR_GROUPS = [
  { group: 'OPERACIONAL', items: [
    { id: 'dashboard',   label: 'Dashboard',    icon: '🏠' },
    { id: 'pedidos',     label: 'Pedidos',      icon: '📦' },
    { id: 'separacao',   label: 'Separação',    icon: '📋' },
    { id: 'conferencia', label: 'Conferência',  icon: '☑️' },
    { id: 'fila',        label: 'Fila de Liberação', icon: '✅' },
  ]},
  { group: 'LOGÍSTICA', items: [
    { id: 'roteiro', label: 'Roteiro',    icon: '📍' },
    { id: 'rota',    label: 'Minha Rota', icon: '🚚' },
    { id: 'mapa',    label: 'Mapa',       icon: '🗺️' },
  ]},
  { group: 'COMERCIAL', items: [
    { id: 'vendas',   label: 'Vendas e PDV',     icon: '💰' },
    { id: 'crm',      label: 'CRM',              icon: '🎯' },
    { id: 'compras',  label: 'Compras',          icon: '🛒' },
    { id: 'catalogo', label: 'Catálogo Digital', icon: '🛍️' },
    { id: 'nps',      label: 'NPS',              icon: '⭐' },
  ]},
  { group: 'ATENDIMENTO', items: [
    { id: 'assistencia', label: 'Assistência',       icon: '🔧' },
    { id: 'agenda',      label: 'Agenda',            icon: '📅' },
    { id: 'os',          label: 'Ordens de Serviço', icon: '🛠️' },
    { id: 'devolucao',   label: 'Devolução e Troca', icon: '↩️' },
  ]},
  { group: 'ESTOQUE', items: [
    { id: 'estoque', label: 'Estoque', icon: '📊' },
  ]},
  { group: 'FINANCEIRO', items: [
    { id: 'financeiro',      label: 'Financeiro',  icon: '💳' },
    { id: 'financeiro_loja', label: 'Financeiro',  icon: '💳' },
    { id: 'nf',              label: 'Nota Fiscal', icon: '📄' },
    { id: 'relatorios',      label: 'Relatórios',  icon: '📈' },
  ]},
  { group: 'PESSOAS', items: [
    { id: 'dp',      label: 'Departamento Pessoal', icon: '👔' },
    { id: 'equipe',  label: 'Equipe',               icon: '👥' },
    { id: 'ponto',   label: 'Ponto Eletrônico',     icon: '⏰' },
    { id: 'ranking', label: 'Ranking',              icon: '🏆' },
  ]},
  { group: 'SISTEMA', items: [
    { id: 'cadastros', label: 'Cadastros',     icon: '🏪' },
    { id: 'config',    label: 'Configurações', icon: '⚙️' },
    { id: 'chat',      label: 'Chat',          icon: '💬' },
  ]},
]

function Sidebar({ page, setPage, collapsed, mobileOpen, setMobileOpen }) {
  const { perfil, logout, isAdmin, isSimulating, simulatedRole, setSimulatedRole, effectiveRole, modulosPermitidos } = useAuth()
  const { chatUnread } = useContext(AppCtx)
  let allowedPages = modulosPermitidos.length ? modulosPermitidos : (PROFILE_PAGES[effectiveRole] || _ALL_PAGES)
  if (effectiveRole !== 'contador' && !allowedPages.includes('chat')) allowedPages = [...allowedPages, 'chat']
  const [msgIdx, setMsgIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setMsgIdx(i => (i + 1) % MOTIVATIONAL_MSGS.length), 30000)
    return () => clearInterval(t)
  }, [])

  const navigate = (id) => { setPage(id); setMobileOpen(false) }

  return (
    <>
      {mobileOpen && <div className="sb-overlay" onClick={() => setMobileOpen(false)} />}
      <div className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>

        {/* Header */}
        <div style={{ padding:'14px 12px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent: collapsed ? 'center' : 'flex-start', gap:10, overflow:'hidden' }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'#000', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', flexShrink:0 }}><Logo size={20} /></div>
            {!collapsed && (
              <div style={{ overflow:'hidden', flex:1 }}>
                <div style={{ fontWeight:700, fontSize:13, color:'var(--t1)', letterSpacing:'.05em', whiteSpace:'nowrap' }}>VERSA LOG</div>
                <div style={{ fontSize:10, color:'var(--t3)', whiteSpace:'nowrap' }}>Sistema de Logística</div>
              </div>
            )}
          </div>
        </div>

        {/* User profile */}
        <div style={{ padding:'12px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, overflow:'hidden' }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,var(--accent),#a78bfa)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:13, flexShrink:0 }}>
              {perfil?.full_name?.[0]?.toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div style={{ overflow:'hidden', flex:1 }}>
                <div style={{ fontWeight:600, fontSize:13, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{perfil?.full_name}</div>
                <div style={{ fontSize:10, color:'var(--t3)', whiteSpace:'nowrap' }}>{PROFILE_LABELS[effectiveRole] || effectiveRole} · Versa Log</div>
              </div>
            )}
          </div>
          {!collapsed && isAdmin && (
            <div style={{ marginTop:8 }}>
              <select
                style={{ width:'100%', fontSize:11, padding:'4px 8px', border:'1px solid var(--border)', borderRadius:6, background:'var(--bg2)', color: isSimulating ? '#f97316' : 'var(--t2)', cursor:'pointer', fontFamily:'var(--font)' }}
                value={simulatedRole || ''}
                onChange={e => setSimulatedRole(e.target.value || null)}
              >
                <option value="">👁 Admin (real)</option>
                <option value="diretor">Diretor</option>
                <option value="gerente">Gerente de Loja</option>
                <option value="assistente_admin">Assistente Adm.</option>
                <option value="vendedor">Vendedor</option>
                <option value="gerente_logistica">Ger. Logística</option>
                <option value="supervisor_logistica">Supervisor Log.</option>
                <option value="expedidor">Expedição</option>
                <option value="entregador">Entregador</option>
                <option value="separador">Separador</option>
                <option value="conferente">Conferente</option>
                <option value="tecnico">Téc. Assistência</option>
                <option value="atendente">Atendente</option>
                <option value="contador">Contador</option>
              </select>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="sb-nav">
          {SIDEBAR_GROUPS.map(grp => {
            const visible = grp.items.filter(it => allowedPages.includes(it.id))
            if (!visible.length) return null
            const isActiveGroup = visible.some(it => it.id === page)
            return (
              <div key={grp.group}>
                {!collapsed
                  ? <div className={`sb-group-label${isActiveGroup ? ' active-group' : ''}`}>{grp.group}</div>
                  : <div style={{ height:10 }} />
                }
                {visible.map(it => (
                  <button key={it.id}
                    className={`sb-item${page === it.id ? ' active' : ''}`}
                    onClick={() => navigate(it.id)}
                    title={collapsed ? it.label : undefined}
                    style={collapsed ? { justifyContent:'center', padding:'10px 0', margin:'1px 4px', width:'calc(100% - 8px)', borderLeft:'none' } : {}}
                  >
                    <span className="sb-icon">{it.icon}</span>
                    {!collapsed && <span className="sb-label">{it.label}</span>}
                    {it.id === 'chat' && chatUnread > 0 && (
                      <span style={{ marginLeft:'auto', background:'var(--accent)', color:'#fff', fontSize:10, fontWeight:700, minWidth:16, height:16, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px' }}>
                        {chatUnread > 9 ? '9+' : chatUnread}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        {!collapsed ? (
          <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
            <div style={{ fontSize:12, color:'var(--t3)', lineHeight:1.55, marginBottom:8, minHeight:38, transition:'opacity .3s' }}>
              {MOTIVATIONAL_MSGS[msgIdx]}
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--mono)' }}>v2.1 · Versa Log ERP</span>
              <button className="btn btn-g btn-sm btn-ico" onClick={logout} title="Sair" style={{ width:28, height:28 }}>
                <Ic n="logout" s={13} />
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding:'10px 0', borderTop:'1px solid var(--border)', flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:9, color:'var(--t3)', fontFamily:'var(--mono)' }}>v2.1</span>
            <button className="btn btn-g btn-sm btn-ico" onClick={logout} title="Sair" style={{ width:28, height:28 }}>
              <Ic n="logout" s={13} />
            </button>
          </div>
        )}

      </div>
    </>
  )
}

const NOTIF_ICONS = {
  lembrete_ponto: '⏰', nova_mensagem: '💬',
  pedido_submetido: '📋', pedido_aprovado_gerente: '✅', pedido_rejeitado_gerente: '❌',
  pedido_aprovado_financeiro: '💰', pedido_rejeitado_financeiro: '❌',
  pedido_confirmado_fabrica: '🏭', pedido_produto_conferido: '📦',
  pedido_agendado: '📅', pedido_separado: '🔧', follow_up_adicionado: '📝',
}

function tempoRelativo(iso) {
  const diff = Date.now() - new Date(iso)
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  return `há ${Math.floor(h / 24)}d`
}

function NotifBell({ navigateTo }) {
  const { perfil } = useAuth()
  const [count, setCount]   = useState(0)
  const [open, setOpen]     = useState(false)
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(false)
  const ref = useRef()

  useEffect(() => {
    if (!perfil?.id) return
    const fetch = async () => { const c = await notificacoesService.contarNaoLidas(perfil.id); setCount(c) }
    fetch()
    const id = setInterval(fetch, 30000)
    return () => clearInterval(id)
  }, [perfil?.id])

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const abrirPainel = async () => {
    if (!open && perfil?.id) {
      setLoading(true)
      const ns = await notificacoesService.listar(perfil.id)
      setNotifs(ns.slice(0, 20))
      setLoading(false)
    }
    setOpen(o => !o)
  }

  const clicarNotif = async (n) => {
    if (!n.lida) {
      await notificacoesService.marcarComoLida(n.id).catch(() => {})
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, lida: true } : x))
      setCount(c => Math.max(0, c - 1))
    }
    setOpen(false)
    if (n.tipo === 'lembrete_ponto') navigateTo('ponto')
    else if (n.tipo === 'nova_mensagem') navigateTo('chat')
    else if (n.link) window.open(n.link, '_blank')
  }

  const marcarTodas = async () => {
    await notificacoesService.marcarTodasComoLidas(perfil.id).catch(() => {})
    setNotifs(prev => prev.map(n => ({ ...n, lida: true })))
    setCount(0)
  }

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={abrirPainel}
        style={{ position:'relative', width:34, height:34, borderRadius:8, border:'none', background:'var(--bg3)', color:'var(--t1)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
        🔔
        {count > 0 && (
          <span style={{ position:'absolute', top:-4, right:-4, background:'var(--red)', color:'#fff', fontSize:9, fontWeight:700, minWidth:16, height:16, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px', lineHeight:1 }}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>
      {open && (
        <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', width:320, maxHeight:480, overflowY:'auto', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, zIndex:400, boxShadow:'0 8px 32px rgba(0,0,0,.6)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px 10px', borderBottom:'1px solid var(--border)', position:'sticky', top:0, background:'var(--bg2)', zIndex:1 }}>
            <span style={{ fontWeight:700, fontSize:14 }}>Notificações</span>
            {count > 0 && (
              <button onClick={marcarTodas} style={{ fontSize:11, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)' }}>
                Marcar todas como lidas
              </button>
            )}
          </div>
          {loading ? (
            <div style={{ padding:24, textAlign:'center', color:'var(--t3)', fontSize:13 }}>Carregando...</div>
          ) : notifs.length === 0 ? (
            <div style={{ padding:24, textAlign:'center', color:'var(--t3)', fontSize:13 }}>Nenhuma notificação</div>
          ) : notifs.map(n => (
            <div key={n.id} onClick={() => clicarNotif(n)}
              style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid var(--border)', background: n.lida ? 'transparent' : 'rgba(99,102,241,.07)' }}>
              <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                <span style={{ fontSize:16, flexShrink:0, marginTop:2 }}>{NOTIF_ICONS[n.tipo] || '🔔'}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'var(--t1)', marginBottom:2 }}>{n.titulo}</div>
                  <div style={{ fontSize:12, color:'var(--t2)', lineHeight:1.4 }}>{n.mensagem}</div>
                  <div style={{ fontSize:11, color:'var(--t3)', marginTop:4 }}>{tempoRelativo(n.created_at)}</div>
                </div>
                {!n.lida && <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--accent)', flexShrink:0, marginTop:5 }} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ContentTopbar({ page, setMobileOpen, navigateTo, collapsed, onToggle }) {
  const { perfil, isSimulating, simulatedRole, isGestor } = useAuth()
  const { lojaFiltro, setLojaFiltro } = useLojaFiltro()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef()

  useEffect(() => {
    const fn = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const { logout } = useAuth()

  return (
    <div className="content-topbar">
      <button className="btn btn-g btn-ico btn-sm sb-mobile-btn" onClick={() => setMobileOpen(o => !o)}>☰</button>
      <button className="sb-desktop-toggle" onClick={onToggle} title={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}>
        <Ic n="chev" s={17} style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 250ms ease' }} />
      </button>
      <div style={{ flex:1 }}>
        <span style={{ fontWeight:600, fontSize:16, color:'var(--t1)' }}>{PAGE_LABELS[page] || page}</span>
      </div>
      {isGestor && (
        <select
          value={lojaFiltro}
          onChange={e => setLojaFiltro(e.target.value)}
          style={{ fontSize:12, padding:'4px 8px', border:'1px solid var(--border)', borderRadius:8, background:'var(--bg2)', color:'var(--t1)', maxWidth:140, cursor:'pointer' }}
        >
          <option value="">Todas as lojas</option>
          {LOJAS_GRUPO.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      )}
      {isSimulating && (
        <span style={{ fontSize:11, background:'#f97316', color:'#fff', padding:'2px 10px', borderRadius:20, fontWeight:600, whiteSpace:'nowrap' }}>
          👁 {PROFILE_LABELS[simulatedRole] || simulatedRole}
        </span>
      )}
      <NotifBell navigateTo={navigateTo} />
      <div ref={menuRef} style={{ position:'relative' }}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{ width:34, height:34, borderRadius:'50%', border:'none', background:'linear-gradient(135deg,var(--accent),#a78bfa)', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {perfil?.full_name?.[0]?.toUpperCase() || 'U'}
        </button>
        {menuOpen && (
          <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:'6px', minWidth:180, zIndex:300, boxShadow:'0 8px 32px rgba(0,0,0,.5)' }}>
            <div style={{ padding:'8px 12px 10px', borderBottom:'1px solid var(--border)', marginBottom:4 }}>
              <div style={{ fontWeight:600, fontSize:13 }}>{perfil?.full_name}</div>
              <div style={{ fontSize:11, color:'var(--t3)', marginTop:1 }}>{perfil?.email}</div>
            </div>
            <button onClick={() => setMenuOpen(false)}
              style={{ display:'block', width:'100%', textAlign:'left', padding:'8px 12px', border:'none', background:'none', cursor:'pointer', color:'var(--t1)', fontSize:13, borderRadius:8, fontFamily:'var(--font)' }}>
              Ver perfil
            </button>
            <button onClick={() => { setMenuOpen(false); logout() }}
              style={{ display:'block', width:'100%', textAlign:'left', padding:'8px 12px', border:'none', background:'none', cursor:'pointer', color:'var(--red)', fontSize:13, borderRadius:8, fontFamily:'var(--font)' }}>
              Sair
            </button>
          </div>
        )}
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
  const [uploadingIds, setUploadingIds] = useState(new Set())

  useEffect(() => {
    if (pedido?.produtos) {
      setProdutos(pedido.produtos.map(p => ({ ...p, _volumes: p.volumes || '', _local: p.local_separacao || '', _peso: p.nivel_peso || '', _foto: p.foto_separacao || null, _fotoPreview: null })))
    }
  }, [pedido?.id])

  const updateProd = (id, field, value) => {
    setProdutos(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const uploadFoto = async (prodId, file) => {
    updateProd(prodId, '_fotoPreview', URL.createObjectURL(file))
    setUploadingIds(prev => new Set(prev).add(prodId))
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${pedidoId}/${prodId}_${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('separacao').upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from('separacao').getPublicUrl(path)
      updateProd(prodId, '_foto', data.publicUrl)
    } catch (e) {
      toast.error('Erro ao enviar foto: ' + e.message)
      updateProd(prodId, '_fotoPreview', null)
    } finally {
      setUploadingIds(prev => { const s = new Set(prev); s.delete(prodId); return s })
    }
  }

  const marcarSeparado = async (prod) => {
    await run(async () => {
      await produtosService.update(prod.id, {
        status_produto: 'Separado',
        volumes: prod._volumes ? parseInt(prod._volumes) : null,
        local_separacao: prod._local,
        nivel_peso: prod._peso,
        foto_separacao: prod._foto || null,
      })
      const updated = produtos.map(p => p.id === prod.id ? { ...p, status_produto: 'Separado', _foto: prod._foto } : p)
      setProdutos(updated)
      setSucesso(prod.id)
      setTimeout(() => setSucesso(''), 2000)

      const allDone = updated.every(p => p.status_produto === 'Separado')
      if (allDone) {
        const fotos = updated.map(p => p._foto || p.foto_separacao).filter(Boolean)
        await pedidosService.registrarSeparacao(pedidoId, perfil, {
          fotos, numeroPedido: pedido?.numero_pedido, loja: pedido?.local_separacao,
        })
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
        <Alert type="success" style={{ marginBottom: 16 }}>✓ Todos os produtos separados! Status do fluxo atualizado para separado.</Alert>
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
                <input
                  id={`foto-input-${pr.id}`}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files[0]; if (f) uploadFoto(pr.id, f) }}
                />
                <div
                  className="upload-zone"
                  style={{ padding: 16, cursor: 'pointer' }}
                  onClick={() => document.getElementById(`foto-input-${pr.id}`)?.click()}
                >
                  {uploadingIds.has(pr.id) ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                      <Spinner />
                      <span style={{ fontSize: 13 }}>Enviando foto...</span>
                    </div>
                  ) : (pr._fotoPreview || pr._foto) ? (
                    <img
                      src={pr._fotoPreview || pr._foto}
                      alt="foto separação"
                      style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 8, objectFit: 'cover', display: 'block', margin: '0 auto' }}
                    />
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
                disabled={!pr._local || !pr._foto || saving}
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
function Dashboard({ setPage }) {
  const { perfil, effectiveRole, podeVerFinanceiro, podeVerVendas } = useAuth()
  const lojaEf = useEffectiveLoja()
  const hoje = new Date().toISOString().split('T')[0]
  const diaSemana = new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})
  const mesAtual = new Date().getMonth() + 1
  const anoAtual = new Date().getFullYear()
  const mesPfx = `${anoAtual}-${String(mesAtual).padStart(2,'0')}`

  const isAdminDiretor    = ['admin','diretor','gestor'].includes(effectiveRole)
  const isGerente         = effectiveRole === 'gerente'
  const isVendedor        = effectiveRole === 'vendedor'
  const isLogistica       = ['gerente_logistica','supervisor_logistica'].includes(effectiveRole)
  const isOperacional     = ['expedidor','separador','conferente'].includes(effectiveRole)
  const isAssistenteAdmin = effectiveRole === 'assistente_admin'
  const isTecnicoAtend    = ['tecnico','atendente'].includes(effectiveRole)
  const isEntregador      = ['entregador','motorista'].includes(effectiveRole)

  const needVendas = isAdminDiretor || isGerente || isVendedor || podeVerVendas
  const needFinan  = isAdminDiretor || isAssistenteAdmin || podeVerFinanceiro

  const { data: pedidos,     loading: lPed, reload: rPed } = useData(() => pedidosService.list(), [])
  const { data: assistencias,loading: lAss }               = useData(() => assistenciasService.list(), [])
  const { data: vendas }                                   = useData(() => needVendas ? vendasService.list() : Promise.resolve([]), [needVendas])
  const { data: receber }                                  = useData(() => needFinan ? financeiroService.listReceber() : Promise.resolve([]), [needFinan])
  const { data: pagar }                                    = useData(() => needFinan ? financeiroService.listPagar() : Promise.resolve([]), [needFinan])
  const { data: compras }                                  = useData(() => isAssistenteAdmin ? comprasService.list() : Promise.resolve([]), [isAssistenteAdmin])
  const { data: metas }                                    = useData(() => isAdminDiretor || isGerente || isVendedor ? metasService.list(mesAtual, anoAtual) : Promise.resolve([]), [isAdminDiretor, isGerente, isVendedor])

  const [selected, setSelected] = useState(null)
  if (selected) return <PedidoDetalhe pedidoId={selected} onBack={() => { setSelected(null); rPed() }} />

  const byLoja = (arr) => lojaEf ? (arr||[]).filter(x => x.loja === lojaEf || x.local_separacao === lojaEf) : (arr||[])

  const peds        = byLoja(pedidos)
  const pHoje       = peds.filter(p => p.data_entrega === hoje)
  const pAtrasados  = peds.filter(p => p.data_entrega < hoje && !['Entregue','Cancelado'].includes(p.status))
  const assAll      = byLoja(assistencias)
  const assAbertas  = assAll.filter(a => !['concluida','Concluído','cancelada'].includes(a.status))

  const vendasHoje  = byLoja(vendas).filter(v => v.created_at?.startsWith(hoje))
  const vendasMes   = byLoja(vendas).filter(v => v.created_at?.startsWith(mesPfx))
  const totalVHoje  = vendasHoje.reduce((s,v)=>s+(parseFloat(v.total)||0),0)
  const totalVMes   = vendasMes.reduce((s,v)=>s+(parseFloat(v.total)||0),0)

  const minhasVHoje = (vendas||[]).filter(v => v.vendedor_id === perfil?.id && v.created_at?.startsWith(hoje))
  const minhasVMes  = (vendas||[]).filter(v => v.vendedor_id === perfil?.id && v.created_at?.startsWith(mesPfx))
  const totalMHoje  = minhasVHoje.reduce((s,v)=>s+(parseFloat(v.total)||0),0)
  const totalMMes   = minhasVMes.reduce((s,v)=>s+(parseFloat(v.total)||0),0)

  const vencHoje    = (receber||[]).filter(r => r.vencimento === hoje && r.status !== 'pago')
  const recAberto   = (receber||[]).filter(r => r.status !== 'pago')
  const prox7       = new Date(); prox7.setDate(prox7.getDate() + 7)
  const pagar7d     = (pagar||[]).filter(p => p.status !== 'pago' && p.vencimento && new Date(p.vencimento) <= prox7)
  const cmpPend     = (compras||[]).filter(c => ['pendente','aguardando','aguardando_aprovacao'].includes(c.status))

  const assMinhas   = assAbertas.filter(a => a.tecnico_id === perfil?.id)

  const diasParado = (p) => Math.floor((Date.now() - new Date(p.updated_at || p.created_at).getTime()) / 86400000)
  const aguardandoGerente      = peds.filter(p => p.status_fluxo === 'aguardando_gerente')
  const aguardandoFinanceiro   = peds.filter(p => p.status_fluxo === 'aguardando_financeiro')
  const separadosParaAgendar   = peds.filter(p => p.status_fluxo === 'aprovado_entrega' && !p.data_entrega_agendada)
  const separacoesPendHoje     = peds.filter(p => p.status_fluxo === 'separado' && p.data_entrega_agendada === hoje)
  const meusPedidos            = (pedidos || []).filter(p => p.vendedor_id === perfil?.id)

  const metaLoja    = (metas||[]).find(m => m.referencia_nome === lojaEf && m.tipo === 'loja')
  const metaLojaPct = metaLoja ? Math.min(100, totalVMes / (metaLoja.valor_meta || 1) * 100) : 0
  const metaPess    = (metas||[]).find(m => m.referencia_id === perfil?.id && m.tipo === 'vendedor')
  const metaPessPct = metaPess ? Math.min(100, totalMMes / (metaPess.valor_meta || 1) * 100) : 0

  const ATALHOS = isEntregador
    ? [{label:'Minha Rota',icon:'🚚',page:'rota'},{label:'Ponto',icon:'⏰',page:'ponto'}]
    : isOperacional
    ? effectiveRole === 'separador'
      ? [{label:'Separações',icon:'📋',page:'separacao'},{label:'Ponto',icon:'⏰',page:'ponto'}]
      : effectiveRole === 'conferente'
      ? [{label:'Conferências',icon:'☑️',page:'conferencia'},{label:'Ponto',icon:'⏰',page:'ponto'}]
      : [{label:'Pedidos',icon:'📦',page:'pedidos'},{label:'Ponto',icon:'⏰',page:'ponto'}]
    : isVendedor
    ? [{label:'Nova Venda',icon:'💰',page:'vendas'},{label:'CRM',icon:'🎯',page:'crm'},{label:'Ponto',icon:'⏰',page:'ponto'}]
    : isTecnicoAtend
    ? [{label:'Assistências',icon:'🔧',page:'assistencia'},{label:'Agenda',icon:'📅',page:'agenda'},{label:'Ponto',icon:'⏰',page:'ponto'}]
    : isAssistenteAdmin
    ? [{label:'Compras',icon:'🛒',page:'compras'},{label:'Financeiro',icon:'💳',page:'financeiro_loja'},{label:'Ponto',icon:'⏰',page:'ponto'}]
    : [{label:'Nova Venda',icon:'💰',page:'vendas'},{label:'Novo Pedido',icon:'📦',page:'pedidos'},{label:'Assistência',icon:'🔧',page:'assistencia'},{label:'Ponto',icon:'⏰',page:'ponto'}]

  const StatBox = ({ label, val, color, bg, icon, sm }) => (
    <div className="stat">
      <div className="stat-ico" style={{background:bg,color:color}}><Ic n={icon} s={14}/></div>
      <div className="stat-val" style={{color,fontSize:sm?16:28}}>{lPed?'—':val}</div>
      <div className="stat-lbl">{label}</div>
    </div>
  )

  const MetaBar = ({ label, realizado, meta, pct }) => (
    <div style={{marginBottom:12}}>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:4}}>
        <span>{label}</span>
        <span style={{color:'var(--t2)'}}>{fmtR(realizado)} / {fmtR(meta)}</span>
      </div>
      <div style={{height:7,background:'var(--bg3)',borderRadius:4}}>
        <div style={{height:'100%',width:`${pct}%`,background:pct>=100?'var(--green)':pct>=70?'var(--accent)':'var(--amber)',borderRadius:4,transition:'width .4s'}} />
      </div>
      <div style={{fontSize:11,color:'var(--t3)',marginTop:3}}>{pct.toFixed(0)}% atingido</div>
    </div>
  )

  return (
    <div className="page">
      <div className="ph">
        <div>
          <h1>Painel</h1>
          <div className="ph-sub" style={{textTransform:'capitalize'}}>{diaSemana}</div>
        </div>
        <Btn variant="secondary" size="sm" onClick={rPed}><Ic n="refresh" s={13} /></Btn>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {ATALHOS.map(a => (
          <button key={a.page} className="btn btn-s" style={{flex:'1 1 100px',flexDirection:'column',padding:'14px 10px',gap:4,minWidth:90,fontSize:13}} onClick={() => setPage?.(a.page)}>
            <span style={{fontSize:20}}>{a.icon}</span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>

      {/* ── Admin / Diretor / Gestor ── */}
      {isAdminDiretor && <>
        <div className="stats" style={{marginBottom:20}}>
          <StatBox label="Entregas hoje"       val={pHoje.length}      color="var(--accent)" bg="var(--adim)"  icon="truck" />
          <StatBox label="Vendas hoje"         val={fmtR(totalVHoje)}  color="var(--blue)"   bg="var(--bdim)"  icon="bar"   sm />
          <StatBox label="Assistências abertas" val={assAbertas.length} color="var(--amber)"  bg="var(--adim2)" icon="wrench" />
          <StatBox label="A receber hoje"      val={vencHoje.length}   color="var(--red)"    bg="var(--rdim)"  icon="alert" />
        </div>
        {pAtrasados.length > 0 && <Alert type="error" style={{marginBottom:10}}>⚠️ {pAtrasados.length} pedido(s) com entrega atrasada</Alert>}
        {vencHoje.length > 0    && <Alert type="warning" style={{marginBottom:10}}>💳 {vencHoje.length} conta(s) a receber vencendo hoje</Alert>}
        {aguardandoFinanceiro.length > 0 && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
              Ag. aprovação financeira
              <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 12 }}>{aguardandoFinanceiro.length}</span>
            </div>
            {lPed ? <Spinner /> : aguardandoFinanceiro.slice(0, 4).map(p => {
              const dias = diasParado(p)
              return (
                <div key={p.id} className="li" onClick={() => setSelected(p.id)} style={{ background: dias >= 2 ? 'rgba(251,191,36,0.08)' : undefined }}>
                  <div className="li-main">
                    <div className="li-title">{p.cliente}</div>
                    <div className="li-sub" style={{ color: dias >= 2 ? 'var(--amber)' : undefined }}>#{p.numero_pedido}{dias >= 2 ? ` · ⏳ Aguardando há ${dias} dia(s)` : ''}</div>
                  </div>
                  <Ic n="chev" s={12} style={{ color: 'var(--t3)' }} />
                </div>
              )
            })}
          </div>
        )}
        <div className="grid2" style={{gap:12,marginBottom:12}}>
          <div className="card">
            <div style={{fontWeight:600,marginBottom:12,display:'flex',justifyContent:'space-between'}}>
              <span>Entregas de hoje</span><Badge variant="bg">{pHoje.length}</Badge>
            </div>
            {lPed ? <Spinner /> : pHoje.length === 0 ? <Empty icon="📦" text="Nenhum pedido hoje" /> :
              pHoje.slice(0,5).map(p => (
                <div className="li" key={p.id} onClick={() => setSelected(p.id)}>
                  <div className="li-main"><div className="li-title">{p.cliente}</div><div className="li-sub">#{p.numero_pedido} · {p.loja||p.local_separacao}</div></div>
                  <Badge status={p.status} />
                </div>
              ))}
            {pHoje.length > 5 && <div style={{fontSize:12,color:'var(--t3)',textAlign:'center',marginTop:8}}>+{pHoje.length-5} mais</div>}
          </div>
          <div className="card">
            <div style={{fontWeight:600,marginBottom:12,display:'flex',justifyContent:'space-between'}}>
              <span>Assistências abertas</span><Badge variant="bg-amber">{assAbertas.length}</Badge>
            </div>
            {lAss ? <Spinner /> : assAbertas.length === 0 ? <Empty icon="🔧" text="Nenhuma assistência aberta" /> :
              assAbertas.slice(0,5).map(a => (
                <div className="li" key={a.id}>
                  <div className="li-main"><div className="li-title">{a.cliente}</div><div className="li-sub">{a.tipo_problema} · {a.loja}</div></div>
                  <Badge status={a.status} />
                </div>
              ))}
          </div>
        </div>
        {(metas||[]).filter(m => m.tipo === 'loja').length > 0 && (
          <div className="card">
            <div style={{fontWeight:600,marginBottom:12}}>Meta por loja — {new Date().toLocaleDateString('pt-BR',{month:'long'})}</div>
            {(metas||[]).filter(m => m.tipo === 'loja').map(meta => {
              const real = (vendas||[]).filter(v => v.loja === meta.referencia_nome && v.created_at?.startsWith(mesPfx)).reduce((s,v)=>s+(parseFloat(v.total)||0),0)
              const pct  = Math.min(100, meta.valor_meta ? real / meta.valor_meta * 100 : 0)
              return <MetaBar key={meta.id} label={meta.referencia_nome} realizado={real} meta={meta.valor_meta} pct={pct} />
            })}
          </div>
        )}
      </>}

      {/* ── Gerente ── */}
      {isGerente && <>
        <div className="stats" style={{marginBottom:20}}>
          <StatBox label="Vendas hoje"      val={fmtR(totalVHoje)}  color="var(--blue)"   bg="var(--bdim)"  icon="bar"    sm />
          <StatBox label="Pedidos hoje"     val={pHoje.length}      color="var(--accent)" bg="var(--adim)"  icon="truck" />
          <StatBox label="Assistências"     val={assAbertas.length} color="var(--amber)"  bg="var(--adim2)" icon="wrench" />
          <StatBox label="Atrasos"          val={pAtrasados.length} color="var(--red)"    bg="var(--rdim)"  icon="alert" />
        </div>
        {metaLoja && <div className="card" style={{marginBottom:12}}><div style={{fontWeight:600,marginBottom:8}}>Meta do mês — {lojaEf}</div><MetaBar label="" realizado={totalVMes} meta={metaLoja.valor_meta} pct={metaLojaPct} /></div>}
        {pAtrasados.length > 0 && <Alert type="error" style={{marginBottom:10}}>⚠️ {pAtrasados.length} pedido(s) atrasado(s)</Alert>}
        {aguardandoGerente.length > 0 && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
              Pedidos aguardando sua aprovação
              <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 12 }}>{aguardandoGerente.length}</span>
            </div>
            {lPed ? <Spinner /> : aguardandoGerente.map(p => {
              const dias = diasParado(p)
              return (
                <div key={p.id} className="li" onClick={() => setSelected(p.id)} style={{ background: dias >= 2 ? 'rgba(251,191,36,0.08)' : undefined }}>
                  <div className="li-main">
                    <div className="li-title">{p.cliente}</div>
                    <div className="li-sub" style={{ color: dias >= 2 ? 'var(--amber)' : undefined }}>#{p.numero_pedido}{dias >= 2 ? ` · ⏳ Aguardando há ${dias} dia(s)` : ''}</div>
                  </div>
                  <Ic n="chev" s={12} style={{ color: 'var(--t3)' }} />
                </div>
              )
            })}
          </div>
        )}
        <div className="grid2" style={{gap:12}}>
          <div className="card">
            <div style={{fontWeight:600,marginBottom:12,display:'flex',justifyContent:'space-between'}}><span>Pedidos hoje</span><Badge variant="bg">{pHoje.length}</Badge></div>
            {lPed ? <Spinner /> : pHoje.length === 0 ? <Empty icon="📦" text="Nenhum pedido hoje" /> :
              pHoje.slice(0,5).map(p => (
                <div className="li" key={p.id} onClick={() => setSelected(p.id)}>
                  <div className="li-main"><div className="li-title">{p.cliente}</div><div className="li-sub">#{p.numero_pedido}</div></div>
                  <Badge status={p.status} />
                </div>
              ))}
          </div>
          <div className="card">
            <div style={{fontWeight:600,marginBottom:12,display:'flex',justifyContent:'space-between'}}><span>Assistências abertas</span><Badge variant="bg-amber">{assAbertas.length}</Badge></div>
            {lAss ? <Spinner /> : assAbertas.length === 0 ? <Empty icon="🔧" text="Nenhuma aberta" /> :
              assAbertas.slice(0,5).map(a => (
                <div className="li" key={a.id}>
                  <div className="li-main"><div className="li-title">{a.cliente}</div><div className="li-sub">{a.tipo_problema}</div></div>
                  <Badge status={a.status} />
                </div>
              ))}
          </div>
        </div>
      </>}

      {/* ── Vendedor ── */}
      {isVendedor && <>
        <div className="stats" style={{marginBottom:20}}>
          <StatBox label="Vendas hoje"   val={fmtR(totalMHoje)} color="var(--blue)"   bg="var(--bdim)"  icon="bar" sm />
          <StatBox label="Vendas no mês" val={fmtR(totalMMes)}  color="var(--green)"  bg="var(--gdim)"  icon="bar" sm />
          <StatBox label="Qtd. hoje"     val={minhasVHoje.length} color="var(--accent)" bg="var(--adim)" icon="check" />
        </div>
        {metaPess && <div className="card" style={{marginBottom:12}}><div style={{fontWeight:600,marginBottom:8}}>Minha meta — {new Date().toLocaleDateString('pt-BR',{month:'long'})}</div><MetaBar label="" realizado={totalMMes} meta={metaPess.valor_meta} pct={metaPessPct} /></div>}
        {meusPedidos.length > 0 && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Status dos meus pedidos por etapa</div>
            {[
              { label: 'Ag. Gerente',    key: 'aguardando_gerente',    color: 'var(--amber)' },
              { label: 'Ag. Financeiro', key: 'aguardando_financeiro', color: 'var(--blue)'  },
              { label: 'Ag. Fábrica',   key: 'aguardando_fabrica',    color: 'var(--accent)'},
              { label: 'Ag. Produto',   key: 'aguardando_produto',    color: 'var(--accent)'},
              { label: 'Ag. Entrega',   key: 'aprovado_entrega',      color: 'var(--green)' },
              { label: 'Separado',      key: 'separado',              color: 'var(--green)' },
              { label: 'Rejeitado',     key: ['rejeitado_gerente','rejeitado_financeiro'], color: 'var(--red)' },
              { label: 'Entregue',      key: null, color: 'var(--green)', count: meusPedidos.filter(p => p.status === 'Entregue').length },
            ].map(({ label, key, color, count }) => {
              const n = count !== undefined ? count : meusPedidos.filter(p => Array.isArray(key) ? key.includes(p.status_fluxo) : p.status_fluxo === key).length
              if (n === 0) return null
              return (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13 }}>{label}</span>
                  <span style={{ background: color.replace(')', ',0.15)').replace('var(', 'var('), color, fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 12, border: `1px solid ${color}` }}>{n}</span>
                </div>
              )
            })}
          </div>
        )}
        <div className="card">
          <div style={{fontWeight:600,marginBottom:12}}>Minhas vendas hoje</div>
          {minhasVHoje.length === 0 ? <Empty icon="💰" text="Nenhuma venda registrada hoje" /> :
            minhasVHoje.map(v => (
              <div className="li" key={v.id}>
                <div className="li-main"><div className="li-title">{v.cliente_nome||'Cliente'}</div><div className="li-sub">{fmtR(v.total)}</div></div>
                <Badge status={v.status} />
              </div>
            ))}
        </div>
      </>}

      {/* ── Logística ── */}
      {isLogistica && <>
        <div className="stats" style={{marginBottom:20}}>
          <StatBox label="Entregas hoje" val={pHoje.length}                              color="var(--accent)" bg="var(--adim)"  icon="truck" />
          <StatBox label="Entregues"     val={pHoje.filter(p=>p.status==='Entregue').length} color="var(--green)"  bg="var(--gdim)"  icon="check" />
          <StatBox label="Em Rota"       val={pHoje.filter(p=>p.status==='Em Rota').length}  color="var(--blue)"   bg="var(--bdim)"  icon="truck" />
          <StatBox label="Atrasados"     val={pAtrasados.length}                         color="var(--red)"    bg="var(--rdim)"  icon="alert" />
        </div>
        {pAtrasados.length > 0 && <Alert type="error" style={{marginBottom:10}}>⚠️ {pAtrasados.length} pedido(s) com entrega atrasada</Alert>}
        {assAbertas.length > 0 && <Alert type="warning" style={{marginBottom:10}}>🔧 {assAbertas.length} assistência(s) abertas</Alert>}
        <div className="card">
          <div style={{fontWeight:600,marginBottom:12,display:'flex',justifyContent:'space-between'}}><span>Entregas de hoje</span><Badge variant="bg">{pHoje.length}</Badge></div>
          {lPed ? <Spinner /> : pHoje.length === 0 ? <Empty icon="📦" text="Nenhum pedido hoje" /> :
            pHoje.map(p => (
              <div className="li" key={p.id} onClick={() => setSelected(p.id)}>
                <div className="li-main"><div className="li-title">{p.cliente}</div><div className="li-sub">#{p.numero_pedido} · {p.entregador_nome||'Sem entregador'}</div></div>
                <Badge status={p.status} />
              </div>
            ))}
        </div>
        {separadosParaAgendar.length > 0 && (
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
              Aprovados para agendar
              <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 12 }}>{separadosParaAgendar.length}</span>
            </div>
            {separadosParaAgendar.slice(0, 5).map(p => (
              <div key={p.id} className="li" onClick={() => setSelected(p.id)}>
                <div className="li-main"><div className="li-title">{p.cliente}</div><div className="li-sub">#{p.numero_pedido} · {p.local_separacao||''}</div></div>
                <Ic n="chev" s={12} style={{ color: 'var(--t3)' }} />
              </div>
            ))}
            {separadosParaAgendar.length > 5 && <div style={{ fontSize: 12, color: 'var(--t3)', textAlign: 'center', marginTop: 8 }}>+{separadosParaAgendar.length - 5} mais</div>}
          </div>
        )}
        {separacoesPendHoje.length > 0 && (
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
              Separações pendentes para hoje
              <span style={{ background: 'var(--amber)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 12 }}>{separacoesPendHoje.length}</span>
            </div>
            {separacoesPendHoje.slice(0, 5).map(p => (
              <div key={p.id} className="li" onClick={() => setSelected(p.id)}>
                <div className="li-main"><div className="li-title">{p.cliente}</div><div className="li-sub">#{p.numero_pedido}</div></div>
                <Ic n="chev" s={12} style={{ color: 'var(--t3)' }} />
              </div>
            ))}
          </div>
        )}
        {pAtrasados.length > 0 && (
          <div className="card" style={{ marginTop: 12, borderLeft: '4px solid var(--red)' }}>
            <div style={{ fontWeight: 600, marginBottom: 10, color: 'var(--red)', display: 'flex', justifyContent: 'space-between' }}>
              Pedidos atrasados
              <span style={{ background: 'var(--red)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 12 }}>{pAtrasados.length}</span>
            </div>
            {pAtrasados.slice(0, 5).map(p => (
              <div key={p.id} className="li" onClick={() => setSelected(p.id)}>
                <div className="li-main"><div className="li-title">{p.cliente}</div><div className="li-sub">#{p.numero_pedido} · {p.data_entrega}</div></div>
                <Ic n="chev" s={12} style={{ color: 'var(--red)' }} />
              </div>
            ))}
          </div>
        )}
      </>}

      {/* ── Operacional (expedidor / separador / conferente) ── */}
      {isOperacional && <>
        <div className="stats" style={{marginBottom:20}}>
          <StatBox label="Pedidos hoje" val={pHoje.length}                                    color="var(--accent)" bg="var(--adim)"  icon="truck" />
          <StatBox label="Separando"    val={pHoje.filter(p=>p.status==='Separando').length}   color="var(--blue)"   bg="var(--bdim)"  icon="check" />
          <StatBox label="Prontos"      val={pHoje.filter(p=>p.status==='Pronto para Rota').length} color="var(--green)"  bg="var(--gdim)"  icon="check" />
        </div>
        <div className="card">
          <div style={{fontWeight:600,marginBottom:12}}>Fila do dia</div>
          {lPed ? <Spinner /> : pHoje.filter(p=>!['Entregue','Cancelado'].includes(p.status)).length === 0 ? <Empty icon="📋" text="Nenhum pedido na fila" /> :
            pHoje.filter(p=>!['Entregue','Cancelado'].includes(p.status)).map(p => (
              <div className="li" key={p.id}>
                <div className="li-main"><div className="li-title">{p.cliente}</div><div className="li-sub">#{p.numero_pedido} · {p.loja||p.local_separacao}</div></div>
                <Badge status={p.status} />
              </div>
            ))}
        </div>
      </>}

      {/* ── Assistente Admin ── */}
      {isAssistenteAdmin && <>
        <div className="stats" style={{marginBottom:20}}>
          <StatBox label="Pagar (7 dias)"      val={pagar7d.length}  color="var(--red)"    bg="var(--rdim)"  icon="alert" />
          <StatBox label="Receber em aberto"   val={recAberto.length} color="var(--amber)"  bg="var(--adim2)" icon="bar" />
          <StatBox label="Compras pendentes"   val={cmpPend.length}  color="var(--blue)"   bg="var(--bdim)"  icon="truck" />
        </div>
        {pagar7d.length > 0 && <Alert type="error" style={{marginBottom:10}}>💳 {pagar7d.length} conta(s) a pagar nos próximos 7 dias</Alert>}
        {podeVerFinanceiro && aguardandoFinanceiro.length > 0 && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
              Ag. aprovação financeira
              <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 12 }}>{aguardandoFinanceiro.length}</span>
            </div>
            {lPed ? <Spinner /> : aguardandoFinanceiro.slice(0, 4).map(p => {
              const dias = diasParado(p)
              return (
                <div key={p.id} className="li" onClick={() => setSelected(p.id)} style={{ background: dias >= 2 ? 'rgba(251,191,36,0.08)' : undefined }}>
                  <div className="li-main">
                    <div className="li-title">{p.cliente}</div>
                    <div className="li-sub" style={{ color: dias >= 2 ? 'var(--amber)' : undefined }}>#{p.numero_pedido}{dias >= 2 ? ` · ⏳ ${dias} dia(s)` : ''}</div>
                  </div>
                  <Ic n="chev" s={12} style={{ color: 'var(--t3)' }} />
                </div>
              )
            })}
          </div>
        )}
        <div className="grid2" style={{gap:12}}>
          <div className="card">
            <div style={{fontWeight:600,marginBottom:12}}>A pagar — próximos 7 dias</div>
            {pagar7d.length === 0 ? <Empty icon="✅" text="Nenhuma conta vencendo" /> :
              pagar7d.slice(0,5).map(p => (
                <div className="li" key={p.id}>
                  <div className="li-main"><div className="li-title">{p.descricao||p.fornecedor}</div><div className="li-sub">{fmtR(p.valor)} · {p.vencimento}</div></div>
                  <Badge status={p.status} />
                </div>
              ))}
          </div>
          <div className="card">
            <div style={{fontWeight:600,marginBottom:12}}>Compras pendentes</div>
            {cmpPend.length === 0 ? <Empty icon="🛒" text="Nenhuma compra pendente" /> :
              cmpPend.slice(0,5).map(c => (
                <div className="li" key={c.id}>
                  <div className="li-main"><div className="li-title">{c.fornecedor_nome||c.fornecedor}</div><div className="li-sub">{fmtR(c.valor_total)}</div></div>
                  <Badge status={c.status} />
                </div>
              ))}
          </div>
        </div>
      </>}

      {/* ── Técnico / Atendente ── */}
      {isTecnicoAtend && <>
        <div className="stats" style={{marginBottom:20}}>
          <StatBox label="Minhas assistências" val={assMinhas.length}                              color="var(--amber)" bg="var(--adim2)" icon="wrench" />
          <StatBox label="Urgentes"            val={assMinhas.filter(a=>a.prioridade==='Urgente').length} color="var(--red)"   bg="var(--rdim)"  icon="alert" />
        </div>
        <div className="card">
          <div style={{fontWeight:600,marginBottom:12}}>Minhas assistências abertas</div>
          {lAss ? <Spinner /> : assMinhas.length === 0 ? <Empty icon="🔧" text="Nenhuma assistência atribuída" /> :
            assMinhas.map(a => (
              <div className="li" key={a.id}>
                <div className="li-main"><div className="li-title">{a.cliente}</div><div className="li-sub">{a.tipo_problema} · {a.loja}</div></div>
                <Badge status={a.status} />
              </div>
            ))}
        </div>
      </>}

      {/* ── Entregador / Motorista ── */}
      {isEntregador && <>
        <div className="stats" style={{marginBottom:20}}>
          <StatBox label="Pedidos hoje" val={pHoje.length}                              color="var(--accent)" bg="var(--adim)"  icon="truck" />
          <StatBox label="Entregues"    val={pHoje.filter(p=>p.status==='Entregue').length} color="var(--green)"  bg="var(--gdim)"  icon="check" />
          <StatBox label="Em Rota"      val={pHoje.filter(p=>p.status==='Em Rota').length}  color="var(--blue)"   bg="var(--bdim)"  icon="truck" />
          <StatBox label="Problemas"    val={pHoje.filter(p=>p.status==='Problema').length} color="var(--red)"    bg="var(--rdim)"  icon="alert" />
        </div>
        <div className="card">
          <div style={{fontWeight:600,marginBottom:12,display:'flex',justifyContent:'space-between'}}><span>Meus pedidos de hoje</span><Badge variant="bg">{pHoje.length}</Badge></div>
          {lPed ? <Spinner /> : pHoje.length === 0 ? <Empty icon="📦" text="Nenhum pedido hoje" /> :
            pHoje.map(p => (
              <div className="li" key={p.id} onClick={() => setSelected(p.id)}>
                <div className="li-main"><div className="li-title">{p.cliente}</div><div className="li-sub">#{p.numero_pedido} · {p.endereco}</div></div>
                <Badge status={p.status} />
              </div>
            ))}
        </div>
      </>}
    </div>
  )
}

function ModalDevolucao({ pedido, onClose, onConfirm }) {
  const [form, setForm] = useState({ motivo:'arrependimento', descricao:'', valor_devolvido:0, estoque_revertido:true, financeiro_revertido:true })
  const act = useAction()
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const MOTIVOS = ['arrependimento','defeito','medida errada','item incorreto','outro']
  return (
    <Modal title="Registrar Devolução" onClose={onClose}>
      <Alert type="warning" style={{ marginBottom:12 }}>Registrar devolução alterará o status do pedido para "Devolvido".</Alert>
      <div className="grid2">
        <div className="fg"><label className="fl">Motivo</label>
          <select className="fi" value={form.motivo} onChange={up('motivo')}>
            {MOTIVOS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="fg"><label className="fl">Valor devolvido (R$)</label><input className="fi" type="number" step="0.01" inputMode="decimal" min={0} value={form.valor_devolvido} onChange={up('valor_devolvido')} /></div>
        <div className="fg" style={{ gridColumn:'1/-1' }}><label className="fl">Descrição</label><textarea className="fi" rows={2} value={form.descricao} onChange={up('descricao')} /></div>
        <label className="fl" style={{ display:'flex', gap:8, alignItems:'center', cursor:'pointer' }}>
          <input type="checkbox" checked={form.estoque_revertido} onChange={e => setForm(p => ({ ...p, estoque_revertido: e.target.checked }))} />
          Reverter estoque
        </label>
        <label className="fl" style={{ display:'flex', gap:8, alignItems:'center', cursor:'pointer' }}>
          <input type="checkbox" checked={form.financeiro_revertido} onChange={e => setForm(p => ({ ...p, financeiro_revertido: e.target.checked }))} />
          Estornar financeiro
        </label>
      </div>
      <div style={{ display:'flex', gap:8, marginTop:12 }}>
        <button className="btn btn-p" style={{ flex:1, background:'var(--red)' }} onClick={() => onConfirm(form)} disabled={act.loading}>Confirmar Devolução</button>
        <button className="btn btn-s" onClick={onClose}>Cancelar</button>
      </div>
    </Modal>
  )
}

// ============================================================
// PEDIDOS
// ============================================================
function Pedidos() {
  const { perfil, isGestor, effectiveRole, podeVerFinanceiro } = useAuth()
  const [search, setSearch] = useState('')
  const [statusFil, setStatusFil] = useState('Todos')
  const [lojasFil, setLojasFil] = useState([])
  const [fluxoFil, setFluxoFil] = useState(null)
  const [selected, setSelected] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [checkedIds, setCheckedIds] = useState(new Set())
  const [showBulkDel, setShowBulkDel] = useState(false)
  const [bulkDelLoading, setBulkDelLoading] = useState(false)

  const { data: pedidos, loading, reload } = useData(() => pedidosService.list(), [])

  const statuses = ['Todos', 'Pendente', 'Separando', 'Pronto para Rota', 'Em Rota', 'Entregue', 'Aguardando Montagem', 'Problema', 'Remarcado', 'Cancelado']
  const todayStr = new Date().toISOString().slice(0, 10)

  const pIsGerente = effectiveRole === 'gerente'
  const pIsFinanceiro = ['diretor','admin'].includes(effectiveRole) || (effectiveRole === 'assistente_admin' && podeVerFinanceiro)
  const pIsLogistica = ['gerente_logistica','admin','diretor'].includes(effectiveRole)

  const fluxoFiltros = []
  if (pIsGerente) fluxoFiltros.push({ label: 'Aguardando minha aprovação', value: 'aguardando_gerente' })
  if (pIsFinanceiro) fluxoFiltros.push({ label: 'Aguardando aprovação financeira', value: 'aguardando_financeiro' })
  if (pIsLogistica) {
    fluxoFiltros.push({ label: 'Aprovados para agendar', value: 'aprovado_agendar' })
    fluxoFiltros.push({ label: 'Separados para entregar hoje', value: 'separados_hoje' })
  }

  const filtered = (pedidos || []).filter(p => {
    const mSearch = !search || p.cliente?.toLowerCase().includes(search.toLowerCase()) || p.numero_pedido?.includes(search)
    const mStatus = statusFil === 'Todos' || p.status === statusFil
    const mLoja = lojasFil.length === 0 || lojasFil.includes(p.local_separacao)
    let mFluxo = true
    if (fluxoFil === 'aguardando_gerente') mFluxo = p.status_fluxo === 'aguardando_gerente'
    else if (fluxoFil === 'aguardando_financeiro') mFluxo = p.status_fluxo === 'aguardando_financeiro'
    else if (fluxoFil === 'aprovado_agendar') mFluxo = p.status_fluxo === 'aprovado_entrega' && !p.data_entrega_agendada
    else if (fluxoFil === 'separados_hoje') mFluxo = p.status_fluxo === 'separado' && p.data_entrega_agendada === todayStr
    return mSearch && mStatus && mLoja && mFluxo
  })

  // Mapeia campos da UI para colunas reais da tabela pedidos
  const mapPedidoDB = (dados) => {
    const COLS = ['numero_pedido','cliente','telefone','endereco','cidade','data_entrega','status','prioridade','observacoes','local_separacao','entregador_id','entregador_nome','motivo_remarcacao','motivo_cancelamento']
    return Object.fromEntries(COLS.filter(k => dados[k] !== undefined).map(k => [k, dados[k]]))
  }
  // Mapeia produto da UI → colunas reais de produtos (sem acabamento/medida)
  const mapProdutoDB = (p, pedidoId) => ({
    pedido_id: pedidoId,
    nome_produto: p.nome_produto,
    quantidade: parseInt(p.quantidade) || 1,
    status_produto: p.status_produto || 'Pendente',
    observacao: [p.medida && `Medida: ${p.medida}`, p.acabamento && `Acabamento: ${p.acabamento}`, p.observacao].filter(Boolean).join(' | ') || null,
  })

  const handleCreate = async (dados) => {
    try {
      const { produtos, ...raw } = dados
      const novo = await pedidosService.create(mapPedidoDB(raw))
      if (produtos?.length) {
        await produtosService.createMany(produtos.map(p => mapProdutoDB(p, novo.id)))
      }
      await reload()
      setShowNew(false)
      toast.success('Pedido criado com sucesso!')
    } catch (e) {
      console.error('[Pedidos] handleCreate:', e)
      toast.error('Erro ao criar pedido: ' + (e.message || e.details || 'desconhecido'))
    }
  }

  const handleImport = async (lista) => {
    let ok = 0, erros = 0
    for (const item of lista) {
      try {
        const { produtos, selected: _s, erro: _e, _confidence: _c, _filename: _f, ...raw } = item
        const novo = await pedidosService.create(mapPedidoDB(raw))
        if (produtos?.length) {
          await produtosService.createMany(produtos.map(p => mapProdutoDB(p, novo.id)))
        }
        ok++
      } catch (e) {
        console.error('[Pedidos] handleImport item:', e)
        erros++
      }
    }
    await reload()
    setShowImport(false)
    if (erros === 0) toast.success(`${ok} pedido(s) importado(s) com sucesso!`)
    else toast.error(`${ok} importado(s), ${erros} com erro. Veja o console (F12).`)
  }

  const toggleCheck = (id, e) => {
    e.stopPropagation()
    setCheckedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  const handleBulkDelete = async () => {
    setBulkDelLoading(true)
    let ok = 0, erros = 0
    for (const id of checkedIds) {
      try {
        await produtosService.removeByPedido(id)
        await pedidosService.remove(id)
        ok++
      } catch (e) { console.error('[Pedidos] bulkDelete:', e); erros++ }
    }
    setBulkDelLoading(false)
    setShowBulkDel(false)
    setCheckedIds(new Set())
    await reload()
    if (erros === 0) toast.success(`${ok} pedido(s) excluído(s).`)
    else toast.error(`${ok} excluído(s), ${erros} com erro.`)
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
          <div className="ph-sub">{filtered.length} pedido(s){checkedIds.size > 0 ? ` · ${checkedIds.size} selecionado(s)` : ''}</div>
        </div>
        {isGestor && (
          <div className="row">
            {checkedIds.size > 0 && (
              <Btn size="sm" style={{ background: 'var(--red)', color: '#fff' }} onClick={() => setShowBulkDel(true)}>
                <Ic n="x" s={13} /> Excluir {checkedIds.size}
              </Btn>
            )}
            <Btn variant="secondary" size="sm" onClick={() => setShowImport(true)}><Ic n="upload" s={13} /> Importar em Lote</Btn>
            <Btn size="sm" onClick={() => setShowNew(true)}><Ic n="plus" s={13} /> Novo Pedido</Btn>
          </div>
        )}
      </div>
      {showBulkDel && (
        <Modal title="Excluir Pedidos" onClose={() => setShowBulkDel(false)}
          footer={<><Btn variant="ghost" onClick={() => setShowBulkDel(false)}>Cancelar</Btn><Btn style={{ background: 'var(--red)', color: '#fff' }} loading={bulkDelLoading} onClick={handleBulkDelete}>Excluir {checkedIds.size} pedido(s)</Btn></>}>
          <Alert type="error">Tem certeza? Esta ação não pode ser desfeita. Todos os produtos vinculados também serão excluídos.</Alert>
        </Modal>
      )}

      <div className="filters">
        <input className="search" placeholder="Buscar cliente ou pedido..." value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ minWidth: 160 }}><LojaMultiSelect value={lojasFil} onChange={setLojasFil} /></div>
      </div>
      <div className="filters">
        {statuses.map(s => (
          <button key={s} className={`fb${statusFil === s ? ' on' : ''}`} onClick={() => setStatusFil(s)}>{s}</button>
        ))}
      </div>

      {fluxoFiltros.length > 0 && (
        <div className="filters">
          <button className={`fb${!fluxoFil ? ' on' : ''}`} onClick={() => setFluxoFil(null)}>Todos</button>
          {fluxoFiltros.map(f => (
            <button key={f.value} className={`fb${fluxoFil === f.value ? ' on' : ''}`} onClick={() => setFluxoFil(fluxoFil === f.value ? null : f.value)}>{f.label}</button>
          ))}
        </div>
      )}

      {loading ? <Spinner /> : filtered.length === 0 ? <Empty icon="📦" /> :
        filtered.map(p => (
          <PedidoCard key={p.id} pedido={p} onClick={() => setSelected(p.id)}
            checked={isGestor ? checkedIds.has(p.id) : undefined}
            onCheck={isGestor ? (e) => toggleCheck(p.id, e) : undefined}
          />
        ))}

      {showNew && (
        <NovoPedidoModal onClose={() => setShowNew(false)} onSave={handleCreate} />
      )}
      {showImport && (
        <ImportarLoteModal onClose={() => setShowImport(false)} onImport={handleImport} />
      )}
    </div>
  )
}

function PedidoCard({ pedido: p, onClick, checked, onCheck }) {
  const d = useDateInfo(p.data_entrega)
  return (
    <div className="li" onClick={onClick} style={{ background: checked ? 'var(--rdim)' : undefined }}>
      {onCheck !== undefined && (
        <input type="checkbox" checked={!!checked} onChange={onCheck}
          style={{ flexShrink: 0, marginRight: 4, cursor: 'pointer' }} />
      )}
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

const TIMELINE_ICONS = {
  criacao:'📄', aprovacao:'✅', rejeicao:'❌', envio_fabrica:'📤',
  confirmacao_fabrica:'🏭', recebimento_produto:'📦', conferencia:'🔍',
  separacao:'📋', agendamento:'📅', agendamento_entrega:'📅',
  entrega:'🏠', follow_up:'💬', anexo:'📎', edicao:'✏️',
}
const TIMELINE_COLORS = {
  criacao:'var(--accent)', aprovacao:'var(--green)', rejeicao:'var(--red)',
  envio_fabrica:'var(--blue)', confirmacao_fabrica:'var(--blue)',
  recebimento_produto:'var(--amber)', conferencia:'var(--accent)',
  separacao:'var(--amber)', agendamento:'var(--green)', agendamento_entrega:'var(--green)',
  entrega:'var(--green)', follow_up:'var(--accent)', anexo:'var(--t2)', edicao:'var(--amber)',
}

// ── Pedido Detalhe ────────────────────────────────────────
function PedidoDetalhe({ pedidoId, onBack }) {
  const { perfil, isGestor, effectiveRole, podeVerFinanceiro } = useAuth()
  const { openChatWith } = useContext(AppCtx)
  const [showEdit, setShowEdit] = useState(false)
  const [showTroca, setShowTroca] = useState(false)
  const [showRemarcar, setShowRemarcar] = useState(false)
  const [showCancelar, setShowCancelar] = useState(false)
  const [showWaGestor, setShowWaGestor] = useState(false)
  const [showExcluir, setShowExcluir] = useState(false)
  const [showDevolucao, setShowDevolucao] = useState(false)
  const [corrigirMode, setCorrigirMode] = useState(false)
  const [textoFollowUp, setTextoFollowUp] = useState('')
  const [filesFollowUp, setFilesFollowUp] = useState([])
  const [loadingFollowUp, setLoadingFollowUp] = useState(false)
  const [dataAgendamento, setDataAgendamento] = useState('')
  const [showRejeitar, setShowRejeitar] = useState(false)
  const [motivoRejeicao, setMotivoRejeicao] = useState('')
  const [tipoRejeicao, setTipoRejeicao] = useState('')
  const followUpFileRef = useRef()
  const { run: runAction, loading: actionLoading } = useAction()

  const { data: pedido, loading, reload } = useData(() => pedidosService.getById(pedidoId), [pedidoId])
  const { data: historico, reload: reloadHist } = useData(() => pedidosService.getHistorico(pedidoId), [pedidoId])
  const { data: timeline, reload: reloadTimeline } = useData(() => pedidosTimelineService.list(pedidoId), [pedidoId])
  const { data: entregadores } = useData(() => usuariosService.listEntregadores(), [])
  const { data: histCliente } = useData(
    () => pedido?.cliente ? pedidosService.list({ cliente: pedido.cliente }) : Promise.resolve([]),
    [pedido?.cliente]
  )

  const d = useDateInfo(pedido?.data_entrega)

  const FLOW = { Pendente: 'Separando', Separando: 'Pronto para Rota', 'Pronto para Rota': 'Em Rota', 'Em Rota': 'Entregue', 'Aguardando Montagem': 'Entregue' }
  const canRota = pedido?.entregador_id && pedido?.entregador_nome
  const proximoStatus = FLOW[pedido?.status]
  const isGerente = effectiveRole === 'gerente'
  const isFinanceiro = ['diretor','admin'].includes(effectiveRole) || (effectiveRole === 'assistente_admin' && podeVerFinanceiro)
  const isLogistica = ['gerente_logistica','admin','diretor'].includes(effectiveRole)
  const isSeparador = effectiveRole === 'separador'
  const todayStr = new Date().toISOString().slice(0, 10)

  const avancar = async () => {
    if (!proximoStatus) return
    if (pedido.status === 'Pronto para Rota' && !canRota) {
      toast.error('Defina um entregador antes de enviar para rota.')
      return
    }
    try {
      await runAction(async () => {
        await pedidosService.update(pedidoId, { status: proximoStatus })
        await pedidosService.addHistorico(pedidoId, 'Status alterado', `Status alterado para ${proximoStatus}`, perfil)
        reload(); reloadHist()
      })
      toast.success(`Status: ${proximoStatus}`)
    } catch (e) { console.error('[Pedido] avancar:', e); toast.error('Erro: ' + e.message) }
  }

  const handleTroca = async (entId, entNome, motivo) => {
    const anterior = pedido?.entregador_nome || 'nenhum'
    try {
      await runAction(async () => {
        await pedidosService.update(pedidoId, { entregador_id: entId, entregador_nome: entNome })
        await pedidosService.addHistorico(pedidoId, 'Status alterado',
          `Entregador alterado de ${anterior} para ${entNome}. Motivo: ${motivo || 'Não informado'}`, perfil)
        reload(); reloadHist(); setShowTroca(false)
      })
      toast.success('Entregador atualizado!')
    } catch (e) { console.error('[Pedido] handleTroca:', e); toast.error('Erro: ' + e.message) }
  }

  const handleEdit = async (dados) => {
    const prevStatusFluxo = pedido?.status_fluxo
    const wasCorrigir = corrigirMode
    try {
      const { produtos: _p, ...pedidoData } = dados
      await runAction(async () => {
        await pedidosService.update(pedidoId, pedidoData)
        if (wasCorrigir && prevStatusFluxo) {
          await pedidosService.corrigirEReenviar(pedidoId, perfil, {
            statusFluxoAtual: prevStatusFluxo,
            numeroPedido: pedido.numero_pedido,
            loja: pedido.local_separacao,
            vendedorId: pedido.vendedor_id,
          })
          reloadTimeline()
        }
        reload(); reloadHist(); setShowEdit(false); setCorrigirMode(false)
      })
      toast.success(wasCorrigir ? 'Pedido corrigido e reenviado!' : 'Pedido atualizado!')
    } catch (e) { console.error('[Pedido] handleEdit:', e); toast.error('Erro ao salvar: ' + e.message) }
  }

  const adicionarFollowUp = async () => {
    if (!textoFollowUp.trim() && filesFollowUp.length === 0) return
    setLoadingFollowUp(true)
    try {
      await pedidosService.adicionarFollowUp(pedidoId, perfil, {
        texto: textoFollowUp,
        arquivos: filesFollowUp,
        vendedorId: pedido?.vendedor_id,
      })
      setTextoFollowUp('')
      setFilesFollowUp([])
      reloadTimeline()
      toast.success('Follow-up adicionado!')
    } catch (e) { toast.error('Erro: ' + e.message) }
    finally { setLoadingFollowUp(false) }
  }

  const handleAprovarGerente = async () => {
    try {
      await runAction(() => pedidosService.aprovarGerente(pedidoId, perfil, { loja: pedido.local_separacao, numeroPedido: pedido.numero_pedido }))
      reload(); reloadTimeline()
      toast.success('Pedido aprovado!')
    } catch (e) { toast.error(e.message) }
  }

  const handleRejeitarGerente = async () => {
    if (!motivoRejeicao.trim()) return
    try {
      await runAction(() => pedidosService.rejeitarGerente(pedidoId, perfil, { motivo: motivoRejeicao, numeroPedido: pedido.numero_pedido, vendedorId: pedido.vendedor_id }))
      setShowRejeitar(false); setMotivoRejeicao(''); reload(); reloadTimeline()
      toast.success('Pedido rejeitado.')
    } catch (e) { toast.error(e.message) }
  }

  const handleAprovarFinanceiro = async () => {
    const link = `${window.location.origin}/#/confirmar-compra/${pedidoId}`
    try {
      await runAction(() => pedidosService.aprovarFinanceiro(pedidoId, perfil, { loja: pedido.local_separacao, numeroPedido: pedido.numero_pedido, telefonesFabrica: [], linkConfirmacao: link }))
      reload(); reloadTimeline()
      toast.success('Aprovado financeiramente!')
    } catch (e) { toast.error(e.message) }
  }

  const handleRejeitarFinanceiro = async () => {
    if (!motivoRejeicao.trim()) return
    try {
      await runAction(() => pedidosService.rejeitarFinanceiro(pedidoId, perfil, { motivo: motivoRejeicao, numeroPedido: pedido.numero_pedido, vendedorId: pedido.vendedor_id, loja: pedido.local_separacao }))
      setShowRejeitar(false); setMotivoRejeicao(''); reload(); reloadTimeline()
      toast.success('Pedido rejeitado.')
    } catch (e) { toast.error(e.message) }
  }

  const handleAgendarEntrega = async () => {
    if (!dataAgendamento) { toast.error('Selecione uma data.'); return }
    try {
      await runAction(() => pedidosService.agendarEntrega(pedidoId, perfil, { dataEntrega: dataAgendamento, telefoneCliente: pedido.telefone, nomeCliente: pedido.cliente, numeroPedido: pedido.numero_pedido, vendedorId: pedido.vendedor_id }))
      reload(); reloadTimeline()
      toast.success('Entrega agendada!')
    } catch (e) { toast.error(e.message) }
  }

  const handleIniciarSeparacao = async () => {
    try {
      await runAction(() => pedidosService.registrarSeparacao(pedidoId, perfil, { fotos: [], numeroPedido: pedido.numero_pedido, loja: pedido.local_separacao }))
      reload(); reloadTimeline()
      toast.success('Separação iniciada!')
    } catch (e) { toast.error(e.message) }
  }

  const handleRemarcar = async ({ novaData, motivo }) => {
    try {
      await runAction(async () => {
        await pedidosService.update(pedidoId, { status: 'Remarcado', data_entrega: novaData })
        await pedidosService.addHistorico(pedidoId, 'Remarcado',
          `Entrega remarcada para ${new Date(novaData + 'T12:00').toLocaleDateString('pt-BR')}. Motivo: ${motivo || 'Não informado'}`, perfil)
        reload(); reloadHist(); setShowRemarcar(false)
      })
      toast.success('Entrega remarcada!')
    } catch (e) { console.error('[Pedido] handleRemarcar:', e); toast.error('Erro: ' + e.message) }
  }

  const handleCancelar = async (motivo) => {
    try {
      await runAction(async () => {
        await pedidosService.update(pedidoId, { status: 'Cancelado' })
        await pedidosService.addHistorico(pedidoId, 'Cancelado',
          `Pedido cancelado. Motivo: ${motivo || 'Não informado'}`, perfil)
        reload(); reloadHist(); setShowCancelar(false)
      })
      toast.success('Pedido cancelado.')
    } catch (e) { console.error('[Pedido] handleCancelar:', e); toast.error('Erro: ' + e.message) }
  }

  const handleExcluir = async () => {
    try {
      await runAction(async () => {
        await produtosService.removeByPedido(pedidoId)
        await pedidosService.remove(pedidoId)
      })
      toast.success('Pedido excluído com sucesso.')
      onBack()
    } catch (e) { console.error('[Pedido] handleExcluir:', e); toast.error('Erro ao excluir: ' + e.message) }
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
          {isGestor && pedido?.status === 'Entregue' && <Btn variant="secondary" size="sm" onClick={() => setShowDevolucao(true)}>↩ Devolução</Btn>}
          {isGestor && <Btn variant="secondary" size="sm" onClick={() => setShowEdit(true)}><Ic n="edit" s={13} /></Btn>}
          {isGestor && <Btn size="sm" style={{ background: 'var(--red)', color: '#fff' }} onClick={() => setShowExcluir(true)}><Ic n="x" s={13} /> Excluir</Btn>}
        </div>
      </div>
      {showExcluir && (
        <Modal title="Excluir Pedido" onClose={() => setShowExcluir(false)}
          footer={<><Btn variant="ghost" onClick={() => setShowExcluir(false)}>Cancelar</Btn><Btn style={{ background: 'var(--red)', color: '#fff' }} loading={actionLoading} onClick={handleExcluir}>Excluir definitivamente</Btn></>}>
          <Alert type="error">Tem certeza? Esta ação não pode ser desfeita. Todos os produtos vinculados também serão excluídos.</Alert>
          <div style={{ marginTop: 10, fontWeight: 500 }}>Pedido #{pedido?.numero_pedido} — {pedido?.cliente}</div>
        </Modal>
      )}
      {showDevolucao && (
        <ModalDevolucao pedido={pedido} onClose={() => setShowDevolucao(false)} onConfirm={async (devForm) => {
          try {
            await runAction(async () => {
              await devolucoesService.create({ pedido_id: pedido.id, cliente_nome: pedido.cliente, loja: pedido.local_separacao, registrado_por: perfil?.full_name, ...devForm })
              await pedidosService.update(pedido.id, { status: 'Devolvido' })
              await pedidosService.addHistorico(pedido.id, 'Devolvido', `Devolução registrada. Motivo: ${devForm.motivo}`, perfil)
              reload(); reloadHist(); setShowDevolucao(false)
            })
            toast.success('Devolução registrada')
          } catch (e) { toast.error(e.message) }
        }} />
      )}

      <Badge status={pedido.status} style={{ marginBottom: 8 }} />
      <h1 style={{ fontSize: 20, marginBottom: 2 }}>{pedido.cliente}</h1>
      <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 4 }}>Pedido #{pedido.numero_pedido}</div>
      {d && <div style={{ fontSize: 13, color: d.color, marginBottom: 4 }}>📅 Entrega: {d.text}</div>}
      {pedido.local_separacao && <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 16 }}>🏪 {pedido.local_separacao}</div>}

      {['rejeitado_gerente', 'rejeitado_financeiro'].includes(pedido.status_fluxo) && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid var(--red)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, color: 'var(--red)', marginBottom: 4 }}>
            {pedido.status_fluxo === 'rejeitado_gerente' ? '❌ Rejeitado pelo gerente' : '❌ Rejeitado pelo financeiro'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 10 }}>
            {pedido.rejeitado_gerente_motivo || pedido.rejeitado_financeiro_motivo || 'Sem motivo informado'}
          </div>
          {isGestor && (
            <Btn size="sm" onClick={() => { setCorrigirMode(true); setShowEdit(true) }}>✏️ Corrigir e Reenviar</Btn>
          )}
        </div>
      )}

      {isGerente && pedido.status_fluxo === 'aguardando_gerente' && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <Btn style={{ flex: 1, justifyContent: 'center', background: 'var(--green)', color: '#fff', borderColor: 'var(--green)' }} loading={actionLoading} onClick={handleAprovarGerente}>✅ Aprovar</Btn>
          <Btn variant="secondary" style={{ flex: 1, justifyContent: 'center', color: 'var(--red)' }} onClick={() => { setTipoRejeicao('gerente'); setShowRejeitar(true) }}>❌ Rejeitar</Btn>
        </div>
      )}

      {isFinanceiro && pedido.status_fluxo === 'aguardando_financeiro' && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <Btn style={{ flex: 1, justifyContent: 'center', background: 'var(--green)', color: '#fff', borderColor: 'var(--green)' }} loading={actionLoading} onClick={handleAprovarFinanceiro}>✅ Aprovar Financeiro</Btn>
          <Btn variant="secondary" style={{ flex: 1, justifyContent: 'center', color: 'var(--red)' }} onClick={() => { setTipoRejeicao('financeiro'); setShowRejeitar(true) }}>❌ Rejeitar</Btn>
        </div>
      )}

      {isLogistica && pedido.status_fluxo === 'aprovado_entrega' && !pedido.data_entrega_agendada && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Agendar Entrega</div>
          <input type="date" className="fi" value={dataAgendamento} min={todayStr} onChange={e => setDataAgendamento(e.target.value)} />
          <Btn style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} loading={actionLoading} onClick={handleAgendarEntrega}>📅 Confirmar Agendamento</Btn>
        </div>
      )}

      {isSeparador && pedido.status_fluxo === 'aprovado_entrega' && pedido.data_entrega_agendada === todayStr && (
        <Btn style={{ width: '100%', justifyContent: 'center', marginBottom: 16, background: 'var(--amber)', color: '#fff', borderColor: 'var(--amber)' }} loading={actionLoading} onClick={handleIniciarSeparacao}>📋 Iniciar Separação</Btn>
      )}

      {showRejeitar && (
        <Modal title={tipoRejeicao === 'gerente' ? 'Rejeitar Pedido' : 'Rejeitar — Financeiro'} onClose={() => { setShowRejeitar(false); setMotivoRejeicao('') }}
          footer={<><Btn variant="ghost" onClick={() => { setShowRejeitar(false); setMotivoRejeicao('') }}>Cancelar</Btn><Btn style={{ background: 'var(--red)', color: '#fff', borderColor: 'var(--red)' }} disabled={!motivoRejeicao.trim()} loading={actionLoading} onClick={tipoRejeicao === 'gerente' ? handleRejeitarGerente : handleRejeitarFinanceiro}>Rejeitar</Btn></>}>
          <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 10 }}>Informe o motivo. O vendedor será notificado.</div>
          <textarea className="fi" rows={3} value={motivoRejeicao} onChange={e => setMotivoRejeicao(e.target.value)} placeholder="Ex: prazo inviável, margem insuficiente..." />
        </Modal>
      )}

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

        {pedido.vendedor_nome && (
          <div className="card-sm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 14 }}>👤</span>
              <div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>Vendedor</div>
                <div style={{ fontSize: 13 }}>{pedido.vendedor_nome}</div>
              </div>
            </div>
            {pedido.vendedor_id && pedido.vendedor_id !== perfil?.id && (
              <Btn variant="secondary" size="sm" onClick={() => openChatWith(pedido.vendedor_id, `Sobre o pedido #${pedido.numero_pedido}: `)}>
                💬 Mensagem
              </Btn>
            )}
          </div>
        )}
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

      {(timeline || []).length > 0 && (
        <div style={{ marginTop: 24, marginBottom: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Linha do tempo</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {(timeline || []).map((item, i) => {
              const icon = TIMELINE_ICONS[item.tipo] || '🔹'
              const color = TIMELINE_COLORS[item.tipo] || 'var(--accent)'
              return (
                <div key={item.id} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--adim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, border: `2px solid ${color}`, zIndex: 1 }}>
                      {icon}
                    </div>
                    {i < (timeline || []).length - 1 && <div style={{ width: 2, flex: 1, background: 'var(--border)', minHeight: 20 }} />}
                  </div>
                  <div style={{ paddingBottom: 16, flex: 1, paddingTop: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{item.descricao}</div>
                    <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>
                      {item.usuario_nome && `${item.usuario_nome} · `}
                      {new Date(item.created_at).toLocaleString('pt-BR')}
                    </div>
                    {(item.anexos || []).length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                        {(item.anexos || []).map((url, ai) => {
                          const isPdf = typeof url === 'string' && url.toLowerCase().includes('.pdf')
                          return isPdf ? (
                            <a key={ai} href={url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--accent)', background: 'var(--adim)', padding: '4px 8px', borderRadius: 6, textDecoration: 'none' }}>
                              📎 PDF
                            </a>
                          ) : (
                            <a key={ai} href={url} target="_blank" rel="noreferrer">
                              <img src={url} alt="anexo" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, cursor: 'pointer' }} />
                            </a>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, background: 'var(--adim)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 10 }}>Follow-up</div>
        <textarea
          value={textoFollowUp}
          onChange={e => setTextoFollowUp(e.target.value)}
          placeholder="Adicione uma observação, acompanhamento ou atualização..."
          rows={3}
          style={{ width: '100%', resize: 'vertical', background: 'var(--background)', color: 'var(--t1)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
        {filesFollowUp.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {filesFollowUp.map((f, fi) => (
              <div key={fi} style={{ fontSize: 11, background: 'var(--background)', padding: '3px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                📎 {f.name}
                <button onClick={() => setFilesFollowUp(prev => prev.filter((_, idx) => idx !== fi))} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12, lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input type="file" ref={followUpFileRef} multiple accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => { setFilesFollowUp(prev => [...prev, ...Array.from(e.target.files || [])]); e.target.value = '' }} />
          <Btn variant="secondary" size="sm" onClick={() => followUpFileRef.current?.click()}>📎 Anexar</Btn>
          <Btn size="sm" loading={loadingFollowUp} disabled={loadingFollowUp || (!textoFollowUp.trim() && filesFollowUp.length === 0)} onClick={adicionarFollowUp}>Adicionar Follow-up</Btn>
        </div>
      </div>

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
    observacoes: '', local_separacao: '', status: 'Pendente', requer_montagem: false,
    ...inicial,
  })
  const [produtos, setProdutos] = useState(
    inicial?.produtos?.length ? inicial.produtos : [{ nome_produto: '', quantidade: 1, acabamento: '', medida: '', observacao: '' }]
  )
  const [errors, setErrors] = useState({})
  const { run, loading } = useAction()

  const up = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))
  const addProd = () => setProdutos(p => [...p, { nome_produto: '', quantidade: 1, acabamento: '', medida: '', observacao: '' }])
  const remProd = (i) => setProdutos(p => p.filter((_, idx) => idx !== i))
  const upProd = (i, k, v) => setProdutos(p => p.map((pr, idx) => idx === i ? { ...pr, [k]: v } : pr))

  const validate = () => {
    const errs = {}
    if (!form.cliente) errs.cliente = 'Obrigatório'
    if (!form.endereco) errs.endereco = 'Obrigatório'
    if (!form.data_entrega) errs.data_entrega = 'Obrigatório'
    if (!produtos.some(p => p.nome_produto.trim())) errs.produtos = 'Adicione ao menos um produto'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    try {
      await run(() => onSave({ ...form, produtos: produtos.filter(p => p.nome_produto.trim()) }))
    } catch {
      // error shown via toast in parent handleCreate
    }
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
          <LojaSelect value={form.local_separacao} onChange={v => setForm(p => ({ ...p, local_separacao: v }))} />
        </div>
      </div>
      <div className="fg">
        <label className="fl">Observações</label>
        <textarea className="fi" rows={2} value={form.observacoes} onChange={up('observacoes')} />
      </div>
      <div className="fg">
        <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13 }}>
          <input type="checkbox" checked={!!form.requer_montagem} onChange={e => setForm(p => ({ ...p, requer_montagem: e.target.checked }))} style={{ width:16, height:16, accentColor:'var(--accent)', flexShrink:0 }} />
          <span>Requer montagem após entrega</span>
        </label>
      </div>
      <div style={{ marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Produtos *</div>
          <Btn variant="secondary" size="sm" onClick={addProd}><Ic n="plus" s={12} /> Adicionar</Btn>
        </div>
        {errors.produtos && <div className="field-error" style={{ marginBottom: 8 }}>{errors.produtos}</div>}
        {produtos.map((pr, i) => (
          <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>#{i+1}</span>
              {produtos.length > 1 && <button className="btn btn-g btn-ico btn-sm" style={{ color: 'var(--red)' }} onClick={() => remProd(i)}><Ic n="trash" s={11} /></button>}
            </div>
            <div className="fg" style={{ marginBottom: 6 }}>
              <input className="fi" placeholder="Nome do produto *" value={pr.nome_produto} onChange={e => upProd(i, 'nome_produto', e.target.value)} />
            </div>
            <div className="grid2" style={{ gap: 6 }}>
              <div className="fg" style={{ marginBottom: 0 }}><label className="fl">Qtd</label><input className="fi" type="number" min="1" value={pr.quantidade} onChange={e => upProd(i, 'quantidade', parseInt(e.target.value)||1)} /></div>
              <div className="fg" style={{ marginBottom: 0 }}><label className="fl">Medida</label><input className="fi" value={pr.medida} onChange={e => upProd(i, 'medida', e.target.value)} placeholder="Ex: 1.80x0.90" /></div>
              <div className="fg" style={{ marginBottom: 0 }}><label className="fl">Acabamento</label><input className="fi" value={pr.acabamento} onChange={e => upProd(i, 'acabamento', e.target.value)} /></div>
              <div className="fg" style={{ marginBottom: 0 }}><label className="fl">Obs.</label><input className="fi" value={pr.observacao} onChange={e => upProd(i, 'observacao', e.target.value)} /></div>
            </div>
          </div>
        ))}
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
const MESES_PT = { janeiro:1,fevereiro:2,'março':3,abril:4,maio:5,junho:6,julho:7,agosto:8,setembro:9,outubro:10,novembro:11,dezembro:12,marco:3,mar:3,abr:4,mai:5,jun:6,jul:7,ago:8,set:9,out:10,nov:11,dez:12,jan:1,fev:2 }

async function parseFichaPDF(file) {
  try {
    console.log('PARSE INICIADO:', file.name)
    const buf = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise

    // Coletar itens de TODAS as páginas; detectar zona de produtos por página
    // antes de aplicar offset — assim marcadores e produtos usam o mesmo Y local
    const allItems = []
    const zonaProdutos = []
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const content = await page.getTextContent()
      const yOffset = (pageNum - 1) * 1000
      const pageItems = content.items
        .map(i => ({
          text: i.str.trim(),
          x: Math.round(i.transform[4]),
          y: Math.round(i.transform[5]),
        }))
        .filter(i => i.text.length > 0)
      // Zona de produtos desta página (Y sem offset para comparação correta)
      const pgDP = pageItems.find(i => /DADOS\s*DOS\s*PRODUTOS/i.test(i.text))
      const pgDA = pageItems.find(i => /DADOS\s*ADICIONAIS/i.test(i.text))
      const yP = pgDP ? pgDP.y : -1
      const yA = pgDA ? pgDA.y : 0
      if (yP > 0) {
        pageItems
          .filter(i => i.y < yP && i.y > yA && i.text.length > 0)
          .forEach(i => zonaProdutos.push({ text: i.text, x: i.x, y: i.y + yOffset }))
      }
      pageItems.forEach(i => allItems.push({ text: i.text, x: i.x, y: i.y + yOffset }))
    }
    allItems.sort((a, b) => b.y - a.y || a.x - b.x)
    console.log('TOTAL ITEMS:', allItems.length)
    allItems.slice(0, 30).forEach(i => console.log(i.x, i.y, i.text))

    const fullText = allItems.map(i => i.text).join(' ')

    // ── getNextValue: label → próximo item que não é outro label ──
    const LABEL_KEYS = ['NOME','CNPJ','CPF','DATA','ENDERE','BAIRRO','MUNIC','ESTADO','CEP','E-MAIL','TELEFONE','FONE','TEL']
    function getNextValue(label) {
      const idx = allItems.findIndex(i => i.text.toUpperCase().includes(label.toUpperCase()))
      if (idx < 0) return ''
      for (let j = idx + 1; j < Math.min(idx + 15, allItems.length); j++) {
        const t = allItems[j].text
        if (t && !LABEL_KEYS.some(l => t.toUpperCase().startsWith(l))) return t
      }
      return ''
    }

    // ── parseDataPorExtenso → "YYYY-MM-DD" para o banco ──
    function parseDataPorExtenso(texto) {
      if (!texto) return ''
      const MESES = { janeiro:'01',fevereiro:'02',março:'03',marco:'03',abril:'04',maio:'05',junho:'06',julho:'07',agosto:'08',setembro:'09',outubro:'10',novembro:'11',dezembro:'12' }
      const m = texto.toLowerCase().match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/)
      if (m) {
        const mesKey = m[2].normalize('NFD').replace(/[̀-ͯ]/g,'')
        const mes = MESES[mesKey] || MESES[m[2]] || '01'
        return `${m[3]}-${mes}-${m[1].padStart(2,'0')}`
      }
      const m2 = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/)
      if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}`
      return ''
    }

    // ── Número do pedido ──
    let numero_pedido = ''
    const numItem = allItems.find(i => /N[°º]\s*\d+/.test(i.text))
    if (numItem) { const m = numItem.text.match(/N[°º]\s*(\d+)/); if (m) numero_pedido = m[1] }
    if (!numero_pedido) { const m = fullText.match(/Documento\s*N[°º]\s*(\d+)/i); if (m) numero_pedido = m[1] }
    if (!numero_pedido) { const m = fullText.match(/N[°ºo\.]*\s*(?:do\s*)?[Pp]edido[:\s]+(\d+)/i); if (m) numero_pedido = m[1] }

    // ── Loja emitente ──
    let loja = ''
    const lojaM = fullText.match(/RECEBEMOS DE (.+?) O[S]? PRODUTO/i)
    if (lojaM) loja = lojaM[1].trim()
    if (!loja) {
      for (const it of allItems.slice(0, 20)) {
        if (it.text.length >= 4 && /^[A-ZÁÉÍÓÚÃÕÇ\s&.\-–]{4,}$/.test(it.text)
          && !/^(VERSA|FICHA|ENTREGA|DOCUMENTO|PEDIDO|DATA|RAZ|NOTA|HTTP|WWW|FORMULÁRIO)/.test(it.text.toUpperCase())) {
          loja = it.text; break
        }
      }
    }

    // ── Campos do destinatário ──
    const cliente  = getNextValue('NOME RAZÃO SOCIAL') || getNextValue('CLIENTE')
    const rua      = getNextValue('ENDEREÇO') || getNextValue('ENDERECO')
    const bairro   = getNextValue('BAIRRO')
    const cidade   = getNextValue('MUNICÍPIO') || getNextValue('MUNICIPIO') || 'Belo Horizonte'
    const estado   = getNextValue('ESTADO') || 'MG'
    const cep      = getNextValue('CEP')
    const telefone = getNextValue('TELEFONE') || getNextValue('FONE') || getNextValue('TEL')
    const email    = getNextValue('E-MAIL') || getNextValue('EMAIL')

    // ── Data de entrega ──
    let data_entrega = parseDataPorExtenso(getNextValue('DATA'))
    if (!data_entrega) {
      const m = fullText.match(/(\d{1,2})\s+de\s+([A-Za-záéíóúãõçê]+)\s+de\s+(\d{4})/i)
      if (m) {
        const MESES2 = { janeiro:'01',fevereiro:'02',março:'03',marco:'03',abril:'04',maio:'05',junho:'06',julho:'07',agosto:'08',setembro:'09',outubro:'10',novembro:'11',dezembro:'12' }
        const mk = m[2].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
        const mes = MESES2[mk] || MESES2[m[2].toLowerCase()] || '01'
        data_entrega = `${m[3]}-${mes}-${m[1].padStart(2,'0')}`
      } else {
        const m2 = fullText.match(/(\d{2})\/(\d{2})\/(\d{4})/)
        if (m2) data_entrega = `${m2[3]}-${m2[2]}-${m2[1]}`
      }
    }

    // ── DADOS ADICIONAIS: endereço de entrega e observação ──
    const idxAdicInicio = allItems.findIndex(i => /DADOS\s*ADICIONAIS/i.test(i.text))

    // Endereço: pegar exatamente 2 linhas após "ENDEREÇO DE ENTREGA"
    let enderecoEntrega = ''
    const IGNORAR_END = ['OBSERVAÇÃO','OBSERVACAO','SR(A)','GORJETA','DOCUMENTO','ESTE DOCUMENTO','FORMULÁRIO','IDENTIFICAÇÃO','ASSINATURA','RECEBEDOR','ENTREGADORES','DATA DE']
    const idxEndEnt = allItems.findIndex(i => i.text.toUpperCase().includes('ENDEREÇO DE ENTREGA') || i.text.toUpperCase().includes('ENDERECO DE ENTREGA'))
    if (idxEndEnt >= 0) {
      const linhasEnd = []
      for (let j = idxEndEnt + 1; j < allItems.length && linhasEnd.length < 2; j++) {
        const t = allItems[j].text
        if (t.length > 3 && !IGNORAR_END.some(ig => t.toUpperCase().includes(ig))) linhasEnd.push(t)
      }
      enderecoEntrega = linhasEnd.join(', ')
    }

    // Observação do cliente (ignora texto de rodapé)
    const RODAPE = ['gorjeta','entregadores','cobrança','cobran','sr(a) cliente','não dê','nao de']
    let observacoes = ''
    const idxObs = allItems.findIndex(i => /OBSERVA[ÇC][ÃA]O\s*DO\s*CLIENTE/i.test(i.text))
    if (idxObs >= 0) {
      for (let j = idxObs + 1; j < Math.min(idxObs + 6, allItems.length); j++) {
        const t = allItems[j].text
        if (/OBSERVA|ENDERE|DADOS|ASSIN/i.test(t)) break
        if (t.length > 1 && !RODAPE.some(r => t.toLowerCase().includes(r))) { observacoes = t; break }
      }
    }

    const enderecoCompleto = enderecoEntrega || [rua, bairro].filter(Boolean).join(', ').replace(/,\s*,/g, ',').trim()

    console.log('=== ZONA PRODUTOS === total:', zonaProdutos.length)

    // Agrupar itens por linha Y (tolerância ±6px — cobre pequenas variações de renderização), ordenar por X
    function agruparPorLinha(items, tolerancia = 6) {
      const linhas = [], usados = new Set()
      const sorted = [...items].sort((a, b) => b.y - a.y)
      for (const item of sorted) {
        if (usados.has(item)) continue
        const linha = items.filter(i => !usados.has(i) && Math.abs(i.y - item.y) <= tolerancia).sort((a, b) => a.x - b.x)
        linha.forEach(i => usados.add(i))
        if (linha.length > 0) linhas.push(linha)
      }
      return linhas
    }

    // Colunas fixas por X (medido com pdfplumber):
    // PRODUTO: x < 130 | ACABAMENTO+MEDIDA: x < 320 | QTDE: x 430-460
    const linhasProdutos = agruparPorLinha(zonaProdutos)
    const idxCabecalho = linhasProdutos.findIndex(l =>
      l.some(i => i.text.toUpperCase() === 'PRODUTO') && l.some(i => i.text.toUpperCase() === 'ACABAMENTO')
    )
    const linhasDados = idxCabecalho >= 0 ? linhasProdutos.slice(idxCabecalho + 1) : linhasProdutos
    const produtos = []
    for (const linha of linhasDados) {
      if (linha.length === 0) continue
      const colProduto = linha.filter(i => i.x < 130).map(i => i.text).join(' ').trim()
      // Usar Y médio da linha como referência (mais robusto que linha[0].y)
      const linhaY = Math.round(linha.reduce((s, i) => s + i.y, 0) / linha.length)
      const colQtde = linha.find(i => i.x >= 430 && i.x <= 460 && /^\d+$/.test(i.text))
        ?? zonaProdutos
          .filter(i => i.x >= 430 && i.x <= 460 && /^\d+$/.test(i.text) && Math.abs(i.y - linhaY) <= 8)
          .sort((a, b) => Math.abs(a.y - linhaY) - Math.abs(b.y - linhaY))[0]
      if (!colProduto || colProduto.length < 2) continue
      if (colProduto.includes('R$') || colProduto.toLowerCase().includes('http')) continue
      const CABECALHOS = ['PRODUTO','ACABAMENTO','MEDIDA','TECIDO','LOCAL','VOLUME','QTDE.','QTDE','VALOR','TOTAL']
      const nomeParts = linha
        .filter(i => i.x < 320 && !i.text.includes('R$') && !CABECALHOS.includes(i.text.toUpperCase()))
        .sort((a, b) => a.x - b.x)
        .map(i => i.text)
        .filter(t => t.length > 0)
      const nome = nomeParts.join(' - ').trim()
      const qtd = colQtde ? parseInt(colQtde.text) : 1
      if (nome.length > 2) produtos.push({ nome_produto: nome, quantidade: qtd, acabamento: '', medida: '', observacao: '' })
    }

    // ── Validações ──
    const _warnings = []
    if (!numero_pedido)    _warnings.push('Pedido não encontrado')
    if (!cliente)          _warnings.push('Cliente não encontrado')
    if (!data_entrega)     _warnings.push('Data não identificada')
    if (!enderecoCompleto) _warnings.push('Endereço não encontrado')
    if (!produtos.length)  _warnings.push('Nenhum produto detectado')

    return {
      numero_pedido,
      cliente: cliente || file.name.replace(/\.pdf$/i, ''),
      loja, local_separacao: loja,
      endereco: enderecoCompleto,
      cidade, cep, telefone, email,
      data_entrega: data_entrega || new Date().toISOString().split('T')[0],
      status: 'Pendente', prioridade: 'Normal', observacoes,
      produtos,
      selected: !(!numero_pedido && !cliente),
      erro: (!numero_pedido && !cliente) ? 'Dados insuficientes no PDF' : null,
      _warnings,
    }
  } catch (e) {
    console.error('[PDF]', e)
    return {
      numero_pedido: '', cliente: file.name.replace(/\.pdf$/i,''), loja: '', local_separacao: '',
      endereco: '', cidade: 'Belo Horizonte', cep: '', telefone: '', email: '',
      data_entrega: new Date().toISOString().split('T')[0],
      status: 'Pendente', prioridade: 'Normal', observacoes: '',
      produtos: [], selected: false,
      erro: `Erro ao ler PDF: ${e.message}`, _warnings: [],
    }
  }
}

function EditParsedItemModal({ item, onSave, onClose }) {
  const [form, setForm] = useState({
    cliente: item.cliente || '', numero_pedido: item.numero_pedido || '',
    loja: item.loja || '', data_entrega: item.data_entrega || '',
    endereco: item.endereco || '', telefone: item.telefone || '',
    prioridade: item.prioridade || 'Normal', observacoes: item.observacoes || '',
  })
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  return (
    <Modal
      title={`Editar — ${item._filename || item.cliente || 'PDF'}`}
      onClose={onClose}
      footer={<><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn disabled={!form.cliente.trim()} onClick={() => onSave(form)}><Ic n="save" s={13} /> Salvar</Btn></>}
    >
      <div className="grid2">
        <div className="fg"><label className="fl">Cliente *</label><input className="fi" value={form.cliente} onChange={up('cliente')} /></div>
        <div className="fg"><label className="fl">Nº Pedido</label><input className="fi" value={form.numero_pedido} onChange={up('numero_pedido')} /></div>
      </div>
      <div className="grid2">
        <div className="fg"><label className="fl">Loja</label><LojaSelect value={form.loja} onChange={v => setForm(p => ({ ...p, loja: v }))} /></div>
        <div className="fg"><label className="fl">Data Entrega</label><input className="fi" type="date" value={form.data_entrega} onChange={up('data_entrega')} /></div>
      </div>
      <div className="fg"><label className="fl">Endereço</label><input className="fi" value={form.endereco} onChange={up('endereco')} /></div>
      <div className="grid2">
        <div className="fg"><label className="fl">Telefone</label><input className="fi" value={form.telefone} onChange={up('telefone')} type="tel" /></div>
        <div className="fg"><label className="fl">Prioridade</label>
          <select className="fi" value={form.prioridade} onChange={up('prioridade')}>
            <option>Normal</option><option>Alta</option><option>Urgente</option>
          </select>
        </div>
      </div>
      <div className="fg"><label className="fl">Observações</label><input className="fi" value={form.observacoes} onChange={up('observacoes')} /></div>
      <div style={{ marginTop: 8, padding: '7px 10px', background: 'var(--bg2)', borderRadius: 6, fontSize: 12, color: 'var(--t2)' }}>
        {item.produtos?.length || 0} produto(s) detectado(s) nesta ficha
      </div>
    </Modal>
  )
}

function ImportarLoteModal({ onClose, onImport }) {
  const [step, setStep] = useState(0)
  const [files, setFiles] = useState([])
  const [items, setItems] = useState([])
  const [prog, setProg] = useState(0)
  const [editIdx, setEditIdx] = useState(null)
  const { run, loading } = useAction()

  const processar = async () => {
    try {
      await run(async () => {
        const result = []
        for (let i = 0; i < files.length; i++) {
          setProg(Math.round(((i + 1) / files.length) * 100))
          const parsed = await parseFichaPDF(files[i])
          parsed._filename = files[i].name
          result.push(parsed)
        }
        setItems(result)
        setStep(1)
        const erros = result.filter(r => r.erro).length
        const avisos = result.filter(r => !r.erro && r._warnings?.length).length
        toast.info(`${result.length} ficha(s) processada(s).${erros ? ` ${erros} com erro.` : ''}${avisos ? ` ${avisos} com aviso.` : ''} Revise e confirme.`)
      })
    } catch (e) {
      console.error('[ImportarLote] processar:', e)
      toast.error('Erro ao processar PDFs: ' + (e.message || 'desconhecido'))
    }
  }

  const toggle  = (i) => setItems(prev => prev.map((p, idx) => idx === i ? { ...p, selected: !p.selected } : p))
  const updAll  = (i, data) => setItems(prev => prev.map((p, idx) => idx === i ? { ...p, ...data } : p))
  const selecionados = items.filter(p => p.selected && !p.erro)
  const isPassado = (d) => d && new Date(d + 'T12:00') < new Date(new Date().toDateString())

  const confirmar = async () => {
    try {
      await run(async () => { await onImport(selecionados); setStep(2) })
    } catch (e) {
      console.error('[ImportarLote] confirmar:', e)
      toast.error('Erro na importação: ' + (e.message || 'desconhecido'))
    }
  }

  return (
    <Modal
      title="Importar Fichas em Lote"
      subtitle={step === 0 ? 'Selecione os PDFs' : step === 1 ? `${items.length} ficha(s) — ${selecionados.length} selecionada(s)` : 'Concluído'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          {step === 0 && (<><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn disabled={files.length === 0} loading={loading} onClick={processar}>Processar {files.length} ficha(s)</Btn></>)}
          {step === 1 && (<><Btn variant="secondary" onClick={() => setStep(0)}>← Voltar</Btn><Btn disabled={selecionados.length === 0} loading={loading} onClick={confirmar}>✓ Importar {selecionados.length}</Btn></>)}
          {step === 2 && <Btn onClick={onClose}>Fechar</Btn>}
        </>
      }
    >
      {step === 0 && (
        <div>
          <label className="upload-zone" style={{ display: 'block' }}>
            <input type="file" multiple accept=".pdf" style={{ display: 'none' }} onChange={e => setFiles(Array.from(e.target.files))} />
            <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Toque para selecionar fichas PDF</div>
            <div style={{ fontSize: 12, color: 'var(--t2)' }}>Múltiplos arquivos PDF</div>
          </label>
          {files.length > 0 && (
            <div style={{ marginTop: 14 }}>
              {files.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--bg2)', borderRadius: 6, marginBottom: 5 }}>
                  <span style={{ fontSize: 14 }}>📄</span>
                  <span style={{ flex: 1, fontSize: 12 }}>{f.name}</span>
                  <button className="btn btn-g btn-ico btn-sm" style={{ color: 'var(--red)' }} onClick={() => setFiles(prev => prev.filter((_, fi) => fi !== i))}><Ic n="x" s={12} /></button>
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

      {step === 1 && (
        <div>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl" style={{ minWidth: 680, fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ width: 28 }}></th>
                  <th style={{ width: 24 }}>#</th>
                  <th>Cliente</th>
                  <th>Pedido</th>
                  <th>Loja</th>
                  <th>Data</th>
                  <th>Endereço</th>
                  <th>Tel</th>
                  <th style={{ textAlign: 'center' }}>Prod.</th>
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((p, i) => {
                  const hasWarn = !p.erro && p._warnings?.length > 0
                  return (
                    <tr key={i} style={{
                      background: p.erro ? 'var(--rdim)' : hasWarn ? 'rgba(245,158,11,.05)' : 'transparent',
                      opacity: (!p.selected || p.erro) ? 0.55 : 1,
                    }}>
                      <td><input type="checkbox" checked={!!p.selected && !p.erro} disabled={!!p.erro} onChange={() => toggle(i)} /></td>
                      <td style={{ color: 'var(--t3)', fontFamily: 'var(--mono)' }}>{i + 1}</td>
                      <td style={{ fontWeight: 500, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.erro ? <span style={{ color: 'var(--red)', fontSize: 11 }}>ERRO</span> : p.cliente}
                      </td>
                      <td style={{ fontFamily: 'var(--mono)' }}>
                        {p.numero_pedido ? `#${p.numero_pedido}` : <span style={{ color: 'var(--red)' }}>?</span>}
                      </td>
                      <td style={{ color: 'var(--t2)', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.loja || '—'}</td>
                      <td style={{ whiteSpace: 'nowrap', color: isPassado(p.data_entrega) ? 'var(--amber)' : 'inherit' }}>
                        {p.data_entrega ? p.data_entrega.split('-').reverse().join('/') : <span style={{ color: 'var(--amber)' }}>—</span>}
                      </td>
                      <td style={{ color: 'var(--t2)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.endereco || '—'}</td>
                      <td style={{ color: 'var(--t2)', whiteSpace: 'nowrap' }}>{p.telefone || '—'}</td>
                      <td style={{ textAlign: 'center', color: p.produtos?.length ? 'var(--green)' : 'var(--amber)', fontWeight: 600 }}>{p.produtos?.length || 0}</td>
                      <td>
                        <button className="btn btn-g btn-ico btn-sm" onClick={() => setEditIdx(i)} title="Editar"><Ic n="edit" s={13} /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {items.some(p => p._warnings?.length || p.erro) && (
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--t2)', padding: '6px 10px', background: 'var(--bg2)', borderRadius: 6 }}>
              Itens em vermelho = erro de leitura. Amarelo = dados incompletos. Clique em <Ic n="edit" s={11} /> para corrigir.
            </div>
          )}
          {editIdx !== null && (
            <EditParsedItemModal
              item={items[editIdx]}
              onClose={() => setEditIdx(null)}
              onSave={(dados) => { updAll(editIdx, { ...dados, erro: null, selected: true, _warnings: [] }); setEditIdx(null) }}
            />
          )}
        </div>
      )}

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
  const novasSolicitacoes = (assistencias || []).filter(a => a.status === 'solicitacao' || a.origem === 'formulario')

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
    try {
      const { itens, ...assistencia } = dados
      const nova = await assistenciasService.create(assistencia)
      if (itens?.length) {
        for (const item of itens) await assistenciasService.createItem({ ...item, assistencia_id: nova.id })
      }
      await reload()
      setShowNew(false)
      toast.success('Assistência criada com sucesso!')
    } catch (e) {
      console.error('[Assistencia] handleCreate:', e)
      toast.error('Erro ao criar assistência: ' + (e.message || e.details || 'desconhecido'))
    }
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
          .from('assistencias')
          .upsert(payload, { onConflict: 'pedido_ref,cliente', ignoreDuplicates: false })
          .select('id, cliente, pedido_ref')

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
          <Btn variant="ghost" size="sm" onClick={() => {
            const url = `${window.location.origin}${window.location.pathname}#/solicitar`
            const txt = encodeURIComponent(`Solicite assistência técnica aqui: ${url}`)
            window.open(`https://wa.me/?text=${txt}`, '_blank')
          }}>📲 WhatsApp</Btn>
          <Btn variant="secondary" size="sm" onClick={() => setShowImport(true)}><Ic n="save" s={13} /> Excel</Btn>
          <Btn size="sm" onClick={() => setShowNew(true)}><Ic n="plus" s={13} /> Nova</Btn>
        </div>
      </div>

      {novasSolicitacoes.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--accent)', background: 'var(--adim)', cursor: 'pointer' }}
          onClick={() => { setSf('Todos'); setBusca('') }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1.5s infinite' }} />
            <div style={{ fontWeight: 600 }}>Novas Solicitações</div>
            <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 12, fontSize: 11, fontWeight: 700, padding: '1px 8px' }}>{novasSolicitacoes.length}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 4 }}>Aguardando aprovação do supervisor</div>
        </div>
      )}

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
  const fornecedores = [...new Set((a.assistencia_itens || [])
    .map(i => i.fornecedor ? String(i.fornecedor).replace(/^\[\d+\]\s*/, '').trim() : null)
    .filter(Boolean))]
  return (
    <div className="li" style={{ borderLeft: `3px solid ${cor}`, background: bg }} onClick={onClick}>
      <div className="li-main">
        <div className="li-title" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span>{a.cliente}</span>
          {a.pedido_ref && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'var(--adim)', borderRadius: 4, padding: '1px 6px' }}>#{a.pedido_ref}</span>}
          {a.loja && <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 400 }}>{a.loja}</span>}
        </div>
        {fornecedores.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>
            {fornecedores.slice(0, 2).join(' · ')}{fornecedores.length > 2 ? ` +${fornecedores.length - 2}` : ''}
          </div>
        )}
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
    try {
      await run(() => assistenciasService.update(id, { status }))
      reload()
      toast.success(`Status atualizado: ${status}`)
    } catch (e) {
      console.error('[AssistenciaDetalhe] updateStatus:', e)
      toast.error('Erro ao atualizar status: ' + e.message)
    }
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
                    const MAPA = { 2: 'pedido_ref', 3: 'produto', 4: 'qtd', 6: 'fornecedor', 7: 'cliente ⭐', 8: 'loja', 9: 'data_venda', 10: 'data_abertura', 11: 'categoria', 12: 'descricao' }
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

  const handleSave = async () => {
    const prazo = new Date()
    prazo.setDate(prazo.getDate() + 30)
    try {
      await run(() => onSave({
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
    } catch {
      // error handled by parent handleCreate via toast
    }
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
            <div className="fg"><label className="fl">Loja</label><LojaSelect value={dados.loja} onChange={v => setDados(p => ({ ...p, loja: v }))} /></div>
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

// Remove prefixo [XX] dos valores do banco
const stripPrefix = (s) => String(s || '').replace(/^\[\d+\]\s*/, '').trim()

// Agrupamento dinâmico com strip do prefixo — sem listas hardcoded
const buildDynamic = (items, getKey) => {
  const counts = {}
  for (const item of items) {
    const raw = getKey(item)
    if (!raw) continue
    const key = stripPrefix(raw) || raw
    counts[key] = (counts[key] || 0) + 1
  }
  const total = Object.values(counts).reduce((s, v) => s + v, 0)
  return Object.entries(counts)
    .map(([name, qtd]) => ({ name, qtd, pct: total ? Math.round(qtd / total * 100) : 0 }))
    .sort((a, b) => b.qtd - a.qtd)
}

function GraficoBarras({ dados }) {
  if (!dados?.length) return <div style={{ color: 'var(--t3)', fontSize: 12, padding: 8 }}>Sem dados</div>
  const max = Math.max(...dados.map(d => d.qtd), 1)
  return (
    <div style={{ width: '100%' }}>
      {dados.map((d, i) => (
        <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
          <div style={{ width: 150, fontSize: 11, color: 'var(--t2)', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.name}>{d.name}</div>
          <div style={{ flex: 1, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', height: 22 }}>
            <div style={{ width: `${Math.max((d.qtd / max) * 100, d.qtd > 0 ? 4 : 0)}%`, background: CHART_PAL[i % CHART_PAL.length], height: '100%', borderRadius: 4, display: 'flex', alignItems: 'center', paddingLeft: 6, fontSize: 11, color: '#fff', fontWeight: 600, transition: 'width 0.4s ease' }}>
              {d.qtd}
            </div>
          </div>
          <div style={{ width: 36, fontSize: 11, color: 'var(--t3)', textAlign: 'right', flexShrink: 0 }}>{d.pct}%</div>
        </div>
      ))}
    </div>
  )
}

function TabelaRelatorio({ dados }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--t3)', fontWeight: 500, borderBottom: '1px solid var(--border)' }}>Descrição</th>
          <th style={{ textAlign: 'right', padding: '4px 8px', color: 'var(--t3)', fontWeight: 500, borderBottom: '1px solid var(--border)' }}>Qtd</th>
          <th style={{ textAlign: 'right', padding: '4px 8px', color: 'var(--t3)', fontWeight: 500, borderBottom: '1px solid var(--border)' }}>%</th>
        </tr>
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
  const [lojasFil, setLojasFil] = useState([])

  const { data: assistencias, loading } = useData(() => assistenciasService.list(), [])
  const { data: todosItens } = useData(async () => {
    const { data, error } = await supabase.from('assistencia_itens').select('assistencia_id, fornecedor')
    if (error) throw error
    return data || []
  }, [])

  const hoje = new Date()
  const diasAberto = (d) => !d ? 0 : Math.floor((hoje - new Date(d)) / 86400000)

  // Filtra pelo valor bruto do banco (com prefixo) para compatibilidade
  const lista = (assistencias || []).filter(a => {
    const okInicio = !dataInicio || (a.data_abertura >= dataInicio)
    const okFim = !dataFim || (a.data_abertura <= dataFim)
    const okLoja = lojasFil.length === 0 || lojasFil.includes(a.loja)
    return okInicio && okFim && okLoja
  })

  const ativas = lista.filter(a => !['Concluído', 'Cancelado'].includes(a.status))
  const criticas = ativas.filter(a => diasAberto(a.data_abertura) >= 30)
  const urgentes = ativas.filter(a => { const d = diasAberto(a.data_abertura); return d >= 20 && d < 30 })

  const dataCategorias = buildDynamic(lista, a => a.categoria)
  const dataLojas      = buildDynamic(lista, a => a.loja)

  const listaIds = new Set(lista.map(a => a.id))
  const itensFiltrados = (todosItens || []).filter(it => listaIds.has(it.assistencia_id))
  const dataFabricas = buildDynamic(itensFiltrados, it => it.fornecedor)

  const gerarPDF = () => {
    const w = window.open('', '_blank')
    if (!w) { alert('Permita popups para gerar o PDF.'); return }
    const fmtData = (d) => d ? new Date(d + 'T12:00').toLocaleDateString('pt-BR') : '—'
    const agora = new Date()
    const dataRel = `${String(agora.getDate()).padStart(2,'0')}/${String(agora.getMonth()+1).padStart(2,'0')}/${String(agora.getFullYear()).slice(2)}`
    const barraHTML = (d, max) => {
      const pct = Math.max((d.qtd / max) * 100, 2)
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
        <div style="width:160px;font-size:11px;color:#475569;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${d.name}">${d.name}</div>
        <div style="flex:1;background:#e2e8f0;border-radius:3px;height:18px;overflow:hidden">
          <div style="width:${pct}%;background:#6366f1;height:100%;border-radius:3px;display:flex;align-items:center;padding-left:5px;font-size:10px;color:#fff;font-weight:700">${d.qtd}</div>
        </div>
        <div style="width:32px;font-size:10px;color:#94a3b8;text-align:right">${d.pct}%</div>
      </div>`
    }
    const secao = (titulo, dados) => {
      const max = Math.max(...dados.map(d => d.qtd), 1)
      return `<div style="margin-bottom:28px">
        <h3 style="margin:0 0 10px;font-size:13px;color:#1e293b;border-bottom:2px solid #6366f1;padding-bottom:5px;text-transform:uppercase;letter-spacing:.5px">${titulo}</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
          <table style="border-collapse:collapse;font-size:11px">
            <thead><tr style="background:#f8fafc"><th style="text-align:left;padding:5px 8px;color:#64748b;font-weight:500;border-bottom:1px solid #e2e8f0">Descrição</th><th style="text-align:right;padding:5px 8px;color:#64748b;font-weight:500;border-bottom:1px solid #e2e8f0">Qtd</th><th style="text-align:right;padding:5px 8px;color:#64748b;font-weight:500;border-bottom:1px solid #e2e8f0">%</th></tr></thead>
            <tbody>${dados.map(d => `<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:4px 8px">${d.name}</td><td style="padding:4px 8px;text-align:right;font-weight:700;color:#6366f1">${d.qtd}</td><td style="padding:4px 8px;text-align:right;color:#94a3b8">${d.pct}%</td></tr>`).join('')}</tbody>
          </table>
          <div style="padding-top:4px">${dados.map(d => barraHTML(d, max)).join('')}</div>
        </div>
      </div>`
    }
    const periodo = `${fmtData(dataInicio)} até ${fmtData(dataFim)}${lojasFil.length ? ` · Loja: ${lojasFil.join(', ')}` : ''}`
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório Assistências</title>
      <style>*{box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:32px;color:#1e293b;max-width:900px;margin:0 auto}@media print{body{padding:16px}}</style>
      </head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:12px;border-bottom:3px solid #6366f1">
        <div><h1 style="margin:0 0 2px;font-size:20px;color:#1e293b;text-transform:uppercase;letter-spacing:1px;font-weight:700">CONTROLE DE ASSISTÊNCIAS ${dataRel}</h1>
        <div style="font-size:12px;color:#64748b">Período: ${periodo} · Gerado em ${agora.toLocaleString('pt-BR')}</div></div>
      </div>
      <div style="display:flex;gap:16px;margin-bottom:24px">
        <div style="background:#fef2f2;padding:12px 18px;border-radius:8px;text-align:center;flex:1"><div style="font-size:26px;font-weight:700;color:#ef4444">${criticas.length}</div><div style="font-size:10px;color:#64748b;margin-top:2px">CRÍTICAS +30d</div></div>
        <div style="background:#fffbeb;padding:12px 18px;border-radius:8px;text-align:center;flex:1"><div style="font-size:26px;font-weight:700;color:#f59e0b">${urgentes.length}</div><div style="font-size:10px;color:#64748b;margin-top:2px">URGENTES +20d</div></div>
        <div style="background:#eff6ff;padding:12px 18px;border-radius:8px;text-align:center;flex:1"><div style="font-size:26px;font-weight:700;color:#6366f1">${ativas.length}</div><div style="font-size:10px;color:#64748b;margin-top:2px">ABERTAS</div></div>
        <div style="background:#f0fdf4;padding:12px 18px;border-radius:8px;text-align:center;flex:1"><div style="font-size:26px;font-weight:700;color:#10b981">${lista.length}</div><div style="font-size:10px;color:#64748b;margin-top:2px">TOTAL</div></div>
      </div>
      ${secao('Por Categoria', dataCategorias)}
      ${secao('Por Loja', dataLojas)}
      ${secao('Por Fabricante / Fornecedor', dataFabricas)}
      <script>window.print()</script></body></html>`)
    w.document.close()
  }

  if (loading) return <div className="page"><Spinner /></div>

  const SecaoRelatorio = ({ titulo, dados }) => (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>{titulo} <span style={{ fontWeight: 400, color: 'var(--t3)', fontSize: 12 }}>({dados.length} tipos · {dados.reduce((s, d) => s + d.qtd, 0)} registros)</span></div>
      {dados.length === 0
        ? <div style={{ color: 'var(--t3)', fontSize: 12 }}>Sem dados para o filtro atual</div>
        : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 20, alignItems: 'start' }}>
            <TabelaRelatorio dados={dados} />
            <GraficoBarras dados={dados} />
          </div>}
    </div>
  )

  return (
    <div className="page">
      <div className="ph">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-g btn-ico btn-sm" onClick={onBack}><Ic n="back" /></button>
          <div>
            <h1>Relatório de Assistências</h1>
            <div className="ph-sub">{lista.length} assistências{lojasFil.length ? ` · ${lojasFil.length} loja(s)` : ''}</div>
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
            <LojaMultiSelect value={lojasFil} onChange={setLojasFil} />
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="stats" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
        {[
          { label: 'Críticas +30d', val: criticas.length, color: 'var(--red)' },
          { label: 'Urgentes +20d', val: urgentes.length, color: 'var(--amber)' },
          { label: 'Abertas', val: ativas.length, color: 'var(--accent)' },
          { label: 'Total', val: lista.length, color: 'var(--green)' },
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
    try {
      const { pedido_id, ...dadosConf } = dados
      await conferenciasService.create({ ...dadosConf, conferente_nome: perfil?.full_name, data_hora: new Date().toISOString() })
      if (pedido_id) {
        const fotosArr = Object.values(dadosConf.fotos || {}).filter(Boolean)
        try {
          await pedidosService.registrarRecebimentoProduto(pedido_id, perfil, {
            fotos: fotosArr, numeroPedido: dadosConf.numero_pedido, loja: perfil?.loja,
          })
        } catch {}
      }
      await reload()
      setShowNew(false)
      toast.success('Conferência salva com sucesso!')
    } catch (e) {
      console.error('[Conferencia] handleCreate:', e)
      toast.error('Erro ao salvar conferência: ' + (e.message || e.details || 'desconhecido'))
    }
  }

  const handleEncaminhar = async (c) => {
    try {
      await assistenciasService.create({
        cliente: c.numero_pedido ? `Pedido #${c.numero_pedido}` : 'Cliente da conferência',
        pedido_ref: c.numero_pedido || null,
        tipo_problema: c.motivo_reprovacao || 'Avaria',
        observacoes: [c.produto, c.fornecedor && `Fornecedor: ${c.fornecedor}`, c.descricao_reprovacao].filter(Boolean).join(' | '),
        data_abertura: new Date().toISOString().split('T')[0],
        prazo: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        status: 'Aberto',
        origem: 'conferencia',
      })
      toast.success('Assistência aberta com sucesso!')
    } catch (e) {
      console.error('[Conferencia] handleEncaminhar:', e)
      toast.error('Erro ao criar assistência: ' + e.message)
    }
  }

  if (selectedId) return <ConferenciaDetalhe id={selectedId} onBack={() => { setSelectedId(null); reload() }} onEncaminharAssistencia={handleEncaminhar} />

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
  const fotos = c.fotos || {}
  const slots = [['frente','Frente'],['costas','Costas'],['ladoEsq','Lado Esq.'],['ladoDir','Lado Dir.']]
  const fotoGrid = slots.map(([k,lbl]) => fotos[k]
    ? `<div style="text-align:center"><div style="font-size:10px;color:#64748b;margin-bottom:3px">${lbl}</div><img src="${fotos[k]}" style="width:100%;height:140px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0"/></div>`
    : `<div style="text-align:center;border:1px dashed #cbd5e1;border-radius:6px;height:140px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px">${lbl}<br/>sem foto</div>`
  ).join('')
  const w = window.open('', '_blank')
  w.document.write(`
    <html><head><title>Conferência #${c.numero_pedido}</title>
    <style>*{box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:24px;color:#1e293b;max-width:800px;margin:0 auto}h1{font-size:17px;margin-bottom:4px}p{font-size:13px;margin:4px 0}.badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;background:${c.resultado==='Aprovado'?'#dcfce7;color:#16a34a':'#fee2e2;color:#dc2626'}}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}</style>
    </head><body>
    <h1>Conferência — Pedido #${c.numero_pedido}</h1>
    <p><span class="badge">${c.resultado || 'Pendente'}</span></p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:10px 0;font-size:13px">
      <p><b>Produto:</b> ${c.produto}</p><p><b>NF:</b> ${c.numero_nf}</p>
      <p><b>Fornecedor:</b> ${c.fornecedor}</p><p><b>Conferente:</b> ${c.conferente_nome}</p>
      <p><b>Data:</b> ${new Date(c.data_hora).toLocaleString('pt-BR')}</p>
    </div>
    ${c.motivo_reprovacao ? `<p><b>Motivo:</b> ${c.motivo_reprovacao}</p>` : ''}
    ${c.descricao_reprovacao ? `<p><b>Descrição:</b> ${c.descricao_reprovacao}</p>` : ''}
    <div style="margin-top:18px;font-size:12px;font-weight:600;color:#475569;border-top:1px solid #e2e8f0;padding-top:12px;margin-bottom:10px">FOTOS DO PRODUTO</div>
    <div class="grid">${fotoGrid}</div>
    <script>window.onload=()=>{window.print()}</script>
    </body></html>
  `)
  w.document.close()
}

function ConferenciaDetalhe({ id, onBack, onEncaminharAssistencia }) {
  const { data: c, loading } = useData(() => conferenciasService.getById(id), [id])
  if (loading) return <div className="page"><Spinner /></div>
  if (!c) return <div className="page"><Empty text="Não encontrado" /></div>
  const fotos = c.fotos || {}
  const slots = [['frente','Frente'],['costas','Costas'],['ladoEsq','Lado Esq.'],['ladoDir','Lado Dir.']]
  const temAvaria = c.resultado === 'Reprovado'
  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
        <Btn variant="ghost" size="sm" onClick={onBack}><Ic n="back" s={13} /> Voltar</Btn>
        <div style={{ display: 'flex', gap: 6 }}>
          {temAvaria && onEncaminharAssistencia && (
            <Btn size="sm" style={{ background: 'var(--amber)', color: '#fff' }}
              onClick={() => onEncaminharAssistencia(c)}>🔧 Encaminhar p/ Assistência</Btn>
          )}
          <Btn variant="secondary" size="sm" onClick={() => gerarPDFConferencia(c)}><Ic n="pdf" s={13} /> PDF</Btn>
        </div>
      </div>
      <Badge status={c.resultado || 'Pendente'} style={{ marginBottom: 8 }} />
      <h1 style={{ fontSize: 18, marginBottom: 4 }}>{c.produto}</h1>
      <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16 }}>Pedido #{c.numero_pedido} · NF: {c.numero_nf}</div>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="grid2" style={{ fontSize: 13, gap: 10 }}>
          <div><span style={{ color: 'var(--t2)' }}>Fornecedor: </span>{c.fornecedor}</div>
          <div><span style={{ color: 'var(--t2)' }}>Conferente: </span>{c.conferente_nome}</div>
          <div><span style={{ color: 'var(--t2)' }}>Data: </span>{new Date(c.data_hora).toLocaleString('pt-BR')}</div>
          {c.motivo_reprovacao && <div><span style={{ color: 'var(--t2)' }}>Motivo: </span>{c.motivo_reprovacao}</div>}
        </div>
        {c.descricao_reprovacao && <div style={{ marginTop: 12, fontSize: 13, color: 'var(--t2)' }}>{c.descricao_reprovacao}</div>}
      </div>
      {Object.values(fotos).some(Boolean) && (
        <div className="card">
          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 10 }}>Fotos da Conferência</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
            {slots.map(([k, lbl]) => fotos[k] ? (
              <div key={k} style={{ textAlign: 'center' }}>
                <img src={fotos[k]} alt={lbl} style={{ width: '100%', height: 130, objectFit: 'cover', borderRadius: 8 }} />
                <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 3 }}>{lbl}</div>
              </div>
            ) : null)}
          </div>
        </div>
      )}
    </div>
  )
}

function FotoCaptura({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <label style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'center' }}>{label}</label>
      {value ? (
        <div style={{ position: 'relative' }}>
          <img src={value.preview} alt={label} style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 8, border: '2px solid var(--green)' }} />
          <button onClick={() => onChange(null)} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: 'var(--red)', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
      ) : (
        <label style={{ width: 90, height: 90, borderRadius: 8, border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 4 }}>
          <span style={{ fontSize: 24 }}>📷</span>
          <span style={{ fontSize: 10, color: 'var(--t3)' }}>Tirar foto</span>
          <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => {
            const f = e.target.files?.[0]
            if (!f) return
            const preview = URL.createObjectURL(f)
            onChange({ file: f, preview })
          }} />
        </label>
      )}
    </div>
  )
}

function NovaConferenciaModal({ onClose, onSave }) {
  const [form, setForm] = useState({ numero_pedido: '', numero_nf: '', produto: '', fornecedor: '', resultado: '', motivo_reprovacao: '', descricao_reprovacao: '' })
  const [fotos, setFotos] = useState({ frente: null, costas: null, ladoEsq: null, ladoDir: null })
  const [saveErr, setSaveErr] = useState('')
  const [buscaPedido, setBuscaPedido] = useState('')
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null)
  const [pedidoProdutos, setPedidoProdutos] = useState([])
  const [showDrop, setShowDrop] = useState(false)
  const { run, loading } = useAction()
  const { data: pedidos } = useData(() => pedidosService.list(), [])
  const up = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))
  const setFoto = (k) => (v) => setFotos(prev => ({ ...prev, [k]: v }))
  const todasFotos = fotos.frente && fotos.costas && fotos.ladoEsq && fotos.ladoDir
  const canSave = form.numero_pedido && form.produto && form.fornecedor && form.numero_nf && form.resultado && todasFotos

  const pedidosFiltrados = buscaPedido.length > 1
    ? (pedidos || []).filter(p =>
        p.numero_pedido?.includes(buscaPedido) ||
        p.cliente?.toLowerCase().includes(buscaPedido.toLowerCase())
      ).slice(0, 8)
    : []

  const selecionarPedido = async (p) => {
    setPedidoSelecionado(p)
    setForm(prev => ({ ...prev, numero_pedido: p.numero_pedido }))
    setBuscaPedido(`#${p.numero_pedido} — ${p.cliente}`)
    setShowDrop(false)
    try {
      const full = await pedidosService.getById(p.id)
      setPedidoProdutos(full?.produtos || [])
    } catch { setPedidoProdutos([]) }
  }

  const handleSave = async () => {
    setSaveErr('')
    const tmpId = crypto.randomUUID()
    const fotoUrls = {}
    for (const [slot, foto] of Object.entries(fotos)) {
      if (!foto?.file) continue
      try {
        const ext = foto.file.name.split('.').pop() || 'jpg'
        const path = `${tmpId}/${slot}.${ext}`
        const { error } = await supabase.storage.from('conferencias').upload(path, foto.file)
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('conferencias').getPublicUrl(path)
          fotoUrls[slot] = publicUrl
        }
      } catch {}
    }
    try {
      await onSave({ ...form, fotos: fotoUrls, pedido_id: pedidoSelecionado?.id || null })
      toast.success('Conferência salva!')
    } catch (e) {
      setSaveErr(e.message || 'Erro ao salvar. Tente novamente.')
      throw e
    }
  }

  return (
    <Modal
      title="Nova Conferência"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn disabled={!canSave} loading={loading} onClick={() => run(handleSave)}>
            {!todasFotos ? '4 fotos obrigatórias' : 'Salvar'}
          </Btn>
        </>
      }
    >
      {saveErr && <Alert type="error" style={{ marginBottom: 12 }}>{saveErr}</Alert>}
      <div className="fg" style={{ position: 'relative', marginBottom: 8 }}>
        <label className="fl">Buscar pedido *</label>
        <input className="fi"
          value={buscaPedido}
          onChange={e => {
            setBuscaPedido(e.target.value); setShowDrop(true)
            if (!e.target.value) { setPedidoSelecionado(null); setPedidoProdutos([]); setForm(prev => ({ ...prev, numero_pedido: '' })) }
          }}
          placeholder="Digite número ou nome do cliente..."
          onFocus={() => setShowDrop(true)}
          onBlur={() => setTimeout(() => setShowDrop(false), 200)}
        />
        {showDrop && pedidosFiltrados.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, zIndex: 100, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,.25)' }}>
            {pedidosFiltrados.map(p => (
              <div key={p.id} onMouseDown={() => selecionarPedido(p)} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>#{p.numero_pedido}</span> — {p.cliente}
                {p.local_separacao && <span style={{ color: 'var(--t3)', marginLeft: 6, fontSize: 11 }}>{p.local_separacao}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      {pedidoProdutos.length > 0 && (
        <div style={{ background: 'var(--adim)', borderRadius: 8, padding: '10px 12px', marginBottom: 10, fontSize: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--t2)' }}>Produtos do pedido</div>
          {pedidoProdutos.map(pr => (
            <div key={pr.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{pr.nome_produto}</span>
              <span style={{ color: 'var(--t2)' }}>Qtd: {pr.quantidade}</span>
            </div>
          ))}
        </div>
      )}
      <div className="fg"><label className="fl">Nota Fiscal *</label><input className="fi" value={form.numero_nf} onChange={up('numero_nf')} /></div>
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
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 10, fontWeight: 500 }}>Fotos do produto * (4 obrigatórias)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          <FotoCaptura label="Frente" value={fotos.frente} onChange={setFoto('frente')} />
          <FotoCaptura label="Costas" value={fotos.costas} onChange={setFoto('costas')} />
          <FotoCaptura label="Lado Esq." value={fotos.ladoEsq} onChange={setFoto('ladoEsq')} />
          <FotoCaptura label="Lado Dir." value={fotos.ladoDir} onChange={setFoto('ladoDir')} />
        </div>
        {!todasFotos && <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 8 }}>⚠ Tire as 4 fotos para habilitar o botão Salvar</div>}
      </div>
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
  const [tipoTab, setTipoTab] = useState('entregas')

  const carregar = () => {
    setLoading(true)
    supabase.from('roteiros').select('*, roteiro_itens(*)').order('data', { ascending: false })
      .then(({ data }) => { setRoteiros(data || []); setLoading(false) })
  }

  useEffect(() => { carregar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const criar = async (dados) => {
    try {
      const { itens, ...roteiro } = dados
      const { data: novo, error } = await supabase.from('roteiros').insert({ ...roteiro, tipo: tipoTab, status: 'planejado', created_at: new Date().toISOString() }).select().single()
      if (error) throw error
      if (novo && itens?.length) {
        const { error: eiErr } = await supabase.from('roteiro_itens').insert(itens.map((item, i) => ({ ...item, roteiro_id: novo.id, ordem: i + 1, concluido: false })))
        if (eiErr) throw eiErr
      }
      carregar(); setShowNovo(false)
      toast.success('Roteiro criado com sucesso!')
    } catch (e) {
      console.error('[Roteiro] criar:', e)
      toast.error('Erro ao criar roteiro: ' + (e.message || 'desconhecido'))
    }
  }

  if (selectedId) return <RoteiroDetalhe id={selectedId} onBack={() => { setSelectedId(null); carregar() }} />

  const filtrados = roteiros.filter(r => (r.tipo || 'entregas') === tipoTab)

  return (
    <div className="page">
      <div className="ph">
        <div>
          <h1>Roteiro Diário</h1>
          <div className="ph-sub">{filtrados.length} roteiro(s)</div>
        </div>
        {isGestor && <Btn size="sm" onClick={() => setShowNovo(true)}><Ic n="plus" s={13} /> Novo</Btn>}
      </div>

      <div className="filters" style={{ marginBottom: 16 }}>
        <button className={`fb${tipoTab === 'entregas' ? ' on' : ''}`} onClick={() => setTipoTab('entregas')}>🚚 Roteiro de Entregas</button>
        <button className={`fb${tipoTab === 'assistencias' ? ' on' : ''}`} onClick={() => setTipoTab('assistencias')}>🔧 Roteiro de Assistências</button>
      </div>

      {loading ? <Spinner /> : filtrados.length === 0 ? <Empty icon="🗺️" text={`Nenhum roteiro de ${tipoTab === 'entregas' ? 'entregas' : 'assistências'}`} /> :
        filtrados.map(r => (
          <div key={r.id} className="li" onClick={() => setSelectedId(r.id)}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
              {r.tipo === 'assistencias' ? '🔧' : '🗺️'}
            </div>
            <div className="li-main">
              <div className="li-title">Roteiro {r.data ? new Date(r.data + 'T12:00').toLocaleDateString('pt-BR') : '—'}</div>
              <div className="li-sub">{r.motorista_nome || '—'}{r.montador_nome ? ` · ${r.montador_nome}` : ''} {r.entregadores_extra ? `· ${r.entregadores_extra}` : ''}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{(r.roteiro_itens || []).length} parada(s)</div>
            </div>
            <Badge status={r.status === 'planejado' ? 'Pendente' : r.status === 'em_andamento' ? 'Em Rota' : 'Entregue'} />
            <Ic n="chev" s={13} style={{ color: 'var(--t3)' }} />
          </div>
        ))
      }

      {showNovo && <NovoRoteiroModal onClose={() => setShowNovo(false)} onSave={criar} tipo={tipoTab} />}
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
    try {
      const novoStatus = campo === 'hora_saida' ? 'em_andamento' : 'concluído'
      const { error } = await supabase.from('roteiros').update({ [campo]: hora, status: novoStatus }).eq('id', id)
      if (error) throw error
      setRoteiro(prev => ({ ...prev, [campo]: hora, status: novoStatus }))
      toast.success(campo === 'hora_saida' ? `Saída registrada: ${hora}` : `Término registrado: ${hora}`)
    } catch (e) { console.error('[Roteiro] registrarHora:', e); toast.error('Erro: ' + e.message) }
    setSaving(false)
  }

  const baixarParada = async (itemId) => {
    const hora = new Date().toTimeString().slice(0, 5)
    setSaving(true)
    try {
      const { error } = await supabase.from('roteiro_itens').update({ concluido: true, hora_conclusao: hora }).eq('id', itemId)
      if (error) throw error
      setItens(prev => prev.map(it => it.id === itemId ? { ...it, concluido: true, hora_conclusao: hora } : it))
      toast.success('Parada concluída!')
    } catch (e) { console.error('[Roteiro] baixarParada:', e); toast.error('Erro: ' + e.message) }
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
        🚗 {roteiro.motorista_nome || '—'}{roteiro.montador_nome ? ` · 👤 ${roteiro.montador_nome}` : ''}
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
  <div class="info"><span><b>MOTORISTA:</b> ${roteiro.motorista_nome || '—'}</span><span><b>ENTREGADORES:</b> ${[roteiro.montador_nome, roteiro.entregadores_extra].filter(Boolean).join(' / ') || '—'}</span></div>
  <table><thead><tr><th>QTD</th><th>LOJA</th><th>PEDIDO</th><th>CLIENTE</th><th>BAIRRO</th><th>SERVIÇO</th><th>STATUS</th></tr></thead><tbody>${rows}</tbody></table>
  <script>window.onload=()=>{window.print()}</script></body></html>`)
  w.document.close()
}

function NovoRoteiroModal({ onClose, onSave, tipo = 'entregas' }) {
  const { data: assistencias } = useData(() => assistenciasService.list(), [])
  const { data: pedidos } = useData(() => pedidosService.list(), [])
  const [form, setForm] = useState({ data: new Date().toISOString().split('T')[0], motorista_nome: '' })
  const [entregadores, setEntregadores] = useState(['', '', '', '', ''])
  const [itens, setItens] = useState([])
  const [step, setStep] = useState(0)
  const { run, loading } = useAction()

  const up = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))
  const upEnt = (i, v) => setEntregadores(prev => prev.map((e, idx) => idx === i ? v : e))
  const TIPOS_SERVICO = ['Coleta', 'Vistoria', 'Retoque', 'Visita Técnica', 'Entrega e Instalação', 'Troca', 'Outros']

  const separadosAgendados = (pedidos || []).filter(p => p.status_fluxo === 'separado' && p.data_entrega_agendada === form.data)
  const separadosSemData = (pedidos || []).filter(p => p.status_fluxo === 'separado' && !p.data_entrega_agendada)

  const irParaStep1 = () => {
    if (tipo === 'entregas' && separadosAgendados.length > 0) {
      setItens(prev => {
        const existingRefs = new Set(prev.map(it => it.pedido_ref).filter(Boolean))
        const novos = separadosAgendados
          .filter(p => !existingRefs.has(p.numero_pedido))
          .map(p => ({ assistencia_id: null, pedido_ref: p.numero_pedido, cliente: p.cliente, loja: p.local_separacao || '', bairro: p.cidade || '', status_servico: 'Entrega e Instalação' }))
        return [...prev, ...novos]
      })
    }
    setStep(1)
  }

  const addAssistencia = (a) => {
    if (itens.find(it => it.assistencia_id === a.id)) return
    setItens(prev => [...prev, { assistencia_id: a.id, cliente: a.cliente, pedido_ref: a.pedido_ref || '', loja: a.loja || '', bairro: '', status_servico: 'Visita Técnica' }])
  }
  const addSeparado = (p) => {
    if (itens.find(it => it.pedido_ref === p.numero_pedido)) return
    setItens(prev => [...prev, { assistencia_id: null, pedido_ref: p.numero_pedido, cliente: p.cliente, loja: p.local_separacao || '', bairro: p.cidade || '', status_servico: 'Entrega e Instalação' }])
  }
  const addManual = () => setItens(prev => [...prev, { assistencia_id: null, cliente: '', pedido_ref: '', loja: '', bairro: '', status_servico: tipo === 'entregas' ? 'Entrega e Instalação' : 'Visita Técnica' }])

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
      title={tipo === 'assistencias' ? 'Novo Roteiro de Assistências' : 'Novo Roteiro de Entregas'}
      subtitle={`Etapa ${step + 1} de 2 — ${['Dados gerais', 'Paradas'][step]}`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          {step > 0 && <Btn variant="secondary" onClick={() => setStep(0)}>← Voltar</Btn>}
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          {step === 0 && <Btn disabled={!form.data || !form.motorista_nome || !entregadores[0]} onClick={irParaStep1}>Continuar →</Btn>}
          {step === 1 && <Btn disabled={itens.length === 0} loading={loading} onClick={() => {
            const ents = entregadores.filter(Boolean)
            const saveData = { ...form, montador_nome: ents[0] || '', entregadores_extra: ents.slice(1).join(' / ') || '', itens }
            run(() => onSave(saveData))
          }}>✓ Criar Roteiro</Btn>}
        </>
      }
    >
      {step === 0 && (
        <>
          <div className="fg"><label className="fl">Data *</label><input className="fi" type="date" value={form.data} onChange={up('data')} /></div>
          <div className="fg"><label className="fl">Motorista *</label><input className="fi" value={form.motorista_nome} onChange={up('motorista_nome')} placeholder="Nome do motorista" /></div>
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 8, fontWeight: 500 }}>Entregadores / Técnicos (até 5)</div>
            {entregadores.map((ent, i) => (
              <div key={i} className="fg" style={{ marginBottom: 6 }}>
                <input className="fi" value={ent} onChange={e => upEnt(i, e.target.value)} placeholder={`Entregador ${i + 1}${i === 0 ? ' *' : ' (opcional)'}`} />
              </div>
            ))}
          </div>
        </>
      )}
      {step === 1 && (
        <>
          {tipo === 'assistencias' && abertas.length > 0 && (
            <>
              <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>Assistências abertas (clique para adicionar):</div>
              <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 8, marginBottom: 12 }}>
                {abertas.map(a => {
                  const adicionada = !!itens.find(it => it.assistencia_id === a.id)
                  return (
                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 4px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 12 }}>
                        <span style={{ fontWeight: 500 }}>{a.cliente}</span>
                        {a.pedido_ref && <span style={{ color: 'var(--t3)', marginLeft: 6 }}>#{a.pedido_ref}</span>}
                      </div>
                      <Btn size="sm" variant={adicionada ? 'secondary' : 'primary'} onClick={() => addAssistencia(a)} disabled={adicionada}>{adicionada ? '✓' : '+'}</Btn>
                    </div>
                  )
                })}
              </div>
            </>
          )}
          {tipo === 'entregas' && separadosSemData.length > 0 && (
            <>
              <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8, color: 'var(--amber)' }}>⚠ Separados sem data agendada</div>
              <div style={{ maxHeight: 140, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 8, marginBottom: 12 }}>
                {separadosSemData.map(p => {
                  const adicionado = !!itens.find(it => it.pedido_ref === p.numero_pedido)
                  return (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 4px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 12 }}>
                        <span style={{ fontWeight: 500 }}>#{p.numero_pedido}</span> — {p.cliente}
                        {p.local_separacao && <span style={{ color: 'var(--t3)', marginLeft: 6 }}>{p.local_separacao}</span>}
                      </div>
                      <Btn size="sm" variant={adicionado ? 'secondary' : 'primary'} onClick={() => addSeparado(p)} disabled={adicionado}>{adicionado ? '✓' : '+'}</Btn>
                    </div>
                  )
                })}
              </div>
            </>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 500, fontSize: 13 }}>Paradas ({itens.length})</div>
            <Btn variant="secondary" size="sm" onClick={addManual}><Ic n="plus" s={12} /> Adicionar manual</Btn>
          </div>
          {itens.length === 0 && <div style={{ fontSize: 12, color: 'var(--t3)', textAlign: 'center', padding: 16 }}>Adicione paradas acima</div>}
          {itens.map((item, idx) => (
            <div key={idx} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>#{idx + 1}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-g btn-ico btn-sm" onClick={() => mover(idx, -1)} disabled={idx === 0}>↑</button>
                  <button className="btn btn-g btn-ico btn-sm" onClick={() => mover(idx, 1)} disabled={idx === itens.length - 1}>↓</button>
                  <button className="btn btn-g btn-ico btn-sm" style={{ color: 'var(--red)' }} onClick={() => remItem(idx)}><Ic n="trash" s={11} /></button>
                </div>
              </div>
              <div className="grid2" style={{ gap: 6 }}>
                <div className="fg" style={{ marginBottom: 0 }}><label className="fl">Cliente *</label><input className="fi" value={item.cliente} onChange={e => upItem(idx, 'cliente', e.target.value)} /></div>
                <div className="fg" style={{ marginBottom: 0 }}><label className="fl">Pedido</label><input className="fi" value={item.pedido_ref} onChange={e => upItem(idx, 'pedido_ref', e.target.value)} /></div>
                <div className="fg" style={{ marginBottom: 0 }}><label className="fl">Loja</label><LojaSelect value={item.loja} onChange={v => upItem(idx, 'loja', v)} /></div>
                <div className="fg" style={{ marginBottom: 0 }}><label className="fl">Bairro</label><input className="fi" value={item.bairro} onChange={e => upItem(idx, 'bairro', e.target.value)} /></div>
              </div>
              <div className="fg" style={{ marginBottom: 0, marginTop: 6 }}>
                <label className="fl">Tipo de Serviço</label>
                <select className="fi" value={item.status_servico} onChange={e => upItem(idx, 'status_servico', e.target.value)}>
                  {TIPOS_SERVICO.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
          ))}
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
  const [editUser, setEditUser] = useState(null)
  const { data: equipes, reload: reloadEq } = useData(() => equipesService.list(), [])
  const { data: usuarios, reload: reloadU } = useData(() => usuariosService.list(), [])

  const handleEquipe = async (dados) => {
    try {
      await equipesService.create(dados)
      await reloadEq()
      setShowNewEquipe(false)
      toast.success('Equipe criada!')
    } catch (e) {
      console.error('[Equipe] handleEquipe:', e)
      toast.error('Erro ao criar equipe: ' + (e.message || 'desconhecido'))
    }
  }

  const handleUser = async (dados) => {
    try {
      await usuariosService.create(dados)
      await reloadU()
      setShowNewUser(false)
      toast.success('Usuário criado com sucesso!')
    } catch (e) {
      console.error('[Equipe] handleUser:', e)
      toast.error('Erro ao criar usuário: ' + (e.message || e.details || 'desconhecido'))
    }
  }

  const handleEditUser = async (id, dados) => {
    try {
      await usuariosService.update(id, dados)
      await reloadU()
      setEditUser(null)
      toast.success('Usuário atualizado!')
    } catch (e) {
      console.error('[Equipe] handleEditUser:', e)
      toast.error('Erro ao atualizar usuário: ' + (e.message || e.details || 'desconhecido'))
    }
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
                <td><button className="btn btn-g btn-ico btn-sm" onClick={() => setEditUser(u)}><Ic n="edit" s={13} /></button></td>
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
      {editUser && (
        <EditarUsuarioModal usuario={editUser} onClose={() => setEditUser(null)} onSave={(dados) => handleEditUser(editUser.id, dados)} />
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

function PerfilModulosDesc({ perfil: perfilNome }) {
  const mods = PROFILE_PAGES[perfilNome] || []
  if (!mods.length) return null
  return (
    <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 6, lineHeight: 1.6 }}>
      <span style={{ color: 'var(--t2)', fontWeight: 500 }}>Acesso:</span>{' '}
      {mods.map(m => PAGE_LABELS[m] || m).join(', ')}
    </div>
  )
}

function NovoUsuarioForm({ onClose, onSave }) {
  const [form, setForm] = useState({ full_name: '', usuario: '', senha: '', perfil: 'vendedor', loja: '', telefone: '' })
  const { run, loading } = useAction()
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const canSave = form.full_name.trim() && form.usuario.trim() && form.senha.length >= 4

  const handleSave = async () => {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(form.senha))
    const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
    await onSave({
      full_name: form.full_name.trim(),
      email: `${form.usuario.trim()}@versalog.local`,
      usuario: form.usuario.trim().toLowerCase(),
      senha_hash: hash,
      perfil: form.perfil,
      role: form.perfil,
      loja: form.loja || null,
      telefone: form.telefone,
    })
  }

  return (
    <>
      <div className="mb">
        <div className="fg"><label className="fl">Nome Completo *</label><input className="fi" value={form.full_name} onChange={up('full_name')} /></div>
        <div className="grid2">
          <div className="fg"><label className="fl">Usuário * (para login)</label><input className="fi" value={form.usuario} onChange={up('usuario')} placeholder="ex: marllon" /></div>
          <div className="fg"><label className="fl">Senha * (mín. 4 caracteres)</label><input className="fi" type="password" value={form.senha} onChange={up('senha')} placeholder="••••••" /></div>
        </div>
        <div className="grid2">
          <div className="fg">
            <label className="fl">Perfil de Acesso</label>
            <select className="fi" value={form.perfil} onChange={up('perfil')}>
              {Object.entries(PROFILE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <PerfilModulosDesc perfil={form.perfil} />
          </div>
          <div className="fg">
            <label className="fl">Loja Vinculada</label>
            <LojaSelect value={form.loja} onChange={loja => setForm(p => ({ ...p, loja }))} placeholder="Sem loja específica" />
          </div>
        </div>
        <div className="fg"><label className="fl">Telefone</label><input className="fi" value={form.telefone} onChange={up('telefone')} type="tel" /></div>
      </div>
      <div className="mf">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn disabled={!canSave} loading={loading} onClick={() => run(handleSave)}>Criar</Btn>
      </div>
    </>
  )
}

function EditarUsuarioModal({ usuario: u, onClose, onSave }) {
  const [form, setForm] = useState({
    full_name: u.full_name || '',
    perfil: u.perfil || u.role || 'vendedor',
    loja: u.loja || '',
    telefone: u.telefone || '',
    nova_senha: '',
  })
  const { run, loading } = useAction()
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSave = async () => {
    try {
      const updates = {
        full_name: form.full_name.trim(),
        perfil: form.perfil,
        role: form.perfil,
        loja: form.loja || null,
        telefone: form.telefone,
      }
      if (form.nova_senha.length >= 4) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(form.nova_senha))
        updates.senha_hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
      }
      await run(() => onSave(updates))
    } catch {
      // error shown via toast in parent handleEditUser
    }
  }

  return (
    <Modal
      title={`Editar — ${u.full_name}`}
      onClose={onClose}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn disabled={!form.full_name.trim()} loading={loading} onClick={handleSave}><Ic n="save" s={13} /> Salvar</Btn>
        </>
      }
    >
      <div className="fg"><label className="fl">Nome Completo *</label><input className="fi" value={form.full_name} onChange={up('full_name')} /></div>
      <div className="grid2">
        <div className="fg">
          <label className="fl">Perfil de Acesso</label>
          <select className="fi" value={form.perfil} onChange={up('perfil')}>
            {Object.entries(PROFILE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <PerfilModulosDesc perfil={form.perfil} />
        </div>
        <div className="fg">
          <label className="fl">Loja Vinculada</label>
          <LojaSelect value={form.loja} onChange={loja => setForm(p => ({ ...p, loja }))} placeholder="Sem loja específica" />
        </div>
      </div>
      <div className="fg"><label className="fl">Telefone</label><input className="fi" value={form.telefone} onChange={up('telefone')} type="tel" /></div>
      <div className="fg"><label className="fl">Nova Senha (deixe em branco para manter)</label><input className="fi" type="password" value={form.nova_senha} onChange={up('nova_senha')} placeholder="mín. 4 caracteres" /></div>
      <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>Login: {u.usuario || u.email}</div>
    </Modal>
  )
}

// ============================================================
// RANKING
// ============================================================
function RankingEntregadores() {
  const { data: pedidos, loading } = useData(() => pedidosService.list(), [])
  const map = {}
  ;(pedidos || []).forEach(p => {
    if (!p.entregador_nome) return
    if (!map[p.entregador_nome]) map[p.entregador_nome] = { total:0, entregues:0, problemas:0 }
    map[p.entregador_nome].total++
    if (p.status === 'Entregue') map[p.entregador_nome].entregues++
    if (p.status === 'Problema') map[p.entregador_nome].problemas++
  })
  const rank = Object.entries(map)
    .map(([nome, d]) => ({ nome, ...d, taxa: d.total ? Math.round((d.entregues/d.total)*100) : 0 }))
    .sort((a,b) => b.taxa - a.taxa)
  const medals = ['gold','silver','bronze']
  return loading ? <Spinner /> : rank.length === 0 ? <Empty icon="🏆" text="Sem dados suficientes" /> : (
    <>
      {rank.map((r,i) => (
        <div className="rank-item" key={r.nome}>
          <div className={`rank-num${medals[i]?' '+medals[i]:''}`}>{i+1}</div>
          <div style={{width:32,height:32,borderRadius:'50%',background:'var(--bg4)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:600}}>{r.nome.charAt(0)}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:500}}>{r.nome}</div>
            <div style={{fontSize:12,color:'var(--t2)'}}>{r.entregues} entregues · {r.problemas} problemas</div>
            <div style={{marginTop:5,height:3,background:'var(--bg3)',borderRadius:2}}>
              <div style={{width:`${r.taxa}%`,height:'100%',background:r.taxa>=80?'var(--green)':r.taxa>=50?'var(--amber)':'var(--red)',borderRadius:2}}/>
            </div>
          </div>
          <div style={{fontSize:20,fontWeight:600,fontFamily:'var(--mono)',color:r.taxa>=80?'var(--green)':r.taxa>=50?'var(--amber)':'var(--red)'}}>{r.taxa}%</div>
        </div>
      ))}
    </>
  )
}

function RankingMetas() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth()+1)
  const [ano, setAno] = useState(now.getFullYear())
  const { data: metas, loading, reload } = useData(() => metasService.list(mes, ano), [mes, ano])
  const { data: vendas } = useData(() => vendasService.list(), [])
  const { isGestor } = useAuth()
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ tipo:'vendedor', referencia_nome:'', loja:'', valor_meta:'' })
  const act = useAction()
  const up = k => e => setForm(p=>({...p,[k]:e.target.value}))

  const salvar = async () => {
    if (!form.referencia_nome || !form.valor_meta) return toast.error('Preencha todos os campos')
    try {
      await act.run(() => metasService.upsert({ ...form, referencia_id: form.referencia_nome.toLowerCase().replace(/\s/g,'_'), mes, ano, valor_meta: parseFloat(form.valor_meta)||0 }))
      toast.success('Meta salva'); setModal(null); reload()
    } catch(e) { toast.error(e.message) }
  }

  const calcReal = (m) => {
    const vendsLoja = (vendas||[]).filter(v => {
      const d = new Date(v.created_at)
      return d.getMonth()+1 === mes && d.getFullYear() === ano &&
        (m.tipo==='loja' ? v.loja===m.referencia_nome : v.vendedor_nome===m.referencia_nome)
    })
    return vendsLoja.reduce((s,v)=>s+(parseFloat(v.total)||0),0)
  }

  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center',flexWrap:'wrap'}}>
        <select className="fi" style={{width:'auto'}} value={mes} onChange={e=>setMes(+e.target.value)}>
          {[...Array(12)].map((_,i)=><option key={i+1} value={i+1}>{new Date(2000,i).toLocaleString('pt-BR',{month:'long'})}</option>)}
        </select>
        <input className="fi" type="number" style={{width:90}} value={ano} onChange={e=>setAno(+e.target.value)} />
        {isGestor && <button className="btn btn-p btn-sm" onClick={()=>{setForm({tipo:'vendedor',referencia_nome:'',loja:'',valor_meta:''});setModal(true)}}>+ Meta</button>}
      </div>
      {loading ? <Spinner /> : (metas||[]).length===0 ? <Empty text="Nenhuma meta definida" /> : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {(metas||[]).map(m => {
            const real = calcReal(m)
            const pct = m.valor_meta > 0 ? Math.min(Math.round((real/m.valor_meta)*100),100) : 0
            const cor = pct>=80?'var(--green)':pct>=50?'var(--amber)':'var(--red)'
            return (
              <div key={m.id} className="card" style={{padding:'12px 16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                  <div>
                    <div style={{fontWeight:600}}>{m.referencia_nome}</div>
                    <div style={{fontSize:11,color:'var(--t3)'}}>{m.tipo} · {m.loja}</div>
                  </div>
                  <div style={{textAlign:'right',fontSize:13}}>
                    <div style={{fontWeight:700,color:cor}}>{pct}%</div>
                    <div style={{color:'var(--t3)'}}>{fmtR(real)} / {fmtR(m.valor_meta)}</div>
                  </div>
                </div>
                <div style={{height:6,background:'var(--bg3)',borderRadius:3}}>
                  <div style={{width:`${pct}%`,height:'100%',background:cor,borderRadius:3,transition:'width .4s'}}/>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {modal && (
        <Modal title="Nova Meta" onClose={()=>setModal(null)}>
          <div className="fg"><label className="fl">Tipo</label>
            <select className="fi" value={form.tipo} onChange={up('tipo')}>
              <option value="vendedor">Vendedor</option>
              <option value="loja">Loja</option>
            </select>
          </div>
          <div className="fg"><label className="fl">Nome</label><input className="fi" value={form.referencia_nome} onChange={up('referencia_nome')} placeholder="Nome do vendedor ou loja" /></div>
          <div className="fg"><label className="fl">Loja</label><LojaSelect value={form.loja} onChange={v=>setForm(p=>({...p,loja:v}))} /></div>
          <div className="fg"><label className="fl">Valor da Meta (R$)</label><input className="fi" type="number" step="100" value={form.valor_meta} onChange={up('valor_meta')} /></div>
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <button className="btn btn-p" style={{flex:1}} onClick={salvar} disabled={act.loading}>{act.loading?'...':'Salvar'}</button>
            <button className="btn btn-s" onClick={()=>setModal(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Ranking() {
  const [tab, setTab] = useState('ranking')
  return (
    <div className="page">
      <div className="ph"><h1>Ranking</h1></div>
      <div style={{display:'flex',gap:6,marginBottom:16}}>
        <button className={`btn btn-${tab==='ranking'?'p':'s'} btn-sm`} onClick={()=>setTab('ranking')}>🏆 Entregadores</button>
        <button className={`btn btn-${tab==='metas'?'p':'s'} btn-sm`} onClick={()=>setTab('metas')}>🎯 Metas</button>
      </div>
      {tab==='ranking' && <RankingEntregadores />}
      {tab==='metas' && <RankingMetas />}
    </div>
  )
}

// ============================================================
// MAPA
// ============================================================
function MapaEquipe() {
  const { data: equipe, loading, reload } = useData(() => localizacoesService.list(), [])
  const STATUS_COR = { em_rota:'var(--green)', parado:'var(--amber)', disponivel:'var(--t2)' }
  const STATUS_LABEL = { em_rota:'Em Rota', parado:'Parado', disponivel:'Disponível' }

  useEffect(() => {
    const t = setInterval(reload, 3 * 60 * 1000)
    return () => clearInterval(t)
  }, [reload])

  const selEquipe = equipe?.find(e => e.latitude && e.longitude && e.latitude !== 0)
  const mapUrl = selEquipe
    ? `https://maps.google.com/maps?q=${selEquipe.latitude},${selEquipe.longitude}&output=embed`
    : 'https://maps.google.com/maps?q=Belo+Horizonte,MG,Brasil&output=embed'

  return (
    <div>
      {loading ? <Spinner /> : (equipe||[]).length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 16px', color:'var(--t2)' }}>
          <div style={{ fontSize:40, marginBottom:8 }}>📍</div>
          <div>Nenhum membro em campo agora</div>
          <div style={{ fontSize:12, marginTop:4 }}>Localização atualizada a cada 3 minutos quando em rota</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {(equipe||[]).map(e => (
            <div key={e.id} className="card" style={{ display:'flex', gap:12, alignItems:'center', borderLeft:`3px solid ${STATUS_COR[e.status]||'var(--t2)'}` }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, flexShrink:0 }}>
                {e.usuario_nome?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600 }}>{e.usuario_nome}</div>
                <div style={{ fontSize:12, color:'var(--t2)' }}>
                  {STATUS_LABEL[e.status]||e.status} · Atualizado: {new Date(e.updated_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
                </div>
              </div>
              {e.latitude && e.latitude !== 0 && (
                <a href={`https://maps.google.com/?q=${e.latitude},${e.longitude}`} target="_blank" rel="noreferrer">
                  <button className="btn btn-s btn-sm">📍 Ver</button>
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Mapa() {
  const [abaMapa, setAbaMapa] = useState('entregas')
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
      <div style={{ display:'flex', gap:6, marginBottom:12 }}>
        <button className={`btn btn-${abaMapa==='entregas'?'p':'s'} btn-sm`} onClick={()=>setAbaMapa('entregas')}>🗺 Entregas</button>
        <button className={`btn btn-${abaMapa==='equipe'?'p':'s'} btn-sm`} onClick={()=>setAbaMapa('equipe')}>👥 Equipe em Campo</button>
      </div>
      {abaMapa === 'equipe' ? <MapaEquipe /> : (
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
      )}
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
      const statusFinal = active.requer_montagem ? 'Aguardando Montagem' : 'Entregue'
      await pedidosService.update(active.id, {
        status: statusFinal,
        hora_fim: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      })
      await pedidosService.addHistorico(active.id, statusFinal, `${statusFinal === 'Aguardando Montagem' ? 'Entregue — aguardando montagem' : 'Concluído'} por ${perfil?.full_name}. Recebido por: ${sigNome}${obs ? `. Obs: ${obs}` : ''}`, perfil)
      // NPS: apenas quando entrega final (sem montagem pendente)
      if (!active.requer_montagem) {
        try {
          const npsRow = await npsService.create({ pedido_id: active.id, cliente_nome: active.cliente, cliente_telefone: active.telefone, loja: active.local_separacao })
          if (active.telefone && npsRow?.token) {
            const link = `${window.location.origin}${window.location.pathname}#/nps/${npsRow.token}`
            const msg = `Olá ${active.cliente?.split(' ')[0]}! Sua entrega foi realizada. De 0 a 10, como foi sua experiência? ${link}`
            const pending = JSON.parse(localStorage.getItem('nps_pendentes') || '[]')
            pending.push({ waLink: `https://wa.me/55${active.telefone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, cliente: active.cliente, sendAt: Date.now() + 24 * 60 * 60 * 1000 })
            localStorage.setItem('nps_pendentes', JSON.stringify(pending))
            toast.success('NPS agendado para envio em 24h')
          }
        } catch {}
      }
      // Localização: parar envio
      try { await localizacoesService.upsert(perfil?.id, perfil?.full_name, 0, 0, 'disponivel', null) } catch {}
      reload()
      setActive(null)
    })
  }

  const concluirMontagem = (p) => {
    run(async () => {
      await pedidosService.update(p.id, { status: 'Entregue' })
      await pedidosService.addHistorico(p.id, 'Entregue', `Montagem concluída por ${perfil?.full_name}`, perfil)
      try {
        const npsRow = await npsService.create({ pedido_id: p.id, cliente_nome: p.cliente, cliente_telefone: p.telefone, loja: p.local_separacao })
        if (p.telefone && npsRow?.token) {
          const link = `${window.location.origin}${window.location.pathname}#/nps/${npsRow.token}`
          const msg = `Olá ${p.cliente?.split(' ')[0]}! Sua montagem foi concluída. De 0 a 10, como foi sua experiência? ${link}`
          const pending = JSON.parse(localStorage.getItem('nps_pendentes') || '[]')
          pending.push({ waLink: `https://wa.me/55${p.telefone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, cliente: p.cliente, sendAt: Date.now() + 24 * 60 * 60 * 1000 })
          localStorage.setItem('nps_pendentes', JSON.stringify(pending))
          toast.success('NPS agendado para envio em 24h')
        }
      } catch {}
      reload()
    })
  }

  // Envio de localização a cada 3 min quando em rota
  useEffect(() => {
    if (!active || active.status !== 'Em Rota') return
    let itvl
    const enviarPos = () => {
      if (!navigator.geolocation) return
      navigator.geolocation.getCurrentPosition(pos => {
        localizacoesService.upsert(perfil?.id, perfil?.full_name, pos.coords.latitude, pos.coords.longitude, 'em_rota', active.id).catch(() => {})
      }, () => {})
    }
    enviarPos()
    itvl = setInterval(enviarPos, 3 * 60 * 1000)
    return () => clearInterval(itvl)
  }, [active?.id, active?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  const steps = ['Iniciar', 'Fotos', 'Assinatura', 'Concluir']
  const pendentes = (pedidos || []).filter(p => !['Entregue', 'Aguardando Montagem'].includes(p.status))
  const entregues = (pedidos || []).filter(p => p.status === 'Entregue')
  const montagens = (pedidos || []).filter(p => p.status === 'Aguardando Montagem')

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
          {montagens.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--orange, #f97316)', margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Aguardando Montagem ({montagens.length})
              </div>
              {montagens.map(p => (
                <div className="card" key={p.id} style={{ marginBottom:8, display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:13 }}>{p.cliente}</div>
                    <div style={{ fontSize:12, color:'var(--t2)' }}>#{p.numero_pedido} · {p.endereco}</div>
                  </div>
                  <Btn size="sm" style={{ background:'var(--orange,#f97316)', color:'#fff' }} loading={actionLoading} onClick={() => concluirMontagem(p)}>
                    ✓ Montagem feita
                  </Btn>
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
const PONTO_SEQUENCIA = ['entrada', 'saida_almoco', 'retorno_almoco', 'saida']
const PONTO_LABELS = { entrada: 'Entrada', saida_almoco: 'Saída Almoço', retorno_almoco: 'Retorno Almoço', saida: 'Saída' }
const PONTO_COLORS = { entrada: 'var(--green)', saida_almoco: 'var(--amber)', retorno_almoco: 'var(--blue)', saida: 'var(--red)' }
const PONTO_BG    = { entrada: 'var(--gdim)',  saida_almoco: 'var(--adim2)', retorno_almoco: 'var(--bdim)', saida: 'var(--rdim)' }

async function gerarOcorrenciaPonto(tipo_marcacao, dataHora, escala, usuarioId, lojaId) {
  if (!escala || !usuarioId) return
  const hoje = dataHora.toISOString().split('T')[0]
  const horaAtual = dataHora.getHours() * 60 + dataHora.getMinutes()
  const parseHora = (h) => { if (!h) return null; const [hh, mm] = h.split(':').map(Number); return hh * 60 + mm }
  const tolerancia = escala.tolerancia_minutos || 10
  if (tipo_marcacao === 'entrada' && escala.hora_entrada) {
    const previsto = parseHora(escala.hora_entrada)
    if (previsto !== null && horaAtual > previsto + tolerancia) {
      await pontoOcorrenciasService.create({
        usuario_id: usuarioId, loja_id: lojaId || null, data: hoje, tipo: 'atraso',
        descricao: `Entrada às ${dataHora.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}, previsto ${escala.hora_entrada}`,
        minutos: horaAtual - previsto, status: 'pendente',
      })
    }
  }
  if (tipo_marcacao === 'saida' && escala.hora_saida) {
    const previsto = parseHora(escala.hora_saida)
    if (previsto !== null) {
      if (horaAtual < previsto - tolerancia) {
        await pontoOcorrenciasService.create({
          usuario_id: usuarioId, loja_id: lojaId || null, data: hoje, tipo: 'saida_antecipada',
          descricao: `Saída às ${dataHora.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}, previsto ${escala.hora_saida}`,
          minutos: previsto - horaAtual, status: 'pendente',
        })
      } else if (horaAtual > previsto + 15) {
        await pontoOcorrenciasService.create({
          usuario_id: usuarioId, loja_id: lojaId || null, data: hoje, tipo: 'hora_extra',
          descricao: `Saída às ${dataHora.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}, previsto ${escala.hora_saida}`,
          minutos: horaAtual - previsto, status: 'pendente',
        })
      }
    }
  }
}

function normTipoMarcacao(p) {
  const t = p.tipo_marcacao || p.tipo || ''
  if (t === 'Entrada') return 'entrada'
  if (t === 'Almoço' || t === 'saida_almoco') return 'saida_almoco'
  if (t === 'Retorno' || t === 'retorno_almoco') return 'retorno_almoco'
  if (t === 'Saída' || t === 'saida') return 'saida'
  return t
}

function calcSaldoHoras(ps) {
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

function Ponto() {
  const { perfil, isGestor } = useAuth()
  const [time, setTime] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [comprovante, setComprovante] = useState(null)

  const { data: pontos, reload }             = useData(() => pontoService.listHoje(perfil?.id), [perfil?.id])
  const { data: todosPontos, reload: reTodos } = useData(() => isGestor ? pontoService.listAllHoje() : Promise.resolve([]), [isGestor])
  const { data: cercas }                     = useData(() => cercasVirtuaisService.list(), [])
  const { data: escala }                     = useData(() => perfil?.id ? escalasTrabalhoService.getEscalaHoje(perfil?.id) : Promise.resolve(null), [perfil?.id])

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const registrosHoje  = pontos || []
  const indexProximo   = Math.min(registrosHoje.length, 3)
  const proximoTipo    = PONTO_SEQUENCIA[indexProximo]
  const todosFeitos    = registrosHoje.length >= 4

  const horarioEscala  = escala ? {
    entrada: escala.hora_entrada, saida_almoco: escala.hora_saida_almoco,
    retorno_almoco: escala.hora_retorno_almoco, saida: escala.hora_saida,
  }[proximoTipo] : null

  const saldo = calcSaldoHoras(registrosHoje)

  const obterGeolocalizacao = () => new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      ()  => resolve(null),
      { timeout: 8000, maximumAge: 0 }
    )
  })

  const registrar = async () => {
    if (todosFeitos || loading) return
    setLoading(true)
    try {
      const now      = new Date()
      const dataHoje = now.toISOString().split('T')[0]
      const geo      = await obterGeolocalizacao()
      let dentroCerca = true, distancia = null

      if (geo) {
        const cercaLoja = (cercas || []).find(c => c.loja_id === perfil?.loja_id) || (cercas || [])[0]
        if (cercaLoja) {
          distancia   = cercasVirtuaisService.calcularDistancia(geo.lat, geo.lon, Number(cercaLoja.latitude), Number(cercaLoja.longitude))
          dentroCerca = distancia <= cercaLoja.raio_metros
          if (!dentroCerca) {
            await supabase.from('ponto_ocorrencias').insert({
              usuario_id: perfil?.id,
              data: dataHoje,
              tipo: 'marcacao_fora_cerca',
              descricao: `Marcação fora da cerca. Distância: ${distancia}m (raio permitido: ${cercaLoja.raio_metros}m)`,
              status: 'pendente',
            })
          }
        }
      } else {
        dentroCerca = false
        await supabase.from('ponto_ocorrencias').insert({
          usuario_id: perfil?.id,
          data: dataHoje,
          tipo: 'marcacao_fora_cerca',
          descricao: 'Localização não disponível no momento do registro',
          status: 'pendente',
        })
      }

      await pontoService.registrar({
        usuario_id:           perfil?.id,
        usuario_nome:         perfil?.full_name,
        tipo:                 PONTO_LABELS[proximoTipo],
        tipo_marcacao:        proximoTipo,
        data_hora:            now.toISOString(),
        data:                 dataHoje,
        latitude:             geo?.lat ?? null,
        longitude:            geo?.lon ?? null,
        dentro_cerca:         dentroCerca,
        distancia_loja_metros: distancia,
        device_info:          navigator.userAgent?.slice(0, 200) || null,
      })

      if (escala) await gerarOcorrenciaPonto(proximoTipo, now, escala, perfil?.id, perfil?.loja_id).catch(() => {})
      await reload()
      if (isGestor) await reTodos()
      setComprovante({ tipo: proximoTipo, horario: now, dentroCerca, distancia, geo })
      toast.success(`${PONTO_LABELS[proximoTipo]} registrado!`)
    } catch (e) {
      toast.error(`Erro ao registrar: ${e?.message || 'desconhecido'}`)
    } finally {
      setLoading(false)
    }
  }

  const porFuncionario = {}
  ;(todosPontos || []).forEach(p => {
    if (!porFuncionario[p.usuario_id]) porFuncionario[p.usuario_id] = { nome: p.usuario_nome, pontos: [] }
    porFuncionario[p.usuario_id].pontos.push(p)
  })

  return (
    <div className="page">
      <div className="ph"><h1>Ponto Eletrônico</h1></div>

      {/* Aviso de privacidade */}
      <Alert type="info" style={{ marginBottom: 12, fontSize: 12 }}>
        📍 A localização é capturada <strong>apenas no momento de bater o ponto</strong> para fins de controle de jornada, conforme a CLT.
      </Alert>

      {/* Card principal do funcionário */}
      <div className="card" style={{ textAlign: 'center', marginBottom: 18 }}>
        <div className="clock">{time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
        <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 18 }}>
          {time.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>

        {/* Próxima marcação */}
        {!todosFeitos ? (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 6 }}>Próxima marcação</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: PONTO_COLORS[proximoTipo], marginBottom: 4 }}>
              {PONTO_LABELS[proximoTipo]}
            </div>
            {horarioEscala && (
              <div style={{ fontSize: 12, color: 'var(--t2)' }}>
                Previsto na escala: <strong>{horarioEscala}</strong>
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 14, color: 'var(--green)', fontWeight: 600, marginBottom: 18 }}>
            ✅ Jornada completa registrada hoje
          </div>
        )}

        {/* Saldo de horas */}
        {saldo && (
          <div style={{ fontSize: 13, color: 'var(--green)', marginBottom: 16 }}>⏱ {saldo} trabalhadas hoje</div>
        )}

        {/* Botão único */}
        {!todosFeitos && (
          <button
            className="btn btn-p"
            style={{ width: '100%', padding: 16, fontSize: 15, fontWeight: 700, background: PONTO_COLORS[proximoTipo], border: 'none', justifyContent: 'center' }}
            onClick={registrar}
            disabled={loading}
          >
            {loading ? 'Registrando...' : `Registrar ${PONTO_LABELS[proximoTipo]}`}
          </button>
        )}
      </div>

      {/* Registros do dia */}
      <div style={{ fontWeight: 600, marginBottom: 10 }}>Meus registros de hoje</div>
      {registrosHoje.length === 0 ? <Empty text="Nenhum registro hoje" /> : registrosHoje.map((p, i) => {
        const tm = normTipoMarcacao(p)
        return (
          <div key={p.id} className="li" style={{ cursor: 'default' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: PONTO_BG[tm] || 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: PONTO_COLORS[tm] || 'var(--t2)' }}>{i + 1}</span>
            </div>
            <div className="li-main">
              <div className="li-title" style={{ color: PONTO_COLORS[tm] }}>{PONTO_LABELS[tm] || p.tipo}</div>
              <div className="li-sub">
                {new Date(p.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                {p.dentro_cerca === false && <span style={{ color: 'var(--amber)', marginLeft: 8 }}>⚠️ fora da cerca</span>}
              </div>
            </div>
            <span style={{ fontSize: 11, color: p.dentro_cerca === false ? 'var(--amber)' : 'var(--green)' }}>
              {p.dentro_cerca === false ? '🟡' : p.latitude ? '🟢' : '⚪'}
            </span>
          </div>
        )
      })}

      {/* Equipe (gestor) */}
      {isGestor && Object.keys(porFuncionario).length > 0 && (
        <>
          <div style={{ fontWeight: 600, marginBottom: 12, marginTop: 28 }}>Ponto da equipe hoje</div>
          {Object.values(porFuncionario).map(func => {
            const h = calcSaldoHoras(func.pontos)
            return (
              <div className="card" key={func.nome} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' }}>
                  <div style={{ fontWeight: 600 }}>{func.nome}</div>
                  {h && <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>⏱ {h}</span>}
                </div>
                {func.pontos.map(p => {
                  const tm = normTipoMarcacao(p)
                  return (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderTop: '1px solid var(--border)', fontSize: 13 }}>
                      <span style={{ color: PONTO_COLORS[tm] || 'var(--t2)' }}>{PONTO_LABELS[tm] || p.tipo}</span>
                      <span>{new Date(p.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </>
      )}

      {/* Comprovante */}
      {comprovante && (
        <div className="overlay" onClick={() => setComprovante(null)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="mh"><h2>Comprovante de Ponto</h2></div>
            <div className="mb" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>
                {comprovante.dentroCerca ? '🟢' : '🟡'}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: PONTO_COLORS[comprovante.tipo], marginBottom: 4 }}>
                {PONTO_LABELS[comprovante.tipo]}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
                {comprovante.horario.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16 }}>
                {comprovante.horario.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div style={{ fontSize: 12, color: comprovante.dentroCerca ? 'var(--green)' : 'var(--amber)', marginBottom: 8, fontWeight: 600 }}>
                {comprovante.dentroCerca ? '✅ Dentro da área da loja' : '⚠️ Fora da área esperada — DP será notificado'}
              </div>
              {comprovante.geo && (
                <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8 }}>
                  📍 {comprovante.geo.lat.toFixed(5)}, {comprovante.geo.lon.toFixed(5)}
                  {comprovante.distancia != null && ` · ${comprovante.distancia}m da loja`}
                </div>
              )}
              {!comprovante.geo && (
                <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8 }}>📍 Localização não disponível</div>
              )}
              <button className="btn btn-p" style={{ width: '100%', marginTop: 8, justifyContent: 'center' }} onClick={() => setComprovante(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// GERENCIAMENTO DE PERMISSÕES
// ============================================================
function GerenciamentoPermissoes() {
  const [usuarios, setUsuarios] = useState([])
  const [perfisDB, setPerfisDB] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroPerfil, setFiltroPerfil] = useState('')
  const [filtroLoja, setFiltroLoja] = useState('')
  const [editando, setEditando] = useState(null)
  const [editForm, setEditForm] = useState({ perfil: '', loja: '', modulos: [] })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    Promise.all([usuariosService.list(), perfisAcessoService.list()])
      .then(([users, perfis]) => { setUsuarios(users); setPerfisDB(perfis) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const getBaseModulos = useCallback((perfilNome) => {
    const perfilDB = perfisDB.find(p => p.perfil === perfilNome)
    return perfilDB?.modulos || PROFILE_PAGES[perfilNome] || []
  }, [perfisDB])

  const abrirEditor = (u) => {
    const perfilNome = u.perfil || u.role || 'vendedor'
    const baseModulos = getBaseModulos(perfilNome)
    const extras = u.permissoes_extras || {}
    let efetivos = [...baseModulos]
    if (extras.modulos_adicionais?.length) efetivos = [...new Set([...efetivos, ...extras.modulos_adicionais])]
    if (extras.modulos_removidos?.length) efetivos = efetivos.filter(m => !extras.modulos_removidos.includes(m))
    setEditando(u)
    setEditForm({ perfil: perfilNome, loja: u.loja || '', modulos: efetivos })
  }

  const onPerfilChange = (newPerfil) => {
    const baseModulos = getBaseModulos(newPerfil)
    setEditForm(f => ({ ...f, perfil: newPerfil, modulos: baseModulos }))
  }

  const toggleModulo = (mod) => {
    setEditForm(f => ({
      ...f,
      modulos: f.modulos.includes(mod) ? f.modulos.filter(m => m !== mod) : [...f.modulos, mod],
    }))
  }

  const salvar = async () => {
    if (!editando) return
    setSalvando(true)
    try {
      const baseModulos = getBaseModulos(editForm.perfil)
      const modulos_adicionais = editForm.modulos.filter(m => !baseModulos.includes(m))
      const modulos_removidos = baseModulos.filter(m => !editForm.modulos.includes(m))
      const updates = {
        perfil: editForm.perfil,
        loja: editForm.loja || null,
        permissoes_extras: { modulos_adicionais, modulos_removidos },
      }
      await usuariosService.update(editando.id, updates)
      setUsuarios(prev => prev.map(u => u.id === editando.id ? { ...u, ...updates } : u))
      toast.success('Permissões salvas com sucesso!')
      setEditando(null)
    } catch (e) {
      toast.error(e.message || 'Erro ao salvar permissões')
    } finally {
      setSalvando(false)
    }
  }

  const filtered = usuarios.filter(u => {
    const nome = (u.full_name || u.email || '').toLowerCase()
    if (busca && !nome.includes(busca.toLowerCase())) return false
    if (filtroPerfil && (u.perfil || u.role) !== filtroPerfil) return false
    if (filtroLoja && u.loja !== filtroLoja) return false
    return true
  })

  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 14 }}>Gerenciamento de Permissões</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        <input className="fi" placeholder="Buscar por nome..." value={busca} onChange={e => setBusca(e.target.value)} />
        <select className="fi" value={filtroPerfil} onChange={e => setFiltroPerfil(e.target.value)}>
          <option value="">Todos os perfis</option>
          {Object.entries(PROFILE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="fi" value={filtroLoja} onChange={e => setFiltroLoja(e.target.value)}>
          <option value="">Todas as lojas</option>
          {LOJAS_GRUPO.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? <Empty text="Nenhum usuário encontrado" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(u => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg2)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{u.full_name || u.email}</div>
                <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>
                  {PROFILE_LABELS[u.perfil || u.role] || u.role} · {u.loja || 'Sem loja'}
                </div>
              </div>
              <Btn variant="secondary" size="sm" onClick={() => abrirEditor(u)}>Editar</Btn>
            </div>
          ))}
        </div>
      )}

      {editando && (
        <Modal title={`Permissões — ${editando.full_name || editando.email}`} onClose={() => setEditando(null)} size="lg">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="grid2">
              <div className="fg">
                <label className="fl">Perfil Base</label>
                <select className="fi" value={editForm.perfil} onChange={e => onPerfilChange(e.target.value)}>
                  <option value="">Selecionar...</option>
                  {Object.entries(PROFILE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="fg">
                <label className="fl">Loja Vinculada</label>
                <LojaSelect value={editForm.loja} onChange={loja => setEditForm(f => ({ ...f, loja }))} />
              </div>
            </div>

            <div>
              <label className="fl" style={{ marginBottom: 10 }}>Módulos Habilitados</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 6 }}>
                {_ALL_PAGES.map(mod => {
                  const enabled = editForm.modulos.includes(mod)
                  const baseModulos = getBaseModulos(editForm.perfil)
                  const isBase = baseModulos.includes(mod)
                  const isExtra = enabled && !isBase
                  return (
                    <label key={mod} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: enabled ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--bg3)', borderRadius: 8, cursor: 'pointer', border: `1px solid ${enabled ? 'var(--accent)' : 'var(--border)'}`, transition: 'all .15s' }}>
                      <input type="checkbox" checked={enabled} onChange={() => toggleModulo(mod)} style={{ accentColor: 'var(--accent)', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, flex: 1 }}>{PAGE_LABELS[mod] || mod}</span>
                      {isExtra && <span style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 700 }}>+</span>}
                    </label>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="primary" loading={salvando} onClick={salvar}>Salvar Permissões</Btn>
              <Btn variant="secondary" onClick={() => setEditando(null)} disabled={salvando}>Cancelar</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ============================================================
// CONFIGURACOES
// ============================================================
function AparenciaConfig() {
  const { reloadBgConfig } = useContext(AppCtx)
  const [cfg, setCfg] = useState({ bg_imagem_1: null, bg_imagem_2: null, bg_imagem_3: null, bg_imagem_ativa: null, bg_blur_intensidade: 8, bg_overlay_opacidade: 40 })
  const [uploading, setUploading] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    configSistemaService.get().then(d => { if (d) setCfg(p => ({ ...p, ...d })) }).catch(() => {})
  }, [])

  const upload = async (slot, file) => {
    setUploading(p => ({ ...p, [slot]: true }))
    try {
      const ext = file.name.split('.').pop()
      const path = `bg/slot${slot}_${Date.now()}.${ext}`
      const old = cfg[`bg_imagem_${slot}`]
      if (old) {
        const seg = old.split('/object/public/sistema-assets/')[1]
        if (seg) await supabase.storage.from('sistema-assets').remove([decodeURIComponent(seg)])
      }
      const { error } = await supabase.storage.from('sistema-assets').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: pub } = supabase.storage.from('sistema-assets').getPublicUrl(path)
      const updates = { [`bg_imagem_${slot}`]: pub.publicUrl }
      await configSistemaService.save(updates)
      setCfg(p => ({ ...p, ...updates }))
      reloadBgConfig()
      toast.success('Imagem salva!')
    } catch { toast.error('Erro no upload') }
    setUploading(p => ({ ...p, [slot]: false }))
  }

  const ativar = async (slot) => {
    const key = slot ? `bg_imagem_${slot}` : null
    await configSistemaService.save({ bg_imagem_ativa: key }).catch(() => {})
    setCfg(p => ({ ...p, bg_imagem_ativa: key }))
    reloadBgConfig()
    toast.success(slot ? 'Imagem ativada como fundo!' : 'Fundo desativado')
  }

  const remover = async (slot) => {
    try {
      const url = cfg[`bg_imagem_${slot}`]
      if (url) {
        const seg = url.split('/object/public/sistema-assets/')[1]
        if (seg) await supabase.storage.from('sistema-assets').remove([decodeURIComponent(seg)])
      }
    } catch {}
    const updates = { [`bg_imagem_${slot}`]: null }
    if (cfg.bg_imagem_ativa === `bg_imagem_${slot}`) updates.bg_imagem_ativa = null
    await configSistemaService.save(updates).catch(() => {})
    setCfg(p => ({ ...p, ...updates }))
    reloadBgConfig()
    toast.success('Imagem removida')
  }

  const salvarSliders = async () => {
    setSaving(true)
    try {
      await configSistemaService.save({ bg_blur_intensidade: cfg.bg_blur_intensidade, bg_overlay_opacidade: cfg.bg_overlay_opacidade })
      reloadBgConfig()
      toast.success('Configurações salvas!')
    } catch { toast.error('Erro ao salvar') }
    setSaving(false)
  }

  const previewUrl = cfg.bg_imagem_ativa ? cfg[cfg.bg_imagem_ativa] : null

  return (
    <div>
      <div style={{ fontWeight:600, marginBottom:14 }}>Imagens de Fundo</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>
        {[1,2,3].map(slot => {
          const url = cfg[`bg_imagem_${slot}`]
          const isActive = cfg.bg_imagem_ativa === `bg_imagem_${slot}`
          return (
            <div key={slot} style={{ border:`2px solid ${isActive?'var(--accent)':'var(--border)'}`, borderRadius:12, overflow:'hidden', background:'var(--bg2)', transition:'border-color 200ms ease' }}>
              <div style={{ height:120, position:'relative', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg3)' }}>
                {url
                  ? <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : <div style={{ textAlign:'center', color:'var(--t3)' }}><div style={{ fontSize:28 }}>🖼️</div><div style={{ fontSize:11, marginTop:4 }}>Sem imagem</div></div>
                }
                {isActive && <div style={{ position:'absolute', top:6, right:6, background:'var(--accent)', color:'#fff', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:6 }}>ATIVO</div>}
              </div>
              <div style={{ padding:10 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--t2)', marginBottom:8 }}>Imagem {slot}</div>
                <div style={{ display:'flex', gap:6 }}>
                  <label style={{ flex:1, cursor: uploading[slot] ? 'not-allowed' : 'pointer' }}>
                    <input type="file" accept="image/*" style={{ display:'none' }} disabled={!!uploading[slot]} onChange={e => e.target.files[0] && upload(slot, e.target.files[0])} />
                    <div className="btn btn-g btn-sm" style={{ textAlign:'center', cursor:'inherit', userSelect:'none' }}>{uploading[slot] ? '...' : '⬆ Upload'}</div>
                  </label>
                  {url && !isActive && <button className="btn btn-p btn-sm" style={{ flex:1 }} onClick={() => ativar(slot)}>Ativar</button>}
                  {url && isActive && <button className="btn btn-g btn-sm" style={{ flex:1 }} onClick={() => ativar(null)}>Desativar</button>}
                  {url && <button className="btn btn-sm" style={{ background:'rgba(239,68,68,0.15)', color:'#ef4444' }} onClick={() => remover(slot)}>🗑</button>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ background:'var(--bg2)', borderRadius:12, padding:16, marginBottom:12 }}>
        <div style={{ fontWeight:600, fontSize:13, marginBottom:10 }}>Intensidade do Blur</div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <input type="range" min={0} max={20} value={cfg.bg_blur_intensidade??8} onChange={e => setCfg(p => ({ ...p, bg_blur_intensidade:+e.target.value }))} style={{ flex:1, accentColor:'var(--accent)' }} />
          <span style={{ minWidth:36, fontSize:13, color:'var(--t1)' }}>{cfg.bg_blur_intensidade??8}px</span>
        </div>
        {previewUrl && (
          <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:12, color:'var(--t3)' }}>Preview:</span>
            <div style={{ width:80, height:40, borderRadius:6, overflow:'hidden' }}>
              <img src={previewUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', filter:`blur(${(cfg.bg_blur_intensidade??8)*0.35}px)`, transform:'scale(1.1)' }} />
            </div>
          </div>
        )}
      </div>

      <div style={{ background:'var(--bg2)', borderRadius:12, padding:16, marginBottom:20 }}>
        <div style={{ fontWeight:600, fontSize:13, marginBottom:10 }}>Opacidade do Overlay Escuro</div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <input type="range" min={0} max={80} value={cfg.bg_overlay_opacidade??40} onChange={e => setCfg(p => ({ ...p, bg_overlay_opacidade:+e.target.value }))} style={{ flex:1, accentColor:'var(--accent)' }} />
          <span style={{ minWidth:36, fontSize:13, color:'var(--t1)' }}>{cfg.bg_overlay_opacidade??40}%</span>
        </div>
      </div>

      <button className="btn btn-p" onClick={salvarSliders} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Configurações'}</button>
    </div>
  )
}

function Configuracoes() {
  const { perfil, isAdmin } = useAuth()
  const [tab, setTab] = useState('geral')

  return (
    <div className="page">
      <div className="ph"><h1>Configurações</h1></div>

      <div style={{ display:'flex', gap:0, marginBottom:20, borderBottom:'1px solid var(--border)' }}>
        {[['geral','Geral'], ...(isAdmin ? [['aparencia','Aparência']] : [])].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding:'8px 18px', border:'none', background:'transparent', cursor:'pointer', fontSize:13, fontWeight:600,
            color: tab===id ? 'var(--accent)' : 'var(--t3)',
            borderBottom: tab===id ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom:-1, transition:'all 150ms ease', fontFamily:'var(--font)',
          }}>{label}</button>
        ))}
      </div>

      {tab === 'geral' && <>
        <div className="card" style={{ marginBottom:16 }}>
          <div style={{ fontWeight:600, marginBottom:14 }}>Minha conta</div>
          <div className="grid2">
            <div className="fg"><label className="fl">Nome</label><input className="fi" defaultValue={perfil?.full_name} disabled /></div>
            <div className="fg"><label className="fl">Email</label><input className="fi" defaultValue={perfil?.email} disabled /></div>
          </div>
          <div className="fg"><label className="fl">Cargo</label><input className="fi" defaultValue={perfil?.perfil||perfil?.role} disabled style={{ textTransform:'capitalize' }} /></div>
        </div>
        <div className="card" style={{ marginBottom:16 }}>
          <div style={{ fontWeight:600, marginBottom:14 }}>Sistema</div>
          <div style={{ fontSize:13, color:'var(--t2)', marginBottom:8 }}>Banco de dados: <span style={{ color:'var(--green)', fontWeight:500 }}>● Conectado</span></div>
          <div style={{ fontSize:13, color:'var(--t2)', marginBottom:8 }}>Versão: <span style={{ color:'var(--t1)' }}>2.1.0</span></div>
          <div style={{ fontSize:13, color:'var(--t2)' }}>Projeto: <span style={{ color:'var(--t1)', fontFamily:'var(--mono)', fontSize:12 }}>kwccjkqltllypbmaisio</span></div>
        </div>
        {isAdmin && (
          <div className="card" style={{ marginBottom:16 }}>
            <div style={{ fontWeight:600, marginBottom:12 }}>Administração</div>
            <div style={{ fontSize:13, color:'var(--t2)', marginBottom:12 }}>Para criar novos usuários com senha, acesse o Supabase Dashboard.</div>
            <a href="https://supabase.com/dashboard/project/kwccjkqltllypbmaisio/auth/users" target="_blank" rel="noreferrer">
              <button className="btn btn-g btn-sm">Abrir Supabase Auth ↗</button>
            </a>
          </div>
        )}
        {isAdmin && <div className="card"><GerenciamentoPermissoes /></div>}
      </>}

      {tab === 'aparencia' && isAdmin && (
        <div className="card"><AparenciaConfig /></div>
      )}
    </div>
  )
}

// ============================================================
// CADASTROS
// ============================================================
function HistoricoClienteModal({ cliente, onClose }) {
  const [contatos, setContatos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [novoForm, setNovoForm] = useState({ tipo:'WhatsApp', assunto:'', resultado:'', proximo_contato:'' })
  const [salvando, setSalvando] = useState(false)
  const TIPOS = ['WhatsApp','Telefone','Email','Visita','Outro']

  useEffect(() => {
    supabase.from('contatos_historico').select('*').eq('cliente_id', cliente.id).order('created_at', { ascending: false })
      .then(({ data }) => { setContatos(data||[]); setCarregando(false) })
      .catch(() => setCarregando(false))
  }, [cliente.id])

  const salvar = async () => {
    if (!novoForm.assunto) return
    setSalvando(true)
    try {
      const { data } = await supabase.from('contatos_historico').insert({ ...novoForm, cliente_id: cliente.id, cliente_nome: cliente.nome }).select().single()
      if (data) setContatos(p => [data, ...p])
      setNovoForm({ tipo:'WhatsApp', assunto:'', resultado:'', proximo_contato:'' })
    } catch {}
    setSalvando(false)
  }

  const ICONE = { WhatsApp:'💬', Telefone:'📞', Email:'📧', Visita:'🏠', Outro:'📝' }

  return (
    <Modal title={`Histórico — ${cliente.nome}`} onClose={onClose}>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontWeight:600, fontSize:13, marginBottom:8 }}>+ Novo contato</div>
        <div className="grid2">
          <div className="fg"><label className="fl">Tipo</label>
            <select className="fi" value={novoForm.tipo} onChange={e => setNovoForm(p => ({ ...p, tipo: e.target.value }))}>
              {TIPOS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="fg"><label className="fl">Próximo contato</label><input className="fi" type="date" value={novoForm.proximo_contato} onChange={e => setNovoForm(p => ({ ...p, proximo_contato: e.target.value }))} /></div>
          <div className="fg" style={{ gridColumn:'1/-1' }}><label className="fl">Assunto *</label><input className="fi" value={novoForm.assunto} onChange={e => setNovoForm(p => ({ ...p, assunto: e.target.value }))} /></div>
          <div className="fg" style={{ gridColumn:'1/-1' }}><label className="fl">Resultado</label><input className="fi" value={novoForm.resultado} onChange={e => setNovoForm(p => ({ ...p, resultado: e.target.value }))} /></div>
        </div>
        <button className="btn btn-p btn-sm" onClick={salvar} disabled={salvando || !novoForm.assunto}>{salvando?'...':'Registrar'}</button>
      </div>
      <div style={{ borderTop:'1px solid var(--border)', paddingTop:12 }}>
        <div style={{ fontWeight:600, fontSize:13, marginBottom:8 }}>Linha do tempo</div>
        {carregando ? <Spinner /> : contatos.length === 0 ? <Empty text="Nenhum contato registrado" /> : (
          <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:300, overflowY:'auto' }}>
            {contatos.map(c => (
              <div key={c.id} style={{ display:'flex', gap:10, paddingBottom:8, borderBottom:'1px solid var(--border)' }}>
                <div style={{ fontSize:20, flexShrink:0 }}>{ICONE[c.tipo]||'📝'}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:13 }}>{c.assunto}</div>
                  {c.resultado && <div style={{ fontSize:12, color:'var(--t2)' }}>{c.resultado}</div>}
                  <div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}>
                    {c.tipo} · {new Date(c.created_at).toLocaleDateString('pt-BR')}
                    {c.proximo_contato && ` · Próx: ${new Date(c.proximo_contato+'T12:00').toLocaleDateString('pt-BR')}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

function CadClientes() {
  const { data: lista, loading, reload } = useData(() => clientesService.list(), [])
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(null) // null | { mode:'new'|'edit', item }
  const empty = { nome:'', cpf_cnpj:'', telefone:'', email:'', endereco:'', cidade:'', estado:'', cep:'', observacoes:'' }
  const [form, setForm] = useState(empty)
  const act = useAction()

  const abrirNovo = () => { setForm(empty); setModal({ mode:'new' }) }
  const abrirEdit = (it) => { setForm({ ...empty, ...it }); setModal({ mode:'edit', item: it }) }
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const salvar = async () => {
    if (!form.nome.trim()) return toast.error('Nome obrigatório')
    try {
      if (modal.mode === 'new') await act.run(() => clientesService.create({ ...form }))
      else await act.run(() => clientesService.update(modal.item.id, form))
      toast.success('Salvo com sucesso')
      setModal(null)
      reload()
    } catch (e) { toast.error(e.message) }
  }

  const excluir = async (id) => {
    if (!confirm('Excluir cliente?')) return
    try { await act.run(() => clientesService.remove(id)); reload() } catch (e) { toast.error(e.message) }
  }

  const filtrado = (lista || []).filter(c => c.nome?.toLowerCase().includes(busca.toLowerCase()) || c.cpf_cnpj?.includes(busca) || c.telefone?.includes(busca))
  const { paged, page, setPage, totalPages, total } = usePagination(filtrado)

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'center' }}>
        <input className="fi" style={{ flex:1 }} placeholder="Buscar cliente..." value={busca} onChange={e => { setBusca(e.target.value); setPage(1) }} />
        <button className="btn btn-p btn-sm" onClick={abrirNovo}>+ Novo</button>
      </div>
      {loading ? <Spinner /> : filtrado.length === 0 ? <Empty text="Nenhum cliente cadastrado" /> : (
        <>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {paged.map(c => (
            <div key={c.id} className="card" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{c.nome}</div>
                <div style={{ fontSize:12, color:'var(--t2)' }}>{[c.cpf_cnpj, c.telefone, c.cidade].filter(Boolean).join(' · ')}</div>
              </div>
              <button className="btn btn-s btn-sm" onClick={() => setModal({ mode:'historico', item:c })}>Histórico</button>
              <button className="btn btn-s btn-sm" onClick={() => abrirEdit(c)}>Editar</button>
              <button className="btn btn-g btn-sm" onClick={() => excluir(c.id)}>✕</button>
            </div>
          ))}
        </div>
        {totalPages > 1 && (
          <div style={{ display:'flex', gap:6, justifyContent:'center', marginTop:12 }}>
            <button className="btn btn-s btn-sm" disabled={page===1} onClick={() => setPage(p=>p-1)}>←</button>
            <span style={{ fontSize:13, color:'var(--t2)', lineHeight:'32px' }}>{page} / {totalPages} ({total})</span>
            <button className="btn btn-s btn-sm" disabled={page===totalPages} onClick={() => setPage(p=>p+1)}>→</button>
          </div>
        )}
        </>
      )}
      {modal && modal.mode !== 'historico' && (
        <Modal title={modal.mode === 'new' ? 'Novo Cliente' : 'Editar Cliente'} onClose={() => setModal(null)}>
          <div className="grid2">
            <div className="fg"><label className="fl">Nome *</label><input className="fi" value={form.nome} onChange={up('nome')} /></div>
            <div className="fg"><label className="fl">CPF/CNPJ</label><input className="fi" value={form.cpf_cnpj} onChange={up('cpf_cnpj')} /></div>
            <div className="fg"><label className="fl">Telefone</label><input className="fi" value={form.telefone} onChange={up('telefone')} inputMode="tel" /></div>
            <div className="fg"><label className="fl">Email</label><input className="fi" value={form.email} onChange={up('email')} inputMode="email" /></div>
          </div>
          <div className="fg"><label className="fl">Endereço</label><input className="fi" value={form.endereco} onChange={up('endereco')} /></div>
          <div className="grid2">
            <div className="fg"><label className="fl">Cidade</label><input className="fi" value={form.cidade} onChange={up('cidade')} /></div>
            <div className="fg"><label className="fl">CEP</label><input className="fi" value={form.cep} onChange={up('cep')} /></div>
          </div>
          <div className="fg"><label className="fl">Observações</label><textarea className="fi" value={form.observacoes} onChange={up('observacoes')} rows={2} /></div>
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button className="btn btn-p" style={{ flex:1 }} onClick={salvar} disabled={act.loading}>{act.loading ? 'Salvando...' : 'Salvar'}</button>
            <button className="btn btn-s" onClick={() => setModal(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
      {modal?.mode === 'historico' && <HistoricoClienteModal cliente={modal.item} onClose={() => setModal(null)} />}
    </div>
  )
}

function CadFornecedores() {
  const { data: lista, loading, reload } = useData(() => fornecedoresService.list(), [])
  const { data: todosReps } = useData(() => representantesService.list(), [])
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(null)
  const [vincModal, setVincModal] = useState(null)
  const empty = { nome:'', cnpj:'', contato:'', telefone:'', email:'', categoria:'', observacoes:'' }
  const [form, setForm] = useState(empty)
  const act = useAction()
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const salvar = async () => {
    if (!form.nome.trim()) return toast.error('Nome obrigatório')
    try {
      if (!modal.item) await act.run(() => fornecedoresService.create(form))
      else await act.run(() => fornecedoresService.update(modal.item.id, form))
      toast.success('Salvo'); setModal(null); reload()
    } catch (e) { toast.error(e.message) }
  }

  const excluir = async (id) => {
    if (!confirm('Excluir fornecedor?')) return
    try { await fornecedoresService.remove(id); reload() } catch (e) { toast.error(e.message) }
  }

  const vincularRep = async (repId) => {
    try {
      await representantesService.update(repId, { fornecedor_id: vincModal.id })
      toast.success('Representante vinculado'); setVincModal(null)
    } catch (e) { toast.error(e.message) }
  }

  const filtrado = (lista || []).filter(c => c.nome?.toLowerCase().includes(busca.toLowerCase()))

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        <input className="fi" style={{ flex:1 }} placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} />
        <button className="btn btn-p btn-sm" onClick={() => { setForm(empty); setModal({}) }}>+ Novo</button>
      </div>
      {loading ? <Spinner /> : filtrado.length === 0 ? <Empty text="Nenhum fornecedor" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {filtrado.map(f => (
            <div key={f.id} className="card" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{f.nome}</div>
                <div style={{ fontSize:12, color:'var(--t2)' }}>{[f.cnpj, f.categoria, f.telefone].filter(Boolean).join(' · ')}</div>
              </div>
              <button className="btn btn-s btn-sm" onClick={() => { setForm({ ...empty, ...f }); setModal({ item:f }) }}>Editar</button>
              <button className="btn btn-g btn-sm" onClick={() => excluir(f.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <Modal title={modal.item ? 'Editar Fornecedor' : 'Novo Fornecedor'} onClose={() => setModal(null)}>
          <div className="grid2">
            <div className="fg"><label className="fl">Nome *</label><input className="fi" value={form.nome} onChange={up('nome')} /></div>
            <div className="fg"><label className="fl">CNPJ</label><input className="fi" value={form.cnpj||''} onChange={up('cnpj')} /></div>
            <div className="fg"><label className="fl">Contato</label><input className="fi" value={form.contato||''} onChange={up('contato')} /></div>
            <div className="fg"><label className="fl">Telefone</label><input className="fi" type="tel" value={form.telefone||''} onChange={up('telefone')} /></div>
            <div className="fg"><label className="fl">Email</label><input className="fi" value={form.email||''} onChange={up('email')} /></div>
            <div className="fg"><label className="fl">Categoria</label><input className="fi" value={form.categoria||''} onChange={up('categoria')} placeholder="Ex: Móveis, Tecidos..." /></div>
          </div>
          <div className="fg"><label className="fl">Observações</label><textarea className="fi" value={form.observacoes||''} onChange={up('observacoes')} rows={2} /></div>
          {modal.item && (
            <div style={{ marginTop:16 }}>
              <div style={{ fontWeight:600, fontSize:13, marginBottom:8 }}>Representantes vinculados</div>
              {(todosReps||[]).filter(r => r.fornecedor_id === modal.item.id).length === 0
                ? <div style={{ fontSize:12, color:'var(--t3)', marginBottom:8 }}>Nenhum representante vinculado</div>
                : (todosReps||[]).filter(r => r.fornecedor_id === modal.item.id).map(r => (
                  <div key={r.id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, fontSize:13 }}>
                    <span>{r.nome}</span>
                    {r.telefone && <span style={{ color:'var(--t3)', fontSize:11 }}>{r.telefone}</span>}
                  </div>
                ))
              }
              <button className="btn btn-s btn-sm" onClick={() => setVincModal(modal.item)}>+ Vincular Representante</button>
            </div>
          )}
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button className="btn btn-p" style={{ flex:1 }} onClick={salvar} disabled={act.loading}>{act.loading ? '...' : 'Salvar'}</button>
            <button className="btn btn-s" onClick={() => setModal(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
      {vincModal && (
        <Modal title="Vincular Representante" onClose={() => setVincModal(null)}>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {(todosReps||[]).filter(r => !r.fornecedor_id || r.fornecedor_id !== vincModal.id).map(r => (
              <div key={r.id} className="card" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', cursor:'pointer' }} onClick={() => vincularRep(r.id)}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600 }}>{r.nome}</div>
                  {r.telefone && <div style={{ fontSize:12, color:'var(--t2)' }}>{r.telefone}</div>}
                </div>
              </div>
            ))}
            {(todosReps||[]).filter(r => !r.fornecedor_id || r.fornecedor_id !== vincModal.id).length === 0 && (
              <Empty text="Nenhum representante disponível" />
            )}
          </div>
          <button className="btn btn-s" style={{ marginTop:8 }} onClick={() => setVincModal(null)}>Fechar</button>
        </Modal>
      )}
    </div>
  )
}

function CadCatalogo() {
  const { data: lista, loading, reload } = useData(() => catalogoService.list(), [])
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [modal, setModal] = useState(null)
  const [detalhe, setDetalhe] = useState(null)
  const empty = { nome:'', tipo:'produto', referencia:'', preco_custo:'', preco_venda:'', unidade:'un', estoque_atual:0, estoque_minimo:0, descricao:'', fotos:[] }
  const [form, setForm] = useState(empty)
  const [fotosNovas, setFotosNovas] = useState([]) // { file, preview }
  const [fotosExistentes, setFotosExistentes] = useState([]) // URLs já salvas
  const act = useAction()
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const TIPOS = ['produto','serviço','peça','matéria-prima']

  const abrirModal = (item) => {
    if (item) {
      setForm({ ...empty, ...item })
      setFotosExistentes(item.fotos || [])
    } else {
      setForm(empty)
      setFotosExistentes([])
    }
    setFotosNovas([])
    setModal({ item: item || null })
  }

  const onFotoChange = (e) => {
    const files = Array.from(e.target.files || [])
    const totalFotos = fotosExistentes.length + fotosNovas.length + files.length
    if (totalFotos > 5) return toast.error('Máximo 5 fotos por produto')
    const novas = files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))
    setFotosNovas(p => [...p, ...novas])
    e.target.value = ''
  }

  const removerFotoNova = (idx) => setFotosNovas(p => p.filter((_, i) => i !== idx))
  const removerFotoExistente = (idx) => setFotosExistentes(p => p.filter((_, i) => i !== idx))

  const salvar = async () => {
    if (!form.nome.trim()) return toast.error('Nome obrigatório')
    const totalFotos = fotosExistentes.length + fotosNovas.length
    if (totalFotos < 1) return toast.error('Obrigatório pelo menos 1 foto do produto')
    try {
      const payload = {
        ...form,
        preco_custo: parseFloat(form.preco_custo)||0,
        preco_venda: parseFloat(form.preco_venda)||0,
        estoque_atual: parseInt(form.estoque_atual)||0,
        estoque_minimo: parseInt(form.estoque_minimo)||0,
      }
      let savedItem
      if (!modal.item) {
        savedItem = await act.run(() => catalogoService.create({ ...payload, fotos: [] }))
      } else {
        savedItem = modal.item
      }
      // Upload fotos novas
      const urlsNovas = []
      for (const { file } of fotosNovas) {
        try {
          const url = await catalogoService.uploadFoto(file, savedItem.id)
          urlsNovas.push(url)
        } catch (e) { toast.error('Erro ao enviar foto: ' + e.message) }
      }
      const fotosFinais = [...fotosExistentes, ...urlsNovas]
      if (modal.item) {
        await act.run(() => catalogoService.update(modal.item.id, { ...payload, fotos: fotosFinais }))
      } else {
        await catalogoService.update(savedItem.id, { fotos: fotosFinais })
      }
      toast.success('Salvo'); setModal(null); reload()
    } catch (e) { toast.error(e.message) }
  }

  const excluir = async (id) => {
    if (!confirm('Excluir item?')) return
    try { await catalogoService.remove(id); reload() } catch (e) { toast.error(e.message) }
  }

  const filtrado = (lista || []).filter(c =>
    c.nome?.toLowerCase().includes(busca.toLowerCase()) &&
    (!filtroTipo || c.tipo === filtroTipo)
  )

  const fmtMoeda = (v) => (parseFloat(v)||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })
  const calcMarkup = (custo, venda) => {
    const c = parseFloat(custo)||0
    if (!c) return null
    return ((parseFloat(venda)||0 - c) / c * 100).toFixed(1)
  }

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
        <input className="fi" style={{ flex:1, minWidth:140 }} placeholder="Buscar produto..." value={busca} onChange={e => setBusca(e.target.value)} />
        <select className="fi" style={{ width:'auto' }} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="">Todos os tipos</option>
          {TIPOS.map(t => <option key={t}>{t}</option>)}
        </select>
        <button className="btn btn-p btn-sm" onClick={() => abrirModal(null)}>+ Novo</button>
      </div>
      {loading ? <Spinner /> : filtrado.length === 0 ? <Empty text="Nenhum item no catálogo" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {filtrado.map(p => {
            const markup = calcMarkup(p.preco_custo, p.preco_venda)
            const markupNum = parseFloat(markup)
            const markupOk = !markup || markupNum >= 30
            const temFoto = p.fotos && p.fotos.length > 0
            return (
            <div key={p.id} className="card" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', cursor:'pointer' }} onClick={() => setDetalhe(p)}>
              {temFoto
                ? <img src={p.fotos[0]} alt={p.nome} style={{ width:48, height:48, borderRadius:8, objectFit:'cover', flexShrink:0 }} />
                : <div style={{ width:48, height:48, borderRadius:8, background:'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>📷</div>
              }
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <span style={{ fontWeight:600, fontSize:14 }}>{p.nome}</span>
                  <Badge variant="bg">{p.tipo}</Badge>
                  {!temFoto && <Badge variant="bg-red">Sem foto</Badge>}
                  {p.estoque_atual <= p.estoque_minimo && <Badge variant="bg-red">Estoque baixo</Badge>}
                  {markup !== null && (
                    <span style={{ fontSize:11, fontWeight:700, color: markupOk ? 'var(--green)' : 'var(--red)', background: markupOk ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)', padding:'1px 6px', borderRadius:8 }}>
                      {markupNum >= 0 ? '+' : ''}{markup}% markup
                    </span>
                  )}
                </div>
                <div style={{ fontSize:12, color:'var(--t2)', marginTop:2 }}>
                  Custo: {fmtMoeda(p.preco_custo)} · Venda: {fmtMoeda(p.preco_venda)} · Estoque: {p.estoque_atual} {p.unidade}
                </div>
              </div>
              <button className="btn btn-s btn-sm" onClick={e => { e.stopPropagation(); abrirModal(p) }}>Editar</button>
              <button className="btn btn-g btn-sm" onClick={e => { e.stopPropagation(); excluir(p.id) }}>✕</button>
            </div>
          )})}
        </div>
      )}

      {/* Modal detalhe com galeria */}
      {detalhe && (
        <Modal title={detalhe.nome} onClose={() => setDetalhe(null)}>
          {detalhe.fotos && detalhe.fotos.length > 0 ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px,1fr))', gap:8, marginBottom:16 }}>
              {detalhe.fotos.map((url, i) => (
                <img key={i} src={url} alt={`Foto ${i+1}`} style={{ width:'100%', height:120, objectFit:'cover', borderRadius:8 }} />
              ))}
            </div>
          ) : <div style={{ textAlign:'center', padding:'20px 0', color:'var(--t3)' }}>Sem fotos cadastradas</div>}
          <div className="grid2" style={{ marginTop:8 }}>
            <div><div style={{ fontSize:11, color:'var(--t2)' }}>Tipo</div><div>{detalhe.tipo}</div></div>
            <div><div style={{ fontSize:11, color:'var(--t2)' }}>Referência</div><div>{detalhe.referencia||'—'}</div></div>
            <div><div style={{ fontSize:11, color:'var(--t2)' }}>Preço custo</div><div>{fmtMoeda(detalhe.preco_custo)}</div></div>
            <div><div style={{ fontSize:11, color:'var(--t2)' }}>Preço venda</div><div>{fmtMoeda(detalhe.preco_venda)}</div></div>
            <div><div style={{ fontSize:11, color:'var(--t2)' }}>Estoque atual</div><div>{detalhe.estoque_atual} {detalhe.unidade}</div></div>
            <div><div style={{ fontSize:11, color:'var(--t2)' }}>Estoque mínimo</div><div>{detalhe.estoque_minimo} {detalhe.unidade}</div></div>
          </div>
          {detalhe.descricao && <div style={{ marginTop:12, color:'var(--t2)', fontSize:13 }}>{detalhe.descricao}</div>}
          <div style={{ display:'flex', gap:8, marginTop:16 }}>
            <button className="btn btn-p btn-sm" style={{ flex:1 }} onClick={() => { setDetalhe(null); abrirModal(detalhe) }}>Editar</button>
            <button className="btn btn-s btn-sm" onClick={() => setDetalhe(null)}>Fechar</button>
          </div>
        </Modal>
      )}

      {modal && (
        <Modal title={modal.item ? 'Editar Item' : 'Novo Item do Catálogo'} onClose={() => setModal(null)}>
          <div className="grid2">
            <div className="fg"><label className="fl">Nome *</label><input className="fi" value={form.nome} onChange={up('nome')} /></div>
            <div className="fg"><label className="fl">Referência</label><input className="fi" value={form.referencia||''} onChange={up('referencia')} /></div>
            <div className="fg"><label className="fl">Tipo</label>
              <select className="fi" value={form.tipo} onChange={up('tipo')}>
                {TIPOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">Unidade</label><input className="fi" value={form.unidade} onChange={up('unidade')} placeholder="un, m², kg..." /></div>
            <div className="fg"><label className="fl">Preço de Custo (R$)</label><input className="fi" type="number" step="0.01" inputMode="decimal" value={form.preco_custo} onChange={up('preco_custo')} /></div>
            <div className="fg"><label className="fl">Preço de Venda (R$)</label><input className="fi" type="number" step="0.01" inputMode="decimal" value={form.preco_venda} onChange={up('preco_venda')} /></div>
            <div className="fg"><label className="fl">Estoque Atual</label><input className="fi" type="number" value={form.estoque_atual} onChange={up('estoque_atual')} /></div>
            <div className="fg"><label className="fl">Estoque Mínimo</label><input className="fi" type="number" value={form.estoque_minimo} onChange={up('estoque_minimo')} /></div>
          </div>
          <div className="fg"><label className="fl">Descrição</label><textarea className="fi" value={form.descricao||''} onChange={up('descricao')} rows={2} /></div>

          {/* Fotos */}
          <div className="fg">
            <label className="fl">Fotos * (mín. 1, máx. 5)</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:8 }}>
              {fotosExistentes.map((url, i) => (
                <div key={i} style={{ position:'relative' }}>
                  <img src={url} alt="" style={{ width:72, height:72, objectFit:'cover', borderRadius:8 }} />
                  <button onClick={() => removerFotoExistente(i)} style={{ position:'absolute', top:-6, right:-6, background:'var(--red)', border:'none', borderRadius:'50%', width:20, height:20, color:'#fff', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                </div>
              ))}
              {fotosNovas.map((f, i) => (
                <div key={i} style={{ position:'relative' }}>
                  <img src={f.preview} alt="" style={{ width:72, height:72, objectFit:'cover', borderRadius:8, opacity:0.8, border:'2px dashed var(--accent)' }} />
                  <button onClick={() => removerFotoNova(i)} style={{ position:'absolute', top:-6, right:-6, background:'var(--red)', border:'none', borderRadius:'50%', width:20, height:20, color:'#fff', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                </div>
              ))}
              {(fotosExistentes.length + fotosNovas.length) < 5 && (
                <label style={{ width:72, height:72, borderRadius:8, border:'2px dashed var(--border)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--t3)', flexDirection:'column', gap:4, fontSize:11 }}>
                  <span style={{ fontSize:22 }}>+</span>Foto
                  <input type="file" accept="image/*" capture="environment" multiple style={{ display:'none' }} onChange={onFotoChange} />
                </label>
              )}
            </div>
          </div>

          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button className="btn btn-p" style={{ flex:1 }} onClick={salvar} disabled={act.loading}>{act.loading ? 'Salvando...' : 'Salvar'}</button>
            <button className="btn btn-s" onClick={() => setModal(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function CadConfigSistema() {
  const { data: cfg, loading, reload } = useData(() => configSistemaService.get(), [])
  const [form, setForm] = useState({})
  const act = useAction()
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  useEffect(() => { if (cfg) setForm(cfg) }, [cfg])

  const salvar = async () => {
    try {
      await act.run(() => configSistemaService.save(form))
      toast.success('Configurações salvas')
      reload()
    } catch (e) { toast.error(e.message) }
  }

  if (loading) return <Spinner />
  return (
    <div>
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ fontWeight:600, marginBottom:12 }}>Limites de desconto</div>
        <div className="grid2">
          <div className="fg"><label className="fl">Desconto máx. vendedor (%)</label><input className="fi" type="number" step="0.1" value={form.desconto_max_vendedor||''} onChange={up('desconto_max_vendedor')} placeholder="Ex: 5" /></div>
          <div className="fg"><label className="fl">Desconto máx. gerente (%)</label><input className="fi" type="number" step="0.1" value={form.desconto_max_gestor||''} onChange={up('desconto_max_gestor')} placeholder="Ex: 15" /></div>
          <div className="fg"><label className="fl">Desconto máx. diretor (%)</label><input className="fi" type="number" step="0.1" value={form.desconto_max_admin||''} onChange={up('desconto_max_admin')} placeholder="Ex: 30" /></div>
        </div>
      </div>
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ fontWeight:600, marginBottom:12 }}>Comissões</div>
        <div className="grid2">
          <div className="fg"><label className="fl">Comissão vendedor (%)</label><input className="fi" type="number" step="0.1" value={form.comissao_vendedor||''} onChange={up('comissao_vendedor')} placeholder="Ex: 3" /></div>
          <div className="fg"><label className="fl">Comissão gerente (%)</label><input className="fi" type="number" step="0.1" value={form.comissao_gerente||''} onChange={up('comissao_gerente')} placeholder="Ex: 1" /></div>
        </div>
      </div>
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ fontWeight:600, marginBottom:12 }}>Informações da empresa</div>
        <div className="grid2">
          <div className="fg"><label className="fl">Razão social</label><input className="fi" value={form.razao_social||''} onChange={up('razao_social')} /></div>
          <div className="fg"><label className="fl">CNPJ</label><input className="fi" value={form.cnpj||''} onChange={up('cnpj')} /></div>
          <div className="fg"><label className="fl">Telefone</label><input className="fi" value={form.telefone||''} onChange={up('telefone')} type="tel" /></div>
          <div className="fg"><label className="fl">WhatsApp aprovação</label><input className="fi" value={form.whatsapp_aprovacao||''} onChange={up('whatsapp_aprovacao')} placeholder="5531..." /></div>
        </div>
      </div>
      <button className="btn btn-p" onClick={salvar} disabled={act.loading}>{act.loading ? 'Salvando...' : 'Salvar Configurações'}</button>
    </div>
  )
}

function CadLojas() {
  const LOJAS_SEED = [
    { nome:'Movelaria Olga', cnpj:'40.168.987/0001-72' },
    { nome:'Arca Garden', cnpj:'41.777.547/0001-85' },
    { nome:'Santa Comércio', cnpj:'41.919.625/0001-39' },
    { nome:'Templum Comércio', cnpj:'42.289.963/0001-05' },
    { nome:'Templum Minas', cnpj:'42.307.110/0001-40' },
    { nome:'Alpendre Mobiliário', cnpj:'45.635.061/0001-63' },
    { nome:'Feirão', cnpj:'' },
    { nome:'Grupo Versa', cnpj:'09.214.954/0001-71' },
  ]
  const { data: lista, loading, reload } = useData(() => lojasService.list(), [])
  const [modal, setModal] = useState(null)
  const empty = { nome:'', cnpj:'', telefone:'', endereco:'', cidade:'', responsavel:'', ativa:true }
  const [form, setForm] = useState(empty)
  const act = useAction()
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const seed = async () => {
    try {
      await act.run(() => lojasService.upsertByNome(LOJAS_SEED))
      toast.success('Lojas importadas'); reload()
    } catch (e) { toast.error(e.message) }
  }

  const salvar = async () => {
    if (!form.nome) return toast.error('Nome obrigatório')
    try {
      if (!modal.item) await act.run(() => lojasService.create(form))
      else await act.run(() => lojasService.update(modal.item.id, form))
      toast.success('Salvo'); setModal(null); reload()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12, gap:8, flexWrap:'wrap' }}>
        <button className="btn btn-s btn-sm" onClick={seed} disabled={act.loading}>⬆ Importar lojas padrão</button>
        <button className="btn btn-p btn-sm" onClick={() => { setForm(empty); setModal({}) }}>+ Nova Loja</button>
      </div>
      {loading ? <Spinner /> : (lista||[]).length === 0 ? <Empty text="Nenhuma loja cadastrada" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {(lista||[]).map(l => (
            <div key={l.id} className="card" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px' }}>
              <div style={{ width:36, height:36, borderRadius:8, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, flexShrink:0 }}>{l.nome?.[0]}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{l.nome}</div>
                <div style={{ fontSize:12, color:'var(--t2)' }}>{l.cnpj || 'Sem CNPJ'} · {l.cidade || '—'}</div>
              </div>
              <Badge variant={l.ativa===false?'bg':'bg-green'}>{l.ativa===false?'Inativa':'Ativa'}</Badge>
              <button className="btn btn-s btn-sm" onClick={() => { setForm({ ...empty, ...l }); setModal({ item:l }) }}>Editar</button>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <Modal title={modal.item ? 'Editar Loja' : 'Nova Loja'} onClose={() => setModal(null)}>
          <div className="grid2">
            <div className="fg" style={{ gridColumn:'1/-1' }}><label className="fl">Nome *</label><input className="fi" value={form.nome} onChange={up('nome')} /></div>
            <div className="fg"><label className="fl">CNPJ</label><input className="fi" value={form.cnpj||''} onChange={up('cnpj')} /></div>
            <div className="fg"><label className="fl">Telefone</label><input className="fi" value={form.telefone||''} onChange={up('telefone')} type="tel" /></div>
            <div className="fg"><label className="fl">Cidade</label><input className="fi" value={form.cidade||''} onChange={up('cidade')} /></div>
            <div className="fg"><label className="fl">Responsável</label><input className="fi" value={form.responsavel||''} onChange={up('responsavel')} /></div>
            <div className="fg" style={{ gridColumn:'1/-1' }}><label className="fl">Endereço</label><input className="fi" value={form.endereco||''} onChange={up('endereco')} /></div>
            <div className="fg"><label className="fl">Status</label>
              <select className="fi" value={form.ativa===false?'false':'true'} onChange={e => setForm(p => ({ ...p, ativa: e.target.value === 'true' }))}>
                <option value="true">Ativa</option><option value="false">Inativa</option>
              </select>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button className="btn btn-p" style={{ flex:1 }} onClick={salvar} disabled={act.loading}>{act.loading ? '...' : 'Salvar'}</button>
            <button className="btn btn-s" onClick={() => setModal(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function CadDecoradores() {
  const { data: lista, loading, reload } = useData(() => decoradoresService.list(), [])
  const [modal, setModal] = useState(null)
  const empty = { nome:'', telefone:'', email:'', especialidade:'', comissao_rt:0, status:'ativo' }
  const [form, setForm] = useState(empty)
  const act = useAction()
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const salvar = async () => {
    if (!form.nome) return toast.error('Nome obrigatório')
    try {
      if (!modal.item) await act.run(() => decoradoresService.create(form))
      else await act.run(() => decoradoresService.update(modal.item.id, form))
      toast.success('Salvo'); setModal(null); reload()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
        <button className="btn btn-p btn-sm" onClick={() => { setForm(empty); setModal({}) }}>+ Novo Decorador</button>
      </div>
      {loading ? <Spinner /> : (lista||[]).length === 0 ? <Empty text="Nenhum decorador cadastrado" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {(lista||[]).map(d => (
            <div key={d.id} className="card" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px' }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#a78bfa,#6366f1)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, flexShrink:0 }}>{d.nome?.[0]}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{d.nome}</div>
                <div style={{ fontSize:12, color:'var(--t2)' }}>{d.especialidade || '—'} · RT: {d.comissao_rt||0}%</div>
              </div>
              <Badge variant={d.status==='ativo'?'bg-green':'bg'}>{d.status}</Badge>
              <button className="btn btn-s btn-sm" onClick={() => { setForm({ ...empty, ...d }); setModal({ item:d }) }}>Editar</button>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <Modal title={modal.item ? 'Editar Decorador' : 'Novo Decorador'} onClose={() => setModal(null)}>
          <div className="grid2">
            <div className="fg" style={{ gridColumn:'1/-1' }}><label className="fl">Nome *</label><input className="fi" value={form.nome} onChange={up('nome')} /></div>
            <div className="fg"><label className="fl">Telefone</label><input className="fi" value={form.telefone||''} onChange={up('telefone')} type="tel" /></div>
            <div className="fg"><label className="fl">Email</label><input className="fi" value={form.email||''} onChange={up('email')} /></div>
            <div className="fg"><label className="fl">Especialidade</label><input className="fi" value={form.especialidade||''} onChange={up('especialidade')} /></div>
            <div className="fg"><label className="fl">Comissão RT (%)</label><input className="fi" type="number" step="0.1" min="0" value={form.comissao_rt||0} onChange={up('comissao_rt')} /></div>
            <div className="fg"><label className="fl">Status</label>
              <select className="fi" value={form.status} onChange={up('status')}>
                <option value="ativo">Ativo</option><option value="inativo">Inativo</option>
              </select>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button className="btn btn-p" style={{ flex:1 }} onClick={salvar} disabled={act.loading}>{act.loading ? '...' : 'Salvar'}</button>
            <button className="btn btn-s" onClick={() => setModal(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function CadAcabamentos() {
  const { data: lista, loading, reload } = useData(() => acabamentosService.list(), [])
  const [modal, setModal] = useState(null)
  const empty = { nome:'', descricao:'', ativo:true }
  const [form, setForm] = useState(empty)
  const act = useAction()
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const salvar = async () => {
    if (!form.nome) return toast.error('Nome obrigatório')
    try {
      if (!modal.item) await act.run(() => acabamentosService.create(form))
      else await act.run(() => acabamentosService.update(modal.item.id, form))
      toast.success('Salvo'); setModal(null); reload()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
        <button className="btn btn-p btn-sm" onClick={() => { setForm(empty); setModal({}) }}>+ Novo Acabamento</button>
      </div>
      {loading ? <Spinner /> : (lista||[]).length === 0 ? <Empty text="Nenhum acabamento cadastrado" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {(lista||[]).map(a => (
            <div key={a.id} className="card" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{a.nome}</div>
                {a.descricao && <div style={{ fontSize:12, color:'var(--t2)' }}>{a.descricao}</div>}
              </div>
              <Badge variant={a.ativo!==false?'bg-green':'bg'}>{a.ativo!==false?'Ativo':'Inativo'}</Badge>
              <button className="btn btn-s btn-sm" onClick={() => { setForm({ ...empty, ...a }); setModal({ item:a }) }}>Editar</button>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <Modal title={modal.item ? 'Editar Acabamento' : 'Novo Acabamento'} onClose={() => setModal(null)}>
          <div className="fg"><label className="fl">Nome *</label><input className="fi" value={form.nome} onChange={up('nome')} placeholder="Ex: Linho, Veludo, MDF..." /></div>
          <div className="fg"><label className="fl">Descrição</label><input className="fi" value={form.descricao||''} onChange={up('descricao')} /></div>
          <div className="fg"><label className="fl">Status</label>
            <select className="fi" value={form.ativo!==false?'true':'false'} onChange={e => setForm(p => ({ ...p, ativo: e.target.value === 'true' }))}>
              <option value="true">Ativo</option><option value="false">Inativo</option>
            </select>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button className="btn btn-p" style={{ flex:1 }} onClick={salvar} disabled={act.loading}>{act.loading ? '...' : 'Salvar'}</button>
            <button className="btn btn-s" onClick={() => setModal(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function CadTecidos() {
  const { data: lista, loading, reload } = useData(() => tecidosService.list(), [])
  const [modal, setModal] = useState(null)
  const empty = { nome:'', composicao:'', ativo:true }
  const [form, setForm] = useState(empty)
  const act = useAction()
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const salvar = async () => {
    if (!form.nome) return toast.error('Nome obrigatório')
    try {
      if (!modal.item) await act.run(() => tecidosService.create(form))
      else await act.run(() => tecidosService.update(modal.item.id, form))
      toast.success('Salvo'); setModal(null); reload()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
        <button className="btn btn-p btn-sm" onClick={() => { setForm(empty); setModal({}) }}>+ Novo Tecido</button>
      </div>
      {loading ? <Spinner /> : (lista||[]).length === 0 ? <Empty text="Nenhum tecido cadastrado" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {(lista||[]).map(t => (
            <div key={t.id} className="card" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{t.nome}</div>
                {t.composicao && <div style={{ fontSize:12, color:'var(--t2)' }}>{t.composicao}</div>}
              </div>
              <Badge variant={t.ativo!==false?'bg-green':'bg'}>{t.ativo!==false?'Ativo':'Inativo'}</Badge>
              <button className="btn btn-s btn-sm" onClick={() => { setForm({ ...empty, ...t }); setModal({ item:t }) }}>Editar</button>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <Modal title={modal.item ? 'Editar Tecido' : 'Novo Tecido'} onClose={() => setModal(null)}>
          <div className="fg"><label className="fl">Nome *</label><input className="fi" value={form.nome} onChange={up('nome')} placeholder="Ex: Algodão, Sintético, Microfibra..." /></div>
          <div className="fg"><label className="fl">Composição</label><input className="fi" value={form.composicao||''} onChange={up('composicao')} placeholder="Ex: 100% Poliéster" /></div>
          <div className="fg"><label className="fl">Status</label>
            <select className="fi" value={form.ativo!==false?'true':'false'} onChange={e => setForm(p => ({ ...p, ativo: e.target.value === 'true' }))}>
              <option value="true">Ativo</option><option value="false">Inativo</option>
            </select>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button className="btn btn-p" style={{ flex:1 }} onClick={salvar} disabled={act.loading}>{act.loading ? '...' : 'Salvar'}</button>
            <button className="btn btn-s" onClick={() => setModal(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function CadRepresentantes() {
  const { data: lista, loading, reload } = useData(() => representantesService.list(), [])
  const { data: forns } = useData(() => fornecedoresService.list(), [])
  const [busca, setBusca] = useState('')
  const [filtroForn, setFiltroForn] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState('')
  const [modal, setModal] = useState(null)
  const empty = { nome:'', cpf:'', telefone:'', email:'', fornecedor_id:'', comissao_percent:'', regiao:'', observacoes:'', ativo:true }
  const [form, setForm] = useState(empty)
  const act = useAction()
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const salvar = async () => {
    if (!form.nome.trim()) return toast.error('Nome obrigatório')
    try {
      const payload = { ...form, comissao_percent: parseFloat(form.comissao_percent)||0, fornecedor_id: form.fornecedor_id || null }
      if (!modal.item) await act.run(() => representantesService.create(payload))
      else await act.run(() => representantesService.update(modal.item.id, payload))
      toast.success('Salvo'); setModal(null); reload()
    } catch (e) { toast.error(e.message) }
  }

  const excluir = async (id) => {
    if (!confirm('Excluir representante?')) return
    try { await representantesService.remove(id); reload() } catch (e) { toast.error(e.message) }
  }

  const filtrado = (lista || []).filter(r =>
    r.nome?.toLowerCase().includes(busca.toLowerCase()) &&
    (!filtroForn || r.fornecedor_id === filtroForn) &&
    (filtroAtivo === '' || String(r.ativo) === filtroAtivo)
  )

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
        <input className="fi" style={{ flex:1, minWidth:140 }} placeholder="Buscar representante..." value={busca} onChange={e => setBusca(e.target.value)} />
        <select className="fi" style={{ width:'auto' }} value={filtroForn} onChange={e => setFiltroForn(e.target.value)}>
          <option value="">Todos fornecedores</option>
          {(forns||[]).map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
        <select className="fi" style={{ width:'auto' }} value={filtroAtivo} onChange={e => setFiltroAtivo(e.target.value)}>
          <option value="">Todos</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
        <button className="btn btn-p btn-sm" onClick={() => { setForm(empty); setModal({}) }}>+ Novo</button>
      </div>
      {loading ? <Spinner /> : filtrado.length === 0 ? <Empty text="Nenhum representante" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {filtrado.map(r => (
            <div key={r.id} className="card" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px' }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontWeight:600, fontSize:14 }}>{r.nome}</span>
                  <span className={`badge ${r.ativo ? 'bg-green' : 'bg'}`}>{r.ativo ? 'Ativo' : 'Inativo'}</span>
                </div>
                <div style={{ fontSize:12, color:'var(--t2)', marginTop:2 }}>
                  {[r.telefone, r.fornecedores?.nome, r.comissao_percent ? `${r.comissao_percent}%` : null].filter(Boolean).join(' · ')}
                </div>
              </div>
              <button className="btn btn-s btn-sm" onClick={() => { setForm({ ...empty, ...r }); setModal({ item:r }) }}>Editar</button>
              <button className="btn btn-g btn-sm" onClick={() => excluir(r.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <Modal title={modal.item ? 'Editar Representante' : 'Novo Representante'} onClose={() => setModal(null)}>
          <div className="grid2">
            <div className="fg" style={{ gridColumn:'1/-1' }}><label className="fl">Nome *</label><input className="fi" value={form.nome} onChange={up('nome')} /></div>
            <div className="fg"><label className="fl">CPF</label><input className="fi" value={form.cpf||''} onChange={up('cpf')} /></div>
            <div className="fg"><label className="fl">Telefone</label><input className="fi" type="tel" value={form.telefone||''} onChange={up('telefone')} /></div>
            <div className="fg"><label className="fl">Email</label><input className="fi" type="email" value={form.email||''} onChange={up('email')} /></div>
            <div className="fg"><label className="fl">Fornecedor vinculado</label>
              <select className="fi" value={form.fornecedor_id||''} onChange={up('fornecedor_id')}>
                <option value="">Nenhum</option>
                {(forns||[]).map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">Comissão (%)</label><input className="fi" type="number" step="0.01" inputMode="decimal" value={form.comissao_percent||''} onChange={up('comissao_percent')} /></div>
            <div className="fg"><label className="fl">Região de atuação</label><input className="fi" value={form.regiao||''} onChange={up('regiao')} /></div>
            <div className="fg" style={{ display:'flex', alignItems:'center', gap:8, paddingTop:24 }}>
              <input type="checkbox" id="ativo-rep" checked={!!form.ativo} onChange={e => setForm(p => ({ ...p, ativo: e.target.checked }))} />
              <label htmlFor="ativo-rep" style={{ fontSize:13 }}>Ativo</label>
            </div>
          </div>
          <div className="fg"><label className="fl">Observações</label><textarea className="fi" value={form.observacoes||''} onChange={up('observacoes')} rows={2} /></div>
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button className="btn btn-p" style={{ flex:1 }} onClick={salvar} disabled={act.loading}>{act.loading ? '...' : 'Salvar'}</button>
            <button className="btn btn-s" onClick={() => setModal(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Cadastros() {
  const [tab, setTab] = useState('clientes')
  const TABS = [
    { id:'clientes',label:'Clientes' },
    { id:'fornecedores',label:'Fornecedores' },
    { id:'catalogo',label:'Catálogo' },
    { id:'representantes',label:'Representantes' },
    { id:'lojas',label:'Lojas' },
    { id:'decoradores',label:'Decoradores' },
    { id:'acabamentos',label:'Acabamentos' },
    { id:'tecidos',label:'Tecidos' },
    { id:'config',label:'Config. Sistema' },
  ]
  return (
    <div className="page">
      <div className="ph"><h1>Cadastros</h1></div>
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {TABS.map(t => <button key={t.id} className={`btn btn-${tab===t.id?'p':'s'} btn-sm`} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>
      {tab === 'clientes' && <CadClientes />}
      {tab === 'fornecedores' && <CadFornecedores />}
      {tab === 'catalogo' && <CadCatalogo />}
      {tab === 'representantes' && <CadRepresentantes />}
      {tab === 'lojas' && <CadLojas />}
      {tab === 'decoradores' && <CadDecoradores />}
      {tab === 'acabamentos' && <CadAcabamentos />}
      {tab === 'tecidos' && <CadTecidos />}
      {tab === 'config' && <CadConfigSistema />}
    </div>
  )
}

// ============================================================
// CRM / FUNIL DE VENDAS
// ============================================================
const CRM_COLUNAS = [
  { id:'lead',       label:'Leads',       cor:'#6366f1' },
  { id:'contato',    label:'Contato',     cor:'#8b5cf6' },
  { id:'visita',     label:'Visita',      cor:'#f59e0b' },
  { id:'proposta',   label:'Proposta',    cor:'#3b82f6' },
  { id:'negociacao', label:'Negociação',  cor:'#10b981' },
  { id:'fechado',    label:'Fechado',     cor:'#22c55e' },
  { id:'perdido',    label:'Perdido',     cor:'#ef4444' },
]

function CRMVisitas() {
  const { data: leads } = useData(() => crmService.list(), [])
  const visitas = (leads||[]).filter(l => l.estagio === 'visita' || l.proxima_visita)
  const hoje = new Date().toISOString().split('T')[0]
  return (
    <div>
      {visitas.length === 0 ? <Empty text="Nenhuma visita agendada" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {visitas.sort((a,b) => (a.proxima_visita||'')>(b.proxima_visita||'')?1:-1).map(v => (
            <div key={v.id} className="card" style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
              <div style={{ width:4, borderRadius:4, background: v.proxima_visita < hoje ? 'var(--red)' : 'var(--accent)', alignSelf:'stretch', flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600 }}>{v.nome}</div>
                <div style={{ fontSize:12, color:'var(--t2)' }}>{v.loja} · {v.responsavel}</div>
                {v.proxima_visita && <div style={{ fontSize:12, color: v.proxima_visita < hoje ? 'var(--red)' : 'var(--green)', marginTop:2 }}>📅 {new Date(v.proxima_visita).toLocaleDateString('pt-BR')}</div>}
                {v.obs && <div style={{ fontSize:12, color:'var(--t2)', marginTop:2 }}>{v.obs}</div>}
              </div>
              <Badge variant={v.proxima_visita < hoje ? 'bg-red' : 'bg-green'} style={{ fontSize:10 }}>{v.proxima_visita < hoje ? 'Atrasada' : 'Agendada'}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CRMKanban({ openNew, onOpenNewConsumed }) {
  const lojaEf = useEffectiveLoja()
  const { data: leads, loading, reload } = useData(() => crmService.list(lojaEf), [lojaEf])
  const [modal, setModal] = useState(null)
  const empty = { nome:'', telefone:'', email:'', loja:'', responsavel:'', estagio:'lead', valor_estimado:0, proxima_visita:'', obs:'' }
  const [form, setForm] = useState(empty)
  const act = useAction()
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  useEffect(() => {
    if (openNew) { setForm(empty); setModal({}); onOpenNewConsumed?.() }
  }, [openNew])

  const mover = async (id, estagio) => {
    try { await act.run(() => crmService.update(id, { estagio })); reload() } catch (e) { toast.error(e.message) }
  }

  const salvar = async () => {
    if (!form.nome) return toast.error('Nome obrigatório')
    try {
      if (!modal.item) await act.run(() => crmService.create(form))
      else await act.run(() => crmService.update(modal.item.id, form))
      toast.success('Salvo'); setModal(null); reload()
    } catch (e) { toast.error(e.message) }
  }

  const remover = async (id) => {
    if (!confirm('Remover lead?')) return
    try { await act.run(() => crmService.remove(id)); reload() } catch (e) { toast.error(e.message) }
  }

  if (loading) return <Spinner />

  return (
    <div>
      <div className="kanban-board" style={{ overflowX:'auto', paddingBottom:8, display:'flex', flexDirection:'row', gap:10, WebkitOverflowScrolling:'touch' }}>
          {CRM_COLUNAS.map(col => {
            const items = (leads||[]).filter(l => l.estagio === col.id)
            return (
              <div key={col.id} className="kanban-col" style={{ width:210, minWidth:280, flexShrink:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:col.cor }} />
                    <span style={{ fontWeight:600, fontSize:13 }}>{col.label}</span>
                  </div>
                  <Badge variant="bg" style={{ fontSize:10 }}>{items.length}</Badge>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6, minHeight:80 }}>
                  {items.map(lead => (
                    <div key={lead.id} className="card" style={{ padding:'10px 12px', cursor:'pointer', borderLeft:`3px solid ${col.cor}` }} onClick={() => { setForm({ ...empty, ...lead }); setModal({ item:lead }) }}>
                      <div style={{ fontWeight:600, fontSize:13, marginBottom:2 }}>{lead.nome}</div>
                      {lead.loja && <div style={{ fontSize:11, color:'var(--t2)' }}>{lead.loja}</div>}
                      {lead.valor_estimado > 0 && <div style={{ fontSize:11, color:'var(--green)', fontWeight:600 }}>{fmtR(lead.valor_estimado)}</div>}
                      {lead.proxima_visita && <div style={{ fontSize:10, color:'var(--accent)' }}>📅 {new Date(lead.proxima_visita).toLocaleDateString('pt-BR')}</div>}
                      <div style={{ display:'flex', gap:4, marginTop:6, flexWrap:'wrap' }}>
                        {CRM_COLUNAS.filter(c => c.id !== col.id && c.id !== 'perdido').slice(0,2).map(c => (
                          <button key={c.id} className="btn btn-s" style={{ fontSize:10, padding:'2px 6px' }}
                            onClick={e => { e.stopPropagation(); mover(lead.id, c.id) }}>→ {c.label}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
      </div>
      {modal && (
        <Modal title={modal.item ? 'Editar Lead' : 'Novo Lead'} onClose={() => setModal(null)}>
          <div className="grid2">
            <div className="fg" style={{ gridColumn:'1/-1' }}><label className="fl">Nome *</label><input className="fi" value={form.nome} onChange={up('nome')} /></div>
            <div className="fg"><label className="fl">Telefone</label><input className="fi" value={form.telefone||''} onChange={up('telefone')} type="tel" /></div>
            <div className="fg"><label className="fl">Email</label><input className="fi" value={form.email||''} onChange={up('email')} /></div>
            <div className="fg"><label className="fl">Loja</label><LojaSelect value={form.loja||''} onChange={v => setForm(p => ({ ...p, loja: v }))} /></div>
            <div className="fg"><label className="fl">Responsável</label><input className="fi" value={form.responsavel||''} onChange={up('responsavel')} /></div>
            <div className="fg"><label className="fl">Estágio</label>
              <select className="fi" value={form.estagio} onChange={up('estagio')}>
                {CRM_COLUNAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">Valor estimado (R$)</label><input className="fi" type="number" step="0.01" inputMode="decimal" value={form.valor_estimado||0} onChange={up('valor_estimado')} /></div>
            <div className="fg"><label className="fl">Próxima visita</label><input className="fi" type="date" value={form.proxima_visita||''} onChange={up('proxima_visita')} /></div>
            <div className="fg" style={{ gridColumn:'1/-1' }}><label className="fl">Observações</label><textarea className="fi" rows={2} value={form.obs||''} onChange={up('obs')} /></div>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button className="btn btn-p" style={{ flex:1 }} onClick={salvar} disabled={act.loading}>{act.loading ? '...' : 'Salvar'}</button>
            {modal.item && <button className="btn btn-g btn-sm" onClick={() => remover(modal.item.id)}>Remover</button>}
            <button className="btn btn-s" onClick={() => setModal(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function CRM() {
  const lojaEf = useEffectiveLoja()
  const [tab, setTab] = useState('kanban')
  const [openNew, setOpenNew] = useState(false)
  const { data: leads } = useData(() => crmService.list(lojaEf), [lojaEf])
  const totalValor = (leads||[]).filter(l => !['perdido'].includes(l.estagio)).reduce((s,l) => s + (parseFloat(l.valor_estimado)||0), 0)
  const fechados = (leads||[]).filter(l => l.estagio === 'fechado').length

  const handleNovoLead = () => {
    if (tab !== 'kanban') setTab('kanban')
    setOpenNew(true)
  }

  return (
    <div className="page">
      <div className="ph">
        <h1>CRM — Funil de Vendas</h1>
        <button className="btn btn-p btn-sm" onClick={handleNovoLead}>+ Novo Lead</button>
      </div>
      <div className="stats" style={{ marginBottom:16 }}>
        <div className="stat"><div className="stat-n">{(leads||[]).length}</div><div className="stat-l">Leads</div></div>
        <div className="stat"><div className="stat-n" style={{ color:'var(--green)' }}>{fechados}</div><div className="stat-l">Fechados</div></div>
        <div className="stat"><div className="stat-n" style={{ color:'var(--accent)', fontSize:18 }}>{fmtR(totalValor)}</div><div className="stat-l">Pipeline</div></div>
      </div>
      <div style={{ display:'flex', gap:6, marginBottom:16 }}>
        <button className={`btn btn-${tab==='kanban'?'p':'s'} btn-sm`} onClick={()=>setTab('kanban')}>🎯 Kanban</button>
        <button className={`btn btn-${tab==='visitas'?'p':'s'} btn-sm`} onClick={()=>setTab('visitas')}>📅 Agenda Visitas</button>
      </div>
      {tab === 'kanban' && <CRMKanban openNew={openNew} onOpenNewConsumed={() => setOpenNew(false)} />}
      {tab === 'visitas' && <CRMVisitas />}
    </div>
  )
}

// ============================================================
// NOTA FISCAL (em construção)
// ============================================================
function NotaFiscal() {
  return (
    <div className="page">
      <div className="ph"><h1>Nota Fiscal</h1></div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 16px', textAlign:'center', gap:16 }}>
        <div style={{ fontSize:64 }}>🧾</div>
        <div>
          <div style={{ fontWeight:700, fontSize:20, color:'var(--t1)', marginBottom:8 }}>Módulo em Desenvolvimento</div>
          <div style={{ color:'var(--t2)', fontSize:14, maxWidth:360 }}>
            A emissão de NF-e estará disponível em breve. Integração com SEFAZ e geração de XML e DANFE.
          </div>
        </div>
        <span style={{ background:'linear-gradient(135deg,#6366f1,#a78bfa)', color:'#fff', padding:'6px 18px', borderRadius:20, fontSize:12, fontWeight:600, letterSpacing:1 }}>EM BREVE</span>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:8, maxWidth:360 }}>
          {['NF-e','NFS-e','NFC-e','CT-e'].map(tp => (
            <div key={tp} className="card" style={{ textAlign:'center', padding:'12px 8px', opacity:0.6 }}>
              <div style={{ fontWeight:600, color:'var(--accent)' }}>{tp}</div>
              <div style={{ fontSize:11, color:'var(--t2)' }}>Em breve</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// CATÁLOGO DIGITAL (público)
// ============================================================
function CatalogoPub() {
  const { data: itens, loading } = useData(() => catalogoService.list(), [])
  const [busca, setBusca] = useState('')
  const [catFiltro, setCatFiltro] = useState('')
  const categorias = [...new Set((itens||[]).map(i => i.categoria).filter(Boolean))]
  const filtrado = (itens||[]).filter(i => i.ativo !== false &&
    (!catFiltro || i.categoria === catFiltro) &&
    (!busca || i.nome?.toLowerCase().includes(busca.toLowerCase()))
  )
  return (
    <div className="page">
      <div className="ph"><h1>Catálogo Digital</h1></div>
      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
        <input className="fi" style={{ flex:1, minWidth:140 }} placeholder="Buscar produto..." value={busca} onChange={e => setBusca(e.target.value)} />
        <select className="fi" style={{ width:'auto' }} value={catFiltro} onChange={e => setCatFiltro(e.target.value)}>
          <option value="">Todas as categorias</option>
          {categorias.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      {loading ? <Spinner /> : filtrado.length === 0 ? <Empty text="Nenhum produto encontrado" /> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
          {filtrado.map(p => (
            <div key={p.id} className="card" style={{ padding:12, display:'flex', flexDirection:'column', gap:6 }}>
              {p.foto_url
                ? <img src={p.foto_url} alt={p.nome} style={{ width:'100%', height:120, objectFit:'cover', borderRadius:8, background:'var(--bg2)' }} />
                : <div style={{ width:'100%', height:120, borderRadius:8, background:'var(--bg2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>🛍️</div>
              }
              <div style={{ fontWeight:600, fontSize:13 }}>{p.nome}</div>
              {p.categoria && <div style={{ fontSize:11, color:'var(--t2)' }}>{p.categoria}</div>}
              {p.referencia && <div style={{ fontSize:11, color:'var(--t3)' }}>Ref: {p.referencia}</div>}
              <div style={{ fontWeight:700, color:'var(--green)', fontSize:15 }}>{fmtR(p.preco_venda)}</div>
              {p.estoque_atual !== undefined && (
                <div style={{ fontSize:11, color: (p.estoque_atual||0) > 0 ? 'var(--green)' : 'var(--red)' }}>
                  {(p.estoque_atual||0) > 0 ? `${p.estoque_atual} em estoque` : 'Indisponível'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// VENDAS / PDV
// ============================================================
function VendasLista({ onNovaVenda }) {
  const lojaEf = useEffectiveLoja()
  const { data: lista, loading, reload } = useData(() => vendasService.list(lojaEf), [lojaEf])
  const [detalhe, setDetalhe] = useState(null)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  const STATUS_COR = { pendente:'var(--amber)', aprovado:'var(--green)', cancelado:'var(--red)', entregue:'var(--blue)', aguardando_aprovacao:'#f97316' }
  const fmtData = (s) => s ? new Date(s).toLocaleDateString('pt-BR') : '—'

  const filtrado = (lista || []).filter(v =>
    (!filtroStatus || v.status === filtroStatus) &&
    (!busca || v.cliente_nome?.toLowerCase().includes(busca.toLowerCase()) || String(v.numero||'').includes(busca))
  )

  if (detalhe) return <VendaDetalhe venda={detalhe} onClose={() => { setDetalhe(null); reload() }} />

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
        <input className="fi" style={{ flex:1, minWidth:140 }} placeholder="Buscar cliente ou nº..." value={busca} onChange={e => setBusca(e.target.value)} />
        <select className="fi" style={{ width:'auto' }} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos</option>
          {['pendente','aprovado','aguardando_aprovacao','entregue','cancelado'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
      </div>
      {loading ? <Spinner /> : filtrado.length === 0 ? <Empty text="Nenhuma venda encontrada" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtrado.map(v => (
            <div key={v.id} className="card" style={{ cursor:'pointer' }} onClick={() => setDetalhe(v)}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontWeight:600 }}>{v.cliente_nome || 'Cliente não informado'}</div>
                  <div style={{ fontSize:12, color:'var(--t2)' }}>#{v.numero || v.id?.slice(0,8)} · {fmtData(v.created_at)} · {v.loja || '—'}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontWeight:700, color:'var(--green)' }}>{fmtR(v.total)}</div>
                  <span style={{ fontSize:11, background:STATUS_COR[v.status]||'var(--bg2)', color:'#fff', padding:'2px 8px', borderRadius:12, textTransform:'capitalize' }}>{(v.status||'').replace('_',' ')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Orcamentos() {
  const { data: lista, loading, reload } = useData(() => orcamentosService.list(), [])
  const { data: clientes } = useData(() => clientesService.list(), [])
  const { data: catalogo } = useData(() => catalogoService.list(), [])
  const { perfil } = useAuth()
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ cliente_nome:'', loja:'', vendedor_nome: perfil?.full_name||'', validade_dias:7, observacoes:'', status:'rascunho' })
  const [itens, setItens] = useState([])
  const act = useAction()
  const STATUS_COR = { rascunho:'var(--t3)', enviado:'var(--amber)', aprovado:'var(--green)', expirado:'var(--red)', recusado:'var(--red)' }
  const up = k => e => setForm(p=>({...p,[k]:e.target.value}))
  const subtotal = itens.reduce((s,i)=>s+(parseFloat(i.preco_unitario)||0)*(parseInt(i.quantidade)||1),0)
  const descPerc = parseFloat(form.desconto_percentual)||0
  const total = subtotal * (1 - descPerc/100)

  const addItem = (prod) => {
    setItens(p => {
      const ex = p.find(i=>i.catalogo_id===prod.id)
      if (ex) return p.map(i=>i.catalogo_id===prod.id?{...i,quantidade:i.quantidade+1}:i)
      return [...p, {catalogo_id:prod.id,nome:prod.nome,quantidade:1,preco_unitario:prod.preco_venda||0}]
    })
  }

  const salvar = async () => {
    if (!form.cliente_nome) return toast.error('Cliente obrigatório')
    const expira = new Date(); expira.setDate(expira.getDate()+(parseInt(form.validade_dias)||7))
    try {
      await act.run(() => orcamentosService.create({ ...form, itens, subtotal, total, desconto_percentual: descPerc, expira_em: expira.toISOString().split('T')[0] }))
      toast.success('Orçamento salvo'); setModal(null); reload()
    } catch(e) { toast.error(e.message) }
  }

  const converter = async (orc) => {
    try {
      const nova = await vendasService.create({ cliente_nome: orc.cliente_nome, loja: orc.loja, vendedor_nome: orc.vendedor_nome, vendedor_id: perfil?.id, subtotal: orc.subtotal, desconto_perc: orc.desconto_percentual, desconto_valor: orc.subtotal-orc.total, total: orc.total, obs: orc.observacoes, status: 'aprovado', forma_pagamento:'' })
      if (orc.itens?.length) await vendasService.createItens(orc.itens.map(i=>({...i,venda_id:nova.id})))
      await orcamentosService.update(orc.id, { status:'aprovado' })
      toast.success('Convertido em venda!'); reload()
    } catch(e) { toast.error(e.message) }
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
        <button className="btn btn-p btn-sm" onClick={()=>{setForm({cliente_nome:'',loja:'',vendedor_nome:perfil?.full_name||'',validade_dias:7,observacoes:'',status:'rascunho',desconto_percentual:0});setItens([]);setModal(true)}}>+ Novo Orçamento</button>
      </div>
      {loading ? <Spinner /> : (lista||[]).length===0 ? <Empty text="Nenhum orçamento" /> : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {(lista||[]).map(o=>(
            <div key={o.id} className="card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div>
                  <div style={{fontWeight:600}}>{o.cliente_nome}</div>
                  <div style={{fontSize:12,color:'var(--t2)'}}>{o.loja} · {o.vendedor_nome} · validade: {o.expira_em ? new Date(o.expira_em+'T12:00').toLocaleDateString('pt-BR') : '—'}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontWeight:700}}>{fmtR(o.total)}</div>
                  <span style={{fontSize:11,background:STATUS_COR[o.status]||'var(--t3)',color:'#fff',padding:'2px 8px',borderRadius:12}}>{o.status}</span>
                </div>
              </div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {o.status==='enviado' && <button className="btn btn-p btn-sm" onClick={()=>converter(o)}>Converter em Venda</button>}
                {o.status==='rascunho' && <button className="btn btn-s btn-sm" onClick={()=>orcamentosService.update(o.id,{status:'enviado'}).then(reload)}>Enviar ao Cliente</button>}
                <button className="btn btn-s btn-sm" onClick={()=>{
                  const tel = o.whatsapp || ''
                  const msg = encodeURIComponent(`Olá ${o.cliente_nome}, segue seu orçamento:\n\n${(o.itens||[]).map(i=>`• ${i.nome} x${i.quantidade} — ${fmtR(i.preco_unitario*i.quantidade)}`).join('\n')}\n\nTotal: ${fmtR(o.total)}\nValidade: ${o.expira_em ? new Date(o.expira_em+'T12:00').toLocaleDateString('pt-BR') : 'N/A'}`)
                  window.open(`https://wa.me/?text=${msg}`,'_blank')
                }}>Enviar WhatsApp</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <Modal title="Novo Orçamento" onClose={()=>setModal(null)} size="lg">
          <div className="grid2">
            <div className="fg" style={{gridColumn:'1/-1'}}><label className="fl">Cliente *</label>
              <select className="fi" onChange={e=>{const c=(clientes||[]).find(x=>x.id===e.target.value);setForm(p=>({...p,cliente_id:e.target.value,cliente_nome:c?.nome||p.cliente_nome}))}}>
                <option value="">Selecionar cadastrado</option>
                {(clientes||[]).map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              <input className="fi" style={{marginTop:4}} value={form.cliente_nome} onChange={up('cliente_nome')} placeholder="Ou digitar nome" />
            </div>
            <div className="fg"><label className="fl">Loja</label><LojaSelect value={form.loja} onChange={v=>setForm(p=>({...p,loja:v}))} /></div>
            <div className="fg"><label className="fl">Vendedor</label><input className="fi" value={form.vendedor_nome} onChange={up('vendedor_nome')} /></div>
            <div className="fg"><label className="fl">Validade (dias)</label><input className="fi" type="number" value={form.validade_dias} onChange={up('validade_dias')} /></div>
            <div className="fg"><label className="fl">Desconto (%)</label><input className="fi" type="number" step="0.1" value={form.desconto_percentual||0} onChange={up('desconto_percentual')} /></div>
          </div>
          <div style={{fontWeight:600,margin:'8px 0 6px'}}>Produtos</div>
          <input className="fi" placeholder="Buscar produto no catálogo..." style={{marginBottom:6}} onChange={e=>{
            const q=e.target.value.toLowerCase(); const el=document.getElementById('orc-cat')
            if(!el)return; el.innerHTML=''
            if(!q)return
            ;(catalogo||[]).filter(p=>p.nome.toLowerCase().includes(q)).slice(0,6).forEach(p=>{
              const btn=document.createElement('button'); btn.className='btn btn-s btn-sm'; btn.style.margin='2px'
              btn.textContent=`${p.nome} — ${fmtR(p.preco_venda)}`
              btn.onclick=()=>{addItem(p);e.target.value='';el.innerHTML=''}; el.appendChild(btn)
            })
          }} />
          <div id="orc-cat" style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:8}} />
          {itens.map((it,i)=>(
            <div key={i} style={{display:'flex',gap:6,marginBottom:4,alignItems:'center',fontSize:13}}>
              <span style={{flex:2}}>{it.nome}</span>
              <input className="fi" style={{width:60}} type="number" min={1} value={it.quantidade} onChange={e=>setItens(p=>p.map((x,j)=>j===i?{...x,quantidade:parseInt(e.target.value)||1}:x))} />
              <span style={{width:80,textAlign:'right'}}>{fmtR(it.preco_unitario*it.quantidade)}</span>
              <button className="btn btn-g btn-sm" onClick={()=>setItens(p=>p.filter((_,j)=>j!==i))}>✕</button>
            </div>
          ))}
          <div style={{textAlign:'right',fontWeight:700,fontSize:15,marginBottom:8}}>Total: {fmtR(total)}</div>
          <div className="fg"><label className="fl">Observações</label><textarea className="fi" value={form.observacoes} onChange={up('observacoes')} rows={2}/></div>
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <button className="btn btn-p" style={{flex:1}} onClick={salvar} disabled={act.loading}>{act.loading?'...':'Salvar Orçamento'}</button>
            <button className="btn btn-s" onClick={()=>setModal(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Vendas() {
  const [tab, setTab] = useState('vendas')
  const [novaVenda, setNovaVenda] = useState(false)

  if (novaVenda) return <NovaVenda onClose={() => setNovaVenda(false)} />

  return (
    <div className="page">
      <div className="ph">
        <h1>Vendas</h1>
        <button className="btn btn-p btn-sm" onClick={() => setNovaVenda(true)}>+ Nova Venda</button>
      </div>
      <div style={{display:'flex',gap:6,marginBottom:16}}>
        <button className={`btn btn-${tab==='vendas'?'p':'s'} btn-sm`} onClick={()=>setTab('vendas')}>💰 Vendas</button>
        <button className={`btn btn-${tab==='orcamentos'?'p':'s'} btn-sm`} onClick={()=>setTab('orcamentos')}>📝 Orçamentos</button>
      </div>
      {tab==='vendas' && <VendasLista onNovaVenda={()=>setNovaVenda(true)} />}
      {tab==='orcamentos' && <Orcamentos />}
    </div>
  )
}

function NovaVenda({ onClose }) {
  const { perfil, podeVerTodasLojas } = useAuth()
  const lojaEf = useEffectiveLoja()
  const { data: cfgData } = useData(() => configSistemaService.get(), [])
  const { data: clientes } = useData(() => clientesService.list(), [])
  const { data: catalogo } = useData(() => catalogoService.list(), [])
  const { data: acabamentos } = useData(() => acabamentosService.list(), [])
  const { data: tecidos } = useData(() => tecidosService.list(), [])
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ cliente_id:'', cliente_nome:'', loja: lojaEf || '', vendedor_nome: perfil?.full_name || '', obs:'' })
  const [itens, setItens] = useState([])
  const [desconto, setDesconto] = useState(0)
  const [motivo, setMotivo] = useState('')
  const [pagamento, setPagamento] = useState({ forma:'', parcelas:1, entrada:0 })
  const act = useAction()
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const subtotal = itens.reduce((s, i) => s + (i.preco_unitario * i.quantidade), 0)
  const totalDesc = subtotal * (desconto / 100)
  const total = subtotal - totalDesc

  const addItem = (prod) => {
    const exist = itens.find(i => i.catalogo_id === prod.id)
    if (exist) setItens(p => p.map(i => i.catalogo_id === prod.id ? { ...i, quantidade: i.quantidade + 1 } : i))
    else setItens(p => [...p, { catalogo_id: prod.id, nome: prod.nome, quantidade: 1, preco_unitario: prod.preco_venda || 0, unidade: prod.unidade || 'un' }])
  }

  const updItem = (idx, k, v) => setItens(p => p.map((it, i) => i === idx ? { ...it, [k]: v } : it))
  const remItem = (idx) => setItens(p => p.filter((_, i) => i !== idx))

  const cfg = cfgData || {}
  const limiteDesc = perfil?.role === 'admin' ? (parseFloat(cfg.desconto_max_admin)||100)
    : perfil?.role === 'gestor' ? (parseFloat(cfg.desconto_max_gestor)||30)
    : (parseFloat(cfg.desconto_max_vendedor)||5)
  const precisaAprovacao = desconto > limiteDesc

  const confirmar = async () => {
    try {
      const status = precisaAprovacao ? 'aguardando_aprovacao' : 'aprovado'
      const hoje = new Date().toISOString().split('T')[0]
      const nova = await act.run(() => vendasService.create({
        cliente_id: form.cliente_id || null,
        cliente_nome: form.cliente_nome,
        loja: form.loja,
        vendedor_nome: form.vendedor_nome,
        vendedor_id: perfil?.id,
        subtotal, desconto_perc: desconto, desconto_valor: totalDesc, total,
        motivo_desconto: motivo,
        forma_pagamento: pagamento.forma,
        parcelas: pagamento.parcelas,
        entrada: parseFloat(pagamento.entrada)||0,
        obs: form.obs,
        status,
      }))
      if (itens.length) await vendasService.createItens(itens.map(it => ({ ...it, venda_id: nova.id })))

      // Integração financeira — inserir lançamentos de receita
      if (!precisaAprovacao) {
        try {
          const isAVista = ['Dinheiro','PIX','Cartão Débito'].includes(pagamento.forma)
          if (pagamento.parcelas > 1 && !isAVista) {
            const valorParcela = total / pagamento.parcelas
            const entrada = parseFloat(pagamento.entrada) || 0
            const lancamentos = []
            if (entrada > 0) {
              lancamentos.push({ descricao: `Venda #${nova.id?.slice(0,8)} - entrada`, valor: entrada, vencimento: hoje, status: 'pago', data_pagamento: hoje, tipo: 'receita', loja: form.loja, venda_id: nova.id })
            }
            for (let i = 1; i <= pagamento.parcelas; i++) {
              const venc = new Date(); venc.setMonth(venc.getMonth() + i)
              lancamentos.push({ descricao: `Venda #${nova.id?.slice(0,8)} - parcela ${i}/${pagamento.parcelas}`, valor: valorParcela, vencimento: venc.toISOString().split('T')[0], status: 'pendente', tipo: 'receita', loja: form.loja, venda_id: nova.id })
            }
            for (const l of lancamentos) {
              await supabase.from('financeiro_lancamentos').insert(l)
            }
          } else {
            await supabase.from('financeiro_lancamentos').insert({ descricao: `Venda #${nova.id?.slice(0,8)} - ${form.cliente_nome}`, valor: total, vencimento: hoje, status: isAVista ? 'pago' : 'pendente', data_pagamento: isAVista ? hoje : null, tipo: 'receita', loja: form.loja, venda_id: nova.id })
          }
        } catch (_) { /* financeiro_lancamentos pode não ter todas colunas ainda */ }

        // Baixa de estoque
        try {
          for (const it of itens) {
            await supabase.from('movimentos_estoque').insert({ tipo: 'saida', produto_nome: it.nome, catalogo_id: it.catalogo_id, quantidade: it.quantidade, loja: form.loja, origem: 'venda', referencia_id: nova.id, registrado_por: perfil?.full_name })
            if (it.catalogo_id) {
              await supabase.from('catalogo_produtos').select('estoque_atual').eq('id', it.catalogo_id).single().then(({ data }) => {
                if (data) supabase.from('catalogo_produtos').update({ estoque_atual: Math.max(0, (data.estoque_atual || 0) - it.quantidade) }).eq('id', it.catalogo_id)
              })
            }
          }
        } catch (_) { /* estoque pode não ter todas colunas ainda */ }
      }

      if (precisaAprovacao) {
        const tel = cfg.whatsapp_aprovacao
        if (tel) {
          const msg = encodeURIComponent(`*APROVAÇÃO DE DESCONTO*\nVendedor: ${form.vendedor_nome}\nCliente: ${form.cliente_nome}\nTotal: R$ ${total.toFixed(2)}\nDesconto solicitado: ${desconto}%\nMotivo: ${motivo}`)
          window.open(`https://wa.me/${tel}?text=${msg}`, '_blank')
        }
        toast.info('Venda aguardando aprovação de desconto')
      } else {
        toast.success('Venda registrada!')
      }
      onClose()
    } catch (e) { toast.error(e.message) }
  }

  const FORMAS = ['Dinheiro','Cartão Débito','Cartão Crédito','PIX','Boleto','Financiamento']
  const fmtMoeda = (v) => (parseFloat(v)||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })

  return (
    <div className="page">
      <div className="ph">
        <div>
          <h1>Nova Venda</h1>
          <div className="ph-sub">Passo {step} de 5</div>
        </div>
        <button className="btn btn-s btn-sm" onClick={onClose}>Cancelar</button>
      </div>
      <div style={{ display:'flex', gap:4, marginBottom:20 }}>
        {[1,2,3,4,5].map(s => (
          <div key={s} style={{ flex:1, height:4, borderRadius:2, background: s<=step ? 'var(--accent)' : 'var(--border)' }} />
        ))}
      </div>

      {step === 1 && (
        <div className="card">
          <div style={{ fontWeight:600, marginBottom:12 }}>1. Cliente</div>
          <div className="fg">
            <label className="fl">Selecionar cliente cadastrado</label>
            <select className="fi" value={form.cliente_id} onChange={e => {
              const c = (clientes||[]).find(x => x.id === e.target.value)
              setForm(p => ({ ...p, cliente_id: e.target.value, cliente_nome: c?.nome || p.cliente_nome }))
            }}>
              <option value="">— Selecionar —</option>
              {(clientes||[]).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="fg"><label className="fl">Ou digitar nome</label><input className="fi" value={form.cliente_nome} onChange={up('cliente_nome')} placeholder="Nome do cliente" /></div>
          {podeVerTodasLojas
            ? <div className="fg"><label className="fl">Loja</label><LojaSelect value={form.loja} onChange={v => setForm(p => ({ ...p, loja: v }))} /></div>
            : <div className="fg"><label className="fl">Loja</label><input className="fi" value={form.loja} readOnly style={{ background:'var(--bg3)', color:'var(--t2)' }} /></div>
          }
          <div className="fg"><label className="fl">Vendedor</label><input className="fi" value={form.vendedor_nome} onChange={up('vendedor_nome')} /></div>
          <button className="btn btn-p" style={{ marginTop:8 }} disabled={!form.cliente_nome} onClick={() => setStep(2)}>Próximo →</button>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="card" style={{ marginBottom:12 }}>
            <div style={{ fontWeight:600, marginBottom:10 }}>2. Produtos</div>
            <input className="fi" placeholder="Buscar no catálogo..." style={{ marginBottom:8 }}
              onChange={e => {
                const q = e.target.value.toLowerCase()
                const el = document.getElementById('cat-results')
                if (!el) return
                el.innerHTML = ''
                if (!q) return
                ;(catalogo||[]).filter(p => p.nome.toLowerCase().includes(q)).slice(0,8).forEach(p => {
                  const btn = document.createElement('button')
                  btn.className = 'btn btn-s btn-sm'
                  btn.style.margin = '2px'
                  btn.textContent = `${p.nome} — ${(parseFloat(p.preco_venda)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}`
                  btn.onclick = () => { addItem(p); e.target.value = ''; el.innerHTML = '' }
                  el.appendChild(btn)
                })
              }}
            />
            <div id="cat-results" style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:8 }} />
            {itens.length === 0 ? <div style={{ color:'var(--t2)', fontSize:13 }}>Nenhum item adicionado</div> : (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {itens.map((it, idx) => (
                  <div key={idx} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
                    <div style={{ flex:1, fontSize:13 }}>{it.nome}</div>
                    <input type="number" min={1} value={it.quantidade} style={{ width:60, padding:'4px 6px', border:'1px solid var(--border)', borderRadius:6, textAlign:'center' }} onChange={e => updItem(idx,'quantidade',parseInt(e.target.value)||1)} />
                    <input type="number" step="0.01" inputMode="decimal" value={it.preco_unitario} style={{ width:90, padding:'4px 6px', border:'1px solid var(--border)', borderRadius:6 }} onChange={e => updItem(idx,'preco_unitario',parseFloat(e.target.value)||0)} />
                    <button className="btn btn-g btn-sm" onClick={() => remItem(idx)}>✕</button>
                  </div>
                ))}
                <div style={{ textAlign:'right', fontWeight:600, fontSize:15, paddingTop:6 }}>Subtotal: {fmtMoeda(subtotal)}</div>
              </div>
            )}
          </div>
          {(acabamentos||[]).length > 0 || (tecidos||[]).length > 0 ? (
            <div className="card" style={{ marginTop:12 }}>
              <div style={{ fontWeight:600, marginBottom:8 }}>Configurador (opcional)</div>
              <div className="grid2">
                {(acabamentos||[]).length > 0 && (
                  <div className="fg"><label className="fl">Acabamento</label>
                    <select className="fi" value={form.acabamento||''} onChange={up('acabamento')}>
                      <option value="">— Selecionar —</option>
                      {(acabamentos||[]).map(a => <option key={a.id} value={a.nome}>{a.nome}{a.categoria ? ` (${a.categoria})` : ''}</option>)}
                    </select>
                  </div>
                )}
                {(tecidos||[]).length > 0 && (
                  <div className="fg"><label className="fl">Tecido</label>
                    <select className="fi" value={form.tecido||''} onChange={up('tecido')}>
                      <option value="">— Selecionar —</option>
                      {(tecidos||[]).map(t => <option key={t.id} value={t.nome}>{t.nome}{t.cor ? ` — ${t.cor}` : ''}</option>)}
                    </select>
                  </div>
                )}
                <div className="fg"><label className="fl">Medida (ex: 2.40x1.80)</label><input className="fi" value={form.medida||''} onChange={up('medida')} placeholder="L x A" /></div>
              </div>
            </div>
          ) : null}
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button className="btn btn-s" onClick={() => setStep(1)}>← Voltar</button>
            <button className="btn btn-p" style={{ flex:1 }} disabled={itens.length===0} onClick={() => setStep(3)}>Próximo →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <div style={{ fontWeight:600, marginBottom:12 }}>3. Desconto</div>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:13, color:'var(--t2)', marginBottom:4 }}>Subtotal: {fmtMoeda(subtotal)}</div>
            <div style={{ fontSize:13, color:'var(--t2)', marginBottom:8 }}>Seu limite: {limiteDesc}%</div>
          </div>
          <div className="fg"><label className="fl">Desconto (%)</label><input className="fi" type="number" min={0} max={100} step="0.1" value={desconto} onChange={e => setDesconto(parseFloat(e.target.value)||0)} /></div>
          {desconto > 0 && <div className="fg"><label className="fl">Motivo do desconto</label><input className="fi" value={motivo} onChange={e => setMotivo(e.target.value)} /></div>}
          {precisaAprovacao && (
            <Alert type="warning" style={{ marginTop:8 }}>Desconto acima do seu limite ({limiteDesc}%). Precisará de aprovação via WhatsApp.</Alert>
          )}
          <div style={{ marginTop:12, fontWeight:600, fontSize:16 }}>Total: {fmtMoeda(total)}</div>
          <div style={{ display:'flex', gap:8, marginTop:16 }}>
            <button className="btn btn-s" onClick={() => setStep(2)}>← Voltar</button>
            <button className="btn btn-p" style={{ flex:1 }} onClick={() => setStep(4)}>Próximo →</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card">
          <div style={{ fontWeight:600, marginBottom:12 }}>4. Pagamento</div>
          <div className="fg">
            <label className="fl">Forma de pagamento</label>
            <select className="fi" value={pagamento.forma} onChange={e => setPagamento(p => ({ ...p, forma: e.target.value }))}>
              <option value="">Selecionar...</option>
              {FORMAS.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          {pagamento.forma === 'Cartão Crédito' && (
            <div className="fg"><label className="fl">Parcelas</label>
              <select className="fi" value={pagamento.parcelas} onChange={e => setPagamento(p => ({ ...p, parcelas: parseInt(e.target.value) }))}>
                {[1,2,3,4,5,6,10,12].map(n => <option key={n} value={n}>{n}x de {fmtMoeda(total/n)}</option>)}
              </select>
            </div>
          )}
          {pagamento.forma === 'Financiamento' && (
            <div className="fg"><label className="fl">Entrada (R$)</label><input className="fi" type="number" step="0.01" inputMode="decimal" value={pagamento.entrada} onChange={e => setPagamento(p => ({ ...p, entrada: e.target.value }))} /></div>
          )}
          <div className="fg"><label className="fl">Observações</label><textarea className="fi" value={form.obs} onChange={up('obs')} rows={2} /></div>
          <div style={{ display:'flex', gap:8, marginTop:16 }}>
            <button className="btn btn-s" onClick={() => setStep(3)}>← Voltar</button>
            <button className="btn btn-p" style={{ flex:1 }} disabled={!pagamento.forma} onClick={() => setStep(5)}>Próximo →</button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="card">
          <div style={{ fontWeight:600, marginBottom:16 }}>5. Confirmação</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6, fontSize:14, marginBottom:16 }}>
            <div><span style={{ color:'var(--t2)' }}>Cliente:</span> {form.cliente_nome}</div>
            <div><span style={{ color:'var(--t2)' }}>Loja:</span> {form.loja}</div>
            <div><span style={{ color:'var(--t2)' }}>Itens:</span> {itens.length} produtos</div>
            <div><span style={{ color:'var(--t2)' }}>Subtotal:</span> {fmtMoeda(subtotal)}</div>
            {desconto > 0 && <div><span style={{ color:'var(--t2)' }}>Desconto:</span> {desconto}% ({fmtMoeda(totalDesc)})</div>}
            <div style={{ fontWeight:700, fontSize:16 }}>Total: {fmtMoeda(total)}</div>
            <div><span style={{ color:'var(--t2)' }}>Pagamento:</span> {pagamento.forma}{pagamento.parcelas > 1 ? ` em ${pagamento.parcelas}x` : ''}</div>
            {precisaAprovacao && <Alert type="warning">Aguardará aprovação de desconto.</Alert>}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-s" onClick={() => setStep(4)}>← Voltar</button>
            <button className="btn btn-p" style={{ flex:1 }} onClick={confirmar} disabled={act.loading}>{act.loading ? 'Salvando...' : precisaAprovacao ? 'Enviar p/ Aprovação' : 'Confirmar Venda'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

function VendaDetalhe({ venda, onClose }) {
  const { data, reload } = useData(() => vendasService.getById(venda.id), [venda.id])
  const act = useAction()
  const v = data || venda
  const fmtMoeda = (x) => (parseFloat(x)||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })

  const STATUS = ['aprovado','entregue','cancelado','aguardando_aprovacao']

  const atualizarStatus = async (status) => {
    try { await act.run(() => vendasService.update(v.id, { status })); toast.success('Status atualizado'); reload() } catch (e) { toast.error(e.message) }
  }

  return (
    <div className="page">
      <div className="ph">
        <div>
          <h1>Venda #{v.numero || v.id?.slice(0,8)}</h1>
          <div className="ph-sub">{v.cliente_nome}</div>
        </div>
        <button className="btn btn-s btn-sm" onClick={onClose}>← Voltar</button>
      </div>
      <div className="card" style={{ marginBottom:12 }}>
        <div className="grid2" style={{ fontSize:14, gap:8 }}>
          <div><span style={{ color:'var(--t2)' }}>Loja:</span> {v.loja}</div>
          <div><span style={{ color:'var(--t2)' }}>Vendedor:</span> {v.vendedor_nome}</div>
          <div><span style={{ color:'var(--t2)' }}>Pagamento:</span> {v.forma_pagamento}</div>
          <div><span style={{ color:'var(--t2)' }}>Status:</span> <span style={{ textTransform:'capitalize' }}>{(v.status||'').replace('_',' ')}</span></div>
          <div><span style={{ color:'var(--t2)' }}>Subtotal:</span> {fmtMoeda(v.subtotal)}</div>
          <div><span style={{ color:'var(--t2)' }}>Desconto:</span> {v.desconto_perc||0}% ({fmtMoeda(v.desconto_valor)})</div>
          <div style={{ fontWeight:700, fontSize:16, gridColumn:'1/-1' }}>Total: {fmtMoeda(v.total)}</div>
        </div>
      </div>
      {v.venda_itens?.length > 0 && (
        <div className="card" style={{ marginBottom:12 }}>
          <div style={{ fontWeight:600, marginBottom:8 }}>Itens</div>
          {v.venda_itens.map((it, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'4px 0', borderBottom:'1px solid var(--border)' }}>
              <span>{it.nome} × {it.quantidade}</span>
              <span>{fmtMoeda(it.preco_unitario * it.quantidade)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="card">
        <div style={{ fontWeight:600, marginBottom:10 }}>Alterar Status</div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {STATUS.map(s => (
            <button key={s} className={`btn btn-${v.status===s?'p':'s'} btn-sm`} onClick={() => atualizarStatus(s)} disabled={v.status===s} style={{ textTransform:'capitalize' }}>{s.replace('_',' ')}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// COMPRAS
// ============================================================
function ComprasPrevisao() {
  const lojaEf = useEffectiveLoja()
  const { data: estoque } = useData(() => estoqueService.list(lojaEf), [lojaEf])
  const { data: compras } = useData(() => comprasService.list(lojaEf), [lojaEf])
  const fmtM = (v) => (parseFloat(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})

  const emCompra = new Set()
  ;(compras||[]).filter(c => ['enviado','confirmado'].includes(c.status)).forEach(c =>
    (c.pedido_compra_itens||[]).forEach(i => i.descricao && emCompra.add(i.descricao.toLowerCase()))
  )

  const abaixoMin = (estoque||[]).filter(i => (i.estoque_atual||0) <= (i.estoque_minimo||0))
  const sugestoes = abaixoMin.map(i => ({
    ...i,
    qtd_sugerida: Math.max((i.estoque_minimo||0) * 2 - (i.estoque_atual||0), 1),
    ja_em_compra: emCompra.has(i.nome?.toLowerCase()),
  }))

  return (
    <div>
      {sugestoes.length === 0
        ? <Alert type="success">Todos os itens estão acima do estoque mínimo. Nenhuma compra sugerida.</Alert>
        : (
          <>
            <Alert type="warning" style={{ marginBottom:12 }}>{sugestoes.length} item(ns) abaixo do estoque mínimo</Alert>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {sugestoes.map(i => (
                <div key={i.id} className="card" style={{ borderLeft:`3px solid ${i.ja_em_compra ? 'var(--amber)' : 'var(--red)'}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <div style={{ fontWeight:600, fontSize:14 }}>{i.nome}</div>
                      <div style={{ fontSize:12, color:'var(--t2)' }}>{i.referencia||i.sku||'—'} · {i.loja||'—'}</div>
                    </div>
                    {i.ja_em_compra && <Badge variant="bg" style={{ fontSize:10 }}>Já em compra</Badge>}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginTop:8, fontSize:12 }}>
                    <div><div style={{ color:'var(--t2)' }}>Atual</div><div style={{ fontWeight:700, color:'var(--red)' }}>{i.estoque_atual||0} {i.unidade||'un'}</div></div>
                    <div><div style={{ color:'var(--t2)' }}>Mínimo</div><div style={{ fontWeight:700 }}>{i.estoque_minimo||0} {i.unidade||'un'}</div></div>
                    <div><div style={{ color:'var(--t2)' }}>Comprar</div><div style={{ fontWeight:700, color:'var(--accent)' }}>{i.qtd_sugerida} {i.unidade||'un'}</div></div>
                  </div>
                  {i.preco_custo > 0 && <div style={{ fontSize:12, color:'var(--t2)', marginTop:4 }}>Estimado: {fmtM(i.qtd_sugerida * (i.preco_custo||0))}</div>}
                </div>
              ))}
            </div>
          </>
        )
      }
    </div>
  )
}

function Compras() {
  const lojaEf = useEffectiveLoja()
  const { data: lista, loading, reload } = useData(() => comprasService.list(lojaEf), [lojaEf])
  const [modal, setModal] = useState(null)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [tab, setTab] = useState('pedidos')
  const act = useAction()

  const STATUS_COR = { rascunho:'var(--t2)', enviado:'var(--amber)', confirmado:'var(--green)', recebido:'var(--blue)', cancelado:'var(--red)' }
  const fmtMoeda = (v) => (parseFloat(v)||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })

  const filtrado = (lista||[]).filter(c =>
    (!filtroStatus || c.status === filtroStatus) &&
    (!busca || c.fornecedor_nome?.toLowerCase().includes(busca.toLowerCase()))
  )

  const atualizar = async (id, updates) => {
    try { await act.run(() => comprasService.update(id, updates)); reload(); toast.success('Atualizado') } catch (e) { toast.error(e.message) }
  }

  return (
    <div className="page">
      <div className="ph">
        <h1>Compras</h1>
        {tab === 'pedidos' && <button className="btn btn-p btn-sm" onClick={() => setModal({ mode:'new' })}>+ Novo Pedido</button>}
      </div>
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        <button className={`btn btn-${tab==='pedidos'?'p':'s'} btn-sm`} onClick={()=>setTab('pedidos')}>🛒 Pedidos</button>
        <button className={`btn btn-${tab==='previsao'?'p':'s'} btn-sm`} onClick={()=>setTab('previsao')}>📊 Previsão</button>
      </div>
      {tab === 'previsao' && <ComprasPrevisao />}
      {tab === 'pedidos' && (
        <>
          <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
            <input className="fi" style={{ flex:1, minWidth:140 }} placeholder="Buscar fornecedor..." value={busca} onChange={e => setBusca(e.target.value)} />
            <select className="fi" style={{ width:'auto' }} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
              <option value="">Todos</option>
              {['rascunho','enviado','confirmado','recebido','cancelado'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          {loading ? <Spinner /> : filtrado.length === 0 ? <Empty text="Nenhum pedido de compra" /> : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {filtrado.map(c => (
                <div key={c.id} className="card">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <div>
                      <div style={{ fontWeight:600 }}>{c.fornecedor_nome}</div>
                      <div style={{ fontSize:12, color:'var(--t2)' }}>{new Date(c.created_at).toLocaleDateString('pt-BR')} · {c.pedido_compra_itens?.length||0} itens</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontWeight:700 }}>{fmtMoeda(c.total)}</div>
                      <span style={{ fontSize:11, background:STATUS_COR[c.status]||'var(--t2)', color:'#fff', padding:'2px 8px', borderRadius:12 }}>{c.status}</span>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {c.status === 'rascunho' && <button className="btn btn-p btn-sm" onClick={() => atualizar(c.id,{status:'enviado'})}>Enviar ao Fornecedor</button>}
                    {c.status === 'enviado' && <button className="btn btn-p btn-sm" onClick={() => atualizar(c.id,{status:'confirmado'})}>Marcar Confirmado</button>}
                    {c.status === 'confirmado' && <button className="btn btn-p btn-sm" onClick={() => atualizar(c.id,{status:'recebido', data_recebimento: new Date().toISOString().split('T')[0]})}>Recebido</button>}
                    <button className="btn btn-s btn-sm" onClick={() => setModal({ mode:'edit', item:c })}>Ver/Editar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {modal && <ModalCompra modal={modal} onClose={() => { setModal(null); reload() }} />}
        </>
      )}
    </div>
  )
}

function ModalCompra({ modal, onClose }) {
  const { data: forns } = useData(() => fornecedoresService.list(), [])
  const empty = { fornecedor_id:'', fornecedor_nome:'', data_prevista:'', obs:'', status:'rascunho' }
  const [form, setForm] = useState(modal.item ? { ...empty, ...modal.item } : empty)
  const [itens, setItens] = useState(modal.item?.pedido_compra_itens || [{ descricao:'', quantidade:1, preco_unitario:0, unidade:'un' }])
  const act = useAction()
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const upItem = (idx, k, v) => setItens(p => p.map((it,i) => i===idx ? { ...it, [k]: v } : it))
  const addItem = () => setItens(p => [...p, { descricao:'', quantidade:1, preco_unitario:0, unidade:'un' }])
  const remItem = (idx) => setItens(p => p.filter((_,i) => i!==idx))
  const total = itens.reduce((s,i) => s + ((parseFloat(i.preco_unitario)||0) * (parseInt(i.quantidade)||0)), 0)
  const fmtMoeda = (v) => (parseFloat(v)||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })

  const salvar = async () => {
    if (!form.fornecedor_nome) return toast.error('Fornecedor obrigatório')
    try {
      const payload = { ...form, total }
      if (modal.mode === 'new') {
        const criado = await act.run(() => comprasService.create(payload))
        const itensSave = itens.map(i => ({ ...i, pedido_compra_id: criado.id, quantidade: parseInt(i.quantidade)||1, preco_unitario: parseFloat(i.preco_unitario)||0 }))
        await comprasService.createItens(itensSave)
      } else {
        await act.run(() => comprasService.update(modal.item.id, payload))
      }
      toast.success('Salvo'); onClose()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <Modal title={modal.mode === 'new' ? 'Novo Pedido de Compra' : 'Pedido de Compra'} onClose={onClose}>
      <div className="grid2">
        <div className="fg" style={{ gridColumn:'1/-1' }}>
          <label className="fl">Fornecedor *</label>
          <select className="fi" value={form.fornecedor_id} onChange={e => {
            const f = (forns||[]).find(x => x.id === e.target.value)
            setForm(p => ({ ...p, fornecedor_id: e.target.value, fornecedor_nome: f?.nome || p.fornecedor_nome }))
          }}>
            <option value="">Selecionar...</option>
            {(forns||[]).map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
          {!form.fornecedor_id && <input className="fi" style={{ marginTop:4 }} value={form.fornecedor_nome} onChange={up('fornecedor_nome')} placeholder="Ou digitar nome" />}
        </div>
        <div className="fg"><label className="fl">Entrega prevista</label><input className="fi" type="date" value={form.data_prevista||''} onChange={up('data_prevista')} /></div>
      </div>
      <div style={{ fontWeight:600, margin:'12px 0 8px' }}>Itens</div>
      {itens.map((it, idx) => (
        <div key={idx} style={{ display:'flex', gap:6, marginBottom:6, alignItems:'center' }}>
          <input className="fi" style={{ flex:2 }} placeholder="Descrição" value={it.descricao} onChange={e => upItem(idx,'descricao',e.target.value)} />
          <input className="fi" style={{ width:60 }} type="number" min={1} value={it.quantidade} onChange={e => upItem(idx,'quantidade',e.target.value)} />
          <input className="fi" style={{ width:90 }} type="number" step="0.01" inputMode="decimal" value={it.preco_unitario} onChange={e => upItem(idx,'preco_unitario',e.target.value)} placeholder="R$" />
          <button className="btn btn-g btn-sm" onClick={() => remItem(idx)}>✕</button>
        </div>
      ))}
      <button className="btn btn-s btn-sm" onClick={addItem} style={{ marginBottom:8 }}>+ Item</button>
      <div style={{ textAlign:'right', fontWeight:600, marginBottom:12 }}>Total: {fmtMoeda(total)}</div>
      <div className="fg"><label className="fl">Observações</label><textarea className="fi" value={form.obs||''} onChange={up('obs')} rows={2} /></div>
      <div style={{ display:'flex', gap:8, marginTop:8 }}>
        <button className="btn btn-p" style={{ flex:1 }} onClick={salvar} disabled={act.loading}>{act.loading ? '...' : 'Salvar'}</button>
        <button className="btn btn-s" onClick={onClose}>Cancelar</button>
      </div>
    </Modal>
  )
}

// ============================================================
// ESTOQUE
// ============================================================
function ConsignacaoTab() {
  const { perfil } = useAuth()
  const { data: lista, loading, reload } = useData(() => consignacoesService.list(), [])
  const [modal, setModal] = useState(null)
  const { data: catalogo } = useData(() => catalogoService.list(), [])
  const { data: clientes } = useData(() => clientesService.list(), [])
  const empty = { produto_nome:'', quantidade:1, cliente_nome:'', loja:'', data_saida:new Date().toISOString().split('T')[0], prazo_retorno:'', observacoes:'' }
  const [form, setForm] = useState(empty)
  const act = useAction()
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const hoje = new Date().toISOString().split('T')[0]

  const prazoAlert = (lista||[]).filter(c => c.status === 'em_aprovacao' && c.prazo_retorno && c.prazo_retorno <= new Date(Date.now() + 86400000).toISOString().split('T')[0])

  const salvar = async () => {
    if (!form.produto_nome || !form.cliente_nome) return toast.error('Produto e cliente obrigatórios')
    try {
      await act.run(() => consignacoesService.create({ ...form, registrado_por: perfil?.full_name, status: 'em_aprovacao' }))
      toast.success('Consignação registrada'); setModal(null); reload()
    } catch (e) { toast.error(e.message) }
  }

  const atualizarStatus = async (id, status) => {
    try { await act.run(() => consignacoesService.update(id, { status, devolvido_em: status === 'devolvido' ? hoje : null })); reload(); toast.success('Atualizado') } catch (e) { toast.error(e.message) }
  }

  const STATUS_COR = { em_aprovacao:'var(--amber)', aprovado:'var(--green)', devolvido:'var(--t2)', vencido:'var(--red)' }
  const STATUS_LABEL = { em_aprovacao:'Em Aprovação', aprovado:'Aprovado/Vendido', devolvido:'Devolvido', vencido:'Vencido' }

  return (
    <div>
      {prazoAlert.length > 0 && <Alert type="warning" style={{ marginBottom:12 }}>{prazoAlert.length} consignação(ões) vencem amanhã ou já venceram</Alert>}
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
        <button className="btn btn-p btn-sm" onClick={() => { setForm(empty); setModal({}) }}>+ Nova Consignação</button>
      </div>
      {loading ? <Spinner /> : (lista||[]).length === 0 ? <Empty text="Nenhuma consignação" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {(lista||[]).map(c => (
            <div key={c.id} className="card" style={{ borderLeft:`3px solid ${STATUS_COR[c.status]||'var(--border)'}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <div>
                  <div style={{ fontWeight:600 }}>{c.produto_nome} × {c.quantidade}</div>
                  <div style={{ fontSize:12, color:'var(--t2)' }}>{c.cliente_nome} · {c.loja||'—'}</div>
                </div>
                <Badge variant="bg">{STATUS_LABEL[c.status]||c.status}</Badge>
              </div>
              <div style={{ fontSize:12, color:'var(--t2)' }}>Saída: {c.data_saida} · Prazo: {c.prazo_retorno||'—'}{c.prazo_retorno && c.prazo_retorno < hoje && c.status==='em_aprovacao' ? ' ⚠️' : ''}</div>
              {c.status === 'em_aprovacao' && (
                <div style={{ display:'flex', gap:6, marginTop:8 }}>
                  <button className="btn btn-p btn-sm" onClick={() => atualizarStatus(c.id,'aprovado')}>✓ Vira Venda</button>
                  <button className="btn btn-s btn-sm" onClick={() => atualizarStatus(c.id,'devolvido')}>↩ Devolvido</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {modal && (
        <Modal title="Nova Consignação" onClose={() => setModal(null)}>
          <div className="grid2">
            <div className="fg" style={{ gridColumn:'1/-1' }}>
              <label className="fl">Produto *</label>
              <select className="fi" value={form.produto_nome} onChange={e => setForm(p => ({ ...p, produto_nome: e.target.value }))}>
                <option value="">Selecionar...</option>
                {(catalogo||[]).map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">Quantidade</label><input className="fi" type="number" min={1} value={form.quantidade} onChange={up('quantidade')} /></div>
            <div className="fg"><label className="fl">Cliente *</label>
              <select className="fi" value={form.cliente_nome} onChange={e => setForm(p => ({ ...p, cliente_nome: e.target.value }))}>
                <option value="">Selecionar...</option>
                {(clientes||[]).map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">Loja</label><LojaSelect value={form.loja} onChange={v => setForm(p => ({ ...p, loja: v }))} /></div>
            <div className="fg"><label className="fl">Data saída</label><input className="fi" type="date" value={form.data_saida} onChange={up('data_saida')} /></div>
            <div className="fg"><label className="fl">Prazo retorno</label><input className="fi" type="date" value={form.prazo_retorno} onChange={up('prazo_retorno')} /></div>
            <div className="fg" style={{ gridColumn:'1/-1' }}><label className="fl">Observações</label><textarea className="fi" rows={2} value={form.observacoes} onChange={up('observacoes')} /></div>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button className="btn btn-p" style={{ flex:1 }} onClick={salvar} disabled={act.loading}>{act.loading?'...':'Registrar'}</button>
            <button className="btn btn-s" onClick={() => setModal(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function InventarioTab() {
  const lojaEf = useEffectiveLoja()
  const { data: itens, loading } = useData(() => estoqueService.list(lojaEf), [lojaEf])
  const [contagem, setContagem] = useState({})
  const [iniciado, setIniciado] = useState(false)
  const [busca, setBusca] = useState('')
  const act = useAction()

  const filtrado = (itens||[]).filter(i => !busca || i.nome?.toLowerCase().includes(busca.toLowerCase()))
  const divergencias = (itens||[]).filter(i => contagem[i.id] !== undefined && parseInt(contagem[i.id]) !== (i.estoque_atual||0))
  const ajustar = async () => {
    if (!divergencias.length) return toast.info('Nenhuma divergência encontrada')
    try {
      for (const item of divergencias) {
        const nova = parseInt(contagem[item.id])
        await act.run(() => estoqueService.update(item.id, { estoque_atual: nova }))
      }
      toast.success(`${divergencias.length} item(ns) ajustado(s)`); setIniciado(false); setContagem({})
    } catch (e) { toast.error(e.message) }
  }

  if (loading) return <Spinner />
  if (!iniciado) return (
    <div style={{ textAlign:'center', padding:'40px 16px' }}>
      <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
      <div style={{ fontWeight:600, fontSize:18, marginBottom:8 }}>Inventário de Estoque</div>
      <div style={{ color:'var(--t2)', fontSize:13, marginBottom:20 }}>Conte os produtos físicos e compare com o sistema.</div>
      <button className="btn btn-p" onClick={() => setIniciado(true)}>Iniciar Inventário</button>
    </div>
  )

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
        <input className="fi" style={{ flex:1, minWidth:140 }} placeholder="Buscar produto..." value={busca} onChange={e => setBusca(e.target.value)} />
        {divergencias.length > 0 && <button className="btn btn-p btn-sm" onClick={ajustar} disabled={act.loading}>Ajustar {divergencias.length} divergência(s)</button>}
        <button className="btn btn-s btn-sm" onClick={() => { setIniciado(false); setContagem({}) }}>Cancelar</button>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {filtrado.map(item => {
          const contado = contagem[item.id]
          const val = contado !== undefined ? parseInt(contado) : null
          const diff = val !== null ? val - (item.estoque_atual||0) : 0
          const hasDiff = val !== null && val !== (item.estoque_atual||0)
          return (
            <div key={item.id} className="card" style={{ display:'flex', gap:10, alignItems:'center', padding:'8px 12px', background: hasDiff ? (diff < 0 ? 'rgba(239,68,68,.06)' : 'rgba(34,197,94,.06)') : undefined }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:13 }}>{item.nome}</div>
                <div style={{ fontSize:11, color:'var(--t2)' }}>Sistema: {item.estoque_atual||0} {item.unidade||'un'}</div>
              </div>
              <input type="number" min={0} value={contagem[item.id]||''} onChange={e => setContagem(p => ({ ...p, [item.id]: e.target.value }))}
                style={{ width:70, padding:'6px 8px', border:`2px solid ${hasDiff ? (diff<0?'var(--red)':'var(--green)') : 'var(--border)'}`, borderRadius:8, textAlign:'center', fontSize:14, fontWeight:600 }}
                placeholder="—" />
              {hasDiff && <span style={{ fontSize:12, fontWeight:700, color: diff<0?'var(--red)':'var(--green)', width:40, textAlign:'right' }}>{diff>0?'+':''}{diff}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EstoqueEtiquetas() {
  const lojaEf = useEffectiveLoja()
  const { data: itens, loading } = useData(() => estoqueService.list(lojaEf), [lojaEf])
  const [selecionados, setSelecionados] = useState([])
  const [copias, setCopias] = useState(1)
  const toggle = (id) => setSelecionados(p => p.includes(id) ? p.filter(x => x!==id) : [...p, id])
  const imprimir = () => {
    const sel = (itens||[]).filter(i => selecionados.includes(i.id))
    if (!sel.length) return toast.error('Selecione ao menos um produto')
    const win = window.open('','_blank','width=600,height=500')
    const linhas = sel.flatMap(p => Array(copias).fill(null).map(() =>
      `<div style="border:1px solid #ccc;border-radius:8px;padding:8px 12px;margin:4px;display:inline-block;width:160px;vertical-align:top;font-family:sans-serif">
        <div style="font-size:11px;color:#666;">${p.referencia||p.sku||''}</div>
        <div style="font-size:13px;font-weight:600;margin:2px 0">${p.nome}</div>
        ${p.loja ? `<div style="font-size:10px;color:#888">${p.loja}</div>` : ''}
        <div style="font-size:18px;font-weight:700;color:#6366f1;margin-top:4px">${fmtR(p.preco_venda)}</div>
      </div>`
    ))
    win.document.write(`<!DOCTYPE html><html><body style="background:#fff">${linhas.join('')}<script>window.onload=()=>{window.print();window.close()}<\/script></body></html>`)
    win.document.close()
  }

  if (loading) return <Spinner />
  return (
    <div>
      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12, flexWrap:'wrap' }}>
        <div style={{ fontSize:13, color:'var(--t2)' }}>{selecionados.length} selecionado(s)</div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <label style={{ fontSize:12, color:'var(--t2)' }}>Cópias:</label>
          <input type="number" min={1} max={10} value={copias} onChange={e=>setCopias(parseInt(e.target.value)||1)} style={{ width:50, padding:'4px 6px', border:'1px solid var(--border)', borderRadius:6 }} />
        </div>
        <button className="btn btn-p btn-sm" onClick={imprimir} disabled={!selecionados.length}>🖨 Imprimir Etiquetas</button>
        <button className="btn btn-s btn-sm" onClick={() => setSelecionados((itens||[]).map(i => i.id))}>Selecionar tudo</button>
        <button className="btn btn-s btn-sm" onClick={() => setSelecionados([])}>Limpar</button>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {(itens||[]).map(p => (
          <div key={p.id} className="card" style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', cursor:'pointer', background: selecionados.includes(p.id) ? 'var(--adim)' : undefined, borderLeft: selecionados.includes(p.id) ? '3px solid var(--accent)' : '3px solid transparent' }} onClick={() => toggle(p.id)}>
            <input type="checkbox" checked={selecionados.includes(p.id)} onChange={()=>toggle(p.id)} style={{ flexShrink:0 }} />
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:13 }}>{p.nome}</div>
              <div style={{ fontSize:11, color:'var(--t2)' }}>{p.referencia||p.sku||'—'} · {p.loja||'—'}</div>
            </div>
            <div style={{ fontWeight:700, color:'var(--accent)', fontSize:15 }}>{fmtR(p.preco_venda)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Estoque() {
  const [tab, setTab] = useState('dashboard')
  const TABS = [
    { id:'dashboard',label:'Painel' },
    { id:'nf',label:'Entradas NF' },
    { id:'mov',label:'Movimentações' },
    { id:'etiquetas',label:'Etiquetas' },
    { id:'consignacao',label:'Consignação' },
    { id:'inventario',label:'Inventário' },
  ]
  return (
    <div className="page">
      <div className="ph"><h1>Estoque</h1></div>
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {TABS.map(t => <button key={t.id} className={`btn btn-${tab===t.id?'p':'s'} btn-sm`} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>
      {tab === 'dashboard' && <EstoqueDashboard />}
      {tab === 'nf' && <EstoqueNF />}
      {tab === 'mov' && <EstoqueMov />}
      {tab === 'etiquetas' && <EstoqueEtiquetas />}
      {tab === 'consignacao' && <ConsignacaoTab />}
      {tab === 'inventario' && <InventarioTab />}
    </div>
  )
}

function EstoqueDashboard() {
  const lojaEf = useEffectiveLoja()
  const { data: itens, loading } = useData(() => estoqueService.list(lojaEf), [lojaEf])
  if (loading) return <Spinner />
  const total = (itens||[]).length
  const baixo = (itens||[]).filter(i => (i.estoque_atual||0) <= (i.estoque_minimo||0)).length
  const lojas = [...new Set((itens||[]).map(i => i.loja).filter(Boolean))]
  return (
    <div>
      <div className="stats" style={{ marginBottom:16 }}>
        <div className="stat"><div className="stat-n">{total}</div><div className="stat-l">Itens</div></div>
        <div className="stat"><div className="stat-n" style={{ color:'var(--red)' }}>{baixo}</div><div className="stat-l">Estoque baixo</div></div>
        <div className="stat"><div className="stat-n">{lojas.length}</div><div className="stat-l">Lojas</div></div>
      </div>
      {baixo > 0 && <Alert type="warning" style={{ marginBottom:12 }}>{baixo} item(ns) com estoque abaixo do mínimo</Alert>}
      {(itens||[]).length === 0 ? <Empty text="Nenhum item no estoque" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {(itens||[]).map(i => (
            <div key={i.id} className="card" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{i.nome_produto}</div>
                <div style={{ fontSize:12, color:'var(--t2)' }}>{i.loja} · Ref: {i.referencia||'—'}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontWeight:700, color: (i.estoque_atual||0)<=(i.estoque_minimo||0) ? 'var(--red)' : 'var(--green)' }}>{i.estoque_atual||0} {i.unidade||'un'}</div>
                <div style={{ fontSize:11, color:'var(--t2)' }}>mín: {i.estoque_minimo||0}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EstoqueNF() {
  const { data: lista, loading, reload } = useData(() => estoqueService.listNFEntradas(), [])
  const [modal, setModal] = useState(false)
  const { data: forns } = useData(() => fornecedoresService.list(), [])
  const [form, setForm] = useState({ fornecedor_nome:'', numero_nf:'', data_emissao:'', valor_total:'' })
  const [itens, setItens] = useState([{ descricao:'', quantidade:1, preco_unitario:0 }])
  const act = useAction()
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const upItem = (idx, k, v) => setItens(p => p.map((it,i) => i===idx ? { ...it, [k]: v } : it))
  const fmtMoeda = (v) => (parseFloat(v)||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })

  const salvar = async () => {
    if (!form.fornecedor_nome || !form.numero_nf) return toast.error('Fornecedor e NF obrigatórios')
    try {
      const nf = await act.run(() => estoqueService.createNFEntrada({ ...form, valor_total: parseFloat(form.valor_total)||0, status:'pendente' }))
      const itensSaved = await estoqueService.createNFItens(itens.map(i => ({ ...i, nf_entrada_id: nf.id, quantidade: parseInt(i.quantidade)||1, preco_unitario: parseFloat(i.preco_unitario)||0 })))
      // Integração: movimentos_estoque e atualização de estoque
      try {
        for (const it of itensSaved || []) {
          await supabase.from('movimentos_estoque').insert({ tipo: 'entrada', produto_nome: it.descricao, quantidade: it.quantidade, origem: 'nf_entrada', referencia_id: nf.id, fornecedor_nome: form.fornecedor_nome })
        }
      } catch (_) { /* colunas podem não existir ainda */ }
      toast.success('NF registrada'); setModal(false); reload()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
        <button className="btn btn-p btn-sm" onClick={() => setModal(true)}>+ Entrada NF</button>
      </div>
      {loading ? <Spinner /> : (lista||[]).length === 0 ? <Empty text="Nenhuma NF registrada" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {(lista||[]).map(nf => (
            <div key={nf.id} className="card" style={{ padding:'10px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontWeight:600 }}>{nf.fornecedor_nome}</div>
                  <div style={{ fontSize:12, color:'var(--t2)' }}>NF {nf.numero_nf} · {new Date(nf.created_at).toLocaleDateString('pt-BR')} · {nf.nf_entrada_itens?.length||0} itens</div>
                </div>
                <div style={{ fontWeight:700 }}>{fmtMoeda(nf.valor_total)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <Modal title="Nova Entrada de NF" onClose={() => setModal(false)}>
          <div className="grid2">
            <div className="fg" style={{ gridColumn:'1/-1' }}>
              <label className="fl">Fornecedor *</label>
              <select className="fi" onChange={e => { const f=(forns||[]).find(x=>x.id===e.target.value); setForm(p=>({...p,fornecedor_id:e.target.value,fornecedor_nome:f?.nome||p.fornecedor_nome})) }}>
                <option value="">Selecionar...</option>
                {(forns||[]).map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
              <input className="fi" style={{ marginTop:4 }} value={form.fornecedor_nome} onChange={up('fornecedor_nome')} placeholder="Ou digitar fornecedor" />
            </div>
            <div className="fg"><label className="fl">Nº NF *</label><input className="fi" value={form.numero_nf} onChange={up('numero_nf')} /></div>
            <div className="fg"><label className="fl">Data emissão</label><input className="fi" type="date" value={form.data_emissao} onChange={up('data_emissao')} /></div>
            <div className="fg"><label className="fl">Valor total (R$)</label><input className="fi" type="number" step="0.01" inputMode="decimal" value={form.valor_total} onChange={up('valor_total')} /></div>
          </div>
          <div style={{ fontWeight:600, margin:'12px 0 8px' }}>Itens</div>
          {itens.map((it, idx) => (
            <div key={idx} style={{ display:'flex', gap:6, marginBottom:6, alignItems:'center' }}>
              <input className="fi" style={{ flex:2 }} placeholder="Descrição" value={it.descricao} onChange={e => upItem(idx,'descricao',e.target.value)} />
              <input className="fi" style={{ width:60 }} type="number" value={it.quantidade} onChange={e => upItem(idx,'quantidade',e.target.value)} />
              <input className="fi" style={{ width:80 }} type="number" step="0.01" inputMode="decimal" value={it.preco_unitario} onChange={e => upItem(idx,'preco_unitario',e.target.value)} placeholder="R$" />
              <button className="btn btn-g btn-sm" onClick={() => setItens(p => p.filter((_,i)=>i!==idx))}>✕</button>
            </div>
          ))}
          <button className="btn btn-s btn-sm" onClick={() => setItens(p => [...p, { descricao:'', quantidade:1, preco_unitario:0 }])}>+ Item</button>
          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <button className="btn btn-p" style={{ flex:1 }} onClick={salvar} disabled={act.loading}>{act.loading ? '...' : 'Registrar NF'}</button>
            <button className="btn btn-s" onClick={() => setModal(false)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function EstoqueMov() {
  const lojaEf = useEffectiveLoja()
  const { data: lista, loading, reload } = useData(() => estoqueService.listMovimentacoes(), [])
  const { data: estoqueItens } = useData(() => estoqueService.list(lojaEf), [lojaEf])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ tipo:'entrada', descricao:'', quantidade:1, loja:'', referencia:'' })
  const act = useAction()
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const registrar = async () => {
    if (!form.descricao || !form.quantidade) return toast.error('Preencha todos os campos')
    try {
      await act.run(() => estoqueService.createMovimentacao({ ...form, quantidade: parseInt(form.quantidade), data: new Date().toISOString().split('T')[0] }))
      toast.success('Movimentação registrada'); setModal(false); reload()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
        <button className="btn btn-p btn-sm" onClick={() => setModal(true)}>+ Movimentação</button>
      </div>
      {loading ? <Spinner /> : (lista||[]).length === 0 ? <Empty text="Nenhuma movimentação" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {(lista||[]).map(m => (
            <div key={m.id} className="card" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px' }}>
              <span style={{ fontSize:18 }}>{m.tipo === 'entrada' ? '↑' : '↓'}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{m.descricao}</div>
                <div style={{ fontSize:12, color:'var(--t2)' }}>{m.loja} · {new Date(m.created_at).toLocaleDateString('pt-BR')}</div>
              </div>
              <div style={{ fontWeight:700, color: m.tipo==='entrada' ? 'var(--green)' : 'var(--red)' }}>
                {m.tipo==='entrada'?'+':'-'}{m.quantidade}
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <Modal title="Nova Movimentação" onClose={() => setModal(false)}>
          <div className="fg">
            <label className="fl">Tipo</label>
            <select className="fi" value={form.tipo} onChange={up('tipo')}>
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
              <option value="ajuste">Ajuste</option>
            </select>
          </div>
          <div className="fg"><label className="fl">Descrição / Produto</label><input className="fi" value={form.descricao} onChange={up('descricao')} /></div>
          <div className="grid2">
            <div className="fg"><label className="fl">Quantidade</label><input className="fi" type="number" value={form.quantidade} onChange={up('quantidade')} /></div>
            <div className="fg"><label className="fl">Loja</label><LojaSelect value={form.loja} onChange={v => setForm(p => ({ ...p, loja: v }))} /></div>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button className="btn btn-p" style={{ flex:1 }} onClick={registrar} disabled={act.loading}>{act.loading ? '...' : 'Registrar'}</button>
            <button className="btn btn-s" onClick={() => setModal(false)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ============================================================
// FINANCEIRO
// ============================================================
function FinanceiroDRE() {
  const [mes, setMes] = useState(new Date().toISOString().slice(0,7))
  const { lojaFiltro: lojaGlobal } = useLojaFiltro()
  const [lojaFiltro, setLojaFiltro] = useState(lojaGlobal || '')
  const { data: vendas } = useData(() => vendasService.list(), [])
  const { data: pagar } = useData(() => financeiroService.listPagar(), [])
  const { data: folha } = useData(() => dpService.listFolha(mes), [mes])
  const { data: devs } = useData(async () => { try { return await devolucoesService.list() } catch { return [] } }, [])
  const fmtM = (v) => (parseFloat(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})

  const inMes = (date) => date?.startsWith(mes)
  const vendMes = (vendas||[]).filter(v => inMes(v.created_at) && (!lojaFiltro || v.loja === lojaFiltro))
  const receitaBruta = vendMes.filter(v => v.status !== 'cancelado').reduce((s,v) => s + (parseFloat(v.total)||0), 0)
  const devolucoesMes = (devs||[]).filter(d => inMes(d.created_at) && (!lojaFiltro || d.loja === lojaFiltro)).reduce((s,d) => s + (parseFloat(d.valor_devolvido)||0), 0)
  const receitaLiq = receitaBruta - devolucoesMes

  const cmv = vendMes.filter(v => v.status !== 'cancelado').reduce((s,v) => {
    const itens = v.venda_itens || []
    return s + itens.reduce((si, i) => si + (parseFloat(i.preco_custo)||0) * (parseInt(i.quantidade)||1), 0)
  }, 0)
  const lucroBruto = receitaLiq - cmv

  const pagarMes = (pagar||[]).filter(p => inMes(p.vencimento) && (!lojaFiltro || p.loja === lojaFiltro))
  const despesasOp = pagarMes.reduce((s,p) => s + (parseFloat(p.valor)||0), 0)
  const comissoes = vendMes.reduce((s,v) => s + (parseFloat(v.comissao_valor)||0), 0)
  const salarios = (folha||[]).filter(f => !lojaFiltro || f.loja === lojaFiltro).reduce((s,f) => s + (parseFloat(f.liquido)||0), 0)
  const ebitda = lucroBruto - despesasOp - comissoes - salarios
  const impostos = receitaBruta * 0.06
  const lucroLiq = ebitda - impostos

  const linha = (label, valor, cor, bold, indent) => (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--border)', paddingLeft: indent ? 16 : 0 }}>
      <span style={{ fontSize:13, color:'var(--t2)', fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize:13, fontWeight: bold ? 700 : 400, color: cor || 'var(--t1)' }}>{fmtM(valor)}</span>
    </div>
  )

  const exportarPDF = () => {
    const win = window.open('','_blank','width=700,height=900')
    win.document.write(`<!DOCTYPE html><html><head><title>DRE ${mes}</title><style>body{font-family:sans-serif;padding:24px;color:#1e293b}h2{color:#6366f1}table{width:100%;border-collapse:collapse}td{padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:13px}.r{text-align:right}.bold{font-weight:700}.green{color:#16a34a}.red{color:#dc2626}</style></head><body>
    <h2>DRE — ${mes}${lojaFiltro ? ' · '+lojaFiltro : ' · Consolidado'}</h2>
    <table>
    <tr><td>Receita Bruta</td><td class="r bold green">${fmtM(receitaBruta)}</td></tr>
    <tr><td>&nbsp;&nbsp;(-) Devoluções</td><td class="r red">${fmtM(devolucoesMes)}</td></tr>
    <tr><td class="bold">(=) Receita Líquida</td><td class="r bold">${fmtM(receitaLiq)}</td></tr>
    <tr><td>&nbsp;&nbsp;(-) CMV</td><td class="r red">${fmtM(cmv)}</td></tr>
    <tr><td class="bold">(=) Lucro Bruto</td><td class="r bold">${fmtM(lucroBruto)}</td></tr>
    <tr><td>&nbsp;&nbsp;(-) Despesas Operacionais</td><td class="r red">${fmtM(despesasOp)}</td></tr>
    <tr><td>&nbsp;&nbsp;(-) Comissões</td><td class="r red">${fmtM(comissoes)}</td></tr>
    <tr><td>&nbsp;&nbsp;(-) Salários</td><td class="r red">${fmtM(salarios)}</td></tr>
    <tr><td class="bold">(=) EBITDA</td><td class="r bold ${ebitda>=0?'green':'red'}">${fmtM(ebitda)}</td></tr>
    <tr><td>&nbsp;&nbsp;(-) Impostos estimados (6%)</td><td class="r red">${fmtM(impostos)}</td></tr>
    <tr style="background:#f1f5f9"><td class="bold">(=) Lucro Líquido</td><td class="r bold ${lucroLiq>=0?'green':'red'}">${fmtM(lucroLiq)}</td></tr>
    </table>
    <script>window.onload=()=>{window.print();window.close()}<\/script></body></html>`)
    win.document.close()
  }

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <input className="fi" type="month" value={mes} onChange={e=>setMes(e.target.value)} style={{ width:'auto' }} />
        <select className="fi" style={{ width:'auto' }} value={lojaFiltro} onChange={e=>setLojaFiltro(e.target.value)}>
          <option value="">Consolidado grupo</option>
          {LOJAS_GRUPO.map(l => <option key={l}>{l}</option>)}
        </select>
        <button className="btn btn-s btn-sm" onClick={exportarPDF}>📄 Exportar PDF</button>
      </div>
      <div className="card">
        <div style={{ fontWeight:700, fontSize:15, marginBottom:12, color:'var(--accent)' }}>DRE — {mes}{lojaFiltro ? ' · '+lojaFiltro : ' · Consolidado'}</div>
        {linha('(+) Receita Bruta', receitaBruta, 'var(--green)', true)}
        {linha('(-) Devoluções/Cancelamentos', devolucoesMes, 'var(--red)', false, true)}
        {linha('(=) Receita Líquida', receitaLiq, receitaLiq>=0?'var(--green)':'var(--red)', true)}
        {linha('(-) CMV (Custo dos Produtos)', cmv, 'var(--red)', false, true)}
        {linha('(=) Lucro Bruto', lucroBruto, lucroBruto>=0?'var(--green)':'var(--red)', true)}
        {linha('(-) Despesas Operacionais', despesasOp, 'var(--red)', false, true)}
        {linha('(-) Comissões Pagas', comissoes, 'var(--red)', false, true)}
        {linha('(-) Salários', salarios, 'var(--red)', false, true)}
        {linha('(=) EBITDA', ebitda, ebitda>=0?'var(--green)':'var(--red)', true)}
        {linha('(-) Impostos estimados (6% RB)', impostos, 'var(--red)', false, true)}
        <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', marginTop:4, borderTop:'2px solid var(--accent)' }}>
          <span style={{ fontWeight:700, fontSize:15 }}>(=) Lucro Líquido</span>
          <span style={{ fontWeight:700, fontSize:15, color: lucroLiq>=0?'var(--green)':'var(--red)' }}>{fmtM(lucroLiq)}</span>
        </div>
      </div>
    </div>
  )
}

function NPSDashboard() {
  const { data: lista, loading } = useData(() => npsService.list(), [])
  const [mesFiltro, setMesFiltro] = useState('')

  const filtrado = mesFiltro ? (lista||[]).filter(n => n.respondido_em?.startsWith(mesFiltro)) : (lista||[]).filter(n => n.nota !== null && n.nota !== undefined)
  const respondidos = filtrado.filter(n => n.nota !== null && n.nota !== undefined)
  const promotores  = respondidos.filter(n => n.nota >= 9).length
  const neutros     = respondidos.filter(n => n.nota >= 7 && n.nota <= 8).length
  const detratores  = respondidos.filter(n => n.nota <= 6).length
  const npsScore    = respondidos.length ? Math.round(((promotores - detratores) / respondidos.length) * 100) : null

  const COR = { promotor:'var(--green)', neutro:'var(--amber)', detrator:'var(--red)' }

  if (loading) return <Spinner />
  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'center' }}>
        <input className="fi" type="month" value={mesFiltro} onChange={e=>setMesFiltro(e.target.value)} style={{ width:'auto' }} placeholder="Filtrar por mês" />
        {mesFiltro && <button className="btn btn-s btn-sm" onClick={()=>setMesFiltro('')}>Limpar</button>}
      </div>
      <div className="stats" style={{ marginBottom:16 }}>
        <div className="stat">
          <div className="stat-n" style={{ color: npsScore === null ? 'var(--t2)' : npsScore >= 50 ? 'var(--green)' : npsScore >= 0 ? 'var(--amber)' : 'var(--red)', fontSize:26 }}>
            {npsScore === null ? '—' : npsScore}
          </div>
          <div className="stat-l">NPS Score</div>
        </div>
        <div className="stat"><div className="stat-n" style={{ color:'var(--green)' }}>{promotores}</div><div className="stat-l">Promotores</div></div>
        <div className="stat"><div className="stat-n" style={{ color:'var(--amber)' }}>{neutros}</div><div className="stat-l">Neutros</div></div>
        <div className="stat"><div className="stat-n" style={{ color:'var(--red)' }}>{detratores}</div><div className="stat-l">Detratores</div></div>
      </div>
      {respondidos.length > 0 && (
        <div style={{ display:'flex', gap:4, height:8, borderRadius:4, overflow:'hidden', marginBottom:16 }}>
          <div style={{ flex:promotores, background:'var(--green)' }} />
          <div style={{ flex:neutros, background:'var(--amber)' }} />
          <div style={{ flex:detratores, background:'var(--red)' }} />
        </div>
      )}
      {respondidos.length === 0 ? <Empty text="Nenhuma resposta de NPS ainda" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {respondidos.slice().sort((a,b) => (b.respondido_em||'')>(a.respondido_em||'')?1:-1).map(n => (
            <div key={n.id} className="card" style={{ padding:'10px 14px', borderLeft:`3px solid ${COR[n.classificacao]||'var(--border)'}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                <span style={{ fontWeight:600, fontSize:13 }}>{n.cliente_nome || 'Cliente'} · {n.loja || '—'}</span>
                <span style={{ fontWeight:700, fontSize:18, color: COR[n.classificacao]||'var(--t1)' }}>{n.nota}</span>
              </div>
              {n.comentario && <div style={{ fontSize:12, color:'var(--t2)', fontStyle:'italic' }}>"{n.comentario}"</div>}
              <div style={{ fontSize:11, color:'var(--t3)', marginTop:3 }}>{n.respondido_em ? new Date(n.respondido_em).toLocaleDateString('pt-BR') : '—'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FinanceiroRelatorios() {
  const { data: receber } = useData(() => financeiroService.listReceber(), [])
  const { data: pagar } = useData(() => financeiroService.listPagar(), [])
  const { data: vendas } = useData(() => vendasService.list(), [])
  const hoje = new Date()
  const mesAtual = hoje.toISOString().slice(0,7)
  const fmtM = (v) => (parseFloat(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})

  const recMes = (receber||[]).filter(r => r.vencimento?.startsWith(mesAtual))
  const pagMes = (pagar||[]).filter(p => p.vencimento?.startsWith(mesAtual))
  const totalRecMes = recMes.reduce((s,r) => s + (parseFloat(r.valor)||0), 0)
  const totalPagMes = pagMes.reduce((s,p) => s + (parseFloat(p.valor)||0), 0)
  const lucroMes = totalRecMes - totalPagMes

  const vendasMes = (vendas||[]).filter(v => v.created_at?.startsWith(mesAtual) && v.status !== 'cancelado')
  const totalVendasMes = vendasMes.reduce((s,v) => s + (parseFloat(v.total)||0), 0)
  const ticketMedio = vendasMes.length > 0 ? totalVendasMes / vendasMes.length : 0

  // ABC por loja
  const porLoja = {}
  ;(vendas||[]).filter(v => v.status !== 'cancelado').forEach(v => {
    const l = v.loja || 'Sem loja'
    porLoja[l] = (porLoja[l]||0) + (parseFloat(v.total)||0)
  })
  const lojaRanking = Object.entries(porLoja).sort((a,b) => b[1]-a[1])
  const totalGeral = lojaRanking.reduce((s,[,v]) => s+v, 0)

  return (
    <div>
      <div style={{ fontWeight:600, marginBottom:12, color:'var(--t2)', fontSize:12, textTransform:'uppercase' }}>Mês atual: {mesAtual}</div>
      <div className="stats" style={{ marginBottom:16 }}>
        <div className="stat"><div className="stat-n" style={{ color:'var(--green)', fontSize:16 }}>{fmtM(totalRecMes)}</div><div className="stat-l">Receitas</div></div>
        <div className="stat"><div className="stat-n" style={{ color:'var(--red)', fontSize:16 }}>{fmtM(totalPagMes)}</div><div className="stat-l">Despesas</div></div>
        <div className="stat"><div className="stat-n" style={{ color: lucroMes >= 0 ? 'var(--green)' : 'var(--red)', fontSize:16 }}>{fmtM(lucroMes)}</div><div className="stat-l">Resultado</div></div>
        <div className="stat"><div className="stat-n" style={{ color:'var(--accent)', fontSize:16 }}>{fmtM(ticketMedio)}</div><div className="stat-l">Ticket médio</div></div>
      </div>
      <div className="grid2">
        <div className="card">
          <div style={{ fontWeight:600, marginBottom:12 }}>Rentabilidade por Loja (ABC)</div>
          {lojaRanking.length === 0 ? <Empty text="Sem dados" /> : lojaRanking.map(([loja, val], i) => (
            <div key={loja} style={{ marginBottom:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                <span style={{ fontSize:13 }}>{i < 3 ? ['🥇','🥈','🥉'][i] : `${i+1}.`} {loja}</span>
                <span style={{ fontSize:13, fontWeight:600 }}>{fmtM(val)}</span>
              </div>
              <div style={{ height:6, borderRadius:3, background:'var(--border)' }}>
                <div style={{ height:'100%', borderRadius:3, background:'var(--accent)', width: `${totalGeral ? (val/totalGeral*100) : 0}%` }} />
              </div>
              <div style={{ fontSize:10, color:'var(--t3)', textAlign:'right' }}>{totalGeral ? (val/totalGeral*100).toFixed(1) : 0}%</div>
            </div>
          ))}
        </div>
        <div className="card">
          <div style={{ fontWeight:600, marginBottom:12 }}>Vendas do mês</div>
          <div style={{ fontSize:28, fontWeight:700, color:'var(--accent)', marginBottom:4 }}>{vendasMes.length}</div>
          <div style={{ fontSize:13, color:'var(--t2)', marginBottom:16 }}>vendas realizadas</div>
          <div style={{ fontWeight:600, marginBottom:8 }}>Ticket médio</div>
          <div style={{ fontSize:22, fontWeight:700, color:'var(--green)' }}>{fmtM(ticketMedio)}</div>
          <div style={{ marginTop:16, fontSize:12, color:'var(--t2)' }}>
            Total: {fmtM(totalVendasMes)}
          </div>
        </div>
      </div>
    </div>
  )
}

function Financeiro() {
  const { effectiveRole } = useAuth()
  const isAssistenteAdmin = effectiveRole === 'assistente_admin'
  const [tab, setTab] = useState('receber')
  const ALL_TABS = [
    { id:'resumo',     label:'Resumo',        hide: isAssistenteAdmin },
    { id:'receber',    label:'A Receber' },
    { id:'pagar',      label:'A Pagar' },
    { id:'dre',        label:'DRE',           hide: isAssistenteAdmin },
    { id:'nps',        label:'NPS',           hide: isAssistenteAdmin },
    { id:'relatorios', label:'Rentabilidade', hide: isAssistenteAdmin },
  ]
  const TABS = ALL_TABS.filter(t => !t.hide)
  return (
    <div className="page">
      <div className="ph"><h1>Financeiro</h1></div>
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {TABS.map(t => <button key={t.id} className={`btn btn-${tab===t.id?'p':'s'} btn-sm`} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>
      {tab === 'resumo' && <FinanceiroResumo />}
      {tab === 'receber' && <FinanceiroLista tipo="receber" />}
      {tab === 'pagar' && <FinanceiroLista tipo="pagar" />}
      {tab === 'dre' && <FinanceiroDRE />}
      {tab === 'nps' && <NPSDashboard />}
      {tab === 'relatorios' && <FinanceiroRelatorios />}
    </div>
  )
}

function FinanceiroResumo() {
  const lojaEf = useEffectiveLoja()
  const { data: receberRaw } = useData(() => financeiroService.listReceber(lojaEf), [lojaEf])
  const { data: pagarRaw } = useData(() => financeiroService.listPagar(lojaEf), [lojaEf])
  const receber = receberRaw
  const pagar = pagarRaw
  const hoje = new Date().toISOString().split('T')[0]
  const totalReceber = (receber||[]).filter(r => r.status !== 'pago').reduce((s,r) => s + (parseFloat(r.valor)||0), 0)
  const totalPagar   = (pagar||[]).filter(p => p.status !== 'pago').reduce((s,p) => s + (parseFloat(p.valor)||0), 0)
  const vencidosRec  = (receber||[]).filter(r => r.status !== 'pago' && r.vencimento < hoje).length
  const vencidosPag  = (pagar||[]).filter(p => p.status !== 'pago' && p.vencimento < hoje).length
  const fmtMoeda = (v) => (parseFloat(v)||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })
  return (
    <div>
      <div className="stats" style={{ marginBottom:16 }}>
        <div className="stat"><div className="stat-n" style={{ color:'var(--green)' }}>{fmtMoeda(totalReceber)}</div><div className="stat-l">A Receber</div></div>
        <div className="stat"><div className="stat-n" style={{ color:'var(--red)' }}>{fmtMoeda(totalPagar)}</div><div className="stat-l">A Pagar</div></div>
        <div className="stat"><div className="stat-n" style={{ color:'var(--accent)' }}>{fmtMoeda(totalReceber - totalPagar)}</div><div className="stat-l">Saldo</div></div>
      </div>
      {(vencidosRec + vencidosPag) > 0 && (
        <Alert type="error" style={{ marginBottom:12 }}>
          {vencidosRec > 0 && `${vencidosRec} recebimento(s) vencido(s). `}
          {vencidosPag > 0 && `${vencidosPag} pagamento(s) vencido(s).`}
        </Alert>
      )}
      <div className="grid2">
        <div className="card">
          <div style={{ fontWeight:600, marginBottom:8, color:'var(--green)' }}>Próximos recebimentos</div>
          {(receber||[]).filter(r => r.status !== 'pago').slice(0,5).map(r => (
            <div key={r.id} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'4px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={{ color: r.vencimento < hoje ? 'var(--red)' : 'var(--t1)' }}>{r.descricao}</span>
              <span>{fmtMoeda(r.valor)}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div style={{ fontWeight:600, marginBottom:8, color:'var(--red)' }}>Próximos pagamentos</div>
          {(pagar||[]).filter(p => p.status !== 'pago').slice(0,5).map(p => (
            <div key={p.id} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'4px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={{ color: p.vencimento < hoje ? 'var(--red)' : 'var(--t1)' }}>{p.descricao}</span>
              <span>{fmtMoeda(p.valor)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FinanceiroLista({ tipo }) {
  const lojaEf = useEffectiveLoja()
  const { data: lista, loading, reload } = useData(() => tipo === 'receber' ? financeiroService.listReceber(lojaEf) : financeiroService.listPagar(lojaEf), [tipo, lojaEf])
  const [modal, setModal] = useState(null)
  const CENTROS_CUSTO = ['Grupo Versa','Administrativo','Logística',...LOJAS_GRUPO]
  const empty = { descricao:'', valor:'', vencimento:'', categoria:'', cliente_fornecedor:'', status:'pendente', obs:'', loja:'', centro_custo:'' }
  const [form, setForm] = useState(empty)
  const act = useAction()
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const hoje = new Date().toISOString().split('T')[0]
  const fmtMoeda = (v) => (parseFloat(v)||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })

  const salvar = async () => {
    if (!form.descricao || !form.valor || !form.vencimento) return toast.error('Preencha os campos obrigatórios')
    try {
      const payload = { ...form, valor: parseFloat(form.valor) }
      if (!modal.item) {
        if (tipo === 'receber') await act.run(() => financeiroService.createReceber(payload))
        else await act.run(() => financeiroService.createPagar(payload))
      } else {
        if (tipo === 'receber') await act.run(() => financeiroService.updateReceber(modal.item.id, payload))
        else await act.run(() => financeiroService.updatePagar(modal.item.id, payload))
      }
      toast.success('Salvo'); setModal(null); reload()
    } catch (e) { toast.error(e.message) }
  }

  const marcarPago = async (item) => {
    try {
      if (tipo === 'receber') await financeiroService.updateReceber(item.id, { status:'pago', data_pagamento: hoje })
      else await financeiroService.updatePagar(item.id, { status:'pago', data_pagamento: hoje })
      toast.success('Marcado como pago'); reload()
    } catch (e) { toast.error(e.message) }
  }

  const CATS_REC = ['Venda','Serviço','Aluguel','Outros']
  const CATS_PAG = ['Fornecedor','Aluguel','Salário','Impostos','Serviços','Outros']
  const CATS = tipo === 'receber' ? CATS_REC : CATS_PAG

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
        <button className="btn btn-p btn-sm" onClick={() => { setForm(empty); setModal({}) }}>+ {tipo === 'receber' ? 'Nova Conta a Receber' : 'Nova Conta a Pagar'}</button>
      </div>
      {loading ? <Spinner /> : (lista||[]).length === 0 ? <Empty text="Nenhum lançamento" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {(lista||[]).map(item => (
            <div key={item.id} className="card" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', opacity: item.status === 'pago' ? 0.6 : 1 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14, display:'flex', alignItems:'center', gap:6 }}>
                  {item.descricao}
                  {item.status === 'pago' && <Badge variant="bg-green">Pago</Badge>}
                  {item.status !== 'pago' && item.vencimento < hoje && <Badge variant="bg-red">Vencido</Badge>}
                </div>
                <div style={{ fontSize:12, color:'var(--t2)' }}>{item.cliente_fornecedor} · Venc: {item.vencimento ? new Date(item.vencimento+'T12:00').toLocaleDateString('pt-BR') : '—'}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontWeight:700 }}>{fmtMoeda(item.valor)}</div>
                {item.status !== 'pago' && <button className="btn btn-p btn-sm" style={{ marginTop:4 }} onClick={() => marcarPago(item)}>Pagar</button>}
              </div>
              <button className="btn btn-s btn-sm" onClick={() => { setForm({ ...empty, ...item }); setModal({ item }) }}>✎</button>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <Modal title={tipo === 'receber' ? 'Conta a Receber' : 'Conta a Pagar'} onClose={() => setModal(null)}>
          <div className="grid2">
            <div className="fg" style={{ gridColumn:'1/-1' }}><label className="fl">Descrição *</label><input className="fi" value={form.descricao} onChange={up('descricao')} /></div>
            <div className="fg"><label className="fl">Valor (R$) *</label><input className="fi" type="number" step="0.01" inputMode="decimal" value={form.valor} onChange={up('valor')} /></div>
            <div className="fg"><label className="fl">Vencimento *</label><input className="fi" type="date" value={form.vencimento} onChange={up('vencimento')} /></div>
            <div className="fg"><label className="fl">{tipo==='receber'?'Cliente':'Fornecedor'}</label><input className="fi" value={form.cliente_fornecedor} onChange={up('cliente_fornecedor')} /></div>
            <div className="fg"><label className="fl">Categoria</label>
              <select className="fi" value={form.categoria} onChange={up('categoria')}>
                <option value="">—</option>
                {CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">Loja</label><LojaSelect value={form.loja||''} onChange={v => setForm(p => ({ ...p, loja: v }))} /></div>
            <div className="fg"><label className="fl">Centro de Custo</label>
              <select className="fi" value={form.centro_custo||''} onChange={up('centro_custo')}>
                <option value="">—</option>
                {CENTROS_CUSTO.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">Status</label>
              <select className="fi" value={form.status} onChange={up('status')}>
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>
          <div className="fg"><label className="fl">Observações</label><textarea className="fi" value={form.obs} onChange={up('obs')} rows={2} /></div>
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button className="btn btn-p" style={{ flex:1 }} onClick={salvar} disabled={act.loading}>{act.loading ? '...' : 'Salvar'}</button>
            <button className="btn btn-s" onClick={() => setModal(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ============================================================
// DEPARTAMENTO PESSOAL
// ============================================================
function DP() {
  const [tab, setTab] = useState('funcionarios')
  const [lojaFiltroDP, setLojaFiltroDP] = useState('')
  const TABS = [{ id:'funcionarios',label:'Funcionários' },{ id:'folha',label:'Folha de Pagamento' },{ id:'banco',label:'Banco de Horas' },{ id:'controle_ponto',label:'Controle de Ponto' }]
  return (
    <div className="page">
      <div className="ph">
        <h1>Dep. Pessoal</h1>
        <select className="fi" style={{ width:'auto', fontSize:13 }} value={lojaFiltroDP} onChange={e => setLojaFiltroDP(e.target.value)}>
          <option value="">Todas as lojas</option>
          {LOJAS_GRUPO.map(l => <option key={l}>{l}</option>)}
        </select>
      </div>
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {TABS.map(t => <button key={t.id} className={`btn btn-${tab===t.id?'p':'s'} btn-sm`} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>
      {tab === 'funcionarios' && <DPFuncionarios lojaFiltro={lojaFiltroDP} />}
      {tab === 'folha' && <DPFolha lojaFiltro={lojaFiltroDP} />}
      {tab === 'banco' && <DPBancoHoras />}
      {tab === 'controle_ponto' && <DPControlePonto lojaFiltro={lojaFiltroDP} />}
    </div>
  )
}

function DPFuncionarios({ lojaFiltro }) {
  const lojaEf = useEffectiveLoja()
  const filtroAtivo = lojaEf || lojaFiltro || null
  const { data: lista, loading, reload } = useData(() => dpService.listFuncionarios(filtroAtivo), [filtroAtivo])
  const [modal, setModal] = useState(null)
  const empty = { nome:'', cpf:'', cargo:'', departamento:'', admissao:'', salario:'', status:'ativo', email:'', telefone:'', loja:'' }
  const [form, setForm] = useState(empty)
  const act = useAction()
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const salvar = async () => {
    if (!form.nome || !form.cargo) return toast.error('Nome e cargo obrigatórios')
    try {
      const payload = { ...form, salario: parseFloat(form.salario)||0 }
      if (!modal.item) await act.run(() => dpService.createFuncionario(payload))
      else await act.run(() => dpService.updateFuncionario(modal.item.id, payload))
      toast.success('Salvo'); setModal(null); reload()
    } catch (e) { toast.error(e.message) }
  }

  const fmtMoeda = (v) => (parseFloat(v)||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
        <button className="btn btn-p btn-sm" onClick={() => { setForm(empty); setModal({}) }}>+ Novo Funcionário</button>
      </div>
      {loading ? <Spinner /> : (lista||[]).length === 0 ? <Empty text="Nenhum funcionário" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {(lista||[]).map(f => (
            <div key={f.id} className="card" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px' }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, flexShrink:0 }}>{f.nome?.[0]?.toUpperCase()}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{f.nome}</div>
                <div style={{ fontSize:12, color:'var(--t2)' }}>{f.cargo} · {f.departamento} · {fmtMoeda(f.salario)}</div>
              </div>
              <Badge variant={f.status==='ativo'?'bg-green':'bg'}>{f.status}</Badge>
              <button className="btn btn-s btn-sm" onClick={() => { setForm({ ...empty, ...f }); setModal({ item:f }) }}>Editar</button>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <Modal title={modal.item ? 'Editar Funcionário' : 'Novo Funcionário'} onClose={() => setModal(null)}>
          <div className="grid2">
            <div className="fg" style={{ gridColumn:'1/-1' }}><label className="fl">Nome *</label><input className="fi" value={form.nome} onChange={up('nome')} /></div>
            <div className="fg"><label className="fl">CPF</label><input className="fi" value={form.cpf} onChange={up('cpf')} /></div>
            <div className="fg"><label className="fl">Cargo *</label><input className="fi" value={form.cargo} onChange={up('cargo')} /></div>
            <div className="fg"><label className="fl">Departamento</label><input className="fi" value={form.departamento} onChange={up('departamento')} /></div>
            <div className="fg"><label className="fl">Admissão</label><input className="fi" type="date" value={form.admissao} onChange={up('admissao')} /></div>
            <div className="fg"><label className="fl">Salário (R$)</label><input className="fi" type="number" step="0.01" inputMode="decimal" value={form.salario} onChange={up('salario')} /></div>
            <div className="fg"><label className="fl">Email</label><input className="fi" value={form.email} onChange={up('email')} /></div>
            <div className="fg"><label className="fl">Telefone</label><input className="fi" value={form.telefone} onChange={up('telefone')} type="tel" /></div>
            <div className="fg"><label className="fl">Loja</label><LojaSelect value={form.loja||''} onChange={v => setForm(p => ({ ...p, loja: v }))} /></div>
            <div className="fg"><label className="fl">Status</label>
              <select className="fi" value={form.status} onChange={up('status')}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="ferias">Férias</option>
                <option value="afastado">Afastado</option>
              </select>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button className="btn btn-p" style={{ flex:1 }} onClick={salvar} disabled={act.loading}>{act.loading ? '...' : 'Salvar'}</button>
            <button className="btn btn-s" onClick={() => setModal(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function DPFolha({ lojaFiltro }) {
  const lojaEf = useEffectiveLoja()
  const filtroAtivo = lojaEf || lojaFiltro || null
  const mesAtual = new Date().toISOString().slice(0,7)
  const [mes, setMes] = useState(mesAtual)
  const { data: funcionarios } = useData(() => dpService.listFuncionarios(filtroAtivo), [filtroAtivo])
  const { data: folha, loading, reload } = useData(() => dpService.listFolha(mes), [mes])
  const act = useAction()

  const calcINSS = (sal) => {
    const s = parseFloat(sal)||0
    if (s <= 1412) return s * 0.075
    if (s <= 2666.68) return s * 0.09
    if (s <= 4000.03) return s * 0.12
    if (s <= 7786.02) return s * 0.14
    return 908.86
  }

  const calcIRRF = (base) => {
    const b = parseFloat(base)||0
    if (b <= 2259.20) return 0
    if (b <= 2826.65) return b * 0.075 - 169.44
    if (b <= 3751.05) return b * 0.15 - 381.44
    if (b <= 4664.68) return b * 0.225 - 662.77
    return b * 0.275 - 896.00
  }

  const gerarFolha = async () => {
    const ativos = (funcionarios||[]).filter(f => f.status === 'ativo')
    try {
      await act.run(async () => {
        for (const f of ativos) {
          const sal = parseFloat(f.salario)||0
          const inss = calcINSS(sal)
          const irrf = calcIRRF(sal - inss)
          const liquido = sal - inss - irrf
          await dpService.upsertFolha({ funcionario_id: f.id, funcionario_nome: f.nome, cargo: f.cargo, mes, salario_bruto: sal, inss, irrf, outros_descontos: 0, liquido, status: 'gerado' })
        }
      })
      toast.success(`Folha gerada para ${ativos.length} funcionários`)
      reload()
    } catch (e) { toast.error(e.message) }
  }

  const fmtMoeda = (v) => (parseFloat(v)||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'center' }}>
        <input className="fi" type="month" value={mes} onChange={e => setMes(e.target.value)} style={{ width:'auto' }} />
        <button className="btn btn-p btn-sm" onClick={gerarFolha} disabled={act.loading}>{act.loading ? 'Gerando...' : 'Gerar Folha'}</button>
      </div>
      {loading ? <Spinner /> : (folha||[]).length === 0 ? <Empty text="Nenhuma folha gerada para este mês" /> : (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'var(--t2)', fontWeight:600, padding:'6px 14px', borderBottom:'1px solid var(--border)', marginBottom:4 }}>
            <span>Funcionário</span><span>Bruto / INSS / IRRF / Líquido</span>
          </div>
          {(folha||[]).map(f => (
            <div key={f.id} className="card" style={{ display:'flex', alignItems:'center', padding:'10px 14px', marginBottom:6 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{f.funcionario_nome}</div>
                <div style={{ fontSize:12, color:'var(--t2)' }}>{f.cargo}</div>
              </div>
              <div style={{ fontSize:12, textAlign:'right', display:'flex', flexDirection:'column', gap:2 }}>
                <span>Bruto: {fmtMoeda(f.salario_bruto)}</span>
                <span style={{ color:'var(--red)' }}>INSS: -{fmtMoeda(f.inss)}</span>
                <span style={{ color:'var(--red)' }}>IRRF: -{fmtMoeda(f.irrf)}</span>
                <span style={{ fontWeight:700, color:'var(--green)' }}>Líq: {fmtMoeda(f.liquido)}</span>
              </div>
            </div>
          ))}
          <div className="card" style={{ textAlign:'right', fontWeight:700 }}>
            Total a pagar: {fmtMoeda((folha||[]).reduce((s,f) => s + (parseFloat(f.liquido)||0), 0))}
          </div>
        </div>
      )}
    </div>
  )
}

function DPBancoHoras() {
  const { data: pontos, loading } = useData(() => pontoService.listAllHoje(), [])
  return (
    <div>
      <div style={{ color:'var(--t2)', fontSize:14, marginBottom:12 }}>Registros de hoje</div>
      {loading ? <Spinner /> : (pontos||[]).length === 0 ? <Empty text="Nenhum ponto hoje" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {(pontos||[]).map((p, i) => (
            <div key={i} className="card" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{p.usuario_nome}</div>
                <div style={{ fontSize:12, color:'var(--t2)' }}>{p.tipo} · {new Date(p.data_hora).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}</div>
              </div>
              <Badge variant={p.tipo==='entrada'?'bg-green':'bg'}>{p.tipo}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DPControlePonto({ lojaFiltro }) {
  const [subTab, setSubTab] = useState('espelho')
  const SUB = [
    { id:'espelho',     label:'Espelho de Ponto' },
    { id:'ocorrencias', label:'Ocorrências' },
    { id:'escalas',     label:'Escalas' },
    { id:'cerca',       label:'Cerca Virtual' },
    { id:'relatorio',   label:'Relatório de Presença' },
  ]
  return (
    <div>
      <div style={{ display:'flex', gap:4, marginBottom:14, flexWrap:'wrap' }}>
        {SUB.map(t => <button key={t.id} className={`btn btn-${subTab===t.id?'p':'s'} btn-sm`} onClick={() => setSubTab(t.id)}>{t.label}</button>)}
      </div>
      {subTab === 'espelho'     && <DPEspelhoPonto />}
      {subTab === 'ocorrencias' && <DPOcorrencias />}
      {subTab === 'escalas'     && <DPEscalas />}
      {subTab === 'cerca'       && <DPCercaVirtual />}
      {subTab === 'relatorio'   && <DPRelatorioPresenca />}
    </div>
  )
}

function DPEspelhoPonto() {
  const mesAtual = new Date().toISOString().slice(0,7)
  const [mes, setMes] = useState(mesAtual)
  const [usuarioId, setUsuarioId] = useState('')
  const { data: usuarios } = useData(() => usuariosService.list(), [])
  const { data: pontos, loading } = useData(
    () => usuarioId ? pontoService.listMes(usuarioId, mes) : Promise.resolve([]),
    [usuarioId, mes]
  )
  const porDia = {}
  for (const p of pontos || []) { if (!porDia[p.data]) porDia[p.data] = []; porDia[p.data].push(p) }
  const dias = Object.keys(porDia).sort()
  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
        <select className="fi" style={{ flex:1 }} value={usuarioId} onChange={e => setUsuarioId(e.target.value)}>
          <option value="">Selecione colaborador...</option>
          {(usuarios||[]).map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
        <input className="fi" type="month" style={{ width:'auto' }} value={mes} onChange={e => setMes(e.target.value)} />
      </div>
      {!usuarioId ? <Empty text="Selecione um colaborador" /> :
       loading ? <Spinner /> :
       dias.length === 0 ? <Empty text="Sem registros no período" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {dias.map(dia => (
            <div key={dia} className="card" style={{ padding:'10px 14px' }}>
              <div style={{ fontWeight:600, fontSize:13, marginBottom:6 }}>
                {new Date(dia+'T12:00').toLocaleDateString('pt-BR',{weekday:'short',day:'numeric',month:'short'})}
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {porDia[dia].map((p, i) => {
                  const tm = normTipoMarcacao(p)
                  return (
                    <span key={i} style={{ fontSize:12, padding:'3px 8px', borderRadius:8, background:PONTO_BG[tm]||'var(--bg3)', color:PONTO_COLORS[tm]||'var(--t2)', fontWeight:600 }}>
                      {PONTO_LABELS[tm]||p.tipo}: {new Date(p.data_hora).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
                      {p.dentro_cerca === false && ' ⚠️'}
                    </span>
                  )
                })}
              </div>
              {(() => { const s = calcSaldoHoras(porDia[dia]); return s ? <div style={{ fontSize:12, color:'var(--t2)', marginTop:4 }}>⏱ {s}</div> : null })()}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DPOcorrencias() {
  const [filtroStatus, setFiltroStatus] = useState('pendente')
  const [filtroTipo, setFiltroTipo] = useState('')
  const { data: lista, loading, reload } = useData(
    () => pontoOcorrenciasService.list({ status: filtroStatus || undefined }),
    [filtroStatus]
  )
  const { perfil } = useAuth()
  const act = useAction()
  const TIPO_COR = { atraso:'var(--amber)', saida_antecipada:'var(--amber)', falta:'var(--red)', hora_extra:'var(--blue)', esquecimento_ponto:'var(--red)', marcacao_fora_cerca:'var(--red)' }
  const filtrado = (lista||[]).filter(oc => !filtroTipo || oc.tipo === filtroTipo)

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
        <select className="fi" style={{ flex:1 }} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos status</option>
          {['pendente','aprovado','rejeitado'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="fi" style={{ flex:1 }} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="">Todos tipos</option>
          {['atraso','saida_antecipada','falta','hora_extra','esquecimento_ponto','marcacao_fora_cerca'].map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
        </select>
      </div>
      {loading ? <Spinner /> : filtrado.length === 0 ? <Empty text="Nenhuma ocorrência" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtrado.map(oc => (
            <div key={oc.id} className="card" style={{ padding:'10px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:13 }}>{oc.usuarios?.full_name || oc.usuario_id}</div>
                  <div style={{ fontSize:12, color:'var(--t2)' }}>{new Date(oc.data+'T12:00').toLocaleDateString('pt-BR')}{oc.minutos ? ` · ${oc.minutos}min` : ''}</div>
                </div>
                <span style={{ fontSize:11, background:TIPO_COR[oc.tipo]||'var(--t2)', color:'#fff', padding:'2px 8px', borderRadius:12 }}>{(oc.tipo||'').replace(/_/g,' ')}</span>
              </div>
              {oc.descricao && <div style={{ fontSize:12, color:'var(--t2)', marginBottom:6 }}>{oc.descricao}</div>}
              {oc.status === 'pendente' ? (
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn btn-p btn-sm" onClick={async () => { try { await act.run(() => pontoOcorrenciasService.aprovar(oc.id, perfil?.id)); reload(); toast.success('Aprovada') } catch(e) { toast.error(e.message) } }} disabled={act.loading}>Aprovar</button>
                  <button className="btn btn-s btn-sm" onClick={async () => { try { await act.run(() => pontoOcorrenciasService.rejeitar(oc.id)); reload(); toast.success('Rejeitada') } catch(e) { toast.error(e.message) } }} disabled={act.loading}>Rejeitar</button>
                </div>
              ) : <Badge variant={oc.status==='aprovado'?'bg-green':'bg'}>{oc.status}</Badge>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DPEscalas() {
  const [usuarioId, setUsuarioId] = useState('')
  const { data: usuarios } = useData(() => usuariosService.list(), [])
  const { data: escalas, reload } = useData(() => escalasTrabalhoService.list(usuarioId || undefined), [usuarioId])
  const [modal, setModal] = useState(null)
  const emptyE = { usuario_id:'', dia_semana:'', hora_entrada:'', hora_saida_almoco:'', hora_retorno_almoco:'', hora_saida:'', tolerancia_minutos:10, ativo:true }
  const [form, setForm] = useState(emptyE)
  const act = useAction()
  const up = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const DIAS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']

  const salvar = async () => {
    if (!form.usuario_id || !form.hora_entrada || !form.hora_saida) return toast.error('Colaborador, entrada e saída são obrigatórios')
    try {
      const payload = { ...form, dia_semana: form.dia_semana === '' ? null : Number(form.dia_semana), tolerancia_minutos: Number(form.tolerancia_minutos)||10 }
      if (!modal.item) await act.run(() => escalasTrabalhoService.create(payload))
      else await act.run(() => escalasTrabalhoService.update(modal.item.id, payload))
      toast.success('Salvo'); setModal(null); reload()
    } catch(e) { toast.error(e.message) }
  }

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'center', flexWrap:'wrap' }}>
        <select className="fi" style={{ flex:1 }} value={usuarioId} onChange={e => setUsuarioId(e.target.value)}>
          <option value="">Todos colaboradores</option>
          {(usuarios||[]).map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
        <button className="btn btn-p btn-sm" onClick={() => { setForm(emptyE); setModal({}) }}>+ Nova Escala</button>
      </div>
      {(escalas||[]).length === 0 ? <Empty text="Nenhuma escala cadastrada" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {(escalas||[]).map(e => (
            <div key={e.id} className="card" style={{ padding:'10px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:13 }}>{(usuarios||[]).find(u => u.id === e.usuario_id)?.full_name || e.usuario_id}</div>
                  <div style={{ fontSize:12, color:'var(--t2)' }}>{e.dia_semana !== null && e.dia_semana !== undefined ? DIAS[e.dia_semana] : 'Todos os dias'} · Entrada: {e.hora_entrada} · Saída: {e.hora_saida}</div>
                  {e.hora_saida_almoco && <div style={{ fontSize:12, color:'var(--t2)' }}>Almoço: {e.hora_saida_almoco} - {e.hora_retorno_almoco}</div>}
                  <div style={{ fontSize:12, color:'var(--t3)' }}>Tolerância: {e.tolerancia_minutos}min</div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn btn-s btn-sm" onClick={() => { setForm({ ...emptyE, ...e, dia_semana: e.dia_semana ?? '' }); setModal({ item:e }) }}>Editar</button>
                  <button className="btn btn-s btn-sm" style={{ color:'var(--red)' }} onClick={async () => { try { await escalasTrabalhoService.remove(e.id); reload(); toast.success('Removida') } catch(ex) { toast.error(ex.message) } }}>×</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <Modal title={modal.item ? 'Editar Escala' : 'Nova Escala'} onClose={() => setModal(null)}>
          <div className="grid2">
            <div className="fg" style={{ gridColumn:'1/-1' }}>
              <label className="fl">Colaborador *</label>
              <select className="fi" value={form.usuario_id} onChange={up('usuario_id')}>
                <option value="">Selecione...</option>
                {(usuarios||[]).map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
            <div className="fg">
              <label className="fl">Dia da Semana</label>
              <select className="fi" value={form.dia_semana} onChange={up('dia_semana')}>
                <option value="">Todos os dias</option>
                {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">Tolerância (min)</label><input className="fi" type="number" value={form.tolerancia_minutos} onChange={up('tolerancia_minutos')} /></div>
            <div className="fg"><label className="fl">Entrada *</label><input className="fi" type="time" value={form.hora_entrada} onChange={up('hora_entrada')} /></div>
            <div className="fg"><label className="fl">Saída *</label><input className="fi" type="time" value={form.hora_saida} onChange={up('hora_saida')} /></div>
            <div className="fg"><label className="fl">Saída Almoço</label><input className="fi" type="time" value={form.hora_saida_almoco} onChange={up('hora_saida_almoco')} /></div>
            <div className="fg"><label className="fl">Retorno Almoço</label><input className="fi" type="time" value={form.hora_retorno_almoco} onChange={up('hora_retorno_almoco')} /></div>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button className="btn btn-p" style={{ flex:1 }} onClick={salvar} disabled={act.loading}>{act.loading ? '...' : 'Salvar'}</button>
            <button className="btn btn-s" onClick={() => setModal(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function DPCercaVirtual() {
  const { data: lojas } = useData(() => lojasService.list(), [])
  const { data: cercas, reload } = useData(() => cercasVirtuaisService.listAll(), [])
  const [modal, setModal] = useState(null)
  const emptyC = { loja_id:'', nome:'', latitude:'', longitude:'', raio_metros:200, ativo:true }
  const [form, setForm] = useState(emptyC)
  const act = useAction()
  const up = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const salvar = async () => {
    if (!form.nome || !form.latitude || !form.longitude) return toast.error('Nome, latitude e longitude são obrigatórios')
    try {
      const payload = { ...form, latitude: Number(form.latitude), longitude: Number(form.longitude), raio_metros: Number(form.raio_metros)||200, loja_id: form.loja_id || null }
      if (!modal.item) await act.run(() => cercasVirtuaisService.create(payload))
      else await act.run(() => cercasVirtuaisService.update(modal.item.id, payload))
      toast.success('Salvo'); setModal(null); reload()
    } catch(e) { toast.error(e.message) }
  }

  const capturarGPS = () => {
    if (!navigator.geolocation) return toast.error('GPS não disponível')
    navigator.geolocation.getCurrentPosition(
      pos => setForm(p => ({ ...p, latitude: pos.coords.latitude.toFixed(7), longitude: pos.coords.longitude.toFixed(7) })),
      () => toast.error('Não foi possível obter localização'),
      { timeout: 8000 }
    )
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
        <button className="btn btn-p btn-sm" onClick={() => { setForm(emptyC); setModal({}) }}>+ Nova Cerca</button>
      </div>
      {(cercas||[]).length === 0 ? <Empty text="Nenhuma cerca virtual cadastrada" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {(cercas||[]).map(c => (
            <div key={c.id} className="card" style={{ padding:'10px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:13 }}>{c.nome}</div>
                  <div style={{ fontSize:12, color:'var(--t2)' }}>{(lojas||[]).find(l => l.id === c.loja_id)?.nome || 'Sem loja'} · Raio: {c.raio_metros}m</div>
                  <div style={{ fontSize:12, color:'var(--t3)' }}>{Number(c.latitude).toFixed(5)}, {Number(c.longitude).toFixed(5)}</div>
                </div>
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <Badge variant={c.ativo?'bg-green':'bg'}>{c.ativo?'Ativa':'Inativa'}</Badge>
                  <button className="btn btn-s btn-sm" onClick={() => { setForm({ ...emptyC, ...c, loja_id: c.loja_id||'' }); setModal({ item:c }) }}>Editar</button>
                  <button className="btn btn-s btn-sm" style={{ color:'var(--red)' }} onClick={async () => { try { await cercasVirtuaisService.remove(c.id); reload(); toast.success('Removida') } catch(ex) { toast.error(ex.message) } }}>×</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <Modal title={modal.item ? 'Editar Cerca Virtual' : 'Nova Cerca Virtual'} onClose={() => setModal(null)}>
          <div className="grid2">
            <div className="fg" style={{ gridColumn:'1/-1' }}><label className="fl">Nome *</label><input className="fi" value={form.nome} onChange={up('nome')} /></div>
            <div className="fg" style={{ gridColumn:'1/-1' }}>
              <label className="fl">Loja</label>
              <select className="fi" value={form.loja_id} onChange={up('loja_id')}>
                <option value="">Sem loja específica</option>
                {(lojas||[]).map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">Latitude *</label><input className="fi" type="number" step="any" value={form.latitude} onChange={up('latitude')} /></div>
            <div className="fg"><label className="fl">Longitude *</label><input className="fi" type="number" step="any" value={form.longitude} onChange={up('longitude')} /></div>
            <div className="fg"><label className="fl">Raio (metros)</label><input className="fi" type="number" value={form.raio_metros} onChange={up('raio_metros')} /></div>
            <div className="fg" style={{ display:'flex', alignItems:'flex-end' }}>
              <button className="btn btn-s" style={{ width:'100%' }} onClick={capturarGPS}>📍 Usar minha localização</button>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button className="btn btn-p" style={{ flex:1 }} onClick={salvar} disabled={act.loading}>{act.loading ? '...' : 'Salvar'}</button>
            <button className="btn btn-s" onClick={() => setModal(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function DPRelatorioPresenca() {
  const mesAtual = new Date().toISOString().slice(0,7)
  const [mes, setMes] = useState(mesAtual)
  const { data: todosPontos, loading } = useData(async () => {
    const { data, error } = await supabase
      .from('pontos').select('*')
      .gte('data', `${mes}-01`).lte('data', `${mes}-31`)
      .order('usuario_nome').order('data_hora')
    if (error) throw error
    return data || []
  }, [mes])

  const resumo = {}
  for (const p of todosPontos || []) {
    if (!resumo[p.usuario_id]) resumo[p.usuario_id] = { nome: p.usuario_nome, diasPresente: new Set(), pontos: [] }
    resumo[p.usuario_id].diasPresente.add(p.data)
    resumo[p.usuario_id].pontos.push(p)
  }
  const linhas = Object.values(resumo).map(r => ({ nome: r.nome, dias: r.diasPresente.size, horas: calcSaldoHoras(r.pontos) || '0h' }))

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(linhas.map(l => ({ 'Colaborador': l.nome, 'Dias presentes': l.dias, 'Horas trabalhadas': l.horas })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Presença')
    XLSX.writeFile(wb, `presenca_${mes}.xlsx`)
  }

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'center', flexWrap:'wrap' }}>
        <input className="fi" type="month" style={{ flex:1 }} value={mes} onChange={e => setMes(e.target.value)} />
        <button className="btn btn-s btn-sm" onClick={exportarExcel} disabled={linhas.length === 0}>Excel</button>
        <button className="btn btn-s btn-sm" onClick={() => window.print()} disabled={linhas.length === 0}>PDF</button>
      </div>
      {loading ? <Spinner /> : linhas.length === 0 ? <Empty text="Sem dados no período" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {linhas.map((l, i) => (
            <div key={i} className="card" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px' }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, flexShrink:0 }}>{l.nome?.[0]?.toUpperCase()}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:13 }}>{l.nome}</div>
                <div style={{ fontSize:12, color:'var(--t2)' }}>{l.dias} dias presentes · {l.horas}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// ORDENS DE SERVIÇO
// ============================================================
function OrdensServico() {
  const { data: lista, loading, reload } = useData(() => ordensServicoService.list(), [])
  const [modal, setModal] = useState(null)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const act = useAction()

  const STATUS_COR = { aberta:'var(--amber)', em_andamento:'var(--blue)', concluida:'var(--green)', cancelada:'var(--red)' }
  const PRIORIDADES = ['baixa','normal','alta','urgente']

  const empty = { titulo:'', cliente:'', telefone:'', descricao:'', tecnico_responsavel:'', prioridade:'normal', status:'aberta', loja:'', previsao_conclusao:'', valor_orcamento:'', obs:'' }
  const [form, setForm] = useState(empty)
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const salvar = async () => {
    if (!form.titulo || !form.cliente) return toast.error('Título e cliente obrigatórios')
    try {
      const payload = { ...form, valor_orcamento: parseFloat(form.valor_orcamento)||0 }
      if (!modal.item) await act.run(() => ordensServicoService.create(payload))
      else await act.run(() => ordensServicoService.update(modal.item.id, payload))
      toast.success('OS salva'); setModal(null); reload()
    } catch (e) { toast.error(e.message) }
  }

  const atualizarStatus = async (id, status) => {
    try { await ordensServicoService.update(id, { status }); reload(); toast.success('Status atualizado') } catch (e) { toast.error(e.message) }
  }

  const filtrado = (lista||[]).filter(os =>
    (!filtroStatus || os.status === filtroStatus) &&
    (!busca || os.titulo?.toLowerCase().includes(busca.toLowerCase()) || os.cliente?.toLowerCase().includes(busca.toLowerCase()))
  )

  const fmtMoeda = (v) => (parseFloat(v)||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })

  return (
    <div className="page">
      <div className="ph">
        <h1>Ordens de Serviço</h1>
        <button className="btn btn-p btn-sm" onClick={() => { setForm(empty); setModal({}) }}>+ Nova O.S.</button>
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
        <input className="fi" style={{ flex:1, minWidth:140 }} placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} />
        <select className="fi" style={{ width:'auto' }} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos</option>
          {['aberta','em_andamento','concluida','cancelada'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
      </div>
      {loading ? <Spinner /> : filtrado.length === 0 ? <Empty text="Nenhuma O.S. encontrada" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtrado.map(os => (
            <div key={os.id} className="card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <div>
                  <div style={{ fontWeight:600 }}>{os.titulo}</div>
                  <div style={{ fontSize:12, color:'var(--t2)' }}>{os.cliente} · {os.loja} · {os.tecnico_responsavel || 'Sem técnico'}</div>
                  {os.valor_orcamento > 0 && <div style={{ fontSize:12, color:'var(--accent)', fontWeight:600 }}>{fmtMoeda(os.valor_orcamento)}</div>}
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                  <span style={{ fontSize:11, background:STATUS_COR[os.status]||'var(--t2)', color:'#fff', padding:'2px 8px', borderRadius:12 }}>{(os.status||'').replace('_',' ')}</span>
                  <span style={{ fontSize:11, color:'var(--t2)' }}>{os.prioridade}</span>
                </div>
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {os.status === 'aberta' && <button className="btn btn-p btn-sm" onClick={() => atualizarStatus(os.id,'em_andamento')}>Iniciar</button>}
                {os.status === 'em_andamento' && <button className="btn btn-p btn-sm" onClick={() => atualizarStatus(os.id,'concluida')}>Concluir</button>}
                <button className="btn btn-s btn-sm" onClick={() => { setForm({ ...empty, ...os }); setModal({ item:os }) }}>Editar</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <Modal title={modal.item ? 'Editar O.S.' : 'Nova Ordem de Serviço'} onClose={() => setModal(null)}>
          <div className="grid2">
            <div className="fg" style={{ gridColumn:'1/-1' }}><label className="fl">Título *</label><input className="fi" value={form.titulo} onChange={up('titulo')} /></div>
            <div className="fg"><label className="fl">Cliente *</label><input className="fi" value={form.cliente} onChange={up('cliente')} /></div>
            <div className="fg"><label className="fl">Telefone</label><input className="fi" value={form.telefone} onChange={up('telefone')} type="tel" /></div>
            <div className="fg"><label className="fl">Loja</label><LojaSelect value={form.loja} onChange={v => setForm(p => ({ ...p, loja: v }))} /></div>
            <div className="fg"><label className="fl">Técnico</label><input className="fi" value={form.tecnico_responsavel} onChange={up('tecnico_responsavel')} /></div>
            <div className="fg"><label className="fl">Prioridade</label>
              <select className="fi" value={form.prioridade} onChange={up('prioridade')}>
                {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">Status</label>
              <select className="fi" value={form.status} onChange={up('status')}>
                {['aberta','em_andamento','concluida','cancelada'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">Previsão</label><input className="fi" type="date" value={form.previsao_conclusao} onChange={up('previsao_conclusao')} /></div>
            <div className="fg"><label className="fl">Orçamento (R$)</label><input className="fi" type="number" step="0.01" inputMode="decimal" value={form.valor_orcamento} onChange={up('valor_orcamento')} /></div>
          </div>
          <div className="fg"><label className="fl">Descrição</label><textarea className="fi" value={form.descricao} onChange={up('descricao')} rows={3} /></div>
          <div className="fg"><label className="fl">Observações</label><textarea className="fi" value={form.obs} onChange={up('obs')} rows={2} /></div>
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button className="btn btn-p" style={{ flex:1 }} onClick={salvar} disabled={act.loading}>{act.loading ? '...' : 'Salvar'}</button>
            <button className="btn btn-s" onClick={() => setModal(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ============================================================
// FILA DE LIBERAÇÃO
// ============================================================
function FilaLiberacao() {
  const { data: pedidos, loading, reload } = useData(async () => {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*, produtos(*), assinaturas(*)')
      .in('status', ['conferido','separado','pronto'])
      .order('data_entrega')
    if (error) throw error
    return data || []
  }, [])

  const [busca, setBusca] = useState('')
  const act = useAction()

  const filtrado = (pedidos||[]).filter(p =>
    !busca ||
    p.numero_pedido?.toString().includes(busca) ||
    p.cliente?.toLowerCase().includes(busca.toLowerCase())
  )

  const liberarParaEntrega = async (pedido) => {
    try {
      await act.run(() => pedidosService.update(pedido.id, { status: 'liberado', data_liberacao: new Date().toISOString() }))
      toast.success(`Pedido #${pedido.numero_pedido} liberado para entrega`)
      reload()
    } catch (e) { toast.error(e.message) }
  }

  const verificarCondicoes = (pedido) => {
    const itens = pedido.produtos || []
    const separado = itens.every(i => i.separado || i.foto_separacao)
    const assinado = pedido.assinaturas?.length > 0 || pedido.assinatura_confirmada
    const conferido = pedido.status === 'conferido' || pedido.conferido
    return { separado, assinado, conferido, ok: separado }
  }

  const fmtData = (s) => s ? new Date(s+'T12:00').toLocaleDateString('pt-BR') : '—'

  return (
    <div className="page">
      <div className="ph">
        <h1>Fila de Liberação</h1>
        <button className="btn btn-s btn-sm" onClick={reload}>↻</button>
      </div>
      <div style={{ color:'var(--t2)', fontSize:13, marginBottom:12 }}>
        Pedidos prontos para revisão antes da entrega
      </div>
      <input className="fi" style={{ marginBottom:12 }} placeholder="Buscar pedido ou cliente..." value={busca} onChange={e => setBusca(e.target.value)} />
      {loading ? <Spinner /> : filtrado.length === 0 ? <Empty text="Nenhum pedido na fila de liberação" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtrado.map(p => {
            const cond = verificarCondicoes(p)
            return (
              <div key={p.id} className="card">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <div>
                    <div style={{ fontWeight:700 }}>Pedido #{p.numero_pedido}</div>
                    <div style={{ fontSize:13, color:'var(--t2)' }}>{p.cliente} · {p.loja}</div>
                    <div style={{ fontSize:12, color:'var(--t2)' }}>Entrega: {fmtData(p.data_entrega)}</div>
                  </div>
                  <Badge variant={p.status==='liberado'?'bg-green':'bg-amber'}>{p.status}</Badge>
                </div>
                <div style={{ display:'flex', gap:12, fontSize:13, marginBottom:10 }}>
                  <span style={{ color: cond.separado ? 'var(--green)' : 'var(--red)' }}>{cond.separado ? '✓' : '✗'} Separação</span>
                  <span style={{ color: cond.conferido ? 'var(--green)' : 'var(--amber)' }}>{cond.conferido ? '✓' : '○'} Conferência</span>
                </div>
                {p.status !== 'liberado' && (
                  <button
                    className="btn btn-p btn-sm"
                    disabled={!cond.ok || act.loading}
                    onClick={() => liberarParaEntrega(p)}
                  >
                    {cond.ok ? 'Liberar para Entrega' : 'Pendências em aberto'}
                  </button>
                )}
                {p.status === 'liberado' && <Badge variant="bg-green">Liberado ✓</Badge>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


// ============================================================
// FORMULÁRIO PÚBLICO DE SOLICITAÇÃO DE ASSISTÊNCIA
// ============================================================
function SolicitarAssistenciaPublica() {
  const [form, setForm] = useState({ nome: '', telefone: '', pedido: '', loja: '', produto: '', descricao: '', categoria: '' })
  const [fotos, setFotos] = useState([])
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const canSend = form.nome && form.telefone && form.produto && form.descricao

  const addFotos = (e) => {
    const newFiles = Array.from(e.target.files || []).slice(0, 5 - fotos.length)
    setFotos(prev => [...prev, ...newFiles.map(f => ({ file: f, preview: URL.createObjectURL(f) }))].slice(0, 5))
  }
  const remFoto = (i) => setFotos(prev => prev.filter((_, idx) => idx !== i))

  const handleEnviar = async () => {
    setLoading(true)
    try {
      const { data: nova, error } = await supabase.from('assistencias').insert({
        cliente: form.nome,
        telefone: form.telefone,
        pedido_ref: form.pedido || null,
        loja: form.loja || null,
        tipo_problema: form.categoria || 'Outros',
        observacoes: form.descricao,
        data_abertura: new Date().toISOString().split('T')[0],
        status: 'solicitacao',
        origem: 'formulario',
      }).select().single()
      if (error) throw error
      if (nova && fotos.length > 0) {
        const urls = []
        for (let i = 0; i < fotos.length; i++) {
          const f = fotos[i].file
          const ext = f.name.split('.').pop() || 'jpg'
          const path = `${nova.id}/foto_${i}.${ext}`
          const { error: upErr } = await supabase.storage.from('assistencias').upload(path, f)
          if (!upErr) {
            const { data: { publicUrl } } = supabase.storage.from('assistencias').getPublicUrl(path)
            urls.push(publicUrl)
          }
        }
        if (urls.length) await supabase.from('assistencias').update({ fotos_cliente: urls }).eq('id', nova.id)
      }
      setEnviado(true)
    } catch (e) {
      console.error('[Solicitar] handleEnviar:', e)
      toast.error('Erro ao enviar. Tente novamente mais tarde.')
    }
    setLoading(false)
  }

  if (enviado) return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
        <h2 style={{ color: '#1e293b', marginBottom: 8 }}>Solicitação enviada!</h2>
        <p style={{ color: '#64748b', fontSize: 14 }}>Nossa equipe entrará em contato em breve pelo telefone {form.telefone}.</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '16px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '24px', maxWidth: 500, width: '100%', height: 'fit-content' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ width: 40, height: 40, background: '#6366f1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>V</div>
          <div><div style={{ fontWeight: 700, color: '#1e293b' }}>VERSA LOG</div><div style={{ fontSize: 12, color: '#64748b' }}>Solicitar Assistência Técnica</div></div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Nome completo *</label>
          <input style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} value={form.nome} onChange={up('nome')} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Telefone / WhatsApp *</label>
          <input style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} value={form.telefone} onChange={up('telefone')} inputMode="tel" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Nº Pedido</label>
            <input style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} value={form.pedido} onChange={up('pedido')} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Loja</label>
            <LojaSelect value={form.loja} onChange={v => setForm(p => ({ ...p, loja: v }))} className="" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', background: '#fff' }} placeholder="Selecione a loja" />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Produto com problema *</label>
          <input style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} value={form.produto} onChange={up('produto')} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Categoria</label>
          <select style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', background: '#fff' }} value={form.categoria} onChange={up('categoria')}>
            <option value="">Selecione...</option>
            {['Avaria', 'Defeito de fabricação', 'Erro de acabamento', 'Item incorreto', 'Outros'].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Descrição do problema *</label>
          <textarea style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical', minHeight: 80 }} value={form.descricao} onChange={up('descricao')} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: 12, color: '#64748b' }}>Fotos do problema (opcional, até 5)</label>
            {fotos.length < 5 && (
              <label style={{ padding: '6px 12px', background: '#6366f1', color: '#fff', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                + Adicionar foto
                <input type="file" multiple accept="image/*" capture="environment" style={{ display: 'none' }} onChange={addFotos} />
              </label>
            )}
          </div>
          {fotos.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {fotos.map((f, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={f.preview} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '2px solid #e2e8f0' }} />
                  <button onClick={() => remFoto(i)} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <button disabled={!canSend || loading}
          style={{ width: '100%', padding: '13px', background: canSend ? '#6366f1' : '#e2e8f0', color: canSend ? '#fff' : '#94a3b8', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 15, cursor: canSend ? 'pointer' : 'default' }}
          onClick={handleEnviar}>
          {loading ? 'Enviando...' : 'Enviar Solicitação'}
        </button>
      </div>
    </div>
  )
}

// ============================================================
// NPS PÚBLICO
// ============================================================
function NPSPublico({ token }) {
  const [nps, setNps] = useState(null)
  const [nota, setNota] = useState(null)
  const [comentario, setComentario] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    npsService.getByToken(token).then(d => { setNps(d); setLoading(false) }).catch(() => { setErro(true); setLoading(false) })
  }, [token])

  const enviar = async () => {
    if (nota === null) return
    try {
      await npsService.respond(token, nota, comentario)
      setEnviado(true)
    } catch (e) { alert('Erro ao enviar. Tente novamente.') }
  }

  const COR_NOTA = (n) => n <= 6 ? '#ef4444' : n <= 8 ? '#f59e0b' : '#22c55e'

  if (loading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ color:'#6366f1', fontSize:24 }}>Carregando...</div></div>
  if (erro || !nps) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:48 }}>😕</div>
        <div style={{ fontWeight:600, fontSize:18, margin:'12px 0 8px' }}>Link inválido ou expirado</div>
        <div style={{ color:'#64748b', fontSize:14 }}>Verifique o link recebido pelo WhatsApp.</div>
      </div>
    </div>
  )
  if (enviado || nps.nota !== null) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#f8fafc,#eff6ff)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:32, maxWidth:400, width:'100%', textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,.1)' }}>
        <div style={{ fontSize:56, marginBottom:12 }}>🙏</div>
        <h2 style={{ color:'#1e293b', marginBottom:8 }}>Obrigado pelo feedback!</h2>
        <p style={{ color:'#64748b', fontSize:14 }}>Sua avaliação nos ajuda a melhorar cada vez mais.</p>
        {nps.loja && <div style={{ marginTop:12, fontSize:13, color:'#6366f1', fontWeight:600 }}>{nps.loja}</div>}
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#f8fafc,#eff6ff)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:'28px 24px', maxWidth:440, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,.1)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, paddingBottom:16, borderBottom:'1px solid #e2e8f0' }}>
          <div style={{ width:44, height:44, background:'#6366f1', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:18, flexShrink:0 }}>V</div>
          <div>
            <div style={{ fontWeight:700, color:'#1e293b' }}>VERSA LOG{nps.loja ? ` · ${nps.loja}` : ''}</div>
            <div style={{ fontSize:12, color:'#64748b' }}>Avaliação de entrega</div>
          </div>
        </div>
        <div style={{ fontWeight:600, fontSize:17, color:'#1e293b', marginBottom:4 }}>Olá, {nps.cliente_nome?.split(' ')[0] || 'cliente'}!</div>
        <div style={{ color:'#64748b', fontSize:14, marginBottom:20 }}>De 0 a 10, quanto você recomendaria a {nps.loja||'Versa Log'} para um amigo?</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(11,1fr)', gap:4, marginBottom:20 }}>
          {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
            <button key={n} onClick={() => setNota(n)}
              style={{ padding:'10px 2px', borderRadius:8, border:`2px solid ${nota===n ? COR_NOTA(n) : '#e2e8f0'}`, background: nota===n ? COR_NOTA(n) : '#f8fafc', color: nota===n ? '#fff' : '#475569', fontWeight:700, fontSize:13, cursor:'pointer', transition:'all .15s' }}>
              {n}
            </button>
          ))}
        </div>
        {nota !== null && (
          <div style={{ marginBottom:16, fontSize:13, color: COR_NOTA(nota), fontWeight:600, textAlign:'center' }}>
            {nota <= 6 ? '😞 Lamentamos!' : nota <= 8 ? '😐 Obrigado!' : '😊 Ótimo! Ficamos felizes!'}
          </div>
        )}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12, color:'#64748b', display:'block', marginBottom:4 }}>O que podemos melhorar? (opcional)</label>
          <textarea style={{ width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:10, fontSize:13, boxSizing:'border-box', resize:'vertical', minHeight:70 }} value={comentario} onChange={e => setComentario(e.target.value)} placeholder="Sua opinião é muito importante..." />
        </div>
        <button disabled={nota === null} onClick={enviar}
          style={{ width:'100%', padding:14, background: nota !== null ? '#6366f1' : '#e2e8f0', color: nota !== null ? '#fff' : '#94a3b8', border:'none', borderRadius:12, fontWeight:700, fontSize:15, cursor: nota !== null ? 'pointer' : 'default', transition:'all .2s' }}>
          Enviar Avaliação
        </button>
      </div>
    </div>
  )
}

// ============================================================
// LEMBRETES DE PONTO
// ============================================================
// ============================================================
// CHAT INTERNO
// ============================================================
function Chat() {
  const { perfil } = useAuth()
  const { chatTarget, clearChatTarget, setChatUnread } = useContext(AppCtx)
  const { data: usuarios } = useData(() => usuariosService.list(), [])
  const [conversas, setConversas] = useState([])
  const [conversaId, setConversaId] = useState(null)
  const [mensagens, setMensagens] = useState([])
  const [texto, setTexto] = useState('')
  const [busca, setBusca] = useState('')
  const [buscaOpen, setBuscaOpen] = useState(false)
  const [loadingConv, setLoadingConv] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [mobileView, setMobileView] = useState('lista')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const endRef = useRef()
  const fileRef = useRef()

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  const carregarConversas = useCallback(async () => {
    if (!perfil?.id) return
    setLoadingConv(true)
    try {
      const cvs = await chatService.listarConversas(perfil.id)
      setConversas(cvs)
      setChatUnread(cvs.reduce((acc, c) => acc + (c.nao_lidas || 0), 0))
    } finally { setLoadingConv(false) }
  }, [perfil?.id, setChatUnread])

  useEffect(() => { carregarConversas() }, [carregarConversas])

  const abrirConversa = useCallback(async (id) => {
    if (!perfil?.id) return
    setConversaId(id)
    setMobileView('chat')
    setLoadingMsg(true)
    const msgs = await chatService.listarMensagens(id)
    setMensagens(msgs)
    setLoadingMsg(false)
    chatService.atualizarUltimaLeitura(id, perfil.id).catch(() => {})
    setConversas(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, nao_lidas: 0 } : c)
      setChatUnread(updated.reduce((acc, c) => acc + (c.nao_lidas || 0), 0))
      return updated
    })
  }, [perfil?.id, setChatUnread])

  const abrirComUsuario = useCallback(async (userId, msgInicial) => {
    if (!perfil?.id || !userId) return
    try {
      const id = await chatService.buscarOuCriarConversa(perfil.id, userId)
      await carregarConversas()
      await abrirConversa(id)
      if (msgInicial) setTexto(msgInicial)
    } catch (e) { toast.error(e.message) }
  }, [perfil?.id, carregarConversas, abrirConversa])

  useEffect(() => {
    if (chatTarget && perfil?.id) {
      abrirComUsuario(chatTarget.userId, chatTarget.mensagem)
      clearChatTarget()
    }
  }, [chatTarget, perfil?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!conversaId) return
    const id = setInterval(async () => {
      const msgs = await chatService.listarMensagens(conversaId)
      setMensagens(msgs)
    }, 5000)
    return () => clearInterval(id)
  }, [conversaId])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensagens])

  const enviar = async (arquivos) => {
    if ((!texto.trim() && !arquivos?.length) || !conversaId || enviando) return
    setEnviando(true)
    const txt = texto.trim()
    setTexto('')
    try {
      await chatService.enviarMensagem({
        conversa_id: conversaId, usuario_id: perfil.id,
        usuario_nome: perfil.full_name || perfil.email, texto: txt, arquivos,
      })
      const msgs = await chatService.listarMensagens(conversaId)
      setMensagens(msgs)
      carregarConversas()
    } catch (e) { toast.error(e.message); setTexto(txt) } finally { setEnviando(false) }
  }

  const usuariosFiltrados = (usuarios || []).filter(u =>
    u.id !== perfil?.id && u.full_name?.toLowerCase().includes(busca.toLowerCase())
  )
  const nomeConversa = (c) => c?.nome_exibicao || c?.nome || 'Conversa'

  const Lista = (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', borderRight: isMobile ? 'none' : '1px solid var(--border)', minWidth:0 }}>
      <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom: buscaOpen ? 8 : 0 }}>
          <span style={{ fontWeight:700, fontSize:15, flex:1 }}>Mensagens</span>
          <button className="btn btn-p btn-sm" onClick={() => { setBuscaOpen(o => !o); setBusca('') }}>+ Nova</button>
        </div>
        {buscaOpen && (
          <div style={{ position:'relative' }}>
            <input className="fi" placeholder="Buscar funcionário..." value={busca}
              onChange={e => setBusca(e.target.value)} autoFocus />
            {busca && (
              <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, zIndex:10, maxHeight:200, overflowY:'auto', boxShadow:'0 4px 20px rgba(0,0,0,.4)' }}>
                {usuariosFiltrados.length === 0 ? (
                  <div style={{ padding:'10px 12px', fontSize:12, color:'var(--t3)' }}>Nenhum resultado</div>
                ) : usuariosFiltrados.slice(0, 8).map(u => (
                  <div key={u.id} onClick={() => { abrirComUsuario(u.id, ''); setBuscaOpen(false); setBusca('') }}
                    style={{ padding:'10px 12px', cursor:'pointer', fontSize:13, borderBottom:'1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background='var(--bg3)'}
                    onMouseLeave={e => e.currentTarget.style.background=''}>
                    <div style={{ fontWeight:600 }}>{u.full_name}</div>
                    <div style={{ fontSize:11, color:'var(--t3)' }}>{PROFILE_LABELS[u.role||u.perfil]||u.role||''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{ flex:1, overflowY:'auto' }}>
        {loadingConv ? <div style={{ padding:20 }}><Spinner /></div> :
         conversas.length === 0 ? <div style={{ padding:20 }}><Empty text="Nenhuma conversa ainda" /></div> :
         conversas.map(c => (
          <div key={c.id} onClick={() => abrirConversa(c.id)}
            style={{ padding:'12px 14px', cursor:'pointer', borderBottom:'1px solid var(--border)', background: conversaId === c.id ? 'var(--bg3)' : 'transparent' }}
            onMouseEnter={e => { if (conversaId !== c.id) e.currentTarget.style.background='rgba(255,255,255,.02)' }}
            onMouseLeave={e => { if (conversaId !== c.id) e.currentTarget.style.background='transparent' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
              <div style={{ fontWeight:600, fontSize:13, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{nomeConversa(c)}</div>
              <div style={{ display:'flex', gap:5, alignItems:'center', flexShrink:0, marginLeft:6 }}>
                {c.ultima_mensagem && <span style={{ fontSize:10, color:'var(--t3)' }}>{tempoRelativo(c.ultima_mensagem.created_at)}</span>}
                {c.nao_lidas > 0 && <span style={{ background:'var(--accent)', color:'#fff', fontSize:10, fontWeight:700, minWidth:16, height:16, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px' }}>{c.nao_lidas > 9 ? '9+' : c.nao_lidas}</span>}
              </div>
            </div>
            {c.ultima_mensagem && <div style={{ fontSize:12, color:'var(--t2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.ultima_mensagem.usuario_nome?.split(' ')[0]}: {c.ultima_mensagem.texto || '📎'}</div>}
          </div>
        ))}
      </div>
    </div>
  )

  const ChatArea = conversaId ? (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', minWidth:0 }}>
      {isMobile && (
        <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <button className="btn btn-s btn-sm btn-ico" onClick={() => { setConversaId(null); setMobileView('lista') }}>←</button>
          <span style={{ fontWeight:600, fontSize:14 }}>{nomeConversa(conversas.find(c => c.id === conversaId))}</span>
        </div>
      )}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>
        {loadingMsg ? <Spinner /> : mensagens.length === 0 ? <Empty text="Nenhuma mensagem ainda" /> :
          mensagens.map(m => {
            const minha = m.usuario_id === perfil?.id
            return (
              <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems: minha ? 'flex-end' : 'flex-start' }}>
                {!minha && <div style={{ fontSize:11, color:'var(--t3)', marginBottom:2, paddingLeft:4 }}>{m.usuario_nome}</div>}
                <div style={{ maxWidth:'72%', padding:'8px 12px', borderRadius: minha ? '14px 14px 2px 14px' : '14px 14px 14px 2px', background: minha ? 'var(--accent)' : 'var(--bg3)', color: minha ? '#fff' : 'var(--t1)', fontSize:13, lineHeight:1.5, wordBreak:'break-word' }}>
                  {m.texto && <div>{m.texto}</div>}
                  {(m.anexos||[]).map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display:'block', fontSize:12, color: minha ? 'rgba(255,255,255,.8)' : 'var(--accent)', marginTop:4 }}>📎 Arquivo {i+1}</a>
                  ))}
                </div>
                <div style={{ fontSize:10, color:'var(--t3)', marginTop:2 }}>{new Date(m.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
              </div>
            )
          })
        }
        <div ref={endRef} />
      </div>
      <div style={{ padding:'10px 12px', borderTop:'1px solid var(--border)', display:'flex', gap:6, alignItems:'flex-end', flexShrink:0 }}>
        <textarea className="fi" style={{ flex:1, resize:'none', minHeight:40, maxHeight:120, lineHeight:1.5, padding:'8px 10px', fontFamily:'var(--font)' }}
          placeholder="Mensagem... (Enter para enviar, Shift+Enter para nova linha)"
          value={texto} onChange={e => setTexto(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }} />
        <input ref={fileRef} type="file" multiple hidden onChange={e => { enviar([...e.target.files]); e.target.value = '' }} />
        <button className="btn btn-s btn-sm btn-ico" onClick={() => fileRef.current?.click()} title="Anexar" style={{ width:38, height:40, flexShrink:0 }}>📎</button>
        <button className="btn btn-p btn-sm" onClick={() => enviar()} disabled={enviando} style={{ height:40, padding:'0 14px', flexShrink:0 }}>
          {enviando ? '...' : '➤'}
        </button>
      </div>
    </div>
  ) : (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--t3)', fontSize:13 }}>
      Selecione uma conversa para começar
    </div>
  )

  return (
    <div style={{ height:'calc(100vh - 52px)' }}>
      {isMobile ? (
        mobileView === 'lista' ? Lista : ChatArea
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', height:'100%' }}>
          {Lista}
          {ChatArea}
        </div>
      )}
    </div>
  )
}

function useVerificarLembretesPonto() {
  const { perfil } = useAuth()

  const verificar = useCallback(async () => {
    if (!perfil?.id) return
    try {
      const agora     = new Date()
      const hoje      = agora.toISOString().split('T')[0]
      const diaSemana = agora.getDay()

      const { data: escalas } = await supabase
        .from('escalas_trabalho')
        .select('*')
        .eq('usuario_id', perfil.id)
        .eq('ativo', true)
        .or(`dia_semana.eq.${diaSemana},dia_semana.is.null`)
        .order('dia_semana', { nullsFirst: false })
        .limit(1)

      const escala = escalas?.[0]
      if (!escala) return

      const { data: pontos } = await supabase
        .from('pontos')
        .select('tipo_marcacao, tipo')
        .eq('usuario_id', perfil.id)
        .eq('data', hoje)

      const registrados = new Set((pontos || []).map(p => p.tipo_marcacao || p.tipo))

      const passou10 = (hora) => {
        if (!hora) return false
        const [h, m] = hora.split(':').map(Number)
        const limite = new Date(agora)
        limite.setHours(h, m + 10, 0, 0)
        return agora >= limite
      }

      const jaFeito = (tipo, oldTipo) => registrados.has(tipo) || registrados.has(oldTipo)
      const fmt     = (hora) => (hora || '').slice(0, 5)

      const checar = async (tipo, oldTipo, horaEscala, titulo, mensagem) => {
        if (!horaEscala || !passou10(horaEscala) || jaFeito(tipo, oldTipo)) return
        const { data: ja } = await supabase
          .from('notificacoes')
          .select('id')
          .eq('usuario_id', perfil.id)
          .eq('tipo', 'lembrete_ponto')
          .eq('titulo', titulo)
          .gte('created_at', `${hoje}T00:00:00`)
          .limit(1)
        if (ja?.length) return
        await supabase.from('notificacoes').insert({
          usuario_id: perfil.id,
          tipo: 'lembrete_ponto',
          titulo,
          mensagem,
          lida: false,
        })
      }

      await checar('entrada',       'Entrada', escala.hora_entrada,
        'Lembrete: bata seu ponto de entrada',
        `Seu horário de entrada era ${fmt(escala.hora_entrada)}. Não esqueça de registrar seu ponto.`)
      await checar('saida_almoco',  'Almoço',  escala.hora_saida_almoco,
        'Lembrete: registre sua saída para almoço',
        `Seu horário de saída para almoço era ${fmt(escala.hora_saida_almoco)}. Não esqueça de registrar seu ponto.`)
      await checar('retorno_almoco','Retorno',  escala.hora_retorno_almoco,
        'Lembrete: registre seu retorno do almoço',
        `Seu horário de retorno do almoço era ${fmt(escala.hora_retorno_almoco)}. Não esqueça de registrar seu ponto.`)
      await checar('saida',         'Saída',   escala.hora_saida,
        'Lembrete: registre sua saída',
        `Seu horário de saída era ${fmt(escala.hora_saida)}. Não esqueça de registrar seu ponto.`)

      // Verificar esquecimento de ponto do dia anterior
      const ontem = new Date(agora)
      ontem.setDate(ontem.getDate() - 1)
      const ontemStr = ontem.toISOString().split('T')[0]
      const { data: escalasOntem } = await supabase
        .from('escalas_trabalho').select('*').eq('usuario_id', perfil.id).eq('ativo', true)
        .or(`dia_semana.eq.${ontem.getDay()},dia_semana.is.null`).limit(1)
      if (escalasOntem?.[0]) {
        const { data: pontosOntem } = await supabase.from('pontos').select('tipo_marcacao,tipo')
          .eq('usuario_id', perfil.id).eq('data', ontemStr)
        if ((pontosOntem||[]).length > 0) {
          const regOntem = new Set((pontosOntem||[]).map(p => p.tipo_marcacao || p.tipo))
          if (!regOntem.has('saida') && !regOntem.has('Saída')) {
            const { data: jaOc } = await supabase.from('ponto_ocorrencias').select('id')
              .eq('usuario_id', perfil.id).eq('data', ontemStr).eq('tipo', 'esquecimento_ponto').limit(1)
            if (!jaOc?.length) {
              await pontoOcorrenciasService.create({
                usuario_id: perfil.id, data: ontemStr, tipo: 'esquecimento_ponto',
                descricao: 'Entrada registrada sem saída correspondente', status: 'pendente',
              })
            }
          }
        }
      }
    } catch (e) {
      console.warn('[LembretePonto]', e?.message)
    }
  }, [perfil?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!perfil?.id) return
    verificar()
    const id = setInterval(verificar, 10 * 60 * 1000)
    return () => clearInterval(id)
  }, [perfil?.id, verificar])
}

// ============================================================
// PÁGINA PÚBLICA — CONFIRMAÇÃO DE COMPRA (FÁBRICA)
// ============================================================
function ConfirmarCompraPublica({ token }) {
  const [pedido, setPedido] = useState(null)
  const [loadingP, setLoadingP] = useState(true)
  const [erro, setErro] = useState(false)
  const [arquivo, setArquivo] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    supabase.from('pedidos').select('*').eq('id', token).single()
      .then(({ data, error }) => {
        if (error || !data) setErro(true)
        else setPedido(data)
        setLoadingP(false)
      })
  }, [token])

  const confirmar = async () => {
    setEnviando(true)
    try {
      let docUrl = null
      if (arquivo) {
        const ext = arquivo.name.split('.').pop()
        const path = `${token}/confirmacao_fabrica_${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('pedidos-anexos').upload(path, arquivo)
        if (!upErr) {
          const { data: pub } = supabase.storage.from('pedidos-anexos').getPublicUrl(path)
          docUrl = pub.publicUrl
        }
      }
      await pedidosService.registrarConfirmacaoFabrica(token, { id: null, full_name: 'Fábrica', email: 'fabrica' }, {
        doc: docUrl, numeroPedido: pedido.numero_pedido, vendedorId: pedido.vendedor_id, loja: pedido.local_separacao,
      })
      setEnviado(true)
    } catch (e) { alert('Erro ao confirmar. Tente novamente.') }
    setEnviando(false)
  }

  if (loadingP) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: '#6366f1', fontSize: 24 }}>Carregando...</div></div>
  if (erro || !pedido) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>😕</div>
        <div style={{ fontWeight: 600, fontSize: 18, margin: '12px 0 8px' }}>Link inválido</div>
        <div style={{ color: '#64748b', fontSize: 14 }}>Verifique o link recebido.</div>
      </div>
    </div>
  )
  if (enviado || pedido.confirmado_fabrica_em) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f8fafc,#eff6ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 32, maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,.1)' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
        <h2 style={{ color: '#1e293b', marginBottom: 8 }}>Confirmação registrada!</h2>
        <p style={{ color: '#64748b', fontSize: 14 }}>Pedido #{pedido.numero_pedido} confirmado com sucesso. Obrigado!</p>
      </div>
    </div>
  )
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f8fafc,#eff6ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '28px 24px', maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ width: 44, height: 44, background: '#6366f1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>V</div>
          <div>
            <div style={{ fontWeight: 700, color: '#1e293b' }}>VERSA LOG</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Confirmação de Pedido — Fábrica</div>
          </div>
        </div>
        <div style={{ fontWeight: 600, fontSize: 17, color: '#1e293b', marginBottom: 4 }}>Pedido #{pedido.numero_pedido}</div>
        <div style={{ color: '#64748b', fontSize: 14, marginBottom: 2 }}>Cliente: {pedido.cliente}</div>
        {pedido.local_separacao && <div style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>Loja: {pedido.local_separacao}</div>}
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', marginBottom: 20, fontSize: 13, color: '#475569' }}>
          Ao confirmar você está informando que este pedido está em produção e será entregue conforme combinado.
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: '#475569', marginBottom: 8, fontWeight: 500 }}>Documento de confirmação <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span></div>
          <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => setArquivo(e.target.files[0] || null)} />
          {arquivo ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, background: '#f1f5f9', padding: '8px 12px', borderRadius: 8 }}>
              📎 {arquivo.name}
              <button onClick={() => { setArquivo(null); fileRef.current.value = '' }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: 'auto', fontSize: 18, lineHeight: 1 }}>×</button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()}
              style={{ width: '100%', padding: '12px 14px', border: '2px dashed #cbd5e1', borderRadius: 10, background: 'transparent', color: '#64748b', fontSize: 13, cursor: 'pointer', textAlign: 'center' }}>
              📎 Clique para anexar PDF ou imagem
            </button>
          )}
        </div>
        <button disabled={enviando} onClick={confirmar}
          style={{ width: '100%', padding: 14, background: enviando ? '#e2e8f0' : '#6366f1', color: enviando ? '#94a3b8' : '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: enviando ? 'default' : 'pointer', transition: 'all .2s' }}>
          {enviando ? 'Confirmando...' : '✅ Confirmar Pedido'}
        </button>
      </div>
    </div>
  )
}

// ============================================================
// APP ROOT
// ============================================================
function AppContent() {
  const { perfil, loading, isGestor, isEntregador, simulatedRole, effectiveRole, modulosPermitidos } = useAuth()
  useVerificarLembretesPonto()
  const defaultPage = isEntregador && !isGestor ? 'rota' : 'dashboard'
  const [page, setPage] = useState(defaultPage)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sb_collapsed') === 'true')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [animKey, setAnimKey] = useState(0)
  const [lojaFiltro, setLojaFiltro] = useState('')
  const [chatTarget, setChatTargetState] = useState(null)
  const [chatUnread, setChatUnread] = useState(0)
  const [bgConfig, setBgConfig] = useState({ activeUrl: null, blur: 8, overlay: 40 })

  const reloadBgConfig = useCallback(async () => {
    try {
      const d = await configSistemaService.get()
      if (d) {
        const key = d.bg_imagem_ativa
        const activeUrl = key ? (d[key] || null) : null
        setBgConfig({ activeUrl, blur: d.bg_blur_intensidade ?? 8, overlay: d.bg_overlay_opacidade ?? 40 })
      }
    } catch {}
  }, [])

  useEffect(() => { reloadBgConfig() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (bgConfig.activeUrl) document.body.classList.add('has-bg-img')
    else document.body.classList.remove('has-bg-img')
    return () => document.body.classList.remove('has-bg-img')
  }, [bgConfig.activeUrl])

  const clearChatTarget = useCallback(() => setChatTargetState(null), [])
  const openChatWith = useCallback((userId, mensagem) => {
    setChatTargetState({ userId, mensagem: mensagem || '' })
    navigateTo('chat')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const navigateTo = useCallback((id) => {
    setPage(id)
    setAnimKey(k => k + 1)
    setMobileOpen(false)
  }, [])

  const toggleSidebar = useCallback(() => {
    setCollapsed(c => {
      const next = !c
      localStorage.setItem('sb_collapsed', String(next))
      return next
    })
  }, [])

  useEffect(() => {
    if (perfil) navigateTo(isEntregador && !isGestor ? 'rota' : 'dashboard')
  }, [perfil?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let allowed = modulosPermitidos.length ? modulosPermitidos : (PROFILE_PAGES[effectiveRole] || _ALL_PAGES)
    if (effectiveRole !== 'contador' && !allowed.includes('chat')) allowed = [...allowed, 'chat']
    if (!allowed.includes(page)) navigateTo(allowed[0] || 'dashboard')
  }, [simulatedRole]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!perfil) return
    try {
      const pending = JSON.parse(localStorage.getItem('nps_pendentes') || '[]')
      const now = Date.now()
      const due = pending.filter(n => n.sendAt <= now)
      const remaining = pending.filter(n => n.sendAt > now)
      if (due.length === 0) return
      localStorage.setItem('nps_pendentes', JSON.stringify(remaining))
      due.forEach((nps, i) => {
        setTimeout(() => {
          toast((t) => (
            <div style={{ minWidth: 220 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>📊 Enviar NPS ao cliente</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>{nps.cliente}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ flex: 1, padding: '6px 10px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                  onClick={() => { window.open(nps.waLink, '_blank'); toast.dismiss(t.id) }}>
                  WhatsApp
                </button>
                <button style={{ padding: '6px 10px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}
                  onClick={() => toast.dismiss(t.id)}>
                  Ignorar
                </button>
              </div>
            </div>
          ), { duration: 60000, id: `nps-${i}-${nps.cliente}` })
        }, i * 1500)
      })
    } catch {}
  }, [perfil?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', background:'var(--bg0)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ color:'var(--t2)' }}>Carregando...</div>
      </div>
    )
  }

  if (!perfil) return <Login />

  const PAGES = {
    dashboard: <Dashboard setPage={navigateTo} />,
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
    cadastros: <Cadastros />,
    vendas: <Vendas />,
    compras: <Compras />,
    estoque: <Estoque />,
    financeiro: <Financeiro />,
    financeiro_loja: <Financeiro />,
    dp: <DP />,
    os: <OrdensServico />,
    fila: <FilaLiberacao />,
    crm: <CRM />,
    catalogo: <CatalogoPub />,
    nf: <NotaFiscal />,
    nps: <Financeiro />,
    devolucao: <Financeiro />,
    relatorios: <Financeiro />,
    chat: <Chat />,
  }

  return (
    <AppCtx.Provider value={{ navigateTo, chatTarget, clearChatTarget, openChatWith, chatUnread, setChatUnread, reloadBgConfig }}>
    <LojaCtx.Provider value={{ lojaFiltro, setLojaFiltro }}>
      {bgConfig.activeUrl && (
        <div className="sys-bg-container">
          <img className="sys-bg-img" src={bgConfig.activeUrl} alt="" style={{ filter: bgConfig.blur > 0 ? `blur(${bgConfig.blur}px)` : undefined, transform: bgConfig.blur > 0 ? 'scale(1.05)' : undefined }} />
          <div className="sys-bg-overlay" style={{ opacity: bgConfig.overlay / 100 }} />
        </div>
      )}
      <div className="app">
        <Sidebar
          page={page}
          setPage={navigateTo}
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />
        <div className="content-area">
          <ContentTopbar page={page} setMobileOpen={setMobileOpen} navigateTo={navigateTo} collapsed={collapsed} onToggle={toggleSidebar} />
          <div className="content-main">
            <div key={animKey} className="page-enter">
              {PAGES[page] || PAGES.dashboard}
            </div>
          </div>
        </div>
        <Toaster />
      </div>
    </LojaCtx.Provider>
    </AppCtx.Provider>
  )
}

export default function App() {
  const hash = window.location.hash
  if (hash === '#/solicitar') return <SolicitarAssistenciaPublica />
  if (hash.startsWith('#/nps/')) return <NPSPublico token={hash.replace('#/nps/','')} />
  if (hash.startsWith('#/confirmar-compra/')) return <ConfirmarCompraPublica token={hash.replace('#/confirmar-compra/','')} />
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
