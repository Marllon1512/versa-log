import { useState, useEffect } from 'react'

import { Truck, Wrench, Map, Users, Camera } from 'lucide-react'

import { useData, useAction } from '../hooks/index'
import { pedidosService } from '../services/pedidos'
import { assistenciasService } from '../services/index'
import { useAuth } from '../context/AuthContext'
import { Btn, Badge, Ic, Spinner, Empty, Modal } from '../components/ui/index'
import { LojaSelect } from '../components/LojaSelect'
import { LeitorCodigoBarras } from '../components/LeitorCodigoBarras'
import { supabase } from '../lib/supabase'
import { toast } from '../lib/toast'

const fmtNPedido = (n) => n ? String(n).padStart(6, '0') : '—'

function gerarPDFRoteiro(roteiro, itens) {
  const data = roteiro.data ? new Date(roteiro.data + 'T12:00').toLocaleDateString('pt-BR') : '—'
  const rows = itens.map((item, i) => `<tr><td style="text-align:center">${i + 1}</td><td>${item.loja || ''}</td><td>${item.pedido_ref || ''}</td><td>${item.cliente || ''}</td><td>${item.bairro || ''}</td><td>${item.status_servico || ''}</td><td style="text-align:center">${item.concluido ? '✓' : ''}</td></tr>`).join('')
  const w = window.open('', '_blank')
  w.document.write(`<html><head><title>Roteiro ${data}</title><style>body{font-family:Arial,sans-serif;padding:20px;font-size:12px}.header{background:#fbbf24;padding:10px 14px;font-weight:bold;font-size:15px;text-align:center;letter-spacing:.05em}.info{display:flex;gap:32px;padding:8px 14px;border:1px solid #ccc;border-top:none;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:6px}th{background:#fbbf24;padding:6px 8px;text-align:left;border:1px solid #ccc;font-size:11px;font-weight:bold}td{padding:5px 8px;border:1px solid #ccc}tr:nth-child(even){background:#f9f9f9}</style></head><body>
  <div class="header">ROTEIRO DIÁRIO</div>
  <div class="info"><span><b>DATA:</b> ${data}</span><span><b>SAÍDA:</b> ${roteiro.hora_saida || '__:__'}</span><span><b>TÉRMINO:</b> ${roteiro.hora_termino || '__:__'}</span></div>
  <div class="info"><span><b>MOTORISTA:</b> ${roteiro.motorista_nome || '—'}</span><span><b>ENTREGADORES:</b> ${[roteiro.montador_nome, roteiro.entregadores_extra].filter(Boolean).join(' / ') || '—'}</span></div>
  <table><thead><tr><th>QTD</th><th>LOJA</th><th>PEDIDO</th><th>CLIENTE</th><th>BAIRRO</th><th>SERVIÇO</th><th>STATUS</th></tr></thead><tbody>${rows}</tbody></table>
  <script>window.onload=()=>{window.print()}</script></body></html>`)
  w.document.close()
}

