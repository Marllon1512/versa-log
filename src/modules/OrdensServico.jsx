import { useState, useCallback } from 'react'

import { useServerPagination, useAction } from '../hooks/index'
import { ordensServicoService } from '../services/index'
import { Spinner, Empty, Modal } from '../components/ui/index'
import { LojaSelect } from '../components/LojaSelect'
import { toast } from '../lib/toast'

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

export default function OrdensServico() {
  const [filtroStatus, setFiltroStatus] = useState('')
  const queryFn = useCallback(
    ({ search, from, to }) => ordensServicoService.listPaged({ search, from, to, status: filtroStatus }),
    [filtroStatus]
  )
  const { data: filtrado, loading, total, page, setPage, totalPages, search: busca, setSearch: setBusca, reload } = useServerPagination(queryFn)
  const [modal, setModal] = useState(null)
  const act = useAction()

  const STATUS_COR = { aberta:'var(--amber)', em_andamento:'var(--blue)', concluida:'var(--green)', cancelada:'var(--red)' }

  const empty = { cliente:'', descricao:'', tecnico:'', status:'aberta', loja:'', valor:'' }
  const [form, setForm] = useState(empty)
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const salvar = async () => {
    if (!form.cliente) return toast.error('Cliente obrigatório')
    try {
      const payload = { cliente: form.cliente, descricao: form.descricao, tecnico: form.tecnico, status: form.status, loja: form.loja, valor: parseFloat(form.valor)||0 }
      if (!modal.item) await act.run(() => ordensServicoService.create(payload))
      else await act.run(() => ordensServicoService.update(modal.item.id, payload))
      toast.success('OS salva'); setModal(null); reload()
    } catch (e) { toast.error(e.message) }
  }

  const atualizarStatus = async (id, status) => {
    try { await ordensServicoService.update(id, { status }); reload(); toast.success('Status atualizado') } catch (e) { toast.error(e.message) }
  }

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
                  <div style={{ fontWeight:600 }}>{os.cliente}</div>
                  <div style={{ fontSize:12, color:'var(--t2)' }}>{os.descricao} · {os.loja} · {os.tecnico || 'Sem técnico'}</div>
                  {os.valor > 0 && <div style={{ fontSize:12, color:'var(--accent)', fontWeight:600 }}>{fmtMoeda(os.valor)}</div>}
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                  <span style={{ fontSize:11, background:STATUS_COR[os.status]||'var(--t2)', color:'#fff', padding:'2px 8px', borderRadius:12 }}>{(os.status||'').replace('_',' ')}</span>
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
      <Pagination page={page} totalPages={totalPages} total={total} setPage={setPage} />
      {modal && (
        <Modal title={modal.item ? 'Editar O.S.' : 'Nova Ordem de Serviço'} onClose={() => setModal(null)}>
          <div className="grid2">
            <div className="fg"><label className="fl">Cliente *</label><input className="fi" value={form.cliente} onChange={up('cliente')} /></div>
            <div className="fg"><label className="fl">Técnico</label><input className="fi" value={form.tecnico} onChange={up('tecnico')} /></div>
            <div className="fg"><label className="fl">Loja</label><LojaSelect value={form.loja} onChange={v => setForm(p => ({ ...p, loja: v }))} /></div>
            <div className="fg"><label className="fl">Status</label>
              <select className="fi" value={form.status} onChange={up('status')}>
                {['aberta','em_andamento','concluida','cancelada'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">Valor (R$)</label><input className="fi" type="number" step="0.01" inputMode="decimal" value={form.valor} onChange={up('valor')} /></div>
          </div>
          <div className="fg"><label className="fl">Descrição</label><textarea className="fi" value={form.descricao} onChange={up('descricao')} rows={3} /></div>
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button className="btn btn-p" style={{ flex:1 }} onClick={salvar} disabled={act.loading}>{act.loading ? '...' : 'Salvar'}</button>
            <button className="btn btn-s" onClick={() => setModal(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
