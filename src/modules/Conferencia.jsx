import { useState } from 'react'

import { Camera, Wrench } from 'lucide-react'

import { useData, useAction } from '../hooks/index'
import { pedidosService } from '../services/pedidos'
import { conferenciasService, assistenciasService } from '../services/index'
import { useAuth } from '../context/AuthContext'
import { Btn, Badge, Ic, Alert, Spinner, Empty, Modal } from '../components/ui/index'
import { LeitorCodigoBarras } from '../components/LeitorCodigoBarras'
import { validarTipoImagem } from '../lib/validarTipoImagem'
import { supabase } from '../lib/supabase'
import { toast } from '../lib/toast'

const fmtNPedido = (n) => n ? String(n).padStart(6, '0') : '—'

function gerarPDFConferencia(c) {
  const fotos = c.fotos || {}
  const slots = [['frente', 'Frente'], ['costas', 'Costas'], ['ladoEsq', 'Lado Esq.'], ['ladoDir', 'Lado Dir.']]
  const fotoGrid = slots.map(([k, lbl]) => fotos[k]
    ? `<div style="text-align:center"><div style="font-size:10px;color:#64748b;margin-bottom:3px">${lbl}</div><img src="${fotos[k]}" style="width:100%;height:140px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0"/></div>`
    : `<div style="text-align:center;border:1px dashed #cbd5e1;border-radius:6px;height:140px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px">${lbl}<br/>sem foto</div>`
  ).join('')
  const w = window.open('', '_blank')
  w.document.write(`
    <html><head><title>Conferência #${c.numero_pedido}</title>
    <style>*{box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:24px;color:#1e293b;max-width:800px;margin:0 auto}h1{font-size:17px;margin-bottom:4px}p{font-size:13px;margin:4px 0}.badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;background:${c.resultado === 'Aprovado' ? '#dcfce7;color:#16a34a' : '#fee2e2;color:#dc2626'}}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}</style>
    </head><body>
    <h1>Conferência — Pedido #${c.numero_pedido}</h1>
    <p><span class="badge">${c.resultado || 'Pendente'}</span></p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:10px 0;font-size:13px">
      <p><b>Produto:</b> ${c.produto}</p><p><b>NF:</b> ${c.numero_nf}</p>
      <p><b>Fornecedor:</b> ${c.fornecedor}</p><p><b>Conferente:</b> ${c.conferente_nome}</p>
      <p><b>Data:</b> ${new Date(c.data_hora).toLocaleString('pt-BR')}</p>
    </div>
    ${c.motivo_reprovacao ? `<p><b>Motivo:</b> ${c.motivo_reprovacao}</p>` : ''}
    ${c.descricao_reprovacao ? `<p><b>Descrição:</b> ${c.descricao_reprovacao}</p>` : ''}
    <div style="margin-top:18px;font-size:12px;font-weight:600;color:#475569;border-top:1px solid #e2e8f0;padding-top:12px;margin-bottom:10px">FOTOS DO PRODUTO</div>
    <div class="grid">${fotoGrid}</div>
    <script>window.onload=()=>{window.print()}</script>
    </body></html>
  `)
  w.document.close()
}

