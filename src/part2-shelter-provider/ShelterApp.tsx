/**
 * VYNTRA Part 2 — Shelter Provider App Shell
 * 
 * Main application shell with sidebar navigation connecting all modules:
 * Registration, Dashboard, Beds/Occupants, Facilities, Inventory, Metadata.
 * 
 * @module part2-shelter-provider/ShelterApp
 * @part Part 2 — Shelter Provider
 */

import { ShelterProvider, useShelter, type ShelterTab } from './context/ShelterContext';
import { ConnectivityProvider, useConnectivity } from './context/ConnectivityContext';
import { isFirebaseConfigured } from '../shared/firebase/config';
import ShelterRegistrationScreen from './registration/ShelterRegistrationScreen';
import ShelterDashboardScreen from './dashboard/ShelterDashboardScreen';
import BedManagementScreen from './bed-management/BedManagementScreen';
import FacilitiesScreen from './facilities/FacilitiesScreen';
import InventoryScreen from './inventory/InventoryScreen';
import MetadataScreen from './metadata/MetadataScreen';
import './styles/part2-base.css';

/** Navigation items for the sidebar */
interface NavItem {
  tab: ShelterTab;
  label: string;
  icon: string;
  requiresActive: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { tab: 'registration', label: 'Setup & Registration', icon: '📋', requiresActive: false },
  { tab: 'dashboard', label: 'Operations & Capacity', icon: '📊', requiresActive: true },
  { tab: 'beds', label: 'Intake & Allocation', icon: '👤', requiresActive: true },
  { tab: 'facilities', label: 'Facilities & Hygiene', icon: '🏥', requiresActive: true },
  { tab: 'inventory', label: 'Supplies & Dispatch', icon: '📦', requiresActive: true },
  { tab: 'metadata', label: 'Emergency Network', icon: '🌐', requiresActive: true },
];

/**
 * Inner app shell — renders sidebar, header, and active screen.
 */
