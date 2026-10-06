/**
 * VYNTRA Part 2 — Shelter Dashboard Screen
 * 
 * Professional operational dashboard showing the current state of the shelter:
 * capacity, occupancy, bed grid, quick actions, and activity log.
 * 
 * @module part2-shelter-provider/dashboard/ShelterDashboardScreen
 * @part Part 2 — Shelter Provider
 */

import { useShelter } from '../context/ShelterContext';
import '../styles/dashboard.css';

/**
 * Main dashboard view displaying shelter operational overview.
 * Shows capacity stats, bed visualizer, quick actions, and operational log.
 */
export default function ShelterDashboardScreen() {
  const { state, dispatch } = useShelter();
  const { shelter, occupants, inventory } = state;

  if (!shelter) return null;

  const occupancyRate = shelter.totalBedCapacity > 0
    ? Math.round((shelter.occupiedBeds / shelter.totalBedCapacity) * 100)
    : 0;

  const activeOccupants = occupants.filter((o) => o.status === 'active');
  const lowStockItems = inventory.filter((i) => i.currentQuantity <= i.requiredMinimum);

  /** Get occupancy color based on rate */
  const getOccupancyColor = (): string => {
    if (occupancyRate >= 90) return 'var(--vyntra-primary)';
    if (occupancyRate >= 70) return 'var(--vyntra-warning)';
    return 'var(--vyntra-tertiary)';
  };

  return (
    <div className="dashboard" id="shelter-dashboard">
      {/* ─── Dashboard Header ─── */}
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__shelter-id">{shelter.shelterId}</h1>
          <p className="dashboard__shelter-sub">[{shelter.district} {shelter.shelterName}]</p>
        </div>
        <div className="dashboard__header-meta">
          <span className="part2-status-badge part2-status-badge--available">
            ● ACTIVE & ACCEPTING ADMISSIONS
          </span>
        </div>
      </div>

      {/* ─── Stat Cards ─── */}
      <div className="dashboard__stats part2-grid part2-grid--4">
        <div className="dashboard__stat-card part2-card">
          <div className="dashboard__stat-icon">🛏️</div>
          <div className="dashboard__stat-label text-badge">TOTAL SHELTER VOLUME</div>
          <div className="dashboard__stat-value text-counter">{shelter.totalBedCapacity}</div>
          <div className="dashboard__stat-sub text-muted">Beds</div>
        </div>

        <div className="dashboard__stat-card part2-card">
          <div className="dashboard__stat-icon">📊</div>
          <div className="dashboard__stat-label text-badge">OCCUPIED RATE</div>
          <div className="dashboard__stat-value" style={{ color: getOccupancyColor() }}>
            <span className="text-counter">{shelter.occupiedBeds}</span>
          </div>
          <div className="dashboard__stat-sub">
            <span className="text-muted">Beds </span>
            <strong style={{ color: getOccupancyColor() }}>{occupancyRate}% Saturation</strong>
          </div>
          <div className="part2-progress" style={{ marginTop: '8px' }}>
            <div
              className="part2-progress__bar"
              style={{
                width: `${occupancyRate}%`,
                background: getOccupancyColor(),
              }}
            />
          </div>
        </div>

        <div className="dashboard__stat-card part2-card">
          <div className="dashboard__stat-icon">✅</div>
          <div className="dashboard__stat-label text-badge">IMMEDIATE VACANCY</div>
          <div className="dashboard__stat-value text-counter" style={{ color: 'var(--vyntra-tertiary)' }}>
            {shelter.availableBeds}
          </div>
          <div className="dashboard__stat-sub text-muted">
            Open beds, ready for intake
          </div>
          <span className="part2-status-badge part2-status-badge--available" style={{ marginTop: '8px' }}>
            ● Immediate Intake Ready
          </span>
        </div>

        <div className="dashboard__stat-card part2-card">
          <div className="dashboard__stat-icon">📋</div>
          <div className="dashboard__stat-label text-badge">ACTIVE RESIDENTS</div>
          <div className="dashboard__stat-value text-counter">{activeOccupants.length}</div>
          <div className="dashboard__stat-sub text-muted">Currently staying</div>
        </div>
      </div>

      {/* ─── Bed Grid Visualizer ─── */}
      <div className="dashboard__bed-section">
        <div className="dashboard__bed-header">
          <div>
            <h2 className="text-headline-md">Live Bed Grid Visualizer</h2>
            <p className="text-muted">Real-time occupancy status per bed</p>
          </div>
          <div className="dashboard__bed-legend">
            <span className="dashboard__legend-item">
              <span className="dashboard__legend-dot dashboard__legend-dot--available" />
              Available ({shelter.availableBeds})
            </span>
            <span className="dashboard__legend-item">
              <span className="dashboard__legend-dot dashboard__legend-dot--occupied" />
              Occupied ({shelter.occupiedBeds})
            </span>
          </div>
        </div>

        <div className="dashboard__bed-grid">
          {Array.from({ length: shelter.totalBedCapacity }, (_, i) => {
            const bedNumber = i + 1;
            const occupant = activeOccupants.find((o) => o.assignedBedNumber === bedNumber);
            const isOccupied = !!occupant;

            return (
              <div
                key={bedNumber}
                className={`dashboard__bed-tile ${
                  isOccupied ? 'dashboard__bed-tile--occupied' : 'dashboard__bed-tile--available'
                }`}
                title={isOccupied ? `${occupant.name || occupant.personId}` : `Bed ${bedNumber} — Available`}
              >
                <span className="dashboard__bed-number">B-{String(bedNumber).padStart(2, '0')}</span>
                <span className="dashboard__bed-icon">{isOccupied ? '🔒' : '🛏️'}</span>
                <span className={`dashboard__bed-status text-badge ${
                  isOccupied ? 'text-primary' : 'text-tertiary'
                }`}>
                  {isOccupied ? 'Occupied' : 'Available'}
                </span>
                {isOccupied && occupant && (
                  <span className="dashboard__bed-ref text-muted">
                    {occupant.personId.slice(-8)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Quick Actions & Activity Log ─── */}
      <div className="dashboard__bottom-row">
        <div className="dashboard__quick-actions">
          <h2 className="text-headline-md">Rapid Command & Quick Actions</h2>
          <div className="dashboard__actions-grid">
            <button
              className="part2-btn part2-btn--primary part2-btn--lg"
              onClick={() => dispatch({ type: 'SET_TAB', payload: 'beds' })}
              id="quick-admit-btn"
            >
              👤+ Admit New Occupant
            </button>
            <button
              className="part2-btn part2-btn--secondary part2-btn--lg"
              onClick={() => dispatch({ type: 'SET_TAB', payload: 'facilities' })}
              id="quick-facilities-btn"
            >
              🏥 Manage Facilities
            </button>
            <button
              className="part2-btn part2-btn--secondary part2-btn--lg"
              onClick={() => dispatch({ type: 'SET_TAB', payload: 'inventory' })}
              id="quick-inventory-btn"
            >
              📦 Inventory & Supplies
            </button>
          </div>
        </div>

        <div className="dashboard__activity-log part2-card">
          <h3 className="text-headline-sm">Recent Operational Log</h3>
          <div className="dashboard__log-list">
            {activeOccupants.slice(0, 4).map((o) => (
              <div key={o.personId} className="dashboard__log-entry">
                <span className="dashboard__log-dot dashboard__log-dot--admission" />
                <div className="dashboard__log-content">
                  <strong>Admission Active</strong>
                  <p className="text-muted">
                    Occupant {o.personId.slice(-8)} assigned to Bed B-{String(o.assignedBedNumber || '?').padStart(2, '0')}.
                    Stay: {o.expectedStayDays} days
                  </p>
                </div>
                <span className="dashboard__log-time text-muted">
                  {new Date(o.admittedAt).toLocaleDateString()}
                </span>
              </div>
            ))}

            {lowStockItems.slice(0, 2).map((item) => (
              <div key={item.itemId} className="dashboard__log-entry">
                <span className="dashboard__log-dot dashboard__log-dot--warning" />
                <div className="dashboard__log-content">
                  <strong>Low Stock Alert</strong>
                  <p className="text-muted">
                    {item.itemName}: {item.currentQuantity} remaining (min: {item.requiredMinimum})
                  </p>
                </div>
              </div>
            ))}

            {activeOccupants.length === 0 && lowStockItems.length === 0 && (
              <div className="part2-empty" style={{ padding: 'var(--vyntra-space-lg)' }}>
                <div className="part2-empty__icon">📝</div>
                <div className="part2-empty__title">No Recent Activity</div>
                <div className="part2-empty__description">
                  Operational events will appear here as you manage the shelter.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
