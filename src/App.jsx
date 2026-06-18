import React, { useState, useEffect, useRef, useCallback, createContext, useContext, Suspense } from 'react'
import './styles.css'
import {
  LayoutDashboard, Package, ClipboardList, CheckSquare,
  Route, Truck, Map, Trophy,
  ShoppingCart, Target, ShoppingBag, Star,
  Wrench, Calendar, Settings2,
  Archive, CreditCard, TrendingUp,
  Briefcase, Users, Clock,
  Store, Settings, MessageCircle,
  BookOpen, FileText, ListOrdered, Camera,
  Menu, Bell, Sun, Moon, Trash2, Paperclip, Send,
  Mail, Tag, MapPin, Eye, Edit2, Printer, Share2,
  AlertTriangle, Image, BarChart2, Rocket, Crown
} from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SuperAdmin } from './components/SuperAdmin'
const Nps        = React.lazy(() => import('./modules/Nps.jsx'))
const Mapa       = React.lazy(() => import('./modules/Mapa.jsx'))
const CatalogoPub = React.lazy(() => import('./modules/CatalogoPub.jsx'))
const Ranking    = React.lazy(() => import('./modules/Ranking.jsx'))
const MinhaRota   = React.lazy(() => import('./modules/MinhaRota.jsx'))
const Conferencia = React.lazy(() => import('./modules/Conferencia.jsx'))
const Roteiro        = React.lazy(() => import('./modules/Roteiro.jsx'))
const OrdensServico  = React.lazy(() => import('./modules/OrdensServico.jsx'))
const Compras        = React.lazy(() => import('./modules/Compras.jsx'))
const Cadastros      = React.lazy(() => import('./modules/Cadastros.jsx'))
const Equipe         = React.lazy(() => import('./modules/Equipe.jsx'))
const Estoque        = React.lazy(() => import('./modules/Estoque.jsx'))
const VendasPdv      = React.lazy(() => import('./modules/VendasPdv.jsx'))
const Assistencias   = React.lazy(() => import('./modules/Assistencias.jsx'))
const Crm            = React.lazy(() => import('./modules/Crm.jsx'))
const Dp             = React.lazy(() => import('./modules/Dp.jsx'))
const PontoEletronico = React.lazy(() => import('./modules/PontoEletronico.jsx'))
const Financeiro      = React.lazy(() => import('./modules/Financeiro.jsx'))
const Dashboard       = React.lazy(() => import('./modules/Dashboard.jsx'))
const Configuracoes   = React.lazy(() => import('./modules/Configuracoes.jsx'))
const Pedidos         = React.lazy(() => import('./modules/Pedidos.jsx'))
const PedidoDetalhe   = React.lazy(() => import('./modules/Pedidos.jsx').then(m => ({ default: m.PedidoDetalhe })))
import JsBarcode from 'jsbarcode'
import { jsPDF } from 'jspdf'
import { useData, useAction, useDateInfo, usePrazo, usePagination, usePullToRefresh, useServerPagination } from './hooks/index'
import { Btn, Badge, Modal, ConfirmModal, Ic, Logo, Alert, Spinner, Empty, Input } from './components/ui/index'
import { supabase } from './lib/supabase'
import { toast, Toaster } from './lib/toast'
import { validarTipoImagem } from './lib/validarTipoImagem'
import { podeAcessarModulosOperacionais } from './lib/empresaContext'
import { LojaCtx, useLojaFiltro } from './context/LojaContext'
import { useEffectiveLoja } from './hooks/useEffectiveLoja'
import { LojaSelect, LojaMultiSelect } from './components/LojaSelect'
import { WaTemplatesModal } from './components/WaTemplatesModal'
import { LeitorCodigoBarras } from './components/LeitorCodigoBarras'
import { EtiquetaModal } from './components/EtiquetaModal'
import { _ALL_PAGES, PROFILE_PAGES, PROFILE_LABELS, PAGE_LABELS } from './constants/perfis'
import { SuperAdminSemEmpresa } from './components/SuperAdminSemEmpresa'

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
  conciliacaoService,
} from './services/index'
function ImpersonationBanner() {
  const { impersonatingEmpresaId, impersonatingEmpresaNome, finalizarImpersonation } = useAuth()
  if (!impersonatingEmpresaId) return null
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
      background: 'linear-gradient(90deg, #dc2626, #b91c1c)',
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 16px', fontSize: 13, fontWeight: 600, gap: 12,
    }}>
      <span>🔴 MODO IMPERSONATION ATIVO — Você está visualizando como: <strong>{impersonatingEmpresaNome}</strong></span>
      <button
        onClick={finalizarImpersonation}
        style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.5)', color: '#fff', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}
      >
        SAIR DO MODO IMPERSONATION
      </button>
    </div>
  )
}