function RoteiroDetalhe({ id, onBack }) {
  const { isGestor, empresaId } = useAuth()
  const [roteiro, setRoteiro] = useState(null)
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [scannerRot, setScannerRot] = useState(false)

  const carregar = () => {
    let q = supabase.from('roteiros').select('*').eq('id', id)
    if (empresaId) q = q.eq('empresa_id', empresaId)
    q.single().then(({ data: r }) => {
      setRoteiro(r)
      supabase.from('roteiro_itens').select('*').eq('roteiro_id', id).order('ordem')
        .then(({ data: items }) => { setItens(items || []); setLoading(false) })
    })
  }

  useEffect(() => { carregar() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const registrarHora = async (campo) => {
    const hora = new Date().toTimeString().slice(0, 5)
    setSaving(true)
    try {
      const novoStatus = campo === 'hora_saida' ? 'em_andamento' : 'concluído'
      let qRot = supabase.from('roteiros').update({ [campo]: hora, status: novoStatus }).eq('id', id)
      if (empresaId) qRot = qRot.eq('empresa_id', empresaId)
      const { error } = await qRot
      if (error) throw error
      setRoteiro(prev => ({ ...prev, [campo]: hora, status: novoStatus }))
      toast.success(campo === 'hora_saida' ? `Saída registrada: ${hora}` : `Término registrado: ${hora}`)
    } catch (e) { console.error('[Roteiro] registrarHora:', e); toast.error('Erro: ' + e.message) }
    setSaving(false)
  }

  const baixarParada = async (itemId) => {
    const hora = new Date().toTimeString().slice(0, 5)
    setSaving(true)
    try {
      const { error } = await supabase.from('roteiro_itens').update({ concluido: true, hora_conclusao: hora }).eq('id', itemId)
      if (error) throw error
      setItens(prev => prev.map(it => it.id === itemId ? { ...it, concluido: true, hora_conclusao: hora } : it))
      toast.success('Parada concluída!')
    } catch (e) { console.error('[Roteiro] baixarParada:', e); toast.error('Erro: ' + e.message) }
    setSaving(false)
  }

  const moverItem = async (idx, dir) => {
    const arr = [...itens]; const swap = idx + dir
    if (swap < 0 || swap >= arr.length) return
    ;[arr[idx], arr[swap]] = [arr[swap], arr[idx]]
    setItens(arr)
    await supabase.from('roteiro_itens').update({ ordem: swap + 1 }).eq('id', arr[swap].id)
    await supabase.from('roteiro_itens').update({ ordem: idx + 1 }).eq('id', arr[idx].id)
  }

  if (loading) return <div className="page"><Spinner /></div>
  if (!roteiro) return <div className="page"><Empty text="Roteiro não encontrado" /></div>

  const concluidos = itens.filter(it => it.concluido).length

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
        <Btn variant="ghost" size="sm" onClick={onBack}><Ic n="back" s={13} /> Voltar</Btn>
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn size="sm" variant="secondary" onClick={() => setScannerRot(true)}><Camera size={13} strokeWidth={1.8} /> Escanear</Btn>
          <Btn variant="secondary" size="sm" onClick={() => gerarPDFRoteiro(roteiro, itens)}><Ic n="pdf" s={13} /> Imprimir</Btn>
        </div>
      </div>
      {scannerRot && <LeitorCodigoBarras onScan={code => {
        const match = itens.find(it => !it.concluido && (String(it.pedido_ref) === code || it.cliente?.toLowerCase().includes(code.toLowerCase())))
        if (match) baixarParada(match.id)
        else toast.error('Parada não encontrada: ' + code)
        setScannerRot(false)
      }} onClose={() => setScannerRot(false)} />}

      <h1 style={{ fontSize: 18, marginBottom: 4 }}>
        Roteiro — {roteiro.data ? new Date(roteiro.data + 'T12:00').toLocaleDateString('pt-BR') : '—'}
      </h1>
      <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Truck size={14} strokeWidth={1.7} /> {roteiro.motorista_nome || '—'}{roteiro.montador_nome ? <><Users size={13} strokeWidth={1.7} style={{ marginLeft: 6 }} /> {roteiro.montador_nome}</> : ''}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="grid2" style={{ gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>SAÍDA</div>
            {roteiro.hora_saida ? (
              <div style={{ fontWeight: 700, fontSize: 22, color: 'var(--green)' }}>{roteiro.hora_saida}</div>
            ) : (
              <Btn size="sm" style={{ background: 'var(--green)', color: '#fff' }} loading={saving} onClick={() => registrarHora('hora_saida')}>Registrar Saída</Btn>
            )}
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>TÉRMINO</div>
            {roteiro.hora_termino ? (
              <div style={{ fontWeight: 700, fontSize: 22, color: 'var(--accent)' }}>{roteiro.hora_termino}</div>
            ) : (
              <Btn size="sm" variant="secondary" disabled={!roteiro.hora_saida} loading={saving} onClick={() => registrarHora('hora_termino')}>Registrar Término</Btn>
            )}
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--t3)' }}>{concluidos}/{itens.length} paradas concluídas</div>
      </div>

      <div style={{ fontWeight: 600, marginBottom: 12 }}>Paradas ({itens.length})</div>
      {itens.map((item, idx) => (
        <div key={item.id} style={{ background: item.concluido ? 'rgba(34,197,94,0.05)' : 'var(--bg1)', border: `1px solid ${item.concluido ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`, borderRadius: 12, padding: 14, marginBottom: 10, opacity: item.concluido ? 0.75 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: item.concluido ? 'var(--green)' : 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, color: item.concluido ? '#fff' : 'var(--t2)', marginTop: 2 }}>
                {item.concluido ? '✓' : idx + 1}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{item.cliente}</div>
                <div style={{ fontSize: 12, color: 'var(--t2)' }}>{item.loja ? `${item.loja} · ` : ''}{item.pedido_ref ? `#${item.pedido_ref} · ` : ''}{item.bairro}</div>
                <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>{item.status_servico}</div>
                {item.concluido && item.hora_conclusao && <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2 }}>✓ Concluído às {item.hora_conclusao}</div>}
              </div>
            </div>
            {!item.concluido && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
                {isGestor && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-g btn-ico btn-sm" onClick={() => moverItem(idx, -1)} disabled={idx === 0}>↑</button>
                    <button className="btn btn-g btn-ico btn-sm" onClick={() => moverItem(idx, 1)} disabled={idx === itens.length - 1}>↓</button>
                  </div>
                )}
                <Btn size="sm" loading={saving} onClick={() => baixarParada(item.id)}>✓ Baixa</Btn>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function NovoRoteiroModal({ onClose, onSave, tipo = 'entregas' }) {
  const { data: assistencias } = useData(() => assistenciasService.list(), [])
  const { data: pedidos } = useData(() => pedidosService.list(), [])
  const [form, setForm] = useState({ data: new Date().toISOString().split('T')[0], motorista_nome: '' })
  const [entregadores, setEntregadores] = useState(['', '', '', '', ''])
  const [itens, setItens] = useState([])
  const [step, setStep] = useState(0)
  const { run, loading } = useAction()

  const up = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))
  const upEnt = (i, v) => setEntregadores(prev => prev.map((e, idx) => idx === i ? v : e))
  const TIPOS_SERVICO = ['Coleta', 'Vistoria', 'Retoque', 'Visita Técnica', 'Entrega e Instalação', 'Troca', 'Outros']

  const separadosAgendados = (pedidos || []).filter(p => p.status_fluxo === 'separado' && p.data_entrega_agendada === form.data)
  const separadosSemData = (pedidos || []).filter(p => p.status_fluxo === 'separado' && !p.data_entrega_agendada)

  const irParaStep1 = () => {
    if (tipo === 'entregas' && separadosAgendados.length > 0) {
      setItens(prev => {
        const existingRefs = new Set(prev.map(it => it.pedido_ref).filter(Boolean))
        const novos = separadosAgendados
          .filter(p => !existingRefs.has(p.numero_pedido))
          .map(p => ({ assistencia_id: null, pedido_ref: p.numero_pedido, cliente: p.cliente, loja: p.local_separacao || '', bairro: p.cidade || '', status_servico: 'Entrega e Instalação' }))
        return [...prev, ...novos]
      })
    }
    setStep(1)
  }

  const addAssistencia = (a) => {
    if (itens.find(it => it.assistencia_id === a.id)) return
    setItens(prev => [...prev, { assistencia_id: a.id, cliente: a.cliente, pedido_ref: a.pedido_ref || '', loja: a.loja || '', bairro: '', status_servico: 'Visita Técnica' }])
  }
  const addSeparado = (p) => {
    if (itens.find(it => it.pedido_ref === p.numero_pedido)) return
    setItens(prev => [...prev, { assistencia_id: null, pedido_ref: p.numero_pedido, cliente: p.cliente, loja: p.local_separacao || '', bairro: p.cidade || '', status_servico: 'Entrega e Instalação' }])
  }
  const addManual = () => setItens(prev => [...prev, { assistencia_id: null, cliente: '', pedido_ref: '', loja: '', bairro: '', status_servico: tipo === 'entregas' ? 'Entrega e Instalação' : 'Visita Técnica' }])

  const upItem = (idx, k, v) => setItens(prev => prev.map((it, i) => i === idx ? { ...it, [k]: v } : it))
  const remItem = (idx) => setItens(prev => prev.filter((_, i) => i !== idx))
  const mover = (idx, dir) => {
    const arr = [...itens]; const swap = idx + dir
    if (swap < 0 || swap >= arr.length) return
    ;[arr[idx], arr[swap]] = [arr[swap], arr[idx]]; setItens(arr)
  }

  const abertas = (assistencias || []).filter(a => !['Concluído', 'Cancelado'].includes(a.status))

  return (
    <Modal
      title={tipo === 'assistencias' ? 'Novo Roteiro de Assistências' : 'Novo Roteiro de Entregas'}
      subtitle={`Etapa ${step + 1} de 2 — ${['Dados gerais', 'Paradas'][step]}`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          {step > 0 && <Btn variant="secondary" onClick={() => setStep(0)}>← Voltar</Btn>}
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          {step === 0 && <Btn disabled={!form.data || !form.motorista_nome || !entregadores[0]} onClick={irParaStep1}>Continuar →</Btn>}
          {step === 1 && <Btn disabled={itens.length === 0} loading={loading} onClick={() => {
            const ents = entregadores.filter(Boolean)
            const saveData = { ...form, montador_nome: ents[0] || '', entregadores_extra: ents.slice(1).join(' / ') || '', itens }
            run(() => onSave(saveData))
          }}>✓ Criar Roteiro</Btn>}
        </>
      }
    >
      {step === 0 && (
        <>
          <div className="fg"><label className="fl">Data *</label><input className="fi" type="date" value={form.data} onChange={up('data')} /></div>
          <div className="fg"><label className="fl">Motorista *</label><input className="fi" value={form.motorista_nome} onChange={up('motorista_nome')} placeholder="Nome do motorista" /></div>
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 8, fontWeight: 500 }}>Entregadores / Técnicos (até 5)</div>
            {entregadores.map((ent, i) => (
              <div key={i} className="fg" style={{ marginBottom: 6 }}>
                <input className="fi" value={ent} onChange={e => upEnt(i, e.target.value)} placeholder={`Entregador ${i + 1}${i === 0 ? ' *' : ' (opcional)'}`} />
              </div>
            ))}
          </div>
        </>
      )}
      {step === 1 && (
        <>
          {tipo === 'assistencias' && abertas.length > 0 && (
            <>
              <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>Assistências abertas (clique para adicionar):</div>
              <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 8, marginBottom: 12 }}>
                {abertas.map(a => {
                  const adicionada = !!itens.find(it => it.assistencia_id === a.id)
                  return (
                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 4px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 12 }}>
                        <span style={{ fontWeight: 500 }}>{a.cliente}</span>
                        {a.pedido_ref && <span style={{ color: 'var(--t3)', marginLeft: 6 }}>#{a.pedido_ref}</span>}
                      </div>
                      <Btn size="sm" variant={adicionada ? 'secondary' : 'primary'} onClick={() => addAssistencia(a)} disabled={adicionada}>{adicionada ? '✓' : '+'}</Btn>
                    </div>
                  )
                })}
              </div>
            </>
          )}
          {tipo === 'entregas' && separadosSemData.length > 0 && (
            <>
              <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8, color: 'var(--amber)' }}>⚠ Separados sem data agendada</div>
              <div style={{ maxHeight: 140, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 8, marginBottom: 12 }}>
                {separadosSemData.map(p => {
                  const adicionado = !!itens.find(it => it.pedido_ref === p.numero_pedido)
                  return (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 4px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 12 }}>
                        <span style={{ fontWeight: 500 }}>#{fmtNPedido(p.numero_pedido)}</span> — {p.cliente}
                        {p.local_separacao && <span style={{ color: 'var(--t3)', marginLeft: 6 }}>{p.local_separacao}</span>}
                      </div>
                      <Btn size="sm" variant={adicionado ? 'secondary' : 'primary'} onClick={() => addSeparado(p)} disabled={adicionado}>{adicionado ? '✓' : '+'}</Btn>
                    </div>
                  )
                })}
              </div>
            </>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 500, fontSize: 13 }}>Paradas ({itens.length})</div>
            <Btn variant="secondary" size="sm" onClick={addManual}><Ic n="plus" s={12} /> Adicionar manual</Btn>
          </div>
          {itens.length === 0 && <div style={{ fontSize: 12, color: 'var(--t3)', textAlign: 'center', padding: 16 }}>Adicione paradas acima</div>}
          {itens.map((item, idx) => (
            <div key={idx} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>#{idx + 1}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-g btn-ico btn-sm" onClick={() => mover(idx, -1)} disabled={idx === 0}>↑</button>
                  <button className="btn btn-g btn-ico btn-sm" onClick={() => mover(idx, 1)} disabled={idx === itens.length - 1}>↓</button>
                  <button className="btn btn-g btn-ico btn-sm" style={{ color: 'var(--red)' }} onClick={() => remItem(idx)}><Ic n="trash" s={11} /></button>
                </div>
              </div>
              <div className="grid2" style={{ gap: 6 }}>
                <div className="fg" style={{ marginBottom: 0 }}><label className="fl">Cliente *</label><input className="fi" value={item.cliente} onChange={e => upItem(idx, 'cliente', e.target.value)} /></div>
                <div className="fg" style={{ marginBottom: 0 }}><label className="fl">Pedido</label><input className="fi" value={item.pedido_ref} onChange={e => upItem(idx, 'pedido_ref', e.target.value)} /></div>
                <div className="fg" style={{ marginBottom: 0 }}><label className="fl">Loja</label><LojaSelect value={item.loja} onChange={v => upItem(idx, 'loja', v)} /></div>
                <div className="fg" style={{ marginBottom: 0 }}><label className="fl">Bairro</label><input className="fi" value={item.bairro} onChange={e => upItem(idx, 'bairro', e.target.value)} /></div>
              </div>
              <div className="fg" style={{ marginBottom: 0, marginTop: 6 }}>
                <label className="fl">Tipo de Serviço</label>
                <select className="fi" value={item.status_servico} onChange={e => upItem(idx, 'status_servico', e.target.value)}>
                  {TIPOS_SERVICO.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
          ))}
        </>
      )}
    </Modal>
  )
}

