import { useAuth } from '../context/AuthContext'
import { useLojaFiltro } from '../context/LojaContext'

export function useEffectiveLoja() {
  const { perfil, podeVerTodasLojas, isSimulating, simulatedLoja } = useAuth()
  const { lojaFiltro } = useLojaFiltro()
  if (isSimulating && simulatedLoja !== null) return simulatedLoja || null
  if (podeVerTodasLojas) return lojaFiltro || null
  return perfil?.loja || null
}
