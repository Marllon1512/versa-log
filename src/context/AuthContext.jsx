import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadPerfil = async (authUser) => {
    if (!authUser) { setPerfil(null); return }
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', authUser.email)
      .single()
    setPerfil(data || { id: authUser.id, email: authUser.email, full_name: authUser.email, role: 'entregador' })
  }

  useEffect(() => {
    // Sessão local → carrega instantâneo, sem esperar rede
    try {
      const saved = sessionStorage.getItem('versa_perfil')
      if (saved) {
        setPerfil(JSON.parse(saved))
        setLoading(false)
        return
      }
    } catch {}

    // Sem sessão local → aguarda Supabase Auth
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
    // Autenticação direto na tabela usuarios (email ou campo usuario + senha_hash)
    try {
      const hash = await sha256(password)
      const { data: rows } = await supabase
        .from('usuarios')
        .select('*')
        .or(`email.eq.${loginInput},usuario.eq.${loginInput}`)
      const user = (rows || []).find(u => u.senha_hash === hash)
      if (user) {
        const perfil = { id: user.id, email: user.email, full_name: user.full_name, role: user.role }
        setPerfil(perfil)
        sessionStorage.setItem('versa_perfil', JSON.stringify(perfil))
        return perfil
      }
    } catch (e) {
      console.warn('[Auth] Erro ao consultar usuarios:', e?.message)
    }
    // Fallback admin fixo — para acesso de manutenção sem banco
    if (loginInput === 'admin@versalog.com' && password === 'Versa@2026') {
      const perfil = { id: 'admin-local', email: 'admin@versalog.com', full_name: 'Marllon Augusto', role: 'admin' }
      setPerfil(perfil)
      sessionStorage.setItem('versa_perfil', JSON.stringify(perfil))
      return perfil
    }
    throw new Error('Email ou senha incorretos')
  }

  const logout = async () => {
    try { await supabase.auth.signOut() } catch {}
    setUser(null)
    setPerfil(null)
    sessionStorage.removeItem('versa_perfil')
  }

  const isGestor = ['admin', 'gestor'].includes(perfil?.role)
  const isEntregador = ['entregador', 'motorista'].includes(perfil?.role)
  const isAdmin = perfil?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, perfil, loading, login, logout, isGestor, isEntregador, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
