/**
 * VYNTRA — Role Selection & Switch Screen
 * 
 * Three-role Bento card layout with smart data detection:
 * - If a role has existing data (profile/registration), shows "Continue" instead of "Setup"
 * - Persists role switch to Firestore/cache
 * - Navigates to the correct destination (existing dashboard vs new registration)
 * - Emergency quick-dial always accessible
 * 
 * @module part1-user-system/auth/RoleSelectScreen
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type UserRole } from './AuthContext';
import '../styles/auth.css';

/** Role configuration with metadata for the UI */
interface RoleConfig {
  role: UserRole;
  icon: string;
  title: string;
  tag: string;
  tagColor: 'rose' | 'green' | 'amber';
  description: string;
  pills: string[];
  actionLabel: string;
  continueLabel: string;
  newRoute: string;
  existingRoute: string;
}

const ROLE_CONFIGS: RoleConfig[] = [
  {
    role: 'user',
    icon: '🆘',
    title: 'I Need Help',
    tag: 'User Mode',
    tagColor: 'rose',
    description: 'Immediate safety assistance, emergency SOS beacon, verified secure shelters, and offline menstrual health tracker.',
    pills: ['🚨 Emergency SOS', '🏡 Safe Shelters', '🌸 Health Tracker'],
    actionLabel: 'Enter User Mode',
    continueLabel: 'Continue as User',
    newRoute: '/user/profile/create',
    existingRoute: '/user/home',
  },
  {
    role: 'shelter-provider',
    icon: '🏡',
    title: 'I Provide Shelter',
    tag: 'Shelter Portal',
    tagColor: 'green',
    description: 'Manage bed capacity, verify occupant intake and admission, monitor emergency provisions and safe spaces.',
    pills: ['🛏️ Bed Capacity', '📋 Occupant Intake', '📦 Provisions'],
    actionLabel: 'Enter Shelter Portal',
    continueLabel: 'Continue to Shelter',
    newRoute: '/shelter/register',
    existingRoute: '/shelter/dashboard',
  },
  {
    role: 'service-provider',
    icon: '🚚',
    title: 'I Supply Resources',
    tag: 'Provider',
    tagColor: 'amber',
    description: 'Coordinate rapid dispatch, fulfillment of essential relief orders, transport, and localized logistics.',
    pills: ['⚡ Rapid Dispatch', '💊 Medical Kits', '🗺️ Logistics'],
    actionLabel: 'Enter Provider Portal',
    continueLabel: 'Continue to Dashboard',
    newRoute: '/service/register',
    existingRoute: '/service/dashboard',
  },
];