function ShelterAppInner() {
  const { state, dispatch } = useShelter();
  const { status, pendingCount } = useConnectivity();
  const { shelter, activeTab } = state;

  const isActive = shelter?.isActive ?? false;

  /** Switch to a tab (only if shelter is active or tab doesn't require it) */
  const navigateTo = (tab: ShelterTab) => {
    const item = NAV_ITEMS.find((n) => n.tab === tab);
    if (item?.requiresActive && !isActive) return;
    dispatch({ type: 'SET_TAB', payload: tab });
  };

  /** Render the current screen */
  const renderScreen = () => {
    if (!isActive && activeTab !== 'registration') {
      return <ShelterRegistrationScreen />;
    }

    switch (activeTab) {
      case 'registration':
        return <ShelterRegistrationScreen />;
      case 'dashboard':
        return <ShelterDashboardScreen />;
      case 'beds':
        return <BedManagementScreen />;
      case 'facilities':
        return <FacilitiesScreen />;
      case 'inventory':
        return <InventoryScreen />;
      case 'metadata':
        return <MetadataScreen />;
      default:
        return <ShelterDashboardScreen />;
    }
  };

  /** Sync badge text */
  const getSyncLabel = () => {
    if (!isFirebaseConfigured()) {
      return '🧪 TEST MODE (LOCAL CACHE) — FIREBASE BYPASS';
    }
    switch (status) {
      case 'online-synced':
        return 'ONLINE / FIREBASE SYNCED';
      case 'offline-saved':
        return 'OFFLINE — Data Saved Locally';
      case 'sync-pending':
        return `Sync Pending (${pendingCount})`;
    }
  };

  return (
    <div className="part2-shelter">
      <div className="part2-layout">
        {/* ─── Sidebar ─── */}
        <nav className="part2-sidebar" id="shelter-sidebar">
          <div className="part2-sidebar__brand">
            <div className="part2-sidebar__brand-icon">🛡️</div>
            <div>
              <div className="part2-sidebar__brand-name">SafeHaven</div>
              <div className="part2-sidebar__brand-sub">Crisis Sanctuary Desk</div>
            </div>
          </div>

          {shelter && (
            <div className="part2-sidebar__shelter-id">
              <span className="part2-sidebar__id-badge">
                📍 {shelter.shelterId.slice(-7)}
              </span>
              <span
                className={`part2-sidebar__status-pill ${
                  isActive
                    ? 'part2-sidebar__status-pill--active'
                    : 'part2-sidebar__status-pill--inactive'
                }`}
              >
                {isActive ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
          )}

          <ul className="part2-sidebar__nav">
            {NAV_ITEMS.map((item, index) => {
              const isDisabled = item.requiresActive && !isActive;
              const isCurrent = activeTab === item.tab;

              return (
                <li
                  key={item.tab}
                  className={`part2-sidebar__nav-item ${
                    isCurrent ? 'part2-sidebar__nav-item--active' : ''
                  }`}
                  onClick={() => !isDisabled && navigateTo(item.tab)}
                  style={{
                    opacity: isDisabled ? 0.4 : 1,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                  }}
                  id={`nav-${item.tab}`}
                >
                  <span className="part2-sidebar__nav-icon">{item.icon}</span>
                  <span>{index + 1}. {item.label}</span>
                </li>
              );
            })}
          </ul>

          {/* Test controls in sidebar */}
          <div style={{ marginTop: 'auto', padding: '16px 12px', borderTop: '1px solid var(--vyntra-border)' }}>
            <button
              type="button"
              className="part2-btn part2-btn--ghost part2-btn--sm"
              style={{ width: '100%', fontSize: '12px', justifyContent: 'center' }}
              onClick={() => dispatch({ type: 'RESET_SHELTER' })}
              id="sidebar-reset-btn"
              title="Reset state and return to registration screen"
            >
              🔄 Reset / New Test
            </button>
          </div>
        </nav>

        {/* ─── Main Area ─── */}
        <main className="part2-main">
          {/* Header */}
          <header className="part2-header" id="shelter-header">
            <div className="part2-header__left">
              <span
                className={`sync-badge ${
                  !isFirebaseConfigured()
                    ? 'sync-badge--pending'
                    : status === 'online-synced'
                    ? 'sync-badge--online'
                    : status === 'offline-saved'
                    ? 'sync-badge--offline'
                    : 'sync-badge--pending'
                }`}
              >
                <span className="sync-badge__dot" />
                {getSyncLabel()}
              </span>
              {pendingCount > 0 && isFirebaseConfigured() && (
                <span className="text-muted" style={{ fontSize: '13px' }}>
                  📁 Cached locally ({pendingCount} pending)
                </span>
              )}
            </div>
            <div className="part2-header__right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {shelter ? (
                <>
                  <span className="text-muted" style={{ fontSize: '13px', fontWeight: 600 }}>
                    {shelter.shelterName}
                  </span>
                  <button
                    type="button"
                    className="part2-btn part2-btn--secondary part2-btn--sm"
                    onClick={() => dispatch({ type: 'RESET_SHELTER' })}
                    id="header-reset-btn"
                    style={{ fontSize: '12px', padding: '4px 10px' }}
                  >
                    🔄 Reset Test
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="part2-btn part2-btn--secondary part2-btn--sm"
                  onClick={() => dispatch({ type: 'LOAD_DEMO_DATA' })}
                  id="header-load-demo-btn"
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                >
                  🚀 Launch Demo Preset
                </button>
              )}
            </div>
          </header>

          {/* Shelter Status Broadcast */}
          {isActive && (
            <div
              style={{
                background: 'var(--vyntra-primary)',
                color: 'white',
                padding: '8px var(--vyntra-space-xl)',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              id="shelter-broadcast-bar"
            >
              <span>🛡️</span>
              <span>
                SHELTER STATUS BROADCAST: Safe Space Protocol Active • Emergency Admissions Priority: High • Regional Network Linked
              </span>
            </div>
          )}

          {/* Content */}
          <div className="part2-content">
            {renderScreen()}
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Top-level Shelter App wrapped with providers.
 * Renders the full shelter provider management system.
 */
export default function ShelterApp() {
  return (
    <ConnectivityProvider>
      <ShelterProvider>
        <ShelterAppInner />
      </ShelterProvider>
    </ConnectivityProvider>
  );
}
