/**
 * VYNTRA — Delivery Confirmation Screen
 * Shelter provider verifies arrival of resources, confirms receipt,
 * and triggers automatic inventory update.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Order } from '../../shared/types';
import { getOrderById } from '../orders/order-service';
import { confirmDeliveryAndAutoUpdateInventory } from './dispatch-service';
import DeliveryReceiptCard from './components/DeliveryReceiptCard';
import InventoryAutoUpdateBanner from './components/InventoryAutoUpdateBanner';
import '../styles/part3-base.css';
import '../styles/dispatch.css';

export default function DeliveryConfirmationScreen() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [syncedCount, setSyncedCount] = useState<number | null>(null);

  useEffect(() => {
    if (!orderId) return;
    getOrderById(orderId).then((ord) => {
      setOrder(ord);
      if (ord && ord.status === 'confirmed') {
        setSyncedCount(ord.items.length);
      }
      setLoading(false);
    });
  }, [orderId]);

  const handleConfirmReceipt = async () => {
    if (!order) return;
    setConfirming(true);

    const res = await confirmDeliveryAndAutoUpdateInventory(order.orderId);
    if (res.success) {
      setSyncedCount(res.updatedItemsCount);
      // Re-fetch order to reflect confirmed status
      const updated = await getOrderById(order.orderId);
      if (updated) setOrder(updated);
    }
    setConfirming(false);
  };

  if (loading) {
    return (
      <div className="part3-container">
        <div className="loading-screen">
          <div className="loading-spinner" />
          <p>Verifying delivery status...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="part3-container">
        <header className="part3-top-header">
          <button type="button" className="part3-back-btn" onClick={() => navigate('/service/dashboard')}>
            ←
          </button>
          <div className="part3-top-header__title-group">
            <h1 className="part3-top-header__title">Delivery Not Found</h1>
          </div>
        </header>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <p>Order record not found.</p>
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
            onClick={() => navigate(`/orders/${order.orderId}`)}
            title="Back"
          >
            ←
          </button>
          <div className="part3-top-header__title-group">
            <h1 className="part3-top-header__title">Delivery Confirmation</h1>
            <span className="part3-top-header__subtitle">{order.requestingShelterName}</span>
          </div>
        </div>
        <span className="part3-badge part3-badge--success">📦 Handover</span>
      </header>

      <main className="dispatch-screen">
        {syncedCount !== null && (
          <InventoryAutoUpdateBanner
            itemsCount={syncedCount}
            shelterName={order.requestingShelterName}
          />
        )}

        <DeliveryReceiptCard
          order={order}
          confirming={confirming}
          onConfirmReceipt={handleConfirmReceipt}
        />

        <button
          type="button"
          className="part3-btn part3-btn--outline"
          style={{ width: '100%', minHeight: '52px' }}
          onClick={() => navigate('/service/dashboard')}
        >
          <span>Return to Service Dashboard</span>
        </button>
      </main>
    </div>
  );
}
