export const _ALL_PAGES = ['dashboard','pedidos','separacao','agenda','assistencia','roteiro','conferencia','equipe','ranking','mapa','rota','ponto','config','cadastros','vendas','compras','estoque','financeiro','financeiro_loja','dp','os','fila','crm','catalogo','nf','nps','relatorios','chat']

export const PROFILE_PAGES = {
  admin:     _ALL_PAGES, gestor: _ALL_PAGES,
  gerente:   ['dashboard','pedidos','agenda','assistencia','conferencia','equipe','ranking','ponto','cadastros','vendas','estoque','os','crm','nps','chat'],
  assistente_admin: ['dashboard','pedidos','agenda','ponto','cadastros','compras','estoque','dp','financeiro_loja','chat'],
  vendedor:  ['dashboard','vendas','cadastros','ponto','crm','ranking','chat'],
  gerente_logistica:    ['dashboard','pedidos','separacao','roteiro','conferencia','assistencia','mapa','rota','ponto','estoque','equipe','ranking','chat'],
  supervisor_logistica: ['dashboard','pedidos','separacao','roteiro','conferencia','assistencia','mapa','rota','ponto','estoque','chat'],
  expedidor: ['dashboard','separacao','conferencia','ponto','chat'],
  entregador:['dashboard','rota','pedidos','ponto','ranking','chat'],
  motorista: ['dashboard','rota','pedidos','ponto','ranking','chat'],
  separador: ['dashboard','separacao','pedidos','ponto','chat'],
  conferente:['dashboard','conferencia','pedidos','ponto','chat'],
  estoque:   ['dashboard','separacao','pedidos','ponto','estoque','chat'],
  tecnico:   ['dashboard','roteiro','assistencia','ponto','os','chat'],
  atendente: ['dashboard','assistencia','pedidos','agenda','ponto','chat'],
  contador:  ['financeiro','dp','relatorios'],
}

export const PROFILE_LABELS = {
  admin:'Administrador', gerente:'Gerente de Loja',
  assistente_admin:'Assistente Adm.', vendedor:'Vendedor',
  gerente_logistica:'Ger. Logística', supervisor_logistica:'Supervisor Log.',
  expedidor:'Expedição', gestor:'Gestor',
  entregador:'Entregador', motorista:'Motorista', separador:'Separador',
  conferente:'Conferente', estoque:'Estoque', tecnico:'Téc. Assistência',
  atendente:'Atendente', contador:'Contador',
}

export const PAGE_LABELS = { dashboard:'Painel',pedidos:'Pedidos',separacao:'Separação',agenda:'Agenda',assistencia:'Assistência',roteiro:'Roteiro',conferencia:'Conferência',equipe:'Equipe',ranking:'Ranking',mapa:'Mapa',rota:'Minha Rota',ponto:'Ponto Eletrônico',config:'Configurações',cadastros:'Cadastros',vendas:'Vendas e PDV',compras:'Compras',estoque:'Estoque',financeiro:'Financeiro',financeiro_loja:'Financeiro',dp:'Departamento Pessoal',os:'Ordens de Serviço',fila:'Fila de Liberação',crm:'CRM',catalogo:'Catálogo Digital',nf:'Nota Fiscal',nps:'NPS',relatorios:'Relatórios',chat:'Chat' }
