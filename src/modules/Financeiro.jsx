import React, { useState, useEffect, useCallback, Suspense } from 'react'

import { FileText, Trash2, Edit2 } from 'lucide-react'

import { useData, useAction, useServerPagination } from '../hooks/index'
import { useAuth } from '../context/AuthContext'
import { useEffectiveLoja } from '../hooks/useEffectiveLoja'
import { useLojaFiltro } from '../context/LojaContext'
import { LojaSelect } from '../components/LojaSelect'
import { Badge, Modal, Spinner, Empty, Alert } from '../components/ui/index'
import { toast } from '../lib/toast'
import { podeAcessarModulosOperacionais } from '../lib/empresaContext'
import { SuperAdminSemEmpresa } from '../components/SuperAdminSemEmpresa'
import {
  financeiroService, vendasService, dpService, devolucoesService, conciliacaoService,
} from '../services/index'

const Nps = React.lazy(() => import('./Nps.jsx'))

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

function FinanceiroDRE() {
  const [mes, setMes] = useState(new Date().toISOString().slice(0,7))
  const { lojaFiltro: lojaGlobal, lojas } = useLojaFiltro()
  const [lojaFiltro, setLojaFiltro] = useState(lojaGlobal || '')
  const { data: vendas } = useData(() => vendasService.list(), [])
  const { data: pagar } = useData(() => financeiroService.listPagar(), [])
  const { data: folha } = useData(() => dpService.listFolha(mes), [mes])
  const { data: devs } = useData(async () => { try { return await devolucoesService.list() } catch { return [] } }, [])
  const fmtM = (v) => (parseFloat(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})

  const inMes = (date) => date?.startsWith(mes)
  const vendMes = (vendas||[]).filter(v => inMes(v.created_at) && (!lojaFiltro || v.loja === lojaFiltro))
  const receitaBruta = vendMes.filter(v => v.status !== 'cancelado').reduce((s,v) => s + (parseFloat(v.total)||0), 0)
  const devolucoesMes = (devs||[]).filter(d => inMes(d.created_at) && (!lojaFiltro || d.loja === lojaFiltro)).reduce((s,d) => s + (parseFloat(d.valor_devolvido)||0), 0)
  const receitaLiq = receitaBruta - devolucoesMes

  const cmv = vendMes.filter(v => v.status !== 'cancelado').reduce((s,v) => {
    const itens = v.venda_itens || []
    return s + itens.reduce((si, i) => si + (parseFloat(i.preco_custo)||0) * (parseInt(i.quantidade)||1), 0)
  }, 0)
  const lucroBruto = receitaLiq - cmv

  const pagarMes = (pagar||[]).filter(p => inMes(p.vencimento) && (!lojaFiltro || p.loja === lojaFiltro))
  const despesasOp = pagarMes.reduce((s,p) => s + (parseFloat(p.valor)||0), 0)
  const comissoes = vendMes.reduce((s,v) => s + (parseFloat(v.comissao_valor)||0), 0)
  const salarios = (folha||[]).filter(f => !lojaFiltro || f.loja === lojaFiltro).reduce((s,f) => s + (parseFloat(f.liquido)||0), 0)
  const ebitda = lucroBruto - despesasOp - comissoes - salarios
  const impostos = receitaBruta * 0.06
  const lucroLiq = ebitda - impostos

  const linha = (label, valor, cor, bold, indent) => (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--border)', paddingLeft: indent ? 16 : 0 }}>
      <span style={{ fontSize:13, color:'var(--t2)', fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize:13, fontWeight: bold ? 700 : 400, color: cor || 'var(--t1)' }}>{fmtM(valor)}</span>
    </div>
  )

  const exportarPDF = () => {
    const win = window.open('','_blank','width=700,height=900')
    win.document.write(`<!DOCTYPE html><html><head><title>DRE ${mes}</title><style>body{font-family:sans-serif;padding:24px;color:#1e293b}h2{color:#6366f1}table{width:100%;border-collapse:collapse}td{padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:13px}.r{text-align:right}.bold{font-weight:700}.green{color:#16a34a}.red{color:#dc2626}</style></head><body>
    <h2>DRE — ${mes}${lojaFiltro ? ' · '+lojaFiltro : ' · Consolidado'}</h2>
    <table>
    <tr><td>Receita Bruta</td><td class="r bold green">${fmtM(receitaBruta)}</td></tr>
    <tr><td>&nbsp;&nbsp;(-) Devoluções</td><td class="r red">${fmtM(devolucoesMes)}</td></tr>
    <tr><td class="bold">(=) Receita Líquida</td><td class="r bold">${fmtM(receitaLiq)}</td></tr>
    <tr><td>&nbsp;&nbsp;(-) CMV</td><td class="r red">${fmtM(cmv)}</td></tr>
    <tr><td class="bold">(=) Lucro Bruto</td><td class="r bold">${fmtM(lucroBruto)}</td></tr>
    <tr><td>&nbsp;&nbsp;(-) Despesas Operacionais</td><td class="r red">${fmtM(despesasOp)}</td></tr>
    <tr><td>&nbsp;&nbsp;(-) Comissões</td><td class="r red">${fmtM(comissoes)}</td></tr>
    <tr><td>&nbsp;&nbsp;(-) Salários</td><td class="r red">${fmtM(salarios)}</td></tr>
    <tr><td class="bold">(=) EBITDA</td><td class="r bold ${ebitda>=0?'green':'red'}">${fmtM(ebitda)}</td></tr>
    <tr><td>&nbsp;&nbsp;(-) Impostos estimados (6%)</td><td class="r red">${fmtM(impostos)}</td></tr>
    <tr style="background:#f1f5f9"><td class="bold">(=) Lucro Líquido</td><td class="r bold ${lucroLiq>=0?'green':'red'}">${fmtM(lucroLiq)}</td></tr>
    </table>
    <script>window.onload=()=>{window.print();window.close()}<\/script></body></html>`)
    win.document.close()
  }

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <input className="fi" type="month" value={mes} onChange={e=>setMes(e.target.value)} style={{ width:'auto' }} />
        <select className="fi" style={{ width:'auto' }} value={lojaFiltro} onChange={e=>setLojaFiltro(e.target.value)}>
          <option value="">Consolidado grupo</option>
          {(lojas ?? []).map(l => <option key={l.id || l.nome} value={l.nome}>{l.nome}</option>)}
        </select>
        <button className="btn btn-s btn-sm" onClick={exportarPDF} style={{display:'flex',alignItems:'center',gap:5}}><FileText size={13} strokeWidth={1.8} /> Exportar PDF</button>
      </div>
      <div className="card">
        <div style={{ fontWeight:700, fontSize:15, marginBottom:12, color:'var(--accent)' }}>DRE — {mes}{lojaFiltro ? ' · '+lojaFiltro : ' · Consolidado'}</div>
        {linha('(+) Receita Bruta', receitaBruta, 'var(--green)', true)}
        {linha('(-) Devoluções/Cancelamentos', devolucoesMes, 'var(--red)', false, true)}
        {linha('(=) Receita Líquida', receitaLiq, receitaLiq>=0?'var(--green)':'var(--red)', true)}
        {linha('(-) CMV (Custo dos Produtos)', cmv, 'var(--red)', false, true)}
        {linha('(=) Lucro Bruto', lucroBruto, lucroBruto>=0?'var(--green)':'var(--red)', true)}
        {linha('(-) Despesas Operacionais', despesasOp, 'var(--red)', false, true)}
        {linha('(-) Comissões Pagas', comissoes, 'var(--red)', false, true)}
        {linha('(-) Salários', salarios, 'var(--red)', false, true)}
        {linha('(=) EBITDA', ebitda, ebitda>=0?'var(--green)':'var(--red)', true)}
        {linha('(-) Impostos estimados (6% RB)', impostos, 'var(--red)', false, true)}
        <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', marginTop:4, borderTop:'2px solid var(--accent)' }}>
          <span style={{ fontWeight:700, fontSize:15 }}>(=) Lucro Líquido</span>
          <span style={{ fontWeight:700, fontSize:15, color: lucroLiq>=0?'var(--green)':'var(--red)' }}>{fmtM(lucroLiq)}</span>
        </div>
      </div>
    </div>
  )
}

