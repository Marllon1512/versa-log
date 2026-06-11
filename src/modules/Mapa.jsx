import { useState, useEffect } from 'react'

import { Map, Users } from 'lucide-react'

import { useData } from '../hooks/index'
import { pedidosService } from '../services/pedidos'
import { localizacoesService } from '../services/index'
import { Btn, Badge, Ic, Spinner } from '../components/ui/index'

const fmtNPedido = (n) => n ? String(n).padStart(6, '0') : '—'

function MapaEquipe() {
  const { data: equipe, loading, reload } = useData(() => localizacoesService.list(), [])
  const STATUS_COR = { em_rota:'var(--green)', parado:'var(--amber)', disponivel:'var(--t2)' }
  const STATUS_LABEL = { em_rota:'Em Rota', parado:'Parado', disponivel:'Disponível' }

  useEffect(() => {
    const t = setInterval(reload, 3 * 60 * 1000)
    return () => clearInterval(t)
  }, [reload])

  const selEquipe = equipe?.find(e => e.latitude && e.longitude && e.latitude !== 0)
  const mapUrl = selEquipe
    ? `https://maps.google.com/maps?q=${selEquipe.latitude},${selEquipe.longitude}&output=embed`
    : 'https://maps.google.com/maps?q=Belo+Horizonte,MG,Brasil&output=embed'

  return (
    <div>
      {loading ? <Spinner /> : (equipe||[]).length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 16px', color:'var(--t2)' }}>
          <div style={{ fontSize:40, marginBottom:8 }}>📍</div>
          <div>Nenhum membro em campo agora</div>
          <div style={{ fontSize:12, marginTop:4 }}>Localização atualizada a cada 3 minutos quando em rota</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {(equipe||[]).map(e => (
            <div key={e.id} className="card" style={{ display:'flex', gap:12, alignItems:'center', borderLeft:`3px solid ${STATUS_COR[e.status]||'var(--t2)'}` }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, flexShrink:0 }}>
                {e.usuario_nome?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600 }}>{e.usuario_nome}</div>
                <div style={{ fontSize:12, color:'var(--t2)' }}>
                  {STATUS_LABEL[e.status]||e.status} · Atualizado: {new Date(e.updated_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
                </div>
              </div>
              {e.latitude && e.latitude !== 0 && (
                <a href={`https://maps.google.com/?q=${e.latitude},${e.longitude}`} target="_blank" rel="noreferrer">
                  <button className="btn btn-s btn-sm">📍 Ver</button>
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Mapa() {
  const [abaMapa, setAbaMapa] = useState('entregas')
  const hoje = new Date().toISOString().split('T')[0]
  const { data: pedidos, loading, reload } = useData(() => pedidosService.list({ data_entrega: hoje }), [])
  const [sel, setSel] = useState(null)
  const [sf, setSf] = useState('Todos')

  const filtered = (pedidos || []).filter(p => sf === 'Todos' || p.status === sf)
  const mapUrl = sel
    ? `https://maps.google.com/maps?q=${encodeURIComponent((sel.endereco || '') + ', ' + (sel.cidade || 'Belo Horizonte') + ', MG, Brasil')}&output=embed`
    : 'https://maps.google.com/maps?q=Belo+Horizonte,MG,Brasil&output=embed'

  return (
    <div className="page">
      <div className="ph">
        <div><h1>Mapa do Dia</h1><div className="ph-sub">{(pedidos || []).length} entrega(s) hoje</div></div>
        <Btn variant="secondary" size="sm" onClick={reload}><Ic n="refresh" s={13} /> Atualizar</Btn>
      </div>
      <div style={{ display:'flex', gap:6, marginBottom:12 }}>
        <button className={`btn btn-${abaMapa==='entregas'?'p':'s'} btn-sm`} onClick={()=>setAbaMapa('entregas')} style={{display:'flex',alignItems:'center',gap:5}}><Map size={13} strokeWidth={1.8} /> Entregas</button>
        <button className={`btn btn-${abaMapa==='equipe'?'p':'s'} btn-sm`} onClick={()=>setAbaMapa('equipe')} style={{display:'flex',alignItems:'center',gap:5}}><Users size={13} strokeWidth={1.8} /> Equipe em Campo</button>
      </div>
      {abaMapa === 'equipe' ? <MapaEquipe /> : (
        <div className="map-layout">
          <div className="map-list">
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {['Todos', 'Pendente', 'Em Rota', 'Entregue', 'Problema'].map(s => (
                  <button key={s} className={`fb${sf === s ? ' on' : ''}`} style={{ fontSize: 11, padding: '3px 7px' }} onClick={() => setSf(s)}>{s}</button>
                ))}
              </div>
            </div>
            {loading ? <div className="empty" style={{ padding: 24 }}>Carregando...</div> :
              filtered.length === 0 ? <div className="empty" style={{ padding: 24 }}>Nenhuma entrega</div> :
                filtered.map(p => (
                  <div key={p.id} onClick={() => setSel(p)} style={{ padding: '11px 13px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: sel?.id === p.id ? 'var(--bg2)' : 'transparent', borderLeft: `3px solid ${sel?.id === p.id ? 'var(--accent)' : 'transparent'}`, transition: 'all .15s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{p.cliente?.split(' ').slice(0, 2).join(' ')}</div>
                      <Badge status={p.status} style={{ fontSize: 10 }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t2)' }}>#{fmtNPedido(p.numero_pedido)}</div>
                    <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{p.endereco}</div>
                  </div>
                ))}
          </div>
          <div style={{ background: 'var(--bg2)' }}>
            <iframe src={mapUrl} allowFullScreen loading="lazy" title="Mapa de entregas" style={{ width: '100%', height: '100%', border: 'none' }} />
          </div>
        </div>
      )}
    </div>
  )
}
