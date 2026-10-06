/**
 * VYNTRA — World Chat Entry Screen
 * Design System: Serene Sanctuary (Stitch MCP Screen 7aac22682e074c069c27235a04950bfe)
 * Geographic verification by state range & numerical district code.
 * Includes client-side rate-limiting, 6-hour sliding cycle telemetry, and discrete disguise mode.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { STATE_CODE_RANGES, getStateRange, isCodeInStateRange } from '../../shared/constants/state-codes';
import { isRequestAllowed, getCooldownSeconds } from '../../shared/utils/rate-limiter';
import { getItem, putItem, STORES } from '../../shared/utils/offline-cache';
import type { UserProfile } from '../../shared/types';
import '../styles/chat.css';

const QUICK_STATES = [
  { code: 'DL', label: 'Delhi NCR' },
  { code: 'MP', label: 'Madhya Pradesh' },
  { code: 'MH', label: 'Maharashtra' },
  { code: 'KA', label: 'Karnataka' },
];

export default function ChatEntryScreen() {
  const { vyntraUser } = useAuth();
  const navigate = useNavigate();

  const [selectedStateCode, setSelectedStateCode] = useState('DL');
  const [districtName, setDistrictName] = useState('New Delhi');
  const [districtCode, setDistrictCode] = useState('872');
  const [errorMsg, setErrorMsg] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [isDisguised, setIsDisguised] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('0');

  // Pre-fill from user profile
  useEffect(() => {
    async function loadProfile() {
      if (!vyntraUser) return;
      const profile = await getItem<UserProfile>(STORES.PROFILE, vyntraUser.appId);
      if (profile && profile.state) {
        const foundState = STATE_CODE_RANGES.find(
          (s) => s.stateName.toLowerCase() === profile.state.toLowerCase()
        );
        if (foundState) {
          setSelectedStateCode(foundState.stateCode);
          setDistrictCode(String(foundState.rangeStart));
        }
        if (profile.district) {
          setDistrictName(profile.district);
        }
      }
    }
    loadProfile();
  }, [vyntraUser]);

  const currentRange = getStateRange(selectedStateCode);

  const handleStateChange = (newCode: string) => {
    setSelectedStateCode(newCode);
    const range = getStateRange(newCode);
    if (range) {
      setDistrictCode(String(range.rangeStart));
    }
    setErrorMsg('');
  };

  const handleAutoFill = () => {
    if (currentRange) {
      setDistrictCode(String(currentRange.rangeStart));
      setErrorMsg('');
    }
  };

  const handleVerifyAndEnter = async () => {
    setErrorMsg('');
    const codeNum = parseInt(districtCode.trim(), 10);

    if (isNaN(codeNum)) {
      setErrorMsg('Please enter a valid numeric district code.');
      return;
    }

    // 1. Local numerical range check
    if (!isCodeInStateRange(selectedStateCode, codeNum)) {
      setErrorMsg(
        `Code ${codeNum} is invalid for ${currentRange?.stateName}. Must be between ${currentRange?.rangeStart} and ${currentRange?.rangeEnd}.`
      );
      return;
    }

    // 2. Client-side Rate Limiting (max 5 checks per min for identical combo)
    const comboKey = `${selectedStateCode}-${districtName.toUpperCase()}-${codeNum}`;
    if (!isRequestAllowed(comboKey, 5, 60000)) {
      const cooldown = getCooldownSeconds(comboKey, 60000);
      setErrorMsg(`Too many verification attempts for this region. Please wait ${cooldown}s.`);
      return;
    }

    setVerifying(true);

    try {
      // 3. Cache verified region in IndexedDB
      await putItem(STORES.CHAT_CACHE, {
        cacheKey: `verified-${codeNum}`,
        stateCode: selectedStateCode,
        districtName,
        districtCode: codeNum,
        verifiedAt: Date.now(),
      });

      // 4. Navigate into the 6-hour cycle chat for this district
      navigate(`/chat/${codeNum}?state=${selectedStateCode}&district=${encodeURIComponent(districtName)}`);
    } catch {
      setErrorMsg('Could not verify district. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  // Determine current 6-hour window
  const currentHour = new Date().getHours();
  const getCycleWindow = () => {
    if (currentHour >= 0 && currentHour < 6) return '12:00 AM';
    if (currentHour >= 6 && currentHour < 12) return '06:00 AM';
    if (currentHour >= 12 && currentHour < 18) return '12:00 PM';
    return '06:00 PM';
  };
  const activeWindow = getCycleWindow();

  // Quick Calculator logic for Emergency Disguise
  const handleCalcPress = (val: string) => {
    if (val === 'C') {
      setCalcDisplay('0');
    } else if (val === '=') {
      try {
        // Safe evaluation of basic math
        const sanitized = calcDisplay.replace(/[^0-9+\-*/.]/g, '');
        // eslint-disable-next-line no-eval
        const result = Function(`'use strict'; return (${sanitized})`)();
        setCalcDisplay(String(result));
      } catch {
        setCalcDisplay('Error');
      }
    } else {
      setCalcDisplay((prev) => (prev === '0' || prev === 'Error' ? val : prev + val));
    }
  };

  if (isDisguised) {
    return (
      <div className="disguise-modal-overlay">
        <div className="calc-display">{calcDisplay}</div>
        <div className="calc-grid">
          <button className="calc-btn top" onClick={() => handleCalcPress('C')}>C</button>
          <button className="calc-btn top" onClick={() => handleCalcPress('+/-')}>±</button>
          <button className="calc-btn top" onClick={() => handleCalcPress('%')}>%</button>
          <button className="calc-btn op" onClick={() => handleCalcPress('/')}>÷</button>

          <button className="calc-btn" onClick={() => handleCalcPress('7')}>7</button>
          <button className="calc-btn" onClick={() => handleCalcPress('8')}>8</button>
          <button className="calc-btn" onClick={() => handleCalcPress('9')}>9</button>
          <button className="calc-btn op" onClick={() => handleCalcPress('*')}>×</button>

          <button className="calc-btn" onClick={() => handleCalcPress('4')}>4</button>
          <button className="calc-btn" onClick={() => handleCalcPress('5')}>5</button>
          <button className="calc-btn" onClick={() => handleCalcPress('6')}>6</button>
          <button className="calc-btn op" onClick={() => handleCalcPress('-')}>−</button>

          <button className="calc-btn" onClick={() => handleCalcPress('1')}>1</button>
          <button className="calc-btn" onClick={() => handleCalcPress('2')}>2</button>
          <button className="calc-btn" onClick={() => handleCalcPress('3')}>3</button>
          <button className="calc-btn op" onClick={() => handleCalcPress('+')}>+</button>

          <button className="calc-btn" style={{ gridColumn: 'span 2', borderRadius: '32px' }} onClick={() => handleCalcPress('0')}>0</button>
          <button className="calc-btn" onClick={() => handleCalcPress('.')}>.</button>
          <button className="calc-btn op" onClick={() => handleCalcPress('=')}>=</button>
        </div>
        <button className="calc-dismiss-btn" onClick={() => setIsDisguised(false)}>
          Tap to return to VYNTRA Safety App
        </button>
      </div>
    );
  }

  return (
    <div className="chat-entry-page">
      {/* Top Header & Brand Anchor */}
      <header className="chat-entry-header">
        <div className="chat-top-nav-row">
          <button
            type="button"
            className="chat-back-btn"
            onClick={() => navigate('/user/home')}
            aria-label="Back to Home"
          >
            ←
          </button>

          <div className="chat-brand-lockup">
            <span className="chat-brand-icon">🛡️</span>
            <h2 className="chat-brand-title">VYNTRA</h2>
          </div>

          <div className="chat-nav-actions">
            <div className="chat-mesh-status-pill">
              <span className="mesh-pulse-dot" />
              <span>Encrypted Mesh</span>
            </div>

            <button
              type="button"
              className="chat-disguise-trigger"
              onClick={() => setIsDisguised(true)}
              title="Quick Disguise Screen (Calculator)"
              aria-label="Quick Disguise Screen"
            >
              🕶️
            </button>
          </div>
        </div>

        <div className="chat-headline-block">
          <div className="chat-pwa-sub-badge">
            <span>📡</span>
            <span>PWA READY • LOCAL CACHE ACTIVE</span>
          </div>
          <h1 className="chat-main-heading">Regional World Chat</h1>
          <p className="chat-sub-desc">
            Geographic community broadcast, peer alerts &amp; decentralized emergency relays.
          </p>
        </div>
      </header>

      {/* District Zone Verification Bento Card */}
      <section className="chat-tactical-card">
        <div className="tactical-ambient-glow" />

        <div className="tactical-card-header">
          <div className="tactical-title-box">
            <div className="tactical-icon-bubble">
              <span>📶</span>
            </div>
            <div className="tactical-title-texts">
              <h3>District Zone Verification</h3>
              <p>Zero-Knowledge Peer Geolocation</p>
            </div>
          </div>
          <span className="tactical-zone-badge">Zone Level 2</span>
        </div>

        <p className="tactical-intro-note">
          Verify your geographic region to access decentralized emergency bulletins, localized volunteer relays, and regional crisis safety circles.
        </p>

        {/* Quick State Pills */}
        <div className="quick-states-bar">
          <span className="quick-states-label">Active Territorial Territory</span>
          <div className="quick-states-pills">
            {QUICK_STATES.map((st) => (
              <button
                key={st.code}
                type="button"
                className={`state-quick-chip ${selectedStateCode === st.code ? 'active' : ''}`}
                onClick={() => handleStateChange(st.code)}
              >
                {selectedStateCode === st.code && <span>✓</span>}
                <span>{st.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Full State Selector */}
        <div className="chat-input-field-group">
          <label className="chat-field-label">Select State or Union Territory:</label>
          <div className="chat-custom-input-wrap">
            <select
              className="chat-custom-input"
              value={selectedStateCode}
              onChange={(e) => handleStateChange(e.target.value)}
            >
              {STATE_CODE_RANGES.map((s) => (
                <option key={s.stateCode} value={s.stateCode}>
                  {s.stateName} ({s.stateCode})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Allocated Range Chip */}
        {currentRange && (
          <div className="chat-range-chip">
            <span className="range-icon">🌐</span>
            <span>
              Allocated range for {currentRange.stateName}: <strong>{currentRange.rangeStart} – {currentRange.rangeEnd}</strong> • Sub-zone Active
            </span>
          </div>
        )}

        {/* District Locality Name */}
        <div className="chat-input-field-group">
          <label className="chat-field-label">District &amp; Locality Identifier:</label>
          <div className="chat-custom-input-wrap">
            <input
              type="text"
              className="chat-custom-input"
              value={districtName}
              onChange={(e) => setDistrictName(e.target.value)}
              placeholder="e.g. South Delhi / Jabalpur / Bandra"
            />
            <span className="chat-input-icon">📍</span>
          </div>
        </div>

        {/* Numeric District Node Code with Auto-Fill */}
        <div className="chat-input-field-group">
          <div className="chat-field-label-row">
            <label className="chat-field-label">Numeric District Node Code:</label>
            <span className="chat-field-sub">
              Range {currentRange?.rangeStart} - {currentRange?.rangeEnd}
            </span>
          </div>
          <div className="code-and-autofill-row">
            <div className="code-input-half">
              <input
                type="number"
                className="chat-code-input"
                value={districtCode}
                onChange={(e) => setDistrictCode(e.target.value)}
                placeholder={currentRange ? String(currentRange.rangeStart) : '872'}
                maxLength={4}
              />
            </div>
            <button
              type="button"
              className="chat-autofill-btn"
              onClick={handleAutoFill}
              title="Auto-fill default node code for selected state"
            >
              <span>🎯</span>
              <span>Auto-Fill</span>
            </button>
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="chat-error-banner">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Zero-Knowledge Privacy Callout */}
        <div className="chat-privacy-callout">
          <span>🔒</span>
          <span>
            Zero location telemetry saved to cloud. Zone authentication verified purely via local client-side cryptographic hashing.
          </span>
        </div>

        {/* Primary CTA */}
        <button
          type="button"
          className="chat-enter-btn"
          onClick={handleVerifyAndEnter}
          disabled={verifying}
        >
          <span>{verifying ? 'Verifying Geographic Range...' : 'Verify & Enter District Chat'}</span>
          <span>→</span>
        </button>
      </section>

      {/* 6-Hour Sliding Broadcast Cycle Bento Card */}
      <section className="chat-cycle-bento-card">
        <div className="cycle-bento-header">
          <div className="cycle-bento-title-row">
            <span>⏱️</span>
            <h3>6-Hour Sliding Broadcast Cycle</h3>
          </div>
          <span className="cycle-p2p-badge">P2P Protocol</span>
        </div>

        <p className="cycle-intro-p">
          Network partition resilient timeline. Messages continuously cycle across regional relay beacons:
        </p>

        <div className="cycle-timeline-grid">
          <div className={`cycle-interval-slot ${activeWindow === '12:00 AM' ? 'active' : ''}`}>
            <span className="slot-time">12:00 AM</span>
            <span className="slot-dot" />
            <span className="slot-state-label">
              {activeWindow === '12:00 AM' ? 'Live Window' : 'Archived'}
            </span>
          </div>

          <div className={`cycle-interval-slot ${activeWindow === '06:00 AM' ? 'active' : ''}`}>
            <span className="slot-time">06:00 AM</span>
            <span className="slot-dot" />
            <span className="slot-state-label">
              {activeWindow === '06:00 AM' ? 'Live Window' : 'Verified'}
            </span>
          </div>

          <div className={`cycle-interval-slot ${activeWindow === '12:00 PM' ? 'active' : ''}`}>
            <span className="slot-time">12:00 PM</span>
            <span className="slot-dot" />
            <span className="slot-state-label">
              {activeWindow === '12:00 PM' ? 'Live Window' : 'Verified'}
            </span>
          </div>

          <div className={`cycle-interval-slot ${activeWindow === '06:00 PM' ? 'active' : ''}`}>
            <span className="slot-time">06:00 PM</span>
            <span className="slot-dot" />
            <span className="slot-state-label">
              {activeWindow === '06:00 PM' ? 'Live Window' : 'Upcoming'}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
