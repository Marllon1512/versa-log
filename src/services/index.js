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
  async removeByPedido(pedidoId) {
    const { error } = await supabase.from('produtos').delete().eq('pedido_id', pedidoId)
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
      .select('*, assistencia_itens(id, fornecedor)')
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

// ── Clientes ──────────────────────────────────────────────
export const clientesService = {
  async list() {
    const { data, error } = await supabase.from('clientes').select('*').order('nome')
    if (error) throw error
    return data || []
  },
  async getById(id) {
    const { data, error } = await supabase.from('clientes').select('*').eq('id', id).single()
    if (error) throw error
    return data
  },
  async create(c) {
    const { data, error } = await supabase.from('clientes').insert(c).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const { data, error } = await supabase.from('clientes').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async remove(id) {
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) throw error
    return true
  },
}

// ── Fornecedores ──────────────────────────────────────────
export const fornecedoresService = {
  async list() {
    const { data, error } = await supabase.from('fornecedores').select('*').order('nome')
    if (error) throw error
    return data || []
  },
  async create(f) {
    const { data, error } = await supabase.from('fornecedores').insert(f).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const { data, error } = await supabase.from('fornecedores').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async remove(id) {
    const { error } = await supabase.from('fornecedores').delete().eq('id', id)
    if (error) throw error
    return true
  },
}

// ── Catálogo ──────────────────────────────────────────────
export const catalogoService = {
  async list() {
    const { data, error } = await supabase.from('catalogo_produtos').select('*').order('nome')
    if (error) throw error
    return data || []
  },
  async create(p) {
    const { data, error } = await supabase.from('catalogo_produtos').insert(p).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const { data, error } = await supabase.from('catalogo_produtos').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async remove(id) {
    const { error } = await supabase.from('catalogo_produtos').delete().eq('id', id)
    if (error) throw error
    return true
  },
  async uploadFoto(file, produtoId) {
    const ext = file.name.split('.').pop()
    const path = `${produtoId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('produtos').upload(path, file, { upsert: false })
    if (error) throw error
    const { data } = supabase.storage.from('produtos').getPublicUrl(path)
    return data.publicUrl
  },
}

// ── Configurações do Sistema ──────────────────────────────
export const configSistemaService = {
  async get() {
    const { data } = await supabase.from('configuracoes_sistema').select('*').limit(1).single()
    return data || {}
  },
  async save(updates) {
    const { data: existing } = await supabase.from('configuracoes_sistema').select('id').limit(1).single()
    if (existing?.id) {
      const { data, error } = await supabase.from('configuracoes_sistema').update(updates).eq('id', existing.id).select().single()
      if (error) throw error
      return data
    }
    const { data, error } = await supabase.from('configuracoes_sistema').insert(updates).select().single()
    if (error) throw error
    return data
  },
}

// ── Vendas ────────────────────────────────────────────────
export const vendasService = {
  async list(lojaFiltro) {
    let q = supabase.from('vendas').select('*, venda_itens(*)').order('created_at', { ascending: false })
    if (lojaFiltro) q = q.eq('loja', lojaFiltro)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async getById(id) {
    const { data, error } = await supabase.from('vendas').select('*, venda_itens(*)').eq('id', id).single()
    if (error) throw error
    return data
  },
  async create(venda) {
    const { data, error } = await supabase.from('vendas').insert(venda).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const { data, error } = await supabase.from('vendas').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async createItens(itens) {
    const { data, error } = await supabase.from('venda_itens').insert(itens).select()
    if (error) throw error
    return data || []
  },
}

// ── Compras ───────────────────────────────────────────────
export const comprasService = {
  async list() {
    const { data, error } = await supabase.from('pedidos_compra').select('*, pedido_compra_itens(*)').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },
  async getById(id) {
    const { data, error } = await supabase.from('pedidos_compra').select('*, pedido_compra_itens(*)').eq('id', id).single()
    if (error) throw error
    return data
  },
  async create(compra) {
    const { data, error } = await supabase.from('pedidos_compra').insert(compra).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const { data, error } = await supabase.from('pedidos_compra').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async createItens(itens) {
    const { data, error } = await supabase.from('pedido_compra_itens').insert(itens).select()
    if (error) throw error
    return data || []
  },
}

// ── Estoque ───────────────────────────────────────────────
export const estoqueService = {
  async list() {
    const { data, error } = await supabase.from('estoque').select('*').order('nome_produto')
    if (error) throw error
    return data || []
  },
  async listNFEntradas() {
    const { data, error } = await supabase.from('nf_entrada').select('*, nf_entrada_itens(*)').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },
  async createNFEntrada(nf) {
    const { data, error } = await supabase.from('nf_entrada').insert(nf).select().single()
    if (error) throw error
    return data
  },
  async updateNFEntrada(id, updates) {
    const { data, error } = await supabase.from('nf_entrada').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async createNFItens(itens) {
    const { data, error } = await supabase.from('nf_entrada_itens').insert(itens).select()
    if (error) throw error
    return data || []
  },
  async listMovimentacoes() {
    const { data, error } = await supabase.from('movimentos_estoque').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },
  async createMovimentacao(mov) {
    const { data, error } = await supabase.from('movimentos_estoque').insert(mov).select().single()
    if (error) throw error
    return data
  },
}

// ── Financeiro ────────────────────────────────────────────
export const financeiroService = {
  async listReceber() {
    const { data, error } = await supabase.from('financeiro_receber').select('*').order('vencimento')
    if (error) throw error
    return data || []
  },
  async listPagar() {
    const { data, error } = await supabase.from('financeiro_pagar').select('*').order('vencimento')
    if (error) throw error
    return data || []
  },
  async createReceber(rec) {
    const { data, error } = await supabase.from('financeiro_receber').insert(rec).select().single()
    if (error) throw error
    return data
  },
  async createPagar(pag) {
    const { data, error } = await supabase.from('financeiro_pagar').insert(pag).select().single()
    if (error) throw error
    return data
  },
  async updateReceber(id, updates) {
    const { data, error } = await supabase.from('financeiro_receber').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async updatePagar(id, updates) {
    const { data, error } = await supabase.from('financeiro_pagar').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
}

// ── Departamento Pessoal ──────────────────────────────────
export const dpService = {
  async listFuncionarios() {
    const { data, error } = await supabase.from('funcionarios').select('*').order('nome')
    if (error) throw error
    return data || []
  },
  async createFuncionario(f) {
    const { data, error } = await supabase.from('funcionarios').insert(f).select().single()
    if (error) throw error
    return data
  },
  async updateFuncionario(id, updates) {
    const { data, error } = await supabase.from('funcionarios').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async listFolha(mes) {
    const { data, error } = await supabase.from('folha_pagamento').select('*').eq('mes', mes).order('funcionario_nome')
    if (error) throw error
    return data || []
  },
  async upsertFolha(folha) {
    const { data, error } = await supabase.from('folha_pagamento').upsert(folha, { onConflict: 'funcionario_id,mes' }).select().single()
    if (error) throw error
    return data
  },
}

// ── Ordens de Serviço ─────────────────────────────────────
export const ordensServicoService = {
  async list() {
    const { data, error } = await supabase.from('ordens_servico').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },
  async getById(id) {
    const { data, error } = await supabase.from('ordens_servico').select('*').eq('id', id).single()
    if (error) throw error
    return data
  },
  async create(os) {
    const { data, error } = await supabase.from('ordens_servico').insert(os).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const { data, error } = await supabase.from('ordens_servico').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (error) throw error
    return data
  },
}

// ── Lojas ─────────────────────────────────────────────────
export const lojasService = {
  async list() {
    const { data, error } = await supabase.from('lojas').select('*').order('nome')
    if (error) throw error
    return data || []
  },
  async create(loja) {
    const { data, error } = await supabase.from('lojas').insert(loja).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const { data, error } = await supabase.from('lojas').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async upsertByNome(lojas) {
    const { error } = await supabase.from('lojas').upsert(lojas, { onConflict: 'nome', ignoreDuplicates: true })
    if (error) throw error
  },
}

// ── Decoradores ───────────────────────────────────────────
export const decoradoresService = {
  async list() {
    const { data, error } = await supabase.from('decoradores').select('*').order('nome')
    if (error) throw error
    return data || []
  },
  async create(d) {
    const { data, error } = await supabase.from('decoradores').insert(d).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const { data, error } = await supabase.from('decoradores').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
}

// ── CRM ───────────────────────────────────────────────────
export const crmService = {
  async list() {
    const { data, error } = await supabase.from('crm_leads').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },
  async create(lead) {
    const { data, error } = await supabase.from('crm_leads').insert(lead).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const { data, error } = await supabase.from('crm_leads').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async remove(id) {
    const { error } = await supabase.from('crm_leads').delete().eq('id', id)
    if (error) throw error
  },
}

// ── Orçamentos ────────────────────────────────────────────
export const orcamentosService = {
  async list() {
    const { data, error } = await supabase.from('orcamentos').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },
  async create(orc) {
    const { data, error } = await supabase.from('orcamentos').insert(orc).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const { data, error } = await supabase.from('orcamentos').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
}

// ── NPS ───────────────────────────────────────────────────
export const npsService = {
  async list() {
    const { data, error } = await supabase.from('nps_respostas').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },
  async create(row) {
    const { data, error } = await supabase.from('nps_respostas').insert(row).select().single()
    if (error) throw error
    return data
  },
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
    const { data, error } = await supabase.from('devolucoes').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },
  async create(dev) {
    const { data, error } = await supabase.from('devolucoes').insert(dev).select().single()
    if (error) throw error
    return data
  },
}

// ── Localizações equipe ───────────────────────────────────
export const localizacoesService = {
  async upsert(userId, nome, lat, lng, status, pedidoId) {
    const { error } = await supabase.from('localizacoes_equipe').upsert(
      { usuario_id: userId, usuario_nome: nome, latitude: lat, longitude: lng, status, pedido_atual_id: pedidoId || null, updated_at: new Date().toISOString() },
      { onConflict: 'usuario_id' }
    )
    if (error) throw error
  },
  async list() {
    const cutoff = new Date(Date.now() - 15 * 60000).toISOString()
    const { data, error } = await supabase.from('localizacoes_equipe').select('*').gte('updated_at', cutoff)
    if (error) throw error
    return data || []
  },
}

// ── Consignações ──────────────────────────────────────────
export const consignacoesService = {
  async list() {
    const { data, error } = await supabase.from('consignacoes').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },
  async create(c) {
    const { data, error } = await supabase.from('consignacoes').insert(c).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const { data, error } = await supabase.from('consignacoes').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
}

// ── Acabamentos ───────────────────────────────────────────
export const acabamentosService = {
  async list() {
    const { data, error } = await supabase.from('acabamentos').select('*').order('nome')
    if (error) throw error
    return data || []
  },
  async create(a) {
    const { data, error } = await supabase.from('acabamentos').insert(a).select().single()
    if (error) throw error
    return data
  },
  async update(id, u) {
    const { data, error } = await supabase.from('acabamentos').update(u).eq('id', id).select().single()
    if (error) throw error
    return data
  },
}

// ── Tecidos ───────────────────────────────────────────────
export const tecidosService = {
  async list() {
    const { data, error } = await supabase.from('tecidos').select('*').order('nome')
    if (error) throw error
    return data || []
  },
  async create(t) {
    const { data, error } = await supabase.from('tecidos').insert(t).select().single()
    if (error) throw error
    return data
  },
  async update(id, u) {
    const { data, error } = await supabase.from('tecidos').update(u).eq('id', id).select().single()
    if (error) throw error
    return data
  },
}

// ── Metas ─────────────────────────────────────────────────
export const metasService = {
  async list(mes, ano) {
    let q = supabase.from('metas').select('*')
    if (mes) q = q.eq('mes', mes)
    if (ano) q = q.eq('ano', ano)
    const { data, error } = await q.order('referencia_nome')
    if (error) throw error
    return data || []
  },
  async upsert(meta) {
    const { data, error } = await supabase.from('metas').upsert(meta, { onConflict: 'tipo,referencia_id,mes,ano' }).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const { data, error } = await supabase.from('metas').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
}

// ── Representantes ────────────────────────────────────────
export const representantesService = {
  async list() {
    const { data, error } = await supabase.from('representantes').select('*, fornecedores(nome)').order('nome')
    if (error) throw error
    return data || []
  },
  async create(r) {
    const { data, error } = await supabase.from('representantes').insert(r).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const { data, error } = await supabase.from('representantes').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async remove(id) {
    const { error } = await supabase.from('representantes').delete().eq('id', id)
    if (error) throw error
    return true
  },
}

// ── Audit Log ─────────────────────────────────────────────
export const auditLog = {
  async registrar(acao, tabela, registroId, usuario_id, dadosAnteriores) {
    try {
      await supabase.from('audit_log').insert({ usuario_id, acao, tabela, registro_id: String(registroId), dados_anteriores: dadosAnteriores || null })
    } catch (_) { /* audit_log pode não existir ainda */ }
  },
}
