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
import JsBarcode from 'jsbarcode'
import { jsPDF } from 'jspdf'
import { useData, useAction, useDateInfo, usePrazo, usePagination, usePullToRefresh, useServerPagination } from './hooks/index'
import { Btn, Badge, Modal, ConfirmModal, Ic, Logo, Alert, Spinner, Empty, Input } from './components/ui/index'
import * as XLSX from 'xlsx'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
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
// DASHBOARD
// ============================================================
function Dashboard({ setPage }) {
  if (!podeAcessarModulosOperacionais()) return <SuperAdminSemEmpresa />
  return <DashboardInner setPage={setPage} />
}
function DashboardInner({ setPage }) {
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

  const mesStart = `${mesPfx}-01T00:00:00`
  const mesEnd   = new Date(anoAtual, mesAtual, 1).toISOString().slice(0, 10) + 'T00:00:00'
  const prox7Iso = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0] })()

  const needPHoje    = isAdminDiretor || isGerente || isLogistica || isOperacional || isEntregador
  const needAtrasado = isAdminDiretor || isGerente || isLogistica
  const needAgFin    = isAdminDiretor || isAssistenteAdmin

  // Pedidos — role-targeted queries (no full-table scan)
  const { data: pHojeD,              loading: lPed, reload: rPHoje   } = useData(() => needPHoje    ? pedidosService.listHoje(lojaEf)                              : Promise.resolve([]), [needPHoje, lojaEf])
  const { data: pAtrasadosD,                         reload: rPAtr    } = useData(() => needAtrasado ? pedidosService.listAtrasados(lojaEf)                         : Promise.resolve([]), [needAtrasado, lojaEf])
  const { data: aguardandoGerenteD,                  reload: rAgGer   } = useData(() => isGerente    ? pedidosService.listPorFluxo('aguardando_gerente', lojaEf)    : Promise.resolve([]), [isGerente, lojaEf])
  const { data: aguardandoFinanceiroD,               reload: rAgFin   } = useData(() => needAgFin    ? pedidosService.listPorFluxo('aguardando_financeiro', lojaEf) : Promise.resolve([]), [needAgFin, lojaEf])
  const { data: separadosParaAgendarD,               reload: rSepAg   } = useData(() => isLogistica  ? pedidosService.listParaAgendar(lojaEf)                       : Promise.resolve([]), [isLogistica, lojaEf])
  const { data: separacoesPendHojeD,                 reload: rSepH    } = useData(() => isLogistica  ? pedidosService.listSeparadosHoje(hoje, lojaEf)               : Promise.resolve([]), [isLogistica, hoje, lojaEf])
  const { data: meusPedidosD,                        reload: rMeusPed } = useData(() => isVendedor   ? pedidosService.listMeusPedidos(perfil?.id)                   : Promise.resolve([]), [isVendedor, perfil?.id])

  const rPed = useCallback(() => { rPHoje(); rPAtr(); rAgGer(); rAgFin(); rSepAg(); rSepH(); rMeusPed() },
    [rPHoje, rPAtr, rAgGer, rAgFin, rSepAg, rSepH, rMeusPed])

  const { data: assAbertasD, loading: lAss } = useData(
    () => (isAdminDiretor || isGerente || isLogistica || isTecnicoAtend) ? assistenciasService.listAbertas(lojaEf) : Promise.resolve([]),
    [isAdminDiretor, isGerente, isLogistica, isTecnicoAtend, lojaEf]
  )
  const { data: vendas } = useData(
    () => needVendas ? vendasService.listMesDash(mesStart, mesEnd, lojaEf) : Promise.resolve([]),
    [needVendas, mesStart, mesEnd, lojaEf]
  )
  const { data: receber } = useData(
    () => needFinan ? financeiroService.listReceberAberto(lojaEf) : Promise.resolve([]),
    [needFinan, lojaEf]
  )
  const { data: pagar } = useData(
    () => needFinan ? financeiroService.listPagarProximo(prox7Iso, lojaEf) : Promise.resolve([]),
    [needFinan, prox7Iso, lojaEf]
  )
  const { data: compras } = useData(
    () => isAssistenteAdmin ? comprasService.listPendentesDash(lojaEf) : Promise.resolve([]),
    [isAssistenteAdmin, lojaEf]
  )
  const { data: metas } = useData(
    () => isAdminDiretor || isGerente || isVendedor ? metasService.list(mesAtual, anoAtual) : Promise.resolve([]),
    [isAdminDiretor, isGerente, isVendedor]
  )

  const [selected, setSelected] = useState(null)
  if (selected) return <PedidoDetalhe pedidoId={selected} onBack={() => { setSelected(null); rPed() }} />

  // Coalesce useData results to arrays (initial state is null)
  const pHoje              = pHojeD              || []
  const pAtrasados         = pAtrasadosD         || []
  const aguardandoGerente  = aguardandoGerenteD  || []
  const aguardandoFinanceiro = aguardandoFinanceiroD || []
  const separadosParaAgendar = separadosParaAgendarD || []
  const separacoesPendHoje   = separacoesPendHojeD   || []
  const meusPedidos          = meusPedidosD          || []
  const assAbertas           = assAbertasD           || []

  // Derived from month-scoped vendas (already loja-filtered from server)
  const vendasHoje  = (vendas||[]).filter(v => v.created_at?.startsWith(hoje))
  const totalVHoje  = vendasHoje.reduce((s,v)=>s+(parseFloat(v.total)||0),0)
  const totalVMes   = (vendas||[]).reduce((s,v)=>s+(parseFloat(v.total)||0),0)

  const minhasVHoje = (vendas||[]).filter(v => v.vendedor_id === perfil?.id && v.created_at?.startsWith(hoje))
  const minhasVMes  = (vendas||[]).filter(v => v.vendedor_id === perfil?.id)
  const totalMHoje  = minhasVHoje.reduce((s,v)=>s+(parseFloat(v.total)||0),0)
  const totalMMes   = minhasVMes.reduce((s,v)=>s+(parseFloat(v.total)||0),0)

  // Financeiro already pre-filtered by server
  const vencHoje = (receber||[]).filter(r => r.vencimento === hoje)
  const recAberto = receber || []
  const pagar7d   = pagar   || []
  const cmpPend   = compras || []

  const assMinhas   = assAbertas.filter(a => a.tecnico_id === perfil?.id)

  const diasParado = (p) => Math.floor((Date.now() - new Date(p.updated_at || p.created_at).getTime()) / 86400000)

  const metaLoja    = (metas||[]).find(m => m.referencia_nome === lojaEf && m.tipo === 'loja')
  const metaLojaPct = metaLoja ? Math.min(100, totalVMes / (metaLoja.valor_meta || 1) * 100) : 0
  const metaPess    = (metas||[]).find(m => m.referencia_id === perfil?.id && m.tipo === 'vendedor')
  const metaPessPct = metaPess ? Math.min(100, totalMMes / (metaPess.valor_meta || 1) * 100) : 0

  const ATALHOS = isEntregador
    ? [{label:'Minha Rota',Icon:Truck,page:'rota'},{label:'Ponto',Icon:Clock,page:'ponto'}]
    : isOperacional
    ? effectiveRole === 'separador'
      ? [{label:'Separações',Icon:ClipboardList,page:'separacao'},{label:'Ponto',Icon:Clock,page:'ponto'}]
      : effectiveRole === 'conferente'
      ? [{label:'Conferências',Icon:CheckSquare,page:'conferencia'},{label:'Ponto',Icon:Clock,page:'ponto'}]
      : [{label:'Pedidos',Icon:Package,page:'pedidos'},{label:'Ponto',Icon:Clock,page:'ponto'}]
    : isVendedor
    ? [{label:'Nova Venda',Icon:ShoppingCart,page:'vendas'},{label:'CRM',Icon:Target,page:'crm'},{label:'Ponto',Icon:Clock,page:'ponto'}]
    : isTecnicoAtend
    ? [{label:'Assistências',Icon:Wrench,page:'assistencia'},{label:'Agenda',Icon:Calendar,page:'agenda'},{label:'Ponto',Icon:Clock,page:'ponto'}]
    : isAssistenteAdmin
    ? [{label:'Compras',Icon:ShoppingBag,page:'compras'},{label:'Financeiro',Icon:CreditCard,page:'financeiro_loja'},{label:'Ponto',Icon:Clock,page:'ponto'}]
    : [{label:'Nova Venda',Icon:ShoppingCart,page:'vendas'},{label:'Novo Pedido',Icon:Package,page:'pedidos'},{label:'Assistência',Icon:Wrench,page:'assistencia'},{label:'Ponto',Icon:Clock,page:'ponto'}]

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
            <a.Icon size={22} strokeWidth={1.7} />
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
                    <div className="li-sub" style={{ color: dias >= 2 ? 'var(--amber)' : undefined }}>#{fmtNPedido(p.numero_pedido)}{dias >= 2 ? ` · ⏳ Aguardando há ${dias} dia(s)` : ''}</div>
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
                  <div className="li-main"><div className="li-title">{p.cliente}</div><div className="li-sub">#{fmtNPedido(p.numero_pedido)} · {p.loja||p.local_separacao}</div></div>
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
                    <div className="li-sub" style={{ color: dias >= 2 ? 'var(--amber)' : undefined }}>#{fmtNPedido(p.numero_pedido)}{dias >= 2 ? ` · ⏳ Aguardando há ${dias} dia(s)` : ''}</div>
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
                  <div className="li-main"><div className="li-title">{p.cliente}</div><div className="li-sub">#{fmtNPedido(p.numero_pedido)}</div></div>
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
                <div className="li-main"><div className="li-title">{p.cliente}</div><div className="li-sub">#{fmtNPedido(p.numero_pedido)} · {p.entregador_nome||'Sem entregador'}</div></div>
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
                <div className="li-main"><div className="li-title">{p.cliente}</div><div className="li-sub">#{fmtNPedido(p.numero_pedido)} · {p.local_separacao||''}</div></div>
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
                <div className="li-main"><div className="li-title">{p.cliente}</div><div className="li-sub">#{fmtNPedido(p.numero_pedido)}</div></div>
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
                <div className="li-main"><div className="li-title">{p.cliente}</div><div className="li-sub">#{fmtNPedido(p.numero_pedido)} · {p.data_entrega}</div></div>
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
                <div className="li-main"><div className="li-title">{p.cliente}</div><div className="li-sub">#{fmtNPedido(p.numero_pedido)} · {p.loja||p.local_separacao}</div></div>
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
                    <div className="li-sub" style={{ color: dias >= 2 ? 'var(--amber)' : undefined }}>#{fmtNPedido(p.numero_pedido)}{dias >= 2 ? ` · ⏳ ${dias} dia(s)` : ''}</div>
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
                <div className="li-main"><div className="li-title">{p.cliente}</div><div className="li-sub">#{fmtNPedido(p.numero_pedido)} · {p.endereco}</div></div>
                <Badge status={p.status} />
              </div>
            ))}
        </div>
      </>}
    </div>
  )
}

