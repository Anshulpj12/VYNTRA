/**
 * VYNTRA — Main Home Screen (User System)
 * High-visibility SOS trigger, quick modules, and emergency contacts.
 * Offline-first with local cached profile retrieval.
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getItem, STORES } from '../../shared/utils/offline-cache';
import type { UserProfile } from '../../shared/types';
import '../styles/sos.css';

export default function HomeScreen() {
  const { vyntraUser, user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!vyntraUser) return;
      const cached = await getItem<UserProfile>(STORES.PROFILE, vyntraUser.appId);
      if (cached) {
        setProfile(cached);
      }
    }
    loadProfile();
  }, [vyntraUser]);

  const handleSOSTrigger = () => {
    // Initiate SOS workflow -> conditions screen
    navigate('/sos/conditions');
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
          onClick={handleSOSTrigger}
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
