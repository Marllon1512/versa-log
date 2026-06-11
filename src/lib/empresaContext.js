function readImpersonation() {
  try {
    const raw = sessionStorage.getItem('versa_impersonation')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function getEmpresaId({ ignorarSeSuperAdmin = false } = {}) {
  try {
    // Impersonation tem prioridade absoluta
    const imp = readImpersonation()
    if (imp?.empresaId) return imp.empresaId

    const raw = sessionStorage.getItem('versa_perfil')
    if (!raw) return null
    const perfil = JSON.parse(raw)
    if (ignorarSeSuperAdmin && perfil?.super_admin === true) return null
    return perfil?.empresa_id ?? null
  } catch {
    return null
  }
}

export function podeAcessarModulosOperacionais() {
  try {
    // Com impersonation ativa, acesso sempre liberado
    const imp = readImpersonation()
    if (imp?.empresaId) return true

    const raw = sessionStorage.getItem('versa_perfil')
    if (!raw) return false
    const perfil = JSON.parse(raw)
    return !!(perfil?.empresa_id)
  } catch {
    return false
  }
}
