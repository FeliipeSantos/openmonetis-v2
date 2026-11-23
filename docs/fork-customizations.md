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
| Base atual | `v0.20.0` do upstream (sem os orçamentos recorrentes da v0.18.0; ver seção 8) |
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
| No celular, sugestões de lançamentos anteriores aparecem abaixo da descrição enquanto se digita (até 5) | `establishment-input.tsx` (`inlineMatches`) | — |
| Campos Categoria e Subcategoria lado a lado | `transaction-basic-fields.tsx`, `subcategory-picker.tsx`, `category-picker.tsx` | `8ef5e24` |
| Sugestões de lançamentos anteriores ao digitar a descrição, preenchendo o formulário (despesa, receita e transferência, inclusive recorrências) | `establishment-input.tsx`, `useTransactionForm.ts`, `GET /transactions/suggestions`, `components/ui/popover.tsx` (prop `anchor`) | `8ef5e24`, `49038df`, `4319e72` |
| Subcategoria obrigatória quando a categoria tem subcategorias; categorias sem subcategorias (ex.: Ajuste de saldo) ficam liberadas, com campo cinza e aviso | `transaction-form.validation.ts`, `categories.presentation.ts` (`getCategorySelectionError`) | `7d3811f` |
| "+ Criar subcategoria" no campo Subcategoria | `subcategory-picker.tsx`, `category-dialog.tsx`, `category-form.tsx` | `87fd5a9` |
| "Ignorar nos orçamentos" em despesas, com círculo cinza e tooltip na lista (também no celular) | `transaction-advanced-fields.tsx`, `transaction-row-description.tsx`, `transactions-mobile-list.tsx`, `transaction-details-content.tsx`, migração `0033` | `9282f31` |
| Campo opcional "Horário" ao lado da data (despesa, receita e transferência; recorrência não tem), exibido nos detalhes e preenchido pela Caixa de entrada | `transaction-basic-fields.tsx`, `transaction-form.validation.ts`, `transactions.service.ts` (`purchaseTime`), `inbox-process-defaults.ts`, migração `0035` | — |
| Fatura do cartão agrupada por dia, com Saídas/Entradas e "Fatura" acumulada no fim de cada dia; horário visível em cada linha | `summarizeTransactionsByDay` (domain), `dailySummaries` em `transactions.service.ts`, `transaction-day-summary.tsx`, `card-invoices-page.tsx` (`daySummary`) | — |
| Em Lançamentos, compras no cartão viram uma linha por fatura (soma do mês, link para a fatura); filtro de cartão ou "Cartão de crédito" mostra as compras | `summarizeCardInvoiceTotals` (domain), `collapseCardPurchases`/`cardInvoices` em `transactions.service.ts`, `transaction-card-invoice-total.tsx`, `transactions-container.tsx` | — |
| Botão Exportar na fatura do cartão e no extrato da conta, ao lado de "Selecionar" | `card-invoices-page.tsx`, `account-statement-page.tsx` (`export` no `scope`) | — |
| Rodapé de Lançamentos conta compras de fatura paga em Efetivadas, e o valor já pago de uma fatura em aberto (pagamento antecipado/parcial) também | `summarizeListingTotals` (`invoicePaid`, `invoicePaidAmounts`), `transactions.service.ts`, `app.ts` (`paidAmount`) | `287b025` |
| Lançamento novo numa fatura já paga abre o aviso "Essa fatura já está paga": salvar como paga (paga o valor novo pela última conta usada) ou como pendente (reabre a fatura, o pagamento vira parcial); importação e cópia reabrem direto; estorno continua bloqueado | domain `invoices.ts` (`paidInvoiceChargeActions`, `buildInvoiceRemainderAllocations`, `selectInvoicePeriodsReopenedByCharge`), `reopenPaidInvoicesForUser`, `invoicesService.payRemainder`, `transactions.service.ts` (`paidInvoiceAction`), `transaction-paid-invoice-dialog.tsx`, `useTransactionFormSubmission.ts` | — |
| Linha do cartão em Lançamentos mostra "Fatura" com o valor que falta pagar quando há pagamento parcial | `transaction-card-invoice-total.tsx` (`CardInvoiceAmount`) | — |
| Fatura mostra o total, "Sua parte" e "Outras pessoas" (cabeçalho do cartão e modal) | `getInvoiceOwnShare` (`invoice-own-share.ts`), `card-invoices-page.tsx`, `transaction-card-invoice-statement-dialog.tsx` | — |
| Clicar no cartão em Lançamentos abre o extrato da fatura num modal (linha do tempo por dia, Saídas/Fatura, troca de mês, fechamento e vencimento) | `transaction-card-invoice-statement-dialog.tsx`, `transaction-card-invoice-total.tsx` | — |
| Busca em Lançamentos mostra as compras do cartão uma a uma, sem a linha consolidada da fatura | `collapseCardPurchases` (`!query.q`) em `transactions.service.ts` | — |
| Busca, filtros e paginação não levam a tela de volta ao topo (`resetScroll: false`; resultados com altura mínima de uma tela durante a busca) | `routes/transactions.tsx`, `routes/cards_.$cardId.tsx`, `routes/accounts_.$accountId.tsx`, `routes/people_.$personId.tsx`, `transactions-screen.tsx` | — |

