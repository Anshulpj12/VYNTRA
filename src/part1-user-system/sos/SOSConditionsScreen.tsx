/**
 * VYNTRA — SOS Conditions Screen
 * Fast selection of emergency conditions with auto-fill from saved profile.
 * Obtains live GPS with automatic fallback to stored profile coordinates.
 * Triggers background shelter sync when conditions screen loads.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getItem, STORES } from '../../shared/utils/offline-cache';
import { SOS_CONDITIONS, encodeSOS } from '../../shared/constants/sos-codes';
import { syncDistrictShelters } from './shelter-cache';
import type { UserProfile, GeoCoordinates } from '../../shared/types';
import '../styles/sos.css';

export default function SOSConditionsScreen() {
  const { vyntraUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [coords, setCoords] = useState<GeoCoordinates>({ lat: 28.6139, lng: 77.2090 });
  const [coordSource, setCoordSource] = useState<'gps' | 'profile'>('gps');
  const [locationLoaded, setLocationLoaded] = useState(false);

  // Load profile and acquire location
  useEffect(() => {
    async function init() {
      if (!vyntraUser) return;
      const cached = await getItem<UserProfile>(STORES.PROFILE, vyntraUser.appId);
      if (cached) {
        setProfile(cached);

        // Auto-select profile-based conditions
        const autoSelected: string[] = [];
        if (cached.pregnancyStatus?.isPregnant) autoSelected.push('PG');
        if (cached.currentlyMenstruating) autoSelected.push('MN');
        if (cached.disabilities?.includes('Mobility')) autoSelected.push('WC');
        if (cached.medicalConditions && cached.medicalConditions.trim().length > 0) {
          autoSelected.push('MD');
        }
        if (autoSelected.length > 0) {
          setSelectedConditions(autoSelected);
        }
      }

      // Try GPS location first
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setCoordSource('gps');
            setLocationLoaded(true);
          },
          () => {
            // GPS failed or denied -> fall back to profile coordinates
            if (cached?.homeCoordinates?.lat && cached?.homeCoordinates?.lng) {
              setCoords(cached.homeCoordinates);
              setCoordSource('profile');
            }
            setLocationLoaded(true);
          },
          { enableHighAccuracy: true, timeout: 6000 }
        );
      } else if (cached?.homeCoordinates) {
        setCoords(cached.homeCoordinates);
        setCoordSource('profile');
        setLocationLoaded(true);
      } else {
        setLocationLoaded(true);
      }

      /*
       * Background shelter sync: Pre-fetch district shelters from Firebase
       * so they're cached in IndexedDB by the time the user reaches
       * the shelter selection screen. Non-blocking — runs in background.
       */
      if (cached?.district && cached?.state && navigator.onLine) {
        syncDistrictShelters(cached.district, cached.state).catch((err) => {
          console.warn('[SOS] Background shelter sync skipped:', err);
        });
      }
    }

    init();
  }, [vyntraUser]);

  const toggleCondition = (code: string) => {
    setSelectedConditions((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleProceed = (conditionsToUse: string[]) => {
    if (!vyntraUser) return;
    const finalConditions = conditionsToUse.length > 0 ? conditionsToUse : ['AD']; // AD = Acute Distress default
    const compactCode = encodeSOS(
      Number(coords.lat.toFixed(4)),
      Number(coords.lng.toFixed(4)),
      finalConditions,
      vyntraUser.appId
    );

    // Save in sessionStorage for the shelter selection step
    sessionStorage.setItem('vyntra_pending_sos', JSON.stringify({
      userId: vyntraUser.appId,
      coordinates: coords,
      coordinateSource: coordSource,
      selectedConditions: finalConditions,
      compactCode,
      district: profile?.district || '',
      state: profile?.state || '',
    }));

    navigate('/sos/shelters');
  };

  const handleUseSavedInfo = () => {
    // Collect whatever saved profile conditions exist
    const savedCodes: string[] = [];
    if (profile?.pregnancyStatus?.isPregnant) savedCodes.push('PG');
    if (profile?.currentlyMenstruating) savedCodes.push('MN');
    if (profile?.disabilities?.includes('Mobility')) savedCodes.push('WC');
    if (profile?.medicalConditions) savedCodes.push('MD');
    handleProceed(savedCodes.length > 0 ? savedCodes : ['AD']);
  };

  return (
    <div className="conditions-screen">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button
          onClick={() => navigate('/user/home')}
          style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
          aria-label="Back"
        >
          ←
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>
            Emergency Requirements
          </h2>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
            Select conditions to help shelters prepare resources
          </p>
        </div>
      </div>

      {/* Location Status Bar */}
      <div className="gps-status-bar" style={{ marginBottom: '16px' }}>
        <span>📍</span>
        <span>
          {locationLoaded
            ? `Location: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)} (${coordSource === 'gps' ? 'Live GPS' : 'Saved Home Profile'})`
            : 'Acquiring location...'}
        </span>
      </div>

      {/* Quick Profile Bypass Button */}
      {profile && (
        <button
          onClick={handleUseSavedInfo}
          style={{
            background: 'var(--color-surface-container-high)',
            border: '1.5px solid var(--color-primary-surface-dim)',
            color: 'var(--color-primary)',
            padding: '12px 16px',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>⚡ Fast Track: Continue With Saved Profile Info</span>
          <span>→</span>
        </button>
      )}

      {/* Conditions Grid */}
      <div className="conditions-grid">
        {Object.entries(SOS_CONDITIONS).map(([code, label]) => {
          const isSelected = selectedConditions.includes(code);
          return (
            <div
              key={code}
              className={`condition-card ${isSelected ? 'selected' : ''}`}
              onClick={() => toggleCondition(code)}
            >
              <div className="condition-header">
                <span className="condition-code-badge">{code}</span>
                {isSelected && <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>✓</span>}
              </div>
              <div className="condition-label">{label}</div>
            </div>
          );
        })}
      </div>

      {/* Bottom Sticky Action */}
      <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
        <button
          className="btn-primary"
          style={{ width: '100%' }}
          onClick={() => handleProceed(selectedConditions)}
        >
          {selectedConditions.length > 0
            ? `Proceed with ${selectedConditions.length} Condition${selectedConditions.length > 1 ? 's' : ''}`
            : 'Proceed with Emergency SOS'}
        </button>
      </div>
    </div>
  );
}
