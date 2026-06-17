import { useState } from 'react'

import { ShoppingBag, BarChart2 } from 'lucide-react'

import { useData, useAction } from '../hooks/index'
import { useEffectiveLoja } from '../hooks/useEffectiveLoja'
import { comprasService, estoqueService, fornecedoresService } from '../services/index'
import { Spinner, Empty, Modal, Alert, Badge } from '../components/ui/index'
import { toast } from '../lib/toast'

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

export default function Compras() {
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
        <button className={`btn btn-${tab==='pedidos'?'p':'s'} btn-sm`} onClick={()=>setTab('pedidos')} style={{display:'flex',alignItems:'center',gap:5}}><ShoppingBag size={13} strokeWidth={1.8} /> Pedidos</button>
        <button className={`btn btn-${tab==='previsao'?'p':'s'} btn-sm`} onClick={()=>setTab('previsao')} style={{display:'flex',alignItems:'center',gap:5}}><BarChart2 size={13} strokeWidth={1.8} /> Previsão</button>
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
