/**
 * VYNTRA Part 2 — Inventory & Equipment Management Screen
 * 
 * Full inventory management system for shelter equipment, supplies,
 * and resources. Includes usage tracking with person association.
 * 
 * @module part2-shelter-provider/inventory/InventoryScreen
 * @part Part 2 — Shelter Provider
 */

import { useState, useCallback } from 'react';
import { useShelter } from '../context/ShelterContext';
import { generateUniqueId } from '../../shared/utils/id-generator';
import { saveToCache, deleteFromCache, addToSyncQueue, STORES } from '../../shared/utils/offline-cache';
import type { InventoryItem, UsageLogEntry } from '../../shared/types';
import '../styles/inventory.css';

/** Category labels */
const CATEGORIES: Record<InventoryItem['category'], { label: string; icon: string }> = {
  hygiene: { label: 'Hygiene', icon: '🧴' },
  medical: { label: 'Medical', icon: '💊' },
  provisions: { label: 'Provisions', icon: '🍞' },
  bedding: { label: 'Bedding', icon: '🛏️' },
  emergency: { label: 'Emergency', icon: '🚨' },
  general: { label: 'General', icon: '📦' },
};

/**
 * Inventory management screen with:
 * - Item list with stock levels
 * - Add/edit/remove items
 * - Usage recording with optional person association
 * - Low-stock alerts
 */
