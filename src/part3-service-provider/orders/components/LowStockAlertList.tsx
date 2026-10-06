/**
 * VYNTRA — Low Stock Alert List Component
 * Shows predicted depletion alerts and one-tap auto-reorder triggers.
 */

import type { StockPrediction } from '../stock-predictor';

interface LowStockAlertListProps {
  predictions: StockPrediction[];
  onQuickAdd: (prediction: StockPrediction) => void;
}

export default function LowStockAlertList({ predictions, onQuickAdd }: LowStockAlertListProps) {
  if (predictions.length === 0) {
    return (
      <div className="svc-empty-state">
        <div className="svc-empty-icon">🛡️</div>
        <p style={{ margin: 0, fontWeight: 600 }}>All shelter resources are currently above minimum safety thresholds.</p>
      </div>
    );
  }

  return (
    <div>
      {predictions.map((pred) => (
        <article
          key={pred.itemId}
          className="low-stock-card"
          style={{
            borderColor: pred.stockStatus === 'critical' ? 'var(--color-primary)' : 'var(--color-warning)',
            backgroundColor: pred.stockStatus === 'critical' ? 'var(--color-priority-1-bg)' : 'var(--color-warning-surface)',
          }}
        >
          <div className="low-stock-card__header">
            <h4 className="low-stock-card__title">
              {pred.stockStatus === 'critical' ? '🚨' : '⚠️'} {pred.itemName}
            </h4>
            <span
              className="low-stock-prediction-pill"
              style={{
                borderColor: pred.stockStatus === 'critical' ? 'var(--color-priority-1-stroke)' : 'var(--color-warning)',
                color: pred.stockStatus === 'critical' ? 'var(--color-priority-1-text)' : 'var(--color-warning-text)',
              }}
            >
              ~{pred.estimatedRemainingHours}h supply left
            </span>
          </div>

          <div className="low-stock-meta">
            <span>
              Current: <strong>{pred.currentQuantity}</strong> / Req Min: <strong>{pred.requiredMinimum}</strong>
            </span>
            <span>
              Intensity: <strong>~{pred.dailyUsageRate}/day</strong>
            </span>
          </div>

          <p style={{ margin: '2px 0 6px', fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
            {pred.reason}
          </p>

          <button
            type="button"
            className="part3-btn part3-btn--outline"
            style={{
              minHeight: '44px',
              fontSize: '13px',
              padding: '0 16px',
              alignSelf: 'flex-start',
              borderColor: pred.stockStatus === 'critical' ? 'var(--color-primary)' : 'var(--color-warning)',
              color: pred.stockStatus === 'critical' ? 'var(--color-primary)' : 'var(--color-warning-text)',
              backgroundColor: '#fff',
            }}
            onClick={() => onQuickAdd(pred)}
          >
            <span>+ Add Recommended {pred.recommendedReorderQuantity} Units to Order</span>
          </button>
        </article>
      ))}
    </div>
  );
}