function ConferenciaDetalhe({ id, onBack, onEncaminharAssistencia }) {
  const { data: c, loading } = useData(() => conferenciasService.getById(id), [id])
  if (loading) return <div className="page"><Spinner /></div>
  if (!c) return <div className="page"><Empty text="Não encontrado" /></div>
  const fotos = c.fotos || {}
  const slots = [['frente', 'Frente'], ['costas', 'Costas'], ['ladoEsq', 'Lado Esq.'], ['ladoDir', 'Lado Dir.']]
  const temAvaria = c.resultado === 'Reprovado'
  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
        <Btn variant="ghost" size="sm" onClick={onBack}><Ic n="back" s={13} /> Voltar</Btn>
        <div style={{ display: 'flex', gap: 6 }}>
          {temAvaria && onEncaminharAssistencia && (
            <Btn size="sm" style={{ background: 'var(--amber)', color: '#fff' }}
              onClick={() => onEncaminharAssistencia(c)}><Wrench size={13} strokeWidth={1.8} /> Encaminhar p/ Assistência</Btn>
          )}
          <Btn variant="secondary" size="sm" onClick={() => gerarPDFConferencia(c)}><Ic n="pdf" s={13} /> PDF</Btn>
        </div>
      </div>
      <Badge status={c.resultado || 'Pendente'} style={{ marginBottom: 8 }} />
      <h1 style={{ fontSize: 18, marginBottom: 4 }}>{c.produto}</h1>
      <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16 }}>Pedido #{c.numero_pedido} · NF: {c.numero_nf}</div>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="grid2" style={{ fontSize: 13, gap: 10 }}>
          <div><span style={{ color: 'var(--t2)' }}>Fornecedor: </span>{c.fornecedor}</div>
          <div><span style={{ color: 'var(--t2)' }}>Conferente: </span>{c.conferente_nome}</div>
          <div><span style={{ color: 'var(--t2)' }}>Data: </span>{new Date(c.data_hora).toLocaleString('pt-BR')}</div>
          {c.motivo_reprovacao && <div><span style={{ color: 'var(--t2)' }}>Motivo: </span>{c.motivo_reprovacao}</div>}
        </div>
        {c.descricao_reprovacao && <div style={{ marginTop: 12, fontSize: 13, color: 'var(--t2)' }}>{c.descricao_reprovacao}</div>}
      </div>
      {Object.values(fotos).some(Boolean) && (
        <div className="card">
          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 10 }}>Fotos da Conferência</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
            {slots.map(([k, lbl]) => fotos[k] ? (
              <div key={k} style={{ textAlign: 'center' }}>
                <img src={fotos[k]} alt={lbl} loading="lazy" style={{ width: '100%', height: 130, objectFit: 'cover', borderRadius: 8 }} />
                <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 3 }}>{lbl}</div>
              </div>
            ) : null)}
          </div>
        </div>
      )}
    </div>
  )
}

function FotoCaptura({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <label style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'center' }}>{label}</label>
      {value ? (
        <div style={{ position: 'relative' }}>
          <img src={value.preview} alt={label} style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 8, border: '2px solid var(--green)' }} />
          <button onClick={() => onChange(null)} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: 'var(--red)', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
      ) : (
        <label style={{ width: 90, height: 90, borderRadius: 8, border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 4 }}>
          <Camera size={20} color="var(--t3)" strokeWidth={1.5} />
          <span style={{ fontSize: 10, color: 'var(--t3)' }}>Tirar foto</span>
          <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => {
            const f = e.target.files?.[0]
            if (!f) return
            const preview = URL.createObjectURL(f)
            onChange({ file: f, preview })
          }} />
        </label>
      )}
    </div>
  )
}

