# Alterações do fork e roteiro de atualização

Este fork (`FeliipeSantos/openmonetis-v2`, branch `custom`) parte do OpenMonetis original
(`felipegcoutinho/openmonetis-v2`) e acrescenta mudanças próprias. Este documento serve para trazer
novas versões do original sem perder essas mudanças:

- lista **tudo o que o fork alterou** e onde;
- aponta **os arquivos com maior chance de conflito**;
- descreve **o passo a passo do merge**, com cuidados para as migrações de banco;
- traz **o roteiro de testes** que confirma que nada quebrou.

> Mantenha este arquivo atualizado: toda alteração nova do fork ganha uma linha no
> [inventário](#2-inventário-das-alterações) e um item no [roteiro de testes](#6-roteiro-de-testes).

## 1. Organização do fork

| Item | Valor |
| --- | --- |
| Branch de trabalho | `custom` (é dele que a VPS constrói as imagens) |
| Remote `origin` | `https://github.com/FeliipeSantos/openmonetis-v2` |
| Remote `upstream` | `https://github.com/felipegcoutinho/openmonetis-v2`, somente leitura (o push aponta para um endereço inválido de propósito) |
| Base atual | `v0.17.1` do upstream |
| Imagens | `compose.override.yml` constrói `api`, `web` e `migrator` a partir deste código; o serviço opcional `ai` continua com a imagem oficial |
| Atualização da VPS | `sudo /home/ubuntu/openmonetis-update.sh` (backup, atualização do código, build e `up -d`; o `migrator` aplica as migrações) |

Nunca envie nada para `upstream`. Releases e tags (`vX.Y.Z`) também não são criadas no fork.

## 2. Inventário das alterações

Commits do fork desde a `v0.16.0`, agrupados por assunto. Use `git log --oneline v0.16.0..custom`
para a lista completa.

### Infraestrutura

| Alteração | Arquivos principais | Commit |
| --- | --- | --- |
| Imagens construídas a partir do fork e aviso de versão modificada | `compose.override.yml`, `README.md` | `39f1a58` |
| Backups do banco da VPS fora do build do Docker | `.dockerignore` | `c558c5c` |

### Categorias

| Alteração | Arquivos principais | Commit |
| --- | --- | --- |
| Subcategoria exibe o próprio ícone; sem ícone, usa o da categoria principal (lançamentos, orçamentos, tendências e Distribuição financeira) | `categories.repository.ts` (`categoryIconSql`), `transactions.repository.ts`, `budgets.repository.ts`, `financial-distribution.repository.ts`, `category-trends-list.tsx` | `4319e72`, `902ac41`, `43c9633`, `4aa4997` |
| Seletor com 203 ícones agrupados por tipo | `category-icons.tsx`, `category-icon-picker.tsx` | `33a4e91` |
| Tela de Categorias em dois painéis (principais à esquerda, subcategorias à direita), substituindo `categories-table.tsx` | `categories-panels.tsx`, `categories-page.tsx` | `f92e0e5` |
| Gasto do mês e barra de orçamento ao lado de cada categoria principal (recurso da v0.17.1 levado aos painéis) | `categories-panels.tsx` (`CategoryMonthValue`), `categories-page.tsx` | merge da v0.17.1 |
| Gasto do mês também em cada subcategoria; a resposta de `GET /dashboard/category-breakdown` ganhou `subcategories` em cada categoria | `packages/domain/src/dashboard.ts` (`groupCategoryBreakdown`), `packages/validators/src/dashboard.ts`, `categories.presentation.ts` (`getCategoryMonthSummaries`), `categories-panels.tsx` | — |
| Lista padrão de categorias do projeto finance (23 principais, 153 subcategorias), preservando as de sistema (cadeado) | `packages/domain/src/categories.ts`, `categories.service.ts` | `6f5a1d1` |
| Script para sincronizar a lista padrão e preencher ícones vazios em contas existentes | `apps/api/src/scripts/sync-default-categories.ts`, script `db:sync-categories` | `6f5a1d1`, `902ac41` |
| Ordenação por arraste (≡) de categorias e subcategorias, coluna `position` | `sortable-category-list.tsx`, `categories.presentation.ts`, migração `0032` | `7d3811f` |

### Lançamentos

| Alteração | Arquivos principais | Commit |
| --- | --- | --- |
| Campos Categoria e Subcategoria lado a lado | `transaction-basic-fields.tsx`, `subcategory-picker.tsx`, `category-picker.tsx` | `8ef5e24` |
| Sugestões de lançamentos anteriores ao digitar a descrição, preenchendo o formulário (despesa, receita e transferência, inclusive recorrências) | `establishment-input.tsx`, `useTransactionForm.ts`, `GET /transactions/suggestions`, `components/ui/popover.tsx` (prop `anchor`) | `8ef5e24`, `49038df`, `4319e72` |
| Subcategoria obrigatória quando a categoria tem subcategorias; categorias sem subcategorias (ex.: Ajuste de saldo) ficam liberadas, com campo cinza e aviso | `transaction-form.validation.ts`, `categories.presentation.ts` (`getCategorySelectionError`) | `7d3811f` |
| "+ Criar subcategoria" no campo Subcategoria | `subcategory-picker.tsx`, `category-dialog.tsx`, `category-form.tsx` | `87fd5a9` |
| "Ignorar nos orçamentos" em despesas, com círculo cinza e tooltip na lista (também no celular) | `transaction-advanced-fields.tsx`, `transaction-row-description.tsx`, `transactions-mobile-list.tsx`, `transaction-details-content.tsx`, migração `0033` | `9282f31` |

### Orçamentos

| Alteração | Arquivos principais | Commit |
| --- | --- | --- |
| Orçamento por categoria ou subcategoria: a principal soma todas as filhas; a subcategoria conta só ela; totais não contam duas vezes | `packages/domain/src/budgets.ts` (`calculateBudgetOverview`), `budget-dialog.tsx`, `budgets.service.ts` | `7d3811f` |
| Cartão de orçamento com o nome da subcategoria no título e a categoria principal embaixo | `budget-card.tsx`, `budgets.presentation.ts` | `3eae948` |
| Orçamento "Mensal", que se repete nos meses seguintes até ser encerrado | `budgets.service.ts`, `budgets.repository.ts`, `budget-dialog.tsx`, `budgets-page.tsx`, migração `0034` | `af72710` |

### Integrações

| Alteração | Arquivos principais | Commit |
| --- | --- | --- |
| **Conexão com n8n**: seção em Ajustes → Integrações (tokens do tipo `n8n`, endereço e JSON de exemplo), selo "n8n" na Caixa de entrada e data ISO comum para o n8n. O Companion continua igual (lista só os tokens `companion`). Formato do envio em [n8n-integration.md](n8n-integration.md) | `n8n-token-settings.tsx`, `n8n-guide.tsx`, `device-token-settings.tsx`, `device-token-item.tsx`, `device-tokens.presentation.ts`, `device-tokens.service.ts`, `inbox.service.ts` (`parseNotificationTimestamp`), `middlewares/device-auth.ts`, `inbox-item-card.tsx`, `inbox-details-dialog.tsx`, migração `0035` | — |

### Outros

| Alteração | Arquivos principais | Commit |
| --- | --- | --- |
| Widgets da Visão geral sem rolagem horizontal com nomes longos (`grid-cols-1` na coluna de texto de cada linha) | `installment-expenses-widget.tsx`, `budgets-widget.tsx`, `goals-widget.tsx`, `invoices-widget.tsx`, `people-widget.tsx`, `category-breakdown-widget.tsx`, `dashboard-monthly-insight.tsx`, `expense-distribution-list.tsx` | — |
| Logo "Nubank Chroma" renomeada para "Nubank Croma" (só o nome exibido; o arquivo continua `nubank_chroma.png`) | `apps/web/src/lib/logo-catalog.ts` | `6b21c27` |

## 3. Migrações de banco do fork

| Migração | O que faz |
| --- | --- |
| `0032_category_positions` | Coluna `categories.position`, preenchida em ordem alfabética |
| `0033_exclude_from_budget` | Coluna `exclude_from_budget` em `transactions` e `recurring_transaction_rules` |
| `0034_recurring_budgets` | Colunas `budgets.is_recurring` e `recurrence_end_period`, com check constraint |
| `0035_n8n_integration` | Tipo `device_token_kind` e colunas `device_tokens.kind` e `inbox_items.integration_kind` (padrão `companion`) |

Essas migrações **já foram aplicadas na VPS**. Por isso:

- **nunca renomeie, renumere nem altere** `0032`, `0033` e `0034` (nem a `0035`, depois que for
  para a VPS);
- o `drizzle-kit migrate` aplica só as migrações com `when` (no `_journal.json`) **maior** que a
  última aplicada. Uma migração com data anterior seria **ignorada em silêncio**.

### Quando o upstream trouxer migrações novas

Se o upstream criar a própria `0032_...` (ou qualquer número que já usamos), o merge dá conflito
em `packages/db/drizzle/meta/_journal.json`. Para resolver:

1. Mantenha as nossas entradas (`0032`–`0035`) **exatamente** como estão.
2. Coloque as migrações do upstream **depois** das nossas, renumerando os arquivos `.sql`, os
   snapshots (`meta/00NN_snapshot.json`) e os campos `idx`/`tag` do journal (ex.: a `0032_x` do
   upstream vira `0036_x`).
3. Garanta que o `when` de cada migração seja maior que o da anterior. Se o `when` de uma migração
   do upstream for menor que o da nossa `0035` (`1794592451625`), aumente-o; caso contrário, ela não
   roda na VPS.
4. Confira se a migração do upstream não colide com as nossas colunas (`position`,
   `exclude_from_budget`, `is_recurring`, `recurrence_end_period`).
5. Valide:
   - `pnpm db:migrate` no banco local deve aplicar só as migrações novas;
   - `pnpm --filter @openmonetis/db exec drizzle-kit generate --name verificacao` deve responder
     que não há mudanças. Se gerar um arquivo, o snapshot ficou desatualizado: apague o arquivo
     gerado e corrija o snapshot mais recente antes de continuar.

> No Windows, `pnpm db:migrations:check` acusa a `0000_initial_schema.sql` por causa das quebras de
> linha (CRLF). Não é erro no repositório; o conteúdo no Git está correto.

## 4. Pontos de conflito prováveis

Arquivos que o fork alterou bastante. Se uma versão nova do upstream mexer neles, revise com
atenção, mesmo quando o Git juntar sem conflito.

| Arquivo | Por que é sensível | Como resolver |
| --- | --- | --- |
| `categories-table.tsx` | O fork **apagou** este arquivo (substituído por `categories-panels.tsx`) | Manter apagado e levar as novidades do upstream para `categories-panels.tsx` (foi o que aconteceu na v0.17.1) |
| `categories-page.tsx` | Usa os painéis, o arraste e a criação por tipo | Manter os painéis; trazer o resto do upstream |
| `budget-card.tsx` | Título da subcategoria e recorrência mensal | Aceitar o layout do upstream e reaplicar `splitBudgetCategoryName` e `getBudgetRecurrenceLabel` |
| `packages/domain/src/budgets.ts`, `budgets.service.ts`, `budgets.repository.ts` | Cálculo com subcategorias, `excludeFromBudget` e orçamento mensal | Conferir que os testes de orçamento continuam passando |
| `packages/domain/src/categories.ts` | Lista padrão do fork | Manter a lista do fork; trazer só as mudanças de lógica |
| `transaction-basic-fields.tsx`, `useTransactionForm.ts`, `transaction-form.validation.ts` | Subcategoria, sugestões e validação | Manter os dois campos e a validação |
| `transactions.repository.ts` | Sugestões, `categoryIconSql`, `excludeFromBudget` | Conferir as consultas de sugestão e de ícone |
| `packages/db/src/schema.ts`, `drizzle/meta/_journal.json` | Colunas e migrações do fork | Ver a [seção 3](#3-migrações-de-banco-do-fork) |
| `packages/domain/src/dashboard.ts`, `packages/validators/src/dashboard.ts` | Campo `subcategories` no detalhamento por categoria | Manter o campo e o teste `category breakdown totals each subcategory` |
| `device-token-settings.tsx`, `device-token-item.tsx`, `device-tokens.service.ts`, `packages/validators/src/device-tokens.ts` | Tipo do token (`kind`) e filtro da lista do Companion | Manter `kind` na criação, renovação e saída; a seção do Companion continua filtrando por `companion` |
| `inbox.service.ts`, `routes/inbox.ts`, `packages/validators/src/inbox.ts`, `inbox-item-card.tsx` | Campo `integrationKind` na captura e no selo | Manter o campo; se o upstream mudar o contrato do Companion, levar `integrationKind` junto |
| `components/ui/popover.tsx` | Prop `anchor` usada pelas sugestões | Manter a prop |
| `CHANGELOG.md` | Os dois lados escrevem em `Unreleased` | Manter as entradas do fork em `Unreleased` e as versões do upstream abaixo |
| `*.presentation.test.ts` | Os dois lados acrescentam testes | Manter os dois conjuntos |

## 5. Passo a passo para atualizar

Exemplo para uma versão `vX.Y.Z` do upstream.

1. **Deixe o `custom` limpo e enviado.** `git status` não deve listar nada além de
   `apps/web/src/routeTree.gen.ts`, que é gerado e nunca é commitado.
2. **Busque a versão nova:**

   ```bash
   git fetch upstream --tags
   ```

3. **Veja o que vem e onde vai cruzar com o fork:**

   ```bash
   git log --oneline <base atual>..vX.Y.Z
   git diff --name-status <base atual> vX.Y.Z -- packages/db/drizzle
   comm -12 <(git diff --name-only <base atual> vX.Y.Z | sort) <(git diff --name-only <base atual> custom | sort)
   ```

   O segundo comando mostra se há migrações novas; o terceiro, os arquivos alterados pelos dois
   lados.
4. **Revise a segurança do que vem**, antes do merge:

   ```bash
   git diff <base atual> vX.Y.Z -- package.json "apps/*/package.json" "packages/*/package.json" pnpm-workspace.yaml .npmrc Dockerfile compose.yml .github .vscode
   git diff <base atual> vX.Y.Z -- apps packages scripts | grep -E '^\+.*(https?://|fetch\(|child_process|spawn|exec\(|eval\(|new Function)'
   ```

   O primeiro comando mostra o que muda em dependências, permissões de build, Docker, CI e
   configuração do editor; o segundo, linhas novas que acessam a internet ou executam programas.
   Confira:

   - **Dependências novas:** nome conhecido, sem erro de digitação parecido com um pacote famoso
     (typosquatting) e com uso amplo. Versões trocadas sem motivo no `pnpm-lock.yaml` merecem
     atenção.
   - **`allowBuilds`** no `pnpm-workspace.yaml`: hoje só `esbuild`, `lightningcss` e
     `unrs-resolver` podem rodar scripts na instalação. Um pacote novo nessa lista ganha permissão
     de executar código ao instalar.
   - **Scripts de instalação:** nenhum `preinstall`, `postinstall` ou `prepare` nos
     `package.json`.
   - **`Dockerfile` e `compose.yml`:** downloads (`ADD`, `curl`, `wget`) só de origens conhecidas
     e com `--checksum`; nenhuma porta nova publicada para fora.
   - **Endereços externos:** cada `https://` novo no código tem motivo claro. Hoje são apenas
     GitHub (verificação de versão), logo.dev e Resend (opcionais, só com chave configurada),
     Google Fonts e as fontes das CLIs do serviço de IA.
   - **`.vscode` e `.github`:** nenhuma tarefa que rode sozinha ao abrir a pasta
     (`runOn: folderOpen`) e nenhum workflow que envie segredos para fora.

   Se algo não tiver explicação no CHANGELOG da versão, não faça o merge antes de entender.
5. **Faça o merge em um branch separado**, nunca direto no `custom`:

   ```bash
   git switch -c merge/vX.Y.Z custom
   git merge --no-ff --no-commit vX.Y.Z
   ```

6. **Resolva os conflitos** com a [seção 4](#4-pontos-de-conflito-prováveis) e, se houver
   migrações, com a [seção 3](#3-migrações-de-banco-do-fork). A regra geral: o fork mantém o
   comportamento que criou, e as novidades do upstream são levadas para dentro dele.
7. **Rode a validação automática** (seção 6.1). Só faça o commit do merge com tudo passando.
8. **Rode o roteiro manual** (seção 6.2) no localhost.
9. **Traga para o `custom` e envie:**

   ```bash
   git switch custom
   git merge --ff-only merge/vX.Y.Z
   git push origin custom
   ```

10. **Atualize a VPS** (seção 7) e repita os testes principais lá.
11. **Atualize este documento:** a base atual na seção 1 e uma linha no
    [histórico](#8-histórico-de-atualizações).

## 6. Roteiro de testes

### 6.1 Validação automática

No Windows, defina antes `$env:pnpm_config_script_shell = 'C:\Program Files\Git\bin\bash.exe'` e
use `npx -y pnpm@11.25.0` no lugar de `pnpm`.

| Verificação | Comando | Esperado |
| --- | --- | --- |
| Dependências | `pnpm install` | Sem erros |
| Tipos | `pnpm -r typecheck` | Todos os pacotes `Done` |
| Testes unitários | `pnpm test` | `fail 0` |
| Formatação | `pnpm exec biome check <arquivos alterados>` | Sem erros |
| Migrações | `pnpm db:migrate` | Aplica só as migrações novas |

Os testes do fork que precisam continuar passando:

- `packages/domain/src/budgets.test.ts`: orçamento por subcategoria, sem dupla contagem e mensal;
- `packages/domain/src/categories.test.ts`: lista padrão, sincronização e ordem;
- `apps/api/src/services/budgets.service.test.ts` e `categories.service.test.ts`;
- `apps/web/src/features/categories/categories.presentation.test.ts`: subcategoria obrigatória,
  arraste e valores do mês;
- `apps/web/src/features/budgets/budgets.presentation.test.ts`;
- `apps/web/src/features/transactions/components/transaction-form.validation.test.ts`.

> Os testes de `apps/ai` dependem de `sh` e `tar` e falham no Windows; rode-os só no Linux.

### 6.2 Roteiro manual

Use uma **conta de teste local** (criada em **Criar conta** no localhost), para não misturar com os
seus dados. Uma conta nova já confere a lista padrão de categorias.

**Massa de teste sugerida (novembro):**

- conta bancária "Conta Teste";
- despesa "Mercado Teste", R$ 150, Alimentação › Supermercado, Pix, paga;
- despesa "iFood Teste", R$ 80, Alimentação › Delivery, Pix, paga;
- despesa "Jantar fora do orçamento", R$ 60, Alimentação › Delivery, com **Ignorar nos orçamentos**;
- receita "Salário Teste", R$ 5.000, Salário e Trabalho › Salário;
- orçamento de Alimentação (categoria principal), R$ 500, **Mensal**;
- orçamento de Alimentação › Supermercado, R$ 100, só este mês.

| # | Tela | Ação | Resultado esperado |
| --- | --- | --- | --- |
| 1 | Categorias | Abrir com a conta nova | 148 categorias de despesa e 34 de receita; Ajuste de saldo e Ajustes de fatura com cadeado |
| 2 | Categorias | Clicar em uma categoria principal | Subcategorias dela no painel da direita |
| 3 | Categorias | Arrastar pelo ≡ | Nova ordem continua após recarregar a página |
| 4 | Categorias | Ver a coluna "Gasto em <mês>" | Alimentação: R$ 230,00 de R$ 500,00 com barra; demais: "Sem movimento" |
| 4a | Categorias | Abrir as subcategorias de Alimentação | Supermercado: R$ 150,00 de R$ 100,00 com barra; Delivery: R$ 140,00; demais: "Sem movimento" |
| 5 | Categorias | Editar o ícone de uma subcategoria | Ícone próprio aparece nos lançamentos; sem ícone, aparece o da principal |
| 6 | Categorias | Menu ⋯ de uma categoria | Sem "Adicionar subcategoria" duplicado |
| 7 | Lançamentos | Nova despesa | Categoria e Subcategoria lado a lado |
| 8 | Lançamentos | Escolher Alimentação e salvar sem subcategoria | Bloqueia com "Selecione uma subcategoria." |
| 9 | Lançamentos | Escolher Ajuste de saldo | Subcategoria cinza com aviso; salvar é permitido |
| 10 | Lançamentos | Abrir o campo Subcategoria | Opção "+ Criar subcategoria" (oculta em categorias de sistema) |
| 11 | Lançamentos | Digitar "Merc" na descrição | Sugestões só depois de digitar, abaixo do campo |
| 12 | Lançamentos | Escolher a sugestão | Preenche valor, categoria, subcategoria, forma de pagamento e conta |
| 13 | Lançamentos | Nova receita e nova transferência | Sugestões também aparecem |
| 14 | Lançamentos | Ver a lista | Círculo cinza com tooltip "Fora do orçamento" em "Jantar fora do orçamento" (também no celular) |
| 15 | Orçamentos | Novembro | Alimentação 230/500 (sem os R$ 60); Supermercado 150/100 "Limite excedido"; resumo com R$ 230 lançado e R$ 50 acima do limite |
| 16 | Orçamentos | Cartões | Supermercado com "Alimentação · Só este mês"; Alimentação com "Mensal"; nomes longos não cortam o selo |
| 17 | Orçamentos | Dezembro | Alimentação repetida (0/500, desde novembro); Supermercado não aparece |
| 18 | Orçamentos | Editar o orçamento mensal em dezembro | Cria um orçamento a partir de dezembro, sem alterar novembro |
| 19 | Relatórios › Distribuição financeira | Ver as categorias | Valores batem com os lançamentos; subcategorias com ícone |
| 20 | Contas / Cartões | Seletor de logos, buscar "croma" | Aparece "Nubank Croma" |
| 21 | Visão geral | Abrir | Carrega sem erros e mostra o aviso da versão nova |
| 21a | Visão geral | Despesa parcelada com nome bem longo | Widget Despesas parceladas corta o nome com reticências, sem barra de rolagem horizontal |
| 21b | Ajustes › Integrações | Abrir a aba | Companion lista só os aparelhos Android; seção Conexão com n8n aparece logo abaixo |
| 21c | Ajustes › Integrações | Criar token do n8n | Token exibido uma vez, com endereço e JSON de exemplo; o token aparece só na lista do n8n |
| 21d | Caixa de entrada | Enviar o JSON de exemplo com o token do n8n (`POST /api/inbox`) e outro item com o token do Companion | Item do n8n com selo "n8n" e "Capturado por n8n" nos detalhes; o do Companion sem selo; os dois viram lançamento ao confirmar |
| 21e | Companion | Notificação real no Android | Continua chegando na Caixa de entrada |
| 22 | Novidades do upstream | Abrir as telas da versão nova | Carregam sem erros no console |

Para os números da massa de teste, também é possível conferir pela API (logado):
`GET /budgets?period=2026-11` e `GET /dashboard/category-breakdown?period=2026-11`.

## 7. Implantar na VPS

1. Envie o `custom` (passo 9 da seção 5).
2. Na VPS, rode `sudo /home/ubuntu/openmonetis-update.sh`. Ele faz backup do banco antes de
   atualizar.
3. Confira os serviços com `cd ~/openmonetis && sudo docker compose ps`: `api` e `web` devem estar
   `healthy`, e o `migrator`, `Exited` (código 0).
4. Se a versão trouxer categorias padrão novas ou ícones novos, sincronize as contas:

   ```bash
   cd ~/openmonetis && sudo docker compose exec api node --import tsx src/scripts/sync-default-categories.ts --email=<e-mail>
   ```

5. Repita na VPS os itens 4, 8, 11, 14 e 15 do roteiro manual.

**Se algo der errado:** volte o código para o commit anterior do `custom` e rode o script de
atualização de novo. Se a versão tinha migrações novas, restaure também o backup gerado pelo script
em `~/openmonetis/backups`, porque o código antigo pode não funcionar com o banco novo.

## 8. Histórico de atualizações

| Data | De → para | Conflitos | Decisões |
| --- | --- | --- | --- |
| 2026-11-12 | v0.16.0 → v0.17.1 | `CHANGELOG.md`, `budget-card.tsx`, `categories-page.tsx`, `categories-table.tsx` (apagada no fork), `categories.presentation.test.ts`, `transactions.presentation.test.ts` | Sem migrações novas no upstream. O gasto do mês da tabela antiga foi levado aos dois painéis. O cartão de orçamento adotou o novo layout, mantendo o título da subcategoria e a recorrência. Testes: typecheck, 843 testes unitários e roteiro manual sem falhas. Revisão de segurança (feita depois, em 2026-11-13): só mudanças de versão nos `package.json`, avatares SVG, URLs de teste e um link para o GitHub original; nada suspeito. |
