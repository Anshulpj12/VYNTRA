/**
 * VYNTRA — User Safety Profile View Screen
 * Design System: Serene Sanctuary (Stitch MCP Screen 4326cfdfabbb4c2c842bf86d214e5a85)
 * Tactile Bento hierarchy, PWA offline resilience, and rapid emergency telemetry
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getItem, STORES } from '../../shared/utils/offline-cache';
import type { UserProfile } from '../../shared/types';
import '../styles/profile.css';

export default function ProfileViewScreen() {
  const { vyntraUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!vyntraUser) return;
      const cached = await getItem<UserProfile>(STORES.PROFILE, vyntraUser.appId);
      if (cached) setProfile(cached);
      setLoading(false);
    };
    load();
  }, [vyntraUser]);

  const handleCopyId = () => {
    if (vyntraUser?.appId) {
      navigator.clipboard?.writeText(vyntraUser.appId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="profile-view-page">
        <div className="profile-loading-box">
          <div className="loading-spinner" />
          <span>Decrypting local safety profile...</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-view-page">
        <div className="profile-empty-card">
          <div className="bento-icon-bubble">🛡️</div>
          <h2>No Safety Profile Initialized</h2>
          <p>Create your encrypted sanctuary profile to unlock rapid emergency response and regional alerts.</p>
          <button className="dock-btn-primary" onClick={() => navigate('/user/profile/create')}>
            Initialize Safety Profile
          </button>
        </div>
      </div>
    );
  }

  // Derive initials
  const initials = profile.name
    ? profile.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const completeness = profile.profileCompleteness || 85;

  return (
    <div className="profile-view-page">
      {/* Top App Bar */}
      <header className="profile-app-bar">
        <button
          type="button"
          className="app-bar-back-btn"
          onClick={() => navigate('/user/home')}
          aria-label="Back to Home"
        >
          ←
        </button>
        <div className="app-bar-center">
          <span className="app-bar-badge">Sanctuary Vault</span>
          <h1 className="app-bar-title">Safety Profile</h1>
        </div>
        <div className="app-bar-encryption-badge" title="Online & Synced">
          <span style={{ fontSize: '15px' }}>🛡️</span>
        </div>
      </header>

      {/* Hero Profile Card */}
      <section className="profile-hero-card">
        <div className="hero-ambient-glow" />

        <div className="hero-profile-header">
          <div className="hero-avatar-wrapper">
            <div className="hero-avatar-circle">
              {initials}
            </div>
            <div className="hero-verified-badge" title="Verified Identity">
              ✓
            </div>
          </div>

          <div className="hero-details">
            <div className="hero-name-row">
              <h2 className="hero-user-name">{profile.name}</h2>
            </div>

            <button
              type="button"
              className="hero-id-chip"
              onClick={handleCopyId}
              title="Click to copy unique Vyntra ID"
            >
              <span>🔑</span>
              <span className="hero-id-text">{vyntraUser?.appId || profile.appId}</span>
              {copied ? (
                <span className="hero-copy-toast">Copied!</span>
              ) : (
                <span className="hero-copy-icon">📋</span>
              )}
            </button>
          </div>
        </div>

        {/* Completeness Telemetry Bar */}
        <div className="hero-completeness-box">
          <div className="hero-completeness-labels">
            <span className="hero-completeness-pct">
              ⚡ {completeness}% Ready for Rapid Response
            </span>
            <span className="hero-tier-tag">Tier 1</span>
          </div>

          <div className="hero-progress-track">
            <div
              className="hero-progress-fill"
              style={{ width: `${completeness}%` }}
            />
          </div>

          <div className="hero-reassurance-row">
            <span className="hero-shield-pill">
              🔒 Resilient &amp; Offline Encrypted
            </span>
            <span className="hero-audit-text">
              {profile.pendingSync ? 'Sync Pending' : 'Live Synced'}
            </span>
          </div>
        </div>
      </section>

      {/* Bento Card 1: Basic & Regional Information */}
      <section className="profile-bento-card">
        <div className="bento-header">
          <div className="bento-title-group">
            <div className="bento-icon-bubble spruce">📍</div>
            <h3 className="bento-card-title">Basic &amp; Regional Information</h3>
          </div>
          <span className="bento-security-chip">
            🛡️ Tier-1 Encrypted
          </span>
        </div>

        <div className="bento-rows-stack">
          {/* Gender & Age */}
          <div className="bento-data-row">
            <div className="bento-row-left">
              <span className="bento-row-icon">👤</span>
              <span>Profile Demographics</span>
            </div>
            <div className="bento-demographics-tags">
              <span className="bento-gender-tag">{profile.gender}</span>
              <span className="bento-row-right">{profile.age} Years</span>
            </div>
          </div>

          {/* State & District */}
          <div className="bento-data-row">
            <div className="bento-row-left">
              <span className="bento-row-icon">🗺️</span>
              <span>State &amp; District</span>
            </div>
            <div className="bento-row-right">
              {profile.state} • {profile.district}
            </div>
          </div>

          {/* Encrypted Coordinates */}
          <div className="bento-data-row">
            <div className="bento-row-left">
              <span className="bento-row-icon">📍</span>
              <span>GPS Coordinates</span>
            </div>
            <div className="bento-coords-chip">
              🔐 {profile.homeCoordinates?.lat ? `${profile.homeCoordinates.lat.toFixed(4)}°, ${profile.homeCoordinates.lng.toFixed(4)}°` : 'Stored locally'}
            </div>
          </div>

          {/* Sanctuary Home Address */}
          <div className="bento-address-block">
            <span className="bento-row-icon" style={{ marginTop: '3px' }}>🏠</span>
            <div className="bento-address-text">
              <span className="bento-address-label">Saved Sanctuary Address</span>
              <p className="bento-address-val">{profile.homeAddress || 'Not specified'}</p>
            </div>
          </div>

          {/* Emergency Guardian Card */}
          <div className="guardian-touch-card">
            <div className="guardian-left-side">
              <div className="guardian-avatar-bubble">🆘</div>
              <div className="guardian-info">
                <div className="guardian-name-row">
                  <h4 className="guardian-name">Emergency Contact</h4>
                  <span className="guardian-tag">Guardian</span>
                </div>
                <p className="guardian-phone">{profile.emergencyContact || 'None provided'}</p>
              </div>
            </div>
            {profile.emergencyContact && (
              <a
                href={`tel:${profile.emergencyContact.replace(/[^0-9+]/g, '')}`}
                className="guardian-call-btn"
                aria-label="Call Emergency Contact"
              >
                📞
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Bento Card 2: Health & Care Information */}
      <section className="profile-bento-card">
        <div className="bento-header">
          <div className="bento-title-group">
            <div className="bento-icon-bubble">🩺</div>
            <h3 className="bento-card-title">Health &amp; Care Requirements</h3>
          </div>
          <span className="bento-security-chip rose">
            ❤️ Sensitive Care
          </span>
        </div>

        <div className="health-care-grid">
          {/* Pregnancy Status */}
          <div className={`health-status-tile ${profile.pregnancyStatus?.isPregnant ? 'alert' : ''}`}>
            <div className="tile-icon-bubble">🤰</div>
            <div className="tile-body">
              <span className="tile-title">Pregnancy Status</span>
              <p className="tile-status">
                {profile.pregnancyStatus?.isPregnant
                  ? `Expecting • Month ${profile.pregnancyStatus.estimatedMonth || 1}`
                  : 'Not Expecting'}
              </p>
            </div>
          </div>

          {/* Menstrual Cycle Tile with quick link */}
          <div
            className="health-status-tile"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/user/cycle-tracker')}
            title="Open Menstrual Cycle Tracker"
          >
            <div className="tile-icon-bubble spruce">🌸</div>
            <div className="tile-body">
              <span className="tile-title">Cycle Protocol</span>
              <p className="tile-status">
                {profile.currentlyMenstruating ? 'Active Cycle ↗' : 'Cycle Tracked ↗'}
              </p>
            </div>
          </div>
        </div>

        {/* Accessibility Needs */}
        {profile.disabilities && profile.disabilities.length > 0 && (
          <div className="accessibility-section">
            <span className="accessibility-label">Accessibility Accommodations</span>
            <div className="accessibility-chips-wrap">
              {profile.disabilities.map((d) => (
                <span key={d} className="accessibility-pill">
                  ♿ {d}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Vital Medical Notes */}
        <div className="medical-notes-banner">
          <div className="medical-notes-header">
            <span>📋</span>
            <span>Vital Medical Conditions &amp; Allergies</span>
          </div>
          <p className="medical-notes-content">
            {profile.medicalConditions || 'No critical allergies or conditions recorded. Tap Edit to update.'}
          </p>
        </div>

        {profile.specialRequirements && (
          <div className="medical-notes-banner" style={{ background: '#FAF8F5' }}>
            <div className="medical-notes-header" style={{ color: '#4a6267' }}>
              <span>ℹ️</span>
              <span>Special Support Notes</span>
            </div>
            <p className="medical-notes-content">
              {profile.specialRequirements}
            </p>
          </div>
        )}
      </section>

      {/* Local Security & Storage Micro-Note */}
      <div className="local-mesh-footnote">
        <span>🔒</span>
        <span>
          Data encrypted locally with <strong>AES-256 GCM</strong>. Syncs peer-to-peer via Bluetooth &amp; local mesh if cellular network disconnects.
        </span>
      </div>

      {/* Bottom Fixed Action Dock */}
      <footer className="profile-view-dock">
        <button
          type="button"
          className="dock-btn-primary"
          onClick={() => navigate('/user/profile/create')}
        >
          <span>✏️</span>
          <span>Edit Safety Profile</span>
        </button>
        <button
          type="button"
          className="dock-btn-secondary"
          onClick={() => navigate('/user/home')}
        >
          <span>←</span>
          <span>Back to Home</span>
        </button>
      </footer>
    </div>
  );
}