### Orçamentos

| Alteração | Arquivos principais | Commit |
| --- | --- | --- |
| Orçamento por categoria ou subcategoria: a principal soma todas as filhas; a subcategoria conta só ela; totais não contam duas vezes | `packages/domain/src/budgets.ts` (`calculateBudgetOverview`), `budget-dialog.tsx`, `budgets.service.ts` | `7d3811f` |
| Cartão de orçamento com o nome da subcategoria no título e a categoria principal embaixo | `budget-card.tsx`, `budgets.presentation.ts` | `3eae948` |
| Orçamento "Mensal", que se repete nos meses seguintes até ser encerrado | `budgets.service.ts`, `budgets.repository.ts`, `budget-dialog.tsx`, `budgets-page.tsx`, migração `0034` | `af72710` |

### Outros

| Alteração | Arquivos principais | Commit |
| --- | --- | --- |
| Parte da pessoa paga na fatura conta como repasse recebido (lida das alocações do pagamento; o upstream deixou de criar o repasse em `3f3b5bb`) | `person-settlements.repository.ts` (`listSettlementsForPerson`) | — |
| Acertos: lançamentos do mês um a um (descrição, parcela, valor) com Recebido/Falta/Efetivar; Registrar repasse preenchido com o que falta receber; o repasse vale para o mês aberto (coluna `period`) | `allocatePersonSettlementItems` (domain), `person-settlements.service.ts` (`items`), `person-settlements.repository.ts`, `person-settlement-item-row.tsx`, `person-settlements-card.tsx`, `person-settlement-dialog.tsx`, migração `0037` | — |
| Compromissos futuros: parcelamento antecipado termina no mês para onde as parcelas foram (não no término original com R$ 0,00) | `packages/domain/src/commitments.ts` (`endingSeries`) | — |
| Compromissos/Comprometimento do mês contam a parcela do mês das receitas parceladas, batendo com "Suas receitas" | `commitments.repository.ts` (`listSingleEntriesForUser`), `docs/commitments.md` | — |
| Widgets da Visão geral sem rolagem horizontal com nomes longos (`grid-cols-1` na coluna de texto de cada linha) | `installment-expenses-widget.tsx`, `budgets-widget.tsx`, `goals-widget.tsx`, `invoices-widget.tsx`, `people-widget.tsx`, `category-breakdown-widget.tsx`, `dashboard-monthly-insight.tsx`, `expense-distribution-list.tsx` | — |
| Logo "Nubank Chroma" renomeada para "Nubank Croma" (só o nome exibido; o arquivo continua `nubank_chroma.png`) | `apps/web/src/lib/logo-catalog.ts` | `6b21c27` |

## 3. Migrações de banco do fork

