/**
 * VYNTRA — Prepare Item Checklist Component
 * Interactive item inspection checklist with progress bar and verification badges.
 */

import type { OrderItem } from '../../../shared/types';

interface PrepareItemChecklistProps {
  items: OrderItem[];
  checkedMap: Record<string, boolean>;
  onToggle: (itemName: string) => void;
}

export default function PrepareItemChecklist({
  items,
  checkedMap,
  onToggle,
}: PrepareItemChecklistProps) {
  const verifiedCount = items.filter((i) => checkedMap[i.itemName]).length;
  const progressPercent = Math.round((verifiedCount / items.length) * 100);

  return (
    <div>
      {/* Progress Card */}
      <div className="prep-progress-card" style={{ marginBottom: '14px' }}>
        <div className="prep-progress-header">
          <span>Inspection Verification Gate</span>
          <span style={{ color: progressPercent === 100 ? 'var(--color-tertiary)' : 'var(--color-primary)' }}>
            {verifiedCount} of {items.length} Verified ({progressPercent}%)
          </span>
        </div>
        <div className="prep-progress-bar-bg">
          <div
            className={`prep-progress-bar-fill ${progressPercent === 100 ? 'complete' : ''}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Checklist items */}
      <div className="checklist-container">
        {items.map((item) => {
          const isChecked = Boolean(checkedMap[item.itemName]);

          return (
            <div
              key={item.itemName}
              className={`checklist-item ${isChecked ? 'checked' : ''}`}
              onClick={() => onToggle(item.itemName)}
              role="checkbox"
              aria-checked={isChecked}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  onToggle(item.itemName);
                }
              }}
            >
              <div className="checklist-checkbox">
                {isChecked && '✓'}
              </div>

              <div className="checklist-item-details">
                <span className="checklist-item-name">{item.itemName}</span>
                <span className="checklist-item-qty">
                  Quantity Required: <strong>{item.requestedQuantity} Units</strong>
                </span>
              </div>

              <span
                className={`part3-badge ${isChecked ? 'part3-badge--success' : 'part3-badge--warning'}`}
              >
                {isChecked ? 'Ready & Loaded' : 'Awaiting Check'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
