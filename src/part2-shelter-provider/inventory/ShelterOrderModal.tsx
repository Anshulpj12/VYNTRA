/**
 * VYNTRA Part 2 — Shelter Order Modal
 * 
 * Interactive dialog allowing shelter managers to order supplies from
 * registered emergency service providers, either broadcasting to the
 * 5 nearest depots or targeting a specific logistics provider.
 * 
 * @module part2-shelter-provider/inventory/ShelterOrderModal
 */

import { useState, useEffect } from 'react';
import type { InventoryItem, OrderItem, ShelterProvider } from '../../shared/types';
import {
  getActiveServiceProviders,
  createShelterReplenishmentOrder,
  type ProviderWithDistance,
} from './shelter-order-service';

interface ShelterOrderModalProps {
  shelter: ShelterProvider;
  shortageItems: InventoryItem[];
  allInventory: InventoryItem[];
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (orderId: string) => void;
}

export default function ShelterOrderModal({
  shelter,
  shortageItems,
  allInventory,
  isOpen,
  onClose,
  onOrderCreated,
}: ShelterOrderModalProps) {
  const [providers, setProviders] = useState<ProviderWithDistance[]>([]);
  const [targetMode, setTargetMode] = useState<'five-nearest' | 'single'>('five-nearest');
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemQty, setCustomItemQty] = useState('10');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize order items with shortage items and recommended quantities
  useEffect(() => {
    if (isOpen) {
      const initial: OrderItem[] = shortageItems.map((item) => {
        const deficit = Math.max(10, item.requiredMinimum * 2 - item.currentQuantity);
        return {
          itemName: item.itemName,
          requestedQuantity: deficit,
        };
      });

      // If no shortage, offer first few inventory items as baseline
      if (initial.length === 0 && allInventory.length > 0) {
        initial.push({
          itemName: allInventory[0].itemName,
          requestedQuantity: 20,
        });
      }

      setOrderItems(initial);
      setError(null);
    }
  }, [isOpen, shortageItems, allInventory]);

  // Load registered providers with distance calculation
  useEffect(() => {
    if (isOpen) {
      void getActiveServiceProviders(shelter.coordinates).then((list) => {
        setProviders(list);
        if (list.length > 0) {
          setSelectedProviderId(list[0].providerId);
        }
      });
    }
  }, [isOpen, shelter.coordinates]);

  if (!isOpen) return null;

  const handleUpdateQty = (index: number, delta: number) => {
    setOrderItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const newQty = Math.max(1, item.requestedQuantity + delta);
        return { ...item, requestedQuantity: newQty };
      })
    );
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCustomItem = () => {
    if (!customItemName.trim()) return;
    const qty = parseInt(customItemQty, 10) || 10;
    setOrderItems((prev) => [...prev, { itemName: customItemName.trim(), requestedQuantity: qty }]);
    setCustomItemName('');
    setCustomItemQty('10');
  };

  const handleSubmit = async () => {
    if (orderItems.length === 0) {
      setError('Please add at least one item to order.');
      return;
    }

    if (targetMode === 'single' && !selectedProviderId) {
      setError('Please select a service provider depot from the list.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const targetProviderIds =
        targetMode === 'single'
          ? [selectedProviderId]
          : providers.length > 0
          ? providers.slice(0, 5).map((p) => p.providerId)
          : ['VYNTRA-SVC-JBP01DEP', 'VYNTRA-SVC-BHP02MED'];

      const created = await createShelterReplenishmentOrder({
        requestingShelterId: shelter.shelterId,
        requestingShelterName: shelter.shelterName,
        shelterCoordinates: shelter.coordinates,
        items: orderItems,
        targetMode,
        targetProviderIds,
      });

      onOrderCreated(created.orderId);
      onClose();
    } catch (e) {
      console.error('Order submission error:', e);
      setError(e instanceof Error ? e.message : 'Failed to submit order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        className="part2-card part2-card--elevated"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px',
          borderRadius: '16px',
          background: 'var(--vyntra-surface)',
          border: '1.5px solid var(--vyntra-border)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--vyntra-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Autonomous Replenishment Gateway
            </span>
            <h2 className="text-headline-md" style={{ marginTop: '2px' }}>
              📦 Order Emergency Supplies
            </h2>
          </div>
          <button
            type="button"
            className="part2-btn part2-btn--ghost part2-btn--sm"
            onClick={onClose}
            style={{ fontSize: '18px', padding: '4px 8px' }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(217, 83, 79, 0.1)', color: 'var(--vyntra-error)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Shortage context banner */}
        {shortageItems.length > 0 && (
          <div style={{ padding: '12px 14px', background: 'rgba(224, 159, 62, 0.12)', border: '1px solid rgba(224, 159, 62, 0.3)', borderRadius: '10px', marginBottom: '16px', fontSize: '13px' }}>
            <strong>🚨 {shortageItems.length} Buffer Depletion Alert(s):</strong> Below minimum safe threshold ({shortageItems.map((i) => i.itemName).join(', ')}). Pre-loaded below with recommended restock batches.
          </div>
        )}

        {/* Items to order */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
            Items & Requested Quantities ({orderItems.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
            {orderItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--vyntra-surface-variant)',
                  borderRadius: '8px',
                  border: '1px solid var(--vyntra-border)',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '14px' }}>
                  {item.itemName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      className="part2-btn part2-btn--ghost part2-btn--sm"
                      style={{ padding: '2px 8px', minWidth: '28px', height: '28px' }}
                      onClick={() => handleUpdateQty(idx, -5)}
                    >
                      -
                    </button>
                    <span style={{ fontWeight: 700, minWidth: '40px', textAlign: 'center' }}>
                      {item.requestedQuantity}
                    </span>
                    <button
                      type="button"
                      className="part2-btn part2-btn--ghost part2-btn--sm"
                      style={{ padding: '2px 8px', minWidth: '28px', height: '28px' }}
                      onClick={() => handleUpdateQty(idx, 5)}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className="part2-btn part2-btn--ghost part2-btn--sm"
                    style={{ color: 'var(--vyntra-error)', padding: '2px 6px' }}
                    onClick={() => handleRemoveItem(idx)}
                    title="Remove item"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add custom item */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <input
              className="part2-input"
              style={{ flex: 1 }}
              placeholder="Add other supply or medicine..."
              value={customItemName}
              onChange={(e) => setCustomItemName(e.target.value)}
            />
            <input
              className="part2-input"
              type="number"
              style={{ width: '80px' }}
              min="1"
              value={customItemQty}
              onChange={(e) => setCustomItemQty(e.target.value)}
            />
            <button
              type="button"
              className="part2-btn part2-btn--secondary part2-btn--sm"
              onClick={handleAddCustomItem}
            >
              ＋ Add
            </button>
          </div>
        </div>

        {/* Target Provider Mode */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
            Dispatch Target Mode
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div
              onClick={() => setTargetMode('five-nearest')}
              style={{
                padding: '12px',
                borderRadius: '10px',
                border: `2px solid ${targetMode === 'five-nearest' ? 'var(--vyntra-primary)' : 'var(--vyntra-border)'}`,
                background: targetMode === 'five-nearest' ? 'rgba(214, 90, 90, 0.08)' : 'transparent',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>
                ⚡ 5 Nearest Providers
              </div>
              <div style={{ fontSize: '12px', color: 'var(--vyntra-on-surface-muted)' }}>
                Broadcast simultaneously to top 5 closest depots. First provider to accept locks the dispatch.
              </div>
            </div>

            <div
              onClick={() => setTargetMode('single')}
              style={{
                padding: '12px',
                borderRadius: '10px',
                border: `2px solid ${targetMode === 'single' ? 'var(--vyntra-primary)' : 'var(--vyntra-border)'}`,
                background: targetMode === 'single' ? 'rgba(214, 90, 90, 0.08)' : 'transparent',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>
                🎯 Specific Depot
              </div>
              <div style={{ fontSize: '12px', color: 'var(--vyntra-on-surface-muted)' }}>
                Directly route this order to one chosen registered provider organization.
              </div>
            </div>
          </div>

          {targetMode === 'single' && (
            <div className="part2-input-group">
              <label className="part2-input-group__label">Choose Service Provider</label>
              <select
                className="part2-select"
                value={selectedProviderId}
                onChange={(e) => setSelectedProviderId(e.target.value)}
              >
                {providers.map((p) => (
                  <option key={p.providerId} value={p.providerId}>
                    {p.providerName} ({p.district}, {p.formattedDistance})
                  </option>
                ))}
              </select>
            </div>
          )}

          {targetMode === 'five-nearest' && providers.length > 0 && (
            <div style={{ background: 'var(--vyntra-surface-variant)', padding: '10px 14px', borderRadius: '8px', fontSize: '12px' }}>
              <strong>Target Depots within Reach:</strong>{' '}
              {providers.slice(0, 5).map((p) => `${p.providerName} (${p.formattedDistance})`).join(' • ')}
            </div>
          )}
        </div>

        {/* Modal actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            className="part2-btn part2-btn--ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="part2-btn part2-btn--primary"
            onClick={handleSubmit}
            disabled={isSubmitting || orderItems.length === 0}
            style={{ minWidth: '180px' }}
          >
            {isSubmitting ? 'Transmitting Order...' : '🚀 Submit Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
