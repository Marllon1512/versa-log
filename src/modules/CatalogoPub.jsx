import { useState, useCallback } from 'react'

import { ShoppingBag } from 'lucide-react'

import { useServerPagination } from '../hooks/index'
import { catalogoService } from '../services/index'
import { Spinner, Empty } from '../components/ui/index'

const fmtR = (v) => (parseFloat(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function Pagination({ page, totalPages, total, setPage }) {
  if (totalPages <= 1 && total < 5) return null
  const pages = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) pages.push(i)
    else if (pages[pages.length - 1] !== '...') pages.push('...')
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
      <button className="btn btn-s btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</button>
      <span className="pagination-desktop" style={{ display: 'flex', gap: 4 }}>
        {pages.map((p, i) => p === '...'
          ? <span key={i} style={{ padding: '0 4px', color: 'var(--t3)' }}>…</span>
          : <button key={p} className={`btn btn-sm ${p === page ? 'btn-p' : 'btn-s'}`} style={{ minWidth: 32 }} onClick={() => setPage(p)}>{p}</button>
        )}
      </span>
      <span className="pagination-mobile" style={{ fontSize: 13, color: 'var(--t2)' }}>Pág. {page}/{totalPages}</span>
      <button className="btn btn-s btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>→</button>
      <span style={{ fontSize: 12, color: 'var(--t3)' }}>({total} registros)</span>
    </div>
  )
}

export default function CatalogoPub() {
  const queryFn = useCallback(
    ({ search, from, to }) => catalogoService.listPaged({ search, from, to }),
    []
  )
  const { data: itens, loading, total, page, setPage, totalPages, search: busca, setSearch: setBusca } = useServerPagination(queryFn)
  const [catFiltro, setCatFiltro] = useState('')
  const categorias = [...new Set((itens || []).map(i => i.categoria).filter(Boolean))]
  const filtrado = catFiltro ? (itens || []).filter(i => i.ativo !== false && i.categoria === catFiltro) : (itens || []).filter(i => i.ativo !== false)
  return (
    <div className="page">
      <div className="ph"><h1>Catálogo Digital</h1></div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input className="fi" style={{ flex: 1, minWidth: 140 }} placeholder="Buscar produto..." value={busca} onChange={e => setBusca(e.target.value)} />
        <select className="fi" style={{ width: 'auto' }} value={catFiltro} onChange={e => setCatFiltro(e.target.value)}>
          <option value="">Todas as categorias</option>
          {categorias.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      {loading ? <Spinner /> : filtrado.length === 0 ? <Empty text="Nenhum produto encontrado" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10 }}>
          {filtrado.map(p => (
            <div key={p.id} className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {p.foto_url
                ? <img src={p.foto_url} alt={p.nome} loading="lazy" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, background: 'var(--bg2)' }} />
                : <div style={{ width: '100%', height: 120, borderRadius: 8, background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShoppingBag size={30} color="var(--t3)" strokeWidth={1.3} /></div>
              }
              <div style={{ fontWeight: 600, fontSize: 13 }}>{p.nome}</div>
              {p.categoria && <div style={{ fontSize: 11, color: 'var(--t2)' }}>{p.categoria}</div>}
              {p.referencia && <div style={{ fontSize: 11, color: 'var(--t3)' }}>Ref: {p.referencia}</div>}
              <div style={{ fontWeight: 700, color: 'var(--green)', fontSize: 15 }}>{fmtR(p.preco_venda)}</div>
              {p.estoque_atual !== undefined && (
                <div style={{ fontSize: 11, color: (p.estoque_atual || 0) > 0 ? 'var(--green)' : 'var(--red)' }}>
                  {(p.estoque_atual || 0) > 0 ? `${p.estoque_atual} em estoque` : 'Indisponível'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} total={total} setPage={setPage} />
    </div>
  )
}