// Pagination controls — server-side
function Pagination({ page, totalPages, total, setPage }) {
  if (totalPages <= 1 && total < 5) return null
  const pages = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) pages.push(i)
    else if (pages[pages.length - 1] !== '...') pages.push('...')
  }
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'center', marginTop:16, flexWrap:'wrap' }}>
      <button className="btn btn-s btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</button>
      <span className="pagination-desktop" style={{ display:'flex', gap:4 }}>
        {pages.map((p, i) => p === '...'
          ? <span key={i} style={{ padding:'0 4px', color:'var(--t3)' }}>…</span>
          : <button key={p} className={`btn btn-sm ${p === page ? 'btn-p' : 'btn-s'}`} style={{ minWidth:32 }} onClick={() => setPage(p)}>{p}</button>
        )}
      </span>
      <span className="pagination-mobile" style={{ fontSize:13, color:'var(--t2)' }}>Pág. {page}/{totalPages}</span>
      <button className="btn btn-s btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>→</button>
      <span style={{ fontSize:12, color:'var(--t3)' }}>({total} registros)</span>
    </div>
  )
}

const AppCtx = createContext({ navigateTo: () => {}, chatTarget: null, clearChatTarget: () => {}, openChatWith: () => {}, chatUnread: 0, setChatUnread: () => {}, reloadBgConfig: () => {}, tema: 'dark', toggleTema: () => {} })

