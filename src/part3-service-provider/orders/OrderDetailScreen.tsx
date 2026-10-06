/**
 * VYNTRA — Order Detail Screen
 * Displays order timeline, current fulfillment stage, item list, and actions.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Order } from '../../shared/types';
import { getOrderById } from './order-service';
import '../styles/part3-base.css';
import '../styles/orders.css';

const STAGES: { key: Order['status']; label: string; desc: string }[] = [
  { key: 'pending', label: 'Broadcast Pending', desc: 'Awaiting first provider acceptance' },
  { key: 'accepted', label: 'Accepted by Provider', desc: 'Assigned to supply depot' },
  { key: 'preparing', label: 'Verifying & Packaging', desc: 'Checklist inspection in progress' },
  { key: 'dispatched', label: 'Dispatched En-Route', desc: 'Transport active to shelter' },
  { key: 'delivered', label: 'Delivered at Shelter', desc: 'Arrived at shelter location' },
  { key: 'confirmed', label: 'Receipt Confirmed', desc: 'Inventory synchronized' },
];

export default function OrderDetailScreen() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    getOrderById(orderId).then((res) => {
      setOrder(res);
      setLoading(false);
    });
  }, [orderId]);

  if (loading) {
    return (
      <div className="part3-container">
        <div className="loading-screen">
          <div className="loading-spinner" />
          <p>Retrieving order telemetry...</p>
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
            <h1 className="part3-top-header__title">Order Not Found</h1>
          </div>
        </header>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <p>Order ID {orderId} could not be located in cache or database.</p>
          <button
            type="button"
            className="part3-btn part3-btn--primary"
            onClick={() => navigate('/service/dashboard')}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentStageIndex = STAGES.findIndex((s) => s.key === order.status);

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
            <h1 className="part3-top-header__title">Order Telemetry</h1>
            <span className="part3-top-header__subtitle">{order.orderId}</span>
          </div>
        </div>
        <span
          className={`part3-badge ${
            order.status === 'confirmed'
              ? 'part3-badge--success'
              : order.status === 'pending'
              ? 'part3-badge--warning'
              : 'part3-badge--primary'
          }`}
        >
          {order.status.toUpperCase()}
        </span>
      </header>

      <main className="orders-screen">
        {/* Order Meta Card */}
        <div className="part3-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="part3-form-hint">Destination Shelter</span>
            <span className="part3-badge part3-badge--secondary">
              📍 {order.shelterCoordinates.lat}, {order.shelterCoordinates.lng}
            </span>
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '6px 0 2px' }}>
            {order.requestingShelterName}
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
            Shelter ID: {order.requestingShelterId}
          </span>
        </div>

        {/* Timeline Progression */}
        <div className="part3-card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0' }}>
            Fulfillment Stage Pipeline
          </h3>
          <div className="order-timeline">
            {STAGES.map((stage, idx) => {
              const isCompleted = idx < currentStageIndex;
              const isActive = idx === currentStageIndex;

              return (
                <div
                  key={stage.key}
                  className={`timeline-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
                >
                  <div className="timeline-node">
                    {isCompleted ? '✓' : idx + 1}
                  </div>
                  <div className="timeline-content">
                    <h4 className="timeline-title">{stage.label}</h4>
                    <span className="timeline-sub">{stage.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Item List */}
        <div className="part3-card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 12px 0' }}>
            Requested Relief Supplies ({order.items.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {order.items.map((item) => (
              <div
                key={item.itemName}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: 'var(--color-surface-container-low)',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '14px' }}>{item.itemName}</span>
                <span className="part3-badge part3-badge--primary" style={{ fontSize: '13px' }}>
                  {item.requestedQuantity} Units
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action button depending on status */}
        {order.status === 'accepted' || order.status === 'preparing' ? (
          <button
            type="button"
            className="part3-btn part3-btn--primary"
            style={{ width: '100%', minHeight: '56px' }}
            onClick={() => navigate(`/dispatch/${order.orderId}`)}
          >
            <span>Proceed to Item Preparation & Verification Checklist</span>
            <span>→</span>
          </button>
        ) : order.status === 'dispatched' || order.status === 'delivered' ? (
          <button
            type="button"
            className="part3-btn part3-btn--secondary"
            style={{ width: '100%', minHeight: '56px' }}
            onClick={() => navigate(`/dispatch/confirm/${order.orderId}`)}
          >
            <span>Shelter Delivery & Inventory Confirmation</span>
            <span>→</span>
          </button>
        ) : order.status === 'confirmed' ? (
          <div className="auto-update-banner">
            <span className="auto-update-banner__icon">✅</span>
            <div className="auto-update-banner__content">
              <h4 className="auto-update-banner__title">Delivery Confirmed & Stock Synced</h4>
              <p className="auto-update-banner__text">
                All {order.items.length} items have been confirmed by the shelter and automatically merged into shelter inventory metadata.
              </p>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
