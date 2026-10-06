/**
 * VYNTRA — Order Summary Card Component
 * Summarizes replenishment items, quantities, target providers, and submission trigger.
 */

import type { OrderItem } from '../../../shared/types';

interface OrderSummaryCardProps {
  items: OrderItem[];
  mode: 'five-nearest' | 'single';
  targetCount: number;
  shelterName: string;
  submitting: boolean;
  onSubmit: () => void;
}

export default function OrderSummaryCard({
  items,
  mode,
  targetCount,
  shelterName,
  submitting,
  onSubmit,
}: OrderSummaryCardProps) {
  const totalQuantity = items.reduce((sum, item) => sum + item.requestedQuantity, 0);

  return (
    <div className="order-summary-card">
      <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)' }}>
        📋 Order Dispatch Summary
      </h3>

      <div className="order-summary-row">
        <span style={{ color: 'var(--color-on-surface-variant)' }}>Requesting Shelter:</span>
        <strong style={{ color: 'var(--color-on-surface)' }}>{shelterName}</strong>
      </div>

      <div className="order-summary-row">
        <span style={{ color: 'var(--color-on-surface-variant)' }}>Resource Categories:</span>
        <strong>{items.length} unique supplies</strong>
      </div>

      <div className="order-summary-row">
        <span style={{ color: 'var(--color-on-surface-variant)' }}>Target Mechanism:</span>
        <span>
          {mode === 'five-nearest' ? `⚡ 5 Nearest Depots (${targetCount} active)` : '🎯 1 Dedicated Provider'}
        </span>
      </div>

      <div className="order-summary-row order-summary-total">
        <span>Total Units Requested:</span>
        <span style={{ color: 'var(--color-primary)' }}>{totalQuantity} Units</span>
      </div>

      <button
        type="button"
        className="part3-btn part3-btn--primary"
        style={{ width: '100%', minHeight: '56px', fontSize: '16px', marginTop: '6px' }}
        disabled={items.length === 0 || submitting}
        onClick={onSubmit}
      >
        {submitting ? (
          <>
            <span className="loading-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
            <span>Broadcasting Replenishment Order...</span>
          </>
        ) : (
          <>
            <span>🚀 Transmit Order to Providers</span>
            <span>→</span>
          </>
        )}
      </button>

      {items.length === 0 && (
        <p style={{ margin: 0, textAlign: 'center', fontSize: '12px', color: 'var(--color-error)' }}>
          Please select at least one item to generate an order.
        </p>
      )}
    </div>
  );
}
