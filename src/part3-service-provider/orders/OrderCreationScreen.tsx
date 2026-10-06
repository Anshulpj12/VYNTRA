/**
 * VYNTRA — Order Creation Screen
 * Module C — Replenishment Order Assembly & Nearest Provider Broadcast.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { OrderItem, GeoCoordinates, InventoryItem, UsageLogEntry } from '../../shared/types';
import { identifyLowStockItems, type StockPrediction } from './stock-predictor';
import { findFiveNearestProviders, type ProviderWithDistance } from './nearest-provider-finder';
import { createOrder } from './order-service';
import LowStockAlertList from './components/LowStockAlertList';
import OrderItemSelector from './components/OrderItemSelector';
import ProviderSelectionMode from './components/ProviderSelectionMode';
import OrderSummaryCard from './components/OrderSummaryCard';
import '../styles/part3-base.css';
import '../styles/orders.css';

// Seed shelter inventory to simulate live inventory monitoring
const DEMO_SHELTER_COORDS: GeoCoordinates = { lat: 23.1815, lng: 79.9412 };
const DEMO_SHELTER_ID = 'VYNTRA-SHL-NARMADA1';
const DEMO_SHELTER_NAME = 'Narmada Safe Haven (Shelter #12)';

const DEMO_INVENTORY: InventoryItem[] = [
  {
    itemId: 'item-san-pads',
    shelterId: DEMO_SHELTER_ID,
    itemName: 'Dignity & Sanitary Pad Bundles',
    currentQuantity: 12,
    requiredMinimum: 60,
    lastUpdatedAt: { toMillis: () => Date.now() } as unknown as import('firebase/firestore').Timestamp,
    usageRate: 14.5,
  },
  {
    itemId: 'item-trauma-kits',
    shelterId: DEMO_SHELTER_ID,
    itemName: 'Antiseptic & Trauma First Aid Kits',
    currentQuantity: 3,
    requiredMinimum: 15,
    lastUpdatedAt: { toMillis: () => Date.now() } as unknown as import('firebase/firestore').Timestamp,
    usageRate: 2.2,
  },
  {
    itemId: 'item-stretchers',
    shelterId: DEMO_SHELTER_ID,
    itemName: 'Folding Heavy-Duty Medical Stretchers',
    currentQuantity: 1,
    requiredMinimum: 4,
    lastUpdatedAt: { toMillis: () => Date.now() } as unknown as import('firebase/firestore').Timestamp,
    usageRate: 0.5,
  },
  {
    itemId: 'item-blankets',
    shelterId: DEMO_SHELTER_ID,
    itemName: 'Emergency Thermal Blankets & Bedding',
    currentQuantity: 55,
    requiredMinimum: 50,
    lastUpdatedAt: { toMillis: () => Date.now() } as unknown as import('firebase/firestore').Timestamp,
    usageRate: 3.0,
  },
];

const DEMO_USAGE_LOGS: Record<string, UsageLogEntry[]> = {
  'item-san-pads': [
    {
      logId: 'log-1',
      itemId: 'item-san-pads',
      shelterId: DEMO_SHELTER_ID,
      quantityUsed: 15,
      usedAt: { toMillis: () => Date.now() - 86400000 * 2 } as unknown as import('firebase/firestore').Timestamp,
    },
    {
      logId: 'log-2',
      itemId: 'item-san-pads',
      shelterId: DEMO_SHELTER_ID,
      quantityUsed: 18,
      usedAt: { toMillis: () => Date.now() - 86400000 } as unknown as import('firebase/firestore').Timestamp,
    },
  ],
};

export default function OrderCreationScreen() {
  const navigate = useNavigate();

  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([
    { itemName: 'Dignity & Sanitary Pad Bundles', requestedQuantity: 60 },
  ]);
  const [mode, setMode] = useState<'five-nearest' | 'single'>('five-nearest');
  const [providers, setProviders] = useState<ProviderWithDistance[]>([]);
  const [selectedSingleProviderId, setSelectedSingleProviderId] = useState<string>('');
  const [lowStockAlerts] = useState<StockPrediction[]>(() =>
    identifyLowStockItems(DEMO_INVENTORY, DEMO_USAGE_LOGS)
  );
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    // Fetch nearest service providers via Haversine calculation
    findFiveNearestProviders(DEMO_SHELTER_COORDS).then((res) => {
      setProviders(res);
      if (res.length > 0) {
        setSelectedSingleProviderId(res[0].providerId);
      }
    });
  }, []);

  const handleQuickAdd = (prediction: StockPrediction) => {
    const existing = selectedItems.find((i) => i.itemName === prediction.itemName);
    if (existing) {
      setSelectedItems(
        selectedItems.map((i) =>
          i.itemName === prediction.itemName
            ? { ...i, requestedQuantity: i.requestedQuantity + prediction.recommendedReorderQuantity }
            : i
        )
      );
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          itemName: prediction.itemName,
          requestedQuantity: prediction.recommendedReorderQuantity,
        },
      ]);
    }
    setNotice(`Added ${prediction.recommendedReorderQuantity}x ${prediction.itemName} to order.`);
    setTimeout(() => setNotice(null), 3000);
  };

  const handleSubmitOrder = async () => {
    if (selectedItems.length === 0) return;
    setSubmitting(true);

    try {
      const targetProviderIds =
        mode === 'five-nearest'
          ? providers.slice(0, 5).map((p) => p.providerId)
          : [selectedSingleProviderId];

      const newOrder = await createOrder({
        requestingShelterId: DEMO_SHELTER_ID,
        requestingShelterName: DEMO_SHELTER_NAME,
        shelterCoordinates: DEMO_SHELTER_COORDS,
        items: selectedItems,
        targetMode: mode,
        targetProviderIds,
      });

      // Navigate to order detail view
      navigate(`/orders/${newOrder.orderId}`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to submit order.');
      setSubmitting(false);
    }
  };

  return (
    <div className="part3-container">
      {/* Header */}
      <header className="part3-top-header">
        <div className="part3-top-header__left">
          <button
            type="button"
            className="part3-back-btn"
            onClick={() => navigate('/service/dashboard')}
            title="Back"
          >
            ←
          </button>
          <div className="part3-top-header__title-group">
            <h1 className="part3-top-header__title">Request Relief Supplies</h1>
            <span className="part3-top-header__subtitle">{DEMO_SHELTER_NAME}</span>
          </div>
        </div>
        <span className="part3-badge part3-badge--primary">📦 New Order</span>
      </header>

      <main className="orders-screen">
        {notice && (
          <div className="part3-badge part3-badge--success" style={{ width: '100%', padding: '10px 14px' }}>
            {notice}
          </div>
        )}

        {/* Section 1: Depletion & Stock Intensity Alerts */}
        <section>
          <div className="svc-section-header" style={{ marginBottom: '12px' }}>
            <h2 className="svc-section-title">
              <span>⚠️ Predictive Depletion Alerts</span>
            </h2>
            <span className="part3-form-hint">AI Consumption Engine</span>
          </div>
          <LowStockAlertList
            predictions={lowStockAlerts}
            onQuickAdd={handleQuickAdd}
          />
        </section>

        {/* Section 2: Catalog Resource Selection */}
        <section>
          <div className="svc-section-header" style={{ marginBottom: '12px' }}>
            <h2 className="svc-section-title">
              <span>🛍️ Select Required Supplies</span>
            </h2>
            <span className="part3-form-hint">{selectedItems.length} selected</span>
          </div>
          <OrderItemSelector
            selectedItems={selectedItems}
            onChange={setSelectedItems}
          />
        </section>

        {/* Section 3: Target Dispatch Mode */}
        <section>
          <div className="svc-section-header" style={{ marginBottom: '12px' }}>
            <h2 className="svc-section-title">
              <span>🛰️ Provider Dispatch Routing</span>
            </h2>
          </div>
          <ProviderSelectionMode
            mode={mode}
            onModeChange={setMode}
            availableProviders={providers}
            selectedSingleProviderId={selectedSingleProviderId}
            onSelectSingleProvider={setSelectedSingleProviderId}
          />
        </section>

        {/* Section 4: Summary Card & Broadcast CTA */}
        <OrderSummaryCard
          items={selectedItems}
          mode={mode}
          targetCount={providers.length}
          shelterName={DEMO_SHELTER_NAME}
          submitting={submitting}
          onSubmit={handleSubmitOrder}
        />
      </main>
    </div>
  );
}
