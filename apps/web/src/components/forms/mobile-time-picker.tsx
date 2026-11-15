import { Clock } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TimePicker, TimePickerPanel, type TimePickerProps } from "@/components/ui/time-picker";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useMobileViewport } from "@/hooks/useMobileViewport";
import { cn } from "@/lib/utils";

export function MobileTimePicker(props: TimePickerProps) {
  const mobile = useIsMobile();
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  useMobileViewport(element);
  const [open, setOpen] = useState(false);
  if (!mobile) return <TimePicker {...props} />;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="outline"
            id={props.id}
            aria-label={props["aria-label"]}
            disabled={props.disabled}
            aria-invalid={props["aria-invalid"]}
            data-slot="time-picker-trigger"
            className={cn(
              "w-full min-h-12 justify-between font-normal text-base tabular-nums",
              !props.value && "text-muted-foreground",
              props.className,
            )}
          />
        }
      >
        {props.value || (props.placeholder ?? "--:--")}
        <Clock aria-hidden="true" className="size-4" />
      </SheetTrigger>
      <SheetContent
        ref={setElement}
        side="bottom"
        showCloseButton={false}
        className="mobile-bottom-panel max-h-[90dvh] overflow-y-auto rounded-t-2xl gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="border-b-0 pr-20">
          <SheetTitle>Selecionar horário</SheetTitle>
          <SheetDescription>Escolha a hora e os minutos ou use o horário atual.</SheetDescription>
        </SheetHeader>
        <SheetClose
          data-mobile-back
          render={
            <Button type="button" variant="ghost" className="absolute right-3 top-3 min-h-11" />
          }
        >
          Fechar
        </SheetClose>
        <div className="mx-auto w-full max-w-sm px-4">
          <TimePickerPanel
            onChange={props.onChange}
            onDone={() => setOpen(false)}
            value={props.value}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
