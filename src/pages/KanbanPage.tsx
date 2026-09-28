import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  KanbanSquare,
  MapPin,
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Cnae, KanbanColumn, ProcurementItem } from '@/types';
import { formatBRL } from '@/data/mockData';
import { PortalBadge } from '@/components/ui/PortalBadge';
import { CountdownTimer } from '@/components/ui/CountdownTimer';

interface KanbanPageProps {
  items: ProcurementItem[];
  cnaes: Cnae[];
  searchQuery: string;
  onMoveItem: (id: string, column: KanbanColumn) => void;
  onViewItem: (item: ProcurementItem) => void;
}

const COLUMNS: { id: KanbanColumn; label: string; color: string; dotColor: string }[] = [
  { id: 'triagem', label: 'Triagem / Novas', color: 'border-slate-400', dotColor: 'bg-slate-400' },
  { id: 'analise', label: 'Edital em Análise', color: 'border-blue-400', dotColor: 'bg-blue-400' },
  { id: 'proposta', label: 'Proposta Cadastrada', color: 'border-amber-400', dotColor: 'bg-amber-400' },
  { id: 'disputa', label: 'Em Disputa', color: 'border-red-400', dotColor: 'bg-red-400' },
  { id: 'homologada', label: 'Homologada / Encerrada', color: 'border-emerald-400', dotColor: 'bg-emerald-400' },
];

function DraggableCard({
  item,
  onViewItem,
  onQuickMove,
  isOverlay = false,
}: {
  item: ProcurementItem;
  onViewItem: (item: ProcurementItem) => void;
  onQuickMove: (id: string, col: KanbanColumn) => void;
  isOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { column: item.column },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isOverlay ? 1 : undefined }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onViewItem(item)}
      className={`group cursor-grab active:cursor-grabbing rounded-lg border bg-card p-3 shadow-sm transition-all ${
        isDragging && !isOverlay ? 'opacity-40' : ''
      } ${item.column === 'disputa' ? 'animate-pulse-red border-error/30' : ''} ${
        isOverlay ? 'shadow-xl rotate-2' : 'hover:shadow-card'
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <PortalBadge portal={item.portal} />
        {item.column === 'disputa' && (
          <span className="flex items-center gap-1 text-xs font-bold text-error">
            <span className="h-2 w-2 animate-pulse rounded-full bg-error" />
            AO VIVO
          </span>
        )}
      </div>

      <h4 className="text-xs font-bold text-default leading-snug">{item.title}</h4>

      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-1 text-[11px] text-secondary">
          <Building2 className="h-3 w-3 shrink-0 text-muted" />
          <span className="truncate">{item.buyerOrgan}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted">
          <MapPin className="h-3 w-3 shrink-0" />
          {item.municipality} - RJ
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between rounded-md bg-secondary px-2 py-1.5">
        <span className="text-[10px] text-muted">Valor</span>
        <span className="text-sm font-bold text-primary">{formatBRL(item.estimatedValue)}</span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <CountdownTimer closesAt={item.closesAt} biddingStartsAt={item.biddingStartsAt} />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickMove(item.id, item.column);
          }}
          className="flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[10px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100 hover:bg-primary-light"
          title="Mover para próxima coluna"
        >
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function DroppableColumn({
  column,
  items,
  children,
}: {
  column: (typeof COLUMNS)[number];
  items: ProcurementItem[];
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', column: column.id },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-80 flex-col rounded-xl border-2 bg-secondary transition-colors ${
        isOver ? 'border-primary bg-primary-light' : `${column.color} border-dashed`
      }`}
    >
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${column.dotColor} ${column.id === 'disputa' ? 'animate-pulse' : ''}`} />
          <h3 className="text-sm font-bold text-default">{column.label}</h3>
        </div>
        <span className="rounded-md bg-tertiary px-2 py-0.5 text-xs font-semibold text-secondary">
          {items.length}
        </span>
      </div>
      <div className="flex-1 space-y-2.5 overflow-y-auto p-3 scrollbar-thin" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        {children}
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
            <p className="text-xs text-muted">Arraste itens para cá</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function KanbanPage({ items, cnaes, searchQuery, onMoveItem, onViewItem }: KanbanPageProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const visibleItems = useMemo(() => {
    const enabledCnaeCodes = new Set(cnaes.filter((c) => c.enabled).map((c) => c.code));
    const q = searchQuery.trim().toLowerCase();
    return items
      .filter((i) => enabledCnaeCodes.has(i.cnaeMatch))
      .filter((i) => {
        if (!q) return true;
        const haystack = [
          i.title,
          i.buyerOrgan,
          i.municipality,
          i.region,
          i.cnaeMatch,
          i.portal,
          i.objectDescription,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
  }, [items, cnaes, searchQuery]);

  const visibleById = useMemo(
    () => new Map(visibleItems.map((i) => [i.id, i])),
    [visibleItems],
  );

  const handleQuickMove = (id: string, currentCol: KanbanColumn) => {
    const currentIndex = COLUMNS.findIndex((c) => c.id === currentCol);
    if (currentIndex < COLUMNS.length - 1) {
      onMoveItem(id, COLUMNS[currentIndex + 1].id);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const isColumn = COLUMNS.some((c) => c.id === overId);
    const overItem = visibleById.get(overId);

    let targetColumn: KanbanColumn | null = null;
    if (isColumn) {
      targetColumn = overId as KanbanColumn;
    } else if (overItem) {
      targetColumn = overItem.column;
    }

    const activeItem = visibleById.get(activeId);
    if (targetColumn && activeItem && activeItem.column !== targetColumn) {
      onMoveItem(activeId, targetColumn);
    }
  };

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeItem = activeId ? visibleById.get(activeId) || null : null;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-default">Kanban de Licitações</h1>
          <p className="mt-1 text-sm text-muted">
            Arraste cartões entre colunas ou use as setas para mover
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <KanbanSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-secondary">{visibleItems.length} itens</span>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e) => setActiveId(String(e.active.id))}
        onDragEnd={(e) => {
          setActiveId(null);
          handleDragEnd(e);
        }}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex-1 overflow-x-auto scrollbar-thin">
          <div className="flex gap-4 pb-4" style={{ minWidth: 'max-content' }}>
            {COLUMNS.map((col) => {
              const colItems = visibleItems.filter((i) => i.column === col.id);
              return (
                <DroppableColumn key={col.id} column={col} items={colItems}>
                  {colItems.map((item) => (
                    <DraggableCard
                      key={item.id}
                      item={item}
                      onViewItem={onViewItem}
                      onQuickMove={handleQuickMove}
                    />
                  ))}
                </DroppableColumn>
              );
            })}
          </div>
        </div>

        <DragOverlay>
          {activeItem ? (
            <div style={{ width: 320 }}>
              <DraggableCard
                item={activeItem}
                onViewItem={() => {}}
                onQuickMove={() => {}}
                isOverlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
