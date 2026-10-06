/**
 * VYNTRA — World Chat Entry Screen
 * Geographic verification by state range & numerical district code.
 * Includes rate-limiting on repeated identical requests & offline cache.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { STATE_CODE_RANGES, getStateRange, isCodeInStateRange } from '../../shared/constants/state-codes';
import { isRequestAllowed, getCooldownSeconds } from '../../shared/utils/rate-limiter';
import { getItem, putItem, STORES } from '../../shared/utils/offline-cache';
import type { UserProfile } from '../../shared/types';
import '../styles/chat.css';

export default function ChatEntryScreen() {
  const { vyntraUser } = useAuth();
  const navigate = useNavigate();

  const [selectedStateCode, setSelectedStateCode] = useState('DL');
  const [districtName, setDistrictName] = useState('New Delhi');
  const [districtCode, setDistrictCode] = useState('872');
  const [errorMsg, setErrorMsg] = useState('');
  const [verifying, setVerifying] = useState(false);

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

  return (
    <div className="chat-entry-screen">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => navigate('/user/home')}
          style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
          aria-label="Back"
        >
          ←
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Regional World Chat</h2>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
            Geographic community broadcast & emergency updates
          </p>
        </div>
      </div>

      {/* Geo Card */}
      <div className="chat-geo-card">
        <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 700 }}>
          District Code Verification
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: 'var(--color-on-surface-variant)' }}>
          To prevent noise and keep updates local, messages are organized into numerical regional zones.
        </p>

        {/* State Selector */}
        <div className="form-group">
          <label>Select State:</label>
          <select
            className="form-select"
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

        {/* Range Hint */}
        {currentRange && (
          <div className="range-info-chip">
            Allocated range for {currentRange.stateName}: {currentRange.rangeStart} – {currentRange.rangeEnd}
          </div>
        )}

        {/* District Name */}
        <div className="form-group" style={{ marginTop: '16px' }}>
          <label>District Name:</label>
          <input
            type="text"
            className="form-input"
            value={districtName}
            onChange={(e) => setDistrictName(e.target.value)}
            placeholder="e.g. New Delhi / Jaipur"
          />
        </div>

        {/* District Code */}
        <div className="form-group">
          <label>Assigned District Code:</label>
          <input
            type="number"
            className="form-input"
            value={districtCode}
            onChange={(e) => setDistrictCode(e.target.value)}
            placeholder={currentRange ? `${currentRange.rangeStart}` : '400'}
          />
        </div>

        {/* Error message */}
        {errorMsg && (
          <div style={{
            background: 'var(--color-error-container)',
            color: 'var(--color-on-error-container)',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '0.82rem',
            marginBottom: '16px',
            lineHeight: 1.4,
          }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <button
          className="btn-primary"
          style={{ width: '100%', marginTop: '8px' }}
          onClick={handleVerifyAndEnter}
          disabled={verifying}
        >
          {verifying ? 'Verifying Code...' : 'Verify & Enter District Chat'}
        </button>
      </div>

      {/* Info Card on 6-Hour Cycle Architecture */}
      <div style={{
        background: 'var(--color-surface-container-low)',
        borderRadius: '16px',
        padding: '18px',
        fontSize: '0.82rem',
        lineHeight: 1.5,
        color: 'var(--color-on-surface-variant)',
      }}>
        <strong style={{ color: 'var(--color-on-surface)', display: 'block', marginBottom: '4px' }}>
          ℹ️ 6-Hour Sliding Broadcast Cycle
        </strong>
        Unlike continuous infinite feeds, community broadcasts are packaged into fixed 6-hour windows
        (12 AM, 6 AM, 12 PM, 6 PM) for high reliability during crises and bandwidth conservation.
      </div>
    </div>
  );
}
