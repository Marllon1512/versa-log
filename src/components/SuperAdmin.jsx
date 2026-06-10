import React, { useState, useEffect, useCallback } from 'react'
import { Crown, Building2, Users, Plus, Edit2, Power, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Btn, Badge, Modal } from './ui/index'
import { toast } from '../lib/toast'

const PLANOS = [
  { value: 'trial',      label: 'Trial' },
  { value: 'basico',     label: 'Básico' },
  { value: 'pro',        label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
]

const PLANO_BADGE = { trial: 'bg-amber', basico: 'bg-blue', pro: 'bg-green', enterprise: 'bg-accent' }

const PERFIS = [
  'admin','gestor','diretor','gerente','assistente_admin','vendedor',
  'gerente_logistica','supervisor_logistica','expedidor','entregador',
  'motorista','separador','conferente','estoque','tecnico','atendente','contador',
]

async function sha256(msg) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function gerarSenhaTemp() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function fmtData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return mobile
}

const LABEL_S = { fontSize: 12, color: 'var(--t2)', marginBottom: 4, fontWeight: 500 }
const INPUT_S = { width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg2)', color: 'var(--t1)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }
const ROW_2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }

// ── Modal Empresa ─────────────────────────────────────────────
function ModalEmpresa({ empresa, onClose, onSaved }) {
  const isEdit = !!empresa
  const [form, setForm] = useState({
    nome:             empresa?.nome               || '',
    documento:        empresa?.documento          || '',
    nome_sistema:     empresa?.nome_sistema       || '',
    logo_url:         empresa?.logo_url           || '',
    cor_primaria:     empresa?.cor_primaria       || '#6366f1',
    tema_padrao:      empresa?.tema_padrao        || 'dark',
    plano:            empresa?.plano              || 'trial',
    data_inicio_plano: empresa?.data_inicio_plano?.slice(0, 10) || '',
    data_fim_plano:   empresa?.data_fim_plano?.slice(0, 10)     || '',
    ativo:            empresa?.ativo !== false,
  })
  const [saving, setSaving] = useState(false)
  const [erro, setErro]     = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const salvar = async () => {
    if (!form.nome.trim()) { setErro('Nome é obrigatório'); return }
    setSaving(true); setErro('')
    try {
      const payload = {
        nome:             form.nome.trim(),
        documento:        form.documento.trim()     || null,
        nome_sistema:     form.nome_sistema.trim()  || null,
        logo_url:         form.logo_url.trim()      || null,
        cor_primaria:     form.cor_primaria         || '#6366f1',
        tema_padrao:      form.tema_padrao,
        plano:            form.plano,
        data_inicio_plano: form.data_inicio_plano   || null,
        data_fim_plano:   form.data_fim_plano        || null,
        ativo:            form.ativo,
      }
      if (isEdit) {
        const { error } = await supabase.from('empresas').update(payload).eq('id', empresa.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('empresas').insert(payload)
        if (error) throw error
      }
      toast.success(isEdit ? 'Empresa atualizada!' : 'Empresa criada!')
      onSaved()
    } catch (e) {
      setErro(e.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={isEdit ? 'Editar Empresa' : 'Nova Empresa'}
      onClose={onClose}
      size="lg"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Btn>
          <Btn onClick={salvar} loading={saving}>Salvar</Btn>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={LABEL_S}>Nome da Empresa *</div>
          <input style={INPUT_S} value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Móveis ABC Ltda" />
        </div>

        <div style={ROW_2}>
          <div>
            <div style={LABEL_S}>CNPJ / Documento</div>
            <input style={INPUT_S} value={form.documento} onChange={e => set('documento', e.target.value)} placeholder="00.000.000/0001-00" />
          </div>
          <div>
            <div style={LABEL_S}>Nome no Sistema</div>
            <input style={INPUT_S} value={form.nome_sistema} onChange={e => set('nome_sistema', e.target.value)} placeholder="Ex: ERP Móveis ABC" />
          </div>
        </div>

        <div>
          <div style={LABEL_S}>URL do Logo (opcional)</div>
          <input style={INPUT_S} value={form.logo_url} onChange={e => set('logo_url', e.target.value)} placeholder="https://..." />
        </div>

        <div style={ROW_2}>
          <div>
            <div style={LABEL_S}>Cor Primária</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="color" value={form.cor_primaria} onChange={e => set('cor_primaria', e.target.value)}
                style={{ width: 40, height: 38, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: 'none', padding: 2, flexShrink: 0 }} />
              <input style={{ ...INPUT_S, flex: 1, width: 'auto' }} value={form.cor_primaria} onChange={e => set('cor_primaria', e.target.value)} placeholder="#6366f1" />
            </div>
          </div>
          <div>
            <div style={LABEL_S}>Tema Padrão</div>
            <select style={INPUT_S} value={form.tema_padrao} onChange={e => set('tema_padrao', e.target.value)}>
              <option value="dark">Escuro</option>
              <option value="light">Claro</option>
            </select>
          </div>
        </div>

        <div style={ROW_2}>
          <div>
            <div style={LABEL_S}>Plano</div>
            <select style={INPUT_S} value={form.plano} onChange={e => set('plano', e.target.value)}>
              {PLANOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <div style={LABEL_S}>Status</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.ativo} onChange={e => set('ativo', e.target.checked)} />
              <span style={{ fontSize: 14 }}>{form.ativo ? 'Ativo' : 'Inativo'}</span>
            </label>
          </div>
        </div>

        <div style={ROW_2}>
          <div>
            <div style={LABEL_S}>Data Início do Plano</div>
            <input type="date" style={INPUT_S} value={form.data_inicio_plano} onChange={e => set('data_inicio_plano', e.target.value)} />
          </div>
          <div>
            <div style={LABEL_S}>Data Fim do Plano</div>
            <input type="date" style={INPUT_S} value={form.data_fim_plano} onChange={e => set('data_fim_plano', e.target.value)} />
          </div>
        </div>

        {erro && <div style={{ color: '#ef4444', fontSize: 13 }}>{erro}</div>}
      </div>
    </Modal>
  )
}

// ── Modal Usuário ─────────────────────────────────────────────
function ModalUsuario({ empresas, onClose, onSaved }) {
  const [form, setForm] = useState({
    empresa_id: empresas[0]?.id || '',
    full_name:  '',
    email:      '',
    usuario:    '',
    perfil:     'vendedor',
    loja:       '',
    ativo:      true,
  })
  const [senhaCriada, setSenhaCriada] = useState('')
  const [saving, setSaving]           = useState(false)
  const [erro, setErro]               = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const criar = async () => {
    if (!form.full_name.trim()) { setErro('Nome é obrigatório'); return }
    if (!form.email.trim())     { setErro('Email é obrigatório'); return }
    if (!form.empresa_id)       { setErro('Empresa é obrigatória'); return }
    setSaving(true); setErro('')
    try {
      const senha = gerarSenhaTemp()
      const hash  = await sha256(senha)
      const { error } = await supabase.from('usuarios').insert({
        empresa_id: form.empresa_id,
        full_name:  form.full_name.trim(),
        email:      form.email.trim().toLowerCase(),
        usuario:    form.usuario.trim()  || null,
        perfil:     form.perfil,
        role:       form.perfil,
        loja:       form.loja.trim()     || null,
        ativo:      form.ativo,
        senha_hash: hash,
      })
      if (error) throw error
      toast.success('Usuário criado!')
      setSenhaCriada(senha)
      onSaved()
    } catch (e) {
      setErro(e.message || 'Erro ao criar usuário')
    } finally {
      setSaving(false)
    }
  }

  if (senhaCriada) {
    return (
      <Modal title="Usuário criado!" onClose={onClose}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--t2)' }}>Copie a senha temporária e envie ao usuário:</div>
          <div style={{
            background: 'var(--bg2)', border: '2px solid var(--accent)', borderRadius: 10,
            padding: '16px 20px', fontFamily: 'var(--mono, monospace)', fontSize: 22,
            fontWeight: 700, letterSpacing: 4, color: 'var(--t1)', userSelect: 'all',
          }}>
            {senhaCriada}
          </div>
          <div style={{ fontSize: 12, color: 'var(--t3)' }}>O usuário deverá alterar a senha no primeiro acesso.</div>
          <Btn variant="secondary" onClick={() => { navigator.clipboard?.writeText(senhaCriada); toast.success('Copiado!') }}>
            📋 Copiar senha
          </Btn>
          <Btn onClick={onClose}>Fechar</Btn>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      title="Novo Usuário"
      onClose={onClose}
      size="lg"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Btn>
          <Btn onClick={criar} loading={saving}>Criar Usuário</Btn>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={LABEL_S}>Empresa *</div>
          <select style={INPUT_S} value={form.empresa_id} onChange={e => set('empresa_id', e.target.value)}>
            <option value="">— Selecione —</option>
            {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nome}</option>)}
          </select>
        </div>

        <div style={ROW_2}>
          <div>
            <div style={LABEL_S}>Nome Completo *</div>
            <input style={INPUT_S} value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="João Silva" />
          </div>
          <div>
            <div style={LABEL_S}>Email *</div>
            <input type="email" style={INPUT_S} value={form.email} onChange={e => set('email', e.target.value)} placeholder="joao@empresa.com" />
          </div>
        </div>

        <div style={ROW_2}>
          <div>
            <div style={LABEL_S}>Usuário (login)</div>
            <input style={INPUT_S} value={form.usuario} onChange={e => set('usuario', e.target.value)} placeholder="joaosilva (opcional)" />
          </div>
          <div>
            <div style={LABEL_S}>Perfil</div>
            <select style={INPUT_S} value={form.perfil} onChange={e => set('perfil', e.target.value)}>
              {PERFIS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div style={ROW_2}>
          <div>
            <div style={LABEL_S}>Loja (opcional)</div>
            <input style={INPUT_S} value={form.loja} onChange={e => set('loja', e.target.value)} placeholder="Nome da loja" />
          </div>
          <div>
            <div style={LABEL_S}>Status</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.ativo} onChange={e => set('ativo', e.target.checked)} />
              <span style={{ fontSize: 14 }}>Ativo</span>
            </label>
          </div>
        </div>

        {erro && <div style={{ color: '#ef4444', fontSize: 13 }}>{erro}</div>}
      </div>
    </Modal>
  )
}

// ── Aba Empresas ─────────────────────────────────────────────
function TabEmpresas() {
  const isMobile = useIsMobile()
  const [empresas, setEmpresas]       = useState([])
  const [contagens, setContagens]     = useState({})
  const [loading, setLoading]         = useState(true)
  const [busca, setBusca]             = useState('')
  const [modalEmpresa, setModalEmpresa] = useState(null)
  const [toggling, setToggling]       = useState(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: emps }, { data: users }] = await Promise.all([
        supabase.from('empresas').select('*').order('nome'),
        supabase.from('usuarios').select('id, empresa_id'),
      ])
      setEmpresas(emps || [])
      const cnt = {}
      for (const u of (users || [])) {
        if (u.empresa_id) cnt[u.empresa_id] = (cnt[u.empresa_id] || 0) + 1
      }
      setContagens(cnt)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const toggleAtivo = async (empresa) => {
    setToggling(empresa.id)
    try {
      const { error } = await supabase.from('empresas').update({ ativo: !empresa.ativo }).eq('id', empresa.id)
      if (error) throw error
      toast.success(empresa.ativo ? 'Empresa desativada' : 'Empresa ativada')
      await carregar()
    } catch (e) {
      toast.error('Erro: ' + e.message)
    } finally {
      setToggling(null)
    }
  }

  const filtradas = empresas.filter(e =>
    !busca ||
    e.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    e.nome_sistema?.toLowerCase().includes(busca.toLowerCase())
  )

  const planoLabel = (p) => PLANOS.find(x => x.value === p)?.label || p || '—'

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={14} strokeWidth={1.7} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)', pointerEvents: 'none' }} />
          <input className="fi" style={{ paddingLeft: 30, width: '100%' }} placeholder="Buscar por nome..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <Btn size="sm" onClick={() => setModalEmpresa('new')}>
          <Plus size={14} strokeWidth={2} style={{ marginRight: 4 }} /> Nova Empresa
        </Btn>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>Carregando...</div>
      ) : filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>Nenhuma empresa encontrada</div>
      ) : isMobile ? (
        // ── Cards mobile ──
        filtradas.map(emp => (
          <div className="card" key={emp.id} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{emp.nome}</div>
                {emp.documento && <div style={{ fontSize: 11, color: 'var(--t3)' }}>{emp.documento}</div>}
              </div>
              <Badge variant={emp.ativo ? 'bg-green' : 'bg'}>{emp.ativo ? 'Ativo' : 'Inativo'}</Badge>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12, color: 'var(--t2)', marginBottom: 10 }}>
              <div><span style={{ color: 'var(--t3)' }}>Sistema: </span>{emp.nome_sistema || '—'}</div>
              <div><span style={{ color: 'var(--t3)' }}>Plano: </span>{planoLabel(emp.plano)}</div>
              <div><span style={{ color: 'var(--t3)' }}>Início: </span>{fmtData(emp.data_inicio_plano)}</div>
              <div><span style={{ color: 'var(--t3)' }}>Fim: </span>{fmtData(emp.data_fim_plano)}</div>
              <div><span style={{ color: 'var(--t3)' }}>Usuários: </span><strong>{contagens[emp.id] || 0}</strong></div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn variant="secondary" size="sm" onClick={() => setModalEmpresa(emp)}>
                <Edit2 size={12} style={{ marginRight: 4 }} /> Editar
              </Btn>
              <Btn variant={emp.ativo ? 'secondary' : 'success'} size="sm"
                onClick={() => toggleAtivo(emp)} disabled={toggling === emp.id}>
                <Power size={12} style={{ marginRight: 4 }} /> {emp.ativo ? 'Desativar' : 'Ativar'}
              </Btn>
            </div>
          </div>
        ))
      ) : (
        // ── Tabela desktop ──
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Sistema</th>
                <th>Plano</th>
                <th>Início</th>
                <th>Fim</th>
                <th>Usuários</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(emp => (
                <tr key={emp.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{emp.nome}</div>
                    {emp.documento && <div style={{ fontSize: 11, color: 'var(--t3)' }}>{emp.documento}</div>}
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--t2)' }}>{emp.nome_sistema || '—'}</td>
                  <td>
                    <Badge variant={PLANO_BADGE[emp.plano] || 'bg'}>{planoLabel(emp.plano)}</Badge>
                  </td>
                  <td style={{ fontSize: 12 }}>{fmtData(emp.data_inicio_plano)}</td>
                  <td style={{ fontSize: 12 }}>{fmtData(emp.data_fim_plano)}</td>
                  <td style={{ fontSize: 13, fontWeight: 600 }}>{contagens[emp.id] || 0}</td>
                  <td>
                    <Badge variant={emp.ativo ? 'bg-green' : 'bg'}>{emp.ativo ? 'Ativo' : 'Inativo'}</Badge>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-g btn-sm btn-ico" onClick={() => setModalEmpresa(emp)} title="Editar">
                        <Edit2 size={13} strokeWidth={1.7} />
                      </button>
                      <button
                        className={`btn btn-sm btn-ico ${emp.ativo ? 'btn-s' : 'btn-success'}`}
                        onClick={() => toggleAtivo(emp)}
                        disabled={toggling === emp.id}
                        title={emp.ativo ? 'Desativar' : 'Ativar'}
                      >
                        <Power size={13} strokeWidth={1.7} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalEmpresa !== null && (
        <ModalEmpresa
          empresa={modalEmpresa === 'new' ? null : modalEmpresa}
          onClose={() => setModalEmpresa(null)}
          onSaved={() => { setModalEmpresa(null); carregar() }}
        />
      )}
    </div>
  )
}

