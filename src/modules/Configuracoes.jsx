import { useState, useEffect, useCallback } from 'react'

import { Sun, Moon, Image, Trash2 } from 'lucide-react'

import { useAuth } from '../context/AuthContext'
import { useLojaFiltro } from '../context/LojaContext'
import { LojaSelect } from '../components/LojaSelect'
import { Btn, Modal, Spinner, Empty } from '../components/ui/index'
import { supabase } from '../lib/supabase'
import { toast } from '../lib/toast'
import { validarTipoImagem } from '../lib/validarTipoImagem'
import { _ALL_PAGES, PROFILE_PAGES, PROFILE_LABELS, PAGE_LABELS } from '../constants/perfis'
import {
  usuariosService, perfisAcessoService, configSistemaService,
} from '../services/index'

function GerenciamentoPermissoes() {
  const { lojas } = useLojaFiltro()
  const [usuarios, setUsuarios] = useState([])
  const [perfisDB, setPerfisDB] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroPerfil, setFiltroPerfil] = useState('')
  const [filtroLoja, setFiltroLoja] = useState('')
  const [editando, setEditando] = useState(null)
  const [editForm, setEditForm] = useState({ perfil: '', loja: '', modulos: [] })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    Promise.all([usuariosService.list(), perfisAcessoService.list()])
      .then(([users, perfis]) => { setUsuarios(users); setPerfisDB(perfis) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const getBaseModulos = useCallback((perfilNome) => {
    const perfilDB = perfisDB.find(p => p.perfil === perfilNome)
    return perfilDB?.modulos || PROFILE_PAGES[perfilNome] || []
  }, [perfisDB])

  const abrirEditor = (u) => {
    const perfilNome = u.perfil || u.role || 'vendedor'
    const baseModulos = getBaseModulos(perfilNome)
    const extras = u.permissoes_extras || {}
    let efetivos = [...baseModulos]
    if (extras.modulos_adicionais?.length) efetivos = [...new Set([...efetivos, ...extras.modulos_adicionais])]
    if (extras.modulos_removidos?.length) efetivos = efetivos.filter(m => !extras.modulos_removidos.includes(m))
    setEditando(u)
    setEditForm({ perfil: perfilNome, loja: u.loja || '', modulos: efetivos })
  }

  const onPerfilChange = (newPerfil) => {
    const baseModulos = getBaseModulos(newPerfil)
    setEditForm(f => ({ ...f, perfil: newPerfil, modulos: baseModulos }))
  }

  const toggleModulo = (mod) => {
    setEditForm(f => ({
      ...f,
      modulos: f.modulos.includes(mod) ? f.modulos.filter(m => m !== mod) : [...f.modulos, mod],
    }))
  }

  const salvar = async () => {
    if (!editando) return
    setSalvando(true)
    try {
      const baseModulos = getBaseModulos(editForm.perfil)
      const modulos_adicionais = editForm.modulos.filter(m => !baseModulos.includes(m))
      const modulos_removidos = baseModulos.filter(m => !editForm.modulos.includes(m))
      const updates = {
        perfil: editForm.perfil,
        loja: editForm.loja || null,
        permissoes_extras: { modulos_adicionais, modulos_removidos },
      }
      await usuariosService.update(editando.id, updates)
      setUsuarios(prev => prev.map(u => u.id === editando.id ? { ...u, ...updates } : u))
      toast.success('Permissões salvas com sucesso!')
      setEditando(null)
    } catch (e) {
      toast.error(e.message || 'Erro ao salvar permissões')
    } finally {
      setSalvando(false)
    }
  }

  const filtered = usuarios.filter(u => {
    const nome = (u.full_name || u.email || '').toLowerCase()
    if (busca && !nome.includes(busca.toLowerCase())) return false
    if (filtroPerfil && (u.perfil || u.role) !== filtroPerfil) return false
    if (filtroLoja && u.loja !== filtroLoja) return false
    return true
  })

  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 14 }}>Gerenciamento de Permissões</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        <input className="fi" placeholder="Buscar por nome..." value={busca} onChange={e => setBusca(e.target.value)} />
        <select className="fi" value={filtroPerfil} onChange={e => setFiltroPerfil(e.target.value)}>
          <option value="">Todos os perfis</option>
          {Object.entries(PROFILE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="fi" value={filtroLoja} onChange={e => setFiltroLoja(e.target.value)}>
          <option value="">Todas as lojas</option>
          {(lojas ?? []).map(l => <option key={l.id || l.nome} value={l.nome}>{l.nome}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? <Empty text="Nenhum usuário encontrado" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(u => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg2)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{u.full_name || u.email}</div>
                <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>
                  {PROFILE_LABELS[u.perfil || u.role] || u.role} · {u.loja || 'Sem loja'}
                </div>
              </div>
              <Btn variant="secondary" size="sm" onClick={() => abrirEditor(u)}>Editar</Btn>
            </div>
          ))}
        </div>
      )}

      {editando && (
        <Modal title={`Permissões — ${editando.full_name || editando.email}`} onClose={() => setEditando(null)} size="lg">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="grid2">
              <div className="fg">
                <label className="fl">Perfil Base</label>
                <select className="fi" value={editForm.perfil} onChange={e => onPerfilChange(e.target.value)}>
                  <option value="">Selecionar...</option>
                  {Object.entries(PROFILE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="fg">
                <label className="fl">Loja Vinculada</label>
                <LojaSelect value={editForm.loja} onChange={loja => setEditForm(f => ({ ...f, loja }))} />
              </div>
            </div>

            <div>
              <label className="fl" style={{ marginBottom: 10 }}>Módulos Habilitados</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 6 }}>
                {_ALL_PAGES.map(mod => {
                  const enabled = editForm.modulos.includes(mod)
                  const baseModulos = getBaseModulos(editForm.perfil)
                  const isBase = baseModulos.includes(mod)
                  const isExtra = enabled && !isBase
                  return (
                    <label key={mod} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: enabled ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--bg3)', borderRadius: 8, cursor: 'pointer', border: `1px solid ${enabled ? 'var(--accent)' : 'var(--border)'}`, transition: 'all .15s' }}>
                      <input type="checkbox" checked={enabled} onChange={() => toggleModulo(mod)} style={{ accentColor: 'var(--accent)', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, flex: 1 }}>{PAGE_LABELS[mod] || mod}</span>
                      {isExtra && <span style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 700 }}>+</span>}
                    </label>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="primary" loading={salvando} onClick={salvar}>Salvar Permissões</Btn>
              <Btn variant="secondary" onClick={() => setEditando(null)} disabled={salvando}>Cancelar</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function AparenciaConfig({ reloadBgConfig }) {
  const [cfg, setCfg] = useState({
    bg_imagem_clara_1: null, bg_imagem_clara_2: null,
    bg_imagem_escura_1: null, bg_imagem_escura_2: null,
    bg_ativa_clara: null, bg_ativa_escura: null,
    bg_blur_intensidade: 8, bg_overlay_opacidade: 40, logo_versa_url: null,
  })
  const [uploading, setUploading] = useState({})
  const [saving, setSaving] = useState(false)
  const [uploadingLogoVersa, setUploadingLogoVersa] = useState(false)

  useEffect(() => {
    configSistemaService.get().then(d => { if (d) setCfg(p => ({ ...p, ...d })) }).catch(() => {})
  }, [])

  const uploadLogoVersa = async (file) => {
    try { await validarTipoImagem(file) } catch (e) { toast.error(e.message); return }
    setUploadingLogoVersa(true)
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase()
      const path = `logo/versa_${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('sistema-assets').upload(path, file, { upsert: true, contentType: file.type || 'image/png' })
      if (error) throw new Error(error.message || JSON.stringify(error))
      const { data: pub } = supabase.storage.from('sistema-assets').getPublicUrl(path)
      await configSistemaService.save({ logo_versa_url: pub.publicUrl })
      setCfg(p => ({ ...p, logo_versa_url: pub.publicUrl }))
      reloadBgConfig()
      toast.success('Logo da Versa salva!')
    } catch (e) { toast.error('Erro: ' + e.message) }
    setUploadingLogoVersa(false)
  }

  const removerLogoVersa = async () => {
    await configSistemaService.save({ logo_versa_url: null }).catch(() => {})
    setCfg(p => ({ ...p, logo_versa_url: null }))
    reloadBgConfig()
    toast.success('Logo removida')
  }

  const upload = async (key, file) => {
    try { await validarTipoImagem(file) } catch (e) { toast.error(e.message); return }
    setUploading(p => ({ ...p, [key]: true }))
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `bg/${key}_${Date.now()}.${ext}`
      const old = cfg[key]
      if (old) {
        const seg = old.split('/sistema-assets/')[1]
        if (seg) await supabase.storage.from('sistema-assets').remove([decodeURIComponent(seg.split('?')[0])]).catch(() => {})
      }
      const { error: upErr } = await supabase.storage
        .from('sistema-assets')
        .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg', cacheControl: '3600' })
      if (upErr) throw new Error(upErr.message || upErr.error || JSON.stringify(upErr))
      const { data: pub } = supabase.storage.from('sistema-assets').getPublicUrl(path)
      if (!pub?.publicUrl) throw new Error('URL pública não obtida. Verifique se o bucket sistema-assets é público.')
      const updates = { [key]: pub.publicUrl }
      await configSistemaService.save(updates)
      const newCfg = { ...cfg, ...updates }
      setCfg(newCfg)
      reloadBgConfig(newCfg)
      toast.success('Imagem salva!')
    } catch (e) {
      toast.error('Erro no upload: ' + (e?.message || String(e)))
    }
    setUploading(p => ({ ...p, [key]: false }))
  }

  const ativar = async (temaSlot, key) => {
    const field = temaSlot === 'clara' ? 'bg_ativa_clara' : 'bg_ativa_escura'
    const newCfg = { ...cfg, [field]: key }
    setCfg(newCfg)
    reloadBgConfig(newCfg)
    configSistemaService.save({ [field]: key }).catch(() => {})
    toast.success(key ? 'Imagem ativada como fundo!' : 'Fundo desativado')
  }

  const remover = async (key) => {
    try {
      const url = cfg[key]
      if (url) {
        const seg = url.split('/sistema-assets/')[1]
        if (seg) await supabase.storage.from('sistema-assets').remove([decodeURIComponent(seg.split('?')[0])]).catch(() => {})
      }
    } catch {}
    const updates = { [key]: null }
    if (cfg.bg_ativa_clara === key) updates.bg_ativa_clara = null
    if (cfg.bg_ativa_escura === key) updates.bg_ativa_escura = null
    await configSistemaService.save(updates).catch(() => {})
    setCfg(p => ({ ...p, ...updates }))
    reloadBgConfig()
    toast.success('Imagem removida')
  }

  const salvarSliders = async () => {
    setSaving(true)
    try {
      await configSistemaService.save({ bg_blur_intensidade: cfg.bg_blur_intensidade, bg_overlay_opacidade: cfg.bg_overlay_opacidade })
      reloadBgConfig()
      toast.success('Configurações salvas!')
    } catch { toast.error('Erro ao salvar') }
    setSaving(false)
  }

  const BgSlots = ({ temaSlot, label }) => {
    const ativaField = temaSlot === 'clara' ? 'bg_ativa_clara' : 'bg_ativa_escura'
    return (
      <div style={{ marginBottom:24 }}>
        <div style={{ fontWeight:600, fontSize:13, marginBottom:12, color:'var(--t1)', display:'flex', alignItems:'center', gap:8 }}>
          {temaSlot === 'clara' ? <Sun size={14} strokeWidth={2} /> : <Moon size={14} strokeWidth={2} />}
          {label}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
          {[1,2].map(num => {
            const key = `bg_imagem_${temaSlot}_${num}`
            const url = cfg[key]
            const isActive = cfg[ativaField] === key
            return (
              <div key={key} style={{ border:`2px solid ${isActive?'var(--accent)':'var(--border)'}`, borderRadius:12, overflow:'hidden', background:'var(--bg2)', transition:'border-color 200ms ease' }}>
                <div style={{ height:110, position:'relative', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg3)' }}>
                  {url
                    ? <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : <div style={{ textAlign:'center', color:'var(--t3)' }}><Image size={24} strokeWidth={1.5} /><div style={{ fontSize:11, marginTop:4 }}>Sem imagem</div></div>
                  }
                  {isActive && <div style={{ position:'absolute', top:6, right:6, background:'var(--accent)', color:'#fff', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:6 }}>ATIVO</div>}
                </div>
                <div style={{ padding:10 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--t2)', marginBottom:8 }}>Imagem {num}</div>
                  <div style={{ display:'flex', gap:6 }}>
                    <label style={{ flex:1, cursor: uploading[key] ? 'not-allowed' : 'pointer' }}>
                      <input type="file" accept="image/*" style={{ display:'none' }} disabled={!!uploading[key]} onChange={e => e.target.files[0] && upload(key, e.target.files[0])} />
                      <div className="btn btn-g btn-sm" style={{ textAlign:'center', cursor:'inherit', userSelect:'none' }}>{uploading[key] ? '...' : 'Upload'}</div>
                    </label>
                    {url && !isActive && <button className="btn btn-p btn-sm" style={{ flex:1 }} onClick={() => ativar(temaSlot, key)}>Ativar</button>}
                    {url && isActive && <button className="btn btn-g btn-sm" style={{ flex:1 }} onClick={() => ativar(temaSlot, null)}>Desativar</button>}
                    {url && <button className="btn btn-sm" style={{ background:'rgba(239,68,68,0.15)', color:'#ef4444', padding:'5px 8px' }} onClick={() => remover(key)}><Trash2 size={13} /></button>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const activeEscuraUrl = cfg.bg_ativa_escura ? cfg[cfg.bg_ativa_escura] : null
  const activeClaraUrl  = cfg.bg_ativa_clara  ? cfg[cfg.bg_ativa_clara]  : null

  return (
    <div>
      <div style={{ fontWeight:600, marginBottom:10 }}>Logo da Versa Log</div>
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:24, padding:'12px', background:'var(--bg2)', borderRadius:10, border:'1px solid var(--border)' }}>
        {cfg.logo_versa_url
          ? <img src={cfg.logo_versa_url} alt="Logo Versa" style={{ height:52, objectFit:'contain', borderRadius:8, background:'#fff', padding:4 }} />
          : <div style={{ width:52, height:52, borderRadius:8, background:'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center' }}><Image size={22} color="var(--t3)" strokeWidth={1.5} /></div>
        }
        <div>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>Logo principal (sidebar e etiquetas)</div>
          <div style={{ display:'flex', gap:8 }}>
            <label style={{ cursor: uploadingLogoVersa ? 'not-allowed' : 'pointer' }}>
              <input type="file" accept="image/*" style={{ display:'none' }} disabled={uploadingLogoVersa} onChange={e => e.target.files[0] && uploadLogoVersa(e.target.files[0])} />
              <div className="btn btn-p btn-sm">{uploadingLogoVersa ? 'Enviando...' : 'Upload logo'}</div>
            </label>
            {cfg.logo_versa_url && <button className="btn btn-g btn-sm" onClick={removerLogoVersa}>Remover</button>}
          </div>
        </div>
      </div>

      <div style={{ fontWeight:600, marginBottom:16 }}>Imagens de Fundo por Tema</div>
      <BgSlots temaSlot="escura" label="Tema Escuro — Imagens de Fundo" />
      <BgSlots temaSlot="clara"  label="Tema Claro — Imagens de Fundo" />

      <div style={{ background:'var(--bg2)', borderRadius:12, padding:16, marginBottom:12 }}>
        <div style={{ fontWeight:600, fontSize:13, marginBottom:10 }}>Intensidade do Blur</div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <input type="range" min={0} max={20} value={cfg.bg_blur_intensidade??8} onChange={e => setCfg(p => ({ ...p, bg_blur_intensidade:+e.target.value }))} style={{ flex:1, accentColor:'var(--accent)' }} />
          <span style={{ minWidth:36, fontSize:13 }}>{cfg.bg_blur_intensidade??8}px</span>
        </div>
        {(activeEscuraUrl || activeClaraUrl) && (
          <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:12, color:'var(--t3)' }}>Preview (escuro / claro):</span>
            {activeEscuraUrl && <div style={{ width:80, height:40, borderRadius:6, overflow:'hidden' }}><img src={activeEscuraUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', filter:`blur(${(cfg.bg_blur_intensidade??8)*0.35}px)`, transform:'scale(1.1)' }} /></div>}
            {activeClaraUrl  && <div style={{ width:80, height:40, borderRadius:6, overflow:'hidden' }}><img src={activeClaraUrl}  alt="" style={{ width:'100%', height:'100%', objectFit:'cover', filter:`blur(${(cfg.bg_blur_intensidade??8)*0.35}px)`, transform:'scale(1.1)' }} /></div>}
          </div>
        )}
      </div>

      <div style={{ background:'var(--bg2)', borderRadius:12, padding:16, marginBottom:20 }}>
        <div style={{ fontWeight:600, fontSize:13, marginBottom:10 }}>Opacidade do Overlay Escuro</div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <input type="range" min={0} max={80} value={cfg.bg_overlay_opacidade??40} onChange={e => setCfg(p => ({ ...p, bg_overlay_opacidade:+e.target.value }))} style={{ flex:1, accentColor:'var(--accent)' }} />
          <span style={{ minWidth:36, fontSize:13 }}>{cfg.bg_overlay_opacidade??40}%</span>
        </div>
      </div>

      <button className="btn btn-p" onClick={salvarSliders} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Configurações'}</button>
    </div>
  )
}

export default function Configuracoes({ reloadBgConfig }) {
  const { perfil, isAdmin } = useAuth()
  const [tab, setTab] = useState('geral')

  return (
    <div className="page">
      <div className="ph"><h1>Configurações</h1></div>

      <div style={{ display:'flex', gap:0, marginBottom:20, borderBottom:'1px solid var(--border)' }}>
        {[['geral','Geral'], ...(isAdmin ? [['aparencia','Aparência']] : [])].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding:'8px 18px', border:'none', background:'transparent', cursor:'pointer', fontSize:13, fontWeight:600,
            color: tab===id ? 'var(--accent)' : 'var(--t3)',
            borderBottom: tab===id ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom:-1, transition:'all 150ms ease', fontFamily:'var(--font)',
          }}>{label}</button>
        ))}
      </div>

      {tab === 'geral' && <>
        <div className="card" style={{ marginBottom:16 }}>
          <div style={{ fontWeight:600, marginBottom:14 }}>Minha conta</div>
          <div className="grid2">
            <div className="fg"><label className="fl">Nome</label><input className="fi" defaultValue={perfil?.full_name} disabled /></div>
            <div className="fg"><label className="fl">Email</label><input className="fi" defaultValue={perfil?.email} disabled /></div>
          </div>
          <div className="fg"><label className="fl">Cargo</label><input className="fi" defaultValue={perfil?.perfil||perfil?.role} disabled style={{ textTransform:'capitalize' }} /></div>
        </div>
        <div className="card" style={{ marginBottom:16 }}>
          <div style={{ fontWeight:600, marginBottom:14 }}>Sistema</div>
          <div style={{ fontSize:13, color:'var(--t2)', marginBottom:8 }}>Banco de dados: <span style={{ color:'var(--green)', fontWeight:500 }}>● Conectado</span></div>
          <div style={{ fontSize:13, color:'var(--t2)', marginBottom:8 }}>Versão: <span style={{ color:'var(--t1)' }}>2.1.0</span></div>
          <div style={{ fontSize:13, color:'var(--t2)' }}>Projeto: <span style={{ color:'var(--t1)', fontFamily:'var(--mono)', fontSize:12 }}>kwccjkqltllypbmaisio</span></div>
        </div>
        {isAdmin && (
          <div className="card" style={{ marginBottom:16 }}>
            <div style={{ fontWeight:600, marginBottom:12 }}>Administração</div>
            <div style={{ fontSize:13, color:'var(--t2)', marginBottom:12 }}>Para criar novos usuários com senha, acesse o Supabase Dashboard.</div>
            <a href="https://supabase.com/dashboard/project/kwccjkqltllypbmaisio/auth/users" target="_blank" rel="noreferrer">
              <button className="btn btn-g btn-sm">Abrir Supabase Auth ↗</button>
            </a>
          </div>
        )}
        {isAdmin && <div className="card"><GerenciamentoPermissoes /></div>}
      </>}

      {tab === 'aparencia' && isAdmin && (
        <div className="card"><AparenciaConfig reloadBgConfig={reloadBgConfig} /></div>
      )}
    </div>
  )
}