export default function InventoryScreen() {
  const { state, dispatch } = useShelter();
  const { shelter, inventory } = state;

  const [showAddForm, setShowAddForm] = useState(false);
  const [showUsageForm, setShowUsageForm] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  /* Add form */
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<InventoryItem['category']>('general');
  const [newQuantity, setNewQuantity] = useState('10');
  const [newMinimum, setNewMinimum] = useState('5');

  /* Usage form */
  const [usageQty, setUsageQty] = useState('1');
  const [usagePersonId, setUsagePersonId] = useState('');
  const [usageNotes, setUsageNotes] = useState('');

  const lowStockItems = inventory.filter((i) => i.currentQuantity <= i.requiredMinimum);
  const filteredItems = activeCategory === 'all'
    ? inventory
    : inventory.filter((i) => i.category === activeCategory);

  /** Add a new inventory item */
  const handleAddItem = useCallback(async () => {
    if (!shelter || !newName.trim()) return;
    const now = Date.now();

    const item: InventoryItem = {
      itemId: generateUniqueId('INV'),
      shelterId: shelter.shelterId,
      itemName: newName.trim(),
      category: newCategory,
      currentQuantity: parseInt(newQuantity) || 0,
      requiredMinimum: parseInt(newMinimum) || 0,
      lastUpdatedAt: now,
    };

    await saveToCache(STORES.INVENTORY, item);
    await addToSyncQueue({
      id: `inv-${item.itemId}`,
      store: STORES.INVENTORY,
      operation: 'create',
      data: item,
      timestamp: now,
      retryCount: 0,
    });

    dispatch({ type: 'ADD_INVENTORY_ITEM', payload: item });
    setNewName('');
    setNewQuantity('10');
    setNewMinimum('5');
    setShowAddForm(false);
  }, [newName, newCategory, newQuantity, newMinimum, shelter, dispatch]);

  /** Record usage of an item */
  const handleRecordUsage = useCallback(async (item: InventoryItem) => {
    if (!shelter) return;
    const qty = parseInt(usageQty) || 1;
    if (qty <= 0 || qty > item.currentQuantity) return;

    const now = Date.now();

    /* Create usage log entry */
    const logEntry: UsageLogEntry = {
      logId: generateUniqueId('LOG'),
      itemId: item.itemId,
      shelterId: shelter.shelterId,
      quantityUsed: qty,
      associatedPersonId: usagePersonId.trim() || undefined,
      usedAt: now,
      notes: usageNotes.trim() || undefined,
    };

    await saveToCache(STORES.USAGE_LOG, logEntry);
    await addToSyncQueue({
      id: `log-${logEntry.logId}`,
      store: STORES.USAGE_LOG,
      operation: 'create',
      data: logEntry,
      timestamp: now,
      retryCount: 0,
    });

    /* Update item quantity */
    const updated: InventoryItem = {
      ...item,
      currentQuantity: item.currentQuantity - qty,
      lastUpdatedAt: now,
    };

    await saveToCache(STORES.INVENTORY, updated);
    await addToSyncQueue({
      id: `inv-update-${item.itemId}-${now}`,
      store: STORES.INVENTORY,
      operation: 'update',
      data: updated,
      timestamp: now,
      retryCount: 0,
    });

    dispatch({ type: 'UPDATE_INVENTORY_ITEM', payload: updated });

    /* Reset usage form */
    setShowUsageForm(null);
    setUsageQty('1');
    setUsagePersonId('');
    setUsageNotes('');
  }, [usageQty, usagePersonId, usageNotes, shelter, dispatch]);

  /** Quick adjust quantity */
  const handleQuickAdjust = useCallback(async (item: InventoryItem, delta: number) => {
    const newQty = Math.max(0, item.currentQuantity + delta);
    const now = Date.now();

    const updated: InventoryItem = {
      ...item,
      currentQuantity: newQty,
      lastUpdatedAt: now,
    };

    await saveToCache(STORES.INVENTORY, updated);
    dispatch({ type: 'UPDATE_INVENTORY_ITEM', payload: updated });
  }, [dispatch]);

  /** Remove an item */
  const handleRemoveItem = useCallback(async (itemId: string) => {
    if (!shelter) return;
    await deleteFromCache(STORES.INVENTORY, itemId);
    await addToSyncQueue({
      id: `inv-del-${itemId}`,
      store: STORES.INVENTORY,
      operation: 'delete',
      data: { itemId, shelterId: shelter.shelterId },
      timestamp: Date.now(),
      retryCount: 0,
    });
    dispatch({ type: 'REMOVE_INVENTORY_ITEM', payload: itemId });
  }, [shelter, dispatch]);

  /** Get stock health status */
  const getStockHealth = (item: InventoryItem): { label: string; className: string } => {
    const ratio = item.requiredMinimum > 0
      ? item.currentQuantity / item.requiredMinimum
      : item.currentQuantity > 0 ? 2 : 0;

    if (ratio <= 0.5) return { label: 'Critical', className: 'inventory__stock--critical' };
    if (ratio <= 1) return { label: 'Low Stock', className: 'inventory__stock--low' };
    if (ratio <= 1.5) return { label: 'Safe Margin', className: 'inventory__stock--safe' };
    return { label: 'Stable Stock', className: 'inventory__stock--stable' };
  };

  if (!shelter) return null;

  return (
    <div className="inventory" id="inventory-screen">
      {/* ─── Header ─── */}
      <div className="inventory__header">
        <div>
          <h1 className="text-headline-lg">Continuous Inventory & Auto-Dispatch Hub</h1>
          <p className="text-muted">
            Autonomous buffer-threshold replenishment linked to regional emergency logistics mesh.
          </p>
        </div>
        <div className="inventory__header-actions">
          <button
            className="part2-btn part2-btn--primary"
            onClick={() => setShowAddForm(true)}
            id="add-item-btn"
          >
            ＋ Add Item
          </button>
        </div>
      </div>

      {/* ─── Low Stock Alert ─── */}
      {lowStockItems.length > 0 && (
        <div className="inventory__alert" id="low-stock-alert">
          <div className="inventory__alert-icon">⚠️</div>
          <div className="inventory__alert-content">
            <strong>CRITICAL SAFETY BUFFER BREACHED</strong>
            <p>
              {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} below minimum threshold:{' '}
              {lowStockItems.map((i) => i.itemName).join(', ')}.
            </p>
          </div>
        </div>
      )}

      {/* ─── Category Filters ─── */}
      <div className="inventory__filters">
        <button
          className={`facilities__filter-btn ${activeCategory === 'all' ? 'facilities__filter-btn--active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          All Supplies ({inventory.length})
        </button>
        {Object.entries(CATEGORIES).map(([cat, config]) => (
          <button
            key={cat}
            className={`facilities__filter-btn ${activeCategory === cat ? 'facilities__filter-btn--active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {config.icon} {config.label}
          </button>
        ))}
      </div>

      {/* ─── Add Form ─── */}
      {showAddForm && (
        <div className="inventory__add-form part2-card part2-card--elevated" id="add-item-form">
          <h3 className="text-headline-sm" style={{ marginBottom: 'var(--vyntra-space-md)' }}>
            ＋ Add Inventory Item
          </h3>
          <div className="part2-grid part2-grid--2">
            <div className="part2-input-group">
              <label className="part2-input-group__label">Item Name</label>
              <input
                className="part2-input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Sanitary Pads & Menstrual Kits"
                id="new-item-name"
              />
            </div>
            <div className="part2-input-group">
              <label className="part2-input-group__label">Category</label>
              <select
                className="part2-select"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as InventoryItem['category'])}
                id="new-item-category"
              >
                {Object.entries(CATEGORIES).map(([cat, config]) => (
                  <option key={cat} value={cat}>{config.icon} {config.label}</option>
                ))}
              </select>
            </div>
            <div className="part2-input-group">
              <label className="part2-input-group__label">Current Quantity</label>
              <input
                className="part2-input"
                type="number"
                min="0"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                id="new-item-qty"
              />
            </div>
            <div className="part2-input-group">
              <label className="part2-input-group__label">Required Minimum (Safe Baseline)</label>
              <input
                className="part2-input"
                type="number"
                min="0"
                value={newMinimum}
                onChange={(e) => setNewMinimum(e.target.value)}
                id="new-item-min"
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: 'var(--vyntra-space-md)' }}>
            <button className="part2-btn part2-btn--primary" onClick={handleAddItem}>Save</button>
            <button className="part2-btn part2-btn--ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ─── Inventory Table ─── */}
      {filteredItems.length > 0 ? (
        <div className="inventory__table" id="inventory-table">
          <div className="inventory__table-header">
            <span>ITEM MANIFEST & NODE BAY</span>
            <span>CURRENT STORED</span>
            <span>SAFE BASELINE</span>
            <span>LEDGER HEALTH</span>
            <span>QUICK ADJUST</span>
          </div>

          {filteredItems.map((item) => {
            const stockHealth = getStockHealth(item);
            const catConfig = CATEGORIES[item.category];

            return (
              <div key={item.itemId} className="inventory__table-row" id={`item-${item.itemId}`}>
                <div className="inventory__item-info">
                  <span className="inventory__item-icon">{catConfig.icon}</span>
                  <div>
                    <strong>{item.itemName}</strong>
                    <div className="text-muted" style={{ fontSize: '12px' }}>
                      {catConfig.label}
                    </div>
                  </div>
                </div>

                <div className="inventory__item-qty">
                  <span className="text-counter" style={{ fontSize: '28px' }}>
                    {item.currentQuantity}
                  </span>
                </div>

                <div className="inventory__item-min">
                  <span>{item.requiredMinimum}</span>
                </div>

                <div className="inventory__item-health">
                  <span className={`inventory__health-badge ${stockHealth.className}`}>
                    {stockHealth.label}
                  </span>
                </div>

                <div className="inventory__item-actions">
                  <div className="inventory__quick-adjust">
                    <button
                      className="inventory__adjust-btn"
                      onClick={() => handleQuickAdjust(item, -5)}
                      title="Remove 5"
                    >
                      -5
                    </button>
                    <button
                      className="inventory__adjust-btn"
                      onClick={() => handleQuickAdjust(item, -1)}
                      title="Remove 1"
                    >
                      -1
                    </button>
                    <button
                      className="inventory__adjust-btn"
                      onClick={() => handleQuickAdjust(item, 1)}
                      title="Add 1"
                    >
                      +1
                    </button>
                    <button
                      className="inventory__adjust-btn"
                      onClick={() => handleQuickAdjust(item, 5)}
                      title="Add 5"
                    >
                      +5
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    <button
                      className="part2-btn part2-btn--ghost part2-btn--sm"
                      onClick={() => setShowUsageForm(item.itemId)}
                      style={{ fontSize: '12px' }}
                    >
                      📋 Log Usage
                    </button>
                    <button
                      className="part2-btn part2-btn--ghost part2-btn--sm"
                      onClick={() => handleRemoveItem(item.itemId)}
                      style={{ fontSize: '12px', color: 'var(--vyntra-error)' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Usage Form Modal (inline) */}
                {showUsageForm === item.itemId && (
                  <div className="inventory__usage-form" id={`usage-form-${item.itemId}`}>
                    <h4 className="text-headline-sm">📋 Record Usage — {item.itemName}</h4>
                    <div className="part2-grid part2-grid--3" style={{ marginTop: '12px' }}>
                      <div className="part2-input-group">
                        <label className="part2-input-group__label">Quantity Used</label>
                        <input
                          className="part2-input"
                          type="number"
                          min="1"
                          max={item.currentQuantity}
                          value={usageQty}
                          onChange={(e) => setUsageQty(e.target.value)}
                        />
                      </div>
                      <div className="part2-input-group">
                        <label className="part2-input-group__label">Person ID (optional)</label>
                        <input
                          className="part2-input"
                          value={usagePersonId}
                          onChange={(e) => setUsagePersonId(e.target.value)}
                          placeholder="VYNTRA-USR-... or skip"
                        />
                      </div>
                      <div className="part2-input-group">
                        <label className="part2-input-group__label">Notes</label>
                        <input
                          className="part2-input"
                          value={usageNotes}
                          onChange={(e) => setUsageNotes(e.target.value)}
                          placeholder="Usage context"
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button className="part2-btn part2-btn--primary part2-btn--sm" onClick={() => handleRecordUsage(item)}>
                        Confirm Usage & Deduct
                      </button>
                      <button className="part2-btn part2-btn--ghost part2-btn--sm" onClick={() => setShowUsageForm(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="part2-empty">
          <div className="part2-empty__icon">📦</div>
          <div className="part2-empty__title">No Inventory Items</div>
          <div className="part2-empty__description">
            Add equipment, supplies, and resources to begin tracking stock levels.
          </div>
        </div>
      )}
    </div>
  );
}