function ModalDevolucao({ pedido, onClose, onConfirm }) {
  const [form, setForm] = useState({ tipo:'total', motivo:'arrependimento', descricao:'', valor_devolvido:0, estoque_revertido:true, financeiro_revertido:true })
  const act = useAction()
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const MOTIVOS = ['arrependimento','defeito','medida errada','item incorreto','outro']
  return (
    <Modal title="Solicitar Devolução" onClose={onClose}>
      <Alert type="warning" style={{ marginBottom:12 }}>Esta ação registrará a devolução e atualizará o status do pedido.</Alert>
      <div className="grid2">
        <div className="fg"><label className="fl">Tipo de devolução</label>
          <select className="fi" value={form.tipo} onChange={up('tipo')}>
            <option value="total">Total</option>
            <option value="parcial">Parcial</option>
          </select>
        </div>
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
  if (!podeAcessarModulosOperacionais()) return <SuperAdminSemEmpresa />
  return <PedidosInner />
}
function PedidosInner() {
  const { perfil, isGestor, effectiveRole, podeVerFinanceiro } = useAuth()
  const [statusFil, setStatusFil] = useState('Todos')
  const [lojasFil, setLojasFil] = useState([])
  const [fluxoFil, setFluxoFil] = useState(null)
  const [selected, setSelected] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [checkedIds, setCheckedIds] = useState(new Set())
  const [showBulkDel, setShowBulkDel] = useState(false)
  const [bulkDelLoading, setBulkDelLoading] = useState(false)

  const queryFn = useCallback(
    ({ search, from, to }) => pedidosService.listPaged({ search, from, to, status: statusFil, lojas: lojasFil, fluxoFil }),
    [statusFil, lojasFil, fluxoFil]
  )
  const { data: pedidos, loading, total, page, setPage, totalPages, search, setSearch, reload } = useServerPagination(queryFn)

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

  // Mapeia campos da UI para colunas reais da tabela pedidos
  const mapPedidoDB = (dados) => {
    const COLS = ['cliente','telefone','endereco','cidade','data_entrega','status','prioridade','observacoes','local_separacao','entregador_id','entregador_nome','motivo_remarcacao','motivo_cancelamento']
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
      await pedidosService.create(
        mapPedidoDB(raw),
        (produtos || []).map(p => mapProdutoDB(p, null))
      )
      await reload()
      setShowNew(false)
      toast.success('Pedido criado com sucesso!')
    } catch (e) {
      console.error('[Pedidos] handleCreate:', e)
      toast.error('Erro ao criar pedido: ' + (e.message || e.details || 'desconhecido'))
    }
  }

  const handleImport = async (lista) => {
    try {
      const lote = lista.map(item => {
        const { produtos, selected: _s, erro: _e, _confidence: _c, _filename: _f, ...raw } = item
        return {
          pedido: mapPedidoDB(raw),
          produtos: (produtos || []).map(p => mapProdutoDB(p, null)),
        }
      })
      await pedidosService.importLote(lote)
      await reload()
      setShowImport(false)
      toast.success(`${lista.length} pedido(s) importado(s) com sucesso!`)
    } catch (e) {
      console.error('[Pedidos] handleImport:', e)
      toast.error('Erro ao importar: ' + (e.message || 'desconhecido'))
    }
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
          <div className="ph-sub">{total} pedido(s){checkedIds.size > 0 ? ` · ${checkedIds.size} selecionado(s)` : ''}</div>
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
        <input className="search" placeholder="Buscar cliente ou pedido..." value={search} onChange={e => setSearch(e.target.value)} autoComplete="off" />
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

      {loading ? <Spinner /> : pedidos.length === 0 ? <Empty icon="📦" /> :
        pedidos.map(p => (
          <PedidoCard key={p.id} pedido={p} onClick={() => setSelected(p.id)}
            checked={isGestor ? checkedIds.has(p.id) : undefined}
            onCheck={isGestor ? (e) => toggleCheck(p.id, e) : undefined}
          />
        ))}
      <Pagination page={page} totalPages={totalPages} total={total} setPage={setPage} />

      {showNew && (
        <NovoPedidoModal onClose={() => setShowNew(false)} onSave={handleCreate} />
      )}
      {showImport && (
        <ImportarLoteModal onClose={() => setShowImport(false)} onImport={handleImport} />
      )}
    </div>
  )
}