function FinanceiroRelatorios() {
  const { data: receber } = useData(() => financeiroService.listReceber(), [])
  const { data: pagar } = useData(() => financeiroService.listPagar(), [])
  const { data: vendas } = useData(() => vendasService.list(), [])
  const hoje = new Date()
  const mesAtual = hoje.toISOString().slice(0,7)
  const fmtM = (v) => (parseFloat(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})

  const recMes = (receber||[]).filter(r => r.vencimento?.startsWith(mesAtual))
  const pagMes = (pagar||[]).filter(p => p.vencimento?.startsWith(mesAtual))
  const totalRecMes = recMes.reduce((s,r) => s + (parseFloat(r.valor)||0), 0)
  const totalPagMes = pagMes.reduce((s,p) => s + (parseFloat(p.valor)||0), 0)
  const lucroMes = totalRecMes - totalPagMes

  const vendasMes = (vendas||[]).filter(v => v.created_at?.startsWith(mesAtual) && v.status !== 'cancelado')
  const totalVendasMes = vendasMes.reduce((s,v) => s + (parseFloat(v.total)||0), 0)
  const ticketMedio = vendasMes.length > 0 ? totalVendasMes / vendasMes.length : 0

  // ABC por loja
  const porLoja = {}
  ;(vendas||[]).filter(v => v.status !== 'cancelado').forEach(v => {
    const l = v.loja || 'Sem loja'
    porLoja[l] = (porLoja[l]||0) + (parseFloat(v.total)||0)
  })
  const lojaRanking = Object.entries(porLoja).sort((a,b) => b[1]-a[1])
  const totalGeral = lojaRanking.reduce((s,[,v]) => s+v, 0)

  return (
    <div>
      <div style={{ fontWeight:600, marginBottom:12, color:'var(--t2)', fontSize:12, textTransform:'uppercase' }}>Mês atual: {mesAtual}</div>
      <div className="stats" style={{ marginBottom:16 }}>
        <div className="stat"><div className="stat-n" style={{ color:'var(--green)', fontSize:16 }}>{fmtM(totalRecMes)}</div><div className="stat-l">Receitas</div></div>
        <div className="stat"><div className="stat-n" style={{ color:'var(--red)', fontSize:16 }}>{fmtM(totalPagMes)}</div><div className="stat-l">Despesas</div></div>
        <div className="stat"><div className="stat-n" style={{ color: lucroMes >= 0 ? 'var(--green)' : 'var(--red)', fontSize:16 }}>{fmtM(lucroMes)}</div><div className="stat-l">Resultado</div></div>
        <div className="stat"><div className="stat-n" style={{ color:'var(--accent)', fontSize:16 }}>{fmtM(ticketMedio)}</div><div className="stat-l">Ticket médio</div></div>
      </div>
      <div className="grid2">
        <div className="card">
          <div style={{ fontWeight:600, marginBottom:12 }}>Rentabilidade por Loja (ABC)</div>
          {lojaRanking.length === 0 ? <Empty text="Sem dados" /> : lojaRanking.map(([loja, val], i) => (
            <div key={loja} style={{ marginBottom:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                <span style={{ fontSize:13 }}>{i < 3 ? ['🥇','🥈','🥉'][i] : `${i+1}.`} {loja}</span>
                <span style={{ fontSize:13, fontWeight:600 }}>{fmtM(val)}</span>
              </div>
              <div style={{ height:6, borderRadius:3, background:'var(--border)' }}>
                <div style={{ height:'100%', borderRadius:3, background:'var(--accent)', width: `${totalGeral ? (val/totalGeral*100) : 0}%` }} />
              </div>
              <div style={{ fontSize:10, color:'var(--t3)', textAlign:'right' }}>{totalGeral ? (val/totalGeral*100).toFixed(1) : 0}%</div>
            </div>
          ))}
        </div>
        <div className="card">
          <div style={{ fontWeight:600, marginBottom:12 }}>Vendas do mês</div>
          <div style={{ fontSize:28, fontWeight:700, color:'var(--accent)', marginBottom:4 }}>{vendasMes.length}</div>
          <div style={{ fontSize:13, color:'var(--t2)', marginBottom:16 }}>vendas realizadas</div>
          <div style={{ fontWeight:600, marginBottom:8 }}>Ticket médio</div>
          <div style={{ fontSize:22, fontWeight:700, color:'var(--green)' }}>{fmtM(ticketMedio)}</div>
          <div style={{ marginTop:16, fontSize:12, color:'var(--t2)' }}>
            Total: {fmtM(totalVendasMes)}
          </div>
        </div>
      </div>
    </div>
  )
}

function FinanceiroConciliacao() {
  const { perfil } = useAuth()
  const lojaEf = useEffectiveLoja()
  const fmtMoeda = (v) => (parseFloat(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
  const fmtData  = (d) => d ? new Date(d+'T12:00').toLocaleDateString('pt-BR') : '-'

  const [extratos, setExtratos] = useState([])
  const [loadingEx, setLoadingEx] = useState(true)
  const [selected, setSelected] = useState(null)
  const [transacoes, setTransacoes] = useState([])
  const [loadingTr, setLoadingTr] = useState(false)
  const [showNovoEx, setShowNovoEx] = useState(false)
  const [showNovaTr, setShowNovaTr] = useState(false)
  const [savingEx, setSavingEx] = useState(false)
  const [savingTr, setSavingTr] = useState(false)
  const [formEx, setFormEx] = useState({ banco:'', agencia:'', conta:'', data_inicio:'', data_fim:'', saldo_inicial:'', saldo_final:'' })
  const [formTr, setFormTr] = useState({ data:'', descricao:'', valor:'', tipo:'credito' })

  const loadExtratos = async () => {
    setLoadingEx(true)
    try { setExtratos(await conciliacaoService.listExtratos(lojaEf)) } catch { toast.error('Erro ao carregar extratos') }
    setLoadingEx(false)
  }
  const loadTransacoes = async (id) => {
    setLoadingTr(true)
    try { setTransacoes(await conciliacaoService.listTransacoes(id)) } catch { toast.error('Erro ao carregar transações') }
    setLoadingTr(false)
  }

  useEffect(() => { loadExtratos() }, [lojaEf]) // eslint-disable-line react-hooks/exhaustive-deps

  const criarExtrato = async () => {
    if (!formEx.banco || !formEx.data_inicio || !formEx.data_fim) return toast.error('Preencha banco e período')
    setSavingEx(true)
    try {
      const d = await conciliacaoService.createExtrato({ ...formEx, loja_id: lojaEf||null, saldo_inicial: parseFloat(formEx.saldo_inicial)||0, saldo_final: parseFloat(formEx.saldo_final)||0, importado_por: perfil?.id })
      setExtratos(p => [d, ...p])
      setShowNovoEx(false)
      setFormEx({ banco:'', agencia:'', conta:'', data_inicio:'', data_fim:'', saldo_inicial:'', saldo_final:'' })
      toast.success('Extrato criado!')
    } catch { toast.error('Erro ao criar extrato') }
    setSavingEx(false)
  }

  const excluirExtrato = async (id) => {
    try {
      await conciliacaoService.deleteExtrato(id)
      setExtratos(p => p.filter(e => e.id !== id))
      if (selected?.id === id) { setSelected(null); setTransacoes([]) }
      toast.success('Extrato removido')
    } catch { toast.error('Erro ao remover') }
  }

  const selecionarExtrato = (ex) => { setSelected(ex); loadTransacoes(ex.id) }

  const adicionarTransacao = async () => {
    if (!formTr.data || !formTr.descricao || !formTr.valor) return toast.error('Preencha todos os campos')
    setSavingTr(true)
    try {
      const d = await conciliacaoService.addTransacao({ ...formTr, extrato_id: selected.id, valor: parseFloat(formTr.valor) })
      setTransacoes(p => [...p, d])
      setShowNovaTr(false)
      setFormTr({ data:'', descricao:'', valor:'', tipo:'credito' })
      toast.success('Transação adicionada!')
    } catch { toast.error('Erro ao adicionar') }
    setSavingTr(false)
  }

  const toggleConciliado = async (tr) => {
    try {
      const upd = await conciliacaoService.conciliar(tr.id, !tr.conciliado)
      setTransacoes(p => p.map(t => t.id === tr.id ? upd : t))
      toast.success(upd.conciliado ? 'Conciliado!' : 'Desmarcado')
    } catch { toast.error('Erro ao atualizar') }
  }

  const excluirTransacao = async (id) => {
    try {
      await conciliacaoService.deleteTransacao(id)
      setTransacoes(p => p.filter(t => t.id !== id))
      toast.success('Transação removida')
    } catch { toast.error('Erro ao remover') }
  }

  const exportarPDF = () => {
    if (!selected) return
    const cred = transacoes.filter(t=>t.tipo==='credito').reduce((s,t)=>s+parseFloat(t.valor||0),0)
    const deb  = transacoes.filter(t=>t.tipo==='debito').reduce((s,t)=>s+parseFloat(t.valor||0),0)
    const saldoCalc = parseFloat(selected.saldo_inicial||0) + cred - deb
    const saldoEx   = parseFloat(selected.saldo_final||0)
    const dif = saldoEx - saldoCalc
    const pend = transacoes.filter(t=>!t.conciliado)
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Conciliação</title>
    <style>body{font-family:Arial,sans-serif;padding:30px;font-size:12px}h1{font-size:17px}h2{font-size:13px;margin:14px 0 6px;border-bottom:1px solid #ccc;padding-bottom:3px}table{width:100%;border-collapse:collapse;margin-bottom:12px}th,td{border:1px solid #ddd;padding:5px 8px;font-size:11px;text-align:left}th{background:#f0f0f0;font-weight:600}.cr{color:#16a34a}.db{color:#dc2626}.dif{font-weight:700;color:${dif!==0?'#dc2626':'#16a34a'}}.pend{background:#fef9c3}.foot{margin-top:36px;border-top:1px solid #ccc;padding-top:12px}</style></head><body>
    <h1>Relatório de Conciliação Bancária</h1>
    <p><b>Banco:</b> ${selected.banco}${selected.agencia?` | Agência: ${selected.agencia}`:''}${selected.conta?` | Conta: ${selected.conta}`:''}</p>
    <p><b>Período:</b> ${fmtData(selected.data_inicio)} a ${fmtData(selected.data_fim)}</p>
    <p><b>Emitido em:</b> ${new Date().toLocaleString('pt-BR')}</p>
    <h2>Resumo</h2>
    <table><tr><th>Item</th><th>Valor</th></tr>
    <tr><td>Saldo Inicial (Extrato)</td><td>${fmtMoeda(selected.saldo_inicial)}</td></tr>
    <tr><td>Total Créditos</td><td class="cr">${fmtMoeda(cred)}</td></tr>
    <tr><td>Total Débitos</td><td class="db">${fmtMoeda(deb)}</td></tr>
    <tr><td>Saldo Final (Extrato)</td><td>${fmtMoeda(saldoEx)}</td></tr>
    <tr><td>Saldo Calculado (Sistema)</td><td>${fmtMoeda(saldoCalc)}</td></tr>
    <tr><td><b>Diferença</b></td><td class="dif">${fmtMoeda(dif)}</td></tr></table>
    <h2>Transações (${transacoes.length})</h2>
    <table><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Conciliado</th></tr>
    ${transacoes.map(t=>`<tr class="${!t.conciliado?'pend':''}"><td>${fmtData(t.data)}</td><td>${t.descricao}</td><td class="${t.tipo==='credito'?'cr':'db'}">${t.tipo==='credito'?'Crédito':'Débito'}</td><td class="${t.tipo==='credito'?'cr':'db'}">${fmtMoeda(t.valor)}</td><td>${t.conciliado?'✓ Sim':'⚠ Não'}</td></tr>`).join('')}
    </table>
    ${pend.length?`<h2>Pendências (${pend.length} não conciliadas)</h2><table><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Valor</th></tr>${pend.map(t=>`<tr class="pend"><td>${fmtData(t.data)}</td><td>${t.descricao}</td><td>${t.tipo==='credito'?'Crédito':'Débito'}</td><td>${fmtMoeda(t.valor)}</td></tr>`).join('')}</table>`:''}
    <div class="foot"><p><b>Responsável:</b> ___________________________________</p><p><b>Data/Assinatura:</b> ___________________________________</p></div>
    <script>window.onload=()=>{window.print();window.close()}<\/script></body></html>`
    const win = window.open('','_blank','width=820,height=640')
    if (win) win.document.write(html)
  }

  // Derived values for selected extrato
  const cred = transacoes.filter(t=>t.tipo==='credito').reduce((s,t)=>s+parseFloat(t.valor||0),0)
  const deb  = transacoes.filter(t=>t.tipo==='debito').reduce((s,t)=>s+parseFloat(t.valor||0),0)
  const saldoCalc = selected ? parseFloat(selected.saldo_inicial||0) + cred - deb : 0
  const saldoEx   = selected ? parseFloat(selected.saldo_final||0) : 0
  const dif = saldoEx - saldoCalc
  const pendentes = transacoes.filter(t=>!t.conciliado)

  if (selected) return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <button className="btn btn-g btn-sm" onClick={() => { setSelected(null); setTransacoes([]) }}>← Voltar</button>
        <span style={{ fontWeight:600, fontSize:15 }}>{selected.banco} — {fmtData(selected.data_inicio)} a {fmtData(selected.data_fim)}</span>
        <button className="btn btn-g btn-sm" style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5 }} onClick={exportarPDF}><FileText size={13} strokeWidth={1.8} /> Exportar PDF</button>
      </div>

      {/* Resumo */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ fontWeight:600, marginBottom:12 }}>Resumo da Conciliação</div>
        <div className="stats">
          <div className="stat"><div className="stat-n" style={{ color:'var(--t1)' }}>{fmtMoeda(selected.saldo_inicial)}</div><div className="stat-l">Saldo Inicial</div></div>
          <div className="stat"><div className="stat-n" style={{ color:'var(--green)' }}>{fmtMoeda(cred)}</div><div className="stat-l">Total Créditos</div></div>
          <div className="stat"><div className="stat-n" style={{ color:'var(--red)' }}>{fmtMoeda(deb)}</div><div className="stat-l">Total Débitos</div></div>
          <div className="stat"><div className="stat-n" style={{ color:'var(--accent)' }}>{fmtMoeda(saldoEx)}</div><div className="stat-l">Saldo Final (Extrato)</div></div>
          <div className="stat"><div className="stat-n" style={{ color:'var(--accent)' }}>{fmtMoeda(saldoCalc)}</div><div className="stat-l">Saldo Calculado</div></div>
          <div className="stat">
            <div className="stat-n" style={{ color: dif === 0 ? 'var(--green)' : 'var(--red)' }}>{fmtMoeda(dif)}</div>
            <div className="stat-l">Diferença</div>
          </div>
        </div>
        {dif !== 0 && <div style={{ marginTop:8, padding:'8px 12px', background:'rgba(239,68,68,0.12)', borderRadius:8, fontSize:13, color:'var(--red)', fontWeight:500 }}>⚠ Há diferença de {fmtMoeda(Math.abs(dif))} entre o extrato bancário e o sistema.</div>}
        {pendentes.length > 0 && <div style={{ marginTop:8, padding:'8px 12px', background:'rgba(245,158,11,0.12)', borderRadius:8, fontSize:13, color:'var(--amber)', fontWeight:500 }}>⏳ {pendentes.length} transação(ões) pendente(s) de conciliação.</div>}
      </div>

      {/* Transações */}
      <div className="card">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ fontWeight:600 }}>Transações ({transacoes.length})</div>
          <button className="btn btn-p btn-sm" onClick={() => setShowNovaTr(true)}>+ Transação</button>
        </div>
        {loadingTr ? <Spinner /> : transacoes.length === 0 ? <Empty text="Nenhuma transação lançada" /> : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Data','Descrição','Tipo','Valor','Conciliado',''].map(h => (
                    <th key={h} style={{ padding:'6px 10px', textAlign:'left', fontSize:12, color:'var(--t3)', fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transacoes.map(tr => (
                  <tr key={tr.id} style={{ borderBottom:'1px solid var(--border)', background: !tr.conciliado ? 'rgba(245,158,11,0.07)' : undefined }}>
                    <td style={{ padding:'7px 10px', fontSize:13, whiteSpace:'nowrap' }}>{fmtData(tr.data)}</td>
                    <td style={{ padding:'7px 10px', fontSize:13 }}>{tr.descricao}</td>
                    <td style={{ padding:'7px 10px', fontSize:12 }}>
                      <span style={{ padding:'2px 8px', borderRadius:4, background: tr.tipo==='credito' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: tr.tipo==='credito' ? 'var(--green)' : 'var(--red)', fontWeight:600, fontSize:11 }}>
                        {tr.tipo==='credito' ? 'Crédito' : 'Débito'}
                      </span>
                    </td>
                    <td style={{ padding:'7px 10px', fontSize:13, fontWeight:600, color: tr.tipo==='credito' ? 'var(--green)' : 'var(--red)', whiteSpace:'nowrap' }}>{fmtMoeda(tr.valor)}</td>
                    <td style={{ padding:'7px 10px' }}>
                      <button onClick={() => toggleConciliado(tr)} style={{ padding:'3px 10px', borderRadius:6, border:'none', cursor:'pointer', fontSize:11, fontWeight:600, background: tr.conciliado ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', color: tr.conciliado ? 'var(--green)' : 'var(--amber)' }}>
                        {tr.conciliado ? '✓ Conciliado' : '⚠ Pendente'}
                      </button>
                    </td>
                    <td style={{ padding:'7px 10px' }}>
                      <button onClick={() => excluirTransacao(tr.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--t3)', display:'flex', alignItems:'center' }}><Trash2 size={14} strokeWidth={1.8} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal nova transação */}
      {showNovaTr && (
        <Modal title="Adicionar Transação" onClose={() => setShowNovaTr(false)}>
          <div className="fg"><label className="fl">Data *</label><input className="fi" type="date" value={formTr.data} onChange={e => setFormTr(p=>({...p,data:e.target.value}))} /></div>
          <div className="fg"><label className="fl">Descrição *</label><input className="fi" value={formTr.descricao} onChange={e => setFormTr(p=>({...p,descricao:e.target.value}))} /></div>
          <div className="grid2">
            <div className="fg">
              <label className="fl">Tipo *</label>
              <select className="fi" value={formTr.tipo} onChange={e => setFormTr(p=>({...p,tipo:e.target.value}))}>
                <option value="credito">Crédito</option>
                <option value="debito">Débito</option>
              </select>
            </div>
            <div className="fg"><label className="fl">Valor (R$) *</label><input className="fi" type="number" step="0.01" min="0" value={formTr.valor} onChange={e => setFormTr(p=>({...p,valor:e.target.value}))} /></div>
          </div>
          <button className="btn btn-p" onClick={adicionarTransacao} disabled={savingTr}>{savingTr?'Salvando...':'Adicionar'}</button>
        </Modal>
      )}
    </div>
  )

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ fontWeight:600 }}>Extratos Bancários</div>
        <button className="btn btn-p btn-sm" onClick={() => setShowNovoEx(true)}>+ Novo Extrato</button>
      </div>

      {loadingEx ? <Spinner /> : extratos.length === 0 ? (
        <div className="card"><Empty text="Nenhum extrato importado ainda" /></div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {extratos.map(ex => {
            const total = ex.saldo_final - ex.saldo_inicial
            return (
              <div key={ex.id} className="card" style={{ display:'flex', alignItems:'center', gap:12, cursor:'pointer' }} onClick={() => selecionarExtrato(ex)}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:14 }}>{ex.banco}</div>
                  <div style={{ fontSize:12, color:'var(--t3)', marginTop:2 }}>
                    {fmtData(ex.data_inicio)} a {fmtData(ex.data_fim)}
                    {ex.agencia && ` · Ag. ${ex.agencia}`}
                    {ex.conta && ` · Cc. ${ex.conta}`}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:13, fontWeight:600, color: total >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtMoeda(ex.saldo_final)}</div>
                  <div style={{ fontSize:11, color:'var(--t3)' }}>Saldo final</div>
                </div>
                <button onClick={e => { e.stopPropagation(); excluirExtrato(ex.id) }} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--t3)', padding:'4px', display:'flex', alignItems:'center' }}><Trash2 size={15} strokeWidth={1.8} /></button>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal novo extrato */}
      {showNovoEx && (
        <Modal title="Novo Extrato Bancário" onClose={() => setShowNovoEx(false)}>
          <div className="grid2">
            <div className="fg" style={{ gridColumn:'1/-1' }}><label className="fl">Banco *</label><input className="fi" value={formEx.banco} onChange={e => setFormEx(p=>({...p,banco:e.target.value}))} placeholder="Ex: Sicoob, Bradesco..." /></div>
            <div className="fg"><label className="fl">Agência</label><input className="fi" value={formEx.agencia} onChange={e => setFormEx(p=>({...p,agencia:e.target.value}))} /></div>
            <div className="fg"><label className="fl">Conta</label><input className="fi" value={formEx.conta} onChange={e => setFormEx(p=>({...p,conta:e.target.value}))} /></div>
            <div className="fg"><label className="fl">Data Início *</label><input className="fi" type="date" value={formEx.data_inicio} onChange={e => setFormEx(p=>({...p,data_inicio:e.target.value}))} /></div>
            <div className="fg"><label className="fl">Data Fim *</label><input className="fi" type="date" value={formEx.data_fim} onChange={e => setFormEx(p=>({...p,data_fim:e.target.value}))} /></div>
            <div className="fg"><label className="fl">Saldo Inicial (R$)</label><input className="fi" type="number" step="0.01" value={formEx.saldo_inicial} onChange={e => setFormEx(p=>({...p,saldo_inicial:e.target.value}))} /></div>
            <div className="fg"><label className="fl">Saldo Final (R$)</label><input className="fi" type="number" step="0.01" value={formEx.saldo_final} onChange={e => setFormEx(p=>({...p,saldo_final:e.target.value}))} /></div>
          </div>
          <button className="btn btn-p" onClick={criarExtrato} disabled={savingEx}>{savingEx?'Salvando...':'Criar Extrato'}</button>
        </Modal>
      )}
    </div>
  )
}

function FinanceiroResumo() {
  const lojaEf = useEffectiveLoja()
  const { data: receberRaw } = useData(() => financeiroService.listReceber(lojaEf), [lojaEf])
  const { data: pagarRaw } = useData(() => financeiroService.listPagar(lojaEf), [lojaEf])
  const receber = receberRaw
  const pagar = pagarRaw
  const hoje = new Date().toISOString().split('T')[0]
  const totalReceber = (receber||[]).filter(r => r.status !== 'pago').reduce((s,r) => s + (parseFloat(r.valor)||0), 0)
  const totalPagar   = (pagar||[]).filter(p => p.status !== 'pago').reduce((s,p) => s + (parseFloat(p.valor)||0), 0)
  const vencidosRec  = (receber||[]).filter(r => r.status !== 'pago' && r.vencimento < hoje).length
  const vencidosPag  = (pagar||[]).filter(p => p.status !== 'pago' && p.vencimento < hoje).length
  const fmtMoeda = (v) => (parseFloat(v)||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })
  return (
    <div>
      <div className="stats" style={{ marginBottom:16 }}>
        <div className="stat"><div className="stat-n" style={{ color:'var(--green)' }}>{fmtMoeda(totalReceber)}</div><div className="stat-l">A Receber</div></div>
        <div className="stat"><div className="stat-n" style={{ color:'var(--red)' }}>{fmtMoeda(totalPagar)}</div><div className="stat-l">A Pagar</div></div>
        <div className="stat"><div className="stat-n" style={{ color:'var(--accent)' }}>{fmtMoeda(totalReceber - totalPagar)}</div><div className="stat-l">Saldo</div></div>
      </div>
      {(vencidosRec + vencidosPag) > 0 && (
        <Alert type="error" style={{ marginBottom:12 }}>
          {vencidosRec > 0 && `${vencidosRec} recebimento(s) vencido(s). `}
          {vencidosPag > 0 && `${vencidosPag} pagamento(s) vencido(s).`}
        </Alert>
      )}
      <div className="grid2">
        <div className="card">
          <div style={{ fontWeight:600, marginBottom:8, color:'var(--green)' }}>Próximos recebimentos</div>
          {(receber||[]).filter(r => r.status !== 'pago').slice(0,5).map(r => (
            <div key={r.id} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'4px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={{ color: r.vencimento < hoje ? 'var(--red)' : 'var(--t1)' }}>{r.descricao}</span>
              <span>{fmtMoeda(r.valor)}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <div style={{ fontWeight:600, marginBottom:8, color:'var(--red)' }}>Próximos pagamentos</div>
          {(pagar||[]).filter(p => p.status !== 'pago').slice(0,5).map(p => (
            <div key={p.id} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'4px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={{ color: p.vencimento < hoje ? 'var(--red)' : 'var(--t1)' }}>{p.descricao}</span>
              <span>{fmtMoeda(p.valor)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FinanceiroLista({ tipo }) {
  const lojaEf = useEffectiveLoja()
  const queryFn = useCallback(
    ({ search, from, to }) => tipo === 'receber'
      ? financeiroService.listPagedReceber({ search, from, to, loja: lojaEf })
      : financeiroService.listPagedPagar({ search, from, to, loja: lojaEf }),
    [tipo, lojaEf]
  )
  const { data: lista, loading, total, page, setPage, totalPages, search: busca, setSearch: setBusca, reload } = useServerPagination(queryFn)
  const [modal, setModal] = useState(null)
  const nomeCampo = tipo === 'receber' ? 'cliente_nome' : 'fornecedor_nome'
  const empty = { descricao:'', valor:'', vencimento:'', [nomeCampo]:'', status:'pendente', observacoes:'', loja:'' }
  const [form, setForm] = useState(empty)
  const act = useAction()
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const hoje = new Date().toISOString().split('T')[0]
  const fmtMoeda = (v) => (parseFloat(v)||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })

  const salvar = async () => {
    if (!form.descricao || !form.valor || !form.vencimento) return toast.error('Preencha os campos obrigatórios')
    try {
      const payload = { ...form, valor: parseFloat(form.valor) }
      if (!modal.item) {
        if (tipo === 'receber') await act.run(() => financeiroService.createReceber(payload))
        else await act.run(() => financeiroService.createPagar(payload))
      } else {
        if (tipo === 'receber') await act.run(() => financeiroService.updateReceber(modal.item.id, payload))
        else await act.run(() => financeiroService.updatePagar(modal.item.id, payload))
      }
      toast.success('Salvo'); setModal(null); reload()
    } catch (e) { toast.error(e.message) }
  }

  const marcarPago = async (item) => {
    try {
      if (tipo === 'receber') await financeiroService.updateReceber(item.id, { status:'pago', data_pagamento: hoje })
      else await financeiroService.updatePagar(item.id, { status:'pago', data_pagamento: hoje })
      toast.success('Marcado como pago'); reload()
    } catch (e) { toast.error(e.message) }
  }


  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        <input className="fi" style={{ flex:1 }} placeholder="🔍 Buscar por descrição ou fornecedor..." value={busca} onChange={e => setBusca(e.target.value)} />
        <button className="btn btn-p btn-sm" onClick={() => { setForm(empty); setModal({}) }}>+ {tipo === 'receber' ? 'A Receber' : 'A Pagar'}</button>
      </div>
      {loading ? <Spinner /> : lista.length === 0 ? <Empty text="Nenhum lançamento" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {lista.map(item => (
            <div key={item.id} className="card" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', opacity: item.status === 'pago' ? 0.6 : 1 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14, display:'flex', alignItems:'center', gap:6 }}>
                  {item.descricao}
                  {item.status === 'pago' && <Badge variant="bg-green">Pago</Badge>}
                  {item.status !== 'pago' && item.vencimento < hoje && <Badge variant="bg-red">Vencido</Badge>}
                </div>
                <div style={{ fontSize:12, color:'var(--t2)' }}>{item.cliente_nome || item.fornecedor_nome} · Venc: {item.vencimento ? new Date(item.vencimento+'T12:00').toLocaleDateString('pt-BR') : '—'}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontWeight:700 }}>{fmtMoeda(item.valor)}</div>
                {item.status !== 'pago' && <button className="btn btn-p btn-sm" style={{ marginTop:4 }} onClick={() => marcarPago(item)}>Pagar</button>}
              </div>
              <button className="btn btn-s btn-sm" onClick={() => { setForm({ ...empty, ...item }); setModal({ item }) }}><Edit2 size={13} strokeWidth={1.8} /></button>
            </div>
          ))}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} total={total} setPage={setPage} />
      {modal && (
        <Modal title={tipo === 'receber' ? 'Conta a Receber' : 'Conta a Pagar'} onClose={() => setModal(null)}>
          <div className="grid2">
            <div className="fg" style={{ gridColumn:'1/-1' }}><label className="fl">Descrição *</label><input className="fi" value={form.descricao} onChange={up('descricao')} /></div>
            <div className="fg"><label className="fl">Valor (R$) *</label><input className="fi" type="number" step="0.01" inputMode="decimal" value={form.valor} onChange={up('valor')} /></div>
            <div className="fg"><label className="fl">Vencimento *</label><input className="fi" type="date" value={form.vencimento} onChange={up('vencimento')} /></div>
            <div className="fg"><label className="fl">{tipo==='receber'?'Cliente':'Fornecedor'}</label><input className="fi" value={form[nomeCampo]||''} onChange={up(nomeCampo)} /></div>
            <div className="fg"><label className="fl">Loja</label><LojaSelect value={form.loja||''} onChange={v => setForm(p => ({ ...p, loja: v }))} /></div>
            <div className="fg"><label className="fl">Status</label>
              <select className="fi" value={form.status} onChange={up('status')}>
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
                <option value="cancelado">Cancelado</option>
              </select>
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

function FinanceiroInner() {
  const { effectiveRole } = useAuth()
  const isAssistenteAdmin = effectiveRole === 'assistente_admin'
  const podeVerConciliacao = ['admin','diretor','assistente_admin'].includes(effectiveRole)
  const [tab, setTab] = useState('receber')
  const ALL_TABS = [
    { id:'resumo',       label:'Resumo',        hide: isAssistenteAdmin },
    { id:'receber',      label:'A Receber' },
    { id:'pagar',        label:'A Pagar' },
    { id:'dre',          label:'DRE',           hide: isAssistenteAdmin },
    { id:'nps',          label:'NPS',           hide: isAssistenteAdmin },
    { id:'relatorios',   label:'Rentabilidade', hide: isAssistenteAdmin },
    { id:'conciliacao',  label:'Conciliação',   hide: !podeVerConciliacao },
  ]
  const TABS = ALL_TABS.filter(t => !t.hide)
  return (
    <div className="page">
      <div className="ph"><h1>Financeiro</h1></div>
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {TABS.map(t => <button key={t.id} className={`btn btn-${tab===t.id?'p':'s'} btn-sm`} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>
      {tab === 'resumo'      && <FinanceiroResumo />}
      {tab === 'receber'     && <FinanceiroLista tipo="receber" />}
      {tab === 'pagar'       && <FinanceiroLista tipo="pagar" />}
      {tab === 'dre'         && <FinanceiroDRE />}
      {tab === 'nps'         && <Suspense fallback={<Spinner />}><Nps /></Suspense>}
      {tab === 'relatorios'  && <FinanceiroRelatorios />}
      {tab === 'conciliacao' && <FinanceiroConciliacao />}
    </div>
  )
}

export default function Financeiro() {
  if (!podeAcessarModulosOperacionais()) return <SuperAdminSemEmpresa />
  return <FinanceiroInner />
}