// ── Aba Usuários ─────────────────────────────────────────────
function TabUsuarios() {
  const [usuarios, setUsuarios]   = useState([])
  const [empresas, setEmpresas]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [busca, setBusca]         = useState('')
  const [showModal, setShowModal] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: users }, { data: emps }] = await Promise.all([
        supabase.from('usuarios').select('id, full_name, email, perfil, role, empresa_id, ativo, loja').order('full_name'),
        supabase.from('empresas').select('id, nome').order('nome'),
      ])
      setUsuarios(users || [])
      setEmpresas(emps || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const empresaNome = useCallback((id) => empresas.find(e => e.id === id)?.nome || null, [empresas])

  const filtrados = usuarios.filter(u =>
    !busca ||
    u.full_name?.toLowerCase().includes(busca.toLowerCase()) ||
    u.email?.toLowerCase().includes(busca.toLowerCase()) ||
    (empresaNome(u.empresa_id) || '').toLowerCase().includes(busca.toLowerCase())
  )

  const porEmpresa = empresas
    .map(emp => ({ empresa: emp, lista: filtrados.filter(u => u.empresa_id === emp.id) }))
    .filter(g => g.lista.length > 0)

  const semEmpresa = filtrados.filter(u => !u.empresa_id)

  const UserTable = ({ lista }) => (
    <div className="card" style={{ overflowX: 'auto' }}>
      <table className="tbl">
        <thead>
          <tr><th>Nome</th><th>Email</th><th>Perfil</th><th>Loja</th><th>Status</th></tr>
        </thead>
        <tbody>
          {lista.map(u => (
            <tr key={u.id}>
              <td style={{ fontWeight: 500, fontSize: 13 }}>{u.full_name || '—'}</td>
              <td style={{ fontSize: 12, color: 'var(--t2)' }}>{u.email || '—'}</td>
              <td style={{ fontSize: 12 }}>{u.perfil || u.role || '—'}</td>
              <td style={{ fontSize: 12, color: 'var(--t2)' }}>{u.loja || '—'}</td>
              <td><Badge variant={u.ativo !== false ? 'bg-green' : 'bg'}>{u.ativo !== false ? 'Ativo' : 'Inativo'}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={14} strokeWidth={1.7} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)', pointerEvents: 'none' }} />
          <input className="fi" style={{ paddingLeft: 30, width: '100%' }} placeholder="Buscar por nome, email ou empresa..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <Btn size="sm" onClick={() => setShowModal(true)}>
          <Plus size={14} strokeWidth={2} style={{ marginRight: 4 }} /> Novo Usuário
        </Btn>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>Nenhum usuário encontrado</div>
      ) : (
        <>
          {porEmpresa.map(({ empresa, lista }) => (
            <div key={empresa.id} style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building2 size={14} strokeWidth={1.7} />
                {empresa.nome}
                <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 400 }}>({lista.length} {lista.length === 1 ? 'usuário' : 'usuários'})</span>
              </div>
              <UserTable lista={lista} />
            </div>
          ))}
          {semEmpresa.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--t3)', marginBottom: 8 }}>
                Sem empresa vinculada ({semEmpresa.length})
              </div>
              <UserTable lista={semEmpresa} />
            </div>
          )}
        </>
      )}

      {showModal && (
        <ModalUsuario
          empresas={empresas}
          onClose={() => setShowModal(false)}
          onSaved={() => { carregar() }}
        />
      )}
    </div>
  )
}

