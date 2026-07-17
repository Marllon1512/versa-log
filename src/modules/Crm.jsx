import { useState, useEffect, useCallback } from 'react'

import { Target, Calendar } from 'lucide-react'

import { useData, useAction, useServerPagination } from '../hooks/index'
import { useEffectiveLoja } from '../hooks/useEffectiveLoja'
import { LojaSelect } from '../components/LojaSelect'
import { Badge, Modal, Spinner, Empty } from '../components/ui/index'
import { toast } from '../lib/toast'
import { crmService } from '../services/index'

const fmtR = (v) => (parseFloat(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})

const CRM_COLUNAS = [
  { id:'lead',       label:'Leads',       cor:'#3b82f6' },
  { id:'contato',    label:'Contato',     cor:'#8b5cf6' },
  { id:'visita',     label:'Visita',      cor:'#f59e0b' },
  { id:'proposta',   label:'Proposta',    cor:'#3b82f6' },
  { id:'negociacao', label:'Negociação',  cor:'#10b981' },
  { id:'fechado',    label:'Fechado',     cor:'#22c55e' },
  { id:'perdido',    label:'Perdido',     cor:'#ef4444' },
]

function CRMVisitas() {
  const { data: leads } = useData(() => crmService.list(), [])
  const visitas = (leads||[]).filter(l => l.estagio === 'visita' || l.proxima_acao)
  const hoje = new Date().toISOString().split('T')[0]
  return (
    <div>
      {visitas.length === 0 ? <Empty text="Nenhuma visita agendada" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {visitas.sort((a,b) => (a.proxima_acao||'')>(b.proxima_acao||'')?1:-1).map(v => (
            <div key={v.id} className="card" style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
              <div style={{ width:4, borderRadius:4, background: v.proxima_acao < hoje ? 'var(--red)' : 'var(--accent)', alignSelf:'stretch', flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600 }}>{v.nome}</div>
                <div style={{ fontSize:12, color:'var(--t2)' }}>{v.loja} · {v.responsavel}</div>
                {v.proxima_acao && <div style={{ fontSize:12, color: v.proxima_acao < hoje ? 'var(--red)' : 'var(--green)', marginTop:2 }}>📅 {new Date(v.proxima_acao).toLocaleDateString('pt-BR')}</div>}
                {v.observacoes && <div style={{ fontSize:12, color:'var(--t2)', marginTop:2 }}>{v.observacoes}</div>}
              </div>
              <Badge variant={v.proxima_acao < hoje ? 'bg-red' : 'bg-green'} style={{ fontSize:10 }}>{v.proxima_acao < hoje ? 'Atrasada' : 'Agendada'}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CRMKanban({ openNew, onOpenNewConsumed }) {
  const lojaEf = useEffectiveLoja()
  const queryFn = useCallback(
    ({ search, from, to }) => crmService.listPaged({ search, from, to, loja: lojaEf }),
    [lojaEf]
  )
  const { data: leads, loading, search: busca, setSearch: setBusca, reload } = useServerPagination(queryFn, 200)
  const [modal, setModal] = useState(null)
  const empty = { nome:'', telefone:'', email:'', loja:'', responsavel:'', estagio:'lead', valor_estimado:0, proxima_acao:'', observacoes:'' }
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

  const leadsVisiveis = leads || []

  return (
    <div>
      <input className="fi" style={{ marginBottom:12, width:'100%' }} placeholder="🔍 Buscar lead por nome ou loja..." value={busca} onChange={e => setBusca(e.target.value)} />
      <div className="kanban-board" style={{ overflowX:'auto', paddingBottom:8, display:'flex', flexDirection:'row', gap:10, WebkitOverflowScrolling:'touch' }}>
          {CRM_COLUNAS.map(col => {
            const items = leadsVisiveis.filter(l => l.estagio === col.id)
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
                      {lead.proxima_acao && <div style={{ fontSize:10, color:'var(--accent)' }}>📅 {new Date(lead.proxima_acao).toLocaleDateString('pt-BR')}</div>}
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
            <div className="fg"><label className="fl">Próxima ação</label><input className="fi" type="date" value={form.proxima_acao||''} onChange={up('proxima_acao')} /></div>
            <div className="fg" style={{ gridColumn:'1/-1' }}><label className="fl">Observações</label><textarea className="fi" rows={2} value={form.observacoes||''} onChange={up('observacoes')} /></div>
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

export default function CRM() {
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
        <button className={`btn btn-${tab==='kanban'?'p':'s'} btn-sm`} onClick={()=>setTab('kanban')} style={{display:'flex',alignItems:'center',gap:5}}><Target size={13} strokeWidth={1.8} /> Kanban</button>
        <button className={`btn btn-${tab==='visitas'?'p':'s'} btn-sm`} onClick={()=>setTab('visitas')} style={{display:'flex',alignItems:'center',gap:5}}><Calendar size={13} strokeWidth={1.8} /> Agenda Visitas</button>
      </div>
      {tab === 'kanban' && <CRMKanban openNew={openNew} onOpenNewConsumed={() => setOpenNew(false)} />}
      {tab === 'visitas' && <CRMVisitas />}
    </div>
  )
}
