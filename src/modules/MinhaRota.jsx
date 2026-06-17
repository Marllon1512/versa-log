import { useState, useEffect, useRef, useCallback } from 'react'

import { Camera } from 'lucide-react'

import { useData, useAction } from '../hooks/index'
import { pedidosService } from '../services/pedidos'
import { produtosService, npsService, localizacoesService } from '../services/index'
import { useAuth } from '../context/AuthContext'
import { Btn, Badge, Ic, Alert, Spinner, Empty } from '../components/ui/index'
import { WaTemplatesModal } from '../components/WaTemplatesModal'
import { toast } from '../lib/toast'

const fmtNPedido = (n) => n ? String(n).padStart(6, '0') : '—'

export default function MinhaRota() {
  const { perfil } = useAuth()
  const hoje = new Date().toISOString().split('T')[0]
  const { data: pedidos, loading, reload } = useData(
    () => pedidosService.list({ entregador_id: perfil?.id, data_entrega: hoje }),
    [perfil?.id, hoje]
  )
  const [active, setActive] = useState(null)
  const [step, setStep] = useState(0)
  const [fotos, setFotos] = useState([])
  const [sigNome, setSigNome] = useState('')
  const [sigDoc, setSigDoc] = useState('')
  const [obs, setObs] = useState('')
  const [checklist, setChecklist] = useState({})
  const [sigDrawn, setSigDrawn] = useState(false)
  const [showWa, setShowWa] = useState(false)
  const { run, loading: actionLoading } = useAction()
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const lastPosRef = useRef(null)

  const { data: produtos } = useData(
    () => active ? produtosService.listByPedido(active.id) : Promise.resolve([]),
    [active?.id]
  )

  const initCanvas = useCallback(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, c.width, c.height)
  }, [])

  useEffect(() => {
    if (step === 2) setTimeout(initCanvas, 150)
  }, [step, initCanvas])

  const getPos = (e, c) => {
    const r = c.getBoundingClientRect()
    const sx = c.width / r.width
    const sy = c.height / r.height
    const cx = e.touches ? e.touches[0].clientX : e.clientX
    const cy = e.touches ? e.touches[0].clientY : e.clientY
    return { x: (cx - r.left) * sx, y: (cy - r.top) * sy }
  }

  const startDraw = (e) => {
    e.preventDefault()
    drawingRef.current = true
    lastPosRef.current = getPos(e, canvasRef.current)
    if (!sigDrawn) setSigDrawn(true)
  }

  const draw = (e) => {
    e.preventDefault()
    if (!drawingRef.current || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    const pos = getPos(e, canvasRef.current)
    ctx.beginPath()
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPosRef.current = pos
  }

  const endDraw = () => { drawingRef.current = false }

  const clearSig = () => { initCanvas(); setSigDrawn(false) }

  const iniciarEntrega = (p) => {
    setActive(p)
    setStep(0)
    setFotos([])
    setSigNome('')
    setSigDoc('')
    setObs('')
    setChecklist({})
    setSigDrawn(false)
  }

  const concluir = () => {
    run(async () => {
      const statusFinal = active.requer_montagem ? 'Aguardando Montagem' : 'Entregue'
      await pedidosService.update(active.id, {
        status: statusFinal,
        hora_fim: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      })
      await pedidosService.addHistorico(active.id, statusFinal, `${statusFinal === 'Aguardando Montagem' ? 'Entregue — aguardando montagem' : 'Concluído'} por ${perfil?.full_name}. Recebido por: ${sigNome}${obs ? `. Obs: ${obs}` : ''}`, perfil)
      if (!active.requer_montagem) {
        try {
          const npsRow = await npsService.create({ pedido_id: active.id, cliente_nome: active.cliente, cliente_telefone: active.telefone, loja: active.local_separacao })
          if (active.telefone && npsRow?.token) {
            const link = `${window.location.origin}${window.location.pathname}#/nps/${npsRow.token}`
            const msg = `Olá ${active.cliente?.split(' ')[0]}! Sua entrega foi realizada. De 0 a 10, como foi sua experiência? ${link}`
            const pending = JSON.parse(localStorage.getItem('nps_pendentes') || '[]')
            pending.push({ waLink: `https://wa.me/55${active.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, cliente: active.cliente, sendAt: Date.now() + 24 * 60 * 60 * 1000 })
            localStorage.setItem('nps_pendentes', JSON.stringify(pending))
            toast.success('NPS agendado para envio em 24h')
          }
        } catch {}
      }
      try { await localizacoesService.upsert(perfil?.id, perfil?.full_name, 0, 0, 'disponivel', null) } catch {}
      reload()
      setActive(null)
    })
  }

  const concluirMontagem = (p) => {
    run(async () => {
      await pedidosService.update(p.id, { status: 'Entregue' })
      await pedidosService.addHistorico(p.id, 'Entregue', `Montagem concluída por ${perfil?.full_name}`, perfil)
      try {
        const npsRow = await npsService.create({ pedido_id: p.id, cliente_nome: p.cliente, cliente_telefone: p.telefone, loja: p.local_separacao })
        if (p.telefone && npsRow?.token) {
          const link = `${window.location.origin}${window.location.pathname}#/nps/${npsRow.token}`
          const msg = `Olá ${p.cliente?.split(' ')[0]}! Sua montagem foi concluída. De 0 a 10, como foi sua experiência? ${link}`
          const pending = JSON.parse(localStorage.getItem('nps_pendentes') || '[]')
          pending.push({ waLink: `https://wa.me/55${p.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, cliente: p.cliente, sendAt: Date.now() + 24 * 60 * 60 * 1000 })
          localStorage.setItem('nps_pendentes', JSON.stringify(pending))
          toast.success('NPS agendado para envio em 24h')
        }
      } catch {}
      reload()
    })
  }

  // Envio de localização a cada 3 min quando em rota
  useEffect(() => {
    if (!active || active.status !== 'Em Rota') return
    let itvl
    const enviarPos = () => {
      if (!navigator.geolocation) return
      navigator.geolocation.getCurrentPosition(pos => {
        localizacoesService.upsert(perfil?.id, perfil?.full_name, pos.coords.latitude, pos.coords.longitude, 'em_rota', active.id).catch(() => {})
      }, () => {})
    }
    enviarPos()
    itvl = setInterval(enviarPos, 3 * 60 * 1000)
    return () => clearInterval(itvl)
  }, [active?.id, active?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  const steps = ['Iniciar', 'Fotos', 'Assinatura', 'Concluir']
  const pendentes = (pedidos || []).filter(p => !['Entregue', 'Aguardando Montagem'].includes(p.status))
  const entregues = (pedidos || []).filter(p => p.status === 'Entregue')
  const montagens = (pedidos || []).filter(p => p.status === 'Aguardando Montagem')

  const checkItems = active ? [
    { id: 'produtos', label: 'Produto(s) conferidos no veículo' },
    { id: 'endereco', label: `Endereço verificado: ${active.endereco}` },
    { id: 'condicao', label: 'Produto em boas condições (sem avaria visível)' },
    ...(active.telefone ? [{ id: 'telefone', label: `Telefone do cliente anotado: ${active.telefone}` }] : []),
  ] : []
  const checklistDone = checkItems.every(i => checklist[i.id])

  if (active) {
    return (
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <Btn variant="ghost" size="sm" onClick={() => setActive(null)}>← Cancelar</Btn>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {active.telefone && (
              <button className="btn btn-s btn-sm" style={{ color: '#25D366', borderColor: '#25D36633' }} onClick={() => setShowWa(true)}>
                <Ic n="wa" s={13} /> WhatsApp
              </button>
            )}
            <div style={{ fontSize: 12, color: 'var(--t2)' }}>Etapa {step + 1}/{steps.length}</div>
          </div>
        </div>
        <div className="steps">{steps.map((_, i) => <div key={i} className={`dot${i === step ? ' on' : i < step ? ' done' : ''}`} />)}</div>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>{active.cliente}</div>
        <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 18 }}>#{active.numero_pedido} · {active.endereco}</div>

        {step === 0 && (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Conferência antes de sair</div>
            {checkItems.map(item => (
              <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: checklist[item.id] ? 'rgba(34,197,94,0.06)' : 'var(--bg1)', border: `1px solid ${checklist[item.id] ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`, borderRadius: 10, marginBottom: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!checklist[item.id]} onChange={e => setChecklist(prev => ({ ...prev, [item.id]: e.target.checked }))} style={{ width: 16, height: 16, accentColor: 'var(--green)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, flex: 1 }}>{item.label}</span>
                {checklist[item.id] && <Ic n="check" s={13} style={{ color: 'var(--green)', flexShrink: 0 }} />}
              </label>
            ))}
            {!checklistDone && (
              <div style={{ fontSize: 12, color: 'var(--t3)', textAlign: 'center', marginBottom: 8 }}>
                Confirme todos os itens acima para liberar o início
              </div>
            )}
            <Btn style={{ width: '100%', justifyContent: 'center', padding: 13, marginTop: 4 }} disabled={!checklistDone || actionLoading} loading={actionLoading}
              onClick={() => run(async () => {
                await pedidosService.update(active.id, { status: 'Em Rota', hora_inicio: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) })
                setStep(1)
              })}>
              ✓ Tudo conferido — Iniciar entrega
            </Btn>
          </div>
        )}

        {step === 1 && (
          <div>
            <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 12 }}>Fotografe cada produto separadamente.</div>
            <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 12 }}>📸 {fotos.length} foto(s) registrada(s)</div>
            {(produtos || []).length > 0 ? (produtos || []).map(pr => (
              <div key={pr.id} className="card-sm" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{pr.nome_produto}</div>
                  <div style={{ fontSize: 12, color: 'var(--t2)' }}>Qtd: {pr.quantidade}</div>
                </div>
                <Btn variant={fotos.some(f => f.startsWith(`foto_${pr.id}`)) ? 'success' : 'secondary'} size="sm"
                  onClick={() => setFotos(prev => [...prev, `foto_${pr.id}_${Date.now()}`])}>
                  <Ic n="cam" s={13} /> {fotos.some(f => f.startsWith(`foto_${pr.id}`)) ? '✓ OK' : 'Foto'}
                </Btn>
              </div>
            )) : (
              <div className="upload-zone" style={{ marginBottom: 12 }} onClick={() => setFotos(prev => [...prev, `foto_${Date.now()}`])}>
                <Camera size={26} color="var(--t3)" strokeWidth={1.5} style={{ marginBottom: 8 }} />
                <div>Toque para fotografar</div>
              </div>
            )}
            <Btn style={{ width: '100%', justifyContent: 'center', padding: 13, marginTop: 8 }} disabled={fotos.length === 0} onClick={() => setStep(2)}>
              Continuar ({fotos.length} foto{fotos.length !== 1 ? 's' : ''})
            </Btn>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="grid2" style={{ marginBottom: 12 }}>
              <div className="fg"><label className="fl">Nome do recebedor *</label><input className="fi" value={sigNome} onChange={e => setSigNome(e.target.value)} placeholder="Nome completo" /></div>
              <div className="fg"><label className="fl">CPF / RG</label><input className="fi" value={sigDoc} onChange={e => setSigDoc(e.target.value)} placeholder="000.000.000-00" /></div>
            </div>
            <div className="fg">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="fl" style={{ margin: 0 }}>Assinatura do cliente *</label>
                <button className="btn btn-g btn-sm" onClick={clearSig}>Limpar</button>
              </div>
              <canvas
                ref={canvasRef}
                width={600}
                height={140}
                className="sig-canvas"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
              <div style={{ fontSize: 11, marginTop: 4, color: sigDrawn ? 'var(--green)' : 'var(--t3)' }}>
                {sigDrawn ? '✓ Assinatura registrada' : 'Assine com o dedo ou mouse'}
              </div>
            </div>
            {sigNome && !sigDrawn && (
              <Alert type="warning" style={{ marginBottom: 10 }}>A assinatura do cliente é obrigatória para concluir a entrega.</Alert>
            )}
            <Btn style={{ width: '100%', justifyContent: 'center', padding: 13 }} disabled={!sigNome || !sigDrawn} onClick={() => setStep(3)}>
              Continuar
            </Btn>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="fg">
              <label className="fl">Observações (opcional)</label>
              <textarea className="fi" rows={3} value={obs} onChange={e => setObs(e.target.value)} placeholder="Ex: produto entregue na portaria..." />
            </div>
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>Resumo da entrega</div>
              <div style={{ fontSize: 13, color: 'var(--t2)' }}>📸 {fotos.length} foto(s)</div>
              <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 4 }}>✍ Recebido por: {sigNome}{sigDoc ? ` (${sigDoc})` : ''}</div>
              {obs && <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 4 }}>💬 {obs}</div>}
            </div>
            <Btn style={{ width: '100%', justifyContent: 'center', padding: 13, background: 'var(--green)' }} loading={actionLoading} onClick={concluir}>
              ✓ Concluir entrega
            </Btn>
          </div>
        )}

        {showWa && <WaTemplatesModal pedido={active} tipo="entregador" onClose={() => setShowWa(false)} />}
      </div>
    )
  }

  return (
    <div className="page">
      <div className="ph">
        <div>
          <h1>Minha Rota</h1>
          <div className="ph-sub">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
        <Btn variant="secondary" size="sm" onClick={reload}><Ic n="refresh" s={13} /></Btn>
      </div>

      {loading ? <Spinner /> : (
        <>
          {pendentes.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--t2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Pendentes ({pendentes.length})
              </div>
              {pendentes.map(p => (
                <div className="li" key={p.id}>
                  <div className="li-main">
                    <div className="li-title">{p.cliente}</div>
                    <div className="li-sub">#{fmtNPedido(p.numero_pedido)} · {p.endereco}</div>
                  </div>
                  <Btn size="sm" onClick={() => iniciarEntrega(p)}>Iniciar</Btn>
                </div>
              ))}
            </>
          )}
          {montagens.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--orange, #f97316)', margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Aguardando Montagem ({montagens.length})
              </div>
              {montagens.map(p => (
                <div className="card" key={p.id} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.cliente}</div>
                    <div style={{ fontSize: 12, color: 'var(--t2)' }}>#{fmtNPedido(p.numero_pedido)} · {p.endereco}</div>
                  </div>
                  <Btn size="sm" style={{ background: 'var(--orange,#f97316)', color: '#fff' }} loading={actionLoading} onClick={() => concluirMontagem(p)}>
                    ✓ Montagem feita
                  </Btn>
                </div>
              ))}
            </>
          )}
          {entregues.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--t2)', margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Entregues ({entregues.length})
              </div>
              {entregues.map(p => (
                <div className="li" key={p.id} style={{ opacity: 0.6, cursor: 'default' }}>
                  <div className="li-main">
                    <div className="li-title">{p.cliente}</div>
                    <div className="li-sub">#{fmtNPedido(p.numero_pedido)}</div>
                  </div>
                  <Badge status="Entregue" />
                </div>
              ))}
            </>
          )}
          {(pedidos || []).length === 0 && <Empty icon="🚚" text="Nenhuma entrega atribuída para hoje" />}
        </>
      )}
    </div>
  )
}
