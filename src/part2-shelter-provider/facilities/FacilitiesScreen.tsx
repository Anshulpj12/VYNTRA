/**
 * VYNTRA Part 2 — Facilities & Sanitation Management Screen
 * 
 * Manages facilities available at the shelter. Providers can add, edit,
 * remove, and update the current availability of each facility.
 * 
 * @module part2-shelter-provider/facilities/FacilitiesScreen
 * @part Part 2 — Shelter Provider
 */

import { useState, useCallback } from 'react';
import { useShelter } from '../context/ShelterContext';
import { generateUniqueId } from '../../shared/utils/id-generator';
import { saveToCache, deleteFromCache, addToSyncQueue, STORES } from '../../shared/utils/offline-cache';
import type { Facility } from '../../shared/types';
import '../styles/facilities.css';

/** Facility type labels and icons */
const FACILITY_TYPES = {
  'women-specific': { label: 'Women-Specific', icon: '♀️', color: 'var(--vyntra-primary)' },
  'sanitation': { label: 'Sanitation', icon: '🚿', color: 'var(--vyntra-secondary)' },
  'medical': { label: 'Medical', icon: '🏥', color: 'var(--vyntra-tertiary)' },
  'general': { label: 'General', icon: '🏠', color: 'var(--vyntra-on-surface-muted)' },
} as const;

/**
 * Facility & sanitation management screen.
 * Continuously maintains the current condition of shelter facilities.
 */
