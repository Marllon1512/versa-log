import { useState } from 'react'

import { Camera, MapPin } from 'lucide-react'
import * as XLSX from 'xlsx'

import { useData, useAction } from '../hooks/index'
import { useAuth } from '../context/AuthContext'
import { useEffectiveLoja } from '../hooks/useEffectiveLoja'
import { useLojaFiltro } from '../context/LojaContext'
import { LojaSelect } from '../components/LojaSelect'
import { Badge, Modal, Spinner, Empty } from '../components/ui/index'
import { supabase } from '../lib/supabase'
import { toast } from '../lib/toast'
import { validarTipoImagem } from '../lib/validarTipoImagem'
import { PONTO_LABELS, PONTO_COLORS, PONTO_BG, normTipoMarcacao, calcSaldoHoras } from '../lib/pontoUtils'
import {
  dpService, pontoService, usuariosService, lojasService,
  escalasTrabalhoService, pontoOcorrenciasService, cercasVirtuaisService,
} from '../services/index'

function DPFuncionarios({ lojaFiltro }) {
  const lojaEf = useEffectiveLoja()
  const filtroAtivo = lojaEf || lojaFiltro || null
  const { data: lista, loading, reload } = useData(() => dpService.listFuncionarios(filtroAtivo), [filtroAtivo])
  const [modal, setModal] = useState(null)
  const empty = { nome:'', cpf:'', cargo:'', departamento:'', admissao:'', salario:'', status:'ativo', email:'', telefone:'', loja:'', foto_url:'' }
  const [form, setForm] = useState(empty)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const act = useAction()
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const uploadFoto = async (file) => {
    try { await validarTipoImagem(file) } catch (e) { toast.error(e.message); return }
    const itemId = modal?.item?.id || 'novo_' + Date.now()
    setUploadingFoto(true)
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `usuarios/${itemId}/foto.${ext}`
      const { error } = await supabase.storage.from('sistema-assets').upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' })
      if (error) throw new Error(error.message || JSON.stringify(error))
      const { data: pub } = supabase.storage.from('sistema-assets').getPublicUrl(path)
      setForm(p => ({ ...p, foto_url: pub.publicUrl + '?t=' + Date.now() }))
      toast.success('Foto enviada!')
    } catch (e) { toast.error('Erro no upload: ' + e.message) }
    setUploadingFoto(false)
  }

  const salvar = async () => {
    if (!form.nome || !form.cargo) return toast.error('Nome e cargo obrigatórios')
    try {
      const payload = { ...form, salario: parseFloat(form.salario)||0 }
      if (!modal.item) await act.run(() => dpService.createFuncionario(payload))
      else await act.run(() => dpService.updateFuncionario(modal.item.id, payload))
      toast.success('Salvo'); setModal(null); reload()
    } catch (e) { toast.error(e.message) }
  }

  const fmtMoeda = (v) => (parseFloat(v)||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
        <button className="btn btn-p btn-sm" onClick={() => { setForm(empty); setModal({}) }}>+ Novo Funcionário</button>
      </div>
      {loading ? <Spinner /> : (lista||[]).length === 0 ? <Empty text="Nenhum funcionário" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {(lista||[]).map(f => (
            <div key={f.id} className="card" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px' }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background: f.foto_url ? 'transparent' : 'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, flexShrink:0, overflow:'hidden' }}>
                {f.foto_url
                  ? <img src={f.foto_url} alt="" loading="lazy" style={{ width:36, height:36, objectFit:'cover' }} />
                  : f.nome?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{f.nome}</div>
                <div style={{ fontSize:12, color:'var(--t2)' }}>{f.cargo} · {f.departamento} · {fmtMoeda(f.salario)}</div>
              </div>
              <Badge variant={f.status==='ativo'?'bg-green':'bg'}>{f.status}</Badge>
              <button className="btn btn-s btn-sm" onClick={() => { setForm({ ...empty, ...f }); setModal({ item:f }) }}>Editar</button>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <Modal title={modal.item ? 'Editar Funcionário' : 'Novo Funcionário'} onClose={() => setModal(null)}>
          <div className="fg">
            <label className="fl">Foto de Perfil</label>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:56, height:56, borderRadius:'50%', background: form.foto_url ? 'transparent' : 'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0, border:'2px solid var(--border)' }}>
                {form.foto_url
                  ? <img src={form.foto_url} alt="" loading="lazy" style={{ width:56, height:56, objectFit:'cover' }} />
                  : <Camera size={22} color="var(--t3)" />}
              </div>
              <label style={{ cursor:'pointer' }}>
                <input type="file" accept="image/*" style={{ display:'none' }} onChange={e => e.target.files?.[0] && uploadFoto(e.target.files[0])} />
                <span className="btn btn-s" style={{ pointerEvents:'none' }}>
                  {uploadingFoto ? 'Enviando...' : 'Escolher foto'}
                </span>
              </label>
            </div>
          </div>
          <div className="grid2">
            <div className="fg" style={{ gridColumn:'1/-1' }}><label className="fl">Nome *</label><input className="fi" value={form.nome} onChange={up('nome')} /></div>
            <div className="fg"><label className="fl">CPF</label><input className="fi" value={form.cpf} onChange={up('cpf')} /></div>
            <div className="fg"><label className="fl">Cargo *</label><input className="fi" value={form.cargo} onChange={up('cargo')} /></div>
            <div className="fg"><label className="fl">Departamento</label><input className="fi" value={form.departamento} onChange={up('departamento')} /></div>
            <div className="fg"><label className="fl">Admissão</label><input className="fi" type="date" value={form.admissao} onChange={up('admissao')} /></div>
            <div className="fg"><label className="fl">Salário (R$)</label><input className="fi" type="number" step="0.01" inputMode="decimal" value={form.salario} onChange={up('salario')} /></div>
            <div className="fg"><label className="fl">Email</label><input className="fi" value={form.email} onChange={up('email')} /></div>
            <div className="fg"><label className="fl">Telefone</label><input className="fi" value={form.telefone} onChange={up('telefone')} type="tel" /></div>
            <div className="fg"><label className="fl">Loja</label><LojaSelect value={form.loja||''} onChange={v => setForm(p => ({ ...p, loja: v }))} /></div>
            <div className="fg"><label className="fl">Status</label>
              <select className="fi" value={form.status} onChange={up('status')}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="ferias">Férias</option>
                <option value="afastado">Afastado</option>
              </select>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button className="btn btn-p" style={{ flex:1 }} onClick={salvar} disabled={act.loading}>{act.loading ? '...' : 'Salvar'}</button>
            <button className="btn btn-s" onClick={() => setModal(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function DPFolha({ lojaFiltro }) {
  const lojaEf = useEffectiveLoja()
  const filtroAtivo = lojaEf || lojaFiltro || null
  const mesAtual = new Date().toISOString().slice(0,7)
  const [mes, setMes] = useState(mesAtual)
  const { data: funcionarios } = useData(() => dpService.listFuncionarios(filtroAtivo), [filtroAtivo])
  const { data: folha, loading, reload } = useData(() => dpService.listFolha(mes), [mes])
  const act = useAction()

  const calcINSS = (sal) => {
    const s = parseFloat(sal)||0
    if (s <= 1412) return s * 0.075
    if (s <= 2666.68) return s * 0.09
    if (s <= 4000.03) return s * 0.12
    if (s <= 7786.02) return s * 0.14
    return 908.86
  }

  const calcIRRF = (base) => {
    const b = parseFloat(base)||0
    if (b <= 2259.20) return 0
    if (b <= 2826.65) return b * 0.075 - 169.44
    if (b <= 3751.05) return b * 0.15 - 381.44
    if (b <= 4664.68) return b * 0.225 - 662.77
    return b * 0.275 - 896.00
  }

  const gerarFolha = async () => {
    const ativos = (funcionarios||[]).filter(f => f.status === 'ativo')
    try {
      await act.run(async () => {
        for (const f of ativos) {
          const sal = parseFloat(f.salario)||0
          const inss = calcINSS(sal)
          const irrf = calcIRRF(sal - inss)
          const liquido = sal - inss - irrf
          await dpService.upsertFolha({ funcionario_id: f.id, funcionario_nome: f.nome, cargo: f.cargo, mes, salario_bruto: sal, inss, irrf, outros_descontos: 0, liquido, status: 'gerado' })
        }
      })
      toast.success(`Folha gerada para ${ativos.length} funcionários`)
      reload()
    } catch (e) { toast.error(e.message) }
  }

  const fmtMoeda = (v) => (parseFloat(v)||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'center' }}>
        <input className="fi" type="month" value={mes} onChange={e => setMes(e.target.value)} style={{ width:'auto' }} />
        <button className="btn btn-p btn-sm" onClick={gerarFolha} disabled={act.loading}>{act.loading ? 'Gerando...' : 'Gerar Folha'}</button>
      </div>
      {loading ? <Spinner /> : (folha||[]).length === 0 ? <Empty text="Nenhuma folha gerada para este mês" /> : (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'var(--t2)', fontWeight:600, padding:'6px 14px', borderBottom:'1px solid var(--border)', marginBottom:4 }}>
            <span>Funcionário</span><span>Bruto / INSS / IRRF / Líquido</span>
          </div>
          {(folha||[]).map(f => (
            <div key={f.id} className="card" style={{ display:'flex', alignItems:'center', padding:'10px 14px', marginBottom:6 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{f.funcionario_nome}</div>
                <div style={{ fontSize:12, color:'var(--t2)' }}>{f.cargo}</div>
              </div>
              <div style={{ fontSize:12, textAlign:'right', display:'flex', flexDirection:'column', gap:2 }}>
                <span>Bruto: {fmtMoeda(f.salario_bruto)}</span>
                <span style={{ color:'var(--red)' }}>INSS: -{fmtMoeda(f.inss)}</span>
                <span style={{ color:'var(--red)' }}>IRRF: -{fmtMoeda(f.irrf)}</span>
                <span style={{ fontWeight:700, color:'var(--green)' }}>Líq: {fmtMoeda(f.liquido)}</span>
              </div>
            </div>
          ))}
          <div className="card" style={{ textAlign:'right', fontWeight:700 }}>
            Total a pagar: {fmtMoeda((folha||[]).reduce((s,f) => s + (parseFloat(f.liquido)||0), 0))}
          </div>
        </div>
      )}
    </div>
  )
}

function DPBancoHoras() {
  const { data: pontos, loading } = useData(() => pontoService.listAllHoje(), [])
  return (
    <div>
      <div style={{ color:'var(--t2)', fontSize:14, marginBottom:12 }}>Registros de hoje</div>
      {loading ? <Spinner /> : (pontos||[]).length === 0 ? <Empty text="Nenhum ponto hoje" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {(pontos||[]).map((p, i) => (
            <div key={i} className="card" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{p.usuario_nome}</div>
                <div style={{ fontSize:12, color:'var(--t2)' }}>{p.tipo} · {new Date(p.data_hora).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}</div>
              </div>
              <Badge variant={p.tipo==='entrada'?'bg-green':'bg'}>{p.tipo}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DPEspelhoPonto() {
  const mesAtual = new Date().toISOString().slice(0,7)
  const [mes, setMes] = useState(mesAtual)
  const [usuarioId, setUsuarioId] = useState('')
  const { data: usuarios } = useData(() => usuariosService.list(), [])
  const { data: pontos, loading } = useData(
    () => usuarioId ? pontoService.listMes(usuarioId, mes) : Promise.resolve([]),
    [usuarioId, mes]
  )
  const porDia = {}
  for (const p of pontos || []) { if (!porDia[p.data]) porDia[p.data] = []; porDia[p.data].push(p) }
  const dias = Object.keys(porDia).sort()
  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
        <select className="fi" style={{ flex:1 }} value={usuarioId} onChange={e => setUsuarioId(e.target.value)}>
          <option value="">Selecione colaborador...</option>
          {(usuarios||[]).map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
        <input className="fi" type="month" style={{ width:'auto' }} value={mes} onChange={e => setMes(e.target.value)} />
      </div>
      {!usuarioId ? <Empty text="Selecione um colaborador" /> :
       loading ? <Spinner /> :
       dias.length === 0 ? <Empty text="Sem registros no período" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {dias.map(dia => (
            <div key={dia} className="card" style={{ padding:'10px 14px' }}>
              <div style={{ fontWeight:600, fontSize:13, marginBottom:6 }}>
                {new Date(dia+'T12:00').toLocaleDateString('pt-BR',{weekday:'short',day:'numeric',month:'short'})}
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {porDia[dia].map((p, i) => {
                  const tm = normTipoMarcacao(p)
                  return (
                    <span key={i} style={{ fontSize:12, padding:'3px 8px', borderRadius:8, background:PONTO_BG[tm]||'var(--bg3)', color:PONTO_COLORS[tm]||'var(--t2)', fontWeight:600 }}>
                      {PONTO_LABELS[tm]||p.tipo}: {new Date(p.data_hora).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
                      {p.dentro_cerca === false && ' ⚠️'}
                    </span>
                  )
                })}
              </div>
              {(() => { const s = calcSaldoHoras(porDia[dia]); return s ? <div style={{ fontSize:12, color:'var(--t2)', marginTop:4 }}>⏱ {s}</div> : null })()}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DPOcorrencias() {
  const [filtroStatus, setFiltroStatus] = useState('pendente')
  const [filtroTipo, setFiltroTipo] = useState('')
  const { data: lista, loading, reload } = useData(
    () => pontoOcorrenciasService.list({ status: filtroStatus || undefined }),
    [filtroStatus]
  )
  const { perfil } = useAuth()
  const act = useAction()
  const TIPO_COR = { atraso:'var(--amber)', saida_antecipada:'var(--amber)', falta:'var(--red)', hora_extra:'var(--blue)', esquecimento_ponto:'var(--red)', marcacao_fora_cerca:'var(--red)' }
  const filtrado = (lista||[]).filter(oc => !filtroTipo || oc.tipo === filtroTipo)

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
        <select className="fi" style={{ flex:1 }} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos status</option>
          {['pendente','aprovado','rejeitado'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="fi" style={{ flex:1 }} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="">Todos tipos</option>
          {['atraso','saida_antecipada','falta','hora_extra','esquecimento_ponto','marcacao_fora_cerca'].map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
        </select>
      </div>
      {loading ? <Spinner /> : filtrado.length === 0 ? <Empty text="Nenhuma ocorrência" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtrado.map(oc => (
            <div key={oc.id} className="card" style={{ padding:'10px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:13 }}>{oc.usuarios?.full_name || oc.usuario_id}</div>
                  <div style={{ fontSize:12, color:'var(--t2)' }}>{new Date(oc.data+'T12:00').toLocaleDateString('pt-BR')}{oc.minutos ? ` · ${oc.minutos}min` : ''}</div>
                </div>
                <span style={{ fontSize:11, background:TIPO_COR[oc.tipo]||'var(--t2)', color:'#fff', padding:'2px 8px', borderRadius:12 }}>{(oc.tipo||'').replace(/_/g,' ')}</span>
              </div>
              {oc.descricao && <div style={{ fontSize:12, color:'var(--t2)', marginBottom:6 }}>{oc.descricao}</div>}
              {oc.status === 'pendente' ? (
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn btn-p btn-sm" onClick={async () => { try { await act.run(() => pontoOcorrenciasService.aprovar(oc.id, perfil?.id)); reload(); toast.success('Aprovada') } catch(e) { toast.error(e.message) } }} disabled={act.loading}>Aprovar</button>
                  <button className="btn btn-s btn-sm" onClick={async () => { try { await act.run(() => pontoOcorrenciasService.rejeitar(oc.id)); reload(); toast.success('Rejeitada') } catch(e) { toast.error(e.message) } }} disabled={act.loading}>Rejeitar</button>
                </div>
              ) : <Badge variant={oc.status==='aprovado'?'bg-green':'bg'}>{oc.status}</Badge>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DPEscalas() {
  const [usuarioId, setUsuarioId] = useState('')
  const { data: usuarios } = useData(() => usuariosService.list(), [])
  const { data: escalas, reload } = useData(() => escalasTrabalhoService.list(usuarioId || undefined), [usuarioId])
  const [modal, setModal] = useState(null)
  const emptyE = { usuario_id:'', dia_semana:'', hora_entrada:'', hora_saida_almoco:'', hora_retorno_almoco:'', hora_saida:'', tolerancia_minutos:10, ativo:true }
  const [form, setForm] = useState(emptyE)
  const act = useAction()
  const up = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const DIAS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']

  const salvar = async () => {
    if (!form.usuario_id || !form.hora_entrada || !form.hora_saida) return toast.error('Colaborador, entrada e saída são obrigatórios')
    try {
      const payload = { ...form, dia_semana: form.dia_semana === '' ? null : Number(form.dia_semana), tolerancia_minutos: Number(form.tolerancia_minutos)||10 }
      if (!modal.item) await act.run(() => escalasTrabalhoService.create(payload))
      else await act.run(() => escalasTrabalhoService.update(modal.item.id, payload))
      toast.success('Salvo'); setModal(null); reload()
    } catch(e) { toast.error(e.message) }
  }

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'center', flexWrap:'wrap' }}>
        <select className="fi" style={{ flex:1 }} value={usuarioId} onChange={e => setUsuarioId(e.target.value)}>
          <option value="">Todos colaboradores</option>
          {(usuarios||[]).map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
        <button className="btn btn-p btn-sm" onClick={() => { setForm(emptyE); setModal({}) }}>+ Nova Escala</button>
      </div>
      {(escalas||[]).length === 0 ? <Empty text="Nenhuma escala cadastrada" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {(escalas||[]).map(e => (
            <div key={e.id} className="card" style={{ padding:'10px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:13 }}>{(usuarios||[]).find(u => u.id === e.usuario_id)?.full_name || e.usuario_id}</div>
                  <div style={{ fontSize:12, color:'var(--t2)' }}>{e.dia_semana !== null && e.dia_semana !== undefined ? DIAS[e.dia_semana] : 'Todos os dias'} · Entrada: {e.hora_entrada} · Saída: {e.hora_saida}</div>
                  {e.hora_saida_almoco && <div style={{ fontSize:12, color:'var(--t2)' }}>Almoço: {e.hora_saida_almoco} - {e.hora_retorno_almoco}</div>}
                  <div style={{ fontSize:12, color:'var(--t3)' }}>Tolerância: {e.tolerancia_minutos}min</div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn btn-s btn-sm" onClick={() => { setForm({ ...emptyE, ...e, dia_semana: e.dia_semana ?? '' }); setModal({ item:e }) }}>Editar</button>
                  <button className="btn btn-s btn-sm" style={{ color:'var(--red)' }} onClick={async () => { try { await escalasTrabalhoService.remove(e.id); reload(); toast.success('Removida') } catch(ex) { toast.error(ex.message) } }}>×</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <Modal title={modal.item ? 'Editar Escala' : 'Nova Escala'} onClose={() => setModal(null)}>
          <div className="grid2">
            <div className="fg" style={{ gridColumn:'1/-1' }}>
              <label className="fl">Colaborador *</label>
              <select className="fi" value={form.usuario_id} onChange={up('usuario_id')}>
                <option value="">Selecione...</option>
                {(usuarios||[]).map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
            <div className="fg">
              <label className="fl">Dia da Semana</label>
              <select className="fi" value={form.dia_semana} onChange={up('dia_semana')}>
                <option value="">Todos os dias</option>
                {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">Tolerância (min)</label><input className="fi" type="number" value={form.tolerancia_minutos} onChange={up('tolerancia_minutos')} /></div>
            <div className="fg"><label className="fl">Entrada *</label><input className="fi" type="time" value={form.hora_entrada} onChange={up('hora_entrada')} /></div>
            <div className="fg"><label className="fl">Saída *</label><input className="fi" type="time" value={form.hora_saida} onChange={up('hora_saida')} /></div>
            <div className="fg"><label className="fl">Saída Almoço</label><input className="fi" type="time" value={form.hora_saida_almoco} onChange={up('hora_saida_almoco')} /></div>
            <div className="fg"><label className="fl">Retorno Almoço</label><input className="fi" type="time" value={form.hora_retorno_almoco} onChange={up('hora_retorno_almoco')} /></div>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button className="btn btn-p" style={{ flex:1 }} onClick={salvar} disabled={act.loading}>{act.loading ? '...' : 'Salvar'}</button>
            <button className="btn btn-s" onClick={() => setModal(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function DPCercaVirtual() {
  const { data: lojas } = useData(() => lojasService.list(), [])
  const { data: cercas, reload } = useData(() => cercasVirtuaisService.listAll(), [])
  const [modal, setModal] = useState(null)
  const emptyC = { loja_id:'', nome:'', latitude:'', longitude:'', raio_metros:200, ativo:true }
  const [form, setForm] = useState(emptyC)
  const act = useAction()
  const up = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const salvar = async () => {
    if (!form.nome || !form.latitude || !form.longitude) return toast.error('Nome, latitude e longitude são obrigatórios')
    try {
      const payload = { ...form, latitude: Number(form.latitude), longitude: Number(form.longitude), raio_metros: Number(form.raio_metros)||200, loja_id: form.loja_id || null }
      if (!modal.item) await act.run(() => cercasVirtuaisService.create(payload))
      else await act.run(() => cercasVirtuaisService.update(modal.item.id, payload))
      toast.success('Salvo'); setModal(null); reload()
    } catch(e) { toast.error(e.message) }
  }

  const capturarGPS = () => {
    if (!navigator.geolocation) return toast.error('GPS não disponível')
    navigator.geolocation.getCurrentPosition(
      pos => setForm(p => ({ ...p, latitude: pos.coords.latitude.toFixed(7), longitude: pos.coords.longitude.toFixed(7) })),
      () => toast.error('Não foi possível obter localização'),
      { timeout: 8000 }
    )
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
        <button className="btn btn-p btn-sm" onClick={() => { setForm(emptyC); setModal({}) }}>+ Nova Cerca</button>
      </div>
      {(cercas||[]).length === 0 ? <Empty text="Nenhuma cerca virtual cadastrada" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {(cercas||[]).map(c => (
            <div key={c.id} className="card" style={{ padding:'10px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:13 }}>{c.nome}</div>
                  <div style={{ fontSize:12, color:'var(--t2)' }}>{(lojas||[]).find(l => l.id === c.loja_id)?.nome || 'Sem loja'} · Raio: {c.raio_metros}m</div>
                  <div style={{ fontSize:12, color:'var(--t3)' }}>{Number(c.latitude).toFixed(5)}, {Number(c.longitude).toFixed(5)}</div>
                </div>
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <Badge variant={c.ativo?'bg-green':'bg'}>{c.ativo?'Ativa':'Inativa'}</Badge>
                  <button className="btn btn-s btn-sm" onClick={() => { setForm({ ...emptyC, ...c, loja_id: c.loja_id||'' }); setModal({ item:c }) }}>Editar</button>
                  <button className="btn btn-s btn-sm" style={{ color:'var(--red)' }} onClick={async () => { try { await cercasVirtuaisService.remove(c.id); reload(); toast.success('Removida') } catch(ex) { toast.error(ex.message) } }}>×</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <Modal title={modal.item ? 'Editar Cerca Virtual' : 'Nova Cerca Virtual'} onClose={() => setModal(null)}>
          <div className="grid2">
            <div className="fg" style={{ gridColumn:'1/-1' }}><label className="fl">Nome *</label><input className="fi" value={form.nome} onChange={up('nome')} /></div>
            <div className="fg" style={{ gridColumn:'1/-1' }}>
              <label className="fl">Loja</label>
              <select className="fi" value={form.loja_id} onChange={up('loja_id')}>
                <option value="">Sem loja específica</option>
                {(lojas||[]).map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">Latitude *</label><input className="fi" type="number" step="any" value={form.latitude} onChange={up('latitude')} /></div>
            <div className="fg"><label className="fl">Longitude *</label><input className="fi" type="number" step="any" value={form.longitude} onChange={up('longitude')} /></div>
            <div className="fg"><label className="fl">Raio (metros)</label><input className="fi" type="number" value={form.raio_metros} onChange={up('raio_metros')} /></div>
            <div className="fg" style={{ display:'flex', alignItems:'flex-end' }}>
              <button className="btn btn-s" style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }} onClick={capturarGPS}><MapPin size={14} strokeWidth={1.8} /> Usar minha localização</button>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button className="btn btn-p" style={{ flex:1 }} onClick={salvar} disabled={act.loading}>{act.loading ? '...' : 'Salvar'}</button>
            <button className="btn btn-s" onClick={() => setModal(null)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function DPRelatorioPresenca() {
  const mesAtual = new Date().toISOString().slice(0,7)
  const [mes, setMes] = useState(mesAtual)
  const { data: todosPontos, loading } = useData(async () => {
    const { data, error } = await supabase
      .from('pontos').select('*')
      .gte('data', `${mes}-01`).lte('data', `${mes}-31`)
      .order('usuario_nome').order('data_hora')
    if (error) throw error
    return data || []
  }, [mes])

  const resumo = {}
  for (const p of todosPontos || []) {
    if (!resumo[p.usuario_id]) resumo[p.usuario_id] = { nome: p.usuario_nome, diasPresente: new Set(), pontos: [] }
    resumo[p.usuario_id].diasPresente.add(p.data)
    resumo[p.usuario_id].pontos.push(p)
  }
  const linhas = Object.values(resumo).map(r => ({ nome: r.nome, dias: r.diasPresente.size, horas: calcSaldoHoras(r.pontos) || '0h' }))

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(linhas.map(l => ({ 'Colaborador': l.nome, 'Dias presentes': l.dias, 'Horas trabalhadas': l.horas })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Presença')
    XLSX.writeFile(wb, `presenca_${mes}.xlsx`)
  }

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'center', flexWrap:'wrap' }}>
        <input className="fi" type="month" style={{ flex:1 }} value={mes} onChange={e => setMes(e.target.value)} />
        <button className="btn btn-s btn-sm" onClick={exportarExcel} disabled={linhas.length === 0}>Excel</button>
        <button className="btn btn-s btn-sm" onClick={() => window.print()} disabled={linhas.length === 0}>PDF</button>
      </div>
      {loading ? <Spinner /> : linhas.length === 0 ? <Empty text="Sem dados no período" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {linhas.map((l, i) => (
            <div key={i} className="card" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px' }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, flexShrink:0 }}>{l.nome?.[0]?.toUpperCase()}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:13 }}>{l.nome}</div>
                <div style={{ fontSize:12, color:'var(--t2)' }}>{l.dias} dias presentes · {l.horas}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DPControlePonto({ lojaFiltro }) {
  const [subTab, setSubTab] = useState('espelho')
  const SUB = [
    { id:'espelho',     label:'Espelho de Ponto' },
    { id:'ocorrencias', label:'Ocorrências' },
    { id:'escalas',     label:'Escalas' },
    { id:'cerca',       label:'Cerca Virtual' },
    { id:'relatorio',   label:'Relatório de Presença' },
  ]
  return (
    <div>
      <div style={{ display:'flex', gap:4, marginBottom:14, flexWrap:'wrap' }}>
        {SUB.map(t => <button key={t.id} className={`btn btn-${subTab===t.id?'p':'s'} btn-sm`} onClick={() => setSubTab(t.id)}>{t.label}</button>)}
      </div>
      {subTab === 'espelho'     && <DPEspelhoPonto />}
      {subTab === 'ocorrencias' && <DPOcorrencias />}
      {subTab === 'escalas'     && <DPEscalas />}
      {subTab === 'cerca'       && <DPCercaVirtual />}
      {subTab === 'relatorio'   && <DPRelatorioPresenca />}
    </div>
  )
}

export default function DP() {
  const { lojas } = useLojaFiltro()
  const [tab, setTab] = useState('funcionarios')
  const [lojaFiltroDP, setLojaFiltroDP] = useState('')
  const TABS = [{ id:'funcionarios',label:'Funcionários' },{ id:'folha',label:'Folha de Pagamento' },{ id:'banco',label:'Banco de Horas' },{ id:'controle_ponto',label:'Controle de Ponto' }]
  return (
    <div className="page">
      <div className="ph">
        <h1>Dep. Pessoal</h1>
        <select className="fi" style={{ width:'auto', fontSize:13 }} value={lojaFiltroDP} onChange={e => setLojaFiltroDP(e.target.value)}>
          <option value="">Todas as lojas</option>
          {(lojas ?? []).map(l => <option key={l.id || l.nome} value={l.nome}>{l.nome}</option>)}
        </select>
      </div>
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {TABS.map(t => <button key={t.id} className={`btn btn-${tab===t.id?'p':'s'} btn-sm`} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>
      {tab === 'funcionarios' && <DPFuncionarios lojaFiltro={lojaFiltroDP} />}
      {tab === 'folha' && <DPFolha lojaFiltro={lojaFiltroDP} />}
      {tab === 'banco' && <DPBancoHoras />}
      {tab === 'controle_ponto' && <DPControlePonto lojaFiltro={lojaFiltroDP} />}
    </div>
  )
}
