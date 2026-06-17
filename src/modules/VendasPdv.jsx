import { useState, useCallback } from 'react'

import { ShoppingCart, FileText } from 'lucide-react'

import { useData, useAction, useServerPagination } from '../hooks/index'
import { useAuth } from '../context/AuthContext'
import { useEffectiveLoja } from '../hooks/useEffectiveLoja'
import { LojaSelect } from '../components/LojaSelect'
import { Spinner, Empty, Modal, Alert } from '../components/ui/index'
import { supabase } from '../lib/supabase'
import { toast } from '../lib/toast'
import {
  vendasService, orcamentosService, clientesService,
  catalogoService, configSistemaService,
  acabamentosService, tecidosService,
} from '../services/index'

const fmtR = (v) => (parseFloat(v)||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })

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

function VendasLista({ onNovaVenda }) {
  const lojaEf = useEffectiveLoja()
  const queryFn = useCallback(
    ({ search, from, to }) => vendasService.listPaged({ search, from, to, loja: lojaEf }),
    [lojaEf]
  )
  const { data: lista, loading, total, page, setPage, totalPages, search: busca, setSearch: setBusca, reload } = useServerPagination(queryFn)
  const [detalhe, setDetalhe] = useState(null)
  const [filtroStatus, setFiltroStatus] = useState('')

  const STATUS_COR = { pendente:'var(--amber)', aprovado:'var(--green)', cancelado:'var(--red)', entregue:'var(--blue)', aguardando_aprovacao:'#f97316' }
  const fmtData = (s) => s ? new Date(s).toLocaleDateString('pt-BR') : '—'

  const filtrado = filtroStatus ? (lista || []).filter(v => v.status === filtroStatus) : (lista || [])

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
      <Pagination page={page} totalPages={totalPages} total={total} setPage={setPage} />
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

function NovaVenda({ onClose }) {
  const { perfil, podeVerTodasLojas, empresaId } = useAuth()
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
              await supabase.from('financeiro_lancamentos').insert({ ...l, ...(empresaId ? { empresa_id: empresaId } : {}) })
            }
          } else {
            await supabase.from('financeiro_lancamentos').insert({ descricao: `Venda #${nova.id?.slice(0,8)} - ${form.cliente_nome}`, valor: total, vencimento: hoje, status: isAVista ? 'pago' : 'pendente', data_pagamento: isAVista ? hoje : null, tipo: 'receita', loja: form.loja, venda_id: nova.id, ...(empresaId ? { empresa_id: empresaId } : {}) })
          }
        } catch (_) { /* financeiro_lancamentos pode não ter todas colunas ainda */ }

        try {
          for (const it of itens) {
            await supabase.from('movimentos_estoque').insert({ tipo: 'saida', produto_nome: it.nome, catalogo_id: it.catalogo_id, quantidade: it.quantidade, loja: form.loja, origem: 'venda', referencia_id: nova.id, registrado_por: perfil?.full_name, ...(empresaId ? { empresa_id: empresaId } : {}) })
            if (it.catalogo_id) {
              let qCat = supabase.from('catalogo_produtos').select('estoque_atual').eq('id', it.catalogo_id)
              if (empresaId) qCat = qCat.eq('empresa_id', empresaId)
              qCat.single().then(({ data }) => {
                if (data) {
                  let qUpd = supabase.from('catalogo_produtos').update({ estoque_atual: Math.max(0, (data.estoque_atual || 0) - it.quantidade) }).eq('id', it.catalogo_id)
                  if (empresaId) qUpd = qUpd.eq('empresa_id', empresaId)
                  qUpd
                }
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

export default function Vendas() {
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
        <button className={`btn btn-${tab==='vendas'?'p':'s'} btn-sm`} onClick={()=>setTab('vendas')} style={{display:'flex',alignItems:'center',gap:5}}><ShoppingCart size={13} strokeWidth={1.8} /> Vendas</button>
        <button className={`btn btn-${tab==='orcamentos'?'p':'s'} btn-sm`} onClick={()=>setTab('orcamentos')} style={{display:'flex',alignItems:'center',gap:5}}><FileText size={13} strokeWidth={1.8} /> Orçamentos</button>
      </div>
      {tab==='vendas' && <VendasLista onNovaVenda={()=>setNovaVenda(true)} />}
      {tab==='orcamentos' && <Orcamentos />}
    </div>
  )
}