// ── Componente raiz ───────────────────────────────────────────
export function SuperAdmin() {
  const { isSuperAdmin } = useAuth()
  const [tab, setTab] = useState('empresas')

  if (!isSuperAdmin) {
    return (
      <div className="page">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, gap: 12, color: 'var(--t3)' }}>
          <Crown size={44} strokeWidth={1.2} />
          <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--t1)' }}>Acesso Negado</div>
          <div style={{ fontSize: 13 }}>Esta área é restrita a Super Admins.</div>
        </div>
      </div>
    )
  }

  const TABS = [
    { id: 'empresas',  label: 'Empresas',  Icon: Building2 },
    { id: 'usuarios',  label: 'Usuários',  Icon: Users     },
  ]

  return (
    <div className="page">
      <div className="ph">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Crown size={20} strokeWidth={1.7} style={{ color: 'var(--accent)' }} />
          <h1>Super Admin</h1>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              background: 'none', border: 'none', padding: '8px 18px',
              cursor: 'pointer', fontSize: 13,
              fontWeight: tab === id ? 600 : 400,
              color: tab === id ? 'var(--accent)' : 'var(--t2)',
              borderBottom: tab === id ? '2px solid var(--accent)' : '2px solid transparent',
              display: 'flex', alignItems: 'center', gap: 6,
              marginBottom: -1,
            }}
          >
            <Icon size={14} strokeWidth={1.7} /> {label}
          </button>
        ))}
      </div>

      {tab === 'empresas' ? <TabEmpresas /> : <TabUsuarios />}
    </div>
  )
}
