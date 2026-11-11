import type { CategoryOutput } from "@openmonetis/validators/categories";
import { ChevronDown, CircleDashed } from "lucide-react";
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
}: {
  categories: CategoryOutput[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { parent, selected, options } = getSubcategoryOptions(categories, value, search);
  const hasSubcategories = getSubcategoryOptions(categories, value).options.length > 0;
  const unavailable = !parent || !hasSubcategories;
  const placeholder = getSubcategoryPlaceholder(parent, hasSubcategories);
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
                Sem subcategoria
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
      </MobilePickerContent>
    </MobilePicker>
  );
}
