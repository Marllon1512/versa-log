import { useState, useCallback } from 'react'

import { ClipboardList, Tag, Camera } from 'lucide-react'

import { useData, useAction, useServerPagination } from '../hooks/index'
import { useAuth } from '../context/AuthContext'
import { useEffectiveLoja } from '../hooks/useEffectiveLoja'
import { LojaSelect } from '../components/LojaSelect'
import { LeitorCodigoBarras } from '../components/LeitorCodigoBarras'
import { EtiquetaModal } from '../components/EtiquetaModal'
import { Spinner, Empty, Modal, Alert, Badge } from '../components/ui/index'
import { supabase } from '../lib/supabase'
import { toast } from '../lib/toast'
import {
  consignacoesService, clientesService,
  estoqueService, fornecedoresService,
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

function ConsignacaoTab() {
  const { data: lista, loading, reload } = useData(() => consignacoesService.list(), [])
  const [modal, setModal] = useState(null)
  const { data: clientes } = useData(() => clientesService.list(), [])
  const empty = { cliente_nome:'', loja:'', data_saida:new Date().toISOString().split('T')[0], data_retorno_prevista:'', observacoes:'' }
  const [form, setForm] = useState(empty)
  const act = useAction()
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const hoje = new Date().toISOString().split('T')[0]

  const prazoAlert = (lista||[]).filter(c => c.status === 'em_aprovacao' && c.data_retorno_prevista && c.data_retorno_prevista <= new Date(Date.now() + 86400000).toISOString().split('T')[0])

  const salvar = async () => {
    if (!form.cliente_nome) return toast.error('Cliente obrigatório')
    try {
      await act.run(() => consignacoesService.create({ ...form, status: 'em_aprovacao' }))
      toast.success('Consignação registrada'); setModal(null); reload()
    } catch (e) { toast.error(e.message) }
  }

  const atualizarStatus = async (id, status) => {
    try { await act.run(() => consignacoesService.update(id, { status, data_retorno_real: status === 'devolvido' ? hoje : null })); reload(); toast.success('Atualizado') } catch (e) { toast.error(e.message) }
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
                  <div style={{ fontWeight:600 }}>{c.cliente_nome}</div>
                  <div style={{ fontSize:12, color:'var(--t2)' }}>{c.loja||'—'}</div>
                </div>
                <Badge variant="bg">{STATUS_LABEL[c.status]||c.status}</Badge>
              </div>
              <div style={{ fontSize:12, color:'var(--t2)' }}>Saída: {c.data_saida} · Prazo: {c.data_retorno_prevista||'—'}{c.data_retorno_prevista && c.data_retorno_prevista < hoje && c.status==='em_aprovacao' ? ' ⚠️' : ''}</div>
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
            <div className="fg" style={{ gridColumn:'1/-1' }}><label className="fl">Cliente *</label>
              <select className="fi" value={form.cliente_nome} onChange={e => setForm(p => ({ ...p, cliente_nome: e.target.value }))}>
                <option value="">Selecionar...</option>
                {(clientes||[]).map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">Loja</label><LojaSelect value={form.loja} onChange={v => setForm(p => ({ ...p, loja: v }))} /></div>
            <div className="fg"><label className="fl">Data saída</label><input className="fi" type="date" value={form.data_saida} onChange={up('data_saida')} /></div>
            <div className="fg"><label className="fl">Prazo retorno</label><input className="fi" type="date" value={form.data_retorno_prevista} onChange={up('data_retorno_prevista')} /></div>
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
      <ClipboardList size={48} color="var(--t3)" strokeWidth={1.2} style={{ marginBottom:12 }} />
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
  const [busca, setBusca] = useState('')
  const [etiqueta, setEtiqueta] = useState(null)
  if (loading) return <Spinner />
  const filtrado = (itens||[]).filter(i =>
    !busca ||
    (i.nome||i.nome_produto||'').toLowerCase().includes(busca.toLowerCase()) ||
    (i.referencia||'').toLowerCase().includes(busca.toLowerCase())
  )
  return (
    <div>
      <input className="fi" style={{ marginBottom:12 }} placeholder="🔍 Buscar produto..." value={busca} onChange={e => setBusca(e.target.value)} />
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {filtrado.length === 0 ? <Empty text="Nenhum produto encontrado" /> : filtrado.map(p => (
          <div key={p.id} className="card" style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:13 }}>{p.nome||p.nome_produto}</div>
              <div style={{ fontSize:11, color:'var(--t2)' }}>{p.referencia||p.codigo_barras||'—'} · {p.loja||'—'}</div>
            </div>
            <div style={{ fontWeight:700, color:'var(--accent)', fontSize:14 }}>{fmtR(p.preco_venda)}</div>
            <button className="btn btn-p btn-sm" onClick={() => setEtiqueta(p)} style={{display:'flex',alignItems:'center',gap:4}}><Tag size={13} strokeWidth={1.8} /> Etiqueta</button>
          </div>
        ))}
      </div>
      {etiqueta && <EtiquetaModal produto={etiqueta} onClose={() => setEtiqueta(null)} />}
    </div>
  )
}

function EstoqueDashboard() {
  const lojaEf = useEffectiveLoja()
  const queryFn = useCallback(
    ({ search, from, to }) => estoqueService.listPaged({ search, from, to, loja: lojaEf }),
    [lojaEf]
  )
  const { data: itens, loading, total, page, setPage, totalPages, search: busca, setSearch: setBusca } = useServerPagination(queryFn)

  if (loading) return <Spinner />
  const baixo = (itens||[]).filter(i => (i.estoque_atual||0) <= (i.estoque_minimo||0)).length
  return (
    <div>
      <div className="stats" style={{ marginBottom:16 }}>
        <div className="stat"><div className="stat-n">{total}</div><div className="stat-l">Itens</div></div>
        <div className="stat"><div className="stat-n" style={{ color:'var(--red)' }}>{baixo}</div><div className="stat-l">Estoque baixo</div></div>
      </div>
      {baixo > 0 && <Alert type="warning" style={{ marginBottom:12 }}>{baixo} item(ns) com estoque abaixo do mínimo</Alert>}
      <input className="fi" style={{ marginBottom:10, width:'100%' }} placeholder="🔍 Buscar produto ou código..." value={busca} onChange={e => setBusca(e.target.value)} />
      {itens.length === 0 ? <Empty text="Nenhum item no estoque" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {itens.map(i => (
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
      <Pagination page={page} totalPages={totalPages} total={total} setPage={setPage} />
    </div>
  )
}

function EstoqueNF() {
  const { empresaId } = useAuth()
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
      try {
        for (const it of itensSaved || []) {
          await supabase.from('movimentos_estoque').insert({ tipo: 'entrada', produto_nome: it.descricao, quantidade: it.quantidade, origem: 'nf_entrada', referencia_id: nf.id, fornecedor_nome: form.fornecedor_nome, ...(empresaId ? { empresa_id: empresaId } : {}) })
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
  const [scanner, setScanner] = useState(false)
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
          <div className="fg"><label className="fl">Descrição / Produto</label>
            <div style={{ display:'flex', gap:6 }}>
              <input className="fi" style={{ flex:1 }} value={form.descricao} onChange={up('descricao')} />
              <button type="button" className="btn btn-s btn-sm" onClick={() => setScanner(true)} title="Escanear código de barras"><Camera size={13} strokeWidth={1.8} /></button>
            </div>
          </div>
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
      {scanner && <LeitorCodigoBarras onScan={code => { setForm(p => ({ ...p, descricao: code })); setScanner(false) }} onClose={() => setScanner(false)} />}
    </div>
  )
}

export default function Estoque() {
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
