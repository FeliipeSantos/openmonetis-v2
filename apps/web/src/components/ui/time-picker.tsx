import { getCurrentTimeInBrazil } from "@openmonetis/shared/date-time";
import { Clock } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

export type TimePickerProps = {
  "aria-invalid"?: boolean;
  "aria-label"?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** 24-hour "HH:MM", or "" when empty. */
  value: string;
};

function splitTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return match ? { hour: match[1], minute: match[2] } : undefined;
}

/** Centers the selected option inside its own column without scrolling the page. */
function scrollSelectedIntoView(node: HTMLButtonElement | null) {
  const column = node?.parentElement;
  if (!node || !column) return;
  column.scrollTop = node.offsetTop - column.clientHeight / 2 + node.clientHeight / 2;
}

function TimeColumn({
  label,
  onSelect,
  options,
  selected,
}: {
  label: string;
  onSelect: (value: string) => void;
  options: string[];
  selected?: string;
}) {
  return (
    <div
      aria-label={label}
      className="relative flex h-56 flex-col gap-0.5 overflow-y-auto overscroll-contain scrollbar-none p-1"
      role="listbox"
    >
      {options.map((option) => {
        const isSelected = option === selected;
        return (
          <Button
            aria-selected={isSelected}
            className="h-8 w-full shrink-0 justify-center tabular-nums"
            key={option}
            onClick={() => onSelect(option)}
            ref={isSelected ? scrollSelectedIntoView : undefined}
            role="option"
            size="sm"
            type="button"
            variant={isSelected ? "default" : "ghost"}
          >
            {option}
          </Button>
        );
      })}
    </div>
  );
}

/** Hour/minute columns plus "Agora"/"Limpar" shortcuts, shared by the popover and mobile sheet. */
export function TimePickerPanel({
  onChange,
  onDone,
  value,
}: {
  onChange: (value: string) => void;
  onDone: () => void;
  value: string;
}) {
  const current = splitTime(value);
  function choose(next: string) {
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 divide-x divide-border rounded-lg border">
        <TimeColumn
          label="Hora"
          onSelect={(hour) => choose(`${hour}:${current?.minute ?? "00"}`)}
          options={HOURS}
          selected={current?.hour}
        />
        <TimeColumn
          label="Minuto"
          onSelect={(minute) => {
            choose(`${current?.hour ?? "00"}:${minute}`);
            onDone();
          }}
          options={MINUTES}
          selected={current?.minute}
        />
      </div>
      <div className="flex gap-2">
        <Button
          className="flex-1"
          onClick={() => {
            choose(getCurrentTimeInBrazil());
            onDone();
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          Agora
        </Button>
        <Button
          className="flex-1"
          disabled={!value}
          onClick={() => {
            choose("");
            onDone();
          }}
          size="sm"
          type="button"
          variant="ghost"
        >
          Limpar
        </Button>
      </div>
    </div>
  );
}

export function TimePicker({
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
  className,
  disabled,
  id,
  onChange,
  placeholder = "--:--",
  value,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            aria-invalid={ariaInvalid}
            aria-label={ariaLabel}
            className={cn(
              "w-full justify-between border-input bg-popover px-2.5 font-normal tabular-nums focus-visible:ring-ring/50",
              !value && "text-muted-foreground",
              className,
            )}
            data-slot="time-picker-trigger"
            disabled={disabled}
            id={id}
            type="button"
            variant="outline"
          />
        }
      >
        <span>{value || placeholder}</span>
        <Clock className="size-4" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-44 p-2">
        <TimePickerPanel onChange={onChange} onDone={() => setOpen(false)} value={value} />
      </PopoverContent>
    </Popover>
  );
}
