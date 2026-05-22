import { supabase } from '../lib/supabase'

// ── Produtos ──────────────────────────────────────────────
export const produtosService = {
  async listByPedido(pedidoId) {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('pedido_id', pedidoId)
      .order('created_at')
    if (error) throw error
    return data || []
  },
  async create(produto) {
    const { data, error } = await supabase.from('produtos').insert(produto).select().single()
    if (error) throw error
    return data
  },
  async createMany(produtos) {
    const { data, error } = await supabase.from('produtos').insert(produtos).select()
    if (error) throw error
    return data || []
  },
  async update(id, updates) {
    const { data, error } = await supabase.from('produtos').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async remove(id) {
    const { error } = await supabase.from('produtos').delete().eq('id', id)
    if (error) throw error
    return true
  },
}

// ── Usuários ──────────────────────────────────────────────
export const usuariosService = {
  async list() {
    const { data, error } = await supabase.from('usuarios').select('*').order('full_name')
    if (error) throw error
    return data || []
  },
  async getById(id) {
    const { data, error } = await supabase.from('usuarios').select('*').eq('id', id).single()
    if (error) throw error
    return data
  },
  async getByEmail(email) {
    const { data, error } = await supabase.from('usuarios').select('*').eq('email', email).single()
    if (error) throw error
    return data
  },
  async create(usuario) {
    const { data, error } = await supabase.from('usuarios').insert(usuario).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const { data, error } = await supabase.from('usuarios').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async listEntregadores() {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .in('role', ['entregador', 'motorista'])
      .order('full_name')
    if (error) throw error
    return data || []
  },
}

// ── Equipes ───────────────────────────────────────────────
export const equipesService = {
  async list() {
    const { data, error } = await supabase.from('equipes').select('*').order('nome')
    if (error) throw error
    return data || []
  },
  async create(equipe) {
    const { data, error } = await supabase.from('equipes').insert(equipe).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const { data, error } = await supabase.from('equipes').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async remove(id) {
    const { error } = await supabase.from('equipes').delete().eq('id', id)
    if (error) throw error
    return true
  },
}

// ── Assistências ──────────────────────────────────────────
export const assistenciasService = {
  async list() {
    const { data, error } = await supabase
      .from('assistencias')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },
  async getById(id) {
    const { data, error } = await supabase
      .from('assistencias')
      .select('*, assistencia_itens(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },
  async create(assistencia) {
    const { data, error } = await supabase.from('assistencias').insert(assistencia).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const { data, error } = await supabase
      .from('assistencias')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
  async createItem(item) {
    const { data, error } = await supabase.from('assistencia_itens').insert(item).select().single()
    if (error) throw error
    return data
  },
  async updateItem(id, updates) {
    const { data, error } = await supabase.from('assistencia_itens').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
}

// ── Conferências ──────────────────────────────────────────
export const conferenciasService = {
  async list() {
    const { data, error } = await supabase
      .from('conferencias')
      .select('*')
      .order('data_hora', { ascending: false })
    if (error) throw error
    return data || []
  },
  async getById(id) {
    const { data, error } = await supabase.from('conferencias').select('*').eq('id', id).single()
    if (error) throw error
    return data
  },
  async create(conf) {
    const { data, error } = await supabase.from('conferencias').insert(conf).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const { data, error } = await supabase.from('conferencias').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
}

// ── Ponto ─────────────────────────────────────────────────
export const pontoService = {
  async listHoje(usuarioId) {
    const n = new Date()
    const hoje = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`
    const { data, error } = await supabase
      .from('pontos')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('data', hoje)
      .order('data_hora')
    if (error) throw error
    return data || []
  },
  async registrar(registro) {
    const { data, error } = await supabase.from('pontos').insert(registro).select().single()
    if (error) throw error
    return data
  },
  async listMes(usuarioId, mes) {
    const { data, error } = await supabase
      .from('pontos')
      .select('*')
      .eq('usuario_id', usuarioId)
      .gte('data', `${mes}-01`)
      .lte('data', `${mes}-31`)
      .order('data_hora')
    if (error) throw error
    return data || []
  },
  async listAllHoje() {
    const n = new Date()
    const hoje = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`
    const { data, error } = await supabase
      .from('pontos')
      .select('*')
      .eq('data', hoje)
      .order('usuario_nome')
      .order('data_hora')
    if (error) throw error
    return data || []
  },
}

// ── Assinaturas ───────────────────────────────────────────
export const assinaturasService = {
  async getByPedido(pedidoId) {
    const { data, error } = await supabase
      .from('assinaturas')
      .select('*')
      .eq('pedido_id', pedidoId)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    return data || null
  },
  async create(assinatura) {
    const { data, error } = await supabase.from('assinaturas').insert(assinatura).select().single()
    if (error) throw error
    return data
  },
}
