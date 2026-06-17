import { createContext, useContext } from 'react'

export const LojaCtx = createContext({ lojaFiltro: '', setLojaFiltro: () => {}, lojas: [] })
export const useLojaFiltro = () => useContext(LojaCtx)