function NovaConferenciaModal({ onClose, onSave }) {
  const [form, setForm] = useState({ numero_pedido: '', numero_nf: '', produto: '', fornecedor: '', resultado: '', motivo_reprovacao: '', descricao_reprovacao: '' })
  const [fotos, setFotos] = useState({ frente: null, costas: null, ladoEsq: null, ladoDir: null })
  const [saveErr, setSaveErr] = useState('')
  const [buscaPedido, setBuscaPedido] = useState('')
  const [scannerConf, setScannerConf] = useState(false)
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null)
  const [pedidoProdutos, setPedidoProdutos] = useState([])
  const [showDrop, setShowDrop] = useState(false)
  const { run, loading } = useAction()
  const { data: pedidos } = useData(() => pedidosService.list(), [])
  const up = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))
  const setFoto = (k) => (v) => setFotos(prev => ({ ...prev, [k]: v }))
  const todasFotos = fotos.frente && fotos.costas && fotos.ladoEsq && fotos.ladoDir
  const canSave = form.numero_pedido && form.produto && form.fornecedor && form.numero_nf && form.resultado && todasFotos

  const pedidosFiltrados = buscaPedido.length > 1
    ? (pedidos || []).filter(p =>
        p.numero_pedido?.includes(buscaPedido) ||
        p.cliente?.toLowerCase().includes(buscaPedido.toLowerCase())
      ).slice(0, 8)
    : []

  const selecionarPedido = async (p) => {
    setPedidoSelecionado(p)
    setForm(prev => ({ ...prev, numero_pedido: p.numero_pedido }))
    setBuscaPedido(`#${p.numero_pedido} — ${p.cliente}`)
    setShowDrop(false)
    try {
      const full = await pedidosService.getById(p.id)
      setPedidoProdutos(full?.produtos || [])
    } catch { setPedidoProdutos([]) }
  }

  const handleSave = async () => {
    setSaveErr('')
    const tmpId = crypto.randomUUID()
    const fotoUrls = {}
    for (const [slot, foto] of Object.entries(fotos)) {
      if (!foto?.file) continue
      try {
        await validarTipoImagem(foto.file)
        const ext = foto.file.name.split('.').pop() || 'jpg'
        const path = `${tmpId}/${slot}.${ext}`
        const { error } = await supabase.storage.from('conferencias').upload(path, foto.file)
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('conferencias').getPublicUrl(path)
          fotoUrls[slot] = publicUrl
        }
      } catch {}
    }
    try {
      await onSave({ ...form, fotos: fotoUrls, pedido_id: pedidoSelecionado?.id || null })
      toast.success('Conferência salva!')
    } catch (e) {
      setSaveErr(e.message || 'Erro ao salvar. Tente novamente.')
      throw e
    }
  }

  return (
    <Modal
      title="Nova Conferência"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn disabled={!canSave} loading={loading} onClick={() => run(handleSave)}>
            {!todasFotos ? '4 fotos obrigatórias' : 'Salvar'}
          </Btn>
        </>
      }
    >
      {saveErr && <Alert type="error" style={{ marginBottom: 12 }}>{saveErr}</Alert>}
      <div className="fg" style={{ position: 'relative', marginBottom: 8 }}>
        <label className="fl">Buscar pedido *</label>
        <input className="fi"
          value={buscaPedido}
          onChange={e => {
            setBuscaPedido(e.target.value); setShowDrop(true)
            if (!e.target.value) { setPedidoSelecionado(null); setPedidoProdutos([]); setForm(prev => ({ ...prev, numero_pedido: '' })) }
          }}
          placeholder="Digite número ou nome do cliente..."
          onFocus={() => setShowDrop(true)}
          onBlur={() => setTimeout(() => setShowDrop(false), 200)}
        />
        {showDrop && pedidosFiltrados.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, zIndex: 100, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,.25)' }}>
            {pedidosFiltrados.map(p => (
              <div key={p.id} onMouseDown={() => selecionarPedido(p)} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>#{fmtNPedido(p.numero_pedido)}</span> — {p.cliente}
                {p.local_separacao && <span style={{ color: 'var(--t3)', marginLeft: 6, fontSize: 11 }}>{p.local_separacao}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      {pedidoProdutos.length > 0 && (
        <div style={{ background: 'var(--adim)', borderRadius: 8, padding: '10px 12px', marginBottom: 10, fontSize: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--t2)' }}>Produtos do pedido</div>
          {pedidoProdutos.map(pr => (
            <div key={pr.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{pr.nome_produto}</span>
              <span style={{ color: 'var(--t2)' }}>Qtd: {pr.quantidade}</span>
            </div>
          ))}
        </div>
      )}
      <div className="fg"><label className="fl">Nota Fiscal *</label><input className="fi" value={form.numero_nf} onChange={up('numero_nf')} /></div>
      <div className="fg"><label className="fl">Produto *</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <input className="fi" style={{ flex: 1 }} value={form.produto} onChange={up('produto')} />
          <button type="button" className="btn btn-s btn-sm" onClick={() => setScannerConf(true)} title="Escanear código"><Camera size={13} strokeWidth={1.8} /></button>
        </div>
      </div>
      {scannerConf && <LeitorCodigoBarras onScan={code => { setForm(p => ({ ...p, produto: code })); setScannerConf(false) }} onClose={() => setScannerConf(false)} />}
      <div className="fg"><label className="fl">Fornecedor *</label><input className="fi" value={form.fornecedor} onChange={up('fornecedor')} /></div>
      <div className="fg">
        <label className="fl">Resultado *</label>
        <select className="fi" value={form.resultado} onChange={up('resultado')}>
          <option value="">Selecione...</option><option>Aprovado</option><option>Reprovado</option>
        </select>
      </div>
      {form.resultado === 'Reprovado' && (
        <>
          <div className="fg">
            <label className="fl">Motivo</label>
            <select className="fi" value={form.motivo_reprovacao} onChange={up('motivo_reprovacao')}>
              <option value="">Selecione...</option>
              {['Avaria', 'Defeito de fabricação', 'Erro de acabamento', 'Item incorreto', 'Outros'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="fg"><label className="fl">Descrição</label><textarea className="fi" rows={2} value={form.descricao_reprovacao} onChange={up('descricao_reprovacao')} /></div>
        </>
      )}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 10, fontWeight: 500 }}>Fotos do produto * (4 obrigatórias)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          <FotoCaptura label="Frente" value={fotos.frente} onChange={setFoto('frente')} />
          <FotoCaptura label="Costas" value={fotos.costas} onChange={setFoto('costas')} />
          <FotoCaptura label="Lado Esq." value={fotos.ladoEsq} onChange={setFoto('ladoEsq')} />
          <FotoCaptura label="Lado Dir." value={fotos.ladoDir} onChange={setFoto('ladoDir')} />
        </div>
        {!todasFotos && <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 8 }}>⚠ Tire as 4 fotos para habilitar o botão Salvar</div>}
      </div>
    </Modal>
  )
}

export default function Conferencia() {
  const { perfil } = useAuth()
  const [showNew, setShowNew] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const { data: items, loading, reload } = useData(() => conferenciasService.list(), [])

  const handleCreate = async (dados) => {
    try {
      const { pedido_id, ...dadosConf } = dados
      await conferenciasService.create({ ...dadosConf, conferente_nome: perfil?.full_name, data_hora: new Date().toISOString() })
      if (pedido_id) {
        const fotosArr = Object.values(dadosConf.fotos || {}).filter(Boolean)
        try {
          await pedidosService.registrarRecebimentoProduto(pedido_id, perfil, {
            fotos: fotosArr, numeroPedido: dadosConf.numero_pedido, loja: perfil?.loja,
          })
        } catch {}
      }
      await reload()
      setShowNew(false)
      toast.success('Conferência salva com sucesso!')
    } catch (e) {
      console.error('[Conferencia] handleCreate:', e)
      toast.error('Erro ao salvar conferência: ' + (e.message || e.details || 'desconhecido'))
    }
  }

  const handleEncaminhar = async (c) => {
    try {
      await assistenciasService.create({
        cliente: c.numero_pedido ? `Pedido #${c.numero_pedido}` : 'Cliente da conferência',
        pedido_ref: c.numero_pedido || null,
        tipo_problema: c.motivo_reprovacao || 'Avaria',
        observacoes: [c.produto, c.fornecedor && `Fornecedor: ${c.fornecedor}`, c.descricao_reprovacao].filter(Boolean).join(' | '),
        data_abertura: new Date().toISOString().split('T')[0],
        prazo: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        status: 'Aberto',
        origem: 'conferencia',
      })
      toast.success('Assistência aberta com sucesso!')
    } catch (e) {
      console.error('[Conferencia] handleEncaminhar:', e)
      toast.error('Erro ao criar assistência: ' + e.message)
    }
  }

  if (selectedId) return <ConferenciaDetalhe id={selectedId} onBack={() => { setSelectedId(null); reload() }} onEncaminharAssistencia={handleEncaminhar} />

  return (
    <div className="page">
      <div className="ph">
        <h1>Conferência</h1>
        <Btn size="sm" onClick={() => setShowNew(true)}><Ic n="plus" s={13} /> Nova Conferência</Btn>
      </div>
      {loading ? <Spinner /> : (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Pedido</th><th>NF</th><th>Produto</th><th>Fornecedor</th><th>Conferente</th><th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {(items || []).length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--t3)', padding: 32 }}>Nenhuma conferência</td></tr>
                ) : (items || []).map(c => (
                  <tr key={c.id} onClick={() => setSelectedId(c.id)}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>#{c.numero_pedido}</td>
                    <td style={{ fontSize: 12, color: 'var(--t2)' }}>{c.numero_nf}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.produto}</td>
                    <td style={{ fontSize: 12, color: 'var(--t2)' }}>{c.fornecedor}</td>
                    <td style={{ fontSize: 12 }}>{c.conferente_nome}</td>
                    <td><Badge status={c.resultado || 'Pendente'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {showNew && <NovaConferenciaModal onClose={() => setShowNew(false)} onSave={handleCreate} />}
    </div>
  )
}
