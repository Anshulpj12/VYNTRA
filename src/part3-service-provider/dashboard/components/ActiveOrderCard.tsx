/**
 * VYNTRA — Active Order Card Component
 * Displays claimed dispatches, ongoing packaging checklists, and transit tracking.
 */

import type { Order } from '../../../shared/types';

interface ActiveOrderCardProps {
  order: Order;
  onOpenDispatch: (orderId: string) => void;
  onOpenConfirm: (orderId: string) => void;
}

export default function ActiveOrderCard({
  order,
  onOpenDispatch,
  onOpenConfirm,
}: ActiveOrderCardProps) {
  const isPreparingOrAccepted = order.status === 'accepted' || order.status === 'preparing';
  const isEnRoute = order.status === 'dispatched' || order.status === 'delivered';

  return (
    <article className="svc-order-card" style={{ borderColor: 'var(--color-secondary-surface-dim)' }}>
      <div className="svc-order-card__top">
        <div>
          <h3 className="svc-order-shelter-name">{order.requestingShelterName}</h3>
          <span className="svc-order-distance">
            Order #{order.orderId.slice(-6)} • {order.items.length} relief categories
          </span>
        </div>
        <span
          className={`part3-badge ${
            order.status === 'dispatched'
              ? 'part3-badge--secondary'
              : order.status === 'preparing'
              ? 'part3-badge--primary'
              : 'part3-badge--warning'
          }`}
        >
          {order.status === 'preparing'
            ? 'VERIFYING ITEMS'
            : order.status === 'dispatched'
            ? 'EN-ROUTE TRANSIT'
            : order.status.toUpperCase()}
        </span>
      </div>

      {/* Items Preview */}
      <div className="svc-order-items-preview">
        {order.items.map((item) => (
          <span key={item.itemName} className="svc-order-item-chip">
            {item.requestedQuantity}x {item.itemName}
          </span>
        ))}
      </div>

      {/* Action button */}
      {isPreparingOrAccepted && (
        <button
          type="button"
          className="part3-btn part3-btn--primary"
          style={{ width: '100%', minHeight: '44px', fontSize: '13px', marginTop: '4px' }}
          onClick={() => onOpenDispatch(order.orderId)}
        >
          <span>📋 Open Preparation Inspection Checklist</span>
          <span>→</span>
        </button>
      )}

      {isEnRoute && (
        <button
          type="button"
          className="part3-btn part3-btn--secondary"
          style={{ width: '100%', minHeight: '44px', fontSize: '13px', marginTop: '4px' }}
          onClick={() => onOpenConfirm(order.orderId)}
        >
          <span>📦 Confirm Arrival & Handover at Shelter</span>
          <span>→</span>
        </button>
      )}
    </article>
  );
}
