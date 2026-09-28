import { useCallback, useEffect, useState } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { Sidebar, type Page } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { NotificationPanel, type AppNotification } from '@/components/NotificationPanel';
import { DetailModal } from '@/components/DetailModal';
import { DashboardPage } from '@/pages/DashboardPage';
import { KanbanPage } from '@/pages/KanbanPage';
import { UrgentPage } from '@/pages/UrgentPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { INITIAL_CNAES, INITIAL_ITEMS } from '@/data/mockData';
import type { AlertSettings, Cnae, KanbanColumn, ProcurementItem } from '@/types';

const LS_KEYS = {
  items: 'meu-filtro-items',
  cnaes: 'meu-filtro-cnaes',
  alerts: 'meu-filtro-alerts',
  notifications: 'meu-filtro-notifications',
} as const;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function AppContent() {
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cnaes, setCnaes] = useState<Cnae[]>(() =>
    safeParse<Cnae[]>(localStorage.getItem(LS_KEYS.cnaes), INITIAL_CNAES),
  );
  const [items, setItems] = useState<ProcurementItem[]>(() =>
    safeParse<ProcurementItem[]>(localStorage.getItem(LS_KEYS.items), INITIAL_ITEMS),
  );
  const [selectedItem, setSelectedItem] = useState<ProcurementItem | null>(null);
  const [lastSync, setLastSync] = useState(new Date());
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    safeParse<AppNotification[]>(localStorage.getItem(LS_KEYS.notifications), [
      {
        id: 'n1',
        type: 'new',
        title: 'Nova Dispensa Eletrônica',
        message: 'Câmara Municipal de Cantagalo - Papelaria e Escritório',
        timestamp: new Date(Date.now() - 5 * 60_000),
      },
      {
        id: 'n2',
        type: 'closing',
        title: 'Edital encerra em 30 minutos',
        message: 'Prefeitura de Niterói - Produtos de Limpeza',
        timestamp: new Date(Date.now() - 12 * 60_000),
      },
      {
        id: 'n3',
        type: 'low_competition',
        title: 'Baixa concorrência detectada',
        message: 'Nova Friburgo: apenas 1 competidor identificado',
        timestamp: new Date(Date.now() - 25 * 60_000),
      },
    ]).map((n) => ({ ...n, timestamp: new Date(n.timestamp) })),
  );
  const [alerts, setAlerts] = useState<AlertSettings>(() =>
    safeParse<AlertSettings>(localStorage.getItem(LS_KEYS.alerts), {
      whatsapp: true,
      telegram: false,
      push: true,
      email: true,
    }),
  );

  useEffect(() => {
    localStorage.setItem(LS_KEYS.items, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.cnaes, JSON.stringify(cnaes));
  }, [cnaes]);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.alerts, JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem(
      LS_KEYS.notifications,
      JSON.stringify(notifications.map((n) => ({ ...n, timestamp: n.timestamp instanceof Date ? n.timestamp.toISOString() : n.timestamp }))),
    );
  }, [notifications]);

  // Simulate periodic sync
  useEffect(() => {
    const interval = setInterval(() => {
      setLastSync(new Date());
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleCnae = useCallback((id: string) => {
    setCnaes((prev) => prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c)));
  }, []);

  const handleMoveItem = useCallback((id: string, column: KanbanColumn) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, column } : i)));
  }, []);

  const handleSendToKanban = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, column: 'triagem' } : i)),
    );
    setPage('kanban');
  }, []);

  const handleTestNotification = useCallback(() => {
    const newNotif: AppNotification = {
      id: `n${Date.now()}`,
      type: 'new',
      title: 'Nova Dispensa Eletrônica Detectada',
      message: 'Prefeitura de Petrópolis - Material Elétrico · R$ 45.000,00',
      timestamp: new Date(),
    };
    setNotifications((prev) => [newNotif, ...prev]);
    setNotifOpen(true);
    window.alert(
      'MEU FILTRO - Nova notificação!\n\nNova Dispensa Eletrônica detectada:\nPrefeitura de Petrópolis - Material Elétrico\nValor: R$ 45.000,00\nEncerra em 12h\n\nCanais ativos: WhatsApp, Push, E-mail',
    );
  }, []);

  const handleNavigate = (p: Page) => {
    setPage(p);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-app">
      <Sidebar
        active={page}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          notificationCount={notifications.length}
          onNotificationClick={() => setNotifOpen(true)}
          lastSync={lastSync}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <main className="flex-1 overflow-y-auto scrollbar-thin p-4 lg:p-6">
          {page === 'dashboard' && <DashboardPage items={items} cnaes={cnaes} searchQuery={searchQuery} />}
          {page === 'kanban' && (
            <KanbanPage
              items={items}
              cnaes={cnaes}
              searchQuery={searchQuery}
              onMoveItem={handleMoveItem}
              onViewItem={setSelectedItem}
            />
          )}
          {page === 'urgent' && (
            <UrgentPage
              items={items}
              cnaes={cnaes}
              searchQuery={searchQuery}
              onViewItem={setSelectedItem}
              onSendToKanban={handleSendToKanban}
            />
          )}
          {page === 'settings' && (
            <SettingsPage
              cnaes={cnaes}
              onToggleCnae={handleToggleCnae}
              alerts={alerts}
              onAlertsChange={setAlerts}
              onTestNotification={handleTestNotification}
            />
          )}
        </main>
      </div>

      <NotificationPanel
        isOpen={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
      />
      <DetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onSendToKanban={handleSendToKanban}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
