import { supabase } from '../lib/supabase'

export const pedidosService = {
  async list(filters = {}) {
    let q = supabase.from('pedidos').select('*').order('created_at', { ascending: false })
    if (filters.status) q = q.eq('status', filters.status)
    if (filters.data_entrega) q = q.eq('data_entrega', filters.data_entrega)
    if (filters.entregador_id) q = q.eq('entregador_id', filters.entregador_id)
    if (filters.local_separacao) q = q.eq('local_separacao', filters.local_separacao)
    if (filters.cliente) q = q.ilike('cliente', `%${filters.cliente}%`)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*, produtos(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(pedido) {
    const { data, error } = await supabase
      .from('pedidos')
      .insert(pedido)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('pedidos')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async remove(id) {
    const { error } = await supabase.from('pedidos').delete().eq('id', id)
    if (error) throw error
    return true
  },

  async addHistorico(pedidoId, tipo, descricao, user) {
    const { error } = await supabase.from('historico').insert({
      pedido_id: pedidoId,
      tipo,
      descricao,
      usuario_email: user?.email,
      usuario_nome: user?.full_name,
      data_hora: new Date().toISOString(),
    })
    if (error) throw error
  },

  async getHistorico(pedidoId) {
    const { data, error } = await supabase
      .from('historico')
      .select('*')
      .eq('pedido_id', pedidoId)
      .order('data_hora', { ascending: false })
    if (error) throw error
    return data || []
  },
}
