# Fase 5 — Cobertura de Filtros por empresa_id

## Helper

| Arquivo | O que faz |
|---|---|
| `src/lib/empresaContext.js` | `getEmpresaId()` — lê `empresa_id` do `sessionStorage('versa_perfil')` sem depender de hook React |

---

## src/services/pedidos.js

| Função | READ | CREATE | UPDATE | DELETE |
|---|---|---|---|---|
| `list` | ✅ `.eq('empresa_id', eid)` | — | — | — |
| `listPaged` | ✅ `.eq('empresa_id', eid)` | — | — | — |
| `getById` | ✅ `.eq('empresa_id', eid)` | — | — | — |
| `create` | — | ✅ injeta `empresa_id` em `p_pedido` | — | — |
| `importLote` | — | ✅ injeta `empresa_id` em cada pedido do lote | — | — |
| `update` | — | — | ✅ `.eq('empresa_id', eid)` | — |
| `remove` | — | — | — | ✅ `.eq('empresa_id', eid)` |
| `submeterParaAprovacao` | — | — | ✅ | — |
| `aprovarGerente` | — | — | ✅ | — |
| `rejeitarGerente` | — | — | ✅ | — |
| `aprovarFinanceiro` | — | — | ✅ | — |
| `rejeitarFinanceiro` | — | — | ✅ | — |
| `corrigirEReenviar` | — | — | ✅ | — |
| `registrarConfirmacaoFabrica` | — | — | ✅ | — |
| `registrarRecebimentoProduto` | — | — | ✅ | — |
| `agendarEntrega` | — | — | ✅ | — |
| `registrarSeparacao` | — | — | ✅ | — |
| `listHoje` | ✅ | — | — | — |
| `listAtrasados` | ✅ | — | — | — |
| `listPorFluxo` | ✅ | — | — | — |
| `listParaAgendar` | ✅ | — | — | — |
| `listSeparadosHoje` | ✅ | — | — | — |
| `listMeusPedidos` | ✅ | — | — | — |
| `_notificarPerfil` (interno) | ✅ filtra `usuarios` por `empresa_id` | — | — | — |

---

## src/services/index.js

### usuariosService
| Função | Cobertura |
|---|---|
| `list` | ✅ READ |
| `getById` | ✅ READ |
| `getByEmail` | ⚠️ Sem filtro — usada internamente no auth (intencional) |
| `create` | ✅ CREATE |
| `update` | ✅ UPDATE |
| `listEntregadores` | ✅ READ |

### equipesService
| Função | Cobertura |
|---|---|
| `list` | ✅ READ |
| `create` | ✅ CREATE |
| `update` | ✅ UPDATE |
| `remove` | ✅ DELETE |

### assistenciasService
| Função | Cobertura |
|---|---|
| `list` | ✅ READ |
| `listPaged` | ✅ READ |
| `getById` | ✅ READ |
| `create` | ✅ CREATE |
| `update` | ✅ UPDATE |
| `createItem` | ⚠️ Tabela filha — acesso via `assistencia_id` (intencional) |
| `updateItem` | ⚠️ Tabela filha — intencional |
| `listAbertas` | ✅ READ |

### conferenciasService
| Função | Cobertura |
|---|---|
| `list` | ✅ READ |
| `getById` | ✅ READ |
| `create` | ✅ CREATE |
| `update` | ✅ UPDATE |

### pontoService
| Função | Cobertura |
|---|---|
| `listHoje` | ✅ READ |
| `registrar` | ✅ CREATE |
| `listMes` | ✅ READ |
| `listAllHoje` | ✅ READ |

### assinaturasService
| Função | Cobertura |
|---|---|
| `getByPedido` | ⚠️ Tabela filha de pedidos — acesso via `pedido_id` (intencional) |
| `create` | ⚠️ Tabela filha — intencional |

