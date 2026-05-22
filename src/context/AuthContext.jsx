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
    // Restaura sessão local imediatamente para não bloquear o loading
    try {
      const saved = sessionStorage.getItem('versa_perfil')
      if (saved) setPerfil(JSON.parse(saved))
    } catch {}

    // Sempre tenta restaurar o JWT do Supabase Auth (mesmo com sessão local)
    // Isso garante que o cliente Supabase tenha o token correto para RLS
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        loadPerfil(session.user).finally(() => setLoading(false))
      } else {
        // Sem sessão Supabase — usa perfil local se existir
        setLoading(false)
      }
    }).catch(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadPerfil(session.user)
    })
    return () => subscription.unsubscribe()
  }, [])

  const login = async (email, password) => {
    // Fallback local para quando Supabase estiver indisponível
    const LOCAL_USERS = [
      { email: 'admin@versalog.com', password: 'Versa@2026', full_name: 'Marllon Augusto', role: 'admin' },
      { email: 'gestor@versalog.com', password: 'Versa@2026', full_name: 'Carlos Gestor', role: 'gestor' },
      { email: 'entregador@versalog.com', password: 'Versa@2026', full_name: 'João Entregador', role: 'entregador' },
      { email: 'motorista@versalog.com', password: 'Versa@2026', full_name: 'Pedro Motorista', role: 'motorista' },
    ]
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)
      return data
    } catch (e) {
      // Se Supabase falhar, tenta login local
      const localUser = LOCAL_USERS.find(u => u.email === email && u.password === password)
      if (localUser) {
        const perfil = { id: localUser.email, email: localUser.email, full_name: localUser.full_name, role: localUser.role }
        setPerfil(perfil)
        sessionStorage.setItem('versa_perfil', JSON.stringify(perfil))
        return perfil
      }
      throw new Error('Email ou senha incorretos')
    }
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
