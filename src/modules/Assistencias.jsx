import React, { useState, useEffect, useCallback } from 'react'

import * as XLSX from 'xlsx'
import { Share2, MessageCircle, Mail, ClipboardList } from 'lucide-react'

import { useData, useAction, useServerPagination } from '../hooks/index'
import { useAuth } from '../context/AuthContext'
import { LojaSelect, LojaMultiSelect } from '../components/LojaSelect'
import { SuperAdminSemEmpresa } from '../components/SuperAdminSemEmpresa'
import { Btn, Badge, Modal, Alert, Spinner, Empty, Ic } from '../components/ui/index'
import { supabase } from '../lib/supabase'
import { toast } from '../lib/toast'
import { podeAcessarModulosOperacionais } from '../lib/empresaContext'
import { assistenciasService } from '../services/index'

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

const AssistenciaCard = React.memo(function AssistenciaCard({ assistencia: a, onClick }) {
  const dias = Math.floor((new Date() - new Date(a.data_abertura)) / 86400000)
  const ativo = !['Concluído', 'Cancelado'].includes(a.status)
  const cor = ativo ? (dias >= 30 ? '#ef4444' : dias >= 20 ? '#f59e0b' : dias >= 10 ? '#3b82f6' : 'var(--t3)') : 'var(--t3)'
  const bg = ativo ? (dias >= 30 ? 'rgba(239,68,68,0.06)' : dias >= 20 ? 'rgba(245,158,11,0.06)' : dias >= 10 ? 'rgba(59,130,246,0.06)' : 'transparent') : 'transparent'
  const fornecedores = [...new Set((a.assistencia_itens || [])
    .map(i => i.fornecedor ? String(i.fornecedor).replace(/^\[\d+\]\s*/, '').trim() : null)
    .filter(Boolean))]
  return (
    <div className="li" style={{ borderLeft: `3px solid ${cor}`, background: bg }} onClick={onClick}>
      <div className="li-main">
        <div className="li-title" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span>{a.cliente}</span>
          {a.pedido_ref && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'var(--adim)', borderRadius: 4, padding: '1px 6px' }}>#{a.pedido_ref}</span>}
          {a.loja && <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 400 }}>{a.loja}</span>}
        </div>
        {fornecedores.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>
            {fornecedores.slice(0, 2).join(' · ')}{fornecedores.length > 2 ? ` +${fornecedores.length - 2}` : ''}
          </div>
        )}
        <div className="li-sub">{a.tipo_problema || 'Sem categoria'}{a.categoria ? ` · ${a.categoria}` : ''}</div>
        {ativo && <div style={{ fontSize: 11, color: cor, marginTop: 2 }}>⏱ {dias} dias aberto</div>}
      </div>
      <Badge status={a.status} />
      <Ic n="chev" s={13} style={{ color: 'var(--t3)', flexShrink: 0 }} />
    </div>
  )
})

function AssistenciaProdutosAba({ itens }) {
  if (!itens.length) return <Empty icon="📦" text="Nenhum produto cadastrado" />
  return (
    <div>
      {itens.map(item => (
        <div className="card-sm" key={item.id} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{item.descricao}</div>
            <Badge status={item.status} />
          </div>
          {item.fornecedor && <div style={{ fontSize: 12, color: 'var(--t2)' }}>{item.fornecedor}</div>}
        </div>
      ))}
    </div>
  )
}