### clientesService
| Função | Cobertura |
|---|---|
| `list` | ✅ READ |
| `listPaged` | ✅ READ |
| `getById` | ✅ READ |
| `create` | ✅ CREATE |
| `update` | ✅ UPDATE |
| `remove` | ✅ DELETE |

### fornecedoresService
| Função | Cobertura |
|---|---|
| `list` | ✅ READ |
| `listPaged` | ✅ READ |
| `create` | ✅ CREATE |
| `update` | ✅ UPDATE |
| `remove` | ✅ DELETE |

### catalogoService
| Função | Cobertura |
|---|---|
| `list` | ✅ READ |
| `listPaged` | ✅ READ |
| `create` | ✅ CREATE |
| `update` | ✅ UPDATE |
| `remove` | ✅ DELETE |

### configSistemaService
| Função | Cobertura |
|---|---|
| `get` | ✅ READ |
| `save` | ✅ CREATE/UPDATE (injeta `empresa_id`) |
| ⚠️ **Atenção** | Usa `CFG_ID` fixo; a tabela `configuracoes` precisa de migration `ADD COLUMN empresa_id` e mudança de `onConflict` para `empresa_id,chave` |

### vendasService
| Função | Cobertura |
|---|---|
| `list` | ✅ READ |
| `listPaged` | ✅ READ |
| `getById` | ✅ READ |
| `create` | ✅ CREATE |
| `update` | ✅ UPDATE |
| `createItens` | ⚠️ Tabela filha — intencional |
| `listMesDash` | ✅ READ |

### comprasService
| Função | Cobertura |
|---|---|
| `list` | ✅ READ |
| `getById` | ✅ READ |
| `create` | ✅ CREATE |
| `update` | ✅ UPDATE |
| `createItens` | ⚠️ Tabela filha — intencional |
| `listPendentesDash` | ✅ READ |

### estoqueService
| Função | Cobertura |
|---|---|
| `list` | ✅ READ |
| `listPaged` | ✅ READ |
| `listNFEntradas` | ✅ READ |
| `createNFEntrada` | ✅ CREATE |
| `updateNFEntrada` | ✅ UPDATE |
| `createNFItens` | ⚠️ Tabela filha — intencional |
| `listMovimentacoes` | ✅ READ |
| `createMovimentacao` | ✅ CREATE |

### financeiroService
| Função | Cobertura |
|---|---|
| `listReceber` | ✅ READ |
| `listPagar` | ✅ READ |
| `listPagedReceber` | ✅ READ |
| `listPagedPagar` | ✅ READ |
| `createReceber` | ✅ CREATE |
| `createPagar` | ✅ CREATE |
| `updateReceber` | ✅ UPDATE |
| `updatePagar` | ✅ UPDATE |
| `listReceberAberto` | ✅ READ |
| `listPagarProximo` | ✅ READ |

### dpService
| Função | Cobertura |
|---|---|
| `listFuncionarios` | ✅ READ |
| `createFuncionario` | ✅ CREATE |
| `updateFuncionario` | ✅ UPDATE |
| `listFolha` | ✅ READ |
| `upsertFolha` | ✅ CREATE |

### ordensServicoService
| Função | Cobertura |
|---|---|
| `list` | ✅ READ |
| `listPaged` | ✅ READ |
| `getById` | ✅ READ |
| `create` | ✅ CREATE |
| `update` | ✅ UPDATE |

### lojasService
| Função | Cobertura |
|---|---|
| `list` | ✅ READ |
| `create` | ✅ CREATE |
| `update` | ✅ UPDATE |
| `upsertByNome` | ✅ CREATE (injeta `empresa_id` em cada loja do array) |

### decoradoresService
| Função | Cobertura |
|---|---|
| `list` | ✅ READ |
| `create` | ✅ CREATE |
| `update` | ✅ UPDATE |

### crmService
| Função | Cobertura |
|---|---|
| `list` | ✅ READ |
| `listPaged` | ✅ READ |
| `create` | ✅ CREATE |
| `update` | ✅ UPDATE |
| `remove` | ✅ DELETE |

