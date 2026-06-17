import { useState } from 'react'

import { Trophy, Target } from 'lucide-react'

import { useData, useAction } from '../hooks/index'
import { pedidosService } from '../services/pedidos'
import { metasService, vendasService } from '../services/index'
import { useAuth } from '../context/AuthContext'
import { Spinner, Empty, Modal } from '../components/ui/index'
import { LojaSelect } from '../components/LojaSelect'
import { toast } from '../lib/toast'

const fmtR = (v) => (parseFloat(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function RankingEntregadores() {
  const { data: pedidos, loading } = useData(() => pedidosService.list(), [])
  const map = {}
  ;(pedidos || []).forEach(p => {
    if (!p.entregador_nome) return
    if (!map[p.entregador_nome]) map[p.entregador_nome] = { total: 0, entregues: 0, problemas: 0 }
    map[p.entregador_nome].total++
    if (p.status === 'Entregue') map[p.entregador_nome].entregues++
    if (p.status === 'Problema') map[p.entregador_nome].problemas++
  })
  const rank = Object.entries(map)
    .map(([nome, d]) => ({ nome, ...d, taxa: d.total ? Math.round((d.entregues / d.total) * 100) : 0 }))
    .sort((a, b) => b.taxa - a.taxa)
  const medals = ['gold', 'silver', 'bronze']
  return loading ? <Spinner /> : rank.length === 0 ? <Empty icon="🏆" text="Sem dados suficientes" /> : (
    <>
      {rank.map((r, i) => (
        <div className="rank-item" key={r.nome}>
          <div className={`rank-num${medals[i] ? ' ' + medals[i] : ''}`}>{i + 1}</div>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>{r.nome.charAt(0)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{r.nome}</div>
            <div style={{ fontSize: 12, color: 'var(--t2)' }}>{r.entregues} entregues · {r.problemas} problemas</div>
            <div style={{ marginTop: 5, height: 3, background: 'var(--bg3)', borderRadius: 2 }}>
              <div style={{ width: `${r.taxa}%`, height: '100%', background: r.taxa >= 80 ? 'var(--green)' : r.taxa >= 50 ? 'var(--amber)' : 'var(--red)', borderRadius: 2 }} />
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--mono)', color: r.taxa >= 80 ? 'var(--green)' : r.taxa >= 50 ? 'var(--amber)' : 'var(--red)' }}>{r.taxa}%</div>
        </div>
      ))}
    </>
  )
}

function RankingMetas() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const { data: metas, loading, reload } = useData(() => metasService.list(mes, ano), [mes, ano])
  const { data: vendas } = useData(() => vendasService.list(), [])
  const { isGestor } = useAuth()
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ tipo: 'vendedor', referencia_nome: '', loja: '', valor_meta: '' })
  const act = useAction()
  const up = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const salvar = async () => {
    if (!form.referencia_nome || !form.valor_meta) return toast.error('Preencha todos os campos')
    try {
      await act.run(() => metasService.upsert({ ...form, referencia_id: form.referencia_nome.toLowerCase().replace(/\s/g, '_'), mes, ano, valor_meta: parseFloat(form.valor_meta) || 0 }))
      toast.success('Meta salva'); setModal(null); reload()
    } catch (e) { toast.error(e.message) }
  }

  const calcReal = (m) => {
    const vendsLoja = (vendas || []).filter(v => {
      const d = new Date(v.created_at)
      return d.getMonth() + 1 === mes && d.getFullYear() === ano &&
        (m.tipo === 'loja' ? v.loja === m.referencia_nome : v.vendedor_nome === m.referencia_nome)
    })
    return vendsLoja.reduce((s, v) => s + (parseFloat(v.total) || 0), 0)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <select className="fi" style={{ width: 'auto' }} value={mes} onChange={e => setMes(+e.target.value)}>
          {[...Array(12)].map((_, i) => <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('pt-BR', { month: 'long' })}</option>)}
        </select>
        <input className="fi" type="number" style={{ width: 90 }} value={ano} onChange={e => setAno(+e.target.value)} />
        {isGestor && <button className="btn btn-p btn-sm" onClick={() => { setForm({ tipo: 'vendedor', referencia_nome: '', loja: '', valor_meta: '' }); setModal(true) }}>+ Meta</button>}
      </div>
      {loading ? <Spinner /> : (metas || []).length === 0 ? <Empty text="Nenhuma meta definida" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(metas || []).map(m => {
            const real = calcReal(m)
            const pct = m.valor_meta > 0 ? Math.min(Math.round((real / m.valor_meta) * 100), 100) : 0
            const cor = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)'
            return (
              <div key={m.id} className="card" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{m.referencia_nome}</div>
                    <div style={{ fontSize: 11, color: 'var(--t3)' }}>{m.tipo} · {m.loja}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 13 }}>
                    <div style={{ fontWeight: 700, color: cor }}>{pct}%</div>
                    <div style={{ color: 'var(--t3)' }}>{fmtR(real)} / {fmtR(m.valor_meta)}</div>
                  </div>
                </div>
                <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: cor, borderRadius: 3, transition: 'width .4s' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
      {modal && (
        <Modal title="Nova Meta" onClose={() => setModal(null)}>
          <div className="fg"><label className="fl">Tipo</label>
            <select className="fi" value={form.tipo} onChange={up('tipo')}>
              <option value="vendedor">Vendedor</option>
              <option value="loja">Loja</option>
            </select>
          </div>
          <div className="fg"><label className="fl">Nome</label><input className="fi" value={form.referencia_nome} onChange={up('referencia_nome')} placeholder="Nome do vendedor ou loja" /></div>
          <div className="fg"><label className="fl">Loja</label><LojaSelect value={form.loja} onChange={v => setForm(p => ({ ...p, loja: v }))} /></div>
          <div className="fg"><label className="fl">Valor da Meta (R$)</label><input className="fi" type="number" step="100" value={form.valor_meta} onChange={up('valor_meta')} /></div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-p" style={{ flex: 1 }} onClick={salvar} disabled={act.loading}>{act.loading ? '...' : 'Salvar'}</button>
            <button className="btn btn-s" onClick={() => setModal(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default function Ranking() {
  const [tab, setTab] = useState('ranking')
  return (
    <div className="page">
      <div className="ph"><h1>Ranking</h1></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <button className={`btn btn-${tab === 'ranking' ? 'p' : 's'} btn-sm`} onClick={() => setTab('ranking')} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Trophy size={13} strokeWidth={1.8} /> Entregadores</button>
        <button className={`btn btn-${tab === 'metas' ? 'p' : 's'} btn-sm`} onClick={() => setTab('metas')} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Target size={13} strokeWidth={1.8} /> Metas</button>
      </div>
      {tab === 'ranking' && <RankingEntregadores />}
      {tab === 'metas' && <RankingMetas />}
    </div>
  )
}
