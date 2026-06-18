import React, { useState, useRef, useCallback } from 'react'
import { Edit2, CheckSquare, Calendar, ClipboardList, Paperclip } from 'lucide-react'
import { useData, useAction, useDateInfo, useServerPagination } from '../hooks/index'
import { useAuth } from '../context/AuthContext'
import { Btn, Badge, Modal, Ic, Alert, Spinner, Empty } from '../components/ui/index'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { supabase } from '../lib/supabase'
import { toast } from '../lib/toast'
import { validarTipoImagem } from '../lib/validarTipoImagem'
import { podeAcessarModulosOperacionais } from '../lib/empresaContext'
import { LojaSelect, LojaMultiSelect } from '../components/LojaSelect'
import { WaTemplatesModal } from '../components/WaTemplatesModal'
import { SuperAdminSemEmpresa } from '../components/SuperAdminSemEmpresa'
import { pedidosService } from '../services/pedidos'
import {
  produtosService, usuariosService,
  pedidosTimelineService, devolucoesService,
} from '../services/index'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc

const fmtR = (v) => (parseFloat(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const fmtNPedido = (n) => n ? String(n).padStart(6, '0') : '—'

function Pagination({ page, totalPages, total, setPage }) {
  if (totalPages <= 1 && total < 5) return null
  const pages = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) pages.push(i)
    else if (pages[pages.length - 1] !== '...') pages.push('...')
  }
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'center', marginTop:16, flexWrap:'wrap' }}>
      <button className='btn btn-s btn-sm' disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</button>
      <span className='pagination-desktop' style={{ display:'flex', gap:4 }}>
        {pages.map((p, i) => p === '...'
          ? <span key={i} style={{ padding:'0 4px', color:'var(--t3)' }}>…</span>
          : <button key={p} className={`btn btn-sm ${p === page ? 'btn-p' : 'btn-s'}`} style={{ minWidth:32 }} onClick={() => setPage(p)}>{p}</button>
        )}
      </span>
      <span className='pagination-mobile' style={{ fontSize:13, color:'var(--t2)' }}>Pág. {page}/{totalPages}</span>
      <button className='btn btn-s btn-sm' disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>→</button>
      <span style={{ fontSize:12, color:'var(--t3)' }}>({total} registros)</span>
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
export default function Pedidos({ openChatWith }) {
  if (!podeAcessarModulosOperacionais()) return <SuperAdminSemEmpresa />
  return <PedidosInner openChatWith={openChatWith} />
}
function PedidosInner({ openChatWith }) {
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
        (produtos || []).map(p => mapProdutoDB(p, null)),
        perfil
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
        openChatWith={openChatWith}
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
  cancelamento:'🚫', remarcacao:'📅', devolucao:'↩️', em_rota:'🚚',
}
const TIMELINE_COLORS = {
  criacao:'var(--accent)', aprovacao:'var(--green)', rejeicao:'var(--red)',
  envio_fabrica:'var(--blue)', confirmacao_fabrica:'var(--blue)',
  recebimento_produto:'var(--amber)', conferencia:'var(--accent)',
  separacao:'var(--amber)', agendamento:'var(--green)', agendamento_entrega:'var(--green)',
  entrega:'var(--green)', follow_up:'var(--accent)', anexo:'var(--t2)', edicao:'var(--amber)',
  cancelamento:'var(--red)', remarcacao:'var(--amber)', devolucao:'var(--amber)', em_rota:'var(--blue)',
}

// ── Pedido Detalhe ────────────────────────────────────────
export function PedidoDetalhe({ pedidoId, onBack, openChatWith }) {
  const { perfil, isGestor, effectiveRole, podeVerFinanceiro } = useAuth()
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
        const _tipoStatus = { 'Pronto para Rota': 'conferencia', 'Em Rota': 'em_rota', 'Entregue': 'entrega' }[proximoStatus] || 'edicao'
        await pedidosTimelineService.create({ pedido_id: pedidoId, usuario_id: perfil?.id || null, usuario_nome: perfil?.full_name || null, tipo: _tipoStatus, descricao: `Status alterado de ${pedido.status} para ${proximoStatus}` })
        reload(); reloadHist(); reloadTimeline()
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
        await pedidosTimelineService.create({ pedido_id: pedidoId, usuario_id: perfil?.id || null, usuario_nome: perfil?.full_name || null, tipo: 'edicao', descricao: `Entregador alterado de ${anterior} para ${entNome}. Motivo: ${motivo || 'Não informado'}` })
        reload(); reloadHist(); reloadTimeline(); setShowTroca(false)
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
        await pedidosTimelineService.create({ pedido_id: pedidoId, usuario_id: perfil?.id || null, usuario_nome: perfil?.full_name || null, tipo: 'remarcacao', descricao: `Entrega remarcada para ${new Date(novaData + 'T12:00').toLocaleDateString('pt-BR')}. Motivo: ${motivo || 'Não informado'}` })
        reload(); reloadHist(); reloadTimeline(); setShowRemarcar(false)
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
        await pedidosTimelineService.create({ pedido_id: pedidoId, usuario_id: perfil?.id || null, usuario_nome: perfil?.full_name || null, tipo: 'cancelamento', descricao: `Pedido cancelado. Motivo: ${motivo || 'Não informado'}` })
        reload(); reloadHist(); reloadTimeline(); setShowCancelar(false)
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
              await pedidosTimelineService.create({ pedido_id: pedido.id, usuario_id: perfil?.id || null, usuario_nome: perfil?.full_name || null, tipo: 'devolucao', descricao: `Devolução ${devForm.tipo} registrada. Motivo: ${devForm.motivo}` })
              reload(); reloadHist(); reloadTimeline(); setShowDevolucao(false)
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