| Migração | O que faz |
| --- | --- |
| `0032_category_positions` | Coluna `categories.position`, preenchida em ordem alfabética |
| `0033_exclude_from_budget` | Coluna `exclude_from_budget` em `transactions` e `recurring_transaction_rules` |
| `0034_recurring_budgets` | Colunas `budgets.is_recurring` e `recurrence_end_period`, com check constraint |
| `0035_transaction_purchase_time` | Coluna opcional `purchase_time` (`time`) em `transactions` |
| `0036_goal_contributions` | Do upstream (era a `0032` da v0.18.0, renumerada): tabela `goal_contributions` e o saldo atual das metas manuais como primeiro movimento |
| `0037_person_settlement_period` | Coluna opcional `period` em `person_settlements` (mês que o repasse acerta); nula nos repasses antigos |
| `0038_note_attachments` | Do upstream (era a `0034` da v0.19.0, renumerada): tabela `note_attachments` |
| `0039_user_palettes` | Do upstream (era a `0035` da v0.19.0, renumerada): colunas `light_palette` e `dark_palette` em `user_preferences` |

Essas migrações **já foram aplicadas na VPS** (da `0035` à `0039` entram no próximo deploy). Por isso:

- **nunca renomeie, renumere nem altere** `0032` a `0039`;
- o `drizzle-kit migrate` aplica só as migrações com `when` (no `_journal.json`) **maior** que a
  última aplicada. Uma migração com data anterior seria **ignorada em silêncio**.

### Quando o upstream trouxer migrações novas

Se o upstream criar a própria `0032_...` (ou qualquer número que já usamos), o merge dá conflito
em `packages/db/drizzle/meta/_journal.json`. Para resolver:

1. Mantenha as nossas entradas (`0032`–`0034`) **exatamente** como estão.
2. Coloque as migrações do upstream **depois** das nossas, renumerando os arquivos `.sql`, os
   snapshots (`meta/00NN_snapshot.json`) e os campos `idx`/`tag` do journal (ex.: a `0032_x` do
   upstream vira `0035_x`).
