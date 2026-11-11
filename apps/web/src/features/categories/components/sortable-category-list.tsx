import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CategoryOutput } from "@openmonetis/validators/categories";
import { Menu } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SortableCategoryListProps = {
  ariaLabel: string;
  className?: string;
  items: CategoryOutput[];
  /** While true the handles are hidden, e.g. during a search that shows only part of a level. */
  disabled?: boolean;
  onMove: (activeId: string, overId: string) => void;
  rowClassName: (category: CategoryOutput) => string;
  renderContent: (category: CategoryOutput) => ReactNode;
  renderActions: (category: CategoryOutput) => ReactNode;
};

/**
 * One level of categories whose rows can be dragged by the ≡ handle (mouse, touch or keyboard:
 * focus the handle, Space to pick up, arrows to move, Space to drop).
 */
export function SortableCategoryList({
  ariaLabel,
  className,
  items,
  disabled = false,
  onMove,
  rowClassName,
  renderContent,
  renderActions,
}: SortableCategoryListProps) {
  const sensors = useSensors(
    // A short travel before dragging keeps taps and clicks on the handle harmless.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (over && active.id !== over.id) onMove(String(active.id), String(over.id));
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
      <SortableContext
        items={items.map((category) => category.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul aria-label={ariaLabel} className={className}>
          {items.map((category) => (
            <SortableCategoryRow
              category={category}
              className={rowClassName(category)}
              disabled={disabled}
              key={category.id}
              renderActions={renderActions}
              renderContent={renderContent}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableCategoryRow({
  category,
  className,
  disabled,
  renderContent,
  renderActions,
}: {
  category: CategoryOutput;
  className: string;
  disabled: boolean;
  renderContent: (category: CategoryOutput) => ReactNode;
  renderActions: (category: CategoryOutput) => ReactNode;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: category.id, disabled });

  return (
    <li
      className={cn(className, isDragging && "relative z-10 bg-muted shadow-md")}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      {renderContent(category)}
      {disabled ? null : (
        <button
          {...attributes}
          {...listeners}
          aria-label={`Mover ${category.name}`}
          className={cn(
            "inline-flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
            isDragging && "cursor-grabbing",
          )}
          ref={setActivatorNodeRef}
          title="Arraste para mudar a posição"
          type="button"
        >
          <Menu aria-hidden="true" className="size-4" />
        </button>
      )}
      {renderActions(category)}
    </li>
  );
}
