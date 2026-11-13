import { Link } from "@tanstack/react-router";
import { BookOpen, ChevronDown, Clipboard, Inbox, Workflow } from "lucide-react";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatN8nInboxEndpoint, n8nInboxExampleBody } from "../device-tokens.presentation";

const setupSteps = [
  {
    action: "Clique em Criar token",
    detail: "e copie o token. Ele é exibido uma única vez.",
  },
  {
    action: "No n8n, adicione um nó HTTP Request",
    detail: "com método POST no endereço abaixo e o cabeçalho Authorization: Bearer <token>.",
  },
  {
    action: "Envie o corpo em JSON",
    detail:
      "no formato do exemplo. Só sourceApp, originalText e notificationTimestamp são obrigatórios; use clientId para não duplicar.",
  },
  {
    action: "Revise as capturas na Caixa de entrada",
    detail: "e crie regras para preencher categorias e pessoas automaticamente.",
  },
] as const;

const noSubscription = () => () => {};

function useWebOrigin() {
  return useSyncExternalStore(
    noSubscription,
    () => window.location.origin,
    () => "",
  );
}

function inboxSearch(search: { status?: "pending"; rules?: "open" }) {
  return {
    status: undefined,
    page: undefined,
    app: undefined,
    date: undefined,
    rule: undefined,
    rules: undefined,
    ...search,
  };
}

async function copy(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copiado`);
  } catch {
    toast.error("Não foi possível copiar. Selecione o texto manualmente.");
  }
}

export function N8nRequestExample() {
  const endpoint = formatN8nInboxEndpoint(useWebOrigin());

  return (
    <div className="grid gap-3 text-sm">
      <div className="grid gap-1.5">
        <p className="font-medium">Endereço (POST)</p>
        <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-muted/40 p-2 pl-3">
          <code className="min-w-0 flex-1 break-all font-mono text-xs">{endpoint}</code>
          <Button
            aria-label="Copiar endereço"
            onClick={() => void copy(endpoint, "Endereço")}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Clipboard aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div className="grid gap-1.5">
        <p className="font-medium">Cabeçalho</p>
        <code className="rounded-lg border bg-muted/40 p-3 font-mono text-xs">
          Authorization: Bearer &lt;token&gt;
        </code>
      </div>
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium">Corpo (JSON)</p>
          <Button
            onClick={() => void copy(n8nInboxExampleBody, "Exemplo")}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Clipboard aria-hidden="true" /> Copiar exemplo
          </Button>
        </div>
        <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
          {n8nInboxExampleBody}
        </pre>
      </div>
    </div>
  );
}

export function N8nGuide({ defaultOpen }: { defaultOpen: boolean }) {
  return (
    <div className="grid gap-4">
      <Collapsible className="rounded-lg border border-border" defaultOpen={defaultOpen}>
        <CollapsibleTrigger
          render={
            <Button
              className="group h-11 w-full justify-between rounded-lg px-4 data-panel-open:rounded-b-none"
              type="button"
              variant="ghost"
            />
          }
        >
          <span className="flex items-center gap-2">
            <BookOpen aria-hidden="true" className="text-muted-foreground" />
            Como configurar
          </span>
          <ChevronDown
            aria-hidden="true"
            className="text-muted-foreground transition-transform group-data-panel-open:rotate-180 motion-reduce:transition-none"
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid gap-4 border-border border-t p-4">
            <ol className="grid list-decimal gap-3 pl-5 text-sm leading-relaxed marker:text-muted-foreground">
              {setupSteps.map((step) => (
                <li className="pl-1" key={step.action}>
                  <span className="font-medium">{step.action}</span>{" "}
                  <span className="text-muted-foreground">{step.detail}</span>
                </li>
              ))}
            </ol>
            <N8nRequestExample />
          </div>
        </CollapsibleContent>
      </Collapsible>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button asChild variant="outline">
          <Link to="/inbox" search={inboxSearch({ status: "pending" })}>
            <Inbox aria-hidden="true" />
            Abrir Caixa de entrada
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/inbox" search={inboxSearch({ rules: "open" })}>
            <Workflow aria-hidden="true" />
            Regras da Caixa de entrada
          </Link>
        </Button>
      </div>
    </div>
  );
}