### orcamentosService
| Função | Cobertura |
|---|---|
| `list` | ✅ READ |
| `create` | ✅ CREATE |
| `update` | ✅ UPDATE |

### npsService
| Função | Cobertura |
|---|---|
| `list` | ✅ READ |
| `create` | ✅ CREATE |
| `getByToken` | ⚠️ Página pública — sem filtro (intencional) |
| `respond` | ⚠️ Página pública — sem filtro (intencional) |

### devolucoesService
| Função | Cobertura |
|---|---|
| `list` | ✅ READ |
| `create` | ✅ CREATE |

### localizacoesService
| Função | Cobertura |
|---|---|
| `upsert` | ✅ CREATE |
| `list` | ✅ READ |

### consignacoesService
| Função | Cobertura |
|---|---|
| `list` | ✅ READ |
| `create` | ✅ CREATE |
| `update` | ✅ UPDATE |

### acabamentosService
| Função | Cobertura |
|---|---|
| `list` | ✅ READ |
| `create` | ✅ CREATE |
| `update` | ✅ UPDATE |

### tecidosService
| Função | Cobertura |
|---|---|
| `list` | ✅ READ |
| `create` | ✅ CREATE |
| `update` | ✅ UPDATE |

### metasService
| Função | Cobertura |
|---|---|
| `list` | ✅ READ |
| `upsert` | ✅ CREATE |
| `update` | ✅ UPDATE |

### representantesService
| Função | Cobertura |
|---|---|
| `list` | ✅ READ |
| `create` | ✅ CREATE |
| `update` | ✅ UPDATE |
| `remove` | ✅ DELETE |

### auditLog
| Função | Cobertura |
|---|---|
| `registrar` | ⚠️ Tabela global — sem filtro (intencional) |

### perfisAcessoService
| Função | Cobertura |
|---|---|
| `list` | ⚠️ Configuração global compartilhada — sem filtro (intencional) |
| `getByPerfil` | ⚠️ Configuração global — sem filtro (intencional) |

### pedidosTimelineService / pedidosFollowupService / pedidosAnexosService
| Função | Cobertura |
|---|---|
| Todas | ⚠️ Tabelas filhas de pedidos — acesso via `pedido_id` (intencional) |

### notificacoesService
| Função | Cobertura |
|---|---|
| `criar` | ✅ CREATE |
| `listar` | ✅ READ |
| `contarNaoLidas` | ✅ READ |
| `marcarComoLida` | ⚠️ Update por `id` único — sem risco cross-tenant |
| `marcarTodasComoLidas` | ✅ UPDATE |
| `criarParaPerfil` | ✅ CREATE + filtra `usuarios` por `empresa_id` |

### chatService
| Função | Cobertura |
|---|---|
| `buscarOuCriarConversa` | ✅ CREATE injeta `empresa_id` em `chat_conversas` |
| `listarConversas` | ⚠️ Acesso via `usuario_id` + `conversa_id` — implicitamente scoped |
| `listarMensagens` | ⚠️ Acesso via `conversa_id` |
| `enviarMensagem` | ✅ injeta `empresa_id` em notificações geradas |
| `atualizarUltimaLeitura` | ⚠️ Update via `conversa_id` + `usuario_id` |

### escalasTrabalhoService
| Função | Cobertura |
|---|---|
| `list` | ✅ READ |
| `getEscalaHoje` | ✅ READ |
| `create` | ✅ CREATE |
| `update` | ✅ UPDATE |
| `remove` | ✅ DELETE |

### pontoOcorrenciasService
| Função | Cobertura |
|---|---|
| `list` | ✅ READ |
| `create` | ✅ CREATE |
| `aprovar` | ✅ UPDATE |
| `rejeitar` | ✅ UPDATE |

### cercasVirtuaisService
| Função | Cobertura |
|---|---|
| `list` | ✅ READ |
| `listAll` | ✅ READ |
| `create` | ✅ CREATE |
| `update` | ✅ UPDATE |
| `remove` | ✅ DELETE |

