import { garantirContextoEmpresa } from './supabase'

export function getEmpresaId() {
  try {
    const raw = sessionStorage.getItem('versa_perfil')
    if (!raw) return null
    return JSON.parse(raw)?.empresa_id ?? null
  } catch {
    return null
  }
}

export async function setEmpresaContextoSupabase(empresaId) {
  if (!empresaId) return
  await garantirContextoEmpresa(empresaId)
}
