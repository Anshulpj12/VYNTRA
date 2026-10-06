/**
 * VYNTRA Part 2 — Bed Management & Occupant Admission Screen
 * 
 * Manages bed allocation, occupant admission/discharge, and stay tracking.
 * Automatically updates occupied/available bed counts.
 * 
 * @module part2-shelter-provider/bed-management/BedManagementScreen
 * @part Part 2 — Shelter Provider
 */

import { useState, useCallback } from 'react';
import { useShelter } from '../context/ShelterContext';
import { generateUniqueId } from '../../shared/utils/id-generator';
import { saveToCache, addToSyncQueue, STORES } from '../../shared/utils/offline-cache';
import type { Occupant } from '../../shared/types';
import '../styles/beds.css';

/**
 * Combined Bed Management + Occupant Admission screen.
 * Shows capacity stats, admission form, and active occupant roster.
 */
export default function BedManagementScreen() {
  const { state, dispatch } = useShelter();
  const { shelter, occupants } = state;

  const [showAdmissionForm, setShowAdmissionForm] = useState(false);
  const [idMode, setIdMode] = useState<'existing' | 'generate'>('existing');
  const [existingAppId, setExistingAppId] = useState('');
  const [occupantName, setOccupantName] = useState('');
  const [expectedStayDays, setExpectedStayDays] = useState('3');
  const [selectedBed, setSelectedBed] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const activeOccupants = occupants.filter((o) => o.status === 'active');
  const dischargedOccupants = occupants.filter((o) => o.status === 'discharged');

  /* Find which beds are occupied */
  const occupiedBedNumbers = new Set(
    activeOccupants.map((o) => o.assignedBedNumber).filter(Boolean)
  );

  /* Filter occupants by search */
  const filteredOccupants = activeOccupants.filter((o) =>
    !searchQuery ||
    o.personId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /** Get the next available bed number */
  const getNextAvailableBed = useCallback((): number | undefined => {
    if (!shelter) return undefined;
    for (let i = 1; i <= shelter.totalBedCapacity; i++) {
      if (!occupiedBedNumbers.has(i)) return i;
    }
    return undefined;
  }, [shelter, occupiedBedNumbers]);

  /** Handle occupant admission */
  const handleAdmit = useCallback(async () => {
    if (!shelter) return;
    setFormError('');

    if (idMode === 'existing' && !existingAppId.trim()) {
      setFormError('Please enter the person\'s existing application ID');
      return;
    }
    if (!occupantName.trim()) {
      setFormError('Please enter the person\'s name');
      return;
    }
    if (!expectedStayDays || parseInt(expectedStayDays) <= 0) {
      setFormError('Expected stay must be at least 1 day');
      return;
    }
    if (shelter.availableBeds <= 0) {
      setFormError('No available beds. Discharge an occupant first.');
      return;
    }

    setIsSubmitting(true);

    try {
      const bedNumber = selectedBed
        ? parseInt(selectedBed)
        : getNextAvailableBed();

      if (!bedNumber) {
        setFormError('No available bed could be assigned');
        setIsSubmitting(false);
        return;
      }

      const personId = idMode === 'existing'
        ? existingAppId.trim()
        : generateUniqueId('PRS');

      const now = Date.now();
      const occupant: Occupant = {
        personId,
        isExistingAppUser: idMode === 'existing',
        existingAppId: idMode === 'existing' ? existingAppId.trim() : undefined,
        shelterAssignedId: idMode === 'generate' ? personId : undefined,
        name: occupantName.trim(),
        admittedAt: now,
        expectedStayDays: parseInt(expectedStayDays),
        assignedBedNumber: bedNumber,
        status: 'active',
      };

      /* Save to IndexedDB */
      await saveToCache(STORES.OCCUPANTS, { ...occupant, shelterId: shelter.shelterId });

      /* Queue for Firebase sync */
      await addToSyncQueue({
        id: `occ-${personId}`,
        store: STORES.OCCUPANTS,
        operation: 'create',
        data: { ...occupant, shelterId: shelter.shelterId },
        timestamp: now,
        retryCount: 0,
      });

      /* Update state */
      dispatch({ type: 'ADD_OCCUPANT', payload: occupant });
      dispatch({
        type: 'UPDATE_BED_COUNTS',
        payload: {
          occupied: shelter.occupiedBeds + 1,
          available: shelter.availableBeds - 1,
        },
      });

      /* Reset form */
      setShowAdmissionForm(false);
      setExistingAppId('');
      setOccupantName('');
      setExpectedStayDays('3');
      setSelectedBed('');
      setIdMode('existing');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Admission failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [idMode, existingAppId, occupantName, expectedStayDays, selectedBed, shelter, dispatch, getNextAvailableBed]);

  /** Handle occupant discharge */
  const handleDischarge = useCallback(async (occupant: Occupant) => {
    if (!shelter) return;
    const now = Date.now();
    const updated: Occupant = {
      ...occupant,
      status: 'discharged',
      dischargedAt: now,
    };

    await saveToCache(STORES.OCCUPANTS, { ...updated, shelterId: shelter.shelterId });
    await addToSyncQueue({
      id: `occ-discharge-${occupant.personId}`,
      store: STORES.OCCUPANTS,
      operation: 'update',
      data: { ...updated, shelterId: shelter.shelterId },
      timestamp: now,
      retryCount: 0,
    });

    dispatch({ type: 'UPDATE_OCCUPANT', payload: updated });
    dispatch({
      type: 'UPDATE_BED_COUNTS',
      payload: {
        occupied: shelter.occupiedBeds - 1,
        available: shelter.availableBeds + 1,
      },
    });
  }, [shelter, dispatch]);

  /** Calculate stay progress */
  const getStayProgress = (occupant: Occupant): { daysIn: number; daysLeft: number; percent: number } => {
    const msPerDay = 86400000;
    const daysIn = Math.max(1, Math.ceil((Date.now() - occupant.admittedAt) / msPerDay));
    const daysLeft = Math.max(0, occupant.expectedStayDays - daysIn);
    const percent = Math.min(100, Math.round((daysIn / occupant.expectedStayDays) * 100));
    return { daysIn, daysLeft, percent };
  };

  if (!shelter) return null;

  return (
    <div className="beds" id="bed-management-screen">
      {/* ─── Header Stats ─── */}
      <div className="beds__stats part2-grid part2-grid--4">
        <div className="beds__stat-card part2-card">
          <div className="beds__stat-label text-badge">SANCTUARY CAPACITY</div>
          <div className="beds__stat-row">
            <span className="text-counter">{shelter.totalBedCapacity}</span>
            <span className="text-muted">/ {shelter.totalBedCapacity} beds</span>
          </div>
        </div>
        <div className="beds__stat-card part2-card">
          <div className="beds__stat-label text-badge">READY / SANITIZED BEDS</div>
          <div className="beds__stat-row">
            <span className="text-counter" style={{ color: 'var(--vyntra-tertiary)' }}>
              {shelter.availableBeds}
            </span>
            <span className="part2-status-badge part2-status-badge--available">Immediate Intake</span>
          </div>
        </div>
        <div className="beds__stat-card part2-card">
          <div className="beds__stat-label text-badge">ACTIVE RESIDENTS</div>
          <div className="beds__stat-row">
            <span className="text-counter" style={{ color: 'var(--vyntra-primary)' }}>
              {activeOccupants.length}
            </span>
            <span className="text-muted">In Care</span>
          </div>
        </div>
        <div className="beds__stat-card part2-card">
          <div className="beds__stat-label text-badge">DISCHARGED</div>
          <div className="beds__stat-row">
            <span className="text-counter">{dischargedOccupants.length}</span>
            <span className="text-muted">Total</span>
          </div>
        </div>
      </div>

      {/* ─── Admission Form ─── */}
      {showAdmissionForm ? (
        <div className="beds__admission-form part2-card part2-card--elevated" id="admission-form">
          <div className="beds__admission-header">
            <div>
              <h2 className="text-headline-md">👤 Admit New Resident / Safe Space Seeker</h2>
              <p className="text-muted">Rapid trauma-informed bed allocation and vulnerability triage desk</p>
            </div>
            <button
              className="part2-btn part2-btn--ghost part2-btn--sm"
              onClick={() => setShowAdmissionForm(false)}
            >
              ✕ Close
            </button>
          </div>

          {/* ID Mode Toggle */}
          <div className="beds__id-toggle">
            <button
              className={`beds__id-toggle-btn ${idMode === 'existing' ? 'beds__id-toggle-btn--active' : ''}`}
              onClick={() => setIdMode('existing')}
              id="id-mode-existing"
            >
              App User ID
            </button>
            <button
              className={`beds__id-toggle-btn ${idMode === 'generate' ? 'beds__id-toggle-btn--active' : ''}`}
              onClick={() => setIdMode('generate')}
              id="id-mode-generate"
            >
              Anonymous Guest ID
            </button>
          </div>

          <div className="part2-grid part2-grid--2">
            {idMode === 'existing' ? (
              <div className="part2-input-group">
                <label className="part2-input-group__label">Crisis Dispatch User Identifier</label>
                <input
                  id="existing-id-input"
                  className="part2-input"
                  type="text"
                  value={existingAppId}
                  onChange={(e) => setExistingAppId(e.target.value)}
                  placeholder="VYNTRA-USR-XXXXXXXX"
                />
              </div>
            ) : (
              <div className="part2-input-group">
                <label className="part2-input-group__label">Guest ID</label>
                <div className="beds__generated-id">
                  <span className="text-muted">Auto-generated on admission</span>
                  <span className="part2-status-badge part2-status-badge--info">VYNTRA-PRS-*</span>
                </div>
              </div>
            )}

            <div className="part2-input-group">
              <label className="part2-input-group__label">
                Legal / Preferred Name <span className="part2-input-group__required">*</span>
              </label>
              <input
                id="occupant-name-input"
                className="part2-input"
                type="text"
                value={occupantName}
                onChange={(e) => setOccupantName(e.target.value)}
                placeholder="Full name"
              />
            </div>
          </div>

          {/* Stay Duration */}
          <div className="beds__stay-row">
            <div className="part2-input-group">
              <label className="part2-input-group__label">Authorized Initial Stay Duration</label>
              <div className="beds__stay-counter">
                <button
                  type="button"
                  className="registration__capacity-btn"
                  onClick={() => setExpectedStayDays((v) => String(Math.max(1, parseInt(v) - 1)))}
                >
                  −
                </button>
                <input
                  id="stay-days-input"
                  className="beds__stay-input"
                  type="number"
                  min="1"
                  value={expectedStayDays}
                  onChange={(e) => setExpectedStayDays(e.target.value)}
                />
                <button
                  type="button"
                  className="registration__capacity-btn"
                  onClick={() => setExpectedStayDays((v) => String(parseInt(v) + 1))}
                >
                  +
                </button>
                <span className="text-muted">Days</span>
              </div>
            </div>

            <div className="part2-input-group">
              <label className="part2-input-group__label">
                Bed Assignment ({shelter.availableBeds} Ready)
              </label>
              <select
                id="bed-select"
                className="part2-select"
                value={selectedBed}
                onChange={(e) => setSelectedBed(e.target.value)}
              >
                <option value="">Auto-assign next available</option>
                {Array.from({ length: shelter.totalBedCapacity }, (_, i) => i + 1)
                  .filter((n) => !occupiedBedNumbers.has(n))
                  .map((n) => (
                    <option key={n} value={n}>
                      Bed B-{String(n).padStart(2, '0')}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Auto-deduction notice */}
          <div className="beds__deduction-notice">
            <span>🔄</span>
            <span>
              Consolidated metadata auto-deducts: <strong>Available beds {shelter.availableBeds} → {shelter.availableBeds - 1}</strong> upon registration.
            </span>
          </div>

          {formError && (
            <div className="part2-input-group__error" style={{ marginTop: '12px' }}>
              ⚠ {formError}
            </div>
          )}

          <button
            className="part2-btn part2-btn--primary part2-btn--lg part2-btn--full"
            onClick={handleAdmit}
            disabled={isSubmitting}
            id="confirm-admission-btn"
            style={{ marginTop: 'var(--vyntra-space-md)' }}
          >
            {isSubmitting ? '⏳ Processing...' : '🛡️ Confirm Admission & Deduct Bed'}
          </button>
        </div>
      ) : (
        <button
          className="part2-btn part2-btn--primary part2-btn--lg"
          onClick={() => setShowAdmissionForm(true)}
          id="open-admission-btn"
          style={{ marginBottom: 'var(--vyntra-space-xl)' }}
        >
          👤+ Admit New Occupant
        </button>
      )}

      {/* ─── Active Occupancy Roster ─── */}
      <div className="beds__roster" id="occupant-roster">
        <div className="beds__roster-header">
          <div>
            <h2 className="text-headline-md">Active Occupancy Roster & Stay Timelines</h2>
            <p className="text-muted">
              Real-time resident tenure monitoring and bed release controls
            </p>
          </div>
          <div className="beds__roster-count">
            <span className="part2-status-badge part2-status-badge--occupied">
              {activeOccupants.length} In Care
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="beds__search" style={{ marginBottom: 'var(--vyntra-space-md)' }}>
          <input
            className="part2-input"
            type="text"
            placeholder="🔍 Search by name, ID, or bed..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="occupant-search-input"
          />
        </div>

        {filteredOccupants.length > 0 ? (
          <div className="beds__roster-table">
            <div className="beds__roster-row beds__roster-row--header">
              <span>Occupant & App ID</span>
              <span>Bed Location</span>
              <span>Intake Date</span>
              <span>Stay Timeline</span>
              <span>Actions</span>
            </div>

            {filteredOccupants.map((occupant) => {
              const { daysIn, daysLeft, percent } = getStayProgress(occupant);
              return (
                <div key={occupant.personId} className="beds__roster-row" id={`occupant-${occupant.personId}`}>
                  <div className="beds__roster-person">
                    <div className="beds__roster-avatar">
                      {occupant.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <strong>{occupant.name || 'Anonymous'}</strong>
                      <div className="beds__roster-id">
                        <span className={`part2-status-badge ${
                          occupant.isExistingAppUser 
                            ? 'part2-status-badge--info' 
                            : 'part2-status-badge--warning'
                        }`}>
                          {occupant.personId.slice(-12)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="beds__roster-bed">
                    <strong>Bed B-{String(occupant.assignedBedNumber || '?').padStart(2, '0')}</strong>
                  </div>

                  <div className="beds__roster-date">
                    {new Date(occupant.admittedAt).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>

                  <div className="beds__roster-stay">
                    <div className="beds__stay-info">
                      <span className="beds__stay-badge" style={{ color: percent > 80 ? 'var(--vyntra-warning)' : 'var(--vyntra-tertiary)' }}>
                        {daysIn} of {occupant.expectedStayDays} days
                      </span>
                      <span className="text-muted">{daysLeft} days left</span>
                    </div>
                    <div className="part2-progress">
                      <div
                        className="part2-progress__bar"
                        style={{
                          width: `${percent}%`,
                          background: percent > 80 ? 'var(--vyntra-warning)' : 'var(--vyntra-primary)',
                        }}
                      />
                    </div>
                  </div>

                  <div className="beds__roster-actions">
                    <button
                      className="part2-btn part2-btn--secondary part2-btn--sm"
                      onClick={() => handleDischarge(occupant)}
                      id={`discharge-${occupant.personId}`}
                    >
                      Release
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="part2-empty">
            <div className="part2-empty__icon">🛏️</div>
            <div className="part2-empty__title">No Active Occupants</div>
            <div className="part2-empty__description">
              Admit a new resident to begin tracking their stay and bed allocation.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
