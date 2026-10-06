/**
 * VYNTRA — Role Selection & Support Mode Screen
 * Generated via Stitch MCP ("Serene Sanctuary" Design System)
 * High-touch tactile Bento cards, distinct color themes, emergency quick-dial.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import '../styles/auth.css';

export default function RoleSelectScreen() {
  const navigate = useNavigate();
  const { vyntraUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const [discreetMode, setDiscreetMode] = useState(false);

  const appId = vyntraUser?.appId || 'VYNTRA-USR-M3WP5FNR';

  const handleCopyId = () => {
    navigator.clipboard.writeText(appId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

        {/* User ID Tag */}
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
      </header>

      {/* Bento Roles Grid */}
      <div className="roles-bento-grid">
        {/* Role 1: User / Need Help */}
        <article className="bento-card bento-card--user" onClick={() => navigate('/user/profile/create')}>
          <div className="bento-card__header">
            <div className="bento-badge bento-badge--rose">
              <span>🆘</span>
            </div>
            <div className="bento-title-group">
              <div className="bento-title-row">
                <h2 className="bento-title">I Need Help</h2>
                <span className="bento-tag bento-tag--rose">User Mode</span>
              </div>
              <p className="bento-description">
                Immediate safety assistance, emergency SOS beacon, verified secure shelters, and offline menstrual health tracker.
              </p>
            </div>
          </div>

          <div className="bento-pills-row">
            <span className="bento-pill">🚨 Emergency SOS</span>
            <span className="bento-pill">🏡 Safe Shelters</span>
            <span className="bento-pill">🌸 Health Tracker</span>
          </div>

          <button 
            type="button" 
            className="bento-action-btn bento-action-btn--rose"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/user/profile/create');
            }}
          >
            <span>Enter User Mode</span>
            <span className="btn-arrow">→</span>
          </button>
        </article>

        {/* Role 2: Shelter Provider */}
        <article className="bento-card bento-card--shelter" onClick={() => navigate('/shelter/register')}>
          <div className="bento-card__header">
            <div className="bento-badge bento-badge--green">
              <span>🏡</span>
            </div>
            <div className="bento-title-group">
              <div className="bento-title-row">
                <h2 className="bento-title">I Provide Shelter</h2>
                <span className="bento-tag bento-tag--green">Shelter Portal</span>
              </div>
              <p className="bento-description">
                Manage bed capacity, verify occupant intake and admission, monitor emergency provisions and safe spaces.
              </p>
            </div>
          </div>

          <div className="bento-pills-row">
            <span className="bento-pill">🛏️ Bed Capacity</span>
            <span className="bento-pill">📋 Occupant Intake</span>
            <span className="bento-pill">📦 Provisions</span>
          </div>

          <button 
            type="button" 
            className="bento-action-btn bento-action-btn--green"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/shelter/register');
            }}
          >
            <span>Enter Shelter Portal</span>
            <span className="btn-arrow">→</span>
          </button>
        </article>

        {/* Role 3: Service Provider */}
        <article className="bento-card bento-card--service" onClick={() => navigate('/service/register')}>
          <div className="bento-card__header">
            <div className="bento-badge bento-badge--amber">
              <span>🚚</span>
            </div>
            <div className="bento-title-group">
              <div className="bento-title-row">
                <h2 className="bento-title">I Supply Resources</h2>
                <span className="bento-tag bento-tag--amber">Provider</span>
              </div>
              <p className="bento-description">
                Coordinate rapid dispatch, fulfillment of essential relief orders, transport, and localized logistics.
              </p>
            </div>
          </div>

          <div className="bento-pills-row">
            <span className="bento-pill">⚡ Rapid Dispatch</span>
            <span className="bento-pill">💊 Medical Kits</span>
            <span className="bento-pill">🗺️ Logistics</span>
          </div>

          <button 
            type="button" 
            className="bento-action-btn bento-action-btn--amber"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/service/register');
            }}
          >
            <span>Enter Provider Portal</span>
            <span className="btn-arrow">→</span>
          </button>
        </article>
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
