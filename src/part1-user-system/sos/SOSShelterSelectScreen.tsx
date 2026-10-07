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

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { putItem, STORES, addPendingSync } from '../../shared/utils/offline-cache';
import { calculateDistance } from '../../shared/utils/geo-distance';
import type { ShelterMetadata, GeoCoordinates } from '../../shared/types';
import { db } from '../../shared/firebase/config';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { getAllAvailableShelters, syncDistrictShelters } from './shelter-cache';
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
  const { isOnline } = useAuth();
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

  const [rankedShelters, setRankedShelters] = useState<RankedShelter[]>([]);
  const [selectedShelterId, setSelectedShelterId] = useState<string>('');
  const [dispatchedSuccess, setDispatchedSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

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

  /* ─── Load & rank shelters from cache ─── */
  useEffect(() => {
    const userCoords: GeoCoordinates = sosData?.coordinates || { lat: 28.6139, lng: 77.2090 };
    const userDistrict = sosData?.district || '';
    const userState = sosData?.state || '';

    async function loadShelters() {
      setLoading(true);

      /*
       * Step 1: If online & district known, trigger a background sync
       * to ensure we have the latest shelter data for this district.
       * This is non-blocking — we load from cache first, then update.
       */
      if (navigator.onLine && userDistrict && userState) {
        syncDistrictShelters(userDistrict, userState)
          .then((count) => {
            if (count > 0) {
              /* Re-load shelters with fresh data */
              loadAndRankShelters();
            }
          })
          .catch((err) => {
            console.warn('Background shelter sync failed:', err);
          });
      }

      await loadAndRankShelters();
    }

    async function loadAndRankShelters() {
      /*
       * Step 2: Read all available shelters from IndexedDB.
       * The getAllAvailableShelters function merges data from:
       *   - SHELTER_CACHE (district-synced data)
       *   - METADATA (Part 2 consolidated metadata)
       *   - SHELTER_PROVIDERS (Part 2 registration data)
       * It deduplicates by shelterId and prioritizes the user's district.
       */
      const allShelters = await getAllAvailableShelters(userDistrict);

      if (allShelters.length === 0) {
        setRankedShelters([]);
        setLoading(false);
        return;
      }

      /*
       * Step 3: Rank shelters using composite score.
       *
       * compositeScore = (shelterScore × 0.6) + (distanceScore × 0.4)
       *
       * Distance score uses inverse scaling:
       *   0 km  → 100 points
       *   20 km → 0 points
       *
       * This means closer shelters with higher readiness scores rank first.
       */
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

      if (ranked.length > 0 && !selectedShelterId) {
        setSelectedShelterId(ranked[0].shelterId);
      }

      setLoading(false);
    }

    loadShelters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sosData?.coordinates, sosData?.district, sosData?.state]);

  /* ─── SMS Dispatch Handler ─── */
  const handleSendSMS = async () => {
    if (!sosData) {
      navigate('/sos/conditions');
      return;
    }
    if (!selectedShelterId) return;

    const shelter = rankedShelters.find((s) => s.shelterId === selectedShelterId);
    if (!shelter) return;

    /*
     * Construct native SMS URI.
     * Format: sms:<number>?body=<encoded-message>
     *
     * The compact SOS code (e.g. VYNTRA|26.9124,75.7873|PG-WC|USR-A7K2M9X1|1696588800)
     * is placed as the SMS body. The shelter's registered mobile number
     * is the recipient. The user just needs to press Send.
     */
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
      /* Non-critical — history caching failure doesn't block dispatch */
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
          gap: '12px',
        }}>
          <span style={{ fontSize: '2.5rem' }}>🏛️</span>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-on-surface)', marginBottom: '6px' }}>
              No Shelters Cached Yet
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
              {navigator.onLine
                ? 'Shelter providers for your district haven\'t been registered yet. Try again later or use the emergency helplines below.'
                : 'You\'re offline and no shelter data has been downloaded for your district. Connect to the internet to download shelter information.'}
            </p>
          </div>
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
          {sosData?.district && (
            <div style={{
              fontSize: '0.78rem',
              color: 'var(--color-on-surface-variant)',
              fontWeight: 600,
              padding: '0 2px',
            }}>
              Showing shelters for <strong>{sosData.district}</strong>, {sosData.state}
              {rankedShelters.some(
                (s) => s.district?.toLowerCase() !== sosData.district?.toLowerCase()
              ) && ' + nearby districts'}
            </div>
          )}

          {rankedShelters.map((shelter, idx) => {
            const isSelected = shelter.shelterId === selectedShelterId;
            const isSameDistrict =
              sosData?.district &&
              shelter.district?.toLowerCase() === sosData.district.toLowerCase();

            return (
              <div
                key={shelter.shelterId}
                className={`shelter-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedShelterId(shelter.shelterId)}
              >
                <div className="shelter-card-top">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
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
