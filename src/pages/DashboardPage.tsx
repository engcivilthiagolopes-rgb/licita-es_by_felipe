import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Crown,
  DollarSign,
  Flame,
  TrendingDown,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { BUYING_ORGANS, COMPETITORS, formatBRL, LOW_COMPETITION_REGIONS } from '@/data/mockData';
import { useTheme } from '@/context/ThemeContext';
import type { Cnae, ProcurementItem } from '@/types';

interface DashboardPageProps {
  items: ProcurementItem[];
  cnaes: Cnae[];
  searchQuery: string;
}

export function DashboardPage({ items, cnaes, searchQuery }: DashboardPageProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const axisColor = isDark ? '#8289a0' : '#64748b';
  const gridColor = isDark ? '#2a3148' : '#e2e8f0';
  const tooltipBg = isDark ? '#0f1321' : '#ffffff';
  const tooltipBorder = isDark ? '#262d40' : '#e2e8f0';
  const tooltipText = isDark ? '#f1f5f9' : '#0f172a';

  const enabledCnaeCodes = useMemo(
    () => new Set(cnaes.filter((c) => c.enabled).map((c) => c.code)),
    [cnaes],
  );
  const normalizedSearch = useMemo(
    () => searchQuery.trim().toLowerCase(),
    [searchQuery],
  );
  const filteredItems = useMemo(() => {
    return items
      .filter((i) => enabledCnaeCodes.has(i.cnaeMatch))
      .filter((i) => {
        if (!normalizedSearch) return true;
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
        return haystack.includes(normalizedSearch);
      });
  }, [items, enabledCnaeCodes, normalizedSearch]);

  const totalValue = useMemo(
    () => filteredItems.reduce((s, i) => s + i.estimatedValue, 0),
    [filteredItems],
  );
  const activeCount = useMemo(
    () => filteredItems.filter((i) => i.column !== 'homologada').length,
    [filteredItems],
  );
  const urgentCount = useMemo(() => {
    return filteredItems.filter((i) => {
      return new Date(i.closesAt).getTime() - Date.now() < 4 * 3600_000;
    }).length;
  }, [filteredItems]);
  const lowCompetitionCount = useMemo(
    () => filteredItems.filter((i) => i.competitorCount < 3).length,
    [filteredItems],
  );

  const topOrgansData = useMemo(() => {
    const aggregates = new Map<string, { organ: string; municipality: string; totalValue: number; contracts: number; region: string }>();
    filteredItems.forEach((item) => {
      const existing = aggregates.get(item.buyerOrgan);
      if (existing) {
        existing.totalValue += item.estimatedValue;
        existing.contracts += 1;
      } else {
        aggregates.set(item.buyerOrgan, {
          organ: item.buyerOrgan,
          municipality: item.municipality,
          totalValue: item.estimatedValue,
          contracts: 1,
          region: item.region,
        });
      }
    });
    const merged = Array.from(aggregates.values());
    BUYING_ORGANS.forEach((bo) => {
      if (!aggregates.has(bo.organ)) merged.push(bo);
    });
    return merged
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 6)
      .map((o) => ({
        name: o.organ.length > 22 ? o.organ.slice(0, 22) + '…' : o.organ,
        fullName: o.organ,
        value: o.totalValue,
        contracts: o.contracts,
      }));
  }, [filteredItems]);

  const cnaeDistribution = useMemo(() => {
    const cnaeNames: Record<string, string> = {
      '4761-0/03': 'Papelaria',
      '4754-7/01': 'Móveis',
      '4789-0/05': 'Limpeza',
      '4744-0/01': 'Ferragens',
      '4742-3/00': 'Elétrico',
      '4744-0/03': 'Hidráulico',
      '4741-5/00': 'Construção',
      '4789-0/07': 'Informática',
    };
    const counts: Record<string, number> = {};
    filteredItems.forEach((i) => {
      counts[i.cnaeMatch] = (counts[i.cnaeMatch] || 0) + 1;
    });
    const colors = ['#0d9488', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#ec4899', '#6366f1'];
    return Object.entries(counts).map(([code, count], i) => ({
      name: cnaeNames[code] || code,
      value: count,
      color: colors[i % colors.length],
    }));
  }, [filteredItems]);

  const regionData = useMemo(() => {
    const regions: Record<string, number> = {};
    filteredItems.forEach((i) => {
      regions[i.region] = (regions[i.region] || 0) + i.estimatedValue;
    });
    return Object.entries(regions).map(([region, value]) => ({ region, value }));
  }, [filteredItems]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-default">Dashboard & Market Analytics</h1>
        <p className="mt-1 text-sm text-muted">
          Inteligência de mercado para Dispensas Eletrônicas no Rio de Janeiro
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={DollarSign}
          label="Valor Total Monitorado"
          value={formatBRL(totalValue)}
          trend="+12.5%"
          trendUp
          color="text-primary"
          bg="bg-primary/10"
        />
        <KpiCard
          icon={Zap}
          label="Editais Ativos"
          value={String(activeCount)}
          trend="+3 hoje"
          trendUp
          color="text-blue-600"
          bg="bg-blue-500/10"
        />
        <KpiCard
          icon={Flame}
          label="Urgentes (< 4h)"
          value={String(urgentCount)}
          trend="Atenção"
          color="text-error"
          bg="bg-error/10"
        />
        <KpiCard
          icon={TrendingDown}
          label="Baixa Concorrência"
          value={String(lowCompetitionCount)}
          trend="Oportunidades"
          trendUp
          color="text-success"
          bg="bg-success/10"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top Buying Organs */}
        <div className="rounded-xl border bg-card p-5 shadow-card lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-default">Top Órgãos Compradores</h2>
            <span className="ml-auto text-xs text-muted">por valor total (BRL)</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topOrgansData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                tick={{ fill: axisColor, fontSize: 11 }}
                stroke={gridColor}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: axisColor, fontSize: 11 }}
                stroke={gridColor}
                width={130}
              />
              <Tooltip
                cursor={{ fill: isDark ? '#1a1f33' : '#f1f5f9' }}
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: '8px',
                  color: tooltipText,
                  fontSize: '12px',
                }}
                formatter={(value) => [formatBRL(Number(value)), 'Valor Total']}
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload;
                  return p ? `${p.fullName} (${p.contracts} contratos)` : '';
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="#0d9488" barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* CNAE Distribution */}
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-default">Distribuição por CNAE</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={cnaeDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
                innerRadius={40}
                paddingAngle={2}
              >
                {cnaeDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: '8px',
                  color: tooltipText,
                  fontSize: '12px',
                }}
                formatter={(value, name) => [`${value} editais`, String(name)]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 flex flex-wrap gap-2">
            {cnaeDistribution.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: c.color }} />
                <span className="text-xs text-secondary">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low Competition + Competitors */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Low Competition Alert */}
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h2 className="text-sm font-bold text-default">Alerta de Baixa Participação</h2>
          </div>
          <div className="space-y-3">
            {LOW_COMPETITION_REGIONS.map((region) => (
              <div
                key={region.region}
                className={`rounded-lg border p-3 ${
                  region.riskLevel === 'high'
                    ? 'border-error/20 bg-error/5'
                    : 'border-warning/20 bg-warning/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingDown
                      className={`h-4 w-4 ${
                        region.riskLevel === 'high' ? 'text-error' : 'text-warning'
                      }`}
                    />
                    <span className="text-sm font-semibold text-default">{region.region}</span>
                  </div>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                      region.riskLevel === 'high'
                        ? 'bg-error/10 text-error'
                        : 'bg-warning/10 text-warning'
                    }`}
                  >
                    {region.avgBidders.toFixed(1)} licitantes
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {region.organs.map((organ) => (
                    <span
                      key={organ}
                      className="rounded-md border bg-tertiary px-2 py-0.5 text-[11px] text-secondary"
                    >
                      {organ}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Competitor Tracking */}
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-default">Competidores Recorrentes</h2>
            <span className="ml-auto text-xs text-muted">Top 3 no RJ</span>
          </div>
          <div className="space-y-3">
            {COMPETITORS.map((comp, i) => (
              <div key={comp.name} className="rounded-lg border bg-secondary p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {i === 0 && <Crown className="h-4 w-4 text-amber-500" />}
                    <span className="text-sm font-semibold text-default">{comp.name}</span>
                  </div>
                  <span className="text-xs font-bold text-primary">
                    {comp.wins} vitórias
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-muted">Foco: {comp.cnaeFocus}</span>
                  <span className="flex items-center gap-1 font-semibold text-error">
                    <ArrowDownRight className="h-3 w-3" />
                    {comp.avgDiscount.toFixed(1)}% desconto médio
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-tertiary">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-blue-500"
                    style={{ width: `${(comp.wins / 42) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Region spending bar */}
      <div className="rounded-xl border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-default">Distribuição de Valor por Região</h2>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={regionData} margin={{ left: 0, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="region"
              tick={{ fill: axisColor, fontSize: 11 }}
              stroke={gridColor}
            />
            <YAxis
              tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              tick={{ fill: axisColor, fontSize: 11 }}
              stroke={gridColor}
            />
            <Tooltip
              cursor={{ fill: isDark ? '#1a1f33' : '#f1f5f9' }}
              contentStyle={{
                backgroundColor: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: '8px',
                color: tooltipText,
                fontSize: '12px',
              }}
              formatter={(value) => [formatBRL(Number(value)), 'Valor Total']}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#3b82f6" barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  trend,
  trendUp,
  color,
  bg,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  trend: string;
  trendUp?: boolean;
  color: string;
  bg: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <span
          className={`flex items-center gap-0.5 text-xs font-semibold ${
            trendUp ? 'text-success' : 'text-warning'
          }`}
        >
          {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {trend}
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold text-default">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}
