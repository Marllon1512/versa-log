import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

// Fallback local quando perfis_acesso ainda não existe no banco
const PERFIL_FALLBACK = {
  admin:    { modulos: ['dashboard','pedidos','separacao','agenda','assistencia','roteiro','conferencia','equipe','ranking','mapa','rota','ponto','config','cadastros','vendas','compras','estoque','financeiro','dp','os','crm','nps','devolucao','relatorios','fila','catalogo','nf'], pode_ver_todas_lojas:true,  pode_ver_financeiro:true,  pode_ver_vendas:true,  pode_ver_metas:true  },
  diretor:  { modulos: ['dashboard','pedidos','separacao','agenda','assistencia','roteiro','conferencia','equipe','ranking','mapa','rota','ponto','cadastros','vendas','compras','estoque','financeiro','dp','os','crm','nps','devolucao','relatorios','fila'], pode_ver_todas_lojas:true,  pode_ver_financeiro:true,  pode_ver_vendas:true,  pode_ver_metas:true  },
  gerente:  { modulos: ['dashboard','pedidos','agenda','assistencia','conferencia','equipe','ranking','ponto','cadastros','vendas','estoque','os','crm','nps'], pode_ver_todas_lojas:false, pode_ver_financeiro:false, pode_ver_vendas:true,  pode_ver_metas:true  },
  gestor:   { modulos: ['dashboard','pedidos','separacao','agenda','assistencia','roteiro','conferencia','equipe','ranking','mapa','rota','ponto','config','cadastros','vendas','compras','estoque','financeiro','dp','os','crm','nps','devolucao','relatorios','fila','catalogo','nf'], pode_ver_todas_lojas:true,  pode_ver_financeiro:true,  pode_ver_vendas:true,  pode_ver_metas:true  },
  assistente_admin: { modulos: ['dashboard','pedidos','agenda','ponto','cadastros','compras','estoque','dp','financeiro_loja'], pode_ver_todas_lojas:false, pode_ver_financeiro:false, pode_ver_vendas:false, pode_ver_metas:false },
  vendedor: { modulos: ['dashboard','vendas','cadastros','ponto','crm','ranking'], pode_ver_todas_lojas:false, pode_ver_financeiro:false, pode_ver_vendas:true,  pode_ver_metas:true  },
  gerente_logistica:    { modulos: ['dashboard','pedidos','separacao','roteiro','conferencia','assistencia','mapa','rota','ponto','estoque','equipe','ranking'], pode_ver_todas_lojas:true,  pode_ver_financeiro:false, pode_ver_vendas:false, pode_ver_metas:false },
  supervisor_logistica: { modulos: ['dashboard','pedidos','separacao','roteiro','conferencia','assistencia','mapa','rota','ponto','estoque'], pode_ver_todas_lojas:true,  pode_ver_financeiro:false, pode_ver_vendas:false, pode_ver_metas:false },
  expedidor:  { modulos: ['dashboard','separacao','conferencia','ponto'], pode_ver_todas_lojas:false, pode_ver_financeiro:false, pode_ver_vendas:false, pode_ver_metas:false },
  entregador: { modulos: ['dashboard','rota','pedidos','ponto','ranking'],  pode_ver_todas_lojas:false, pode_ver_financeiro:false, pode_ver_vendas:false, pode_ver_metas:false },
  motorista:  { modulos: ['dashboard','rota','pedidos','ponto','ranking'],  pode_ver_todas_lojas:false, pode_ver_financeiro:false, pode_ver_vendas:false, pode_ver_metas:false },
  separador:  { modulos: ['dashboard','separacao','pedidos','ponto'],       pode_ver_todas_lojas:false, pode_ver_financeiro:false, pode_ver_vendas:false, pode_ver_metas:false },
  conferente: { modulos: ['dashboard','conferencia','pedidos','ponto'],     pode_ver_todas_lojas:false, pode_ver_financeiro:false, pode_ver_vendas:false, pode_ver_metas:false },
  tecnico:    { modulos: ['dashboard','assistencia','roteiro','ponto'],     pode_ver_todas_lojas:false, pode_ver_financeiro:false, pode_ver_vendas:false, pode_ver_metas:false },
  atendente:  { modulos: ['dashboard','assistencia','pedidos','agenda','ponto'], pode_ver_todas_lojas:false, pode_ver_financeiro:false, pode_ver_vendas:false, pode_ver_metas:false },
  contador:   { modulos: ['financeiro','dp','relatorios'],                  pode_ver_todas_lojas:true,  pode_ver_financeiro:true,  pode_ver_vendas:false, pode_ver_metas:false },
}