const PedidoCard = React.memo(function PedidoCard({ pedido: p, onClick, checked, onCheck }) {
  const d = useDateInfo(p.data_entrega)
  return (
    <div className="li" onClick={onClick} style={{ background: checked ? 'var(--rdim)' : undefined }}>
      {onCheck !== undefined && (
        <input type="checkbox" checked={!!checked} onChange={onCheck}
          style={{ flexShrink: 0, marginRight: 4, cursor: 'pointer' }} />
      )}
      <div className="li-main">
        <div className="li-title">{p.cliente}</div>
        <div className="li-sub">#{fmtNPedido(p.numero_pedido)} · {p.endereco}{p.cidade ? `, ${p.cidade}` : ''}</div>
        {d && <div style={{ fontSize: 11, color: d.color, marginTop: 2 }}>📅 {d.text}</div>}
        {p.local_separacao && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>🏪 {p.local_separacao}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <Badge status={p.status} />
        {p.status_fluxo === 'devolvido' && <Badge status="devolvido" style={{ fontSize: 10 }}>Devolvido</Badge>}
        {p.status_fluxo === 'devolvido_parcial' && <Badge status="devolvido_parcial" style={{ fontSize: 10 }}>Devolvido Parcial</Badge>}
        {p.prioridade && p.prioridade !== 'Normal' && <Badge status={p.prioridade} style={{ fontSize: 10 }} />}
      </div>
      <Ic n="chev" s={13} style={{ color: 'var(--t3)', flexShrink: 0 }} />
    </div>
  )
})

// ── PDF simples ───────────────────────────────────────────
function sanitizeHTML(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function gerarPDFSimples(pedido, produtos) {
  const w = window.open('', '_blank')
  if (!w) { alert('Permita popups para gerar o PDF.'); return }
  const rows = produtos.map(p =>
    `<tr><td>${sanitizeHTML(p.nome_produto)}</td><td>${sanitizeHTML(p.quantidade)}</td><td>${sanitizeHTML(p.status_produto || 'Pendente')}</td></tr>`
  ).join('')
  w.document.write(`
    <html><head><title>Pedido #${sanitizeHTML(pedido.numero_pedido)}</title>
    <style>
      body{font-family:sans-serif;padding:24px;color:#111}
      h1{font-size:20px;margin-bottom:4px}
      .sub{color:#666;font-size:13px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{border:1px solid #ddd;padding:8px 10px;text-align:left;font-size:13px}
      th{background:#f5f5f5;font-weight:600}
    </style>
    </head><body>
    <h1>Pedido #${sanitizeHTML(pedido.numero_pedido)}</h1>
    <div class="sub">Status: ${sanitizeHTML(pedido.status)}</div>
    <p><b>Cliente:</b> ${sanitizeHTML(pedido.cliente)}</p>
    <p><b>Endereço:</b> ${sanitizeHTML(pedido.endereco)}${pedido.cidade ? ', ' + sanitizeHTML(pedido.cidade) : ''}</p>
    <p><b>Entrega:</b> ${pedido.data_entrega ? new Date(pedido.data_entrega + 'T12:00').toLocaleDateString('pt-BR') : '—'}</p>
    ${pedido.entregador_nome ? `<p><b>Entregador:</b> ${sanitizeHTML(pedido.entregador_nome)}</p>` : ''}
    ${pedido.observacoes ? `<p><b>Obs:</b> ${sanitizeHTML(pedido.observacoes)}</p>` : ''}
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
  const [showAprovarFin, setShowAprovarFin] = useState(false)
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
    () => pedido?.cliente ? pedidosService.list({ cliente: pedido.cliente, limit: 11 }) : Promise.resolve([]),
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

  const handleAprovarFinanceiro = async (telefones = []) => {
    const link = `${window.location.origin}/#/confirmar-compra/${pedidoId}`
    try {
      await runAction(() => pedidosService.aprovarFinanceiro(pedidoId, perfil, { loja: pedido.local_separacao, numeroPedido: pedido.numero_pedido, telefonesFabrica: telefones, linkConfirmacao: link }))
      setShowAprovarFin(false)
      reload(); reloadTimeline()
      if (telefones.length > 0) toast.success('Aprovado! Link de confirmação enviado para a fábrica.')
      else toast.info('Aprovado financeiramente. Link da fábrica não enviado — nenhum telefone informado.')
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
          {isGestor && (pedido?.status === 'Entregue' || pedido?.status_fluxo === 'entregue') && <Btn variant="secondary" size="sm" onClick={() => setShowDevolucao(true)}>↩ Solicitar Devolução</Btn>}
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
              const statusFluxo = devForm.tipo === 'parcial' ? 'devolvido_parcial' : 'devolvido'
              const statusLabel = devForm.tipo === 'parcial' ? 'Devolvido Parcial' : 'Devolvido'
              await devolucoesService.create({ pedido_id: pedido.id, cliente_nome: pedido.cliente, loja: pedido.local_separacao, registrado_por: perfil?.full_name, ...devForm })
              await pedidosService.update(pedido.id, { status: statusLabel, status_fluxo: statusFluxo })
              await pedidosService.addHistorico(pedido.id, statusLabel, `Devolução ${devForm.tipo} registrada. Motivo: ${devForm.motivo}`, perfil)
              reload(); reloadHist(); setShowDevolucao(false)
            })
            toast.success('Devolução registrada')
          } catch (e) { toast.error(e.message) }
        }} />
      )}

      <Badge status={pedido.status} style={{ marginBottom: 8 }} />
      <h1 style={{ fontSize: 20, marginBottom: 2 }}>{pedido.cliente}</h1>
      <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 4 }}>Pedido #{fmtNPedido(pedido.numero_pedido)}</div>
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
            <Btn size="sm" onClick={() => { setCorrigirMode(true); setShowEdit(true) }}><Edit2 size={13} strokeWidth={1.8} /> Corrigir e Reenviar</Btn>
          )}
        </div>
      )}

      {isGerente && pedido.status_fluxo === 'aguardando_gerente' && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <Btn style={{ flex: 1, justifyContent: 'center', background: 'var(--green)', color: '#fff', borderColor: 'var(--green)' }} loading={actionLoading} onClick={handleAprovarGerente}><CheckSquare size={14} strokeWidth={1.8} /> Aprovar</Btn>
          <Btn variant="secondary" style={{ flex: 1, justifyContent: 'center', color: 'var(--red)' }} onClick={() => { setTipoRejeicao('gerente'); setShowRejeitar(true) }}>Rejeitar</Btn>
        </div>
      )}

      {isFinanceiro && pedido.status_fluxo === 'aguardando_financeiro' && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <Btn style={{ flex: 1, justifyContent: 'center', background: 'var(--green)', color: '#fff', borderColor: 'var(--green)' }} loading={actionLoading} onClick={() => setShowAprovarFin(true)}><CheckSquare size={14} strokeWidth={1.8} /> Aprovar Financeiro</Btn>
          <Btn variant="secondary" style={{ flex: 1, justifyContent: 'center', color: 'var(--red)' }} onClick={() => { setTipoRejeicao('financeiro'); setShowRejeitar(true) }}>Rejeitar</Btn>
        </div>
      )}

      {isLogistica && pedido.status_fluxo === 'aprovado_entrega' && !pedido.data_entrega_agendada && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Agendar Entrega</div>
          <input type="date" className="fi" value={dataAgendamento} min={todayStr} onChange={e => setDataAgendamento(e.target.value)} />
          <Btn style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} loading={actionLoading} onClick={handleAgendarEntrega}><Calendar size={14} strokeWidth={1.8} /> Confirmar Agendamento</Btn>
        </div>
      )}

      {isSeparador && pedido.status_fluxo === 'aprovado_entrega' && pedido.data_entrega_agendada === todayStr && (
        <Btn style={{ width: '100%', justifyContent: 'center', marginBottom: 16, background: 'var(--amber)', color: '#fff', borderColor: 'var(--amber)' }} loading={actionLoading} onClick={handleIniciarSeparacao}><ClipboardList size={14} strokeWidth={1.8} /> Iniciar Separação</Btn>
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
          <button className="btn btn-s" style={{ flex: 1, justifyContent: 'center', color: 'var(--amber)', display:'flex', alignItems:'center', gap:5 }} onClick={() => setShowRemarcar(true)}><Calendar size={13} strokeWidth={1.8} /> Remarcar</button>
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
                              <img src={url} alt="anexo" loading="lazy" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, cursor: 'pointer' }} />
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
          <Btn variant="secondary" size="sm" onClick={() => followUpFileRef.current?.click()}><Paperclip size={13} strokeWidth={1.8} /> Anexar</Btn>
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

      {showAprovarFin && (
        <AprovarFinanceiroModal
          onClose={() => setShowAprovarFin(false)}
          onConfirm={handleAprovarFinanceiro}
          loading={actionLoading}
        />
      )}
    </div>
  )
}

