/**
 * VYNTRA — Order Item Selector Component
 * Browse and select essential emergency relief supplies.
 */

import { useState } from 'react';
import type { OrderItem } from '../../../shared/types';
import QuantityInput from './QuantityInput';

interface OrderItemSelectorProps {
  selectedItems: OrderItem[];
  onChange: (items: OrderItem[]) => void;
}

const CATALOG_ITEMS = [
  { name: 'Dignity & Sanitary Pad Bundles', category: 'Hygiene & Care', defaultQty: 50 },
  { name: 'Menstrual Relief & Thermal Packs', category: 'Hygiene & Care', defaultQty: 25 },
  { name: 'Antiseptic & Trauma First Aid Kits', category: 'Medical Support', defaultQty: 15 },
  { name: 'Folding Heavy-Duty Medical Stretchers', category: 'Emergency Mobility', defaultQty: 2 },
  { name: 'Adult / Pediatric Wheelchair Units', category: 'Emergency Mobility', defaultQty: 2 },
  { name: 'Sterile Delivery & Obstetric Kits', category: 'Medical Support', defaultQty: 5 },
  { name: 'Emergency Thermal Blankets & Bedding', category: 'Sanitation & Shelter', defaultQty: 30 },
  { name: 'Infant Milk & Nutrition Formula', category: 'Food & Nutrition', defaultQty: 20 },
];

export default function OrderItemSelector({ selectedItems, onChange }: OrderItemSelectorProps) {
  const [customName, setCustomName] = useState('');
  const [customQty, setCustomQty] = useState(10);

  const isSelected = (name: string) => selectedItems.some((i) => i.itemName === name);

  const getItemQuantity = (name: string) => {
    const item = selectedItems.find((i) => i.itemName === name);
    return item ? item.requestedQuantity : 0;
  };

  const handleToggle = (name: string, defaultQty: number) => {
    if (isSelected(name)) {
      onChange(selectedItems.filter((i) => i.itemName !== name));
    } else {
      onChange([...selectedItems, { itemName: name, requestedQuantity: defaultQty }]);
    }
  };

  const handleUpdateQty = (name: string, newQty: number) => {
    onChange(
      selectedItems.map((i) =>
        i.itemName === name ? { ...i, requestedQuantity: newQty } : i
      )
    );
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    if (isSelected(customName.trim())) {
      handleUpdateQty(customName.trim(), customQty);
    } else {
      onChange([...selectedItems, { itemName: customName.trim(), requestedQuantity: customQty }]);
    }
    setCustomName('');
    setCustomQty(10);
  };

  return (
    <div className="order-catalog-grid">
      {CATALOG_ITEMS.map((item) => {
        const checked = isSelected(item.name);
        const qty = getItemQuantity(item.name);

        return (
          <div
            key={item.name}
            className={`order-catalog-item ${checked ? 'selected' : ''}`}
            onClick={() => handleToggle(item.name, item.defaultQty)}
            style={{ cursor: 'pointer' }}
          >
            <div className="order-catalog-item__info">
              <span className="order-catalog-item__name">
                {checked ? '✓ ' : '+ '}
                {item.name}
              </span>
              <span className="order-catalog-item__category">{item.category}</span>
            </div>

            {checked && (
              <QuantityInput
                value={qty}
                onChange={(q) => handleUpdateQty(item.name, q)}
                step={5}
                min={1}
              />
            )}
          </div>
        );
      })}

      {/* Add Custom Item Row */}
      <div
        className="part3-card"
        style={{ padding: '14px', background: 'var(--color-surface-container-low)', marginTop: '6px' }}
      >
        <span className="part3-form-hint" style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>
          + Add Custom / Unlisted Resource
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            className="part3-form-input"
            style={{ minHeight: '44px', padding: '8px 12px', flex: 1 }}
            placeholder="e.g. Incontinence Pads (Box of 50)"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
          />
          <input
            type="number"
            className="part3-form-input"
            style={{ minHeight: '44px', width: '70px', padding: '8px' }}
            value={customQty}
            onChange={(e) => setCustomQty(parseInt(e.target.value, 10) || 1)}
            min={1}
          />
          <button
            type="button"
            className="part3-btn part3-btn--secondary"
            style={{ minHeight: '44px', padding: '0 16px', fontSize: '13px' }}
            onClick={handleAddCustom}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
