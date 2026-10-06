/**
 * VYNTRA — Order Dispatch & Preparation Screen
 * Service Provider checklist verification with strict 100% preparation gate.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Order } from '../../shared/types';
import { getOrderById } from '../orders/order-service';
import {
  getStoredChecklist,
  saveStoredChecklist,
  markOrderPreparing,
  authorizeDispatch,
} from './dispatch-service';
import PrepareItemChecklist from './components/PrepareItemChecklist';
import DispatchButton from './components/DispatchButton';
import '../styles/part3-base.css';
import '../styles/dispatch.css';

export default function DispatchScreen() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    getOrderById(orderId).then((ord) => {
      setOrder(ord);
      if (ord) {
        // Load saved checklist or set empty
        const saved = getStoredChecklist(ord.orderId);
        setCheckedMap(saved);
        // Mark preparing if accepted
        if (ord.status === 'accepted') {
          markOrderPreparing(ord.orderId);
        }
      }
      setLoading(false);
    });
  }, [orderId]);

  const handleToggle = (itemName: string) => {
    if (!order) return;
    const nextState = { ...checkedMap, [itemName]: !checkedMap[itemName] };
    setCheckedMap(nextState);
    saveStoredChecklist(order.orderId, nextState);
    setErrorNotice(null);
  };

  const handleAuthorizeDispatch = async () => {
    if (!order) return;
    setSubmitting(true);
    setErrorNotice(null);

    const verified = Object.keys(checkedMap).filter((k) => checkedMap[k]);
    const res = await authorizeDispatch(order.orderId, verified);

    if (res.success) {
      navigate(`/orders/${order.orderId}`);
    } else {
      setErrorNotice(res.error || 'Failed to authorize dispatch.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="part3-container">
        <div className="loading-screen">
          <div className="loading-spinner" />
          <p>Loading dispatch checklist...</p>
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
          <p>Order not located.</p>
        </div>
      </div>
    );
  }

  const isFullyPrepared =
    order.items.length > 0 &&
    order.items.every((i) => checkedMap[i.itemName]);

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
            <h1 className="part3-top-header__title">Dispatch Preparation</h1>
            <span className="part3-top-header__subtitle">{order.requestingShelterName}</span>
          </div>
        </div>
        <span className="part3-badge part3-badge--secondary">Order #{order.orderId.slice(-6)}</span>
      </header>

      <main className="dispatch-screen">
        {errorNotice && (
          <div className="part3-error-alert">
            <span>⚠️</span>
            <span>{errorNotice}</span>
          </div>
        )}

        {/* Shelter Destination Info */}
        <div className="part3-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="part3-form-hint">Destination Hub</span>
            <span className="part3-badge part3-badge--secondary">
              GPS: {order.shelterCoordinates.lat}, {order.shelterCoordinates.lng}
            </span>
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '6px 0 2px' }}>
            {order.requestingShelterName}
          </h2>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
            Inspect every relief item before loading into rapid transport vehicle.
          </p>
        </div>

        {/* Verification Checklist */}
        <section>
          <PrepareItemChecklist
            items={order.items}
            checkedMap={checkedMap}
            onToggle={handleToggle}
          />
        </section>

        {/* Dispatch Gate */}
        <DispatchButton
          isFullyPrepared={isFullyPrepared}
          submitting={submitting}
          onDispatch={handleAuthorizeDispatch}
        />
      </main>
    </div>
  );
}