### conciliacaoService
| Função | Cobertura |
|---|---|
| `listExtratos` | ✅ READ |
| `createExtrato` | ✅ CREATE |
| `deleteExtrato` | ✅ DELETE |
| `listTransacoes` | ⚠️ Tabela filha — acesso via `extrato_id` (intencional) |
| `addTransacao` | ⚠️ Tabela filha — intencional |
| `conciliar` | ⚠️ Tabela filha — intencional |
| `deleteTransacao` | ⚠️ Tabela filha — intencional |

---

## src/App.jsx — Calls diretas ao Supabase

| Componente | Tabela | Cobertura |
|---|---|---|
| `Assistencia` (import) | `assistencias` upsert | ✅ injeta `empresa_id` no payload |
| `Roteiro` | `roteiros` select | ✅ `.eq('empresa_id', empresaId)` |
| `Roteiro` | `roteiros` insert | ✅ injeta `empresa_id` |
| `RoteiroDetalhe` | `roteiros` select/update | ✅ |
| `Ponto` | `ponto_ocorrencias` insert (×2) | ✅ injeta `empresa_id` |
| `HistoricoClienteModal` | `contatos_historico` select/insert | ✅ |
| `NovaVenda` | `financeiro_lancamentos` insert (×2) | ✅ injeta `empresa_id` |
| `NovaVenda` | `movimentos_estoque` insert | ✅ injeta `empresa_id` |
| `NovaVenda` | `catalogo_produtos` select/update | ✅ |
| `EstoqueNF` | `movimentos_estoque` insert | ✅ injeta `empresa_id` |
| `useVerificarLembretesPonto` | `escalas_trabalho` select (×2) | ✅ |
| `useVerificarLembretesPonto` | `pontos` select (×2) | ✅ |
| `useVerificarLembretesPonto` | `notificacoes` select/insert | ✅ |
| `useVerificarLembretesPonto` | `ponto_ocorrencias` select | ✅ |
| `SolicitarAssistencia` | `assistencias` insert | ⚠️ Página pública (sem usuário logado — intencional) |
| `ConfirmarCompraPublica` | `pedidos` select | ⚠️ Página pública — acesso por token UUID (intencional) |
| `assistencia_itens` inserts | `assistencia_itens` | ⚠️ Tabela filha de `assistencias` — intencional |
| `assistencia_tarefas` queries | `assistencia_tarefas` | ⚠️ Tabela filha — intencional |
| `assistencia_interacoes` queries | `assistencia_interacoes` | ⚠️ Tabela filha — intencional |
| `roteiro_itens` queries | `roteiro_itens` | ⚠️ Tabela filha — intencional |

---

## Tabelas globais (sem filtro — intencional)

| Tabela | Motivo |
|---|---|
| `empresas` | Tabela mestre global |
| `audit_log` | Log global do sistema |
| `perfis_acesso` | Configuração de perfis global/compartilhada |

---

## Pendências de SQL (migration necessária)

Para que os filtros funcionem em produção, todas as tabelas listadas acima precisam da coluna `empresa_id UUID REFERENCES empresas(id)`. SQL padrão por tabela:

```sql
ALTER TABLE <tabela> ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id);
CREATE INDEX IF NOT EXISTS <tabela>_empresa_id_idx ON <tabela>(empresa_id);
```

Tabelas prioritárias (mais acessadas):
1. `pedidos`
2. `assistencias`
3. `clientes`
4. `vendas`
5. `estoque`
6. `financeiro_receber` / `financeiro_pagar`
7. `usuarios`
8. `notificacoes`
9. `pontos`
10. `catalogo_produtos`

**configSistemaService**: a tabela `configuracoes` usa um ID fixo singleton. Para multi-tenant é necessário remover o CFG_ID fixo e usar `empresa_id` como discriminador principal, com `onConflict: 'empresa_id,chave'`.
