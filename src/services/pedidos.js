import { supabase } from '../lib/supabase'

// ── Helpers internos ──────────────────────────────────────
async function _timeline(pedidoId, usuario, tipo, descricao, extras = {}) {
  await supabase.from('pedidos_timeline').insert({
    pedido_id: pedidoId,
    usuario_id: usuario?.id || null,
    usuario_nome: usuario?.full_name || usuario?.email || null,
    tipo,
    descricao,
    ...extras,
  })
}

async function _notificarUsuario(usuarioId, tipo, titulo, mensagem, pedidoId, origem) {
  if (!usuarioId) return
  await supabase.from('notificacoes').insert({
    usuario_id: usuarioId,
    tipo,
    titulo,
    mensagem,
    pedido_id: pedidoId || null,
    origem_usuario_id: origem?.id || null,
    origem_usuario_nome: origem?.full_name || null,
  })
}

async function _notificarPerfil(loja, perfis, tipo, titulo, mensagem, pedidoId, origem) {
  if (!loja || !perfis?.length) return
  const all = []
  for (const p of perfis) {
    const { data } = await supabase.from('usuarios').select('id').eq('loja', loja).or(`perfil.eq.${p},role.eq.${p}`)
    if (data) all.push(...data)
  }
  const unique = [...new Map(all.map(u => [u.id, u])).values()]
  if (!unique.length) return
  await supabase.from('notificacoes').insert(unique.map(u => ({
    usuario_id: u.id,
    tipo,
    titulo,
    mensagem,
    pedido_id: pedidoId || null,
    origem_usuario_id: origem?.id || null,
    origem_usuario_nome: origem?.full_name || null,
  })))
}