export default function Roteiro() {
  const { isGestor, empresaId } = useAuth()
  const [roteiros, setRoteiros] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNovo, setShowNovo] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [tipoTab, setTipoTab] = useState('entregas')

  const carregar = () => {
    setLoading(true)
    let q = supabase.from('roteiros').select('*, roteiro_itens(*)').order('data', { ascending: false })
    if (empresaId) q = q.eq('empresa_id', empresaId)
    q.then(({ data }) => { setRoteiros(data || []); setLoading(false) })
  }

  useEffect(() => { carregar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const criar = async (dados) => {
    try {
      const { itens, ...roteiro } = dados
      const { data: novo, error } = await supabase.from('roteiros').insert({ ...roteiro, tipo: tipoTab, status: 'planejado', created_at: new Date().toISOString(), ...(empresaId ? { empresa_id: empresaId } : {}) }).select().single()
      if (error) throw error
      if (novo && itens?.length) {
        const { error: eiErr } = await supabase.from('roteiro_itens').insert(itens.map((item, i) => ({ ...item, roteiro_id: novo.id, ordem: i + 1, concluido: false })))
        if (eiErr) throw eiErr
      }
      carregar(); setShowNovo(false)
      toast.success('Roteiro criado com sucesso!')
    } catch (e) {
      console.error('[Roteiro] criar:', e)
      toast.error('Erro ao criar roteiro: ' + (e.message || 'desconhecido'))
    }
  }

  if (selectedId) return <RoteiroDetalhe id={selectedId} onBack={() => { setSelectedId(null); carregar() }} />

  const filtrados = roteiros.filter(r => (r.tipo || 'entregas') === tipoTab)

  return (
    <div className="page">
      <div className="ph">
        <div>
          <h1>Roteiro Diário</h1>
          <div className="ph-sub">{filtrados.length} roteiro(s)</div>
        </div>
        {isGestor && <Btn size="sm" onClick={() => setShowNovo(true)}><Ic n="plus" s={13} /> Novo</Btn>}
      </div>

      <div className="filters" style={{ marginBottom: 16 }}>
        <button className={`fb${tipoTab === 'entregas' ? ' on' : ''}`} onClick={() => setTipoTab('entregas')} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Truck size={13} strokeWidth={1.8} /> Roteiro de Entregas</button>
        <button className={`fb${tipoTab === 'assistencias' ? ' on' : ''}`} onClick={() => setTipoTab('assistencias')} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Wrench size={13} strokeWidth={1.8} /> Roteiro de Assistências</button>
      </div>

      {loading ? <Spinner /> : filtrados.length === 0 ? <Empty icon="🗺️" text={`Nenhum roteiro de ${tipoTab === 'entregas' ? 'entregas' : 'assistências'}`} /> :
        filtrados.map(r => (
          <div key={r.id} className="li" onClick={() => setSelectedId(r.id)}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--t2)' }}>
              {r.tipo === 'assistencias' ? <Wrench size={17} strokeWidth={1.6} /> : <Map size={17} strokeWidth={1.6} />}
            </div>
            <div className="li-main">
              <div className="li-title">Roteiro {r.data ? new Date(r.data + 'T12:00').toLocaleDateString('pt-BR') : '—'}</div>
              <div className="li-sub">{r.motorista_nome || '—'}{r.montador_nome ? ` · ${r.montador_nome}` : ''} {r.entregadores_extra ? `· ${r.entregadores_extra}` : ''}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{(r.roteiro_itens || []).length} parada(s)</div>
            </div>
            <Badge status={r.status === 'planejado' ? 'Pendente' : r.status === 'em_andamento' ? 'Em Rota' : 'Entregue'} />
            <Ic n="chev" s={13} style={{ color: 'var(--t3)' }} />
          </div>
        ))
      }

      {showNovo && <NovoRoteiroModal onClose={() => setShowNovo(false)} onSave={criar} tipo={tipoTab} />}
    </div>
  )
}