export default function RoleSelectScreen() {
  const navigate = useNavigate();
  const {
    vyntraUser,
    activeRole,
    roleData,
    roleDataLoading,
    setActiveRole,
    signOut,
    user,
  } = useAuth();
  const [copied, setCopied] = useState(false);
  const [discreetMode, setDiscreetMode] = useState(false);
  const [switching, setSwitching] = useState(false);

  const appId = vyntraUser?.appId || 'VYNTRA-USR-UNKNOWN';
  const userEmail = user?.email || 'Guest User';
  const displayName = user?.displayName || vyntraUser?.appId?.slice(-8) || 'User';

  const handleCopyId = () => {
    navigator.clipboard.writeText(appId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Check if a role has existing data (i.e., user doesn't need to register/create profile again).
   */
  const hasExistingData = (role: UserRole): boolean => {
    switch (role) {
      case 'user':
        return !!roleData.userProfile;
      case 'shelter-provider':
        return !!roleData.shelterProvider;
      case 'service-provider':
        return !!roleData.serviceProvider;
      default:
        return false;
    }
  };

  /**
   * Handle role card click: switch role + navigate to the right place.
   */
  const handleRoleSelect = async (config: RoleConfig) => {
    setSwitching(true);
    try {
      await setActiveRole(config.role);

      // After role data loads, decide where to go
      // We need to check role data AFTER it loads
      // The setActiveRole triggers loadDataForRole, but state updates are async.
      // So we check current roleData for the specific role.
      const existingData = hasExistingData(config.role);

      if (existingData) {
        navigate(config.existingRoute, { replace: true });
      } else {
        navigate(config.newRoute, { replace: true });
      }
    } catch (err) {
      console.warn('[VYNTRA] Role switch error:', err);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className={`role-select-screen ${discreetMode ? 'discreet-active' : ''}`}>
      {/* Reassurance Badge */}
      <div className="role-top-badge-container">
        <div className="role-safety-pill">
          <span className="pill-dot" />
          <span>🛡️ Secure Dignity Network</span>
        </div>
      </div>

      {/* Hero Welcome */}
      <header className="role-hero-header">
        <h1 className="role-hero-title">Welcome to VYNTRA</h1>
        <p className="role-hero-subtitle">
          Select your operational role to enter customized safety protocols and emergency networks.
        </p>

        {/* User Identity Card */}
        <div className="role-user-info-card" id="role-user-info">
          <div className="role-user-info-top">
            <div className="role-user-avatar">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="role-user-avatar-img"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="role-user-avatar-fallback">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="role-user-details">
              <span className="role-user-name">{displayName}</span>
              <span className="role-user-email">{userEmail}</span>
            </div>
            <button
              type="button"
              className="role-signout-btn"
              onClick={signOut}
              title="Sign Out"
              id="sign-out-btn"
            >
              🚪 Sign Out
            </button>
          </div>
          <div className="role-identity-chip">
            <div className="identity-info">
              <span className="identity-icon">🪪</span>
              <span className="identity-label">ID: <strong>{appId}</strong></span>
            </div>
            <button
              type="button"
              className="identity-copy-btn"
              onClick={handleCopyId}
              title="Copy ID"
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>
        </div>

        {/* Current Role Indicator */}
        <div className="role-current-indicator" id="current-role-badge">
          <span className="role-current-dot" />
          <span>Current Role: <strong>{
            activeRole === 'user' ? 'User Mode'
            : activeRole === 'shelter-provider' ? 'Shelter Provider'
            : 'Service Provider'
          }</strong></span>
        </div>
      </header>

      {/* Loading Overlay */}
      {(switching || roleDataLoading) && (
        <div className="role-switching-overlay">
          <div className="loading-spinner" />
          <span>Loading role data...</span>
        </div>
      )}

      {/* Bento Roles Grid */}
      <div className="roles-bento-grid">
        {ROLE_CONFIGS.map((config) => {
          const isCurrentRole = activeRole === config.role;
          const hasData = hasExistingData(config.role);

          return (
            <article
              key={config.role}
              className={`bento-card bento-card--${config.tagColor} ${isCurrentRole ? 'bento-card--active' : ''}`}
              onClick={() => handleRoleSelect(config)}
              id={`role-card-${config.role}`}
            >
              {/* Active Role Badge */}
              {isCurrentRole && (
                <div className="bento-active-badge">
                  <span className="bento-active-dot" />
                  Active Role
                </div>
              )}

              {/* Data Status Badge */}
              {hasData && (
                <div className="bento-data-badge">
                  ✅ Profile Saved
                </div>
              )}

              <div className="bento-card__header">
                <div className={`bento-badge bento-badge--${config.tagColor}`}>
                  <span>{config.icon}</span>
                </div>
                <div className="bento-title-group">
                  <div className="bento-title-row">
                    <h2 className="bento-title">{config.title}</h2>
                    <span className={`bento-tag bento-tag--${config.tagColor}`}>{config.tag}</span>
                  </div>
                  <p className="bento-description">
                    {config.description}
                  </p>
                </div>
              </div>

              <div className="bento-pills-row">
                {config.pills.map((pill) => (
                  <span key={pill} className="bento-pill">{pill}</span>
                ))}
              </div>

              <button
                type="button"
                className={`bento-action-btn bento-action-btn--${config.tagColor}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRoleSelect(config);
                }}
                disabled={switching}
              >
                <span>
                  {hasData ? config.continueLabel : config.actionLabel}
                </span>
                <span className="btn-arrow">→</span>
              </button>
            </article>
          );
        })}
      </div>

      {/* Emergency Hotline Card */}
      <section className="role-emergency-card">
        <div className="role-emergency-top">
          <div className="emergency-title-box">
            <span className="emergency-warning-icon">⚠️</span>
            <h3>Immediate Emergency Response</h3>
          </div>
          <button
            type="button"
            className="discreet-toggle-btn"
            onClick={() => setDiscreetMode(!discreetMode)}
            title="Toggle Discreet Mode"
          >
            <span>👁️</span> {discreetMode ? 'Normal View' : 'Discreet View'}
          </button>
        </div>
        <p className="role-emergency-desc">
          In imminent danger, bypass authentication to connect immediately with national emergency services or crisis operators.
        </p>
        <a href="tel:112" className="emergency-dial-btn">
          <span>📞 Call 112 Emergency Services</span>
          <span className="call-badge">Dial 112</span>
        </a>
      </section>

      {/* Trust & Encryption Footer */}
      <footer className="role-trust-strip">
        <span>🔒 256-bit Encrypted</span>
        <span>•</span>
        <span>🛡️ Zero Tracking</span>
        <span>•</span>
        <span>📱 100% Offline Ready</span>
      </footer>
    </div>
  );
}