function computeModulos(baseModulos, permissoesExtras) {
  let mods = [...(baseModulos || [])]
  const extras = permissoesExtras || {}
  if (extras.modulos_adicionais?.length) mods = [...new Set([...mods, ...extras.modulos_adicionais])]
  if (extras.modulos_removidos?.length) mods = mods.filter(m => !extras.modulos_removidos.includes(m))
  return mods
}

async function fetchPerfilAcesso(perfilNome) {
  if (!perfilNome) return null
  try {
    const { data } = await supabase.from('perfis_acesso').select('*').eq('perfil', perfilNome).single()
    return data || PERFIL_FALLBACK[perfilNome] || null
  } catch {
    return PERFIL_FALLBACK[perfilNome] || null
  }
}

async function fetchEmpresa(empresaId) {
  if (!empresaId) return null
  try {
    const { data } = await supabase
      .from('empresas')
      .select('nome, nome_sistema, logo_url, cor_primaria, tema_padrao')
      .eq('id', empresaId)
      .maybeSingle()
    return data || null
  } catch {
    return null
  }
}

function readImpersonation() {
  try {
    const raw = sessionStorage.getItem('versa_impersonation')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [empresa, setEmpresa] = useState(null)
  const [perfilAcesso, setPerfilAcesso] = useState(null)
  const [loading, setLoading] = useState(true)
  const [simulatedRole, setSimulatedRole] = useState(null)
  const [simulatedLoja, setSimulatedLoja] = useState(null)

  // Impersonation — persisted in sessionStorage so survives hot-reload
  const [impersonatingEmpresaId, setImpersonatingEmpresaId] = useState(() => readImpersonation()?.empresaId || null)
  const [impersonatingEmpresaNome, setImpersonatingEmpresaNome] = useState(() => readImpersonation()?.empresaNome || null)

  const loadPerfil = async (authUser) => {
    if (!authUser) { setPerfil(null); setPerfilAcesso(null); setEmpresa(null); return }
    const { data } = await supabase.from('usuarios').select('*').eq('email', authUser.email).single()
    const usuario = data || { id: authUser.id, email: authUser.email, full_name: authUser.email, role: 'entregador' }
    setPerfil(usuario)
    const pNome = usuario.perfil || usuario.role || 'vendedor'
    const pa = await fetchPerfilAcesso(pNome)
    setPerfilAcesso(pa)
    if (usuario.empresa_id) {
      const emp = await fetchEmpresa(usuario.empresa_id)
      setEmpresa(emp)
    }
  }

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('versa_perfil')
      if (saved) {
        const parsed = JSON.parse(saved)
        setPerfil(parsed)
        const pNome = parsed.perfil || parsed.role || 'vendedor'
        setPerfilAcesso(PERFIL_FALLBACK[pNome] || null)
        try {
          const savedEmpresa = sessionStorage.getItem('versa_empresa')
          if (savedEmpresa) setEmpresa(JSON.parse(savedEmpresa))
        } catch {}
        setLoading(false)
        // Refresh from DB in background
        fetchPerfilAcesso(pNome).then(pa => { if (pa) setPerfilAcesso(pa) }).catch(() => {})
        if (parsed.empresa_id) {
          fetchEmpresa(parsed.empresa_id)
            .then(emp => { if (emp) { setEmpresa(emp); sessionStorage.setItem('versa_empresa', JSON.stringify(emp)) } })
            .catch(() => {})
        }
        // Re-busca o perfil completo no banco para pegar campos que mudaram desde o último login
        // (ex.: super_admin, permissoes_extras, loja_id)
        if (parsed.id) {
          supabase.from('usuarios').select('*').eq('id', parsed.id).maybeSingle()
            .then(({ data }) => {
              if (data) { setPerfil(data); sessionStorage.setItem('versa_perfil', JSON.stringify(data)) }
            }).catch(() => {})
        }
        return
      }
    } catch {}

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        loadPerfil(session?.user ?? null).finally(() => setLoading(false))
      })
      .catch(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      loadPerfil(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const login = async (loginInput, password) => {
    const sha256 = async (msg) => {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg))
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
    }
    try {
      const hash = await sha256(password)

      // Busca por email; se não bater, busca por nome de usuário.
      // Ambas as queries usam .eq() parametrizado pelo SDK — sem interpolação de string.
      let u = null
      const { data: byEmail } = await supabase.from('usuarios').select('*').eq('email', loginInput).maybeSingle()
      if (byEmail?.senha_hash === hash) {
        u = byEmail
      } else {
        const { data: byUsuario } = await supabase.from('usuarios').select('*').eq('usuario', loginInput).maybeSingle()
        if (byUsuario?.senha_hash === hash) u = byUsuario
      }

      if (u) {
        setPerfil(u)
        sessionStorage.setItem('versa_perfil', JSON.stringify(u))
        const pNome = u.perfil || u.role || 'vendedor'
        const pa = await fetchPerfilAcesso(pNome)
        setPerfilAcesso(pa)
        if (u.empresa_id) {
          const emp = await fetchEmpresa(u.empresa_id)
          setEmpresa(emp)
          if (emp) sessionStorage.setItem('versa_empresa', JSON.stringify(emp))
        }
        return u
      }
    } catch (e) {
      console.warn('[Auth] Erro ao consultar usuarios:', e?.message)
    }
    throw new Error('Email ou senha incorretos')
  }

  const logout = async () => {
    try { await supabase.auth.signOut() } catch {}
    setUser(null); setPerfil(null); setPerfilAcesso(null); setEmpresa(null)
    setSimulatedRole(null); setSimulatedLoja(null)
    setImpersonatingEmpresaId(null); setImpersonatingEmpresaNome(null)
    sessionStorage.removeItem('versa_perfil')
    sessionStorage.removeItem('versa_empresa')
    sessionStorage.removeItem('versa_impersonation')
  }

  const iniciarImpersonation = async (empresaId, empresaNome) => {
    setImpersonatingEmpresaId(empresaId)
    setImpersonatingEmpresaNome(empresaNome)
    sessionStorage.setItem('versa_impersonation', JSON.stringify({ empresaId, empresaNome }))
    try {
      await supabase.from('audit_log').insert({
        usuario_id: perfil?.id || null,
        acao: 'impersonation_iniciada',
        tabela: 'empresas',
        registro_id: String(empresaId),
        dados_anteriores: { empresaNome },
      })
    } catch {}
  }

  const finalizarImpersonation = async () => {
    const eid = impersonatingEmpresaId
    const enome = impersonatingEmpresaNome
    setImpersonatingEmpresaId(null)
    setImpersonatingEmpresaNome(null)
    sessionStorage.removeItem('versa_impersonation')
    try {
      await supabase.from('audit_log').insert({
        usuario_id: perfil?.id || null,
        acao: 'impersonation_finalizada',
        tabela: 'empresas',
        registro_id: String(eid),
        dados_anteriores: { empresaNome: enome },
      })
    } catch {}
  }

  // Nome do perfil efetivo (considera simulação)
  const effectiveRole = simulatedRole ?? (perfil?.perfil || perfil?.role)

  // perfilAcesso efetivo: quando simulando usa fallback local
  const effectivePA = simulatedRole
    ? (PERFIL_FALLBACK[simulatedRole] || perfilAcesso)
    : perfilAcesso

  // modulosPermitidos: base do perfil + ajustes personalizados
  const baseModulos = effectivePA?.modulos || []
  const permissoesExtras = simulatedRole ? {} : (perfil?.permissoes_extras || {})
  const modulosPermitidos = computeModulos(baseModulos, permissoesExtras)

  const podeVerTodasLojas = effectivePA?.pode_ver_todas_lojas || false
  const podeVerFinanceiro = effectivePA?.pode_ver_financeiro  || false
  const podeVerVendas     = effectivePA?.pode_ver_vendas      || false
  const podeVerMetas      = effectivePA?.pode_ver_metas       || false
  const lojaId            = perfil?.loja_id || null

  // Backward compat flags
  const isGestor     = ['admin','gestor','diretor','gerente','gerente_logistica'].includes(effectiveRole)
  const isEntregador = ['entregador','motorista'].includes(effectiveRole)
  const isAdmin      = ['admin'].includes(perfil?.perfil || perfil?.role)
  const isSimulating = simulatedRole !== null

  // empresaId: usa empresa impersonada se ativa, senão a do perfil real
  const empresaId = impersonatingEmpresaId || perfil?.empresa_id || null
  const isSuperAdmin = perfil?.super_admin === true

  return (
    <AuthContext.Provider value={{
      user, perfil, loading, login, logout,
      isGestor, isEntregador, isAdmin, isSuperAdmin,
      simulatedRole, setSimulatedRole, simulatedLoja, setSimulatedLoja,
      isSimulating, effectiveRole,
      modulosPermitidos, lojaId,
      podeVerTodasLojas, podeVerFinanceiro, podeVerVendas, podeVerMetas,
      perfilAcesso: effectivePA,
      empresa, empresaId,
      impersonatingEmpresaId, impersonatingEmpresaNome,
      iniciarImpersonation, finalizarImpersonation,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export const useEmpresa = () => {
  const { empresa, empresaId } = useAuth()
  return { empresa, empresaId }
}
