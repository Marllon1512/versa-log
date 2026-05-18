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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      loadPerfil(session?.user ?? null).finally(() => setLoading(false))
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      loadPerfil(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    return data
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setPerfil(null)
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