const TEMPLATES_WPP = [
  { label: 'Saudação', icon: '👋', gerar: (a) => `Olá ${a.cliente?.split(' ')[0] || 'cliente'}, tudo bem? Aqui é da ${a.loja || 'Versa Log'}, referente ao seu pedido${a.pedido_ref ? ` #${a.pedido_ref}` : ''}. Entramos em contato sobre a assistência técnica solicitada. Como podemos ajudar?` },
  { label: 'Atualização', icon: '📋', gerar: (a) => `Olá ${a.cliente?.split(' ')[0] || 'cliente'}! Temos uma atualização sobre sua assistência${a.pedido_ref ? ` do pedido #${a.pedido_ref}` : ''}. Estamos trabalhando para resolver o mais rápido possível. Qualquer novidade, entramos em contato. Obrigado pela paciência! 🙏` },
  { label: 'Desculpas', icon: '😔', gerar: (a) => `Olá ${a.cliente?.split(' ')[0] || 'cliente'}, pedimos desculpas pelo inconveniente com o seu produto${a.pedido_ref ? ` (pedido #${a.pedido_ref})` : ''}. Estamos tomando as providências necessárias para resolver a situação o quanto antes. Agradecemos sua compreensão!` },
]

const TEMPLATES_EMAIL = [
  { label: 'Cobrança fábrica', icon: '📧', assunto: (a) => `Cobrança de retorno - Assistência cliente ${a.cliente}`, gerar: (a) => `Prezados,\n\nEstamos aguardando retorno sobre a assistência técnica do cliente ${a.cliente}${a.pedido_ref ? `, pedido #${a.pedido_ref}` : ''}.\n\nA solicitação foi aberta há ${Math.floor((new Date() - new Date(a.data_abertura)) / 86400000)} dias e ainda não recebemos posicionamento.\n\nSolicitamos urgência na resolução deste caso.\n\nAtenciosamente,\nEquipe ${a.loja || 'Versa Log'}` },
  { label: 'Defeito fábrica', icon: '⚠️', assunto: (a) => `Defeito de fabricação - ${a.cliente} - Pedido #${a.pedido_ref || '—'}`, gerar: (a) => `Prezados,\n\nIdentificamos defeito de fabricação no(s) produto(s) do cliente ${a.cliente}, referente ao pedido #${a.pedido_ref || '—'}.\n\nSolicitamos análise e providências para troca/reparo dos itens afetados.\n\nAguardamos retorno.\n\nAtenciosamente,\nEquipe ${a.loja || 'Versa Log'}` },
  { label: 'Medida errada', icon: '📐', assunto: (a) => `Produto com medida incorreta - ${a.cliente}`, gerar: (a) => `Prezados,\n\nO produto entregue ao cliente ${a.cliente} (pedido #${a.pedido_ref || '—'}) apresenta medidas incorretas em relação ao pedido realizado.\n\nSolicitamos verificação e envio do produto correto com urgência.\n\nAtenciosamente,\nEquipe ${a.loja || 'Versa Log'}` },
]

function AssistenciaMensagensAba({ assistenciaId, assistencia: a, perfil }) {
  const [interacoes, setInteracoes] = useState([])
  const [loadingI, setLoadingI] = useState(true)
  const [showTpl, setShowTpl] = useState(false)
  const [tipo, setTipo] = useState('wpp')
  const [texto, setTexto] = useState('')
  const [assunto, setAssunto] = useState('')
  const [saving, setSaving] = useState(false)
  const [copiado, setCopiado] = useState('')

  useEffect(() => {
    supabase.from('assistencia_interacoes').select('*').eq('assistencia_id', assistenciaId).order('created_at', { ascending: false })
      .then(({ data }) => { setInteracoes(data || []); setLoadingI(false) })
  }, [assistenciaId])

  const salvar = async (t, dest, subj, cont) => {
    setSaving(true)
    const { data } = await supabase.from('assistencia_interacoes').insert({ assistencia_id: assistenciaId, tipo: t, destinatario: dest, assunto: subj, conteudo: cont, usuario_nome: perfil?.full_name || '', created_at: new Date().toISOString() }).select().single()
    if (data) setInteracoes(prev => [data, ...prev])
    setSaving(false); setTexto(''); setAssunto(''); setShowTpl(false)
  }

  const copiar = (t, k) => { navigator.clipboard.writeText(t); setCopiado(k); setTimeout(() => setCopiado(''), 2000) }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Btn variant={tipo === 'wpp' && showTpl ? 'primary' : 'secondary'} size="sm" onClick={() => { setTipo('wpp'); setShowTpl(true) }}><MessageCircle size={13} strokeWidth={1.8} /> WhatsApp</Btn>
        <Btn variant={tipo === 'email' && showTpl ? 'primary' : 'secondary'} size="sm" onClick={() => { setTipo('email'); setShowTpl(true) }}><Mail size={13} strokeWidth={1.8} /> Email Fábrica</Btn>
      </div>

      {showTpl && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, display:'flex', alignItems:'center', gap:6 }}>{tipo === 'wpp' ? <><MessageCircle size={14} strokeWidth={1.8} /> Templates WhatsApp (cliente)</> : <><Mail size={14} strokeWidth={1.8} /> Templates Email (fábrica)</>}</div>
          {(tipo === 'wpp' ? TEMPLATES_WPP : TEMPLATES_EMAIL).map((tpl, i) => {
            const txt = tpl.gerar(a); const subj = tpl.assunto ? tpl.assunto(a) : ''; const k = `${tipo}_${i}`
            return (
              <div key={i} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                <div style={{ fontWeight: 500, fontSize: 12, marginBottom: 6 }}>{tpl.icon} {tpl.label}</div>
                {subj && <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>Assunto: {subj}</div>}
                <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 8, whiteSpace: 'pre-line' }}>{txt}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Btn variant="secondary" size="sm" onClick={() => copiar(txt, k)}>{copiado === k ? '✓ Copiado!' : <><ClipboardList size={13} strokeWidth={1.8} /> Copiar</>}</Btn>
                  <Btn size="sm" loading={saving} onClick={() => salvar(tipo, tipo === 'wpp' ? 'cliente' : 'fabrica', subj, txt)}>Salvar registro</Btn>
                </div>
              </div>
            )
          })}
          <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Mensagem manual:</div>
            {tipo === 'email' && <div className="fg" style={{ marginBottom: 8 }}><input className="fi" placeholder="Assunto" value={assunto} onChange={e => setAssunto(e.target.value)} /></div>}
            <div className="fg" style={{ marginBottom: 8 }}><textarea className="fi" rows={3} placeholder="Mensagem..." value={texto} onChange={e => setTexto(e.target.value)} /></div>
            <Btn size="sm" disabled={!texto.trim()} loading={saving} onClick={() => salvar(tipo, tipo === 'wpp' ? 'cliente' : 'fabrica', assunto, texto)}>Salvar</Btn>
          </div>
          <Btn variant="ghost" size="sm" style={{ marginTop: 8 }} onClick={() => setShowTpl(false)}>Fechar</Btn>
        </div>
      )}

      {loadingI ? <Spinner /> : interacoes.length === 0 ? <Empty icon="💬" text="Nenhuma mensagem registrada" /> :
        interacoes.map(i => (
          <div key={i.id} style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: i.tipo === 'wpp' ? '#25d366' : 'var(--accent)', display:'flex', alignItems:'center', gap:3 }}>{i.tipo === 'wpp' ? <><MessageCircle size={11} /> WhatsApp</> : <><Mail size={11} /> Email</>}</span>
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>→ {i.destinatario}</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--t3)' }}>{new Date(i.created_at).toLocaleDateString('pt-BR')} · {i.usuario_nome}</span>
            </div>
            {i.assunto && <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>Assunto: {i.assunto}</div>}
            <div style={{ fontSize: 12, color: 'var(--t2)', whiteSpace: 'pre-line' }}>{i.conteudo}</div>
          </div>
        ))
      }
    </div>
  )
}

