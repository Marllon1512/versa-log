import { useState } from 'react'

import { Camera, Trash2 } from 'lucide-react'

import { useData, useAction } from '../hooks/index'
import { equipesService, usuariosService } from '../services/index'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { validarTipoImagem } from '../lib/validarTipoImagem'
import { PROFILE_PAGES, PROFILE_LABELS, PAGE_LABELS } from '../constants/perfis'
import { Btn, Badge, Ic, Modal, ConfirmModal } from '../components/ui/index'
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

function NovaEquipeForm({ onClose, onSave }) {
  const [form, setForm] = useState({ nome: '' })
  const { run, loading } = useAction()

  return (
    <>
      <div className="mb">
        <div className="fg"><label className="fl">Nome *</label><input className="fi" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Equipe Alpha" /></div>
      </div>
      <div className="mf">
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn disabled={!form.nome} loading={loading} onClick={() => run(() => onSave(form))}>Salvar</Btn>
      </div>
    </>
  )
}

function NovoUsuarioForm({ onClose, onSave }) {
  const [form, setForm] = useState({ full_name: '', usuario: '', senha: '', perfil: 'vendedor', loja: '' })
  const { run, loading } = useAction()
  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const canSave = form.full_name.trim() && form.usuario.trim() && form.senha.length >= 4

  const handleSave = async () => {
    await onSave({
      full_name: form.full_name.trim(),
      email: `${form.usuario.trim()}@versalog.local`,
      perfil: form.perfil,
      role: form.perfil,
      loja: form.loja || null,
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
        foto_url: form.foto_url || null,
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
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
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

  const pedirExclusao = (u) => {
    if (u.id === perfil?.id) {
      toast.error('Você não pode excluir seu próprio usuário')
      return
    }
    if (u.email === 'admin@versalog.com') {
      toast.error('Não é permitido excluir o usuário administrador principal')
      return
    }
    setDeleteTarget(u)
  }

  const confirmarExclusao = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await usuariosService.remove(deleteTarget.id)
      await reloadU()
      toast.success('Usuário excluído')
      setDeleteTarget(null)
    } catch (e) {
      toast.error('Erro ao excluir: ' + (e.message || 'desconhecido'))
    } finally {
      setDeleteLoading(false)
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
              <div style={{ fontWeight: 600 }}>{e.nome}</div>
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
                <td style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-g btn-ico btn-sm" onClick={() => setEditUser(u)}><Ic n="edit" s={13} /></button>
                  <button className="btn btn-d btn-ico btn-sm" onClick={() => pedirExclusao(u)}><Trash2 size={13} strokeWidth={1.8} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNewEquipe && (
        <Modal title="Nova Equipe" onClose={() => setShowNewEquipe(false)} footer={null}>
          <NovaEquipeForm onClose={() => setShowNewEquipe(false)} onSave={handleEquipe} />
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
      {deleteTarget && (
        <ConfirmModal
          title="Excluir usuário"
          message={`Deseja realmente excluir o usuário "${deleteTarget.full_name}"? Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          loading={deleteLoading}
          onConfirm={confirmarExclusao}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
