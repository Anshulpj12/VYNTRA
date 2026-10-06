/**
 * VYNTRA — Service Provider Operational Dashboard
 * Module A — Central nerve center for resource dispatch, incoming order claims,
 * predictive depletion monitoring, and emergency SOS decode.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ServiceProvider, Order } from '../../shared/types';
import {
  loadActiveProvider,
  toggleDutyStatus,
  calculateMetrics,
  getIncomingPendingOrders,
  getActiveOrdersForProvider,
  acceptOrderFirst,
  type DashboardMetrics,
} from './dashboard-service';
import ProviderStatusBanner from './components/ProviderStatusBanner';
import DashboardOverview from './components/DashboardOverview';
import IncomingOrdersList from './components/IncomingOrdersList';
import ActiveOrderCard from './components/ActiveOrderCard';
import '../styles/part3-base.css';
import '../styles/dashboard.css';

// Pre-seeded pending orders if no online orders yet exist
const SEED_INCOMING_ORDERS: Order[] = [
  {
    orderId: 'VYNTRA-ORD-NARMADA1',
    requestingShelterId: 'VYNTRA-SHL-NARMADA1',
    requestingShelterName: 'Narmada Safe Haven (Shelter #12)',
    shelterCoordinates: { lat: 23.1815, lng: 79.9412 },
    items: [
      { itemName: 'Dignity & Sanitary Pad Bundles', requestedQuantity: 60 },
      { itemName: 'Antiseptic & Trauma First Aid Kits', requestedQuantity: 15 },
    ],
    targetMode: 'five-nearest',
    targetProviderIds: [],
    status: 'pending',
    createdAt: Date.now() - 1000 * 60 * 12,
  },
  {
    orderId: 'VYNTRA-ORD-ASHA0002',
    requestingShelterId: 'VYNTRA-SHL-ASHA0002',
    requestingShelterName: "Asha Women's Sanctuary",
    shelterCoordinates: { lat: 23.1950, lng: 79.9520 },
    items: [
      { itemName: 'Folding Heavy-Duty Medical Stretchers', requestedQuantity: 2 },
      { itemName: 'Adult / Pediatric Wheelchair Units', requestedQuantity: 1 },
      { itemName: 'Emergency Thermal Blankets & Bedding', requestedQuantity: 30 },
    ],
    targetMode: 'five-nearest',
    targetProviderIds: [],
    status: 'pending',
    createdAt: Date.now() - 1000 * 60 * 25,
  },
];

export default function ServiceDashboardScreen() {
  const navigate = useNavigate();

  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [incomingOrders, setIncomingOrders] = useState<Order[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    pendingCount: 0,
    inTransitCount: 0,
    criticalShortagesCount: 2,
    completedCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  const refreshData = async () => {
    const prov = await loadActiveProvider();
    setProvider(prov);

    let incoming = await getIncomingPendingOrders(prov.providerId);
    if (incoming.length === 0) {
      incoming = SEED_INCOMING_ORDERS;
    }
    setIncomingOrders(incoming);

    const active = await getActiveOrdersForProvider(prov.providerId);
    setActiveOrders(active);

    const computedMetrics = await calculateMetrics(prov.providerId, incoming, active);
    setMetrics(computedMetrics);
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      const prov = await loadActiveProvider();
      if (!isMounted) return;
      setProvider(prov);

      let incoming = await getIncomingPendingOrders(prov.providerId);
      if (incoming.length === 0) {
        incoming = SEED_INCOMING_ORDERS;
      }
      if (!isMounted) return;
      setIncomingOrders(incoming);

      const active = await getActiveOrdersForProvider(prov.providerId);
      if (!isMounted) return;
      setActiveOrders(active);

      const computedMetrics = await calculateMetrics(prov.providerId, incoming, active);
      if (!isMounted) return;
      setMetrics(computedMetrics);
      setLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleDuty = async (newActive: boolean) => {
    if (!provider) return;
    const updated = await toggleDutyStatus(provider, newActive);
    setProvider(updated);
    setFeedbackNotice(
      newActive
        ? '✓ Operational Status: Active Duty. You are broadcasting to nearby shelters.'
        : 'Standby Mode: Broadcast paused.'
    );
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  const handleAcceptOrder = async (orderId: string) => {
    if (!provider) return;
    const res = await acceptOrderFirst(orderId, provider.providerId);
    if (res.success && res.order) {
      setFeedbackNotice(`✓ Claimed Order #${orderId.slice(-6)}! Preparing checklist.`);
      // Move from incoming to active
      setIncomingOrders((prev) => prev.filter((o) => o.orderId !== orderId));
      setActiveOrders((prev) => [res.order!, ...prev]);
      // Recalculate metrics
      refreshData();
    } else {
      setFeedbackNotice(`⚠️ ${res.message}`);
    }
    setTimeout(() => setFeedbackNotice(null), 4000);
  };

  if (loading || !provider) {
    return (
      <div className="part3-container">
        <div className="loading-screen">
          <div className="loading-spinner" />
          <p>Initializing Service Provider Depot...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="part3-container">
      {/* Header */}
      <header className="part3-top-header">
        <div className="part3-top-header__left">
          <button
            type="button"
            className="part3-back-btn"
            onClick={() => navigate('/auth/role-select')}
            title="Switch Role"
          >
            ←
          </button>
          <div className="part3-top-header__title-group">
            <h1 className="part3-top-header__title">Provider Dispatch Hub</h1>
            <span className="part3-top-header__subtitle">Logistics & Resource Coordination</span>
          </div>
        </div>
        <button
          type="button"
          className="part3-badge part3-badge--success"
          style={{ cursor: 'pointer', border: 'none' }}
          onClick={refreshData}
          title="Refresh live telemetry"
        >
          🔄 Live Sync
        </button>
      </header>

      <main className="svc-dashboard">
        {feedbackNotice && (
          <div className="part3-badge part3-badge--primary" style={{ padding: '10px 14px', width: '100%' }}>
            {feedbackNotice}
          </div>
        )}

        {/* 1. Provider Status Banner */}
        <ProviderStatusBanner
          provider={provider}
          onToggleDuty={handleToggleDuty}
        />

        {/* 2. Rapid Dispatch Bento Overview */}
        <DashboardOverview metrics={metrics} />

        {/* 3. Urgent Direct SOS Banner */}
        <div className="svc-sos-alert-banner">
          <div className="svc-sos-alert-banner__header">
            <span className="svc-sos-alert-badge">Direct SOS Signal Alert</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)' }}>
              1.4 km away
            </span>
          </div>
          <div>
            <h3 style={{ margin: '0 0 2px', fontSize: '16px', fontWeight: 800 }}>
              Encrypted Emergency Signal Received
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>
              A woman has triggered an SMS SOS beacon. Decrypt payload, view location coordinates, and launch tactical turn-by-turn navigation.
            </p>
          </div>
          <button
            type="button"
            className="part3-btn part3-btn--danger"
            onClick={() => navigate('/service/sos-decode')}
          >
            <span>🚨 Decrypt Signal & Launch Navigation</span>
            <span>→</span>
          </button>
        </div>

        {/* 4. Urgent Shelter Depletion Alerts */}
        <section>
          <div className="svc-section-header" style={{ marginBottom: '10px' }}>
            <h2 className="svc-section-title">
              <span>⚠️ Shelter Stock Depletions (Nearby Radius)</span>
            </h2>
            <button
              type="button"
              className="part3-badge part3-badge--secondary"
              style={{ border: 'none', cursor: 'pointer' }}
              onClick={() => navigate('/orders/create')}
            >
              + Create Request
            </button>
          </div>

          <article className="low-stock-card" style={{ marginBottom: '10px' }}>
            <div className="low-stock-card__header">
              <h4 className="low-stock-card__title">🚨 Narmada Safe Haven (Shelter #12)</h4>
              <span className="low-stock-prediction-pill">~4h supply left</span>
            </div>
            <div className="low-stock-meta">
              <span>Sanitary Pads: <strong>12 units remaining</strong> (Min: 60)</span>
              <span>Rate: ~14.5 / day</span>
            </div>
            <button
              type="button"
              className="part3-btn part3-btn--outline"
              style={{ minHeight: '40px', fontSize: '13px', marginTop: '6px', backgroundColor: '#fff' }}
              onClick={() => navigate('/orders/create')}
            >
              ⚡ Initiate Rapid Restock Order (60 Units)
            </button>
          </article>

          <article className="low-stock-card">
            <div className="low-stock-card__header">
              <h4 className="low-stock-card__title">⚠️ Asha Women's Sanctuary</h4>
              <span className="low-stock-prediction-pill">~2h supply left</span>
            </div>
            <div className="low-stock-meta">
              <span>Medical Stretchers: <strong>1 unit remaining</strong> (Min: 4)</span>
              <span>Rate: Emergency</span>
            </div>
            <button
              type="button"
              className="part3-btn part3-btn--outline"
              style={{ minHeight: '40px', fontSize: '13px', marginTop: '6px', backgroundColor: '#fff' }}
              onClick={() => navigate('/orders/create')}
            >
              ⚡ Initiate Rapid Restock Order (4 Units)
            </button>
          </article>
        </section>

        {/* 5. Incoming Orders Queue (First Acceptance) */}
        <section>
          <div className="svc-section-header" style={{ marginBottom: '10px' }}>
            <h2 className="svc-section-title">
              <span>📬 Incoming Orders Queue</span>
            </h2>
            <span className="part3-badge part3-badge--warning">
              {incomingOrders.length} Available
            </span>
          </div>
          <IncomingOrdersList
            orders={incomingOrders}
            currentProvider={provider}
            onAcceptOrder={handleAcceptOrder}
            onViewOrder={(id) => navigate(`/orders/${id}`)}
          />
        </section>

        {/* 6. Active Dispatches & Fulfillment */}
        {activeOrders.length > 0 && (
          <section>
            <div className="svc-section-header" style={{ marginBottom: '10px' }}>
              <h2 className="svc-section-title">
                <span>🚚 My Active Dispatches</span>
              </h2>
              <span className="part3-badge part3-badge--primary">
                {activeOrders.length} Active
              </span>
            </div>
            {activeOrders.map((ord) => (
              <ActiveOrderCard
                key={ord.orderId}
                order={ord}
                onOpenDispatch={(id) => navigate(`/dispatch/${id}`)}
                onOpenConfirm={(id) => navigate(`/dispatch/confirm/${id}`)}
              />
            ))}
          </section>
        )}
      </main>

      {/* Persistent Bottom Nav Bar for Part 3 */}
      <nav className="part3-bottom-nav">
        <button
          type="button"
          className="part3-nav-item active"
          onClick={() => navigate('/service/dashboard')}
        >
          <span className="part3-nav-item__icon">📊</span>
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          className="part3-nav-item"
          onClick={() => navigate('/orders/create')}
        >
          <span className="part3-nav-item__icon">📦</span>
          <span>New Order</span>
        </button>

        <button
          type="button"
          className="part3-nav-item sos-urgent"
          onClick={() => navigate('/service/sos-decode')}
        >
          <span className="part3-nav-item__icon">🚨</span>
          <span>SOS Decrypt</span>
        </button>

        <button
          type="button"
          className="part3-nav-item"
          onClick={() => navigate('/auth/role-select')}
        >
          <span className="part3-nav-item__icon">🔄</span>
          <span>Roles</span>
        </button>
      </nav>
    </div>
  );
}
