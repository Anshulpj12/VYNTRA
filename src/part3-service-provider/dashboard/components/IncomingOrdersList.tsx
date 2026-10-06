/**
 * VYNTRA — Incoming Orders List Component
 * Shows pending resource requests from nearby shelters with First-Acceptance mechanism.
 */

import { useState } from 'react';
import type { Order, ServiceProvider } from '../../../shared/types';
import { calculateDistance } from '../../../shared/utils/geo-distance';

interface IncomingOrdersListProps {
  orders: Order[];
  currentProvider: ServiceProvider;
  onAcceptOrder: (orderId: string) => Promise<void>;
  onViewOrder: (orderId: string) => void;
}

export default function IncomingOrdersList({
  orders,
  currentProvider,
  onAcceptOrder,
  onViewOrder,
}: IncomingOrdersListProps) {
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  if (orders.length === 0) {
    return (
      <div className="svc-empty-state">
        <div className="svc-empty-icon">📬</div>
        <h4 style={{ margin: '0 0 4px', fontSize: '15px' }}>No Pending Resource Requests</h4>
        <p style={{ margin: 0, fontSize: '12px' }}>
          New orders broadcast by nearby emergency shelters will appear here for first acceptance.
        </p>
      </div>
    );
  }

  return (
    <div>
      {orders.map((order) => {
        const distanceKm = Number(
          calculateDistance(currentProvider.coordinates, order.shelterCoordinates).toFixed(1)
        );

        return (
          <article key={order.orderId} className="svc-order-card">
            <div className="svc-order-card__top">
              <div>
                <h3 className="svc-order-shelter-name">{order.requestingShelterName}</h3>
                <span className="svc-order-distance">
                  📍 <strong>{distanceKm} km</strong> from depot • {order.items.length} items requested
                </span>
              </div>
              <span className="part3-badge part3-badge--warning">PENDING QUEUE</span>
            </div>

            {/* Items summary */}
            <div className="svc-order-items-preview">
              {order.items.map((item) => (
                <span key={item.itemName} className="svc-order-item-chip">
                  {item.requestedQuantity}x {item.itemName}
                </span>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                className="part3-btn part3-btn--outline"
                style={{ minHeight: '44px', fontSize: '13px', padding: '0 12px' }}
                onClick={() => onViewOrder(order.orderId)}
              >
                Inspect Details
              </button>

              <button
                type="button"
                className="svc-first-accept-btn"
                style={{ minHeight: '44px', fontSize: '13px' }}
                disabled={acceptingId === order.orderId}
                onClick={async () => {
                  setAcceptingId(order.orderId);
                  await onAcceptOrder(order.orderId);
                  setAcceptingId(null);
                }}
              >
                {acceptingId === order.orderId ? (
                  <span>Claiming Order...</span>
                ) : (
                  <>
                    <span>⚡ Claim & Accept First</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
