/**
 * VYNTRA — Main Home Screen (User System)
 * High-visibility SOS trigger, quick modules, and emergency contacts.
 * Includes "Get Shelter Data" button to manually download district
 * shelter providers from Firebase into local IndexedDB cache.
 * Offline-first with local cached profile retrieval.
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getItem, getAllItems, STORES } from '../../shared/utils/offline-cache';
import { forceShelterSync, getLastSyncTimestamp } from './shelter-cache';
import type { UserProfile, ShelterMetadata } from '../../shared/types';
import '../styles/sos.css';

/** Sync status for the Get Data button */
type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline' | 'no-district';

export default function HomeScreen() {
  const { vyntraUser, user, isOnline } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const [cachedCount, setCachedCount] = useState(0);
  const [lastSynced, setLastSynced] = useState<string>('');

  useEffect(() => {
    async function loadProfile() {
      if (!vyntraUser) return;
      const cached = await getItem<UserProfile>(STORES.PROFILE, vyntraUser.appId);
      if (cached) {
        setProfile(cached);

        /* Check existing cached shelter count for user's district */
        try {
          const allCached = await getAllItems<ShelterMetadata>(STORES.SHELTER_CACHE);
          const districtShelters = allCached.filter(
            (s) => s.district?.toLowerCase() === cached.district?.toLowerCase()
          );
          setCachedCount(districtShelters.length);

          /* Show last sync time if available */
          if (cached.district) {
            const ts = getLastSyncTimestamp(cached.district);
            if (ts > 0) {
              setLastSynced(formatTimeAgo(ts));
            }
          }
        } catch {
          /* Non-critical — just display 0 */
        }
      }
    }
    loadProfile();
  }, [vyntraUser]);

  /**
   * Handles the manual "Get Data" button press.
   * Downloads district-matching shelter providers from Firebase
   * and saves them to IndexedDB SHELTER_CACHE store.
   */
  const handleGetData = async () => {
    /* Guard: need internet */
    if (!navigator.onLine) {
      setSyncStatus('offline');
      setSyncMessage('You\'re offline. Connect to the internet to download shelter data.');
      return;
    }

    /* Guard: need district in profile */
    if (!profile?.district || !profile?.state) {
      setSyncStatus('no-district');
      setSyncMessage('Please complete your profile with your district first.');
      return;
    }

    setSyncStatus('syncing');
    setSyncMessage(`Downloading shelters for ${profile.district}, ${profile.state}...`);

    try {
      const count = await forceShelterSync(profile.district, profile.state);

      if (count > 0) {
        setSyncStatus('success');
        setSyncMessage(`✓ Downloaded ${count} shelter${count > 1 ? 's' : ''} for ${profile.district}`);
        setCachedCount(count);
        setLastSynced('Just now');
      } else if (count === 0) {
        setSyncStatus('success');
        setSyncMessage(`No shelter providers registered in ${profile.district} yet.`);
      } else {
        setSyncStatus('error');
        setSyncMessage('Could not connect to server. Try again later.');
      }
    } catch (err) {
      console.warn('[HomeScreen] Shelter sync failed:', err);
      setSyncStatus('error');
      setSyncMessage('Download failed. Please check your connection and try again.');
    }

    /* Auto-clear status after 6 seconds */
    setTimeout(() => {
      setSyncStatus('idle');
      setSyncMessage('');
    }, 6000);
  };

  const displayName = profile?.name || user?.displayName || 'User';
  const completeness = profile?.profileCompleteness ?? 0;

  return (
    <div className="home-screen">
      {/* Top Bar */}
      <div className="home-top-bar">
        <div className="user-welcome">
          <h2>Hello, {displayName.split(' ')[0]}</h2>
          <p>Emergency Network Active • {profile?.district ? `${profile.district}, ${profile.state}` : 'Location Standby'}</p>
        </div>
        <Link to="/user/profile" className="profile-avatar-btn" title="View Profile">
          {displayName.charAt(0).toUpperCase()}
        </Link>
      </div>

      {/* Incomplete Profile Prompt if < 60% */}
      {completeness < 60 && (
        <div style={{
          background: 'var(--color-warning-surface)',
          border: '1px solid var(--color-warning)',
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div>
            <strong style={{ color: 'var(--color-warning-text)', fontSize: '0.85rem' }}>
              Profile {completeness}% Complete
            </strong>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--color-on-surface-variant)' }}>
              Add medical & emergency info for faster response.
            </p>
          </div>
          <Link
            to="/user/profile/create"
            style={{
              background: 'var(--color-warning-text)',
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: '8px',
              textDecoration: 'none',
              whiteSpace: 'nowrap'
            }}
          >
            Complete
          </Link>
        </div>
      )}

      {/* ═══════════ Get Shelter Data Card ═══════════ */}
      <div className="shelter-sync-card">
        <div className="shelter-sync-card__header">
          <div className="shelter-sync-card__icon">📡</div>
          <div className="shelter-sync-card__info">
            <div className="shelter-sync-card__title">District Shelter Data</div>
            <div className="shelter-sync-card__subtitle">
              {profile?.district
                ? <>
                    {cachedCount > 0
                      ? <>{cachedCount} shelter{cachedCount > 1 ? 's' : ''} cached for <strong>{profile.district}</strong></>
                      : <>No shelters downloaded for <strong>{profile.district}</strong> yet</>
                    }
                    {lastSynced && (
                      <span className="shelter-sync-card__last-sync"> • Synced {lastSynced}</span>
                    )}
                  </>
                : 'Complete your profile to download shelter data'
              }
            </div>
          </div>
        </div>

        <button
          className="shelter-sync-card__btn"
          onClick={handleGetData}
          disabled={syncStatus === 'syncing'}
        >
          {syncStatus === 'syncing' ? (
            <>
              <span className="shelter-sync-card__spinner" />
              Downloading...
            </>
          ) : (
            <>
              <span>⬇️</span>
              Get Shelter Data
            </>
          )}
        </button>

        {/* Status Feedback */}
        {syncMessage && (
          <div className={`shelter-sync-card__status shelter-sync-card__status--${syncStatus}`}>
            {syncStatus === 'success' && <span>✅</span>}
            {syncStatus === 'error' && <span>⚠️</span>}
            {syncStatus === 'offline' && <span>📵</span>}
            {syncStatus === 'no-district' && <span>📋</span>}
            <span>{syncMessage}</span>
          </div>
        )}
      </div>

      {/* Central Big SOS Card */}
      <div className="sos-trigger-card">
        <span style={{
          display: 'inline-block',
          background: 'var(--color-primary-surface)',
          color: 'var(--color-primary)',
          fontSize: '0.75rem',
          fontWeight: 800,
          padding: '4px 10px',
          borderRadius: '20px',
          letterSpacing: '0.05em',
          textTransform: 'uppercase'
        }}>
          Emergency Instant Dispatch
        </span>

        <button
          className="sos-main-btn"
          onClick={() => navigate('/sos/conditions')}
          aria-label="Activate SOS Emergency Dispatch"
        >
          SOS
          <span>TAP TO ACTIVATE</span>
        </button>

        <p className="sos-caption">
          Works offline via SMS • Auto-locates nearest shelters
        </p>
      </div>

      {/* Quick Navigation Cards */}
      <div className="quick-nav-grid">
        <Link to="/user/cycle-tracker" className="quick-nav-card">
          <span className="quick-nav-icon">🌸</span>
          <div>
            <div className="quick-nav-title">Cycle Tracker</div>
            <div className="quick-nav-desc">Record & view cycle logs</div>
          </div>
        </Link>

        <Link to="/chat" className="quick-nav-card">
          <span className="quick-nav-icon">📢</span>
          <div>
            <div className="quick-nav-title">Regional Chat</div>
            <div className="quick-nav-desc">District safety & alerts</div>
          </div>
        </Link>

        <Link to="/sos/shelters" className="quick-nav-card">
          <span className="quick-nav-icon">🏛️</span>
          <div>
            <div className="quick-nav-title">Nearby Shelters</div>
            <div className="quick-nav-desc">View offline cached shelters</div>
          </div>
        </Link>

        <Link to="/user/profile" className="quick-nav-card">
          <span className="quick-nav-icon">📋</span>
          <div>
            <div className="quick-nav-title">My Profile</div>
            <div className="quick-nav-desc">Health & emergency info</div>
          </div>
        </Link>
      </div>

      {/* National Emergency Dials */}
      <div className="emergency-dials-card">
        <div className="emergency-dials-title">Direct Emergency Helplines</div>
        <div className="dials-row">
          <a href="tel:112" className="dial-chip">
            📞 112 <small>(All Emergency)</small>
          </a>
          <a href="tel:1091" className="dial-chip">
            🛡️ 1091 <small>(Women)</small>
          </a>
          <a href="tel:108" className="dial-chip">
            🚑 108 <small>(Ambulance)</small>
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Formats a timestamp into a human-readable "time ago" string.
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted string like "2 min ago", "1 hr ago", etc.
 */
function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}
