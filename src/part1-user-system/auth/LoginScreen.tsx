/**
 * VYNTRA — Login Screen
 * Google OAuth login with offline status indication.
 * Design reference: Stitch "Serene Sanctuary" login screen.
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useEffect, useState } from 'react';
import '../styles/auth.css';

export default function LoginScreen() {
  const {
    user,
    vyntraUser,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signInAsGuest,
    isOnline,
    error,
    loading,
  } = useAuth();
  const navigate = useNavigate();

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailMode, setEmailMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if ((user || vyntraUser) && !loading) {
      navigate('/auth/role-select', { replace: true });
    }
  }, [user, vyntraUser, loading, navigate]);

  const handleGuestEntry = async () => {
    await signInAsGuest();
    navigate('/user/home', { replace: true });
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setFormError('Please provide both email and password.');
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      if (emailMode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      setShowEmailModal(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-screen">
      {/* Hero Section */}
      <div className="login-hero">
        <div className="login-logo-container">
          <div className="login-logo-ring login-logo-ring--outer" />
          <div className="login-logo-ring login-logo-ring--middle" />
          <div className="login-logo-ring login-logo-ring--inner">
            <span className="login-logo-icon">🛡️</span>
          </div>
        </div>

        <h1 className="login-title">VYNTRA</h1>
        <p className="login-tagline">Your Safety, Our Priority</p>
        <p className="login-description">
          A discreet, offline-ready companion designed for immediate assistance and peace of mind.
        </p>
      </div>

      {/* Auth Section */}
      <div className="login-auth-section">
        {error && (
          <div className="login-error-banner">
            <span className="login-error-icon">⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {!isOnline && (
          <div className="login-offline-banner">
            <span className="login-offline-icon">📱</span>
            <div>
              <p className="login-offline-title">Offline Mode Active</p>
              <p className="login-offline-desc">
                Initial authentication requires an internet connection. 
                Emergency SOS and cached data remain accessible.
              </p>
            </div>
          </div>
        )}

        <button
          className="login-btn login-btn--google"
          onClick={signInWithGoogle}
          disabled={!isOnline}
        >
          <svg className="login-google-icon" viewBox="0 0 24 24" width="24" height="24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>

        <button 
          className="login-btn login-btn--email" 
          disabled={!isOnline}
          onClick={() => {
            setFormError(null);
            setShowEmailModal(true);
          }}
        >
          <span className="btn-icon">📧</span> Sign in with Email / Password
        </button>

        <div className="login-divider">
          <span>or</span>
        </div>

        <button 
          className="login-btn login-btn--guest"
          onClick={handleGuestEntry}
        >
          <span>🆘</span> Continue as Emergency Guest
        </button>
      </div>

      {/* Email / Password Modal */}
      {showEmailModal && (
        <div className="email-modal-overlay" onClick={() => setShowEmailModal(false)}>
          <div className="email-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="email-modal-header">
              <h3>{emailMode === 'signin' ? 'Sign In' : 'Create Account'}</h3>
              <button 
                type="button" 
                className="email-modal-close" 
                onClick={() => setShowEmailModal(false)}
              >
                ✕
              </button>
            </div>

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

            {formError && (
              <div className="email-form-error">
                <span>⚠️</span> {formError}
              </div>
            )}

            <form onSubmit={handleEmailSubmit} className="email-form">
              <div className="form-group">
                <label htmlFor="user-email">Email Address</label>
                <input
                  id="user-email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="user-password">Password</label>
                <input
                  id="user-password"
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
        </div>
      )}

      {/* Emergency Footer */}
      <div className="login-emergency-footer">
        <div className="login-emergency-card">
          <p className="login-emergency-label">Need immediate help?</p>
          <a href="tel:112" className="login-emergency-call">
            📞 Call 112 Emergency Services
          </a>
        </div>
      </div>

      {/* Trust Footer */}
      <div className="login-trust-footer">
        <span>🔒 End-to-End Encrypted</span>
        <span>📱 Works 100% Offline</span>
        <span>🛡️ Privacy First</span>
      </div>
    </div>
  );
}
