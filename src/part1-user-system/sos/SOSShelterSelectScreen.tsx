/**
 * VYNTRA — SOS Shelter Selection & SMS Dispatch Screen
 *
 * Ranks locally cached shelters by composite priority score and distance.
 * Shelters are downloaded per-district when online (via shelter-cache service)
 * and stored in IndexedDB for fully offline SOS dispatch.
 *
 * Flow:
 *   1. Read pending SOS data from sessionStorage (set by SOSConditionsScreen)
 *   2. Load shelters from IndexedDB cache (district-filtered, all stores merged)
 *   3. If online, trigger a background district sync for fresh data
 *   4. Rank shelters: compositeScore = (shelterScore × 0.6) + (distanceScore × 0.4)
 *   5. User selects a shelter → opens native SMS app with shelter number + SOS code
 *
 * @module part1-user-system/sos/SOSShelterSelectScreen
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getItem, putItem, STORES, addPendingSync } from '../../shared/utils/offline-cache';
import { calculateDistance } from '../../shared/utils/geo-distance';
import type { ShelterMetadata, GeoCoordinates, UserProfile } from '../../shared/types';
import { db } from '../../shared/firebase/config';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import {
  getAllAvailableShelters,
  syncDistrictShelters,
  downloadAndCacheSheltersOnline,
  getLastSyncTimestamp,
  formatTimeAgo,
} from './shelter-cache';
import '../styles/sos.css';

/** Shelter with computed distance and composite ranking score */
interface RankedShelter extends ShelterMetadata {
  distanceKm: number;
  compositeScore: number;
}

/** Pending SOS data passed via sessionStorage from SOSConditionsScreen */
interface PendingSOSData {
  userId: string;
  coordinates: GeoCoordinates;
  coordinateSource: 'gps' | 'profile';
  selectedConditions: string[];
  compactCode: string;
  district: string;
  state: string;
}

