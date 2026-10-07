/**
 * VYNTRA — Role Selection & Sign-In Screen (Role-First Flow)
 * 
 * Users arrive here first. They select a role, then a sign-in modal appears
 * specifically for that role (Google, Email, or Guest).
 * 
 * Each role maintains independent authentication and database records:
 * - User Mode: links to UserProfile (safe shelters, SOS, menstrual tracker)
 * - Shelter Provider: links to ShelterProvider (bed capacity, facilities, intake)
 * - Service Provider: links to ServiceProvider (dispatch, orders, relief items)
 * 
 * When a user re-logs in, their role data is automatically restored from the database.
 * 
 * @module part1-user-system/auth/RoleSelectScreen
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type UserRole, type RoleData } from './AuthContext';
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
    roleData,
    roleDataLoading,
    setActiveRole,
    signOut,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signInAsGuest,
    user,
    isOnline,
    error: authError,
    isRoleSignedIn,
  } = useAuth();

  const [discreetMode, setDiscreetMode] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Sign-in modal state
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [pendingRole, setPendingRole] = useState<RoleConfig | null>(null);
  const [emailMode, setEmailMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /**
   * Check if a role has existing data in roleData (loaded from DB/cache).
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
   * Handle role card click:
   * - If ALREADY signed in for this specific role: switch role + navigate
   * - If NOT signed in for this specific role: open sign-in modal for this role
   */
  const handleRoleSelect = async (config: RoleConfig) => {
    const isAuthedForThisRole = isRoleSignedIn(config.role);
    if (isAuthedForThisRole) {
      setSwitching(true);
      try {
        await setActiveRole(config.role);
        const existingData = hasExistingData(config.role);
        navigate(existingData ? config.existingRoute : config.newRoute, { replace: true });
      } catch (err) {
        console.warn('[VYNTRA] Role switch error:', err);
      } finally {
        setSwitching(false);
      }
    } else {
      // Prompt sign in specifically for this role
      setPendingRole(config);
      setFormError(null);
      setEmail('');
      setPassword('');
      setEmailMode('signin');
      setShowSignInModal(true);
    }
  };

  /**
   * Google sign-in from modal — applied strictly for pendingRole
   */
  const handleGoogleSignIn = async () => {
    if (!pendingRole) return;
    setFormError(null);
    setSubmitting(true);
    try {
      const loadedRoleData: RoleData = await signInWithGoogle(pendingRole.role);
      const hasData = pendingRole.role === 'user'
        ? !!loadedRoleData.userProfile
        : pendingRole.role === 'shelter-provider'
        ? !!loadedRoleData.shelterProvider
        : !!loadedRoleData.serviceProvider;

      setShowSignInModal(false);
      const targetRoute = hasData ? pendingRole.existingRoute : pendingRole.newRoute;
      setPendingRole(null);
      navigate(targetRoute, { replace: true });
    } catch (err) {
      setFormError(authError || 'Google Sign-in was not completed or failed.');
      console.warn('Auth notice:', err);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Email sign-in/sign-up from modal — applied strictly for pendingRole
   */
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingRole) return;
    if (!email.trim() || !password) {
      setFormError('Please provide both email and password.');
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      let loadedRoleData: RoleData;
      if (emailMode === 'signin') {
        loadedRoleData = await signInWithEmail(email, password, pendingRole.role);
      } else {
        loadedRoleData = await signUpWithEmail(email, password, pendingRole.role);
      }
      const hasData = pendingRole.role === 'user'
        ? !!loadedRoleData.userProfile
        : pendingRole.role === 'shelter-provider'
        ? !!loadedRoleData.shelterProvider
        : !!loadedRoleData.serviceProvider;

      setShowSignInModal(false);
      const targetRoute = hasData ? pendingRole.existingRoute : pendingRole.newRoute;
      setPendingRole(null);
      navigate(targetRoute, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Guest entry from modal — applied strictly for pendingRole
   */
  const handleGuestEntry = async () => {
    if (!pendingRole) return;
    setFormError(null);
    setSubmitting(true);
    try {
      const loadedRoleData = await signInAsGuest(pendingRole.role);
      const hasData = pendingRole.role === 'user'
        ? !!loadedRoleData.userProfile
        : pendingRole.role === 'shelter-provider'
        ? !!loadedRoleData.shelterProvider
        : !!loadedRoleData.serviceProvider;

      setShowSignInModal(false);
      const targetRoute = hasData ? pendingRole.existingRoute : pendingRole.newRoute;
      setPendingRole(null);
      navigate(targetRoute, { replace: true });
    } catch {
      setFormError('Could not initialize emergency guest mode.');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Close sign-in modal
   */
  const handleCloseModal = () => {
    setShowSignInModal(false);
    setPendingRole(null);
    setFormError(null);
    setSubmitting(false);
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
          Select your operational role below. Each portal maintains independent security and dedicated profile records.
        </p>

        {/* Clean, unobtrusive Google account badge if connected */}
        {user && (
          <div className="role-connected-pill">
            <span className="connected-dot" />
            <span>Connected: <strong>{user.email || user.displayName}</strong></span>
            <button
              type="button"
              className="connected-signout-btn"
              onClick={() => signOut()}
              title="Sign Out All"
            >
              Sign Out
            </button>
          </div>
        )}
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
          const isAuthed = isRoleSignedIn(config.role);
          const hasData = hasExistingData(config.role);
          const profileSummary =
            config.role === 'user' && roleData.userProfile
              ? roleData.userProfile.name
              : config.role === 'shelter-provider' && roleData.shelterProvider
              ? roleData.shelterProvider.shelterName
              : config.role === 'service-provider' && roleData.serviceProvider
              ? roleData.serviceProvider.providerName
              : null;

          return (
            <article
              key={config.role}
              className={`bento-card bento-card--${config.tagColor} ${isAuthed ? 'bento-card--active' : ''}`}
              onClick={() => handleRoleSelect(config)}
              id={`role-card-${config.role}`}
            >
              {/* Active Role Badge */}
              {isAuthed && (
                <div className="bento-active-badge">
                  <span className="bento-active-dot" />
                  Active Portal
                </div>
              )}

              {/* Data Status Badge */}
              {hasData && (
                <div className="bento-data-badge">
                  ✅ {profileSummary ? profileSummary : 'Profile Loaded'}
                </div>
              )}

              {isAuthed && !hasData && (
                <div className="bento-data-badge" style={{ background: '#fff3cd', color: '#856404', borderColor: '#ffeeba' }}>
                  🆕 Setup Required
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
                  {isAuthed
                    ? (hasData ? config.continueLabel : config.actionLabel)
                    : `Sign in to ${config.title}`}
                </span>
                <span className="btn-arrow">→</span>
              </button>
            </article>
          );
        })}
      </div>

      {/* ──── Sign-In Modal (appears specifically for selected role) ──── */}
      {showSignInModal && pendingRole && (
        <div className="signin-modal-overlay" onClick={handleCloseModal}>
          <div className="signin-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="signin-modal-header">
              <div className="signin-modal-role-badge">
                <span className={`signin-role-icon signin-role-icon--${pendingRole.tagColor}`}>
                  {pendingRole.icon}
                </span>
                <div>
                  <h3 className="signin-modal-title">Sign in as {pendingRole.title}</h3>
                  <p className="signin-modal-subtitle">
                    Authenticate to access {pendingRole.tag.toLowerCase()} features
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="signin-modal-close"
                onClick={handleCloseModal}
              >
                ✕
              </button>
            </div>

            {/* Error Display */}
            {(formError || authError) && (
              <div className="signin-error-banner">
                <span>⚠️</span>
                <p>{formError || authError}</p>
              </div>
            )}

            {/* Google Sign In */}
            <button
              className="login-btn login-btn--google"
              onClick={handleGoogleSignIn}
              disabled={!isOnline || submitting}
              id="google-signin-btn"
            >
              <svg className="login-google-icon" viewBox="0 0 24 24" width="24" height="24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {submitting ? 'Signing in...' : 'Continue with Google'}
            </button>

            {/* Email Sign In */}
            <button
              className="login-btn login-btn--email"
              disabled={!isOnline || submitting}
              onClick={() => {
                setFormError(null);
                const emailSection = document.getElementById('signin-email-section');
                if (emailSection) {
                  emailSection.classList.toggle('email-section--visible');
                }
              }}
            >
              <span className="btn-icon">📧</span> Sign in with Email / Password
            </button>

            {/* Expandable Email Form */}
            <div className="signin-email-section" id="signin-email-section">
              <div className="email-mode-tabs">
                <button
                  type="button"
                  className={`email-tab-btn ${emailMode === 'signin' ? 'active' : ''}`}
                  onClick={() => {
                    setEmailMode('signin');
                    setFormError(null);
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`email-tab-btn ${emailMode === 'signup' ? 'active' : ''}`}
                  onClick={() => {
                    setEmailMode('signup');
                    setFormError(null);
                  }}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleEmailSubmit} className="email-form">
                <div className="form-group">
                  <label htmlFor="signin-email">Email Address</label>
                  <input
                    id="signin-email"
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="signin-password">Password</label>
                  <input
                    id="signin-password"
                    type="password"
                    required
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={emailMode === 'signin' ? 'current-password' : 'new-password'}
                  />
                </div>

                <button
                  type="submit"
                  className="login-btn login-btn--primary"
                  disabled={submitting}
                >
                  {submitting ? 'Authenticating...' : emailMode === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              </form>
            </div>

            <div className="login-divider">
              <span>or</span>
            </div>

            {/* Guest Mode */}
            <button
              className="login-btn login-btn--guest"
              onClick={handleGuestEntry}
              disabled={submitting}
            >
              <span>🆘</span> Continue as Emergency Guest
            </button>

            {/* Offline Warning */}
            {!isOnline && (
              <div className="signin-offline-notice">
                <span>📱</span>
                <div>
                  <p className="signin-offline-title">Offline Mode Active</p>
                  <p className="signin-offline-desc">
                    Google & Email login require internet. Use Emergency Guest for offline access.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
