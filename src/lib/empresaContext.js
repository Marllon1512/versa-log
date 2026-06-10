export function getEmpresaId({ ignorarSeSuperAdmin = false } = {}) {
  try {
    const raw = sessionStorage.getItem('versa_perfil')
    if (!raw) return null
    const perfil = JSON.parse(raw)
    if (ignorarSeSuperAdmin && perfil?.super_admin === true) return null
    return perfil?.empresa_id ?? null
  } catch {
    return null
  }
}