// ── Permissões por perfil (mantido para simulação) ────────
const fmtR = (v) => (parseFloat(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const fmtNPedido = (n) => n ? String(n).padStart(6, '0') : '—'

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
  'Cada entrega é uma promessa cumprida.',
  'Excelência em logística começa com você.',
  'Juntos somos o melhor do Brasil!',
  'Organização hoje, sucesso amanhã.',
  'Sua dedicação faz a diferença.',
]

const SIDEBAR_GROUPS = [
  { group: 'OPERACIONAL', items: [
    { id: 'dashboard',   label: 'Dashboard',   Icon: LayoutDashboard },
    { id: 'pedidos',     label: 'Pedidos',     Icon: Package },
    { id: 'separacao',   label: 'Separação',   Icon: ClipboardList },
    { id: 'conferencia', label: 'Conferência', Icon: CheckSquare },
  ]},
  { group: 'LOGÍSTICA', items: [
    { id: 'roteiro', label: 'Roteiro',    Icon: Route },
    { id: 'rota',    label: 'Minha Rota', Icon: Truck },
    { id: 'mapa',    label: 'Mapa',       Icon: Map },
    { id: 'ranking', label: 'Ranking',    Icon: Trophy },
  ]},
  { group: 'COMERCIAL', items: [
    { id: 'vendas',  label: 'Vendas e PDV', Icon: ShoppingCart },
    { id: 'crm',     label: 'CRM',          Icon: Target },
    { id: 'compras', label: 'Compras',      Icon: ShoppingBag },
    { id: 'nps',     label: 'NPS',          Icon: Star },
  ]},
  { group: 'ATENDIMENTO', items: [
    { id: 'assistencia', label: 'Assistência',       Icon: Wrench },
    { id: 'agenda',      label: 'Agenda',            Icon: Calendar },
    { id: 'os',          label: 'Ordens de Serviço', Icon: Settings2 },
  ]},
  { group: 'ESTOQUE', items: [
    { id: 'estoque',  label: 'Estoque',  Icon: Archive },
    { id: 'catalogo', label: 'Catálogo', Icon: BookOpen },
    { id: 'nf',       label: 'NF Entrada', Icon: FileText },
    { id: 'fila',     label: 'Fila',     Icon: ListOrdered },
  ]},
  { group: 'FINANCEIRO', items: [
    { id: 'financeiro',      label: 'Financeiro',  Icon: CreditCard },
    { id: 'financeiro_loja', label: 'Financeiro',  Icon: CreditCard },
    { id: 'relatorios',      label: 'Relatórios',  Icon: TrendingUp },
  ]},
  { group: 'PESSOAS', items: [
    { id: 'dp',     label: 'Departamento Pessoal', Icon: Briefcase },
    { id: 'equipe', label: 'Equipe',               Icon: Users },
    { id: 'ponto',  label: 'Ponto Eletrônico',     Icon: Clock },
  ]},
  { group: 'SISTEMA', items: [
    { id: 'cadastros',   label: 'Cadastros',     Icon: Store },
    { id: 'config',      label: 'Configurações', Icon: Settings },
    { id: 'chat',        label: 'Chat',          Icon: MessageCircle },
    { id: 'superadmin',  label: 'Super Admin',   Icon: Crown },
  ]},
]

function Sidebar({ page, setPage, collapsed, mobileOpen, setMobileOpen, logoVersaUrl }) {
  const { perfil, logout, isAdmin, isSimulating, simulatedRole, setSimulatedRole, simulatedLoja, setSimulatedLoja, effectiveRole, modulosPermitidos, isSuperAdmin, impersonatingEmpresaId } = useAuth()
  const { lojas } = useLojaFiltro()
  const { chatUnread } = useContext(AppCtx)
  let allowedPages = modulosPermitidos.length ? modulosPermitidos : (PROFILE_PAGES[effectiveRole] || _ALL_PAGES)
  if (effectiveRole !== 'contador' && !allowedPages.includes('chat')) allowedPages = [...allowedPages, 'chat']
  if (isSuperAdmin && !isSimulating) allowedPages = [...allowedPages, 'superadmin']
  // Super Admin sem empresa vinculada só acessa Super Admin e Chat (a menos que esteja em impersonation)
  if (isSuperAdmin && !isSimulating && !perfil?.empresa_id && !impersonatingEmpresaId) allowedPages = ['superadmin', 'chat']
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
            <div style={{ width:36, height:36, borderRadius:'50%', background: logoVersaUrl ? 'transparent' : '#000', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', flexShrink:0, overflow:'hidden' }}>
              {logoVersaUrl ? <img src={logoVersaUrl} alt="Logo" style={{ width:36, height:36, objectFit:'contain' }} /> : <Logo size={20} />}
            </div>
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
            <div style={{ width:32, height:32, borderRadius:'50%', background: perfil?.foto_url ? 'transparent' : 'linear-gradient(135deg,var(--accent),#a78bfa)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:13, flexShrink:0, overflow:'hidden' }}>
              {perfil?.foto_url
                ? <img src={perfil.foto_url} alt="" style={{ width:32, height:32, objectFit:'cover', borderRadius:'50%' }} />
                : perfil?.full_name?.[0]?.toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div style={{ overflow:'hidden', flex:1 }}>
                <div style={{ fontWeight:600, fontSize:13, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{perfil?.full_name}</div>
                <div style={{ fontSize:10, color:'var(--t3)', whiteSpace:'nowrap' }}>{PROFILE_LABELS[effectiveRole] || effectiveRole} · Versa Log</div>
              </div>
            )}
          </div>
          {!collapsed && isAdmin && (
            <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:4 }}>
              <select
                style={{ width:'100%', fontSize:11, padding:'4px 8px', border:'1px solid var(--border)', borderRadius:6, background:'var(--bg2)', color: isSimulating ? '#f97316' : 'var(--t2)', cursor:'pointer', fontFamily:'var(--font)' }}
                value={simulatedRole || ''}
                onChange={e => { setSimulatedRole(e.target.value || null); setSimulatedLoja(null) }}
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
              {isSimulating && (
                <select
                  style={{ width:'100%', fontSize:11, padding:'4px 8px', border:'1px solid var(--border)', borderRadius:6, background:'var(--bg2)', color: simulatedLoja ? '#f97316' : 'var(--t2)', cursor:'pointer', fontFamily:'var(--font)' }}
                  value={simulatedLoja ?? ''}
                  onChange={e => setSimulatedLoja(e.target.value === '__null__' ? null : e.target.value)}
                >
                  <option value="__null__">🏬 Loja (real)</option>
                  <option value="">Todas as lojas</option>
                  {(lojas ?? []).map(l => <option key={l.id || l.nome} value={l.nome}>{l.nome}</option>)}
                </select>
              )}
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
                    <span className="sb-icon"><it.Icon size={17} strokeWidth={1.7} /></span>
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
            <div style={{ fontSize:12, color:'var(--t3)', lineHeight:1.55, marginBottom:8, minHeight:38, transition:'opacity .3s', display:'flex', alignItems:'flex-start', gap:6 }}>
              <Rocket size={13} strokeWidth={1.6} style={{ flexShrink:0, marginTop:2, opacity:0.6 }} />
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
    notificacoesService.contarNaoLidas(perfil.id).then(setCount)
    const channel = supabase
      .channel(`notif-bell-${perfil.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notificacoes',
        filter: `usuario_id=eq.${perfil.id}`,
      }, (payload) => {
        if (!payload.new?.lida) setCount(c => c + 1)
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'notificacoes',
        filter: `usuario_id=eq.${perfil.id}`,
      }, () => {
        notificacoesService.contarNaoLidas(perfil.id).then(setCount)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
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
        style={{ position:'relative', width:34, height:34, borderRadius:8, border:'none', background:'var(--bg3)', color:'var(--t1)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Bell size={17} strokeWidth={1.8} />
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
  const { perfil, isSimulating, simulatedRole, isGestor, isSuperAdmin, impersonatingEmpresaId } = useAuth()
  const { lojaFiltro, setLojaFiltro, lojas } = useLojaFiltro()
  const superAdminSemEmpresa = isSuperAdmin && !perfil?.empresa_id && !impersonatingEmpresaId
  const { tema, toggleTema } = useContext(AppCtx)
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
      <button className="btn btn-g btn-ico btn-sm sb-mobile-btn" onClick={() => setMobileOpen(o => !o)}><Menu size={18} /></button>
      <button className="sb-desktop-toggle" onClick={onToggle} title={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}>
        <Ic n="chev" s={17} style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 250ms ease' }} />
      </button>
      <div style={{ flex:1 }}>
        <span style={{ fontWeight:600, fontSize:16, color:'var(--t1)' }}>{PAGE_LABELS[page] || page}</span>
      </div>
      {isGestor && !superAdminSemEmpresa && (
        <select
          value={lojaFiltro}
          onChange={e => setLojaFiltro(e.target.value)}
          style={{ fontSize:12, padding:'4px 8px', border:'1px solid var(--border)', borderRadius:8, background:'var(--bg2)', color:'var(--t1)', maxWidth:140, cursor:'pointer' }}
        >
          <option value="">Todas as lojas</option>
          {(lojas ?? []).map(l => <option key={l.id || l.nome} value={l.nome}>{l.nome}</option>)}
        </select>
      )}
      {isSimulating && (
        <span style={{ fontSize:11, background:'#f97316', color:'#fff', padding:'2px 10px', borderRadius:20, fontWeight:600, whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:4 }}>
          <Eye size={11} /> {PROFILE_LABELS[simulatedRole] || simulatedRole}
        </span>
      )}
      <button
        onClick={toggleTema}
        title={tema === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
        style={{ width:52, height:28, borderRadius:14, border:'1px solid var(--border)', background: tema === 'dark' ? '#111113' : '#e8e8f0', cursor:'pointer', display:'flex', alignItems:'center', padding:'0 3px', flexShrink:0, position:'relative', transition:'background 0.3s ease, border-color 0.3s ease' }}
      >
        <div className="theme-toggle-knob" style={{ width:22, height:22, borderRadius:'50%', background: tema === 'dark' ? '#ffffff' : '#1a1a1a', display:'flex', alignItems:'center', justifyContent:'center', transform: tema === 'dark' ? 'translateX(0)' : 'translateX(24px)', transition:'transform 0.3s ease, background 0.3s ease', flexShrink:0 }}>
          {tema === 'dark'
            ? <Moon size={12} color="#111113" strokeWidth={2.2} />
            : <Sun size={12} color="#ffffff" strokeWidth={2.2} />}
        </div>
      </button>
      <NotifBell navigateTo={navigateTo} />
      <div ref={menuRef} style={{ position:'relative' }}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{ width:34, height:34, borderRadius:'50%', border:'none', background: perfil?.foto_url ? 'transparent' : 'linear-gradient(135deg,var(--accent),#a78bfa)', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', padding:0 }}>
          {perfil?.foto_url
            ? <img src={perfil.foto_url} alt="" style={{ width:34, height:34, objectFit:'cover', borderRadius:'50%' }} />
            : perfil?.full_name?.[0]?.toUpperCase() || 'U'}
        </button>
        {menuOpen && (
          <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:'6px', minWidth:180, zIndex:9999, boxShadow:'0 8px 32px rgba(0,0,0,.5)' }}>
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
  const lojaEf = useEffectiveLoja()
  const [selectedId, setSelectedId] = useState(null)

  const hoje  = new Date().toISOString().split('T')[0]
  const amanha = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const seteD  = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const STATUS_FINAIS = ['Entregue', 'Cancelado', 'Pronto para Rota', 'Em Rota']

  const queryFn = useCallback(
    ({ search, from, to }) => pedidosService.listPaged({
      search, from, to,
      loja_filtro: lojaEf,
      data_entrega_from: hoje,
      data_entrega_to: seteD,
      status_excluir: STATUS_FINAIS,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lojaEf, hoje, seteD]
  )

  const { data: pedidos, loading, total, page, setPage, totalPages, search, setSearch, reload } = useServerPagination(queryFn, 100)

  if (selectedId) return <SeparacaoDetalhe pedidoId={selectedId} onBack={() => { setSelectedId(null); reload() }} />

  const deHoje   = (pedidos || []).filter(p => p.data_entrega === hoje)
  const deAmanha = (pedidos || []).filter(p => p.data_entrega === amanha)
  const de7Dias  = (pedidos || []).filter(p => p.data_entrega > amanha && p.data_entrega <= seteD)

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
      <div className="stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 16 }}>
        {[
          { label: 'Hoje',   val: deHoje.length,   color: deHoje.length > 0 ? 'var(--red)' : 'var(--green)', bg: deHoje.length > 0 ? 'var(--rdim)' : 'var(--gdim)' },
          { label: 'Amanhã', val: deAmanha.length,  color: 'var(--amber)', bg: 'var(--adim2)' },
          { label: '7 dias', val: de7Dias.length,   color: 'var(--accent)', bg: 'var(--adim)' },
        ].map(s => (
          <div className="stat" key={s.label}>
            <div className="stat-val" style={{ color: s.color }}>{loading ? '—' : s.val}</div>
            <div className="stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      <Input
        placeholder="Buscar cliente ou nº pedido..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
      />

      {loading ? <Spinner /> : (
        <>
          {deHoje.length > 0   && <SeparacaoGrupo titulo="Hoje"             pedidos={deHoje}   onSelect={setSelectedId} urgente />}
          {deAmanha.length > 0 && <SeparacaoGrupo titulo="Amanhã"           pedidos={deAmanha} onSelect={setSelectedId} />}
          {de7Dias.length > 0  && <SeparacaoGrupo titulo="Próximos 7 dias"  pedidos={de7Dias}  onSelect={setSelectedId} />}
          {(pedidos || []).length === 0 && <Empty icon="📦" text="Nenhum pedido pendente de separação" />}
          <Pagination page={page} totalPages={totalPages} total={total} setPage={setPage} />
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
        <div className="li-sub">#{fmtNPedido(p.numero_pedido)}{p.local_separacao ? ` · ${p.local_separacao}` : ''}</div>
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
  const [scanner, setScanner] = useState(false)
  const [scanHighlight, setScanHighlight] = useState(null)

  useEffect(() => {
    if (pedido?.produtos) {
      setProdutos(pedido.produtos.map(p => ({ ...p, _volumes: p.volumes || '', _local: p.local_separacao || '', _peso: p.nivel_peso || '', _foto: p.foto_separacao || null, _fotoPreview: null })))
    }
  }, [pedido?.id])

  const updateProd = (id, field, value) => {
    setProdutos(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const uploadFoto = async (prodId, file) => {
    try { await validarTipoImagem(file) } catch (e) { toast.error(e.message); return }
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
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <Btn size="sm" variant="secondary" onClick={() => setScanner(true)}><Camera size={13} strokeWidth={1.8} /> Escanear</Btn>
          <Badge status={pedido.status} />
        </div>
      </div>

      <h1 style={{ fontSize: 20, marginBottom: 2 }}>{pedido.cliente}</h1>
      <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 4 }}>Pedido #{fmtNPedido(pedido.numero_pedido)}</div>
      <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 16 }}>
        📅 Entrega: {pedido.data_entrega ? new Date(pedido.data_entrega + 'T12:00').toLocaleDateString('pt-BR') : '—'}
      </div>

      {todosSeparados && (
        <Alert type="success" style={{ marginBottom: 16 }}>✓ Todos os produtos separados! Status do fluxo atualizado para separado.</Alert>
      )}

      <div style={{ fontWeight: 600, marginBottom: 12 }}>Produtos ({produtos.length})</div>

      {scanner && <LeitorCodigoBarras onScan={code => {
        const match = produtos.find(p => p.referencia === code || p.codigo_barras === code || p.nome_produto?.toLowerCase().includes(code.toLowerCase()))
        if (match) { setScanHighlight(match.id); setTimeout(() => setScanHighlight(null), 3000) }
        else toast.error('Produto não encontrado: ' + code)
        setScanner(false)
      }} onClose={() => setScanner(false)} />}

      {produtos.map(pr => (
        <div key={pr.id} style={{
          background: scanHighlight === pr.id ? 'rgba(99,102,241,0.12)' : pr.status_produto === 'Separado' ? 'rgba(34,197,94,0.05)' : 'var(--bg1)',
          border: `1px solid ${scanHighlight === pr.id ? '#6366f1' : pr.status_produto === 'Separado' ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
          borderRadius: 12, padding: 16, marginBottom: 12, transition:'border-color .3s, background .3s',
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
                      <Camera size={22} color="var(--t3)" strokeWidth={1.5} style={{ marginBottom: 4 }} />
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
                    <div style={{ fontWeight:700 }}>Pedido #{fmtNPedido(p.numero_pedido)}</div>
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
          try { await validarTipoImagem(f) } catch (e) { toast.error(e.message); continue }
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
        <button className="btn btn-s btn-sm btn-ico" onClick={() => fileRef.current?.click()} title="Anexar" style={{ width:38, height:40, flexShrink:0 }}><Paperclip size={15} strokeWidth={1.8} /></button>
        <button className="btn btn-p btn-sm" onClick={() => enviar()} disabled={enviando} style={{ height:40, padding:'0 14px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {enviando ? '...' : <Send size={14} strokeWidth={1.8} />}
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
  const { perfil, empresaId } = useAuth()

  const verificar = useCallback(async () => {
    if (!perfil?.id) return
    try {
      const agora     = new Date()
      const hoje      = agora.toISOString().split('T')[0]
      const diaSemana = agora.getDay()

      let qEscalas = supabase
        .from('escalas_trabalho')
        .select('*')
        .eq('usuario_id', perfil.id)
        .eq('ativo', true)
        .or(`dia_semana.eq.${diaSemana},dia_semana.is.null`)
        .order('dia_semana', { nullsFirst: false })
        .limit(1)
      if (empresaId) qEscalas = qEscalas.eq('empresa_id', empresaId)
      const { data: escalas } = await qEscalas

      const escala = escalas?.[0]
      if (!escala) return

      let qPontos = supabase.from('pontos').select('tipo_marcacao, tipo').eq('usuario_id', perfil.id).eq('data', hoje)
      if (empresaId) qPontos = qPontos.eq('empresa_id', empresaId)
      const { data: pontos } = await qPontos

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
        let qNot = supabase.from('notificacoes').select('id')
          .eq('usuario_id', perfil.id).eq('tipo', 'lembrete_ponto').eq('titulo', titulo)
          .gte('created_at', `${hoje}T00:00:00`).limit(1)
        if (empresaId) qNot = qNot.eq('empresa_id', empresaId)
        const { data: ja } = await qNot
        if (ja?.length) return
        await supabase.from('notificacoes').insert({
          usuario_id: perfil.id,
          tipo: 'lembrete_ponto',
          titulo,
          mensagem,
          lida: false,
          ...(empresaId ? { empresa_id: empresaId } : {}),
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
      let qEscOntem = supabase.from('escalas_trabalho').select('*').eq('usuario_id', perfil.id).eq('ativo', true)
        .or(`dia_semana.eq.${ontem.getDay()},dia_semana.is.null`).limit(1)
      if (empresaId) qEscOntem = qEscOntem.eq('empresa_id', empresaId)
      const { data: escalasOntem } = await qEscOntem
      if (escalasOntem?.[0]) {
        let qPOntem = supabase.from('pontos').select('tipo_marcacao,tipo').eq('usuario_id', perfil.id).eq('data', ontemStr)
        if (empresaId) qPOntem = qPOntem.eq('empresa_id', empresaId)
        const { data: pontosOntem } = await qPOntem
        if ((pontosOntem||[]).length > 0) {
          const regOntem = new Set((pontosOntem||[]).map(p => p.tipo_marcacao || p.tipo))
          if (!regOntem.has('saida') && !regOntem.has('Saída')) {
            let qOc = supabase.from('ponto_ocorrencias').select('id')
              .eq('usuario_id', perfil.id).eq('data', ontemStr).eq('tipo', 'esquecimento_ponto').limit(1)
            if (empresaId) qOc = qOc.eq('empresa_id', empresaId)
            const { data: jaOc } = await qOc
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
  const { perfil, loading, isGestor, isEntregador, simulatedRole, effectiveRole, modulosPermitidos, impersonatingEmpresaId } = useAuth()
  useVerificarLembretesPonto()
  const defaultPage = isEntregador && !isGestor ? 'rota' : 'dashboard'
  const [page, setPage] = useState(defaultPage)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sb_collapsed') === 'true')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [animKey, setAnimKey] = useState(0)
  const [lojaFiltro, setLojaFiltro] = useState('')
  const { data: lojasData } = useData(() => lojasService.list(), [impersonatingEmpresaId])
  const lojas = lojasData ?? []
  const [chatTarget, setChatTargetState] = useState(null)
  const [chatUnread, setChatUnread] = useState(0)
  const [bgConfig, setBgConfig] = useState({ activeUrl: null, blur: 8, overlay: 40, logoVersaUrl: null })
  const [tema, setTema] = useState(() => localStorage.getItem('tema_versa_log') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema)
    document.body.classList.toggle('light-mode', tema === 'light')
    localStorage.setItem('tema_versa_log', tema)
  }, [tema])

  const toggleTema = useCallback(() => setTema(t => t === 'dark' ? 'light' : 'dark'), [])

  // Limpa o filtro de loja ao trocar de empresa via impersonation
  useEffect(() => { setLojaFiltro('') }, [impersonatingEmpresaId])

  const temaRef = useRef(tema)
  useEffect(() => { temaRef.current = tema }, [tema])

  const reloadBgConfig = useCallback(async (directConfig) => {
    try {
      const d = directConfig ?? await configSistemaService.get()
      if (d) {
        const t = temaRef.current
        let activeUrl = null
        if (t === 'light') {
          const key = d.bg_ativa_clara
          activeUrl = key ? (d[key] || null) : null
        } else {
          const key = d.bg_ativa_escura
          const legacyKey = d.bg_imagem_ativa
          activeUrl = key ? (d[key] || null) : (legacyKey ? (d[legacyKey] || null) : null)
        }
        setBgConfig({ activeUrl, blur: d.bg_blur_intensidade ?? 8, overlay: d.bg_overlay_opacidade ?? 40, logoVersaUrl: d.logo_versa_url || null })
      }
    } catch {}
  }, []) // temaRef is a ref — stable, no need in deps

  useEffect(() => { reloadBgConfig() }, [tema]) // eslint-disable-line react-hooks/exhaustive-deps

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
    dashboard: <Suspense fallback={<Spinner />}><Dashboard setPage={navigateTo} DetalheComponent={PedidoDetalhe} /></Suspense>,
    pedidos: <Suspense fallback={<Spinner />}><Pedidos openChatWith={openChatWith} /></Suspense>,
    separacao: <Separacao />,
    agenda: <Agenda />,
    assistencia: <Suspense fallback={<Spinner />}><Assistencias /></Suspense>,
    roteiro: <Suspense fallback={<Spinner />}><Roteiro /></Suspense>,
    conferencia: <Suspense fallback={<Spinner />}><Conferencia /></Suspense>,
    equipe: <Suspense fallback={<Spinner />}><Equipe /></Suspense>,
    ranking: <Suspense fallback={<Spinner />}><Ranking /></Suspense>,
    mapa: <Suspense fallback={<Spinner />}><Mapa /></Suspense>,
    rota: <Suspense fallback={<Spinner />}><MinhaRota /></Suspense>,
    ponto: <Suspense fallback={<Spinner />}><PontoEletronico /></Suspense>,
    config: <Suspense fallback={<Spinner />}><Configuracoes reloadBgConfig={reloadBgConfig} /></Suspense>,
    cadastros: <Suspense fallback={<Spinner />}><Cadastros /></Suspense>,
    vendas: <Suspense fallback={<Spinner />}><VendasPdv /></Suspense>,
    compras: <Suspense fallback={<Spinner />}><Compras /></Suspense>,
    estoque: <Suspense fallback={<Spinner />}><Estoque /></Suspense>,
    financeiro: <Suspense fallback={<Spinner />}><Financeiro /></Suspense>,
    financeiro_loja: <Suspense fallback={<Spinner />}><Financeiro /></Suspense>,
    dp: <Suspense fallback={<Spinner />}><Dp /></Suspense>,
    os: <Suspense fallback={<Spinner />}><OrdensServico /></Suspense>,
    fila: <FilaLiberacao />,
    crm: <Suspense fallback={<Spinner />}><Crm /></Suspense>,
    catalogo: <Suspense fallback={<Spinner />}><CatalogoPub /></Suspense>,
    nf: <NotaFiscal />,
    nps: <Suspense fallback={<Spinner />}><Nps /></Suspense>,
    relatorios: <Suspense fallback={<Spinner />}><Financeiro /></Suspense>,
    chat: <Chat />,
    superadmin: <SuperAdmin />,
  }

  return (
    <AppCtx.Provider value={{ navigateTo, chatTarget, clearChatTarget, openChatWith, chatUnread, setChatUnread, reloadBgConfig, tema, toggleTema }}>
    <LojaCtx.Provider value={{ lojaFiltro, setLojaFiltro, lojas }}>
      {bgConfig.activeUrl && (
        <div className="sys-bg-container">
          <img className="sys-bg-img" src={bgConfig.activeUrl} alt="" style={{ filter: bgConfig.blur > 0 ? `blur(${bgConfig.blur}px)` : undefined, transform: bgConfig.blur > 0 ? 'scale(1.05)' : undefined }} />
          <div className="sys-bg-overlay" style={{ opacity: bgConfig.overlay / 100 }} />
        </div>
      )}
      <ImpersonationBanner />
      <div className="app">
        <Sidebar
          page={page}
          setPage={navigateTo}
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          logoVersaUrl={bgConfig.logoVersaUrl}
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
