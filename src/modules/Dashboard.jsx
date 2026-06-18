import { useState, useCallback } from 'react'

import {
  Truck, Clock, ShoppingCart, Target, Wrench, Calendar,
  ShoppingBag, CreditCard, ClipboardList, CheckSquare, Package,
} from 'lucide-react'

import { useData } from '../hooks/index'
import { useAuth } from '../context/AuthContext'
import { useEffectiveLoja } from '../hooks/useEffectiveLoja'
import { Btn, Badge, Ic, Alert, Spinner, Empty } from '../components/ui/index'
import { podeAcessarModulosOperacionais } from '../lib/empresaContext'
import { SuperAdminSemEmpresa } from '../components/SuperAdminSemEmpresa'
import { pedidosService } from '../services/pedidos'
import {
  assistenciasService, vendasService, financeiroService,
  comprasService, metasService,
} from '../services/index'

const fmtR = (v) => (parseFloat(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const fmtNPedido = (n) => n ? String(n).padStart(6, '0') : '—'

function DashboardInner({ setPage, DetalheComponent }) {
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
  if (selected) return <DetalheComponent pedidoId={selected} onBack={() => { setSelected(null); rPed() }} />

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

export default function Dashboard({ setPage, DetalheComponent }) {
  if (!podeAcessarModulosOperacionais()) return <SuperAdminSemEmpresa />
  return <DashboardInner setPage={setPage} DetalheComponent={DetalheComponent} />
}
