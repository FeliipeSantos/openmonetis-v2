# Conexão com n8n

Envia dados de um fluxo do n8n para a **Caixa de entrada**. Lá eles são revisados e viram
lançamentos, como as capturas do Companion.

> Recurso exclusivo deste fork. Veja também [fork-customizations.md](fork-customizations.md).

## 1. Criar o token

Em **Ajustes → Integrações → Conexão com n8n**, clique em **Criar token** e copie o token. Ele é
exibido uma única vez. A mesma tela mostra o endereço e um JSON de exemplo para copiar.

## 2. Configurar o nó HTTP Request no n8n

| Campo | Valor |
| --- | --- |
| Method | `POST` |
| URL | `https://<endereço do OpenMonetis>/api/inbox` |
| Header | `Authorization: Bearer <token>` (de preferência numa credencial Header Auth) |
| Body | JSON, no formato abaixo |

## 3. Formato do JSON

```json
{
  "sourceApp": "nubank",
  "sourceAppName": "Nubank",
  "originalText": "Compra aprovada de R$ 59,90 em PADARIA",
  "notificationTimestamp": "2026-11-13T14:30:00-03:00",
  "parsedName": "Padaria",
  "parsedAmount": 59.9,
  "clientId": "id-unico-da-notificacao"
}
```

| Campo | Obrigatório | O que é |
| --- | --- | --- |
| `sourceApp` | sim | Identificador da origem, só com letras, números, `.`, `_` e `-` (ex.: `nubank`). As regras da Caixa de entrada podem filtrar por ele |
| `originalText` | sim | Texto original, até 2.000 caracteres |
| `notificationTimestamp` | sim | Data e hora em ISO 8601 (ex.: `{{ $now.toISO() }}` no n8n) |
| `sourceAppName` | não | Nome exibido na Caixa de entrada (ex.: `Nubank`) |
| `originalTitle` | não | Título original, até 500 caracteres |
| `parsedName` | não | Descrição sugerida para o lançamento, até 160 caracteres |
| `parsedAmount` | não | Valor sugerido, positivo e com ponto decimal (ex.: `59.9`) |
| `clientId` | recomendado | ID único do evento. Reenviar o mesmo ID não duplica a captura |

Campos fora dessa lista são recusados. Para mandar vários itens de uma vez, use
`POST /api/inbox/batch` com `{ "items": [ ... ] }`, com até 50 itens.

## Respostas

| Status | Significado |
| --- | --- |
| `201` | Recebido ("Notificação recebida" ou "Notificação já recebida", se o `clientId` repetir) |
| `400` | JSON fora do formato |
| `401` | Token ausente, revogado ou expirado |
| `409` | Mesmo `clientId` com conteúdo diferente |
| `413` / `429` | Conteúdo muito grande (16 KB por item) / mais de 100 envios por minuto |

O token só envia itens para a Caixa de entrada do dono. Ele não lê dados e pode ser renovado ou
revogado a qualquer momento, sem afetar o Companion.
