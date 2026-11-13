import { SettingsPanel } from "@/components/settings-panel";
import { AiProvidersSettings } from "@/features/ai-providers/components/ai-providers-settings";
import { DeviceTokenSettings } from "@/features/device-tokens/components/device-token-settings";
import { N8nTokenSettings } from "@/features/device-tokens/components/n8n-token-settings";

export function IntegrationsSettings() {
  return (
    <SettingsPanel>
      <DeviceTokenSettings />
      <N8nTokenSettings />
      <AiProvidersSettings />
    </SettingsPanel>
  );
}
