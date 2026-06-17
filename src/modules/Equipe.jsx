import { useState } from 'react'

import { Truck, Users, Camera } from 'lucide-react'

import { useData, useAction } from '../hooks/index'
import { equipesService, usuariosService } from '../services/index'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { validarTipoImagem } from '../lib/validarTipoImagem'
import { PROFILE_PAGES, PROFILE_LABELS, PAGE_LABELS } from '../constants/perfis'
import { Btn, Badge, Ic, Modal } from '../components/ui/index'
import { LojaSelect } from '../components/LojaSelect'
import { toast } from '../lib/toast'

function PerfilModulosDesc({ perfil: perfilNome }) {
  const mods = PROFILE_PAGES[perfilNome] || []
  if (!mods.length) return null
  return (
    <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 6, lineHeight: 1.6 }}>
      <span style={{ color: 'var(--t2)', fontWeight: 500 }}>Acesso:</span>{' '}
      {mods.map(m => PAGE_LABELS[m] || m).join(', ')}
    </div>
  )
}

function NovaEquipeForm({ usuarios, onClose, onSave }) {
  const [form, setForm] = useState({ nome: '', motorista_id: '', motorista_nome: '', entregadores: [], entregadores_nomes: [], status: 'Ativa' })
  const { run, loading } = useAction()
  const motoristas = usuarios.filter(u => ['motorista', 'entregador'].includes(u.role))
  const entregadores = usuarios.filter(u => u.role === 'entregador')

  return (
    <>
      <div className="mb">
        <div className="fg"><label className="fl">Nome *</label><input className="fi" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Equipe Alpha" /></div>
        <div className="fg">
          <label className="fl">Motorista</label>
          <select className="fi" value={form.motorista_id} onChange={e => {
            const u = motoristas.find(x => x.id === e.target.value)
            setForm(p => ({ ...p, motorista_id: e.target.value, motorista_nome: u?.full_name || '' }))
          }}>
            <option value="">Selecione...</option>
            {motoristas.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
        </div>
        {entregadores.length > 0 && (
          <div className="fg">
            <label className="fl">Entregadores</label>
            {entregadores.map(u => (
              <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 13 }}>
                <input type="checkbox" checked={form.entregadores.includes(u.id)} onChange={e => setForm(p => ({
                  ...p,
                  entregadores: e.target.checked ? [...p.entregadores, u.id] : p.entregadores.filter(x => x !== u.id),
                  entregadores_nomes: e.target.checked ? [...p.entregadores_nomes, u.full_name] : p.entregadores_nomes.filter(x => x !== u.full_name),
                }))} />
                {u.full_name}
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="mf">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn disabled={!form.nome} loading={loading} onClick={() => run(() => onSave(form))}>Salvar</Btn>
      </div>
    </>
  )
}

function NovoUsuarioForm({ onClose, onSave }) {
  const [form, setForm] = useState({ full_name: '', usuario: '', senha: '', perfil: 'vendedor', loja: '', telefone: '' })
  const { run, loading } = useAction()
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const canSave = form.full_name.trim() && form.usuario.trim() && form.senha.length >= 4

  const handleSave = async () => {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(form.senha))
    const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
    await onSave({
      full_name: form.full_name.trim(),
      email: `${form.usuario.trim()}@versalog.local`,
      usuario: form.usuario.trim().toLowerCase(),
      senha_hash: hash,
      perfil: form.perfil,
      role: form.perfil,
      loja: form.loja || null,
      telefone: form.telefone,
    })
  }

  return (
    <>
      <div className="mb">
        <div className="fg"><label className="fl">Nome Completo *</label><input className="fi" value={form.full_name} onChange={up('full_name')} /></div>
        <div className="grid2">
          <div className="fg"><label className="fl">Usuário * (para login)</label><input className="fi" value={form.usuario} onChange={up('usuario')} placeholder="ex: marllon" /></div>
          <div className="fg"><label className="fl">Senha * (mín. 4 caracteres)</label><input className="fi" type="password" value={form.senha} onChange={up('senha')} placeholder="••••••" /></div>
        </div>
        <div className="grid2">
          <div className="fg">
            <label className="fl">Perfil de Acesso</label>
            <select className="fi" value={form.perfil} onChange={up('perfil')}>
              {Object.entries(PROFILE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <PerfilModulosDesc perfil={form.perfil} />
          </div>
          <div className="fg">
            <label className="fl">Loja Vinculada</label>
            <LojaSelect value={form.loja} onChange={loja => setForm(p => ({ ...p, loja }))} placeholder="Sem loja específica" />
          </div>
        </div>
        <div className="fg"><label className="fl">Telefone</label><input className="fi" value={form.telefone} onChange={up('telefone')} type="tel" /></div>
      </div>
      <div className="mf">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn disabled={!canSave} loading={loading} onClick={() => run(handleSave)}>Criar</Btn>
      </div>
    </>
  )
}

function EditarUsuarioModal({ usuario: u, onClose, onSave }) {
  const [form, setForm] = useState({
    full_name: u.full_name || '',
    perfil: u.perfil || u.role || 'vendedor',
    loja: u.loja || '',
    telefone: u.telefone || '',
    nova_senha: '',
    foto_url: u.foto_url || '',
  })
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const { run, loading } = useAction()
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const uploadFoto = async (file) => {
    try { await validarTipoImagem(file) } catch (e) { toast.error(e.message); return }
    setUploadingFoto(true)
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `usuarios/${u.id}/foto.${ext}`
      const { error } = await supabase.storage.from('sistema-assets').upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' })
      if (error) throw new Error(error.message || JSON.stringify(error))
      const { data: pub } = supabase.storage.from('sistema-assets').getPublicUrl(path)
      setForm(p => ({ ...p, foto_url: pub.publicUrl + '?t=' + Date.now() }))
      toast.success('Foto enviada!')
    } catch (e) { toast.error('Erro no upload: ' + e.message) }
    setUploadingFoto(false)
  }

  const handleSave = async () => {
    try {
      const updates = {
        full_name: form.full_name.trim(),
        perfil: form.perfil,
        role: form.perfil,
        loja: form.loja || null,
        telefone: form.telefone,
        foto_url: form.foto_url || null,
      }
      if (form.nova_senha.length >= 4) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(form.nova_senha))
        updates.senha_hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
      }
      await run(() => onSave(updates))
    } catch {
      // error shown via toast in parent handleEditUser
    }
  }

  return (
    <Modal
      title={`Editar — ${u.full_name}`}
      onClose={onClose}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn disabled={!form.full_name.trim()} loading={loading} onClick={handleSave}><Ic n="save" s={13} /> Salvar</Btn>
        </>
      }
    >
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
      <div className="fg"><label className="fl">Nome Completo *</label><input className="fi" value={form.full_name} onChange={up('full_name')} /></div>
      <div className="grid2">
        <div className="fg">
          <label className="fl">Perfil de Acesso</label>
          <select className="fi" value={form.perfil} onChange={up('perfil')}>
            {Object.entries(PROFILE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <PerfilModulosDesc perfil={form.perfil} />
        </div>
        <div className="fg">
          <label className="fl">Loja Vinculada</label>
          <LojaSelect value={form.loja} onChange={loja => setForm(p => ({ ...p, loja }))} placeholder="Sem loja específica" />
        </div>
      </div>
      <div className="fg"><label className="fl">Telefone</label><input className="fi" value={form.telefone} onChange={up('telefone')} type="tel" /></div>
      <div className="fg"><label className="fl">Nova Senha (deixe em branco para manter)</label><input className="fi" type="password" value={form.nova_senha} onChange={up('nova_senha')} placeholder="mín. 4 caracteres" /></div>
      <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>Login: {u.usuario || u.email}</div>
    </Modal>
  )
}

export default function Equipe() {
  const { perfil } = useAuth()
  const [showNewEquipe, setShowNewEquipe] = useState(false)
  const [showNewUser, setShowNewUser] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [buscaUser, setBuscaUser] = useState('')
  const { data: equipes, reload: reloadEq } = useData(() => equipesService.list(), [])
  const { data: usuarios, reload: reloadU } = useData(() => usuariosService.list(), [])

  const handleEquipe = async (dados) => {
    try {
      await equipesService.create(dados)
      await reloadEq()
      setShowNewEquipe(false)
      toast.success('Equipe criada!')
    } catch (e) {
      console.error('[Equipe] handleEquipe:', e)
      toast.error('Erro ao criar equipe: ' + (e.message || 'desconhecido'))
    }
  }

  const handleUser = async (dados) => {
    try {
      await usuariosService.create(dados)
      await reloadU()
      setShowNewUser(false)
      toast.success('Usuário criado com sucesso!')
    } catch (e) {
      console.error('[Equipe] handleUser:', e)
      toast.error('Erro ao criar usuário: ' + (e.message || e.details || 'desconhecido'))
    }
  }

  const handleEditUser = async (id, dados) => {
    try {
      await usuariosService.update(id, dados)
      await reloadU()
      setEditUser(null)
      toast.success('Usuário atualizado!')
    } catch (e) {
      console.error('[Equipe] handleEditUser:', e)
      toast.error('Erro ao atualizar usuário: ' + (e.message || e.details || 'desconhecido'))
    }
  }

  return (
    <div className="page">
      <div className="ph">
        <h1>Equipe</h1>
        <div className="row">
          <Btn variant="secondary" size="sm" onClick={() => setShowNewUser(true)}><Ic n="plus" s={13} /> Usuário</Btn>
          <Btn size="sm" onClick={() => setShowNewEquipe(true)}><Ic n="plus" s={13} /> Equipe</Btn>
        </div>
      </div>

      {(equipes || []).length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12, marginBottom: 24 }}>
          {(equipes || []).map(e => (
            <div className="card" key={e.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontWeight: 600 }}>{e.nome}</div>
                <Badge status={e.status || 'Ativa'} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 4, display:'flex', alignItems:'center', gap:4 }}><Truck size={12} strokeWidth={1.7} /> {e.motorista_nome || 'Sem motorista'}</div>
              <div style={{ fontSize: 12, color: 'var(--t2)', display:'flex', alignItems:'center', gap:4 }}><Users size={12} strokeWidth={1.7} /> {(e.entregadores_nomes || []).join(', ') || 'Sem entregadores'}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 16 }}>Usuários</div>
      <input className="fi" style={{ marginBottom:10, width:'100%' }} placeholder="🔍 Buscar por nome ou perfil..." value={buscaUser} onChange={e => setBuscaUser(e.target.value)} />
      <div className="card">
        <table className="tbl">
          <thead><tr><th>Nome</th><th>Email</th><th>Cargo</th><th></th></tr></thead>
          <tbody>
            {(usuarios || []).filter(u => !buscaUser || u.full_name?.toLowerCase().includes(buscaUser.toLowerCase()) || u.role?.toLowerCase().includes(buscaUser.toLowerCase()) || u.email?.toLowerCase().includes(buscaUser.toLowerCase())).length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--t3)', padding: 24 }}>Nenhum usuário</td></tr>
            ) : (usuarios || []).filter(u => !buscaUser || u.full_name?.toLowerCase().includes(buscaUser.toLowerCase()) || u.role?.toLowerCase().includes(buscaUser.toLowerCase()) || u.email?.toLowerCase().includes(buscaUser.toLowerCase())).map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>
                      {u.full_name?.charAt(0)}
                    </div>
                    {u.full_name}
                  </div>
                </td>
                <td style={{ fontSize: 12, color: 'var(--t2)' }}>{u.email}</td>
                <td><span className="badge bg-accent" style={{ textTransform: 'capitalize' }}>{u.role}</span></td>
                <td><button className="btn btn-g btn-ico btn-sm" onClick={() => setEditUser(u)}><Ic n="edit" s={13} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNewEquipe && (
        <Modal title="Nova Equipe" onClose={() => setShowNewEquipe(false)} footer={null}>
          <NovaEquipeForm usuarios={usuarios || []} onClose={() => setShowNewEquipe(false)} onSave={handleEquipe} />
        </Modal>
      )}
      {showNewUser && (
        <Modal title="Novo Usuário" onClose={() => setShowNewUser(false)} footer={null}>
          <NovoUsuarioForm onClose={() => setShowNewUser(false)} onSave={handleUser} />
        </Modal>
      )}
      {editUser && (
        <EditarUsuarioModal usuario={editUser} onClose={() => setEditUser(null)} onSave={(dados) => handleEditUser(editUser.id, dados)} />
      )}
    </div>
  )
}
