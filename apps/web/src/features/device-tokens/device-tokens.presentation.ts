import {
  type DeviceTokenKind,
  deviceTokenActivityWindowDays,
} from "@openmonetis/domain/device-tokens";
import { formatDateInBrazil } from "@openmonetis/shared/date-time";
import type { DeviceTokenOutput } from "@openmonetis/validators/device-tokens";

export function formatDeviceTokenDate(value: string) {
  return formatDateInBrazil(new Date(value), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).replace(" de ", " ");
}

export function formatDeviceTokenLastUsed(value: string | null) {
  if (!value) return "Ainda não usado";
  return `Usado em ${formatDeviceTokenDate(value)}`;
}

export function formatDeviceTokenQrCodeValue(token: string) {
  return `openmonetis://companion/token?v=1&token=${encodeURIComponent(token)}`;
}

/** Each integration section lists only the tokens it created. */
export function filterDeviceTokensByKind(
  tokens: readonly DeviceTokenOutput[] | undefined,
  kind: DeviceTokenKind,
) {
  return tokens?.filter((token) => token.kind === kind);
}

export function formatDeviceTokenRecentCaptures(count: number) {
  const period = `nos últimos ${deviceTokenActivityWindowDays} dias`;
  if (count === 0) return `Nenhuma captura ${period}`;
  return `${count} ${count === 1 ? "captura" : "capturas"} ${period}`;
}

/** Address an n8n workflow posts to; the web origin forwards `/api/*` to the API. */
export function formatN8nInboxEndpoint(origin: string) {
  return `${origin.replace(/\/$/, "")}/api/inbox`;
}

export const n8nInboxExampleBody = JSON.stringify(
  {
    sourceApp: "nubank",
    sourceAppName: "Nubank",
    originalText: "Compra aprovada de R$ 59,90 em PADARIA",
    notificationTimestamp: "2026-11-13T14:30:00-03:00",
    parsedName: "Padaria",
    parsedAmount: 59.9,
    clientId: "id-unico-da-notificacao",
  },
  null,
  2,
);
