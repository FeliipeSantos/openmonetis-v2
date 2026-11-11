import type { TransactionInput, TransactionSuggestion } from "@openmonetis/validators/transactions";
import { History, LoaderCircle, Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  MobilePicker as Popover,
  MobilePickerContent as PopoverContent,
  MobilePickerTrigger as PopoverTrigger,
} from "@/components/forms/mobile-picker";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/useIsMobile";
import { findTransactionSuggestions } from "../transactions.presentation";

type EstablishmentInputProps = {
  value: string;
  type: TransactionInput["type"];
  suggestions: TransactionSuggestion[];
  /** One line under each suggestion with what choosing it fills in. */
  describe: (suggestion: TransactionSuggestion) => string;
  onSelectSuggestion: (suggestion: TransactionSuggestion) => void;
  disabled?: boolean;
  invalid?: boolean;
  loading?: boolean;
  maxLength?: number;
  placeholder?: string;
  onBlur: () => void;
  onChange: (value: string) => void;
};

const suggestionKey = (suggestion: TransactionSuggestion) =>
  `${suggestion.type}:${suggestion.name.toLocaleLowerCase("pt-BR")}`;

/**
 * Description field that suggests past incomes or expenses while typing. Picking one fills the
 * rest of the form from its latest use; the typed text is kept when nothing is picked.
 */
export function EstablishmentInput({
  value,
  type,
  suggestions,
  describe,
  onSelectSuggestion,
  disabled = false,
  invalid = false,
  loading = false,
  maxLength,
  placeholder,
  onBlur,
  onChange,
}: EstablishmentInputProps) {
  const mobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState("");
  const [contentWidth, setContentWidth] = useState<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const available = useMemo(
    () => suggestions.some((suggestion) => suggestion.type === type),
    [suggestions, type],
  );
  const visible = useMemo(
    () => findTransactionSuggestions(suggestions, query, type),
    [suggestions, query, type],
  );

  function show(nextQuery: string) {
    const matches = findTransactionSuggestions(suggestions, nextQuery, type);
    const container = containerRef.current;
    if (container) setContentWidth(container.offsetWidth);
    setHighlighted(matches[0] ? suggestionKey(matches[0]) : "");
    setOpen(matches.length > 0);
  }

  function select(suggestion: TransactionSuggestion) {
    onSelectSuggestion(suggestion);
    setQuery("");
    setOpen(false);
  }

  function moveHighlight(step: number) {
    if (!visible.length) return;
    const index = visible.findIndex((suggestion) => suggestionKey(suggestion) === highlighted);
    const next = (index + step + visible.length) % visible.length;
    setHighlighted(suggestionKey(visible[next] as TransactionSuggestion));
  }

  return (
    <Popover
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          show(mobile ? "" : query);
          return;
        }
        setOpen(false);
        setQuery("");
      }}
      open={open}
    >
      <div className="relative" ref={containerRef}>
        <Input
          aria-autocomplete={mobile ? undefined : "list"}
          aria-expanded={mobile ? undefined : open}
          aria-invalid={invalid}
          autoComplete="off"
          className={available || loading ? "pr-9 text-left" : "text-left"}
          disabled={disabled}
          maxLength={maxLength}
          onBlur={onBlur}
          onChange={(event) => {
            const nextValue = event.target.value;
            onChange(nextValue);
            setQuery(nextValue);
            if (!mobile) show(nextValue);
          }}
          onClick={mobile ? undefined : () => show(query)}
          onKeyDown={(event) => {
            if (mobile) return;
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              if (!open) show(query);
              else moveHighlight(event.key === "ArrowDown" ? 1 : -1);
              return;
            }
            if (event.key === "Enter" && open) {
              const suggestion = visible.find((item) => suggestionKey(item) === highlighted);
              if (!suggestion) return;
              event.preventDefault();
              select(suggestion);
            }
          }}
          placeholder={placeholder}
          required
          role={mobile ? undefined : "combobox"}
          value={value}
        />
        {loading ? (
          <LoaderCircle
            aria-label="Carregando lançamentos anteriores"
            className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
          />
        ) : available && mobile ? (
          <PopoverTrigger
            aria-label="Escolher um lançamento anterior"
            disabled={disabled}
            render={
              <Button
                className="absolute top-1/2 right-0 size-11 -translate-y-1/2"
                type="button"
                variant="ghost"
              />
            }
          >
            <Search aria-hidden="true" className="size-4" />
          </PopoverTrigger>
        ) : available ? (
          <PopoverTrigger
            nativeButton={false}
            render={
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
                tabIndex={-1}
              />
            }
          >
            <Search aria-hidden="true" className="size-4" />
          </PopoverTrigger>
        ) : null}
      </div>

      <PopoverContent
        title="Lançamentos anteriores"
        align="end"
        className="w-[var(--anchor-width)] gap-0 p-0"
        finalFocus={false}
        initialFocus={false}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.stopPropagation();
          setOpen(false);
        }}
        style={contentWidth ? { width: contentWidth } : undefined}
      >
        {mobile ? (
          <Input
            aria-label="Buscar lançamentos anteriores"
            className="mb-3"
            placeholder="Buscar descrição"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        ) : null}
        <Command onValueChange={setHighlighted} shouldFilter={false} value={highlighted}>
          <CommandList>
            <CommandEmpty>Nenhum lançamento anterior encontrado.</CommandEmpty>
            <CommandGroup className="text-left" heading="Preencher com um lançamento anterior">
              {visible.map((suggestion) => {
                const detail = describe(suggestion);
                return (
                  <CommandItem
                    className="cursor-pointer items-start justify-start gap-2 text-left"
                    key={suggestionKey(suggestion)}
                    onSelect={() => select(suggestion)}
                    value={suggestionKey(suggestion)}
                  >
                    <History aria-hidden="true" className="mt-0.5 size-4 text-muted-foreground" />
                    <span className="grid min-w-0 flex-1 text-left">
                      <span className="truncate">{suggestion.name}</span>
                      {detail ? (
                        <span className="truncate text-muted-foreground text-xs">{detail}</span>
                      ) : null}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
