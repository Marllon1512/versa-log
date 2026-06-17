import { useState, useEffect, useCallback } from 'react'

import { Camera, Tag, Store } from 'lucide-react'

import { useData, useServerPagination, useAction } from '../hooks/index'
import {
  clientesService, fornecedoresService, catalogoService, configSistemaService,
  lojasService, decoradoresService, acabamentosService, tecidosService, representantesService,
} from '../services/index'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { validarTipoImagem } from '../lib/validarTipoImagem'
import { Spinner, Empty, Modal, Badge } from '../components/ui/index'
import { EtiquetaModal } from '../components/EtiquetaModal'
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

function HistoricoClienteModal({ cliente, onClose }) {
  const { empresaId } = useAuth()
  const [contatos, setContatos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [novoForm, setNovoForm] = useState({ tipo:'WhatsApp', assunto:'', resultado:'', proximo_contato:'' })
  const [salvando, setSalvando] = useState(false)
  const TIPOS = ['WhatsApp','Telefone','Email','Visita','Outro']

  useEffect(() => {
    let q = supabase.from('contatos_historico').select('*').eq('cliente_id', cliente.id).order('created_at', { ascending: false })
    if (empresaId) q = q.eq('empresa_id', empresaId)
    q.then(({ data }) => { setContatos(data||[]); setCarregando(false) })
      .catch(() => setCarregando(false))
  }, [cliente.id, empresaId])

  const salvar = async () => {
    if (!novoForm.assunto) return
    setSalvando(true)
    try {
      const { data } = await supabase.from('contatos_historico').insert({ ...novoForm, cliente_id: cliente.id, cliente_nome: cliente.nome, ...(empresaId ? { empresa_id: empresaId } : {}) }).select().single()
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
  const queryFn = useCallback(({ search, from, to }) => clientesService.listPaged({ search, from, to }), [])
  const { data: paged, loading, total, page, setPage, totalPages, search: busca, setSearch: setBusca, reload } = useServerPagination(queryFn)
  const [modal, setModal] = useState(null)
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

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'center' }}>
        <input className="fi" style={{ flex:1 }} placeholder="Buscar cliente..." value={busca} onChange={e => setBusca(e.target.value)} />
        <button className="btn btn-p btn-sm" onClick={abrirNovo}>+ Novo</button>
      </div>
      {loading ? <Spinner /> : paged.length === 0 ? <Empty text="Nenhum cliente cadastrado" /> : (
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
        <Pagination page={page} totalPages={totalPages} total={total} setPage={setPage} />
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
  const queryFn = useCallback(({ search, from, to }) => fornecedoresService.listPaged({ search, from, to }), [])
  const { data: filtrado, loading, total, page, setPage, totalPages, search: busca, setSearch: setBusca, reload } = useServerPagination(queryFn)
  const { data: todosReps } = useData(() => representantesService.list(), [])
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

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        <input className="fi" style={{ flex:1 }} placeholder="🔍 Buscar por nome ou CNPJ..." value={busca} onChange={e => setBusca(e.target.value)} />
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
      <Pagination page={page} totalPages={totalPages} total={total} setPage={setPage} />
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
  const queryFn = useCallback(({ search, from, to }) => catalogoService.listPaged({ search, from, to }), [])
  const { data: lista, loading, total, page, setPage, totalPages, search: busca, setSearch: setBusca, reload } = useServerPagination(queryFn)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [modal, setModal] = useState(null)
  const [detalhe, setDetalhe] = useState(null)
  const [etiqueta, setEtiqueta] = useState(null)
  const empty = { nome:'', tipo:'produto', referencia:'', preco_custo:'', preco_venda:'', unidade:'un', estoque_atual:0, estoque_minimo:0, descricao:'', fotos:[] }
  const [form, setForm] = useState(empty)
  const [fotosNovas, setFotosNovas] = useState([])
  const [fotosExistentes, setFotosExistentes] = useState([])
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

  const onFotoChange = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    const validas = []
    for (const f of files) {
      try { await validarTipoImagem(f); validas.push(f) } catch (err) { toast.error(err.message); }
    }
    if (!validas.length) return
    const totalFotos = fotosExistentes.length + fotosNovas.length + validas.length
    if (totalFotos > 5) return toast.error('Máximo 5 fotos por produto')
    const novas = validas.map(f => ({ file: f, preview: URL.createObjectURL(f) }))
    setFotosNovas(p => [...p, ...novas])
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

  const filtrado = filtroTipo ? (lista || []).filter(c => c.tipo === filtroTipo) : (lista || [])

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
                ? <img src={p.fotos[0]} alt={p.nome} loading="lazy" style={{ width:48, height:48, borderRadius:8, objectFit:'cover', flexShrink:0 }} />
                : <div style={{ width:48, height:48, borderRadius:8, background:'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Camera size={20} color="var(--t3)" strokeWidth={1.5} /></div>
              }
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <span style={{ fontWeight:600, fontSize:14 }}>{p.nome}</span>
                  {p.codigo_produto && <span style={{ fontSize:11, color:'var(--t3)', fontFamily:'monospace' }}>#{p.codigo_produto}</span>}
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
              <button className="btn btn-p btn-sm" onClick={e => { e.stopPropagation(); setEtiqueta(p) }}><Tag size={13} strokeWidth={1.8} /></button>
              <button className="btn btn-s btn-sm" onClick={e => { e.stopPropagation(); abrirModal(p) }}>Editar</button>
              <button className="btn btn-g btn-sm" onClick={e => { e.stopPropagation(); excluir(p.id) }}>✕</button>
            </div>
          )})}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} total={total} setPage={setPage} />

      {etiqueta && <EtiquetaModal produto={etiqueta} onClose={() => setEtiqueta(null)} />}

      {detalhe && (
        <Modal title={detalhe.nome} onClose={() => setDetalhe(null)}>
          {detalhe.fotos && detalhe.fotos.length > 0 ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px,1fr))', gap:8, marginBottom:16 }}>
              {detalhe.fotos.map((url, i) => (
                <img key={i} src={url} alt={`Foto ${i+1}`} loading="lazy" style={{ width:'100%', height:120, objectFit:'cover', borderRadius:8 }} />
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

          <div className="fg">
            <label className="fl">Fotos * (mín. 1, máx. 5)</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:8 }}>
              {fotosExistentes.map((url, i) => (
                <div key={i} style={{ position:'relative' }}>
                  <img src={url} alt="" loading="lazy" style={{ width:72, height:72, objectFit:'cover', borderRadius:8 }} />
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
  const { data: lista, loading, reload } = useData(() => lojasService.list(), [])
  const [modal, setModal] = useState(null)
  const empty = { nome:'', cnpj:'', telefone:'', endereco:'', cidade:'', responsavel:'', ativa:true, logo_url:'' }
  const [form, setForm] = useState(empty)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const act = useAction()
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const uploadLogo = async (file) => {
    try { await validarTipoImagem(file) } catch (e) { toast.error(e.message); return }
    setUploadingLogo(true)
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `lojas/logo_${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('sistema-assets').upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' })
      if (error) throw new Error(error.message || JSON.stringify(error))
      const { data: pub } = supabase.storage.from('sistema-assets').getPublicUrl(path)
      setForm(p => ({ ...p, logo_url: pub.publicUrl }))
      toast.success('Logo enviada!')
    } catch (e) { toast.error('Erro no upload: ' + e.message) }
    setUploadingLogo(false)
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
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
        <button className="btn btn-p btn-sm" onClick={() => { setForm(empty); setModal({}) }}>+ Nova Loja</button>
      </div>
      {loading ? <Spinner /> : (lista||[]).length === 0 ? <Empty text="Nenhuma loja cadastrada" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {(lista||[]).map(l => (
            <div key={l.id} className="card" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px' }}>
              {l.logo_url
                ? <img src={l.logo_url} alt={l.nome} style={{ width:36, height:36, borderRadius:8, objectFit:'contain', flexShrink:0, background:'var(--bg3)' }} />
                : <div style={{ width:36, height:36, borderRadius:8, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, flexShrink:0 }}>{l.nome?.[0]}</div>
              }
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
          <div className="fg" style={{ marginBottom:12 }}>
            <label className="fl">Logo da Loja</label>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {form.logo_url
                ? <img src={form.logo_url} alt="logo" style={{ width:48, height:48, borderRadius:8, objectFit:'contain', background:'var(--bg3)', border:'1px solid var(--border)' }} />
                : <div style={{ width:48, height:48, borderRadius:8, background:'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center' }}><Store size={20} color="var(--t3)" strokeWidth={1.5} /></div>
              }
              <label style={{ cursor: uploadingLogo ? 'not-allowed' : 'pointer' }}>
                <input type="file" accept="image/*" style={{ display:'none' }} disabled={uploadingLogo} onChange={e => e.target.files[0] && uploadLogo(e.target.files[0])} />
                <div className="btn btn-s btn-sm">{uploadingLogo ? 'Enviando...' : '⬆ Upload logo'}</div>
              </label>
              {form.logo_url && <button className="btn btn-g btn-sm" onClick={() => setForm(p => ({ ...p, logo_url:'' }))}>✕</button>}
            </div>
          </div>
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
    (!busca || r.nome?.toLowerCase().includes(busca.toLowerCase()) || r.fornecedores?.nome?.toLowerCase().includes(busca.toLowerCase())) &&
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

export default function Cadastros() {
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