// ── Modal de aprovação financeira com telefones da fábrica ──
function AprovarFinanceiroModal({ onClose, onConfirm, loading }) {
  const [telefones, setTelefones] = useState('')

  const handleConfirm = () => {
    const lista = telefones.split(/[,\n]/).map(t => t.trim()).filter(Boolean)
    onConfirm(lista)
  }

  return (
    <Modal title="Aprovar — Financeiro" onClose={onClose}>
      <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 14 }}>
        Informe os telefones da fábrica para envio do link de confirmação via WhatsApp.
        Separe múltiplos números por vírgula ou em linhas separadas.
        Se não informar nenhum número, a aprovação seguirá sem envio.
      </div>
      <div className="fg">
        <label className="fl">Telefones da fábrica (opcional)</label>
        <textarea
          className="fi"
          rows={3}
          placeholder={"Ex: 31 99999-0001\n31 99999-0002"}
          value={telefones}
          onChange={e => setTelefones(e.target.value)}
          style={{ resize: 'vertical' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <Btn
          style={{ flex: 1, justifyContent: 'center', background: 'var(--green)', color: '#fff', borderColor: 'var(--green)' }}
          loading={loading}
          onClick={handleConfirm}
        >
          <CheckSquare size={14} strokeWidth={1.8} /> Aprovar
        </Btn>
        <Btn variant="secondary" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancelar</Btn>
      </div>
    </Modal>
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
            <div style={{ fontSize: 13, fontWeight: 500 }}>#{fmtNPedido(p.numero_pedido)}</div>
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
          <input className="fi" value={form.numero_pedido ? fmtNPedido(form.numero_pedido) : ''} disabled placeholder="Gerado automaticamente" style={{ opacity: 0.6 }} />
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
            <FileText size={26} color="var(--t3)" strokeWidth={1.5} style={{ marginBottom: 8 }} />
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Toque para selecionar fichas PDF</div>
            <div style={{ fontSize: 12, color: 'var(--t2)' }}>Múltiplos arquivos PDF</div>
          </label>
          {files.length > 0 && (
            <div style={{ marginTop: 14 }}>
              {files.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--bg2)', borderRadius: 6, marginBottom: 5 }}>
                  <FileText size={14} color="var(--t3)" strokeWidth={1.6} />
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
// ============================================================
// FINANCEIRO
// ============================================================
function FinanceiroDRE() {
  const [mes, setMes] = useState(new Date().toISOString().slice(0,7))
  const { lojaFiltro: lojaGlobal, lojas } = useLojaFiltro()
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
          {(lojas ?? []).map(l => <option key={l.id || l.nome} value={l.nome}>{l.nome}</option>)}
        </select>
        <button className="btn btn-s btn-sm" onClick={exportarPDF} style={{display:'flex',alignItems:'center',gap:5}}><FileText size={13} strokeWidth={1.8} /> Exportar PDF</button>
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

function FinanceiroConciliacao() {
  const { perfil } = useAuth()
  const lojaEf = useEffectiveLoja()
  const fmtMoeda = (v) => (parseFloat(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
  const fmtData  = (d) => d ? new Date(d+'T12:00').toLocaleDateString('pt-BR') : '-'

  const [extratos, setExtratos] = useState([])
  const [loadingEx, setLoadingEx] = useState(true)
  const [selected, setSelected] = useState(null)
  const [transacoes, setTransacoes] = useState([])
  const [loadingTr, setLoadingTr] = useState(false)
  const [showNovoEx, setShowNovoEx] = useState(false)
  const [showNovaTr, setShowNovaTr] = useState(false)
  const [savingEx, setSavingEx] = useState(false)
  const [savingTr, setSavingTr] = useState(false)
  const [formEx, setFormEx] = useState({ banco:'', agencia:'', conta:'', data_inicio:'', data_fim:'', saldo_inicial:'', saldo_final:'' })
  const [formTr, setFormTr] = useState({ data:'', descricao:'', valor:'', tipo:'credito' })

  const loadExtratos = async () => {
    setLoadingEx(true)
    try { setExtratos(await conciliacaoService.listExtratos(lojaEf)) } catch { toast.error('Erro ao carregar extratos') }
    setLoadingEx(false)
  }
  const loadTransacoes = async (id) => {
    setLoadingTr(true)
    try { setTransacoes(await conciliacaoService.listTransacoes(id)) } catch { toast.error('Erro ao carregar transações') }
    setLoadingTr(false)
  }

  useEffect(() => { loadExtratos() }, [lojaEf]) // eslint-disable-line react-hooks/exhaustive-deps

  const criarExtrato = async () => {
    if (!formEx.banco || !formEx.data_inicio || !formEx.data_fim) return toast.error('Preencha banco e período')
    setSavingEx(true)
    try {
      const d = await conciliacaoService.createExtrato({ ...formEx, loja_id: lojaEf||null, saldo_inicial: parseFloat(formEx.saldo_inicial)||0, saldo_final: parseFloat(formEx.saldo_final)||0, importado_por: perfil?.id })
      setExtratos(p => [d, ...p])
      setShowNovoEx(false)
      setFormEx({ banco:'', agencia:'', conta:'', data_inicio:'', data_fim:'', saldo_inicial:'', saldo_final:'' })
      toast.success('Extrato criado!')
    } catch { toast.error('Erro ao criar extrato') }
    setSavingEx(false)
  }

  const excluirExtrato = async (id) => {
    try {
      await conciliacaoService.deleteExtrato(id)
      setExtratos(p => p.filter(e => e.id !== id))
      if (selected?.id === id) { setSelected(null); setTransacoes([]) }
      toast.success('Extrato removido')
    } catch { toast.error('Erro ao remover') }
  }

  const selecionarExtrato = (ex) => { setSelected(ex); loadTransacoes(ex.id) }

  const adicionarTransacao = async () => {
    if (!formTr.data || !formTr.descricao || !formTr.valor) return toast.error('Preencha todos os campos')
    setSavingTr(true)
    try {
      const d = await conciliacaoService.addTransacao({ ...formTr, extrato_id: selected.id, valor: parseFloat(formTr.valor) })
      setTransacoes(p => [...p, d])
      setShowNovaTr(false)
      setFormTr({ data:'', descricao:'', valor:'', tipo:'credito' })
      toast.success('Transação adicionada!')
    } catch { toast.error('Erro ao adicionar') }
    setSavingTr(false)
  }

  const toggleConciliado = async (tr) => {
    try {
      const upd = await conciliacaoService.conciliar(tr.id, !tr.conciliado)
      setTransacoes(p => p.map(t => t.id === tr.id ? upd : t))
      toast.success(upd.conciliado ? 'Conciliado!' : 'Desmarcado')
    } catch { toast.error('Erro ao atualizar') }
  }

  const excluirTransacao = async (id) => {
    try {
      await conciliacaoService.deleteTransacao(id)
      setTransacoes(p => p.filter(t => t.id !== id))
      toast.success('Transação removida')
    } catch { toast.error('Erro ao remover') }
  }

  const exportarPDF = () => {
    if (!selected) return
    const cred = transacoes.filter(t=>t.tipo==='credito').reduce((s,t)=>s+parseFloat(t.valor||0),0)
    const deb  = transacoes.filter(t=>t.tipo==='debito').reduce((s,t)=>s+parseFloat(t.valor||0),0)
    const saldoCalc = parseFloat(selected.saldo_inicial||0) + cred - deb
    const saldoEx   = parseFloat(selected.saldo_final||0)
    const dif = saldoEx - saldoCalc
    const pend = transacoes.filter(t=>!t.conciliado)
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Conciliação</title>
    <style>body{font-family:Arial,sans-serif;padding:30px;font-size:12px}h1{font-size:17px}h2{font-size:13px;margin:14px 0 6px;border-bottom:1px solid #ccc;padding-bottom:3px}table{width:100%;border-collapse:collapse;margin-bottom:12px}th,td{border:1px solid #ddd;padding:5px 8px;font-size:11px;text-align:left}th{background:#f0f0f0;font-weight:600}.cr{color:#16a34a}.db{color:#dc2626}.dif{font-weight:700;color:${dif!==0?'#dc2626':'#16a34a'}}.pend{background:#fef9c3}.foot{margin-top:36px;border-top:1px solid #ccc;padding-top:12px}</style></head><body>
    <h1>Relatório de Conciliação Bancária</h1>
    <p><b>Banco:</b> ${selected.banco}${selected.agencia?` | Agência: ${selected.agencia}`:''}${selected.conta?` | Conta: ${selected.conta}`:''}</p>
    <p><b>Período:</b> ${fmtData(selected.data_inicio)} a ${fmtData(selected.data_fim)}</p>
    <p><b>Emitido em:</b> ${new Date().toLocaleString('pt-BR')}</p>
    <h2>Resumo</h2>
    <table><tr><th>Item</th><th>Valor</th></tr>
    <tr><td>Saldo Inicial (Extrato)</td><td>${fmtMoeda(selected.saldo_inicial)}</td></tr>
    <tr><td>Total Créditos</td><td class="cr">${fmtMoeda(cred)}</td></tr>
    <tr><td>Total Débitos</td><td class="db">${fmtMoeda(deb)}</td></tr>
    <tr><td>Saldo Final (Extrato)</td><td>${fmtMoeda(saldoEx)}</td></tr>
    <tr><td>Saldo Calculado (Sistema)</td><td>${fmtMoeda(saldoCalc)}</td></tr>
    <tr><td><b>Diferença</b></td><td class="dif">${fmtMoeda(dif)}</td></tr></table>
    <h2>Transações (${transacoes.length})</h2>
    <table><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Conciliado</th></tr>
    ${transacoes.map(t=>`<tr class="${!t.conciliado?'pend':''}"><td>${fmtData(t.data)}</td><td>${t.descricao}</td><td class="${t.tipo==='credito'?'cr':'db'}">${t.tipo==='credito'?'Crédito':'Débito'}</td><td class="${t.tipo==='credito'?'cr':'db'}">${fmtMoeda(t.valor)}</td><td>${t.conciliado?'✓ Sim':'⚠ Não'}</td></tr>`).join('')}
    </table>
    ${pend.length?`<h2>Pendências (${pend.length} não conciliadas)</h2><table><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Valor</th></tr>${pend.map(t=>`<tr class="pend"><td>${fmtData(t.data)}</td><td>${t.descricao}</td><td>${t.tipo==='credito'?'Crédito':'Débito'}</td><td>${fmtMoeda(t.valor)}</td></tr>`).join('')}</table>`:''}
    <div class="foot"><p><b>Responsável:</b> ___________________________________</p><p><b>Data/Assinatura:</b> ___________________________________</p></div>
    <script>window.onload=()=>{window.print();window.close()}<\/script></body></html>`
    const win = window.open('','_blank','width=820,height=640')
    if (win) win.document.write(html)
  }

  // Derived values for selected extrato
  const cred = transacoes.filter(t=>t.tipo==='credito').reduce((s,t)=>s+parseFloat(t.valor||0),0)
  const deb  = transacoes.filter(t=>t.tipo==='debito').reduce((s,t)=>s+parseFloat(t.valor||0),0)
  const saldoCalc = selected ? parseFloat(selected.saldo_inicial||0) + cred - deb : 0
  const saldoEx   = selected ? parseFloat(selected.saldo_final||0) : 0
  const dif = saldoEx - saldoCalc
  const pendentes = transacoes.filter(t=>!t.conciliado)

  if (selected) return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <button className="btn btn-g btn-sm" onClick={() => { setSelected(null); setTransacoes([]) }}>← Voltar</button>
        <span style={{ fontWeight:600, fontSize:15 }}>{selected.banco} — {fmtData(selected.data_inicio)} a {fmtData(selected.data_fim)}</span>
        <button className="btn btn-g btn-sm" style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5 }} onClick={exportarPDF}><FileText size={13} strokeWidth={1.8} /> Exportar PDF</button>
      </div>

      {/* Resumo */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ fontWeight:600, marginBottom:12 }}>Resumo da Conciliação</div>
        <div className="stats">
          <div className="stat"><div className="stat-n" style={{ color:'var(--t1)' }}>{fmtMoeda(selected.saldo_inicial)}</div><div className="stat-l">Saldo Inicial</div></div>
          <div className="stat"><div className="stat-n" style={{ color:'var(--green)' }}>{fmtMoeda(cred)}</div><div className="stat-l">Total Créditos</div></div>
          <div className="stat"><div className="stat-n" style={{ color:'var(--red)' }}>{fmtMoeda(deb)}</div><div className="stat-l">Total Débitos</div></div>
          <div className="stat"><div className="stat-n" style={{ color:'var(--accent)' }}>{fmtMoeda(saldoEx)}</div><div className="stat-l">Saldo Final (Extrato)</div></div>
          <div className="stat"><div className="stat-n" style={{ color:'var(--accent)' }}>{fmtMoeda(saldoCalc)}</div><div className="stat-l">Saldo Calculado</div></div>
          <div className="stat">
            <div className="stat-n" style={{ color: dif === 0 ? 'var(--green)' : 'var(--red)' }}>{fmtMoeda(dif)}</div>
            <div className="stat-l">Diferença</div>
          </div>
        </div>
        {dif !== 0 && <div style={{ marginTop:8, padding:'8px 12px', background:'rgba(239,68,68,0.12)', borderRadius:8, fontSize:13, color:'var(--red)', fontWeight:500 }}>⚠ Há diferença de {fmtMoeda(Math.abs(dif))} entre o extrato bancário e o sistema.</div>}
        {pendentes.length > 0 && <div style={{ marginTop:8, padding:'8px 12px', background:'rgba(245,158,11,0.12)', borderRadius:8, fontSize:13, color:'var(--amber)', fontWeight:500 }}>⏳ {pendentes.length} transação(ões) pendente(s) de conciliação.</div>}
      </div>

      {/* Transações */}
      <div className="card">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ fontWeight:600 }}>Transações ({transacoes.length})</div>
          <button className="btn btn-p btn-sm" onClick={() => setShowNovaTr(true)}>+ Transação</button>
        </div>
        {loadingTr ? <Spinner /> : transacoes.length === 0 ? <Empty text="Nenhuma transação lançada" /> : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Data','Descrição','Tipo','Valor','Conciliado',''].map(h => (
                    <th key={h} style={{ padding:'6px 10px', textAlign:'left', fontSize:12, color:'var(--t3)', fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transacoes.map(tr => (
                  <tr key={tr.id} style={{ borderBottom:'1px solid var(--border)', background: !tr.conciliado ? 'rgba(245,158,11,0.07)' : undefined }}>
                    <td style={{ padding:'7px 10px', fontSize:13, whiteSpace:'nowrap' }}>{fmtData(tr.data)}</td>
                    <td style={{ padding:'7px 10px', fontSize:13 }}>{tr.descricao}</td>
                    <td style={{ padding:'7px 10px', fontSize:12 }}>
                      <span style={{ padding:'2px 8px', borderRadius:4, background: tr.tipo==='credito' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: tr.tipo==='credito' ? 'var(--green)' : 'var(--red)', fontWeight:600, fontSize:11 }}>
                        {tr.tipo==='credito' ? 'Crédito' : 'Débito'}
                      </span>
                    </td>
                    <td style={{ padding:'7px 10px', fontSize:13, fontWeight:600, color: tr.tipo==='credito' ? 'var(--green)' : 'var(--red)', whiteSpace:'nowrap' }}>{fmtMoeda(tr.valor)}</td>
                    <td style={{ padding:'7px 10px' }}>
                      <button onClick={() => toggleConciliado(tr)} style={{ padding:'3px 10px', borderRadius:6, border:'none', cursor:'pointer', fontSize:11, fontWeight:600, background: tr.conciliado ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', color: tr.conciliado ? 'var(--green)' : 'var(--amber)' }}>
                        {tr.conciliado ? '✓ Conciliado' : '⚠ Pendente'}
                      </button>
                    </td>
                    <td style={{ padding:'7px 10px' }}>
                      <button onClick={() => excluirTransacao(tr.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--t3)', display:'flex', alignItems:'center' }}><Trash2 size={14} strokeWidth={1.8} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal nova transação */}
      {showNovaTr && (
        <Modal title="Adicionar Transação" onClose={() => setShowNovaTr(false)}>
          <div className="fg"><label className="fl">Data *</label><input className="fi" type="date" value={formTr.data} onChange={e => setFormTr(p=>({...p,data:e.target.value}))} /></div>
          <div className="fg"><label className="fl">Descrição *</label><input className="fi" value={formTr.descricao} onChange={e => setFormTr(p=>({...p,descricao:e.target.value}))} /></div>
          <div className="grid2">
            <div className="fg">
              <label className="fl">Tipo *</label>
              <select className="fi" value={formTr.tipo} onChange={e => setFormTr(p=>({...p,tipo:e.target.value}))}>
                <option value="credito">Crédito</option>
                <option value="debito">Débito</option>
              </select>
            </div>
            <div className="fg"><label className="fl">Valor (R$) *</label><input className="fi" type="number" step="0.01" min="0" value={formTr.valor} onChange={e => setFormTr(p=>({...p,valor:e.target.value}))} /></div>
          </div>
          <button className="btn btn-p" onClick={adicionarTransacao} disabled={savingTr}>{savingTr?'Salvando...':'Adicionar'}</button>
        </Modal>
      )}
    </div>
  )

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ fontWeight:600 }}>Extratos Bancários</div>
        <button className="btn btn-p btn-sm" onClick={() => setShowNovoEx(true)}>+ Novo Extrato</button>
      </div>

      {loadingEx ? <Spinner /> : extratos.length === 0 ? (
        <div className="card"><Empty text="Nenhum extrato importado ainda" /></div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {extratos.map(ex => {
            const total = ex.saldo_final - ex.saldo_inicial
            return (
              <div key={ex.id} className="card" style={{ display:'flex', alignItems:'center', gap:12, cursor:'pointer' }} onClick={() => selecionarExtrato(ex)}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:14 }}>{ex.banco}</div>
                  <div style={{ fontSize:12, color:'var(--t3)', marginTop:2 }}>
                    {fmtData(ex.data_inicio)} a {fmtData(ex.data_fim)}
                    {ex.agencia && ` · Ag. ${ex.agencia}`}
                    {ex.conta && ` · Cc. ${ex.conta}`}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:13, fontWeight:600, color: total >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtMoeda(ex.saldo_final)}</div>
                  <div style={{ fontSize:11, color:'var(--t3)' }}>Saldo final</div>
                </div>
                <button onClick={e => { e.stopPropagation(); excluirExtrato(ex.id) }} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--t3)', padding:'4px', display:'flex', alignItems:'center' }}><Trash2 size={15} strokeWidth={1.8} /></button>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal novo extrato */}
      {showNovoEx && (
        <Modal title="Novo Extrato Bancário" onClose={() => setShowNovoEx(false)}>
          <div className="grid2">
            <div className="fg" style={{ gridColumn:'1/-1' }}><label className="fl">Banco *</label><input className="fi" value={formEx.banco} onChange={e => setFormEx(p=>({...p,banco:e.target.value}))} placeholder="Ex: Sicoob, Bradesco..." /></div>
            <div className="fg"><label className="fl">Agência</label><input className="fi" value={formEx.agencia} onChange={e => setFormEx(p=>({...p,agencia:e.target.value}))} /></div>
            <div className="fg"><label className="fl">Conta</label><input className="fi" value={formEx.conta} onChange={e => setFormEx(p=>({...p,conta:e.target.value}))} /></div>
            <div className="fg"><label className="fl">Data Início *</label><input className="fi" type="date" value={formEx.data_inicio} onChange={e => setFormEx(p=>({...p,data_inicio:e.target.value}))} /></div>
            <div className="fg"><label className="fl">Data Fim *</label><input className="fi" type="date" value={formEx.data_fim} onChange={e => setFormEx(p=>({...p,data_fim:e.target.value}))} /></div>
            <div className="fg"><label className="fl">Saldo Inicial (R$)</label><input className="fi" type="number" step="0.01" value={formEx.saldo_inicial} onChange={e => setFormEx(p=>({...p,saldo_inicial:e.target.value}))} /></div>
            <div className="fg"><label className="fl">Saldo Final (R$)</label><input className="fi" type="number" step="0.01" value={formEx.saldo_final} onChange={e => setFormEx(p=>({...p,saldo_final:e.target.value}))} /></div>
          </div>
          <button className="btn btn-p" onClick={criarExtrato} disabled={savingEx}>{savingEx?'Salvando...':'Criar Extrato'}</button>
        </Modal>
      )}
    </div>
  )
}

function Financeiro() {
  if (!podeAcessarModulosOperacionais()) return <SuperAdminSemEmpresa />
  return <FinanceiroInner />
}
function FinanceiroInner() {
  const { effectiveRole } = useAuth()
  const isAssistenteAdmin = effectiveRole === 'assistente_admin'
  const podeVerConciliacao = ['admin','diretor','assistente_admin'].includes(effectiveRole)
  const [tab, setTab] = useState('receber')
  const ALL_TABS = [
    { id:'resumo',       label:'Resumo',        hide: isAssistenteAdmin },
    { id:'receber',      label:'A Receber' },
    { id:'pagar',        label:'A Pagar' },
    { id:'dre',          label:'DRE',           hide: isAssistenteAdmin },
    { id:'nps',          label:'NPS',           hide: isAssistenteAdmin },
    { id:'relatorios',   label:'Rentabilidade', hide: isAssistenteAdmin },
    { id:'conciliacao',  label:'Conciliação',   hide: !podeVerConciliacao },
  ]
  const TABS = ALL_TABS.filter(t => !t.hide)
  return (
    <div className="page">
      <div className="ph"><h1>Financeiro</h1></div>
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {TABS.map(t => <button key={t.id} className={`btn btn-${tab===t.id?'p':'s'} btn-sm`} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>
      {tab === 'resumo'      && <FinanceiroResumo />}
      {tab === 'receber'     && <FinanceiroLista tipo="receber" />}
      {tab === 'pagar'       && <FinanceiroLista tipo="pagar" />}
      {tab === 'dre'         && <FinanceiroDRE />}
      {tab === 'nps'         && <Suspense fallback={<Spinner />}><Nps /></Suspense>}
      {tab === 'relatorios'  && <FinanceiroRelatorios />}
      {tab === 'conciliacao' && <FinanceiroConciliacao />}
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
  const { lojas } = useLojaFiltro()
  const lojaEf = useEffectiveLoja()
  const queryFn = useCallback(
    ({ search, from, to }) => tipo === 'receber'
      ? financeiroService.listPagedReceber({ search, from, to, loja: lojaEf })
      : financeiroService.listPagedPagar({ search, from, to, loja: lojaEf }),
    [tipo, lojaEf]
  )
  const { data: lista, loading, total, page, setPage, totalPages, search: busca, setSearch: setBusca, reload } = useServerPagination(queryFn)
  const [modal, setModal] = useState(null)
  const CENTROS_CUSTO = ['Grupo Versa','Administrativo','Logística',...(lojas ?? []).map(l => l.nome)]
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
      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        <input className="fi" style={{ flex:1 }} placeholder="🔍 Buscar por descrição ou fornecedor..." value={busca} onChange={e => setBusca(e.target.value)} />
        <button className="btn btn-p btn-sm" onClick={() => { setForm(empty); setModal({}) }}>+ {tipo === 'receber' ? 'A Receber' : 'A Pagar'}</button>
      </div>
      {loading ? <Spinner /> : lista.length === 0 ? <Empty text="Nenhum lançamento" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {lista.map(item => (
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
              <button className="btn btn-s btn-sm" onClick={() => { setForm({ ...empty, ...item }); setModal({ item }) }}><Edit2 size={13} strokeWidth={1.8} /></button>
            </div>
          ))}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} total={total} setPage={setPage} />
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
    dashboard: <Dashboard setPage={navigateTo} />,
    pedidos: <Pedidos />,
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
    config: <Configuracoes />,
    cadastros: <Suspense fallback={<Spinner />}><Cadastros /></Suspense>,
    vendas: <Suspense fallback={<Spinner />}><VendasPdv /></Suspense>,
    compras: <Suspense fallback={<Spinner />}><Compras /></Suspense>,
    estoque: <Suspense fallback={<Spinner />}><Estoque /></Suspense>,
    financeiro: <Financeiro />,
    financeiro_loja: <Financeiro />,
    dp: <Suspense fallback={<Spinner />}><Dp /></Suspense>,
    os: <Suspense fallback={<Spinner />}><OrdensServico /></Suspense>,
    fila: <FilaLiberacao />,
    crm: <Suspense fallback={<Spinner />}><Crm /></Suspense>,
    catalogo: <Suspense fallback={<Spinner />}><CatalogoPub /></Suspense>,
    nf: <NotaFiscal />,
    nps: <Suspense fallback={<Spinner />}><Nps /></Suspense>,
    relatorios: <Financeiro />,
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