function _whatsapp(telefone, mensagem) {
  const num = (telefone || '').replace(/\D/g, '')
  if (!num) return
  const base = num.startsWith('55') ? num : `55${num}`
  window.open(`https://wa.me/${base}?text=${encodeURIComponent(mensagem)}`, '_blank')
}

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

  // ── Fluxo de aprovação ────────────────────────────────
  async submeterParaAprovacao(pedidoId, usuario, { loja, numeroPedido }) {
    const { error } = await supabase.from('pedidos').update({ status_fluxo: 'aguardando_gerente' }).eq('id', pedidoId)
    if (error) throw error
    await _timeline(pedidoId, usuario, 'criacao', `Pedido #${numeroPedido} submetido para aprovação do gerente`)
    await _notificarPerfil(loja, ['gerente'], 'pedido_submetido', 'Pedido aguardando sua aprovação', `Pedido #${numeroPedido} aguarda sua aprovação`, pedidoId, usuario)
  },

  async aprovarGerente(pedidoId, usuario, { loja, numeroPedido }) {
    const { error } = await supabase.from('pedidos').update({
      status_fluxo: 'aguardando_financeiro',
      aprovado_gerente_por: usuario.id,
      aprovado_gerente_em: new Date().toISOString(),
    }).eq('id', pedidoId)
    if (error) throw error
    await _timeline(pedidoId, usuario, 'aprovacao', `Aprovado pelo gerente ${usuario.full_name}`)
    await _notificarPerfil(loja, ['assistente_admin', 'diretor', 'admin'], 'pedido_aprovado_gerente', 'Pedido aprovado pelo gerente', `Pedido #${numeroPedido} aguarda aprovação financeira`, pedidoId, usuario)
  },

  async rejeitarGerente(pedidoId, usuario, { motivo, numeroPedido, vendedorId }) {
    const { error } = await supabase.from('pedidos').update({
      status_fluxo: 'rejeitado_gerente',
      rejeitado_gerente_motivo: motivo,
    }).eq('id', pedidoId)
    if (error) throw error
    await _timeline(pedidoId, usuario, 'rejeicao', `Rejeitado pelo gerente: ${motivo}`)
    await _notificarUsuario(vendedorId, 'pedido_rejeitado_gerente', 'Pedido rejeitado pelo gerente', `Pedido #${numeroPedido} foi rejeitado. Motivo: ${motivo}`, pedidoId, usuario)
  },

  async aprovarFinanceiro(pedidoId, usuario, { loja, numeroPedido, telefonesFabrica, linkConfirmacao }) {
    const { error } = await supabase.from('pedidos').update({
      status_fluxo: 'aguardando_fabrica',
      aprovado_financeiro_por: usuario.id,
      aprovado_financeiro_em: new Date().toISOString(),
    }).eq('id', pedidoId)
    if (error) throw error
    await _timeline(pedidoId, usuario, 'aprovacao', `Aprovado financeiramente por ${usuario.full_name}`)
    await _notificarPerfil(loja, ['gerente'], 'pedido_aprovado_financeiro', 'Pedido aprovado pelo financeiro', `Pedido #${numeroPedido} foi encaminhado para a fábrica`, pedidoId, usuario)
    const msg = `Olá! Segue pedido #${numeroPedido} para confirmação. Link: ${linkConfirmacao || ''}`
    for (const tel of telefonesFabrica || []) _whatsapp(tel, msg)
  },

  async rejeitarFinanceiro(pedidoId, usuario, { motivo, numeroPedido, vendedorId, loja }) {
    const { error } = await supabase.from('pedidos').update({
      status_fluxo: 'rejeitado_financeiro',
      rejeitado_financeiro_motivo: motivo,
    }).eq('id', pedidoId)
    if (error) throw error
    await _timeline(pedidoId, usuario, 'rejeicao', `Rejeitado pelo financeiro: ${motivo}`)
    await _notificarUsuario(vendedorId, 'pedido_rejeitado_financeiro', 'Pedido rejeitado pelo financeiro', `Pedido #${numeroPedido} foi rejeitado. Motivo: ${motivo}`, pedidoId, usuario)
    await _notificarPerfil(loja, ['gerente'], 'pedido_rejeitado_financeiro', 'Pedido rejeitado pelo financeiro', `Pedido #${numeroPedido} foi rejeitado. Motivo: ${motivo}`, pedidoId, usuario)
  },

  async corrigirEReenviar(pedidoId, usuario, { statusFluxoAtual, numeroPedido, loja, vendedorId }) {
    const isRejGerente = statusFluxoAtual === 'rejeitado_gerente'
    const novoStatus = isRejGerente ? 'aguardando_gerente' : 'aguardando_financeiro'
    const updates = isRejGerente
      ? { status_fluxo: novoStatus, rejeitado_gerente_motivo: null }
      : { status_fluxo: novoStatus, rejeitado_financeiro_motivo: null }
    const { error } = await supabase.from('pedidos').update(updates).eq('id', pedidoId)
    if (error) throw error
    await _timeline(pedidoId, usuario, 'edicao', `Pedido #${numeroPedido} corrigido e reenviado`)
    if (isRejGerente) {
      await _notificarPerfil(loja, ['gerente'], 'pedido_submetido', 'Pedido corrigido aguarda aprovação', `Pedido #${numeroPedido} foi corrigido e aguarda sua aprovação`, pedidoId, usuario)
    } else {
      await _notificarPerfil(loja, ['assistente_admin', 'diretor', 'admin'], 'pedido_submetido', 'Pedido corrigido aguarda aprovação', `Pedido #${numeroPedido} foi corrigido e aguarda aprovação financeira`, pedidoId, usuario)
    }
  },

  async registrarConfirmacaoFabrica(pedidoId, usuario, { doc, numeroPedido, vendedorId, loja }) {
    const { error } = await supabase.from('pedidos').update({
      status_fluxo: 'aguardando_produto',
      confirmado_fabrica_em: new Date().toISOString(),
      confirmado_fabrica_doc: doc || null,
    }).eq('id', pedidoId)
    if (error) throw error
    await _timeline(pedidoId, usuario, 'confirmacao_fabrica', `Confirmação da fábrica registrada${doc ? ` — doc: ${doc}` : ''}`)
    await _notificarUsuario(vendedorId, 'pedido_confirmado_fabrica', 'Fábrica confirmou o pedido', `Pedido #${numeroPedido} foi confirmado pela fábrica`, pedidoId, usuario)
    await _notificarPerfil(loja, ['gerente'], 'pedido_confirmado_fabrica', 'Fábrica confirmou o pedido', `Pedido #${numeroPedido} foi confirmado e aguarda chegada do produto`, pedidoId, usuario)
  },

  async registrarRecebimentoProduto(pedidoId, usuario, { fotos = [], numeroPedido, loja }) {
    const { error } = await supabase.from('pedidos').update({ status_fluxo: 'aprovado_entrega' }).eq('id', pedidoId)
    if (error) throw error
    await _timeline(pedidoId, usuario, 'recebimento_produto', `Produto recebido — ${fotos.length} foto(s) registrada(s)`, { anexos: fotos })
    await _notificarPerfil(loja, ['gerente_logistica', 'supervisor_logistica'], 'pedido_produto_conferido', 'Produto recebido — agendar entrega', `Pedido #${numeroPedido} com produto recebido e pronto para entrega`, pedidoId, usuario)
  },

  async agendarEntrega(pedidoId, usuario, { dataEntrega, telefoneCliente, nomeCliente, numeroPedido, vendedorId }) {
    const { error } = await supabase.from('pedidos').update({
      status_fluxo: 'aprovado_entrega',
      data_entrega_agendada: dataEntrega,
      agendado_por: usuario.id,
      agendado_em: new Date().toISOString(),
    }).eq('id', pedidoId)
    if (error) throw error
    const dataFmt = new Date(dataEntrega + 'T12:00').toLocaleDateString('pt-BR')
    await _timeline(pedidoId, usuario, 'agendamento', `Entrega agendada para ${dataFmt}`)
    await _notificarUsuario(vendedorId, 'pedido_agendado', 'Entrega agendada', `Pedido #${numeroPedido} agendado para ${dataFmt}`, pedidoId, usuario)
    _whatsapp(telefoneCliente, `Olá ${nomeCliente?.split(' ')[0] || 'cliente'}! Sua entrega do pedido #${numeroPedido} está agendada para o dia ${dataFmt}. Qualquer dúvida estamos à disposição! 😊`)
  },

  async registrarSeparacao(pedidoId, usuario, { fotos = [], numeroPedido, loja }) {
    const { error } = await supabase.from('pedidos').update({ status_fluxo: 'separado' }).eq('id', pedidoId)
    if (error) throw error
    await _timeline(pedidoId, usuario, 'separacao', `Pedido #${numeroPedido} separado — ${fotos.length} foto(s)`, { anexos: fotos })
    await _notificarPerfil(loja, ['gerente_logistica', 'supervisor_logistica'], 'pedido_separado', 'Pedido separado', `Pedido #${numeroPedido} foi separado e está pronto para rota`, pedidoId, usuario)
  },

  async adicionarFollowUp(pedidoId, usuario, { texto, arquivos = [], vendedorId }) {
    const anexos = []
    for (const file of arquivos) {
      const ext = file.name.split('.').pop()
      const path = `${pedidoId}/followup_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('pedidos-anexos').upload(path, file)
      if (!upErr) {
        const { data: pub } = supabase.storage.from('pedidos-anexos').getPublicUrl(path)
        anexos.push(pub.publicUrl)
      }
    }
    const { error } = await supabase.from('pedidos_followup').insert({
      pedido_id: pedidoId,
      usuario_id: usuario.id,
      usuario_nome: usuario.full_name || usuario.email,
      texto,
      anexos,
    })
    if (error) throw error
    await _timeline(pedidoId, usuario, 'follow_up', `Follow-up: ${texto}`, { anexos })
    if (vendedorId && vendedorId !== usuario.id) {
      await _notificarUsuario(vendedorId, 'follow_up_adicionado', 'Novo follow-up no pedido', texto, pedidoId, usuario)
    }
  },

  async adicionarAnexo(pedidoId, usuario, arquivo) {
    const ext = arquivo.name.split('.').pop()
    const path = `${pedidoId}/anexo_${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('pedidos-anexos').upload(path, arquivo)
    if (upErr) throw upErr
    const { data: pub } = supabase.storage.from('pedidos-anexos').getPublicUrl(path)
    const url = pub.publicUrl
    const { data: pedido } = await supabase.from('pedidos').select('anexos').eq('id', pedidoId).single()
    const novosAnexos = [...(pedido?.anexos || []), url]
    const { error } = await supabase.from('pedidos').update({ anexos: novosAnexos }).eq('id', pedidoId)
    if (error) throw error
    await _timeline(pedidoId, usuario, 'anexo', `Anexo adicionado: ${arquivo.name}`, { anexos: [url] })
    return url
  },

  async getTimeline(pedidoId) {
    const { data, error } = await supabase
      .from('pedidos_timeline')
      .select('*')
      .eq('pedido_id', pedidoId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data || []
  },
}