export default function FacilitiesScreen() {
  const { state, dispatch } = useShelter();
  const { shelter, facilities } = state;

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  /* New facility form state */
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<Facility['type']>('general');
  const [newCapacity, setNewCapacity] = useState('1');
  const [newDescription, setNewDescription] = useState('');

  /* Edit form state */
  const [editCapacity, setEditCapacity] = useState('');
  const [editAvailable, setEditAvailable] = useState('');

  const filteredFacilities = filterType === 'all'
    ? facilities
    : facilities.filter((f) => f.type === filterType);

  /** Add a new facility */
  const handleAdd = useCallback(async () => {
    if (!shelter || !newName.trim()) return;

    const now = Date.now();
    const capacity = parseInt(newCapacity) || 1;

    const facility: Facility = {
      facilityId: generateUniqueId('FAC'),
      shelterId: shelter.shelterId,
      facilityName: newName.trim(),
      type: newType,
      totalCapacity: capacity,
      currentAvailable: capacity,
      description: newDescription.trim(),
      lastUpdatedAt: now,
    };

    await saveToCache(STORES.FACILITIES, facility);
    await addToSyncQueue({
      id: `fac-${facility.facilityId}`,
      store: STORES.FACILITIES,
      operation: 'create',
      data: facility,
      timestamp: now,
      retryCount: 0,
    });

    dispatch({ type: 'ADD_FACILITY', payload: facility });

    /* Reset form */
    setNewName('');
    setNewType('general');
    setNewCapacity('1');
    setNewDescription('');
    setShowAddForm(false);
  }, [newName, newType, newCapacity, newDescription, shelter, dispatch]);

  /** Start editing a facility */
  const startEdit = (facility: Facility) => {
    setEditingId(facility.facilityId);
    setEditCapacity(String(facility.totalCapacity));
    setEditAvailable(String(facility.currentAvailable));
  };

  /** Save edited facility */
  const handleSaveEdit = useCallback(async (facility: Facility) => {
    const now = Date.now();
    const updated: Facility = {
      ...facility,
      totalCapacity: parseInt(editCapacity) || facility.totalCapacity,
      currentAvailable: Math.min(
        parseInt(editAvailable) || facility.currentAvailable,
        parseInt(editCapacity) || facility.totalCapacity
      ),
      lastUpdatedAt: now,
    };

    await saveToCache(STORES.FACILITIES, updated);
    await addToSyncQueue({
      id: `fac-update-${facility.facilityId}-${now}`,
      store: STORES.FACILITIES,
      operation: 'update',
      data: updated,
      timestamp: now,
      retryCount: 0,
    });

    dispatch({ type: 'UPDATE_FACILITY', payload: updated });
    setEditingId(null);
  }, [editCapacity, editAvailable, dispatch]);

  /** Remove a facility */
  const handleRemove = useCallback(async (facilityId: string) => {
    if (!shelter) return;
    await deleteFromCache(STORES.FACILITIES, facilityId);
    await addToSyncQueue({
      id: `fac-del-${facilityId}`,
      store: STORES.FACILITIES,
      operation: 'delete',
      data: { facilityId, shelterId: shelter.shelterId },
      timestamp: Date.now(),
      retryCount: 0,
    });

    dispatch({ type: 'REMOVE_FACILITY', payload: facilityId });
  }, [shelter, dispatch]);

  if (!shelter) return null;

  return (
    <div className="facilities" id="facilities-screen">
      {/* ─── Header ─── */}
      <div className="facilities__header">
        <div>
          <h1 className="text-headline-lg">Continuously Maintained Facilities & Hygiene Infrastructure</h1>
          <p className="text-muted">
            Real-world telemetry tracking clean-room status, trauma-informed privacy pods,
            and humanitarian sanitation ratios.
          </p>
        </div>
      </div>

      {/* ─── Summary Cards ─── */}
      <div className="facilities__summary part2-grid part2-grid--4">
        {Object.entries(FACILITY_TYPES).map(([type, config]) => {
          const count = facilities.filter((f) => f.type === type).length;
          const totalCap = facilities
            .filter((f) => f.type === type)
            .reduce((sum, f) => sum + f.totalCapacity, 0);
          const totalAvail = facilities
            .filter((f) => f.type === type)
            .reduce((sum, f) => sum + f.currentAvailable, 0);

          return (
            <div key={type} className="part2-card facilities__summary-card">
              <div className="facilities__summary-icon" style={{ color: config.color }}>
                {config.icon}
              </div>
              <div className="facilities__summary-label text-badge">{config.label}</div>
              <div className="text-counter">{count}</div>
              <div className="text-muted">
                {totalAvail} / {totalCap} available
              </div>
              <div className="part2-progress" style={{ marginTop: '8px' }}>
                <div
                  className="part2-progress__bar"
                  style={{
                    width: totalCap > 0 ? `${(totalAvail / totalCap) * 100}%` : '0%',
                    background: config.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Filter Tabs ─── */}
      <div className="facilities__filters">
        <button
          className={`facilities__filter-btn ${filterType === 'all' ? 'facilities__filter-btn--active' : ''}`}
          onClick={() => setFilterType('all')}
        >
          All ({facilities.length})
        </button>
        {Object.entries(FACILITY_TYPES).map(([type, config]) => (
          <button
            key={type}
            className={`facilities__filter-btn ${filterType === type ? 'facilities__filter-btn--active' : ''}`}
            onClick={() => setFilterType(type)}
          >
            {config.icon} {config.label} ({facilities.filter((f) => f.type === type).length})
          </button>
        ))}
      </div>

      {/* ─── Add Facility Form ─── */}
      {showAddForm && (
        <div className="facilities__add-form part2-card part2-card--elevated" id="add-facility-form">
          <h3 className="text-headline-sm" style={{ marginBottom: 'var(--vyntra-space-md)' }}>
            ＋ Add New Facility
          </h3>
          <div className="part2-grid part2-grid--2">
            <div className="part2-input-group">
              <label className="part2-input-group__label">Facility Name</label>
              <input
                className="part2-input"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Private Lactation Pods"
                id="new-facility-name"
              />
            </div>
            <div className="part2-input-group">
              <label className="part2-input-group__label">Type</label>
              <select
                className="part2-select"
                value={newType}
                onChange={(e) => setNewType(e.target.value as Facility['type'])}
                id="new-facility-type"
              >
                {Object.entries(FACILITY_TYPES).map(([type, config]) => (
                  <option key={type} value={type}>{config.icon} {config.label}</option>
                ))}
              </select>
            </div>
            <div className="part2-input-group">
              <label className="part2-input-group__label">Total Capacity / Quantity</label>
              <input
                className="part2-input"
                type="number"
                min="0"
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
                id="new-facility-capacity"
              />
            </div>
            <div className="part2-input-group">
              <label className="part2-input-group__label">Description</label>
              <input
                className="part2-input"
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Brief description of the facility"
                id="new-facility-desc"
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--vyntra-space-sm)', marginTop: 'var(--vyntra-space-md)' }}>
            <button className="part2-btn part2-btn--primary" onClick={handleAdd} id="save-facility-btn">
              Save Facility
            </button>
            <button className="part2-btn part2-btn--ghost" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showAddForm && (
        <button
          className="part2-btn part2-btn--secondary"
          onClick={() => setShowAddForm(true)}
          id="show-add-facility-btn"
          style={{ marginBottom: 'var(--vyntra-space-lg)' }}
        >
          ＋ Add New Facility
        </button>
      )}

      {/* ─── Facility Cards ─── */}
      <div className="facilities__list">
        {filteredFacilities.length > 0 ? (
          <div className="facilities__grid">
            {filteredFacilities.map((facility) => {
              const typeConfig = FACILITY_TYPES[facility.type];
              const isEditing = editingId === facility.facilityId;
              const availPercent = facility.totalCapacity > 0
                ? Math.round((facility.currentAvailable / facility.totalCapacity) * 100)
                : 0;

              return (
                <div
                  key={facility.facilityId}
                  className="part2-card facilities__card"
                  id={`facility-${facility.facilityId}`}
                >
                  <div className="facilities__card-header">
                    <div className="facilities__card-icon" style={{ background: typeConfig.color + '18', color: typeConfig.color }}>
                      {typeConfig.icon}
                    </div>
                    <div className="facilities__card-meta">
                      <h3 className="text-headline-sm">{facility.facilityName}</h3>
                      <span className="part2-status-badge part2-status-badge--info">{typeConfig.label}</span>
                    </div>
                  </div>

                  <p className="facilities__card-desc text-muted">{facility.description}</p>

                  {isEditing ? (
                    <div className="facilities__edit-form">
                      <div className="part2-grid part2-grid--2">
                        <div className="part2-input-group">
                          <label className="part2-input-group__label">Total Capacity</label>
                          <input
                            className="part2-input"
                            type="number"
                            value={editCapacity}
                            onChange={(e) => setEditCapacity(e.target.value)}
                          />
                        </div>
                        <div className="part2-input-group">
                          <label className="part2-input-group__label">Currently Available</label>
                          <input
                            className="part2-input"
                            type="number"
                            value={editAvailable}
                            onChange={(e) => setEditAvailable(e.target.value)}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button className="part2-btn part2-btn--primary part2-btn--sm" onClick={() => handleSaveEdit(facility)}>
                          Save
                        </button>
                        <button className="part2-btn part2-btn--ghost part2-btn--sm" onClick={() => setEditingId(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="facilities__card-stats">
                        <div className="facilities__card-stat">
                          <span className="text-counter" style={{ fontSize: '24px' }}>
                            {facility.currentAvailable}
                          </span>
                          <span className="text-muted">/ {facility.totalCapacity}</span>
                        </div>
                        <div className="part2-progress" style={{ flex: 1 }}>
                          <div
                            className="part2-progress__bar"
                            style={{
                              width: `${availPercent}%`,
                              background: availPercent > 50 ? typeConfig.color : 'var(--vyntra-warning)',
                            }}
                          />
                        </div>
                      </div>

                      <div className="facilities__card-footer">
                        <span className="text-muted" style={{ fontSize: '12px' }}>
                          Updated {new Date(facility.lastUpdatedAt).toLocaleString()}
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            className="part2-btn part2-btn--ghost part2-btn--sm"
                            onClick={() => startEdit(facility)}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            className="part2-btn part2-btn--ghost part2-btn--sm"
                            onClick={() => handleRemove(facility.facilityId)}
                            style={{ color: 'var(--vyntra-error)' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="part2-empty">
            <div className="part2-empty__icon">🏥</div>
            <div className="part2-empty__title">No Facilities Found</div>
            <div className="part2-empty__description">
              {filterType !== 'all'
                ? `No ${FACILITY_TYPES[filterType as keyof typeof FACILITY_TYPES]?.label} facilities. Add one above.`
                : 'Add your first facility to begin managing shelter infrastructure.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
