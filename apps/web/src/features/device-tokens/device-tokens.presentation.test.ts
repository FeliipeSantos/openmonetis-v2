import assert from "node:assert/strict";
import test from "node:test";
import type { DeviceTokenOutput } from "@openmonetis/validators/device-tokens";
import { CompanionInboxItemInputSchema } from "@openmonetis/validators/inbox";
import {
  filterDeviceTokensByKind,
  formatDeviceTokenQrCodeValue,
  formatDeviceTokenRecentCaptures,
  formatN8nInboxEndpoint,
  n8nInboxExampleBody,
} from "./device-tokens.presentation";

test("device token QR value uses the versioned Companion protocol", () => {
  const token = `opm_${"a".repeat(43)}`;

  assert.equal(
    formatDeviceTokenQrCodeValue(token),
    `openmonetis://companion/token?v=1&token=${token}`,
  );
});

test("device token activity names the capture window", () => {
  assert.equal(formatDeviceTokenRecentCaptures(0), "Nenhuma captura nos últimos 7 dias");
  assert.equal(formatDeviceTokenRecentCaptures(1), "1 captura nos últimos 7 dias");
  assert.equal(formatDeviceTokenRecentCaptures(12), "12 capturas nos últimos 7 dias");
});

test("each integration section lists only its own tokens", () => {
  const token = (id: string, kind: DeviceTokenOutput["kind"]): DeviceTokenOutput => ({
    id,
    name: id,
    kind,
    tokenPrefix: "opm_aaaaaaaa",
    lastUsedAt: null,
    expiresAt: "2027-01-01T00:00:00.000Z",
    expiresSoon: false,
    recentCaptureCount: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
  });
  const tokens = [token("android", "companion"), token("n8n", "n8n")];

  assert.deepEqual(
    filterDeviceTokensByKind(tokens, "companion")?.map((item) => item.id),
    ["android"],
  );
  assert.deepEqual(
    filterDeviceTokensByKind(tokens, "n8n")?.map((item) => item.id),
    ["n8n"],
  );
  assert.equal(filterDeviceTokensByKind(undefined, "n8n"), undefined);
});

test("n8n setup points to the web origin and shows a valid capture body", () => {
  assert.equal(
    formatN8nInboxEndpoint("https://app.example.com/"),
    "https://app.example.com/api/inbox",
  );
  assert.equal(
    CompanionInboxItemInputSchema.safeParse(JSON.parse(n8nInboxExampleBody)).success,
    true,
  );
});
