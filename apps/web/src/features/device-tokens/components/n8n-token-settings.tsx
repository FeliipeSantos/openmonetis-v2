import {
  CreateDeviceTokenInputSchema,
  type CreatedDeviceTokenOutput,
} from "@openmonetis/validators/device-tokens";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { Clipboard, Plus, Workflow } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { MobileFormContent as DialogContent } from "@/components/forms/mobile-form-content";
import { MobileFormDialog as Dialog } from "@/components/forms/mobile-form-dialog";
import { MobileFormState } from "@/components/forms/mobile-form-state";
import { SettingsSection } from "@/components/settings-panel";
import { SettingsQueryError } from "@/components/settings-query-error";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { showInvalidFormToast } from "@/lib/form-feedback";
import {
  useCreateDeviceTokenMutation,
  useRevokeDeviceTokenMutation,
  useRotateDeviceTokenMutation,
} from "../device-tokens.mutations";
import { filterDeviceTokensByKind } from "../device-tokens.presentation";
import { deviceTokensQueryOptions } from "../device-tokens.queries";
import { DeviceTokenItem } from "./device-token-item";
import { N8nGuide, N8nRequestExample } from "./n8n-guide";

export function N8nTokenSettings() {
  const query = useQuery(deviceTokensQueryOptions());
  const tokens = filterDeviceTokensByKind(query.data, "n8n");
  const createMutation = useCreateDeviceTokenMutation();
  const revokeMutation = useRevokeDeviceTokenMutation();
  const rotateMutation = useRotateDeviceTokenMutation();
  const [createOpen, setCreateOpen] = useState(false);
  const [createdToken, setCreatedToken] = useState<CreatedDeviceTokenOutput | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [rotateId, setRotateId] = useState<string | null>(null);
  const nameId = useId();
  const form = useForm({
    defaultValues: { name: "" },
    onSubmitInvalid: showInvalidFormToast,
    validators: {
      onSubmit: ({ value }) =>
        CreateDeviceTokenInputSchema.safeParse(value).success
          ? undefined
          : { fields: { name: "Informe um nome com até 80 caracteres." } },
    },
    onSubmit: async ({ value }) => {
      try {
        const created = await createMutation.mutateAsync(
          CreateDeviceTokenInputSchema.parse({ ...value, kind: "n8n" }),
        );
        setCreatedToken(created);
        form.reset();
        toast.success("Token criado");
      } catch {
        toast.error("Não foi possível criar o token.");
      }
    },
  });

  function changeCreateOpen(open: boolean) {
    if (createMutation.isPending) return;
    if (!open && createdToken) setCreatedToken(null);
    setCreateOpen(open);
    if (!open) form.reset();
  }

  async function copyToken(token: string) {
    try {
      await navigator.clipboard.writeText(token);
      toast.success("Token copiado");
    } catch {
      toast.error("Não foi possível copiar. Selecione o token manualmente.");
    }
  }

  async function rotate(id: string) {
    try {
      const rotated = await rotateMutation.mutateAsync(id);
      setRotateId(null);
      setCreatedToken(rotated);
      setCreateOpen(true);
      toast.success("Token renovado");
    } catch {
      toast.error("Não foi possível renovar o token.");
    }
  }

  async function revoke(id: string) {
    try {
      await revokeMutation.mutateAsync(id);
      toast.success("Acesso revogado");
      setRevokeId(null);
    } catch {
      toast.error("Não foi possível revogar o token.");
    }
  }

  return (
    <SettingsSection
      contentClassName="grid gap-5"
      description="Envie dados dos seus fluxos do n8n para a Caixa de entrada e revise antes de criar lançamentos."
      icon={Workflow}
      title="Conexão com n8n"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-medium text-sm">Tokens do n8n</p>
        <Button className="w-full sm:w-auto" onClick={() => setCreateOpen(true)} type="button">
          <Plus aria-hidden="true" /> Criar token
        </Button>
      </div>

      {query.isLoading ? (
        <div className="grid gap-2" role="status" aria-label="Carregando tokens do n8n">
          <Skeleton className="h-20" />
        </div>
      ) : null}
      {query.isError ? (
        <SettingsQueryError
          message="Não foi possível carregar os tokens do n8n."
          isRetrying={query.isFetching}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {tokens && !query.isError ? (
        tokens.length ? (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {tokens.map((token) => (
              <DeviceTokenItem
                actionsDisabled={rotateMutation.isPending || revokeMutation.isPending}
                key={token.id}
                onRevoke={() => setRevokeId(token.id)}
                onRotate={() => setRotateId(token.id)}
                token={token}
              />
            ))}
          </ul>
        ) : (
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-5 text-muted-foreground">
            <Workflow aria-hidden="true" className="size-5 shrink-0" />
            <p className="text-sm">
              Nenhum token criado. Siga os passos abaixo para conectar o primeiro fluxo.
            </p>
          </div>
        )
      ) : null}

      {tokens || query.isError ? (
        <N8nGuide
          // Reopen the guide whenever the account goes back to having no n8n token.
          defaultOpen={!tokens?.length}
          key={tokens?.length ? "connected" : "empty"}
        />
      ) : null}

      <Dialog onOpenChange={changeCreateOpen} open={createOpen}>
        <DialogContent guarded className="max-h-[calc(100svh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{createdToken ? "Configure o n8n" : "Criar token do n8n"}</DialogTitle>
            <DialogDescription>
              {createdToken
                ? "Copie o token agora. Ele não será exibido novamente ao fechar esta janela."
                : "Use um nome que ajude a reconhecer o fluxo depois."}
            </DialogDescription>
          </DialogHeader>
          {createdToken ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <p className="text-center font-medium text-sm">{createdToken.name}</p>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <code className="block break-all font-mono text-xs select-all">
                    {createdToken.token}
                  </code>
                </div>
                <Button onClick={() => void copyToken(createdToken.token)} type="button">
                  <Clipboard aria-hidden="true" /> Copiar token
                </Button>
              </div>
              <N8nRequestExample />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => changeCreateOpen(false)}>
                  Concluir
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form
              data-mobile-page-form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void form.handleSubmit();
              }}
            >
              <form.Subscribe
                selector={(state) => ({
                  isDirty: !state.isDefaultValue,
                  isSubmitting: state.isSubmitting,
                })}
              >
                {(state) => <MobileFormState {...state} />}
              </form.Subscribe>
              <form.Field name="name">
                {(field) => (
                  <div className="grid gap-2">
                    <Label className="font-mono" htmlFor={nameId}>
                      Nome do fluxo
                    </Label>
                    <Input
                      aria-invalid={field.state.meta.errors.length > 0}
                      aria-describedby={
                        field.state.meta.errors.length ? `${nameId}-error` : undefined
                      }
                      disabled={createMutation.isPending}
                      autoComplete="off"
                      id={nameId}
                      maxLength={80}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="Ex.: Notificações do iPhone"
                      value={field.state.value}
                    />
                    {field.state.meta.errors.length ? (
                      <p className="text-destructive text-sm" id={`${nameId}-error`} role="alert">
                        Informe um nome com até 80 caracteres.
                      </p>
                    ) : null}
                  </div>
                )}
              </form.Field>
              <DialogFooter>
                <Button
                  data-mobile-cancel
                  disabled={createMutation.isPending}
                  onClick={() => changeCreateOpen(false)}
                  type="button"
                  variant="outline"
                >
                  Cancelar
                </Button>
                <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                  {([canSubmit, isSubmitting]) => (
                    <Button disabled={!canSubmit || isSubmitting} type="submit">
                      {isSubmitting ? "Preparando…" : "Continuar"}
                    </Button>
                  )}
                </form.Subscribe>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open && !rotateMutation.isPending) setRotateId(null);
        }}
        open={Boolean(rotateId)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Renovar este token?</AlertDialogTitle>
            <AlertDialogDescription>
              O token atual de {tokens?.find((token) => token.id === rotateId)?.name} deixa de
              funcionar agora. Em seguida, atualize o cabeçalho Authorization no n8n. Capturas já
              recebidas serão mantidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rotateMutation.isPending}>Cancelar</AlertDialogCancel>
            <Button
              disabled={rotateMutation.isPending}
              onClick={() => {
                if (rotateId) void rotate(rotateId);
              }}
              type="button"
            >
              {rotateMutation.isPending ? "Renovando…" : "Renovar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open && !revokeMutation.isPending) setRevokeId(null);
        }}
        open={Boolean(revokeId)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar este acesso?</AlertDialogTitle>
            <AlertDialogDescription>
              O fluxo {tokens?.find((token) => token.id === revokeId)?.name} deixará de enviar dados
              imediatamente. Capturas já recebidas serão mantidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={revokeMutation.isPending}
              onClick={() => {
                if (revokeId) void revoke(revokeId);
              }}
              variant="destructive"
            >
              {revokeMutation.isPending ? "Revogando…" : "Revogar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}
