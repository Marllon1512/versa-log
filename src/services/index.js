import { supabase } from '../lib/supabase'
import { validarTipoImagem } from '../lib/validarTipoImagem'
import { getEmpresaId } from '../lib/empresaContext'

// ── Produtos ──────────────────────────────────────────────
// Tabela filha de pedidos — acesso sempre via pedido_id, sem filtro empresa_id
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
  async removeByPedido(pedidoId) {
    const { error } = await supabase.from('produtos').delete().eq('pedido_id', pedidoId)
    if (error) throw error
    return true
  },
}

// ── Usuários ──────────────────────────────────────────────
export const usuariosService = {
  async list() {
    const eid = getEmpresaId()
    let q = supabase.from('usuarios').select('*').order('full_name')
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async getById(id) {
    const eid = getEmpresaId()
    let q = supabase.from('usuarios').select('*').eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.single()
    if (error) throw error
    return data
  },
  async getByEmail(email) {
    // Sem filtro empresa_id — usado internamente no auth
    const { data, error } = await supabase.from('usuarios').select('*').eq('email', email).single()
    if (error) throw error
    return data
  },
  async create(usuario) {
    const eid = getEmpresaId()
    const payload = eid ? { ...usuario, empresa_id: eid } : usuario
    const { data, error } = await supabase.from('usuarios').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const eid = getEmpresaId()
    let q = supabase.from('usuarios').update(updates).eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },
  async listEntregadores() {
    const eid = getEmpresaId()
    let q = supabase.from('usuarios').select('*').in('role', ['entregador', 'motorista']).order('full_name')
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
}

// ── Equipes ───────────────────────────────────────────────
export const equipesService = {
  async list() {
    const eid = getEmpresaId()
    let q = supabase.from('equipes').select('*').order('nome')
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async create(equipe) {
    const eid = getEmpresaId()
    const payload = eid ? { ...equipe, empresa_id: eid } : equipe
    const { data, error } = await supabase.from('equipes').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const eid = getEmpresaId()
    let q = supabase.from('equipes').update(updates).eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },
  async remove(id) {
    const eid = getEmpresaId()
    let q = supabase.from('equipes').delete().eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { error } = await q
    if (error) throw error
    return true
  },
}

// ── Assistências ──────────────────────────────────────────
export const assistenciasService = {
  async list() {
    const eid = getEmpresaId()
    let q = supabase.from('assistencias').select('*, assistencia_itens(id, fornecedor)')
      .order('created_at', { ascending: false })
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async listPaged({ search = '', from = 0, to = 99, status } = {}) {
    const eid = getEmpresaId()
    let q = supabase.from('assistencias').select('*, assistencia_itens(id, fornecedor)', { count: 'exact' })
    if (eid) q = q.eq('empresa_id', eid)
    if (search) q = q.or(`cliente.ilike.%${search}%,pedido_ref.ilike.%${search}%`)
    if (status && status !== 'Todos') q = q.eq('status', status)
    q = q.order('created_at', { ascending: false }).range(from, to)
    const { data, count, error } = await q
    if (error) throw error
    return { data: data || [], count: count || 0 }
  },
  async getById(id) {
    const eid = getEmpresaId()
    let q = supabase.from('assistencias').select('*, assistencia_itens(*)').eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.single()
    if (error) throw error
    return data
  },
  async create(assistencia) {
    const eid = getEmpresaId()
    const payload = eid ? { ...assistencia, empresa_id: eid } : assistencia
    const { data, error } = await supabase.from('assistencias').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const eid = getEmpresaId()
    let q = supabase.from('assistencias')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },
  // Filhos: sem filtro empresa_id (acesso via assistencia_id que já é scoped)
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
  async listAbertas(lojaFiltro) {
    const eid = getEmpresaId()
    let q = supabase.from('assistencias')
      .select('*, assistencia_itens(id, fornecedor)')
      .neq('status', 'concluida')
      .neq('status', 'Concluído')
      .neq('status', 'cancelada')
    if (eid) q = q.eq('empresa_id', eid)
    if (lojaFiltro) q = q.eq('loja', lojaFiltro)
    const { data, error } = await q.order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },
}

// ── Conferências ──────────────────────────────────────────
export const conferenciasService = {
  async list() {
    const eid = getEmpresaId()
    let q = supabase.from('conferencias').select('*').order('data_hora', { ascending: false })
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async getById(id) {
    const eid = getEmpresaId()
    let q = supabase.from('conferencias').select('*').eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.single()
    if (error) throw error
    return data
  },
  async create(conf) {
    const eid = getEmpresaId()
    const payload = eid ? { ...conf, empresa_id: eid } : conf
    const { data, error } = await supabase.from('conferencias').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const eid = getEmpresaId()
    let q = supabase.from('conferencias').update(updates).eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },
}

// ── Ponto ─────────────────────────────────────────────────
export const pontoService = {
  async listHoje(usuarioId) {
    const eid = getEmpresaId()
    const n = new Date()
    const hoje = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`
    let q = supabase.from('pontos').select('*').eq('usuario_id', usuarioId).eq('data', hoje).order('data_hora')
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async registrar(registro) {
    const eid = getEmpresaId()
    const payload = eid ? { ...registro, empresa_id: eid } : registro
    const { data, error } = await supabase.from('pontos').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async listMes(usuarioId, mes) {
    const eid = getEmpresaId()
    let q = supabase.from('pontos').select('*')
      .eq('usuario_id', usuarioId)
      .gte('data', `${mes}-01`)
      .lte('data', `${mes}-31`)
      .order('data_hora')
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async listAllHoje() {
    const eid = getEmpresaId()
    const n = new Date()
    const hoje = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`
    let q = supabase.from('pontos').select('*').eq('data', hoje).order('usuario_nome').order('data_hora')
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
}

// ── Assinaturas ───────────────────────────────────────────
// Tabela filha de pedidos — acesso via pedido_id
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

// ── Clientes ──────────────────────────────────────────────
export const clientesService = {
  async list() {
    const eid = getEmpresaId()
    let q = supabase.from('clientes').select('*').order('nome')
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async listPaged({ search = '', from = 0, to = 99 } = {}) {
    const eid = getEmpresaId()
    let q = supabase.from('clientes').select('*', { count: 'exact' })
    if (eid) q = q.eq('empresa_id', eid)
    if (search) q = q.or(`nome.ilike.%${search}%,cpf_cnpj.ilike.%${search}%,telefone.ilike.%${search}%`)
    q = q.order('nome', { ascending: true }).range(from, to)
    const { data, count, error } = await q
    if (error) throw error
    return { data: data || [], count: count || 0 }
  },
  async getById(id) {
    const eid = getEmpresaId()
    let q = supabase.from('clientes').select('*').eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.single()
    if (error) throw error
    return data
  },
  async create(c) {
    const eid = getEmpresaId()
    const payload = eid ? { ...c, empresa_id: eid } : c
    const { data, error } = await supabase.from('clientes').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const eid = getEmpresaId()
    let q = supabase.from('clientes').update(updates).eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },
  async remove(id) {
    const eid = getEmpresaId()
    let q = supabase.from('clientes').delete().eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { error } = await q
    if (error) throw error
    return true
  },
}

// ── Fornecedores ──────────────────────────────────────────
export const fornecedoresService = {
  async list() {
    const eid = getEmpresaId()
    let q = supabase.from('fornecedores').select('*').order('nome')
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async listPaged({ search = '', from = 0, to = 99 } = {}) {
    const eid = getEmpresaId()
    let q = supabase.from('fornecedores').select('*', { count: 'exact' })
    if (eid) q = q.eq('empresa_id', eid)
    if (search) q = q.or(`nome.ilike.%${search}%,cnpj.ilike.%${search}%`)
    q = q.order('nome', { ascending: true }).range(from, to)
    const { data, count, error } = await q
    if (error) throw error
    return { data: data || [], count: count || 0 }
  },
  async create(f) {
    const eid = getEmpresaId()
    const payload = eid ? { ...f, empresa_id: eid } : f
    const { data, error } = await supabase.from('fornecedores').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const eid = getEmpresaId()
    let q = supabase.from('fornecedores').update(updates).eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },
  async remove(id) {
    const eid = getEmpresaId()
    let q = supabase.from('fornecedores').delete().eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { error } = await q
    if (error) throw error
    return true
  },
}

// ── Catálogo ──────────────────────────────────────────────
export const catalogoService = {
  async list() {
    const eid = getEmpresaId()
    let q = supabase.from('catalogo_produtos').select('*').order('nome')
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async listPaged({ search = '', from = 0, to = 99 } = {}) {
    const eid = getEmpresaId()
    let q = supabase.from('catalogo_produtos').select('*', { count: 'exact' })
    if (eid) q = q.eq('empresa_id', eid)
    if (search) q = q.or(`nome.ilike.%${search}%,codigo_barras.ilike.%${search}%`)
    q = q.order('nome', { ascending: true }).range(from, to)
    const { data, count, error } = await q
    if (error) throw error
    return { data: data || [], count: count || 0 }
  },
  async create(p) {
    const eid = getEmpresaId()
    const { codigo_produto: _cp, codigo_barras: _cb, ...rest } = p
    const payload = eid ? { ...rest, empresa_id: eid } : rest
    const { data, error } = await supabase.from('catalogo_produtos').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const eid = getEmpresaId()
    let q = supabase.from('catalogo_produtos').update(updates).eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },
  async remove(id) {
    const eid = getEmpresaId()
    let q = supabase.from('catalogo_produtos').delete().eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { error } = await q
    if (error) throw error
    return true
  },
  async uploadFoto(file, produtoId) {
    await validarTipoImagem(file)
    const ext = file.name.split('.').pop()
    const path = `${produtoId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('produtos').upload(path, file, { upsert: false })
    if (error) throw error
    const { data } = supabase.storage.from('produtos').getPublicUrl(path)
    return data.publicUrl
  },
}

// ── Configurações do Sistema ──────────────────────────────
// Nota: para multi-empresa a tabela precisa ter empresa_id como chave discriminadora
const CFG_ID = '00000000-0000-0000-0000-000000000001'
export const configSistemaService = {
  async get() {
    const eid = getEmpresaId()
    let q = supabase.from('configuracoes').select('*').eq('chave', 'sistema')
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.maybeSingle()
    if (error) throw error
    return data || {}
  },
  async save(updates) {
    const eid = getEmpresaId()
    const payload = { id: CFG_ID, chave: 'sistema', ...updates, ...(eid ? { empresa_id: eid } : {}) }
    const { data, error } = await supabase
      .from('configuracoes')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .maybeSingle()
    if (error) throw error
    return data
  },
}

// ── Vendas ────────────────────────────────────────────────
export const vendasService = {
  async list(lojaFiltro) {
    const eid = getEmpresaId()
    let q = supabase.from('vendas').select('*, venda_itens(*)').order('created_at', { ascending: false })
    if (eid) q = q.eq('empresa_id', eid)
    if (lojaFiltro) q = q.eq('loja', lojaFiltro)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async listPaged({ search = '', from = 0, to = 99, loja } = {}) {
    const eid = getEmpresaId()
    let q = supabase.from('vendas').select('*, venda_itens(*)', { count: 'exact' })
    if (eid) q = q.eq('empresa_id', eid)
    if (search) q = q.or(`cliente_nome.ilike.%${search}%`)
    if (loja) q = q.eq('loja', loja)
    q = q.order('created_at', { ascending: false }).range(from, to)
    const { data, count, error } = await q
    if (error) throw error
    return { data: data || [], count: count || 0 }
  },
  async getById(id) {
    const eid = getEmpresaId()
    let q = supabase.from('vendas').select('*, venda_itens(*)').eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.single()
    if (error) throw error
    return data
  },
  async create(venda) {
    const eid = getEmpresaId()
    const payload = eid ? { ...venda, empresa_id: eid } : venda
    const { data, error } = await supabase.from('vendas').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const eid = getEmpresaId()
    let q = supabase.from('vendas').update(updates).eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },
  async createItens(itens) {
    const { data, error } = await supabase.from('venda_itens').insert(itens).select()
    if (error) throw error
    return data || []
  },
  async listMesDash(startIso, endIso, lojaFiltro) {
    const eid = getEmpresaId()
    let q = supabase.from('vendas').select('*, venda_itens(*)')
      .gte('created_at', startIso)
      .lt('created_at', endIso)
    if (eid) q = q.eq('empresa_id', eid)
    if (lojaFiltro) q = q.eq('loja', lojaFiltro)
    const { data, error } = await q.order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },
}

// ── Compras ───────────────────────────────────────────────
export const comprasService = {
  async list(lojaFiltro) {
    const eid = getEmpresaId()
    let q = supabase.from('pedidos_compra').select('*, pedido_compra_itens(*)').order('created_at', { ascending: false })
    if (eid) q = q.eq('empresa_id', eid)
    if (lojaFiltro) q = q.eq('loja', lojaFiltro)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async getById(id) {
    const eid = getEmpresaId()
    let q = supabase.from('pedidos_compra').select('*, pedido_compra_itens(*)').eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.single()
    if (error) throw error
    return data
  },
  async create(compra) {
    const eid = getEmpresaId()
    const payload = eid ? { ...compra, empresa_id: eid } : compra
    const { data, error } = await supabase.from('pedidos_compra').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const eid = getEmpresaId()
    let q = supabase.from('pedidos_compra').update(updates).eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },
  async createItens(itens) {
    const { data, error } = await supabase.from('pedido_compra_itens').insert(itens).select()
    if (error) throw error
    return data || []
  },
  async listPendentesDash(lojaFiltro) {
    const eid = getEmpresaId()
    let q = supabase.from('pedidos_compra').select('*, pedido_compra_itens(*)')
      .in('status', ['pendente', 'aguardando', 'aguardando_aprovacao'])
    if (eid) q = q.eq('empresa_id', eid)
    if (lojaFiltro) q = q.eq('loja', lojaFiltro)
    const { data, error } = await q.order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },
}

// ── Estoque ───────────────────────────────────────────────
export const estoqueService = {
  async list(lojaFiltro) {
    const eid = getEmpresaId()
    let q = supabase.from('estoque').select('*').order('nome_produto')
    if (eid) q = q.eq('empresa_id', eid)
    if (lojaFiltro) q = q.eq('loja', lojaFiltro)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async listPaged({ search = '', from = 0, to = 99, loja } = {}) {
    const eid = getEmpresaId()
    let q = supabase.from('estoque').select('*', { count: 'exact' })
    if (eid) q = q.eq('empresa_id', eid)
    if (search) q = q.or(`nome_produto.ilike.%${search}%,codigo_barras.ilike.%${search}%`)
    if (loja) q = q.eq('loja', loja)
    q = q.order('created_at', { ascending: false }).range(from, to)
    const { data, count, error } = await q
    if (error) throw error
    return { data: data || [], count: count || 0 }
  },
  async listNFEntradas() {
    const eid = getEmpresaId()
    let q = supabase.from('nf_entrada').select('*, nf_entrada_itens(*)').order('created_at', { ascending: false })
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async createNFEntrada(nf) {
    const eid = getEmpresaId()
    const payload = eid ? { ...nf, empresa_id: eid } : nf
    const { data, error } = await supabase.from('nf_entrada').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async updateNFEntrada(id, updates) {
    const eid = getEmpresaId()
    let q = supabase.from('nf_entrada').update(updates).eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },
  async createNFItens(itens) {
    const { data, error } = await supabase.from('nf_entrada_itens').insert(itens).select()
    if (error) throw error
    return data || []
  },
  async listMovimentacoes() {
    const eid = getEmpresaId()
    let q = supabase.from('movimentos_estoque').select('*').order('created_at', { ascending: false })
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async createMovimentacao(mov) {
    const eid = getEmpresaId()
    const payload = eid ? { ...mov, empresa_id: eid } : mov
    const { data, error } = await supabase.from('movimentos_estoque').insert(payload).select().single()
    if (error) throw error
    return data
  },
}

// ── Financeiro ────────────────────────────────────────────
export const financeiroService = {
  async listReceber(lojaFiltro) {
    const eid = getEmpresaId()
    let q = supabase.from('financeiro_receber').select('*').order('vencimento')
    if (eid) q = q.eq('empresa_id', eid)
    if (lojaFiltro) q = q.eq('loja', lojaFiltro)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async listPagar(lojaFiltro) {
    const eid = getEmpresaId()
    let q = supabase.from('financeiro_pagar').select('*').order('vencimento')
    if (eid) q = q.eq('empresa_id', eid)
    if (lojaFiltro) q = q.eq('loja', lojaFiltro)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async listPagedReceber({ search = '', from = 0, to = 99, loja } = {}) {
    const eid = getEmpresaId()
    let q = supabase.from('financeiro_receber').select('*', { count: 'exact' })
    if (eid) q = q.eq('empresa_id', eid)
    if (search) q = q.or(`descricao.ilike.%${search}%,cliente_fornecedor.ilike.%${search}%`)
    if (loja) q = q.eq('loja', loja)
    q = q.order('created_at', { ascending: false }).range(from, to)
    const { data, count, error } = await q
    if (error) throw error
    return { data: data || [], count: count || 0 }
  },
  async listPagedPagar({ search = '', from = 0, to = 99, loja } = {}) {
    const eid = getEmpresaId()
    let q = supabase.from('financeiro_pagar').select('*', { count: 'exact' })
    if (eid) q = q.eq('empresa_id', eid)
    if (search) q = q.or(`descricao.ilike.%${search}%,cliente_fornecedor.ilike.%${search}%`)
    if (loja) q = q.eq('loja', loja)
    q = q.order('created_at', { ascending: false }).range(from, to)
    const { data, count, error } = await q
    if (error) throw error
    return { data: data || [], count: count || 0 }
  },
  async createReceber(rec) {
    const eid = getEmpresaId()
    const payload = eid ? { ...rec, empresa_id: eid } : rec
    const { data, error } = await supabase.from('financeiro_receber').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async createPagar(pag) {
    const eid = getEmpresaId()
    const payload = eid ? { ...pag, empresa_id: eid } : pag
    const { data, error } = await supabase.from('financeiro_pagar').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async updateReceber(id, updates) {
    const eid = getEmpresaId()
    let q = supabase.from('financeiro_receber').update(updates).eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },
  async updatePagar(id, updates) {
    const eid = getEmpresaId()
    let q = supabase.from('financeiro_pagar').update(updates).eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },
  async listReceberAberto(lojaFiltro) {
    const eid = getEmpresaId()
    let q = supabase.from('financeiro_receber').select('*').neq('status', 'pago')
    if (eid) q = q.eq('empresa_id', eid)
    if (lojaFiltro) q = q.eq('loja', lojaFiltro)
    const { data, error } = await q.order('vencimento')
    if (error) throw error
    return data || []
  },
  async listPagarProximo(prox7Iso, lojaFiltro) {
    const eid = getEmpresaId()
    let q = supabase.from('financeiro_pagar').select('*')
      .neq('status', 'pago')
      .lte('vencimento', prox7Iso)
    if (eid) q = q.eq('empresa_id', eid)
    if (lojaFiltro) q = q.eq('loja', lojaFiltro)
    const { data, error } = await q.order('vencimento')
    if (error) throw error
    return data || []
  },
}

// ── Departamento Pessoal ──────────────────────────────────
export const dpService = {
  async listFuncionarios(lojaFiltro) {
    const eid = getEmpresaId()
    let q = supabase.from('funcionarios').select('*').order('nome')
    if (eid) q = q.eq('empresa_id', eid)
    if (lojaFiltro) q = q.eq('loja', lojaFiltro)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async createFuncionario(f) {
    const eid = getEmpresaId()
    const payload = eid ? { ...f, empresa_id: eid } : f
    const { data, error } = await supabase.from('funcionarios').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async updateFuncionario(id, updates) {
    const eid = getEmpresaId()
    let q = supabase.from('funcionarios').update(updates).eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },
  async listFolha(mes) {
    const eid = getEmpresaId()
    let q = supabase.from('folha_pagamento').select('*').eq('mes', mes).order('funcionario_nome')
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async upsertFolha(folha) {
    const eid = getEmpresaId()
    const payload = eid ? { ...folha, empresa_id: eid } : folha
    const { data, error } = await supabase.from('folha_pagamento').upsert(payload, { onConflict: 'funcionario_id,mes' }).select().single()
    if (error) throw error
    return data
  },
}

// ── Ordens de Serviço ─────────────────────────────────────
export const ordensServicoService = {
  async list() {
    const eid = getEmpresaId()
    let q = supabase.from('ordens_servico').select('*').order('created_at', { ascending: false })
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async listPaged({ search = '', from = 0, to = 99, status } = {}) {
    const eid = getEmpresaId()
    let q = supabase.from('ordens_servico').select('*', { count: 'exact' })
    if (eid) q = q.eq('empresa_id', eid)
    if (search) q = q.or(`titulo.ilike.%${search}%,cliente.ilike.%${search}%`)
    if (status) q = q.eq('status', status)
    q = q.order('created_at', { ascending: false }).range(from, to)
    const { data, count, error } = await q
    if (error) throw error
    return { data: data || [], count: count || 0 }
  },
  async getById(id) {
    const eid = getEmpresaId()
    let q = supabase.from('ordens_servico').select('*').eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.single()
    if (error) throw error
    return data
  },
  async create(os) {
    const eid = getEmpresaId()
    const payload = eid ? { ...os, empresa_id: eid } : os
    const { data, error } = await supabase.from('ordens_servico').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const eid = getEmpresaId()
    let q = supabase.from('ordens_servico')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },
}

// ── Lojas ─────────────────────────────────────────────────
export const lojasService = {
  async list() {
    const eid = getEmpresaId()
    let q = supabase.from('lojas').select('*').order('nome')
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async create(loja) {
    const eid = getEmpresaId()
    const payload = eid ? { ...loja, empresa_id: eid } : loja
    const { data, error } = await supabase.from('lojas').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const eid = getEmpresaId()
    let q = supabase.from('lojas').update(updates).eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },
  async upsertByNome(lojas) {
    const eid = getEmpresaId()
    const payload = eid ? lojas.map(l => ({ ...l, empresa_id: eid })) : lojas
    const { error } = await supabase.from('lojas').upsert(payload, { onConflict: 'nome', ignoreDuplicates: true })
    if (error) throw error
  },
}

// ── Decoradores ───────────────────────────────────────────
export const decoradoresService = {
  async list() {
    const eid = getEmpresaId()
    let q = supabase.from('decoradores').select('*').order('nome')
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async create(d) {
    const eid = getEmpresaId()
    const payload = eid ? { ...d, empresa_id: eid } : d
    const { data, error } = await supabase.from('decoradores').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const eid = getEmpresaId()
    let q = supabase.from('decoradores').update(updates).eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },
}

// ── CRM ───────────────────────────────────────────────────
export const crmService = {
  async list(lojaFiltro) {
    const eid = getEmpresaId()
    let q = supabase.from('crm_leads').select('*').order('created_at', { ascending: false })
    if (eid) q = q.eq('empresa_id', eid)
    if (lojaFiltro) q = q.eq('loja', lojaFiltro)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async listPaged({ search = '', from = 0, to = 99, loja } = {}) {
    const eid = getEmpresaId()
    let q = supabase.from('crm_leads').select('*', { count: 'exact' })
    if (eid) q = q.eq('empresa_id', eid)
    if (search) q = q.or(`nome.ilike.%${search}%,responsavel.ilike.%${search}%`)
    if (loja) q = q.eq('loja', loja)
    q = q.order('created_at', { ascending: false }).range(from, to)
    const { data, count, error } = await q
    if (error) throw error
    return { data: data || [], count: count || 0 }
  },
  async create(lead) {
    const eid = getEmpresaId()
    const payload = eid ? { ...lead, empresa_id: eid } : lead
    const { data, error } = await supabase.from('crm_leads').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const eid = getEmpresaId()
    let q = supabase.from('crm_leads').update(updates).eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },
  async remove(id) {
    const eid = getEmpresaId()
    let q = supabase.from('crm_leads').delete().eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { error } = await q
    if (error) throw error
  },
}

// ── Orçamentos ────────────────────────────────────────────
export const orcamentosService = {
  async list() {
    const eid = getEmpresaId()
    let q = supabase.from('orcamentos').select('*').order('created_at', { ascending: false })
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async create(orc) {
    const eid = getEmpresaId()
    const payload = eid ? { ...orc, empresa_id: eid } : orc
    const { data, error } = await supabase.from('orcamentos').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const eid = getEmpresaId()
    let q = supabase.from('orcamentos').update(updates).eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },
}

// ── NPS ───────────────────────────────────────────────────
export const npsService = {
  async list() {
    const eid = getEmpresaId()
    let q = supabase.from('nps_respostas').select('*').order('created_at', { ascending: false })
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async create(row) {
    const eid = getEmpresaId()
    const payload = eid ? { ...row, empresa_id: eid } : row
    const { data, error } = await supabase.from('nps_respostas').insert(payload).select().single()
    if (error) throw error
    return data
  },
  // getByToken e respond são usados em páginas públicas — sem filtro empresa_id
  async getByToken(token) {
    const { data, error } = await supabase.from('nps_respostas').select('*').eq('token', token).single()
    if (error) throw error
    return data
  },
  async respond(token, nota, comentario) {
    const classificacao = nota <= 6 ? 'detrator' : nota <= 8 ? 'neutro' : 'promotor'
    const { data, error } = await supabase.from('nps_respostas').update({ nota, comentario, classificacao, respondido_em: new Date().toISOString() }).eq('token', token).select().single()
    if (error) throw error
    return data
  },
}

// ── Devoluções ────────────────────────────────────────────
export const devolucoesService = {
  async list() {
    const eid = getEmpresaId()
    let q = supabase.from('devolucoes').select('*').order('created_at', { ascending: false })
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async create(dev) {
    const eid = getEmpresaId()
    const payload = eid ? { ...dev, empresa_id: eid } : dev
    const { data, error } = await supabase.from('devolucoes').insert(payload).select().single()
    if (error) throw error
    return data
  },
}

// ── Localizações equipe ───────────────────────────────────
export const localizacoesService = {
  async upsert(userId, nome, lat, lng, status, pedidoId) {
    const eid = getEmpresaId()
    const payload = {
      usuario_id: userId, usuario_nome: nome, latitude: lat, longitude: lng,
      status, pedido_atual_id: pedidoId || null, updated_at: new Date().toISOString(),
      ...(eid ? { empresa_id: eid } : {}),
    }
    const { error } = await supabase.from('localizacoes_equipe').upsert(payload, { onConflict: 'usuario_id' })
    if (error) throw error
  },
  async list() {
    const eid = getEmpresaId()
    const cutoff = new Date(Date.now() - 15 * 60000).toISOString()
    let q = supabase.from('localizacoes_equipe').select('*').gte('updated_at', cutoff)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
}

// ── Consignações ──────────────────────────────────────────
export const consignacoesService = {
  async list() {
    const eid = getEmpresaId()
    let q = supabase.from('consignacoes').select('*').order('created_at', { ascending: false })
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async create(c) {
    const eid = getEmpresaId()
    const payload = eid ? { ...c, empresa_id: eid } : c
    const { data, error } = await supabase.from('consignacoes').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const eid = getEmpresaId()
    let q = supabase.from('consignacoes').update(updates).eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },
}

// ── Acabamentos ───────────────────────────────────────────
export const acabamentosService = {
  async list() {
    const eid = getEmpresaId()
    let q = supabase.from('acabamentos').select('*').order('nome')
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async create(a) {
    const eid = getEmpresaId()
    const payload = eid ? { ...a, empresa_id: eid } : a
    const { data, error } = await supabase.from('acabamentos').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async update(id, u) {
    const eid = getEmpresaId()
    let q = supabase.from('acabamentos').update(u).eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },
}

// ── Tecidos ───────────────────────────────────────────────
export const tecidosService = {
  async list() {
    const eid = getEmpresaId()
    let q = supabase.from('tecidos').select('*').order('nome')
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async create(t) {
    const eid = getEmpresaId()
    const payload = eid ? { ...t, empresa_id: eid } : t
    const { data, error } = await supabase.from('tecidos').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async update(id, u) {
    const eid = getEmpresaId()
    let q = supabase.from('tecidos').update(u).eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },
}

// ── Metas ─────────────────────────────────────────────────
export const metasService = {
  async list(mes, ano) {
    const eid = getEmpresaId()
    let q = supabase.from('metas').select('*')
    if (eid) q = q.eq('empresa_id', eid)
    if (mes) q = q.eq('mes', mes)
    if (ano) q = q.eq('ano', ano)
    const { data, error } = await q.order('referencia_nome')
    if (error) throw error
    return data || []
  },
  async upsert(meta) {
    const eid = getEmpresaId()
    const payload = eid ? { ...meta, empresa_id: eid } : meta
    const { data, error } = await supabase.from('metas').upsert(payload, { onConflict: 'tipo,referencia_id,mes,ano' }).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const eid = getEmpresaId()
    let q = supabase.from('metas').update(updates).eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },
}

// ── Representantes ────────────────────────────────────────
export const representantesService = {
  async list() {
    const eid = getEmpresaId()
    let q = supabase.from('representantes').select('*, fornecedores(nome)').order('nome')
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async create(r) {
    const eid = getEmpresaId()
    const payload = eid ? { ...r, empresa_id: eid } : r
    const { data, error } = await supabase.from('representantes').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const eid = getEmpresaId()
    let q = supabase.from('representantes').update(updates).eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },
  async remove(id) {
    const eid = getEmpresaId()
    let q = supabase.from('representantes').delete().eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { error } = await q
    if (error) throw error
    return true
  },
}

// ── Audit Log ─────────────────────────────────────────────
// Tabela global — sem filtro empresa_id
export const auditLog = {
  async registrar(acao, tabela, registroId, usuario_id, dadosAnteriores) {
    try {
      await supabase.from('audit_log').insert({ usuario_id, acao, tabela, registro_id: String(registroId), dados_anteriores: dadosAnteriores || null })
    } catch (_) { /* audit_log pode não existir ainda */ }
  },
}

// ── Perfis de Acesso ──────────────────────────────────────
// Tabela global de configuração — sem filtro empresa_id
// SQL para rodar no Supabase Dashboard (Bloco 1):
// ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS perfil TEXT DEFAULT 'vendedor';
// ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS loja_id UUID REFERENCES lojas(id);
// ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS permissoes_extras JSONB DEFAULT '{}';
// CREATE TABLE IF NOT EXISTS perfis_acesso (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   perfil TEXT NOT NULL UNIQUE, label TEXT NOT NULL,
//   modulos TEXT[] NOT NULL DEFAULT '{}',
//   pode_ver_todas_lojas BOOLEAN DEFAULT FALSE,
//   pode_ver_financeiro BOOLEAN DEFAULT FALSE,
//   pode_ver_vendas BOOLEAN DEFAULT FALSE,
//   pode_ver_metas BOOLEAN DEFAULT FALSE,
//   pode_editar_permissoes BOOLEAN DEFAULT FALSE,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
// INSERT INTO perfis_acesso (perfil,label,modulos,pode_ver_todas_lojas,pode_ver_financeiro,pode_ver_vendas,pode_ver_metas,pode_editar_permissoes) VALUES
// ('admin','Administrador',ARRAY['dashboard','pedidos','separacao','agenda','assistencia','roteiro','conferencia','equipe','ranking','mapa','rota','ponto','config','cadastros','vendas','compras','estoque','financeiro','dp','os','crm','nps','devolucao','relatorios','fila','catalogo','nf'],true,true,true,true,true),
// ('diretor','Diretor',ARRAY['dashboard','pedidos','separacao','agenda','assistencia','roteiro','conferencia','equipe','ranking','mapa','rota','ponto','cadastros','vendas','compras','estoque','financeiro','dp','os','crm','nps','devolucao','relatorios','fila'],true,true,true,true,false),
// ('gerente','Gerente de Loja',ARRAY['dashboard','pedidos','agenda','assistencia','conferencia','equipe','ranking','ponto','cadastros','vendas','estoque','os','crm','nps'],false,false,true,true,false),
// ('assistente_admin','Assistente Administrativa',ARRAY['dashboard','pedidos','agenda','ponto','cadastros','compras','estoque','dp','financeiro_loja'],false,false,false,false,false),
// ('vendedor','Vendedor',ARRAY['dashboard','vendas','cadastros','ponto','crm','ranking'],false,false,true,true,false),
// ('gerente_logistica','Gerente de Logística',ARRAY['dashboard','pedidos','separacao','roteiro','conferencia','assistencia','mapa','rota','ponto','estoque','equipe','ranking'],true,false,false,false,false),
// ('supervisor_logistica','Supervisor de Logística',ARRAY['dashboard','pedidos','separacao','roteiro','conferencia','assistencia','mapa','rota','ponto','estoque'],true,false,false,false,false),
// ('expedidor','Expedição',ARRAY['dashboard','separacao','conferencia','ponto'],false,false,false,false,false),
// ('entregador','Entregador',ARRAY['dashboard','rota','pedidos','ponto','ranking'],false,false,false,false,false),
// ('separador','Separador',ARRAY['dashboard','separacao','pedidos','ponto'],false,false,false,false,false),
// ('conferente','Conferente',ARRAY['dashboard','conferencia','pedidos','ponto'],false,false,false,false,false),
// ('tecnico','Técnico',ARRAY['dashboard','assistencia','roteiro','ponto'],false,false,false,false,false),
// ('atendente','Atendente',ARRAY['dashboard','assistencia','pedidos','agenda','ponto'],false,false,false,false,false),
// ('contador','Contador',ARRAY['financeiro','dp','relatorios'],true,true,false,false,false)
// ON CONFLICT (perfil) DO NOTHING;
export const perfisAcessoService = {
  async list() {
    try {
      const { data, error } = await supabase.from('perfis_acesso').select('*').order('label')
      if (error) throw error
      return data || []
    } catch { return [] }
  },
  async getByPerfil(perfilNome) {
    try {
      const { data } = await supabase.from('perfis_acesso').select('*').eq('perfil', perfilNome).single()
      return data || null
    } catch { return null }
  },
}

// ── Pedidos Timeline ──────────────────────────────────────
// Tabela filha de pedidos — acesso via pedido_id
export const pedidosTimelineService = {
  async list(pedidoId) {
    const { data, error } = await supabase
      .from('pedidos_timeline')
      .select('*')
      .eq('pedido_id', pedidoId)
      .order('created_at')
    if (error) throw error
    return data || []
  },
  async create(entry) {
    const { data, error } = await supabase
      .from('pedidos_timeline')
      .insert(entry)
      .select()
      .single()
    if (error) throw error
    return data
  },
}

// ── Pedidos Follow-up ─────────────────────────────────────
// Tabela filha de pedidos — acesso via pedido_id
export const pedidosFollowupService = {
  async list(pedidoId) {
    const { data, error } = await supabase
      .from('pedidos_followup')
      .select('*')
      .eq('pedido_id', pedidoId)
      .order('created_at')
    if (error) throw error
    return data || []
  },
  async create(entry) {
    const { data, error } = await supabase
      .from('pedidos_followup')
      .insert(entry)
      .select()
      .single()
    if (error) throw error
    return data
  },
  async remove(id) {
    const { error } = await supabase.from('pedidos_followup').delete().eq('id', id)
    if (error) throw error
  },
}

// ── Pedidos Anexos (Storage) ──────────────────────────────
export const pedidosAnexosService = {
  async upload(file, pedidoId) {
    const ext = file.name.split('.').pop()
    const path = `${pedidoId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('pedidos-anexos').upload(path, file)
    if (error) throw error
    const { data } = supabase.storage.from('pedidos-anexos').getPublicUrl(path)
    return data.publicUrl
  },
  async remove(url) {
    const path = url.split('/pedidos-anexos/')[1]
    if (!path) return
    await supabase.storage.from('pedidos-anexos').remove([path])
  },
}

// ── Notificações ──────────────────────────────────────────
export const notificacoesService = {
  async criar({ usuario_id, tipo, titulo, mensagem, link, pedido_id, origem_usuario_id, origem_usuario_nome }) {
    const eid = getEmpresaId()
    const { data, error } = await supabase
      .from('notificacoes')
      .insert({
        usuario_id, tipo, titulo, mensagem,
        link: link || null,
        pedido_id: pedido_id || null,
        origem_usuario_id: origem_usuario_id || null,
        origem_usuario_nome: origem_usuario_nome || null,
        ...(eid ? { empresa_id: eid } : {}),
      })
      .select()
      .single()
    if (error) throw error
    return data
  },
  async listar(usuarioId) {
    const eid = getEmpresaId()
    let q = supabase.from('notificacoes').select('*')
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async contarNaoLidas(usuarioId) {
    const eid = getEmpresaId()
    let q = supabase.from('notificacoes')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', usuarioId)
      .eq('lida', false)
    if (eid) q = q.eq('empresa_id', eid)
    const { count, error } = await q
    if (error) return 0
    return count || 0
  },
  async marcarComoLida(id) {
    const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('id', id)
    if (error) throw error
  },
  async marcarTodasComoLidas(usuarioId) {
    const eid = getEmpresaId()
    let q = supabase.from('notificacoes').update({ lida: true })
      .eq('usuario_id', usuarioId)
      .eq('lida', false)
    if (eid) q = q.eq('empresa_id', eid)
    const { error } = await q
    if (error) throw error
  },
  async criarParaPerfil({ loja_id, perfil, tipo, titulo, mensagem, pedido_id }) {
    const eid = getEmpresaId()
    let q = supabase.from('usuarios').select('id').eq('loja', loja_id).or(`perfil.eq.${perfil},role.eq.${perfil}`)
    if (eid) q = q.eq('empresa_id', eid)
    const { data: usuarios } = await q
    if (!usuarios?.length) return
    const notifs = usuarios.map(u => ({
      usuario_id: u.id,
      tipo,
      titulo,
      mensagem,
      pedido_id: pedido_id || null,
      ...(eid ? { empresa_id: eid } : {}),
    }))
    const { error } = await supabase.from('notificacoes').insert(notifs)
    if (error) throw error
  },
}

// ── Chat ──────────────────────────────────────────────────
export const chatService = {
  async buscarOuCriarConversa(usuarioId, destinatarioId) {
    const eid = getEmpresaId()
    const { data: minhas } = await supabase
      .from('chat_participantes')
      .select('conversa_id')
      .eq('usuario_id', usuarioId)
    const ids = (minhas || []).map(r => r.conversa_id)
    if (ids.length) {
      const { data: comOutro } = await supabase
        .from('chat_participantes')
        .select('conversa_id, chat_conversas!inner(tipo)')
        .in('conversa_id', ids)
        .eq('usuario_id', destinatarioId)
      const direto = (comOutro || []).find(r => r.chat_conversas?.tipo === 'direto')
      if (direto) return direto.conversa_id
    }
    const { data: nova, error } = await supabase
      .from('chat_conversas')
      .insert({ tipo: 'direto', criado_por: usuarioId, ...(eid ? { empresa_id: eid } : {}) })
      .select()
      .single()
    if (error) throw error
    await supabase.from('chat_participantes').insert([
      { conversa_id: nova.id, usuario_id: usuarioId },
      { conversa_id: nova.id, usuario_id: destinatarioId },
    ])
    return nova.id
  },
  async listarConversas(usuarioId) {
    const { data: partic, error } = await supabase
      .from('chat_participantes')
      .select('conversa_id, ultima_leitura, chat_conversas(id, tipo, nome, criado_por, created_at)')
      .eq('usuario_id', usuarioId)
    if (error) throw error
    const conversaIds = (partic || []).map(r => r.conversa_id)
    if (!conversaIds.length) return []
    const { data: outros } = await supabase
      .from('chat_participantes')
      .select('conversa_id, usuario_id, usuarios(full_name, email)')
      .in('conversa_id', conversaIds)
      .neq('usuario_id', usuarioId)
    const outrosPorConversa = {}
    for (const o of outros || []) {
      outrosPorConversa[o.conversa_id] = { id: o.usuario_id, nome: o.usuarios?.full_name || o.usuarios?.email || 'Desconhecido' }
    }
    const { data: mensagens } = await supabase
      .from('chat_mensagens')
      .select('conversa_id, texto, usuario_nome, created_at')
      .in('conversa_id', conversaIds)
      .order('created_at', { ascending: false })
    const ultimaMsgPorConversa = {}
    for (const m of mensagens || []) {
      if (!ultimaMsgPorConversa[m.conversa_id]) ultimaMsgPorConversa[m.conversa_id] = m
    }
    const { data: naoLidas } = await supabase
      .from('chat_mensagens')
      .select('conversa_id, created_at')
      .in('conversa_id', conversaIds)
      .neq('usuario_id', usuarioId)
    return (partic || []).map(r => {
      const ultimaLeitura = r.ultima_leitura ? new Date(r.ultima_leitura) : new Date(0)
      const naoLidasCount = (naoLidas || []).filter(m => m.conversa_id === r.conversa_id && new Date(m.created_at) > ultimaLeitura).length
      const outro = outrosPorConversa[r.conversa_id] || {}
      return {
        ...r.chat_conversas,
        ultima_leitura: r.ultima_leitura,
        ultima_mensagem: ultimaMsgPorConversa[r.conversa_id] || null,
        nao_lidas: naoLidasCount,
        nome_exibicao: r.chat_conversas?.nome || outro.nome || 'Conversa',
        outro_usuario_id: outro.id || null,
      }
    }).sort((a, b) => {
      const ta = a.ultima_mensagem?.created_at || a.created_at
      const tb = b.ultima_mensagem?.created_at || b.created_at
      return new Date(tb) - new Date(ta)
    })
  },
  async listarMensagens(conversaId) {
    const { data, error } = await supabase
      .from('chat_mensagens')
      .select('*')
      .eq('conversa_id', conversaId)
      .order('created_at', { ascending: true })
      .limit(100)
    if (error) throw error
    return data || []
  },
  async enviarMensagem({ conversa_id, usuario_id, usuario_nome, texto, arquivos }) {
    const eid = getEmpresaId()
    const anexos = []
    for (const file of arquivos || []) {
      const ext = file.name.split('.').pop()
      const path = `${conversa_id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('chat-anexos').upload(path, file)
      if (!upErr) {
        const { data: pub } = supabase.storage.from('chat-anexos').getPublicUrl(path)
        anexos.push(pub.publicUrl)
      }
    }
    const { data: msg, error } = await supabase
      .from('chat_mensagens')
      .insert({ conversa_id, usuario_id, usuario_nome, texto, anexos })
      .select()
      .single()
    if (error) throw error
    const { data: partic } = await supabase
      .from('chat_participantes')
      .select('usuario_id')
      .eq('conversa_id', conversa_id)
      .neq('usuario_id', usuario_id)
    const notifs = (partic || []).map(p => ({
      usuario_id: p.usuario_id,
      tipo: 'nova_mensagem',
      titulo: `Nova mensagem de ${usuario_nome}`,
      mensagem: texto || (anexos.length ? '📎 Anexo' : ''),
      origem_usuario_id: usuario_id,
      origem_usuario_nome: usuario_nome,
      ...(eid ? { empresa_id: eid } : {}),
    }))
    if (notifs.length) await supabase.from('notificacoes').insert(notifs)
    return msg
  },
  async atualizarUltimaLeitura(conversaId, usuarioId) {
    await supabase
      .from('chat_participantes')
      .update({ ultima_leitura: new Date().toISOString() })
      .eq('conversa_id', conversaId)
      .eq('usuario_id', usuarioId)
  },
}

// ── Escalas de Trabalho ───────────────────────────────────
export const escalasTrabalhoService = {
  async list(usuarioId) {
    const eid = getEmpresaId()
    let q = supabase.from('escalas_trabalho').select('*').eq('ativo', true)
    if (eid) q = q.eq('empresa_id', eid)
    if (usuarioId) q = q.eq('usuario_id', usuarioId)
    const { data, error } = await q.order('dia_semana')
    if (error) throw error
    return data || []
  },
  async getEscalaHoje(usuarioId) {
    const eid = getEmpresaId()
    const diaSemana = new Date().getDay()
    let q = supabase.from('escalas_trabalho').select('*')
      .eq('usuario_id', usuarioId)
      .eq('ativo', true)
      .or(`dia_semana.eq.${diaSemana},dia_semana.is.null`)
      .order('dia_semana', { nullsFirst: false })
      .limit(1)
    if (eid) q = q.eq('empresa_id', eid)
    const { data } = await q.single()
    return data || null
  },
  async create(escala) {
    const eid = getEmpresaId()
    const payload = eid ? { ...escala, empresa_id: eid } : escala
    const { data, error } = await supabase.from('escalas_trabalho').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const eid = getEmpresaId()
    let q = supabase.from('escalas_trabalho').update(updates).eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },
  async remove(id) {
    const eid = getEmpresaId()
    let q = supabase.from('escalas_trabalho').delete().eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { error } = await q
    if (error) throw error
  },
}

// ── Ponto Ocorrências ─────────────────────────────────────
export const pontoOcorrenciasService = {
  async list(filtros = {}) {
    const eid = getEmpresaId()
    let q = supabase.from('ponto_ocorrencias').select('*, usuarios(full_name)').order('data', { ascending: false })
    if (eid) q = q.eq('empresa_id', eid)
    if (filtros.usuario_id) q = q.eq('usuario_id', filtros.usuario_id)
    if (filtros.loja_id)    q = q.eq('loja_id', filtros.loja_id)
    if (filtros.status)     q = q.eq('status', filtros.status)
    if (filtros.data_de)    q = q.gte('data', filtros.data_de)
    if (filtros.data_ate)   q = q.lte('data', filtros.data_ate)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async create(ocorrencia) {
    const eid = getEmpresaId()
    const payload = eid ? { ...ocorrencia, empresa_id: eid } : ocorrencia
    const { data, error } = await supabase.from('ponto_ocorrencias').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async aprovar(id, aprovadoPor) {
    const eid = getEmpresaId()
    let q = supabase.from('ponto_ocorrencias')
      .update({ status: 'aprovado', aprovado_por: aprovadoPor })
      .eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },
  async rejeitar(id) {
    const eid = getEmpresaId()
    let q = supabase.from('ponto_ocorrencias').update({ status: 'rejeitado' }).eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },
}

// ── Cercas Virtuais ───────────────────────────────────────
export const cercasVirtuaisService = {
  async list(lojaId) {
    const eid = getEmpresaId()
    let q = supabase.from('cercas_virtuais').select('*').eq('ativo', true)
    if (eid) q = q.eq('empresa_id', eid)
    if (lojaId) q = q.eq('loja_id', lojaId)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async listAll() {
    const eid = getEmpresaId()
    let q = supabase.from('cercas_virtuais').select('*').order('created_at', { ascending: false })
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async create(cerca) {
    const eid = getEmpresaId()
    const payload = eid ? { ...cerca, empresa_id: eid } : cerca
    const { data, error } = await supabase.from('cercas_virtuais').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const eid = getEmpresaId()
    let q = supabase.from('cercas_virtuais').update(updates).eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },
  async remove(id) {
    const eid = getEmpresaId()
    let q = supabase.from('cercas_virtuais').delete().eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { error } = await q
    if (error) throw error
  },
  calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371000
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)))
  },
}

// ── Conciliação Bancária ──────────────────────────────────
export const conciliacaoService = {
  async listExtratos(lojaId) {
    const eid = getEmpresaId()
    let q = supabase.from('extratos_bancarios').select('*').order('created_at', { ascending: false })
    if (eid) q = q.eq('empresa_id', eid)
    if (lojaId) q = q.eq('loja_id', lojaId)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async createExtrato(payload) {
    const eid = getEmpresaId()
    const data_payload = eid ? { ...payload, empresa_id: eid } : payload
    const { data, error } = await supabase.from('extratos_bancarios').insert(data_payload).select().single()
    if (error) throw error
    return data
  },
  async deleteExtrato(id) {
    const eid = getEmpresaId()
    let q = supabase.from('extratos_bancarios').delete().eq('id', id)
    if (eid) q = q.eq('empresa_id', eid)
    const { error } = await q
    if (error) throw error
  },
  // Filhos: acesso via extrato_id
  async listTransacoes(extratoId) {
    const { data, error } = await supabase.from('extrato_transacoes').select('*').eq('extrato_id', extratoId).order('data')
    if (error) throw error
    return data || []
  },
  async addTransacao(payload) {
    const { data, error } = await supabase.from('extrato_transacoes').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async conciliar(transacaoId, conciliado) {
    const { data, error } = await supabase.from('extrato_transacoes').update({ conciliado }).eq('id', transacaoId).select().single()
    if (error) throw error
    return data
  },
  async deleteTransacao(id) {
    const { error } = await supabase.from('extrato_transacoes').delete().eq('id', id)
    if (error) throw error
  },
}