3. Garanta que o `when` de cada migração seja maior que o da anterior. Se o `when` de uma migração
   do upstream for menor que o da nossa `0034` (`1794441122031`), aumente-o; caso contrário, ela não
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
| Tudo em `budgets` (domain, validators, service, repository, rotas e telas) | Desde a v0.18.0 o upstream tem orçamentos recorrentes próprios (`budget_rules`), que o fork não adotou | Manter os arquivos do `custom` (`git checkout custom -- <arquivo>`, inclusive nos que juntaram sem conflito) e não trazer `budget_rules` para o schema |
| `budget-card.tsx` | Título da subcategoria e recorrência mensal | Aceitar o layout do upstream e reaplicar `splitBudgetCategoryName` e `getBudgetRecurrenceLabel` |
| `packages/domain/src/budgets.ts`, `budgets.service.ts`, `budgets.repository.ts` | Cálculo com subcategorias, `excludeFromBudget` e orçamento mensal | Conferir que os testes de orçamento continuam passando |
| `packages/domain/src/categories.ts` | Lista padrão do fork | Manter a lista do fork; trazer só as mudanças de lógica |
| `transaction-basic-fields.tsx`, `useTransactionForm.ts`, `transaction-form.validation.ts` | Subcategoria, sugestões e validação | Manter os dois campos e a validação |
| `transactions.repository.ts` | Sugestões, `categoryIconSql`, `excludeFromBudget` | Conferir as consultas de sugestão e de ícone |
| `packages/db/src/schema.ts`, `drizzle/meta/_journal.json` | Colunas e migrações do fork | Ver a [seção 3](#3-migrações-de-banco-do-fork) |
| `packages/domain/src/dashboard.ts`, `packages/validators/src/dashboard.ts` | Campo `subcategories` no detalhamento por categoria | Manter o campo e o teste `category breakdown totals each subcategory` |
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
| Consultas do fork no banco | `pnpm test:fork:integration` (Docker com o PostgreSQL ligado) | `fail 0` |

**CI no GitHub:** o workflow `CI` roda em todo push no `custom` (além da `main` e de pull
requests): formatação, tipos, testes unitários, build, todas as suítes de integração com
PostgreSQL (inclusive `test:fork:integration`) e os testes no navegador. Depois de enviar um merge,
confira a aba **Actions** do fork antes de atualizar a VPS.

Os testes do fork que precisam continuar passando:

- `packages/domain/src/budgets.test.ts`: orçamento por subcategoria, sem dupla contagem e mensal;
- `packages/domain/src/categories.test.ts`: lista padrão, sincronização e ordem;
- `apps/api/src/services/budgets.service.test.ts` e `categories.service.test.ts`;
- `apps/web/src/features/categories/categories.presentation.test.ts`: subcategoria obrigatória,
  arraste e valores do mês;
- `apps/web/src/features/budgets/budgets.presentation.test.ts`;
- `apps/web/src/features/transactions/components/transaction-form.validation.test.ts`;
- `apps/api/src/services/transactions.service.test.ts`: consolidado do cartão, rodapé
  Efetivadas/Pendentes (fatura paga e pagamento antecipado), busca só com os itens, horário,
  parcela por valor da parcela e lançamento em fatura já paga (aviso, pagar ou reabrir);
- `packages/domain/src/transactions.test.ts`, `invoices.test.ts`, `commitments.test.ts` e
  `person-settlements.test.ts`: resumo por dia, totais, reabertura de fatura, parcelamento
  antecipado e repasses cobrindo os lançamentos mais antigos;
- `apps/api/src/services/invoices.service.test.ts` e `person-settlements.service.test.ts`: pagar o
  restante pela última conta, repasse no mês da tela e lista de lançamentos dos Acertos;
- `apps/api/src/fork-customizations.integration.test.ts` (`pnpm test:fork:integration`): receitas
  parceladas no Comprometimento e a parte da pessoa paga na fatura contando como repasse.

> Os testes de integração do upstream usam caminhos no formato do Linux e falham no Windows com
> espaços no caminho; eles rodam no CI. O `test:fork:integration` funciona nos dois.

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
| 13a | Lançamentos | Nova despesa com horário 18:05; abrir os detalhes | "Data da compra" mostra a data "às 18:05"; em Recorrente o campo Horário some |
| 13b | Cartões | Abrir a fatura de um cartão com compras em dias diferentes | Lançamentos agrupados por dia ("23/10/2026 • sexta-feira"), do mais recente ao mais antigo, e cada dia termina com Saídas e Fatura acumulada |
| 13c | Lançamentos | Abrir Lançamentos com compras no cartão; depois filtrar por esse cartão | Uma linha com o nome do cartão com a soma e a quantidade de lançamentos, levando à fatura; com o filtro, as compras aparecem uma a uma |
| 14 | Lançamentos | Ver a lista | Círculo cinza com tooltip "Fora do orçamento" em "Jantar fora do orçamento" (também no celular) |
| 15 | Orçamentos | Novembro | Alimentação 230/500 (sem os R$ 60); Supermercado 150/100 "Limite excedido"; resumo com R$ 230 lançado e R$ 50 acima do limite |
| 16 | Orçamentos | Cartões | Supermercado com "Alimentação · Só este mês"; Alimentação com "Mensal"; nomes longos não cortam o selo |
| 17 | Orçamentos | Dezembro | Alimentação repetida (0/500, desde novembro); Supermercado não aparece |
| 18 | Orçamentos | Editar o orçamento mensal em dezembro | Cria um orçamento a partir de dezembro, sem alterar novembro |
| 19 | Relatórios › Distribuição financeira | Ver as categorias | Valores batem com os lançamentos; subcategorias com ícone |
| 20 | Contas / Cartões | Seletor de logos, buscar "croma" | Aparece "Nubank Croma" |
| 21 | Visão geral | Abrir | Carrega sem erros e mostra o aviso da versão nova |
| 21a | Visão geral | Despesa parcelada com nome bem longo | Widget Despesas parceladas corta o nome com reticências, sem barra de rolagem horizontal |
| 22 | Novidades do upstream | Abrir as telas da versão nova | Carregam sem erros no console |
| 23 | Lançamentos | Abas Despesas, Receitas e Transferências | O botão de criar fica na linha das abas e segue a aba aberta |
| 24 | Lançamentos | Clicar no nome de um cartão consolidado | Abre o modal da fatura: linha do tempo por dia, Saídas/Fatura, troca de mês, Fecha/Vence, "Sua parte / Outras pessoas" e avatar nas compras de outra pessoa |
| 25 | Lançamentos | Rolar e digitar na busca | A tela não volta ao topo; só as compras que batem aparecem, sem a linha do cartão |
| 26 | Lançamentos | Fatura com pagamento antecipado | Linha do cartão mostra "Fatura" com o restante; rodapé põe o valor pago em Efetivadas |
| 27 | Lançamentos | Nova despesa no cartão numa fatura já paga | Aviso "Essa fatura já está paga" com Salvar como paga/pendente |
| 28 | Lançamentos (celular) | Digitar a descrição | Sugestões aparecem logo abaixo do campo |
| 29 | Fatura do cartão / Extrato da conta | Ver os botões da lista | "Exportar" ao lado de "Selecionar" |
| 30 | Pessoas › painel de uma pessoa externa | Mês com despesas dela | Acertos lista cada lançamento (categoria, forma, conta/cartão, parcela) com Efetivar; a parte paga na fatura aparece como Recebido |
| 31 | Relatórios › Compromissos futuros | Mês com receita parcelada e parcelamento antecipado | Receita prevista inclui a parcela; o antecipado termina no mês para onde as parcelas foram |
| 32 | Visão geral | Setas de "Suas receitas"/"Suas despesas" | Abrem a aba certa de Lançamentos sem filtrar por pessoa |

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
| 2026-11-18 | v0.17.1 → v0.18.0 | `CHANGELOG.md`, `apps/web/package.json`, `pnpm-lock.yaml`, `_journal.json` e snapshots `0032`/`0033`, `categories.repository.ts` e todos os arquivos de orçamento | **Orçamentos recorrentes do upstream não entraram**: o fork mantém o próprio orçamento "Mensal" (`0034`), por subcategoria e com Ignorar nos orçamentos; todos os arquivos de `budgets` ficaram iguais ao `custom`, e a tabela `budget_rules` (migração `0033_budget_rules` do upstream) foi retirada do schema e das migrações. A `0032_goal_contributions` do upstream virou `0036`, com `when` depois da `0035`. Entraram calendário, busca Ctrl K, aportes nas metas, comparação da fatura por pessoa, filtros e formulários padronizados e dependências novas. Revisão de segurança: só versões novas de dependências já usadas, sem pacotes, scripts de instalação ou endereços externos novos. |
| 2026-11-22 | v0.18.0 → v0.19.0 | `CHANGELOG.md`, `transactions.service.ts` (listagem), `routes/transactions.ts`, `transactions-mobile-list.tsx`, `transaction-basic-fields.tsx`, `transaction-amount-field.tsx`, `establishment-input.tsx`, `dashboard-metrics.tsx`, `invoices-widget.tsx`, `categories-page.tsx`, `categories-table.tsx` (apagada no fork), `budget-card.tsx`, `copy-budgets-dialog.tsx`, snapshots `0034`/`0035`, `transactions.test.ts` | A transferência como lançamento único (`mergeTransferLegs`) foi aplicada depois de separar as compras do cartão consolidadas. A lista do celular usa o novo cartão por dia com "Hoje/Ontem" e mantém fatura consolidada e resumo do dia. O formulário mantém o layout do fork (data, horário e valor juntos) com os nomes acessíveis (`FieldShellControl`). Dashboard: novo `StatCard` com o atalho sem filtro de pessoa. Categorias: sem o botão "Nova categoria" no topo (o fork cria por painel), com o cadeado usando `InfoTip`. Orçamentos seguem iguais ao `custom`, só com reticências e o novo `AppShell`. As migrações `0034_note_attachments` e `0035_user_palettes` viraram `0038` e `0039`. Revisão de segurança: nenhuma dependência nova; o service worker só guarda arquivos estáticos do próprio domínio e nunca páginas ou API. |
| 2026-11-23 | v0.19.0 → v0.20.0 | `CHANGELOG.md`, `package.json` e `apps/api/package.json` (scripts), `budget-dialog.tsx`, `copy-budgets-dialog.tsx`, `validators/budgets.ts`, `category-icon-picker.tsx`, `dashboard.test.ts` | Sem migrações. Os dois scripts ficaram (`db:sync-categories` do fork e `db:test-user` do upstream). Orçamentos seguem iguais ao `custom`, com o novo visual de campos (`bg-field`, bordas coral na seleção); o `budget-card.tsx` juntou sozinho e ganhou o novo rodapé de ações no celular. O seletor de ícones mantém os grupos do fork com o novo estilo de botão. Revisão de segurança: sem dependências novas; o script `db:test-user` só roda fora de produção e contra banco em localhost. |