export default function SOSShelterSelectScreen() {
  const { isOnline, vyntraUser } = useAuth();
  const navigate = useNavigate();

  /* ─── Load pending SOS from sessionStorage ─── */
  const [sosData] = useState<PendingSOSData | null>(() => {
    const raw = sessionStorage.getItem('vyntra_pending_sos');
    if (raw) {
      try {
        return JSON.parse(raw) as PendingSOSData;
      } catch (err) {
        console.warn('Could not parse pending SOS', err);
      }
    }
    return null;
  });

  const [userDistrict, setUserDistrict] = useState<string>(sosData?.district || '');
  const [userState, setUserState] = useState<string>(sosData?.state || '');
  const [rankedShelters, setRankedShelters] = useState<RankedShelter[]>([]);
  const [selectedShelterId, setSelectedShelterId] = useState<string>('');
  const [dispatchedSuccess, setDispatchedSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  /* Sync & Download states */
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error' | 'offline'>('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [lastSynced, setLastSynced] = useState<string>(() => {
    const target = (sosData?.district || '').trim() || 'all';
    const ts = getLastSyncTimestamp(target);
    return ts > 0 ? formatTimeAgo(ts) : '';
  });

  /* Profile fallback if district wasn't present in pending SOS */
  useEffect(() => {
    async function checkProfile() {
      if (!userDistrict && vyntraUser?.appId) {
        try {
          const prof = await getItem<UserProfile>(STORES.PROFILE, vyntraUser.appId);
          if (prof?.district) {
            setUserDistrict(prof.district);
            const ts = getLastSyncTimestamp(prof.district);
            if (ts > 0) setLastSynced(formatTimeAgo(ts));
          }
          if (prof?.state) setUserState(prof.state);
        } catch {
          // ignore
        }
      }
    }
    checkProfile();
  }, [userDistrict, vyntraUser?.appId]);

  /** Copy the compact SOS code to clipboard */
  const handleCopyCode = async () => {
    if (sosData?.compactCode) {
      try {
        await navigator.clipboard.writeText(sosData.compactCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        console.warn('Clipboard write failed', e);
      }
    }
  };

  /* ─── Load & rank shelters from local IndexedDB cache ─── */
  const loadAndRankShelters = useCallback(async () => {
    const userCoords: GeoCoordinates = sosData?.coordinates || { lat: 28.6139, lng: 77.2090 };
    const allShelters = await getAllAvailableShelters(userDistrict);

    if (allShelters.length === 0) {
      setRankedShelters([]);
      setLoading(false);
      return [];
    }

    const ranked: RankedShelter[] = allShelters.map((shelter) => {
      const dist = calculateDistance(userCoords, shelter.coordinates);
      const distScore = Math.max(0, 100 - dist * 5);
      const composite = ((shelter.shelterScore || 80) * 0.6) + (distScore * 0.4);

      return {
        ...shelter,
        distanceKm: dist,
        compositeScore: composite,
      };
    });

    ranked.sort((a, b) => b.compositeScore - a.compositeScore);
    setRankedShelters(ranked);

    setSelectedShelterId((prev) => {
      if (prev && ranked.some((s) => s.shelterId === prev)) {
        return prev;
      }
      return ranked[0]?.shelterId || '';
    });

    setLoading(false);
    return ranked;
  }, [sosData?.coordinates, userDistrict]);

  /* Initial mount: load cache & fire non-blocking background sync if online */
  useEffect(() => {
    async function init() {
      setLoading(true);

      if (navigator.onLine && userDistrict) {
        syncDistrictShelters(userDistrict, userState)
          .then((count) => {
            if (count > 0) {
              loadAndRankShelters();
              setLastSynced('Just now');
            }
          })
          .catch((err) => {
            console.warn('Background shelter sync failed:', err);
          });
      }

      await loadAndRankShelters();
    }

    init();
  }, [loadAndRankShelters, userDistrict, userState]);

  /* ─── User-Initiated Download & Cache Action ─── */
  const handleDownloadAndCache = async () => {
    if (!navigator.onLine) {
      setSyncStatus('offline');
      setSyncMessage(
        rankedShelters.length > 0
          ? `You are offline. Using ${rankedShelters.length} shelter${rankedShelters.length === 1 ? '' : 's'} already saved locally on this device.`
          : 'You are currently offline. Connect to the internet to download and save shelter data.'
      );
      setTimeout(() => setSyncStatus('idle'), 5000);
      return;
    }

    setSyncStatus('syncing');
    setSyncMessage(
      userDistrict
        ? `Connecting to cloud & downloading shelters for ${userDistrict}...`
        : 'Connecting to cloud & downloading all emergency shelters...'
    );

    try {
      const result = await downloadAndCacheSheltersOnline(userDistrict, userState);
      await loadAndRankShelters();

      if (result.success) {
        setSyncStatus('success');
        setSyncMessage(
          `✓ Saved ${result.totalCached} shelter${result.totalCached === 1 ? '' : 's'} locally in IndexedDB (${result.districtCount} in ${userDistrict || 'your area'})! Ready for 100% offline SOS.`
        );
        setLastSynced('Just now');
      } else {
        setSyncStatus('error');
        setSyncMessage(result.message || 'Download failed. Local cache retained.');
      }
    } catch (err: any) {
      console.warn('[SOS] Manual shelter download error:', err);
      setSyncStatus('error');
      setSyncMessage(`Download failed: ${err?.message || 'Network error'}. Local cache retained.`);
    }

    /* Auto-clear message banner after 6 seconds */
    setTimeout(() => {
      setSyncStatus('idle');
      setSyncMessage('');
    }, 6000);
  };

  /* ─── SMS Dispatch Handler ─── */
  const handleSendSMS = async () => {
    if (!sosData) {
      navigate('/sos/conditions');
      return;
    }
    if (!selectedShelterId) return;

    const shelter = rankedShelters.find((s) => s.shelterId === selectedShelterId);
    if (!shelter) return;

    const smsUrl = `sms:${shelter.registeredMobile}?body=${encodeURIComponent(sosData.compactCode)}`;

    /* Prepare SOS Request record for persistence */
    const record = {
      userId: sosData.userId,
      coordinates: sosData.coordinates,
      coordinateSource: sosData.coordinateSource,
      selectedConditions: sosData.selectedConditions,
      compactCode: sosData.compactCode,
      selectedShelterId: shelter.shelterId,
      shelterMobileNumber: shelter.registeredMobile,
      sentViaSMS: true,
      createdAt: new Date().toISOString(),
    };

    /* Save to Firebase if online, otherwise queue for sync */
    if (isOnline) {
      try {
        await addDoc(collection(db, 'sos-requests'), {
          ...record,
          createdAt: Timestamp.now(),
        });
      } catch (err) {
        console.warn('Online sync failed, caching offline', err);
        await addPendingSync({
          type: 'create',
          collection: 'sos-requests',
          docId: `sos-${Date.now()}`,
          data: record,
        });
      }
    } else {
      await addPendingSync({
        type: 'create',
        collection: 'sos-requests',
        docId: `sos-${Date.now()}`,
        data: record,
      });
    }

    /* Also cache the SOS record locally for history */
    try {
      await putItem(STORES.PENDING_SYNC, {
        id: `sos-history-${Date.now()}`,
        ...record,
      });
    } catch {
      /* Non-critical */
    }

    setDispatchedSuccess(true);

    /* Open device SMS client with pre-filled number + SOS code */
    try {
      window.location.href = smsUrl;
    } catch (e) {
      console.warn('SMS protocol not handled on this system', e);
    }
  };

  const selectedShelter = rankedShelters.find((s) => s.shelterId === selectedShelterId);

  return (
    <div className="shelter-select-screen">
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => navigate('/sos/conditions')}
          style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
          aria-label="Back"
        >
          ←
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>
            Select Emergency Shelter
          </h2>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
            Ranked by resource score & closest proximity
          </p>
        </div>
      </div>

      {/* Coordinate Source Badge */}
      {sosData && (
        <div className="gps-status-bar">
          <span>📍</span>
          <span>
            Location: {sosData.coordinates.lat.toFixed(4)}, {sosData.coordinates.lng.toFixed(4)}
            {' '}({sosData.coordinateSource === 'gps' ? '🟢 Live GPS' : '🟡 Saved Profile'})
          </span>
        </div>
      )}

      {/* Compact Code Preview */}
      {sosData && (
        <div style={{
          background: 'var(--color-surface-container-high)',
          borderRadius: '10px',
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          fontFamily: 'monospace',
          fontSize: '0.8rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-outline)', fontWeight: 700 }}>
              ENCODED SMS PAYLOAD:
            </span>
            <button
              onClick={handleCopyCode}
              style={{
                background: copied ? 'var(--color-tertiary-container)' : 'var(--color-surface-container-highest)',
                color: copied ? 'var(--color-on-tertiary-container)' : 'var(--color-primary)',
                border: '1px solid var(--color-outline-variant)',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {copied ? '✓ Copied' : '📋 Copy Code'}
            </button>
          </div>
          <span style={{ color: 'var(--color-primary)', fontWeight: 700, wordBreak: 'break-all' }}>
            {sosData.compactCode}
          </span>
        </div>
      )}

      {/* ═══════════ Offline Shelter Cache & Online Download Bar ═══════════ */}
      <div className="shelter-sync-card" style={{ marginTop: '4px' }}>
        <div className="shelter-sync-card__header">
          <div className="shelter-sync-card__icon">💾</div>
          <div className="shelter-sync-card__info">
            <div className="shelter-sync-card__title" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span>Offline Shelter Storage</span>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px',
                background: isOnline ? 'var(--color-tertiary-container)' : 'var(--color-surface-container-highest)',
                color: isOnline ? 'var(--color-on-tertiary-container)' : 'var(--color-outline)',
              }}>
                {isOnline ? '🟢 Cloud Online' : '📵 Offline Mode'}
              </span>
            </div>
            <div className="shelter-sync-card__subtitle">
              {rankedShelters.length > 0 ? (
                <>
                  <strong>{rankedShelters.length} shelter{rankedShelters.length === 1 ? '' : 's'}</strong> saved locally in IndexedDB storage
                  {userDistrict && <> for <strong>{userDistrict}</strong></>}
                  {lastSynced && <span className="shelter-sync-card__last-sync"> • Cached {lastSynced}</span>}
                </>
              ) : (
                <>No shelters cached locally yet. Click below to load online and save to your device.</>
              )}
            </div>
          </div>
        </div>

        <button
          className="shelter-sync-card__btn"
          onClick={handleDownloadAndCache}
          disabled={syncStatus === 'syncing'}
        >
          {syncStatus === 'syncing' ? (
            <>
              <span className="shelter-sync-card__spinner" />
              <span>Downloading & Saving Locally...</span>
            </>
          ) : (
            <>
              <span>⬇️</span>
              <span>Download & Save Shelters Locally</span>
            </>
          )}
        </button>

        {/* Status Feedback Message */}
        {syncMessage && (
          <div className={`shelter-sync-card__status shelter-sync-card__status--${syncStatus}`}>
            {syncStatus === 'success' && <span>✅</span>}
            {syncStatus === 'error' && <span>⚠️</span>}
            {syncStatus === 'offline' && <span>📵</span>}
            <span>{syncMessage}</span>
          </div>
        )}
      </div>

      {/* Dispatched Success Banner */}
      {dispatchedSuccess && (
        <div style={{
          background: 'var(--color-tertiary-container)',
          color: 'var(--color-on-tertiary-container)',
          borderRadius: '12px',
          padding: '14px',
          fontSize: '0.9rem',
          lineHeight: 1.4,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}>
          <strong>✓ SOS Dispatched & Saved!</strong>
          <p style={{ margin: 0, fontSize: '0.82rem' }}>
            • <strong>Mobile Phones:</strong> Opens your SMS app directly with the pre-filled code.<br />
            • <strong>Desktop / Offline:</strong> Request is recorded in IndexedDB storage and queued to sync to Firebase Firestore once live credentials are connected.<br />
            • <strong>Shelter Target:</strong> {selectedShelter?.shelterName} ({selectedShelter?.registeredMobile})
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          gap: '12px',
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            border: '3px solid var(--color-outline-variant)',
            borderTopColor: 'var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <span style={{ fontSize: '0.88rem', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
            Loading cached shelters...
          </span>
        </div>
      )}

      {/* Empty State — No Shelters Cached */}
      {!loading && rankedShelters.length === 0 && (
        <div style={{
          background: 'var(--color-surface-container-lowest)',
          border: '2px dashed var(--color-outline-variant)',
          borderRadius: '16px',
          padding: '32px 20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
        }}>
          <span style={{ fontSize: '2.5rem' }}>🏛️</span>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-on-surface)', marginBottom: '6px' }}>
              No Shelters Saved Locally Yet
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
              {navigator.onLine
                ? 'Shelter providers haven\'t been saved to your device yet. Click the button below to download and save shelter data locally.'
                : 'You\'re offline and no shelter data has been downloaded yet. Connect to the internet to download shelter information.'}
            </p>
          </div>

          {/* Action: Direct Download & Cache */}
          <button
            onClick={handleDownloadAndCache}
            disabled={syncStatus === 'syncing'}
            style={{
              background: 'var(--color-primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 20px',
              fontWeight: 700,
              fontSize: '0.92rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: syncStatus === 'syncing' ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(173, 38, 68, 0.25)',
              opacity: syncStatus === 'syncing' ? 0.7 : 1,
            }}
          >
            {syncStatus === 'syncing' ? (
              <>
                <span className="shelter-sync-card__spinner" />
                <span>Downloading & Saving Locally...</span>
              </>
            ) : (
              <>
                <span>⬇️</span>
                <span>Download Shelters from Cloud & Save Locally</span>
              </>
            )}
          </button>

          {/* Fallback: National Emergency Numbers */}
          <div style={{
            display: 'flex',
            gap: '10px',
            marginTop: '8px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            <a href="tel:112" style={{
              background: 'var(--color-primary)',
              color: '#fff',
              padding: '10px 16px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.88rem',
            }}>
              📞 112 — All Emergency
            </a>
            <a href="tel:1091" style={{
              background: 'var(--color-secondary)',
              color: '#fff',
              padding: '10px 16px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.88rem',
            }}>
              🛡️ 1091 — Women Helpline
            </a>
          </div>
        </div>
      )}

      {/* Ranked Shelters List */}
      {!loading && rankedShelters.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* District Match Indicator */}
          {userDistrict && (
            <div style={{
              fontSize: '0.78rem',
              color: 'var(--color-on-surface-variant)',
              fontWeight: 600,
              padding: '0 2px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span>
                Showing shelters for <strong>{userDistrict}</strong>{userState ? `, ${userState}` : ''}
                {rankedShelters.some(
                  (s) => s.district?.toLowerCase() !== userDistrict.toLowerCase()
                ) && ' + nearby districts'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                {rankedShelters.length} Available Offline
              </span>
            </div>
          )}

          {rankedShelters.map((shelter, idx) => {
            const isSelected = shelter.shelterId === selectedShelterId;
            const isSameDistrict =
              userDistrict &&
              shelter.district?.toLowerCase() === userDistrict.toLowerCase();

            return (
              <div
                key={shelter.shelterId}
                className={`shelter-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedShelterId(shelter.shelterId)}
              >
                <div className="shelter-card-top">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: idx === 0 ? 'var(--color-primary)' : 'var(--color-outline)',
                        textTransform: 'uppercase',
                      }}>
                        {idx === 0 ? '★ Recommended Match' : `#${idx + 1} Alternative`}
                      </span>
                      {isSameDistrict && (
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          background: 'var(--color-tertiary-container)',
                          color: 'var(--color-on-tertiary-container)',
                          padding: '2px 6px',
                          borderRadius: '8px',
                        }}>
                          Same District
                        </span>
                      )}
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        background: 'var(--color-surface-container-highest)',
                        color: 'var(--color-on-surface-variant)',
                        padding: '2px 6px',
                        borderRadius: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}>
                        💾 Saved Locally
                      </span>
                    </div>
                    <div className="shelter-name">{shelter.shelterName}</div>
                    <div className="shelter-location">
                      {shelter.city || shelter.district}, {shelter.state}
                    </div>
                  </div>
                  <div className="shelter-score-badge">
                    🛡️ {shelter.shelterScore}/100
                  </div>
                </div>

                {/* Distance & Stats Row */}
                <div className="shelter-stats-row">
                  <div className="shelter-stat-item">
                    📏 <strong>{shelter.distanceKm.toFixed(1)} km</strong> away
                  </div>
                  <div className="shelter-stat-item">
                    🛏️ <strong>{shelter.availableBeds}</strong> beds free
                  </div>
                  <div className="shelter-stat-item">
                    📞 <span>{shelter.registeredMobile}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky Bottom SMS Action */}
      {rankedShelters.length > 0 && (
        <div className="sms-action-footer">
          <button
            className="btn-primary"
            style={{
              width: '100%',
              height: '54px',
              fontSize: '1.05rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
            onClick={handleSendSMS}
            disabled={!selectedShelter}
          >
            <span>📩</span>
            <span>
              {selectedShelter
                ? `Send SOS via SMS to ${selectedShelter.shelterName.split(' ')[0]}`
                : 'Select a Shelter'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