function AssistenciaTarefasAba({ assistenciaId, perfil }) {
  const [tarefas, setTarefas] = useState([])
  const [loadingT, setLoadingT] = useState(true)
  const [showNova, setShowNova] = useState(false)
  const [showConcluir, setShowConcluir] = useState(null)

  const carregar = () => {
    setLoadingT(true)
    supabase.from('assistencia_tarefas').select('*').eq('assistencia_id', assistenciaId).order('created_at', { ascending: false })
      .then(({ data }) => { setTarefas(data || []); setLoadingT(false) })
  }

  useEffect(() => { carregar() }, [assistenciaId]) // eslint-disable-line react-hooks/exhaustive-deps

  const criar = async (dados) => {
    await supabase.from('assistencia_tarefas').insert({ ...dados, assistencia_id: assistenciaId, status: 'pendente', criado_automaticamente: false, usuario_nome: perfil?.full_name || '', created_at: new Date().toISOString() })
    carregar(); setShowNova(false)
  }

  const concluir = async (tarId, obs) => {
    await supabase.from('assistencia_tarefas').update({ status: 'concluída', observacao_conclusao: obs, concluido_em: new Date().toISOString() }).eq('id', tarId)
    carregar(); setShowConcluir(null)
  }

  const pendentes = tarefas.filter(t => t.status === 'pendente')
  const concluidas = tarefas.filter(t => t.status === 'concluída')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--t2)' }}>{pendentes.length} pendente(s)</div>
        <Btn size="sm" onClick={() => setShowNova(true)}><Ic n="plus" s={12} /> Nova Tarefa</Btn>
      </div>
      {loadingT ? <Spinner /> : (
        <>
          {pendentes.length === 0 && concluidas.length === 0 && <Empty icon="✅" text="Nenhuma tarefa" />}
          {pendentes.map(t => (
            <div key={t.id} style={{ background: t.criado_automaticamente ? 'rgba(245,158,11,0.05)' : 'var(--bg1)', border: `1px solid ${t.criado_automaticamente ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ fontWeight: 500, fontSize: 13 }}>
                  {t.criado_automaticamente && <span style={{ fontSize: 10, color: 'var(--amber)', marginRight: 6 }}>⚡ AUTO</span>}
                  {t.titulo}
                </div>
                <Btn size="sm" variant="secondary" onClick={() => setShowConcluir(t)}>Concluir</Btn>
              </div>
              {t.descricao && <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 4 }}>{t.descricao}</div>}
              {t.prazo && <div style={{ fontSize: 11, color: 'var(--amber)' }}>⏱ Prazo: {new Date(t.prazo + 'T12:00').toLocaleDateString('pt-BR')}</div>}
            </div>
          ))}
          {concluidas.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 8 }}>Concluídas ({concluidas.length})</div>
              {concluidas.map(t => (
                <div key={t.id} style={{ opacity: 0.55, background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 10, padding: 10, marginBottom: 6 }}>
                  <div style={{ fontSize: 12, textDecoration: 'line-through' }}>✓ {t.titulo}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {showNova && (
        <Modal title="Nova Tarefa" onClose={() => setShowNova(false)} footer={null}>
          <NovaTarefaForm onSave={criar} onCancel={() => setShowNova(false)} />
        </Modal>
      )}
      {showConcluir && (
        <Modal title="Concluir Tarefa" onClose={() => setShowConcluir(null)} footer={null}>
          <ConcluirTarefaForm tarefa={showConcluir} onSave={(obs) => concluir(showConcluir.id, obs)} onCancel={() => setShowConcluir(null)} />
        </Modal>
      )}
    </div>
  )
}

function NovaTarefaForm({ onSave, onCancel }) {
  const [form, setForm] = useState({ titulo: '', descricao: '', tipo: 'follow_up', prazo: '' })
  const [saving, setSaving] = useState(false)
  const up = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))
  return (
    <>
      <div className="fg"><label className="fl">Título *</label><input className="fi" value={form.titulo} onChange={up('titulo')} /></div>
      <div className="fg">
        <label className="fl">Tipo</label>
        <select className="fi" value={form.tipo} onChange={up('tipo')}>
          {['follow_up', 'visita', 'contato_fabrica', 'agendamento', 'outro'].map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="fg"><label className="fl">Prazo</label><input className="fi" type="date" value={form.prazo} onChange={up('prazo')} /></div>
      <div className="fg"><label className="fl">Descrição</label><textarea className="fi" rows={2} value={form.descricao} onChange={up('descricao')} /></div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
        <Btn disabled={!form.titulo.trim()} loading={saving} onClick={async () => { setSaving(true); await onSave(form); setSaving(false) }}>Salvar</Btn>
      </div>
    </>
  )
}

function ConcluirTarefaForm({ tarefa, onSave, onCancel }) {
  const [obs, setObs] = useState('')
  const [saving, setSaving] = useState(false)
  return (
    <>
      <div style={{ fontWeight: 500, marginBottom: 8 }}>{tarefa.titulo}</div>
      <div className="fg"><label className="fl">Observação da conclusão</label><textarea className="fi" rows={3} value={obs} onChange={e => setObs(e.target.value)} placeholder="O que foi feito..." /></div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
        <Btn style={{ background: 'var(--green)' }} loading={saving} onClick={async () => { setSaving(true); await onSave(obs); setSaving(false) }}>✓ Concluir</Btn>
      </div>
    </>
  )
}

function AssistenciaDetalhe({ id, onBack }) {
  const { perfil } = useAuth()
  const { data: a, loading, reload } = useData(() => assistenciasService.getById(id), [id])
  const { run, loading: actionLoading } = useAction()
  const [aba, setAba] = useState(0)

  useEffect(() => {
    if (!a) return
    const dias = Math.floor((new Date() - new Date(a.updated_at || a.data_abertura)) / 86400000)
    if (dias >= 7 && !['Concluído', 'Cancelado'].includes(a.status)) {
      supabase.from('assistencia_tarefas').select('id').eq('assistencia_id', id).eq('criado_automaticamente', true).eq('status', 'pendente')
        .then(({ data }) => {
          if (!data?.length) {
            supabase.from('assistencia_tarefas').insert({ assistencia_id: id, titulo: 'Assistência sem atualização há +7 dias', descricao: `Verificar e atualizar o status (${dias} dias sem alteração)`, tipo: 'follow_up', status: 'pendente', criado_automaticamente: true, prazo: new Date().toISOString().split('T')[0] })
          }
        })
    }
  }, [a?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = async (status) => {
    try {
      await run(() => assistenciasService.update(id, { status }))
      reload()
      toast.success(`Status atualizado: ${status}`)
    } catch (e) {
      console.error('[AssistenciaDetalhe] updateStatus:', e)
      toast.error('Erro ao atualizar status: ' + e.message)
    }
  }

  if (loading) return <div className="page"><Spinner /></div>
  if (!a) return <div className="page"><Empty text="Não encontrado" /></div>

  const dias = Math.floor((new Date() - new Date(a.data_abertura)) / 86400000)

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
        <Btn variant="ghost" size="sm" onClick={onBack}><Ic n="back" s={13} /> Voltar</Btn>
        <select className="fi" style={{ width: 'auto' }} value={a.status} onChange={e => updateStatus(e.target.value)} disabled={actionLoading}>
          {['Aberto', 'Em andamento', 'Aguardando fábrica', 'Aguardando peça', 'Agendado', 'Concluído', 'Cancelado'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <Badge status={a.status} style={{ marginBottom: 8 }} />
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>{a.cliente}</h1>
      <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 4 }}>
        {a.loja && <span>{a.loja} · </span>}
        {a.pedido_ref && <span>#{a.pedido_ref} · </span>}
        {dias} dias aberto
      </div>
      <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 16 }}>
        Aberto em {new Date(a.data_abertura + 'T12:00').toLocaleDateString('pt-BR')}
        {a.responsavel_nome && ` · ${a.responsavel_nome}`}
      </div>

      <div className="filters" style={{ marginBottom: 16 }}>
        {['Produtos', 'Mensagens', 'Tarefas'].map((tab, i) => (
          <button key={tab} className={`fb${aba === i ? ' on' : ''}`} onClick={() => setAba(i)}>{tab}</button>
        ))}
      </div>

      {aba === 0 && <AssistenciaProdutosAba itens={a.assistencia_itens || []} />}
      {aba === 1 && <AssistenciaMensagensAba assistenciaId={id} assistencia={a} perfil={perfil} />}
      {aba === 2 && <AssistenciaTarefasAba assistenciaId={id} perfil={perfil} />}
    </div>
  )
}

function ImportarExcelAssistenciaModal({ onClose, onImport, existentes }) {
  const [rows, setRows] = useState([])
  const [rawDebug, setRawDebug] = useState(null)
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

      setRawDebug({
        cabecalho: raw[4] || [],
        linha1: raw[5] || [],
        linha2: raw[6] || [],
        linha3: raw[7] || [],
        totalLinhas: raw.length,
      })

      const dataRows = raw.slice(5)

      const parseDate = (v) => {
        if (!v) return ''
        if (typeof v === 'number') {
          const d = new Date(Math.round((v - 25569) * 86400 * 1000))
          return d.toISOString().split('T')[0]
        }
        const s = String(v).trim()
        if (s.includes('/')) {
          const parts = s.split('/')
          if (parts.length === 3) {
            const [d, m, y] = parts
            return `${y.padStart(4, '20')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
          }
        }
        return s.slice(0, 10)
      }

      const norm = dataRows.map(r => ({
        pedido_ref:    String(r[2] ?? '').trim(),
        produto:       String(r[3] ?? '').trim(),
        qtd:           String(r[4] ?? '').trim(),
        fornecedor:    String(r[6] ?? '').trim(),
        cliente:       String(r[7] ?? '').trim(),
        loja:          String(r[8] ?? '').trim(),
        data_venda:    parseDate(r[9]),
        data_abertura: parseDate(r[10]),
        categoria:     String(r[11] ?? '').trim(),
        descricao:     String(r[12] ?? '').trim(),
      })).filter(r => r.cliente !== '')

      setRows(norm); setPreview(true)
    }
    reader.readAsBinaryString(file)
  }

  const novas = rows.filter(r => !existentes.find(e => e.pedido_ref === r.pedido_ref && e.cliente === r.cliente))
  const atualizadas = rows.filter(r => existentes.find(e => e.pedido_ref === r.pedido_ref && e.cliente === r.cliente))

  return (
    <Modal
      title="Importar Excel — Assistências"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          {preview && rows.length > 0 && <Btn loading={saving} onClick={async () => { setSaving(true); setProgress({ done: 0, total: rows.length }); try { await onImport(rows, (done, total) => setProgress({ done, total })) } catch (e) { console.error('[Import] Erro geral:', e); alert('Erro na importação. Abra F12 → Console para detalhes.') } setSaving(false) }}>{saving && progress.total > 0 ? `Salvando ${progress.done}/${progress.total}...` : `Importar ${rows.length} registros`}</Btn>}
        </>
      }
    >
      {!preview ? (
        <div>
          <Alert type="warning" style={{ marginBottom: 16 }}>Cabeçalho na <b>linha 5</b>, dados a partir da <b>linha 6</b>. Colunas: C2=Pedido · C3=Produto · C4=Qtd · C6=Fornecedor · C7=Cliente · C8=Loja · C9=Data venda · C10=Data assist. · C11=Categoria · C12=Descrição</Alert>
          <div className="upload-zone" style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
            <div style={{ marginBottom: 12 }}>Selecione o arquivo .xlsx ou .xls</div>
            <input type="file" accept=".xlsx,.xls" onChange={handleFile} />
          </div>
        </div>
      ) : (
        <div>
          {rawDebug && (
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 11, overflowX: 'auto' }}>
              <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--accent)' }}>Diagnóstico — valores brutos do Excel (confirme se o mapeamento está correto)</div>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 10 }}>
                <thead>
                  <tr>
                    <th style={{ padding: '2px 6px', color: 'var(--t3)', textAlign: 'left', minWidth: 28 }}>Col</th>
                    <th style={{ padding: '2px 6px', color: 'var(--amber)', textAlign: 'left' }}>Cabeçalho (L5)</th>
                    <th style={{ padding: '2px 6px', color: 'var(--green)', textAlign: 'left' }}>Linha 6</th>
                    <th style={{ padding: '2px 6px', color: 'var(--t2)', textAlign: 'left' }}>Linha 7</th>
                    <th style={{ padding: '2px 6px', color: 'var(--t3)', textAlign: 'left', fontStyle: 'italic' }}>Campo salvo como</th>
                  </tr>
                </thead>
                <tbody>
                  {rawDebug.cabecalho.slice(0, 14).map((cab, idx) => {
                    const MAPA = { 2: 'pedido_ref', 3: 'produto', 4: 'qtd', 6: 'fornecedor', 7: 'cliente ⭐', 8: 'loja', 9: 'data_venda', 10: 'data_abertura', 11: 'categoria', 12: 'descricao' }
                    const campo = MAPA[idx] || '—'
                    const destaque = campo.includes('cliente') || campo.includes('pedido')
                    return (
                      <tr key={idx} style={{ background: destaque ? 'rgba(99,102,241,0.08)' : 'transparent' }}>
                        <td style={{ padding: '2px 6px', color: 'var(--t3)', fontWeight: 600 }}>{String.fromCharCode(65 + idx)}</td>
                        <td style={{ padding: '2px 6px', color: 'var(--amber)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(cab || '').slice(0, 30)}</td>
                        <td style={{ padding: '2px 6px', color: 'var(--green)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(rawDebug.linha1[idx] ?? '').slice(0, 30)}</td>
                        <td style={{ padding: '2px 6px', color: 'var(--t2)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(rawDebug.linha2[idx] ?? '').slice(0, 30)}</td>
                        <td style={{ padding: '2px 6px', color: destaque ? 'var(--accent)' : 'var(--t3)', fontStyle: 'italic' }}>{campo}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div style={{ marginTop: 6, color: 'var(--t3)' }}>Total de linhas no arquivo: {rawDebug.totalLinhas} · Dados a partir da linha 6 (índice 5)</div>
            </div>
          )}
          <div className="stats" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16 }}>
            {[{ label: 'Total', val: rows.length, color: 'var(--accent)' }, { label: 'Novas', val: novas.length, color: 'var(--green)' }, { label: 'Atualizar', val: atualizadas.length, color: 'var(--amber)' }].map(s => (
              <div className="stat" key={s.label}><div className="stat-val" style={{ color: s.color }}>{s.val}</div><div className="stat-lbl">{s.label}</div></div>
            ))}
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {rows.slice(0, 30).map((r, i) => {
              const exist = existentes.find(e => e.pedido_ref === r.pedido_ref && e.cliente === r.cliente)
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                  <div>
                    <span style={{ fontWeight: 500 }}>{r.cliente}</span>
                    {r.pedido_ref && <span style={{ color: 'var(--t3)', marginLeft: 6 }}>#{r.pedido_ref}</span>}
                    {r.loja && <span style={{ color: 'var(--t3)', marginLeft: 6 }}>{r.loja}</span>}
                    {r.produto && <div style={{ color: 'var(--t3)', fontSize: 11 }}>{r.produto}{r.qtd ? ` · qtd: ${r.qtd}` : ''}{r.categoria ? ` · ${r.categoria}` : ''}</div>}
                    {r.data_abertura && <div style={{ color: 'var(--t3)', fontSize: 11 }}>Assist: {r.data_abertura}</div>}
                  </div>
                  <span style={{ color: exist ? 'var(--amber)' : 'var(--green)', fontSize: 11, flexShrink: 0, marginLeft: 8 }}>{exist ? '↻ Atualizar' : '+ Nova'}</span>
                </div>
              )
            })}
            {rows.length > 30 && <div style={{ fontSize: 12, color: 'var(--t3)', paddingTop: 8 }}>...e mais {rows.length - 30} registros</div>}
          </div>
        </div>
      )}
    </Modal>
  )
}

function NovaAssistenciaModal({ onClose, onSave, prefill }) {
  const { perfil } = useAuth()
  const [step, setStep] = useState(0)
  const [dados, setDados] = useState({ solicitante: perfil?.full_name || '', telefone: prefill?.telefone || '', numero_pedido: prefill?.numero_pedido || '', cliente: prefill?.cliente || '', loja: prefill?.loja || '' })
  const [itens, setItens] = useState([{ id: 1, descricao: '', fornecedor: '' }])
  const { run, loading } = useAction()

  const addItem = () => setItens(prev => [...prev, { id: Date.now(), descricao: '', fornecedor: '' }])
  const remItem = (id) => setItens(prev => prev.filter(x => x.id !== id))
  const upItem = (id, k, v) => setItens(prev => prev.map(x => x.id === id ? { ...x, [k]: v } : x))
  const upDados = (k) => (e) => setDados(prev => ({ ...prev, [k]: e.target.value }))

  const canNext0 = dados.cliente.trim() && dados.solicitante.trim()
  const canNext1 = itens.every(i => i.descricao.trim())

  const handleSave = async () => {
    const prazo = new Date()
    prazo.setDate(prazo.getDate() + 30)
    try {
      await run(() => onSave({
        cliente: dados.cliente,
        telefone: dados.telefone,
        pedido_ref: dados.numero_pedido,
        loja: dados.loja,
        data_abertura: new Date().toISOString().split('T')[0],
        prazo: prazo.toISOString().split('T')[0],
        status: 'Aberto',
        tipo_problema: itens[0]?.descricao || 'Outros',
        observacoes: itens[0]?.descricao || '',
        responsavel_nome: dados.solicitante,
        origem: 'app',
        itens: itens.map(({ id: _, ...rest }) => ({ ...rest, status: 'Aberto' })),
      }))
    } catch {
      // error handled by parent handleCreate via toast
    }
  }

  const steps = ['Dados gerais', 'Produtos', 'Confirmar']

  return (
    <Modal
      title="Nova Assistência Técnica"
      subtitle={`Etapa ${step + 1} de ${steps.length} — ${steps[step]}`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          {step > 0 && <Btn variant="secondary" onClick={() => setStep(s => s - 1)}>← Voltar</Btn>}
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          {step < 2 && <Btn disabled={step === 0 ? !canNext0 : !canNext1} onClick={() => setStep(s => s + 1)}>Continuar →</Btn>}
          {step === 2 && <Btn style={{ background: 'var(--green)' }} loading={loading} onClick={handleSave}>✓ Confirmar</Btn>}
        </>
      }
    >
      <div className="steps">{steps.map((_, i) => <div key={i} className={`dot${i === step ? ' on' : i < step ? ' done' : ''}`} />)}</div>

      {step === 0 && (
        <>
          {prefill && <Alert type="success">✓ Dados preenchidos do pedido #{prefill.numero_pedido}</Alert>}
          <div className="grid2">
            <div className="fg"><label className="fl">Solicitante *</label><input className="fi" value={dados.solicitante} onChange={upDados('solicitante')} /></div>
            <div className="fg"><label className="fl">Telefone</label><input className="fi" value={dados.telefone} onChange={upDados('telefone')} /></div>
          </div>
          <div className="grid2">
            <div className="fg"><label className="fl">Cliente *</label><input className="fi" value={dados.cliente} onChange={upDados('cliente')} /></div>
            <div className="fg"><label className="fl">Loja</label><LojaSelect value={dados.loja} onChange={v => setDados(p => ({ ...p, loja: v }))} /></div>
          </div>
          <div className="grid2">
            <div className="fg"><label className="fl">Nº Pedido</label><input className="fi" value={dados.numero_pedido} onChange={upDados('numero_pedido')} /></div>
            <div className="fg"><label className="fl">Prazo padrão</label><input className="fi" value="30 dias" disabled /></div>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--t2)' }}>{itens.length} produto(s)</div>
            <Btn variant="secondary" size="sm" onClick={addItem}><Ic n="plus" s={12} /> Produto</Btn>
          </div>
          {itens.map((item, idx) => (
            <div key={item.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>Produto {idx + 1}</div>
                {itens.length > 1 && <button className="btn btn-g btn-ico btn-sm" style={{ color: 'var(--red)' }} onClick={() => remItem(item.id)}><Ic n="trash" s={12} /></button>}
              </div>
              <div className="grid2">
                <div className="fg"><label className="fl">Descrição *</label><input className="fi" value={item.descricao} onChange={e => upItem(item.id, 'descricao', e.target.value)} placeholder="Ex: Sofá Bless — descreva o problema" /></div>
                <div className="fg"><label className="fl">Fornecedor</label><input className="fi" value={item.fornecedor} onChange={e => upItem(item.id, 'fornecedor', e.target.value)} /></div>
              </div>
            </div>
          ))}
        </>
      )}

      {step === 2 && (
        <>
          <div className="card-sm" style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8, textTransform: 'uppercase' }}>Dados gerais</div>
            <div className="grid2" style={{ fontSize: 13, gap: 6 }}>
              <div><span style={{ color: 'var(--t2)' }}>Solicitante: </span>{dados.solicitante}</div>
              <div><span style={{ color: 'var(--t2)' }}>Cliente: </span>{dados.cliente}</div>
              <div><span style={{ color: 'var(--t2)' }}>Pedido: </span>#{dados.numero_pedido || '—'}</div>
              <div><span style={{ color: 'var(--t2)' }}>Prazo: </span>30 dias</div>
            </div>
          </div>
          {itens.map((item, idx) => (
            <div className="card-sm" key={item.id} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 5 }}>Produto {idx + 1}</div>
              <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 3 }}>{item.descricao}</div>
              {item.fornecedor && <div style={{ fontSize: 12, color: 'var(--t2)' }}>{item.fornecedor}</div>}
            </div>
          ))}
        </>
      )}
    </Modal>
  )
}

const CHART_PAL = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#a78bfa','#06b6d4','#84cc16']
const stripPrefix = (s) => String(s || '').replace(/^\[\d+\]\s*/, '').trim()
const buildDynamic = (items, getKey) => {
  const counts = {}
  for (const item of items) {
    const raw = getKey(item)
    if (!raw) continue
    const key = stripPrefix(raw) || raw
    counts[key] = (counts[key] || 0) + 1
  }
  const total = Object.values(counts).reduce((s, v) => s + v, 0)
  return Object.entries(counts)
    .map(([name, qtd]) => ({ name, qtd, pct: total ? Math.round(qtd / total * 100) : 0 }))
    .sort((a, b) => b.qtd - a.qtd)
}

function GraficoBarras({ dados }) {
  if (!dados?.length) return <div style={{ color: 'var(--t3)', fontSize: 12, padding: 8 }}>Sem dados</div>
  const max = Math.max(...dados.map(d => d.qtd), 1)
  return (
    <div style={{ width: '100%' }}>
      {dados.map((d, i) => (
        <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
          <div style={{ width: 150, fontSize: 11, color: 'var(--t2)', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.name}>{d.name}</div>
          <div style={{ flex: 1, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', height: 22 }}>
            <div style={{ width: `${Math.max((d.qtd / max) * 100, d.qtd > 0 ? 4 : 0)}%`, background: CHART_PAL[i % CHART_PAL.length], height: '100%', borderRadius: 4, display: 'flex', alignItems: 'center', paddingLeft: 6, fontSize: 11, color: '#fff', fontWeight: 600, transition: 'width 0.4s ease' }}>
              {d.qtd}
            </div>
          </div>
          <div style={{ width: 36, fontSize: 11, color: 'var(--t3)', textAlign: 'right', flexShrink: 0 }}>{d.pct}%</div>
        </div>
      ))}
    </div>
  )
}

function TabelaRelatorio({ dados }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--t3)', fontWeight: 500, borderBottom: '1px solid var(--border)' }}>Descrição</th>
          <th style={{ textAlign: 'right', padding: '4px 8px', color: 'var(--t3)', fontWeight: 500, borderBottom: '1px solid var(--border)' }}>Qtd</th>
          <th style={{ textAlign: 'right', padding: '4px 8px', color: 'var(--t3)', fontWeight: 500, borderBottom: '1px solid var(--border)' }}>%</th>
        </tr>
      </thead>
      <tbody>
        {dados.map((d, i) => (
          <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
            <td style={{ padding: '5px 8px', color: 'var(--t1)' }}>{d.name}</td>
            <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600, color: 'var(--accent)' }}>{d.qtd}</td>
            <td style={{ padding: '5px 8px', textAlign: 'right', color: 'var(--t3)' }}>{d.pct}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function RelatorioAssistencias({ onBack }) {
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [lojasFil, setLojasFil] = useState([])

  const { data: assistencias, loading } = useData(() => assistenciasService.list(), [])
  const { data: todosItens } = useData(async () => {
    const { data, error } = await supabase.from('assistencia_itens').select('assistencia_id, fornecedor')
    if (error) throw error
    return data || []
  }, [])

  const hoje = new Date()
  const diasAberto = (d) => !d ? 0 : Math.floor((hoje - new Date(d)) / 86400000)

  const lista = (assistencias || []).filter(a => {
    const okInicio = !dataInicio || (a.data_abertura >= dataInicio)
    const okFim = !dataFim || (a.data_abertura <= dataFim)
    const okLoja = lojasFil.length === 0 || lojasFil.includes(a.loja)
    return okInicio && okFim && okLoja
  })

  const ativas = lista.filter(a => !['Concluído', 'Cancelado'].includes(a.status))
  const criticas = ativas.filter(a => diasAberto(a.data_abertura) >= 30)
  const urgentes = ativas.filter(a => { const d = diasAberto(a.data_abertura); return d >= 20 && d < 30 })

  const dataCategorias = buildDynamic(lista, a => a.categoria)
  const dataLojas      = buildDynamic(lista, a => a.loja)

  const listaIds = new Set(lista.map(a => a.id))
  const itensFiltrados = (todosItens || []).filter(it => listaIds.has(it.assistencia_id))
  const dataFabricas = buildDynamic(itensFiltrados, it => it.fornecedor)

  const gerarPDF = () => {
    const w = window.open('', '_blank')
    if (!w) { alert('Permita popups para gerar o PDF.'); return }
    const fmtData = (d) => d ? new Date(d + 'T12:00').toLocaleDateString('pt-BR') : '—'
    const agora = new Date()
    const dataRel = `${String(agora.getDate()).padStart(2,'0')}/${String(agora.getMonth()+1).padStart(2,'0')}/${String(agora.getFullYear()).slice(2)}`
    const barraHTML = (d, max) => {
      const pct = Math.max((d.qtd / max) * 100, 2)
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
        <div style="width:160px;font-size:11px;color:#475569;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${d.name}">${d.name}</div>
        <div style="flex:1;background:#e2e8f0;border-radius:3px;height:18px;overflow:hidden">
          <div style="width:${pct}%;background:#6366f1;height:100%;border-radius:3px;display:flex;align-items:center;padding-left:5px;font-size:10px;color:#fff;font-weight:700">${d.qtd}</div>
        </div>
        <div style="width:32px;font-size:10px;color:#94a3b8;text-align:right">${d.pct}%</div>
      </div>`
    }
    const secao = (titulo, dados) => {
      const max = Math.max(...dados.map(d => d.qtd), 1)
      return `<div style="margin-bottom:28px">
        <h3 style="margin:0 0 10px;font-size:13px;color:#1e293b;border-bottom:2px solid #6366f1;padding-bottom:5px;text-transform:uppercase;letter-spacing:.5px">${titulo}</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
          <table style="border-collapse:collapse;font-size:11px">
            <thead><tr style="background:#f8fafc"><th style="text-align:left;padding:5px 8px;color:#64748b;font-weight:500;border-bottom:1px solid #e2e8f0">Descrição</th><th style="text-align:right;padding:5px 8px;color:#64748b;font-weight:500;border-bottom:1px solid #e2e8f0">Qtd</th><th style="text-align:right;padding:5px 8px;color:#64748b;font-weight:500;border-bottom:1px solid #e2e8f0">%</th></tr></thead>
            <tbody>${dados.map(d => `<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:4px 8px">${d.name}</td><td style="padding:4px 8px;text-align:right;font-weight:700;color:#6366f1">${d.qtd}</td><td style="padding:4px 8px;text-align:right;color:#94a3b8">${d.pct}%</td></tr>`).join('')}</tbody>
          </table>
          <div style="padding-top:4px">${dados.map(d => barraHTML(d, max)).join('')}</div>
        </div>
      </div>`
    }
    const periodo = `${fmtData(dataInicio)} até ${fmtData(dataFim)}${lojasFil.length ? ` · Loja: ${lojasFil.join(', ')}` : ''}`
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório Assistências</title>
      <style>*{box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:32px;color:#1e293b;max-width:900px;margin:0 auto}@media print{body{padding:16px}}</style>
      </head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:12px;border-bottom:3px solid #6366f1">
        <div><h1 style="margin:0 0 2px;font-size:20px;color:#1e293b;text-transform:uppercase;letter-spacing:1px;font-weight:700">CONTROLE DE ASSISTÊNCIAS ${dataRel}</h1>
        <div style="font-size:12px;color:#64748b">Período: ${periodo} · Gerado em ${agora.toLocaleString('pt-BR')}</div></div>
      </div>
      <div style="display:flex;gap:16px;margin-bottom:24px">
        <div style="background:#fef2f2;padding:12px 18px;border-radius:8px;text-align:center;flex:1"><div style="font-size:26px;font-weight:700;color:#ef4444">${criticas.length}</div><div style="font-size:10px;color:#64748b;margin-top:2px">CRÍTICAS +30d</div></div>
        <div style="background:#fffbeb;padding:12px 18px;border-radius:8px;text-align:center;flex:1"><div style="font-size:26px;font-weight:700;color:#f59e0b">${urgentes.length}</div><div style="font-size:10px;color:#64748b;margin-top:2px">URGENTES +20d</div></div>
        <div style="background:#eff6ff;padding:12px 18px;border-radius:8px;text-align:center;flex:1"><div style="font-size:26px;font-weight:700;color:#6366f1">${ativas.length}</div><div style="font-size:10px;color:#64748b;margin-top:2px">ABERTAS</div></div>
        <div style="background:#f0fdf4;padding:12px 18px;border-radius:8px;text-align:center;flex:1"><div style="font-size:26px;font-weight:700;color:#10b981">${lista.length}</div><div style="font-size:10px;color:#64748b;margin-top:2px">TOTAL</div></div>
      </div>
      ${secao('Por Categoria', dataCategorias)}
      ${secao('Por Loja', dataLojas)}
      ${secao('Por Fabricante / Fornecedor', dataFabricas)}
      <script>window.print()</script></body></html>`)
    w.document.close()
  }

  if (loading) return <div className="page"><Spinner /></div>

  const SecaoRelatorio = ({ titulo, dados }) => (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>{titulo} <span style={{ fontWeight: 400, color: 'var(--t3)', fontSize: 12 }}>({dados.length} tipos · {dados.reduce((s, d) => s + d.qtd, 0)} registros)</span></div>
      {dados.length === 0
        ? <div style={{ color: 'var(--t3)', fontSize: 12 }}>Sem dados para o filtro atual</div>
        : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 20, alignItems: 'start' }}>
            <TabelaRelatorio dados={dados} />
            <GraficoBarras dados={dados} />
          </div>}
    </div>
  )

  return (
    <div className="page">
      <div className="ph">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-g btn-ico btn-sm" onClick={onBack}><Ic n="back" /></button>
          <div>
            <h1>Relatório de Assistências</h1>
            <div className="ph-sub">{lista.length} assistências{lojasFil.length ? ` · ${lojasFil.length} loja(s)` : ''}</div>
          </div>
        </div>
        <Btn size="sm" onClick={gerarPDF}><Ic n="pdf" s={13} /> Exportar PDF</Btn>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>Filtros</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div className="fg"><label className="fl">Data início</label><input className="fi" type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} /></div>
          <div className="fg"><label className="fl">Data fim</label><input className="fi" type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} /></div>
          <div className="fg"><label className="fl">Loja</label>
            <LojaMultiSelect value={lojasFil} onChange={setLojasFil} />
          </div>
        </div>
      </div>

      <div className="stats" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
        {[
          { label: 'Críticas +30d', val: criticas.length, color: 'var(--red)' },
          { label: 'Urgentes +20d', val: urgentes.length, color: 'var(--amber)' },
          { label: 'Abertas', val: ativas.length, color: 'var(--accent)' },
          { label: 'Total', val: lista.length, color: 'var(--green)' },
        ].map(s => (
          <div className="stat" key={s.label}>
            <div className="stat-val" style={{ color: s.color }}>{s.val}</div>
            <div className="stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      <SecaoRelatorio titulo="Por Categoria" dados={dataCategorias} />
      <SecaoRelatorio titulo="Por Loja" dados={dataLojas} />
      <SecaoRelatorio titulo="Por Fabricante / Fornecedor" dados={dataFabricas} />
    </div>
  )
}

function AssistenciaInner() {
  const { perfil, empresaId } = useAuth()
  const [sf, setSf] = useState('Todos')
  const [showNew, setShowNew] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [showRelatorio, setShowRelatorio] = useState(false)
  const [stats, setStats] = useState({ criticas: 0, urgentes: 0, ativas: 0, novas: 0 })

  useEffect(() => {
    assistenciasService.listPaged({ search: '', from: 0, to: 999, status: 'Todos' })
      .then(({ data: all }) => {
        const hoje = new Date()
        const diasAberto = (d) => !d ? 0 : Math.floor((hoje - new Date(d)) / 86400000)
        const ativas = all.filter(a => !['Concluído', 'Cancelado'].includes(a.status))
        setStats({
          criticas: ativas.filter(a => diasAberto(a.data_abertura) >= 30).length,
          urgentes: ativas.filter(a => { const d = diasAberto(a.data_abertura); return d >= 20 && d < 30 }).length,
          ativas: ativas.length,
          novas: all.filter(a => a.status === 'solicitacao' || a.origem === 'formulario').length,
        })
      }).catch(() => {})
  }, [])

  const queryFn = useCallback(
    ({ search, from, to }) => assistenciasService.listPaged({ search, from, to, status: sf }),
    [sf]
  )
  const { data: filtered, loading, total, page, setPage, totalPages, search: busca, setSearch: setBusca, reload } = useServerPagination(queryFn)

  const statuses = ['Todos', 'Aberto', 'Em andamento', 'Aguardando fábrica', 'Aguardando peça', 'Agendado', 'Concluído', 'Cancelado']
  const lista = filtered || []

  const handleCreate = async (dados) => {
    try {
      const { itens, ...assistencia } = dados
      const nova = await assistenciasService.create(assistencia)
      if (itens?.length) {
        for (const item of itens) await assistenciasService.createItem({ ...item, assistencia_id: nova.id })
      }
      await reload()
      setShowNew(false)
      toast.success('Assistência criada com sucesso!')
    } catch (e) {
      console.error('[Assistencia] handleCreate:', e)
      toast.error('Erro ao criar assistência: ' + (e.message || e.details || 'desconhecido'))
    }
  }

  const handleImport = async (rows, onProgress) => {
    const BATCH = 20
    let done = 0, criadas = 0, atualizadas = 0, erros = 0
    const hoje = new Date()

    const { data: todasAssistencias } = await assistenciasService.listPaged({ search: '', from: 0, to: 9999, status: 'Todos' })
    const listaCompleta = todasAssistencias || []

    const gruposMap = new Map()
    for (const row of rows) {
      const key = `${row.pedido_ref || ''}||${row.cliente}`
      if (!gruposMap.has(key)) gruposMap.set(key, { principal: row, itens: [] })
      gruposMap.get(key).itens.push(row)
    }
    const grupos = Array.from(gruposMap.values())
    const total = grupos.length

    const paraAtualizar = grupos.filter(g => g.principal.pedido_ref && listaCompleta.find(a => a.pedido_ref === g.principal.pedido_ref && a.cliente === g.principal.cliente))
    const paraCriar = grupos.filter(g => !g.principal.pedido_ref || !listaCompleta.find(a => a.pedido_ref === g.principal.pedido_ref && a.cliente === g.principal.cliente))

    for (const { principal, itens } of paraAtualizar) {
      const existing = listaCompleta.find(a => a.pedido_ref === principal.pedido_ref && a.cliente === principal.cliente)
      try {
        await assistenciasService.update(existing.id, {
          loja: principal.loja || existing.loja,
          categoria: principal.categoria || existing.categoria,
        })
        const itemsNovas = itens.filter(r => (r.produto || r.descricao || r.categoria))
        for (const row of itemsNovas) {
          await supabase.from('assistencia_itens').insert({
            assistencia_id: existing.id,
            descricao: (row.produto || row.categoria || row.descricao || 'Item importado').trim(),
            fornecedor: row.fornecedor || null, status: 'Aberto',
          })
        }
        atualizadas++
      } catch (e) { console.error('[Import] Erro atualizar', existing?.id, e); erros++ }
      done++
      onProgress?.(done, total)
    }

    for (let i = 0; i < paraCriar.length; i += BATCH) {
      const lote = paraCriar.slice(i, i + BATCH)
      const payload = lote.map(({ principal }) => ({
        cliente: principal.cliente,
        pedido_ref: principal.pedido_ref || null,
        loja: principal.loja || null,
        categoria: principal.categoria || null,
        tipo_problema: principal.categoria || principal.produto || 'Outros',
        observacoes: principal.descricao || null,
        data_abertura: principal.data_abertura || hoje.toISOString().split('T')[0],
        status: 'Aberto',
        origem: 'excel',
        ...(empresaId ? { empresa_id: empresaId } : {}),
      }))

      try {
        const { data: inseridos, error } = await supabase
          .from('assistencias')
          .upsert(payload, { onConflict: 'pedido_ref,cliente', ignoreDuplicates: false })
          .select('id, cliente, pedido_ref')

        if (error) {
          console.error(`[Import] ❌ Batch ${Math.floor(i / BATCH) + 1}:`, error.code, error.message, error.details)
          erros += lote.length
        } else {
          const itemsPayload = []
          for (let j = 0; j < inseridos.length; j++) {
            for (const row of lote[j].itens) {
              itemsPayload.push({
                assistencia_id: inseridos[j].id,
                descricao: (row.produto || row.categoria || row.descricao || 'Item importado').trim(),
                fornecedor: row.fornecedor || null, status: 'Aberto',
              })
            }
          }
          if (itemsPayload.length) {
            const { error: ie } = await supabase.from('assistencia_itens').insert(itemsPayload)
            if (ie) console.error(`[Import] ❌ Itens batch ${Math.floor(i / BATCH) + 1}:`, ie.code, ie.message)
            else console.log(`[Import] ✅ Batch ${Math.floor(i / BATCH) + 1}: ${inseridos.length} assist + ${itemsPayload.length} itens`)
          }
          criadas += inseridos.length
        }
      } catch (e) { console.error(`[Import] ❌ Exceção batch ${Math.floor(i / BATCH) + 1}:`, e); erros += lote.length }

      done += lote.length
      onProgress?.(Math.min(done, total), total)
    }

    await reload()
    setShowImport(false)
    alert(`Importação: ${criadas} assistências criadas${atualizadas > 0 ? `, ${atualizadas} atualizadas` : ''}${erros > 0 ? `, ${erros} com erro (F12)` : ''}.`)
  }

  if (selectedId) return <AssistenciaDetalhe id={selectedId} onBack={() => { setSelectedId(null); reload() }} />
  if (showRelatorio) return <RelatorioAssistencias onBack={() => setShowRelatorio(false)} />

  return (
    <div className="page">
      <div className="ph">
        <div>
          <h1>Central de Assistências</h1>
          <div className="ph-sub">{stats.ativas} em andamento</div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Btn variant="ghost" size="sm" onClick={() => setShowRelatorio(true)}><Ic n="bar" s={13} /> Relatório</Btn>
          <Btn variant="ghost" size="sm" onClick={() => {
            const url = `${window.location.origin}${window.location.pathname}#/solicitar`
            const txt = encodeURIComponent(`Solicite assistência técnica aqui: ${url}`)
            window.open(`https://wa.me/?text=${txt}`, '_blank')
          }}><Share2 size={13} strokeWidth={1.8} /> WhatsApp</Btn>
          <Btn variant="secondary" size="sm" onClick={() => setShowImport(true)}><Ic n="save" s={13} /> Excel</Btn>
          <Btn size="sm" onClick={() => setShowNew(true)}><Ic n="plus" s={13} /> Nova</Btn>
        </div>
      </div>

      {stats.novas > 0 && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--accent)', background: 'var(--adim)', cursor: 'pointer' }}
          onClick={() => { setSf('Todos'); setBusca('') }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1.5s infinite' }} />
            <div style={{ fontWeight: 600 }}>Novas Solicitações</div>
            <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 12, fontSize: 11, fontWeight: 700, padding: '1px 8px' }}>{stats.novas}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 4 }}>Aguardando aprovação do supervisor</div>
        </div>
      )}

      <div className="stats" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
        {[
          { label: 'Críticas +30d', val: stats.criticas, color: 'var(--red)', bg: 'var(--rdim)' },
          { label: 'Urgentes +20d', val: stats.urgentes, color: 'var(--amber)', bg: 'var(--adim2)' },
          { label: 'Abertas', val: stats.ativas, color: 'var(--accent)', bg: 'var(--adim)' },
        ].map(s => (
          <div className="stat" key={s.label}>
            <div className="stat-val" style={{ color: s.color }}>{loading ? '—' : s.val}</div>
            <div className="stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="fg" style={{ marginBottom: 12 }}>
        <input className="fi" placeholder="Buscar cliente, pedido, loja..." value={busca} onChange={e => setBusca(e.target.value)} />
      </div>
      <div className="filters" style={{ marginBottom: 16 }}>
        {statuses.map(s => <button key={s} className={`fb${sf === s ? ' on' : ''}`} onClick={() => setSf(s)}>{s}</button>)}
      </div>

      {loading ? <Spinner /> : lista.length === 0 ? <Empty icon="🔧" text="Nenhuma assistência encontrada" /> :
        lista.map(a => <AssistenciaCard key={a.id} assistencia={a} onClick={() => setSelectedId(a.id)} />)}
      <Pagination page={page} totalPages={totalPages} total={total} setPage={setPage} />

      {showNew && <NovaAssistenciaModal onClose={() => setShowNew(false)} onSave={handleCreate} />}
      {showImport && <ImportarExcelAssistenciaModal onClose={() => setShowImport(false)} onImport={handleImport} existentes={lista} />}
    </div>
  )
}

export default function Assistencia() {
  if (!podeAcessarModulosOperacionais()) return <SuperAdminSemEmpresa />
  return <AssistenciaInner />
}
