import type { CategoryOutput } from "@openmonetis/validators/categories";
import { ChevronDown, CircleDashed, Plus } from "lucide-react";
import { useState } from "react";
import {
  MobilePicker,
  MobilePickerContent,
  MobilePickerTrigger,
} from "@/components/forms/mobile-picker";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getSubcategoryOptions, getSubcategoryPlaceholder } from "../categories.presentation";
import { CategoryIcon } from "../category-icons";

/**
 * Picks a subcategory of the main category that `value` belongs to. Choosing "Sem subcategoria"
 * hands back the main category itself, so the form keeps a single category id.
 */
export function SubcategoryPicker({
  categories,
  value,
  onChange,
  disabled,
  invalid,
  noneLabel = "Sem subcategoria",
  onCreate,
}: {
  categories: CategoryOutput[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  /** Label of the option that keeps only the main category. */
  noneLabel?: string;
  /** Offers "Criar subcategoria" under the chosen main category (never under a system one). */
  onCreate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { parent, selected, options } = getSubcategoryOptions(categories, value, search);
  const hasSubcategories = getSubcategoryOptions(categories, value).options.length > 0;
  const canCreate = Boolean(onCreate && parent && !parent.isSystem);
  // A main category without subcategories can still be opened to create the first one.
  const unavailable = !parent || (!hasSubcategories && !canCreate);
  const placeholder =
    parent && hasSubcategories ? noneLabel : getSubcategoryPlaceholder(parent, hasSubcategories);
  function choose(id: string) {
    onChange(id);
    setOpen(false);
  }
  return (
    <MobilePicker
      open={open}
      onOpenChange={(next) => {
        if (next) setSearch("");
        setOpen(next);
      }}
    >
      <MobilePickerTrigger
        data-slot="subcategory-picker-trigger"
        render={
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={`Subcategoria: ${selected?.name ?? placeholder}`}
            aria-invalid={invalid}
            disabled={disabled || unavailable}
            className="w-full justify-start overflow-hidden font-normal"
          />
        }
      >
        {selected ? (
          <CategoryIcon
            aria-hidden="true"
            className="size-4 shrink-0"
            name={selected.icon ?? parent?.icon}
          />
        ) : null}
        <span className="min-w-0 flex-1 truncate text-left">
          {selected ? selected.name : <span className="text-muted-foreground">{placeholder}</span>}
        </span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </MobilePickerTrigger>
      <MobilePickerContent
        title={parent ? `Subcategoria de ${parent.name}` : "Subcategoria"}
        align="start"
        className="w-[min(24rem,calc(100vw-2rem))] p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            className="text-base md:text-sm"
            value={search}
            onValueChange={setSearch}
            aria-label="Buscar subcategoria"
            placeholder="Buscar subcategoria"
          />
          <CommandList className="max-h-80 p-1">
            <CommandEmpty>Nenhuma subcategoria encontrada.</CommandEmpty>
            {parent && !search.trim() ? (
              <CommandItem
                className="min-h-11 text-muted-foreground md:min-h-9"
                value="none"
                data-checked={!selected}
                onSelect={() => choose(parent.id)}
              >
                <CircleDashed aria-hidden="true" className="size-4" />
                {noneLabel}
              </CommandItem>
            ) : null}
            {options.map((child) => (
              <CommandItem
                className="min-h-11 md:min-h-9"
                key={child.id}
                value={child.id}
                data-checked={child.id === selected?.id}
                onSelect={() => choose(child.id)}
              >
                <CategoryIcon
                  aria-hidden="true"
                  className="size-4"
                  name={child.icon ?? parent?.icon}
                />
                <span className="truncate">{child.name}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
        {canCreate ? (
          <div className="border-t p-1">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start text-muted-foreground"
              onClick={() => {
                setOpen(false);
                onCreate?.();
              }}
            >
              <Plus aria-hidden="true" className="size-4" />
              Criar subcategoria
            </Button>
          </div>
        ) : null}
      </MobilePickerContent>
    </MobilePicker>
  );
}
