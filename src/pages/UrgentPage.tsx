import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Eye,
  Filter,
  Flame,
  MapPin,
  Shield,
  Zap,
} from 'lucide-react';
import type { Cnae, ProcurementItem } from '@/types';
import { formatBRL } from '@/data/mockData';
import { PortalBadge } from '@/components/ui/PortalBadge';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { CountdownTimer } from '@/components/ui/CountdownTimer';

interface UrgentPageProps {
  items: ProcurementItem[];
  cnaes: Cnae[];
  searchQuery: string;
  onViewItem: (item: ProcurementItem) => void;
  onSendToKanban: (id: string) => void;
}

type SortMode = 'urgent' | 'value' | 'risk';

export function UrgentPage({ items, cnaes, searchQuery, onViewItem, onSendToKanban }: UrgentPageProps) {
  const [sortMode, setSortMode] = useState<SortMode>('urgent');
  const [filterPortal, setFilterPortal] = useState<string>('all');

  const sortedItems = useMemo(() => {
    const enabledCnaeCodes = new Set(cnaes.filter((c) => c.enabled).map((c) => c.code));
    const q = searchQuery.trim().toLowerCase();
    let filtered = items.filter(
      (i) => enabledCnaeCodes.has(i.cnaeMatch) && (i.column === 'triagem' || i.column === 'disputa'),
    );
    if (filterPortal !== 'all') {
      filtered = filtered.filter((i) => i.portal === filterPortal);
    }
    if (q) {
      filtered = filtered.filter((i) => {
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
    }
    const sorted = [...filtered];
    if (sortMode === 'urgent') {
      sorted.sort((a, b) => new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime());
    } else if (sortMode === 'value') {
      sorted.sort((a, b) => b.estimatedValue - a.estimatedValue);
    } else {
      sorted.sort((a, b) => a.riskScore - b.riskScore);
    }
    return sorted;
  }, [items, cnaes, sortMode, filterPortal, searchQuery]);

  const urgentCount = sortedItems.filter((i) => {
    const diff = new Date(i.closesAt).getTime() - Date.now();
    return diff < 4 * 3600_000;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-default">Compras Urgentes</h1>
          <p className="mt-1 text-sm text-muted">
            Dispensas Eletrônicas ativas no Rio de Janeiro · {sortedItems.length} oportunidades
          </p>
        </div>
        {urgentCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-error/20 bg-error/5 px-3 py-2">
            <Flame className="h-4 w-4 text-error" />
            <span className="text-sm font-semibold text-error">{urgentCount} fecham em menos de 4h</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-lg border bg-card p-1">
          <Filter className="ml-2 h-4 w-4 text-muted" />
          {(['urgent', 'value', 'risk'] as SortMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setSortMode(mode)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                sortMode === mode
                  ? 'bg-primary text-white'
                  : 'text-secondary hover:bg-tertiary'
              }`}
            >
              {mode === 'urgent' ? 'Mais Urgentes' : mode === 'value' ? 'Maior Valor' : 'Menor Risco'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border bg-card p-1">
          {['all', 'PNCP', 'Compras.gov.br', 'SIGA-RJ'].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPortal(p)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterPortal === p
                  ? 'bg-primary text-white'
                  : 'text-secondary hover:bg-tertiary'
              }`}
            >
              {p === 'all' ? 'Todos os Portais' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedItems.map((item) => {
          const diff = new Date(item.closesAt).getTime() - Date.now();
          const isUrgent = diff < 4 * 3600_000;
          return (
            <div
              key={item.id}
              className={`group flex flex-col rounded-xl border bg-card shadow-card transition-all hover:shadow-lg-card ${
                isUrgent ? 'border-error/30' : 'border-default'
              }`}
            >
              {/* Card header */}
              <div className="flex items-start justify-between gap-2 border-b p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <PortalBadge portal={item.portal} />
                  <RiskBadge riskScore={item.riskScore} />
                </div>
                <CountdownTimer closesAt={item.closesAt} biddingStartsAt={item.biddingStartsAt} />
              </div>

              {/* Card body */}
              <div className="flex-1 p-4">
                <h3 className="text-sm font-bold text-default leading-snug">{item.title}</h3>
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-secondary">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-muted" />
                    {item.buyerOrgan}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {item.municipality} - RJ · Região {item.region}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-lg bg-secondary px-3 py-2">
                  <span className="text-xs font-semibold text-muted">Valor Estimado</span>
                  <span className="text-lg font-bold text-primary">{formatBRL(item.estimatedValue)}</span>
                </div>
                {item.competitorCount < 3 && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-success">
                    <Zap className="h-3.5 w-3.5" />
                    Baixa concorrência: {item.competitorCount} competidor(es)
                  </div>
                )}
              </div>

              {/* Card actions */}
              <div className="flex items-center gap-1.5 border-t p-3">
                <button
                  onClick={() => onViewItem(item)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border bg-secondary px-2 py-2 text-xs font-semibold text-secondary transition-colors hover:bg-tertiary"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Ver Objeto
                </button>
                <button
                  onClick={() => onViewItem(item)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border bg-secondary px-2 py-2 text-xs font-semibold text-secondary transition-colors hover:bg-tertiary"
                >
                  <Shield className="h-3.5 w-3.5" />
                  Analisar Riscos
                </button>
                <button
                  onClick={() => onSendToKanban(item.id)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-2 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-hover"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Kanban
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {sortedItems.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border bg-card p-12 text-center">
          <AlertTriangle className="h-8 w-8 text-muted" />
          <p className="text-sm text-muted">Nenhuma compra urgente encontrada com os filtros atuais</p>
        </div>
      )}
    </div>
  );
}
