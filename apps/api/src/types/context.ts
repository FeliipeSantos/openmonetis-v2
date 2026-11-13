import type { DeviceTokenKind } from "@openmonetis/domain/device-tokens";

export type ApiVariables = {
  userId: string;
  deviceTokenId: string;
  deviceTokenName: string;
  deviceTokenKind: DeviceTokenKind;
  deviceTokenExpiresAt: Date;
};
