import { useState } from 'react'
import { useData } from '../hooks/index'
import { npsService } from '../services/index'
import { Spinner, Empty } from '../components/ui/index'

export default function Nps() {
  const { data: lista, loading } = useData(() => npsService.list(), [])
  const [mesFiltro, setMesFiltro] = useState('')

  const filtrado = mesFiltro ? (lista||[]).filter(n => n.respondido_em?.startsWith(mesFiltro)) : (lista||[]).filter(n => n.nota !== null && n.nota !== undefined)
  const respondidos = filtrado.filter(n => n.nota !== null && n.nota !== undefined)
  const promotores  = respondidos.filter(n => n.nota >= 9).length
  const neutros     = respondidos.filter(n => n.nota >= 7 && n.nota <= 8).length
  const detratores  = respondidos.filter(n => n.nota <= 6).length
  const npsScore    = respondidos.length ? Math.round(((promotores - detratores) / respondidos.length) * 100) : null

  const COR = { promotor:'var(--green)', neutro:'var(--amber)', detrator:'var(--red)' }

  if (loading) return <Spinner />
  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'center' }}>
        <input className="fi" type="month" value={mesFiltro} onChange={e=>setMesFiltro(e.target.value)} style={{ width:'auto' }} placeholder="Filtrar por mês" />
        {mesFiltro && <button className="btn btn-s btn-sm" onClick={()=>setMesFiltro('')}>Limpar</button>}
      </div>
      <div className="stats" style={{ marginBottom:16 }}>
        <div className="stat">
          <div className="stat-n" style={{ color: npsScore === null ? 'var(--t2)' : npsScore >= 50 ? 'var(--green)' : npsScore >= 0 ? 'var(--amber)' : 'var(--red)', fontSize:26 }}>
            {npsScore === null ? '—' : npsScore}
          </div>
          <div className="stat-l">NPS Score</div>
        </div>
        <div className="stat"><div className="stat-n" style={{ color:'var(--green)' }}>{promotores}</div><div className="stat-l">Promotores</div></div>
        <div className="stat"><div className="stat-n" style={{ color:'var(--amber)' }}>{neutros}</div><div className="stat-l">Neutros</div></div>
        <div className="stat"><div className="stat-n" style={{ color:'var(--red)' }}>{detratores}</div><div className="stat-l">Detratores</div></div>
      </div>
      {respondidos.length > 0 && (
        <div style={{ display:'flex', gap:4, height:8, borderRadius:4, overflow:'hidden', marginBottom:16 }}>
          <div style={{ flex:promotores, background:'var(--green)' }} />
          <div style={{ flex:neutros, background:'var(--amber)' }} />
          <div style={{ flex:detratores, background:'var(--red)' }} />
        </div>
      )}
      {respondidos.length === 0 ? <Empty text="Nenhuma resposta de NPS ainda" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {respondidos.slice().sort((a,b) => (b.respondido_em||'')>(a.respondido_em||'')?1:-1).map(n => (
            <div key={n.id} className="card" style={{ padding:'10px 14px', borderLeft:`3px solid ${COR[n.classificacao]||'var(--border)'}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                <span style={{ fontWeight:600, fontSize:13 }}>{n.cliente_nome || 'Cliente'} · {n.loja || '—'}</span>
                <span style={{ fontWeight:700, fontSize:18, color: COR[n.classificacao]||'var(--t1)' }}>{n.nota}</span>
              </div>
              {n.comentario && <div style={{ fontSize:12, color:'var(--t2)', fontStyle:'italic' }}>"{n.comentario}"</div>}
              <div style={{ fontSize:11, color:'var(--t3)', marginTop:3 }}>{n.respondido_em ? new Date(n.respondido_em).toLocaleDateString('pt-BR') : '—'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
