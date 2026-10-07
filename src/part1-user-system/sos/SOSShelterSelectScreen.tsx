/**
 * VYNTRA — SOS Shelter Selection & SMS Dispatch Screen
 * Ranks cached shelters by composite priority score and distance.
 * Auto-populates SMS message with compact emergency code.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getAllItems, putItem, STORES, addPendingSync } from '../../shared/utils/offline-cache';
import { calculateDistance } from '../../shared/utils/geo-distance';
import type { ShelterMetadata, ShelterProvider, GeoCoordinates } from '../../shared/types';
import { db } from '../../shared/firebase/config';
import { collection, addDoc, getDocs, Timestamp } from 'firebase/firestore';
import '../styles/sos.css';

// Fallback initial emergency shelters if cache is empty
const INITIAL_DEMO_SHELTERS: ShelterMetadata[] = [
  {
    shelterId: 'VYNTRA-SHL-01',
    shelterName: 'Sanctuary Safe Haven — Central',
    registeredMobile: '+919876543210',
    coordinates: { lat: 28.6145, lng: 77.2085 },
    state: 'Delhi',
    district: 'New Delhi',
    city: 'New Delhi',
    totalBedCapacity: 60,
    occupiedBeds: 22,
    availableBeds: 38,
    shelterScore: 94,
    currentOccupants: [],
    facilities: [
      { facilityId: 'f1', facilityName: 'Maternity Care Unit', type: 'women-specific', totalCapacity: 20, currentAvailable: 12 },
      { facilityId: 'f2', facilityName: 'Wheelchair Ramp & Access', type: 'general', totalCapacity: 10, currentAvailable: 8 },
    ],
    inventorySummary: [
      { itemName: 'Sanitary Pads', currentQuantity: 300, requiredMinimum: 100 },
      { itemName: 'Emergency First Aid Kit', currentQuantity: 25, requiredMinimum: 10 },
    ],
    lastUpdatedAt: Date.now(),
  },
  {
    shelterId: 'VYNTRA-SHL-02',
    shelterName: 'Mahila Kalyan Emergency Shelter',
    registeredMobile: '+919876543211',
    coordinates: { lat: 28.6250, lng: 77.2190 },
    state: 'Delhi',
    district: 'New Delhi',
    city: 'New Delhi',
    totalBedCapacity: 45,
    occupiedBeds: 18,
    availableBeds: 27,
    shelterScore: 88,
    currentOccupants: [],
    facilities: [
      { facilityId: 'f3', facilityName: 'Women Sanitation Block', type: 'sanitation', totalCapacity: 15, currentAvailable: 10 },
    ],
    inventorySummary: [
      { itemName: 'Baby Formula', currentQuantity: 50, requiredMinimum: 20 },
    ],
    lastUpdatedAt: Date.now(),
  },
  {
    shelterId: 'VYNTRA-SHL-03',
    shelterName: 'Apex Health & Women Rescue Centre',
    registeredMobile: '+919876543212',
    coordinates: { lat: 28.6380, lng: 77.1950 },
    state: 'Delhi',
    district: 'Central',
    city: 'New Delhi',
    totalBedCapacity: 80,
    occupiedBeds: 50,
    availableBeds: 30,
    shelterScore: 82,
    currentOccupants: [],
    facilities: [
      { facilityId: 'f4', facilityName: 'On-site Doctor & Clinic', type: 'medical', totalCapacity: 30, currentAvailable: 14 },
    ],
    inventorySummary: [
      { itemName: 'Medical Cots', currentQuantity: 40, requiredMinimum: 15 },
    ],
    lastUpdatedAt: Date.now(),
  },
];

interface RankedShelter extends ShelterMetadata {
  distanceKm: number;
  compositeScore: number;
}

export default function SOSShelterSelectScreen() {
  const { isOnline } = useAuth();
  const navigate = useNavigate();

  const [sosData] = useState<{
    userId: string;
    coordinates: GeoCoordinates;
    coordinateSource: string;
    selectedConditions: string[];
    compactCode: string;
  } | null>(() => {
    const raw = sessionStorage.getItem('vyntra_pending_sos');
    if (raw) {
      try {
        return JSON.parse(raw);
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

  useEffect(() => {
    const userCoords: GeoCoordinates = sosData?.coordinates || { lat: 28.6139, lng: 77.2090 };

    async function loadShelters() {
      const shelterMap = new Map<string, ShelterMetadata>();

      // 1. Read from STORES.SHELTER_CACHE
      try {
        const cached = await getAllItems<ShelterMetadata>(STORES.SHELTER_CACHE);
        if (cached && Array.isArray(cached)) {
          cached.forEach((s) => {
            if (s && s.shelterId) shelterMap.set(s.shelterId, s);
          });
        }
      } catch (e) {
        console.warn('Error reading SHELTER_CACHE:', e);
      }

      // 2. Read from STORES.METADATA
      try {
        const metadataItems = await getAllItems<ShelterMetadata>(STORES.METADATA);
        if (metadataItems && Array.isArray(metadataItems)) {
          metadataItems.forEach((m) => {
            if (m && m.shelterId) shelterMap.set(m.shelterId, m);
          });
        }
      } catch (e) {
        console.warn('Error reading METADATA:', e);
      }

      // 3. Read from STORES.SHELTER_PROVIDERS (Part 2 registration)
      try {
        const providers = await getAllItems<ShelterProvider>(STORES.SHELTER_PROVIDERS);
        if (providers && Array.isArray(providers)) {
          providers.forEach((prov) => {
            if (prov && prov.shelterId && !shelterMap.has(prov.shelterId)) {
              shelterMap.set(prov.shelterId, {
                shelterId: prov.shelterId,
                shelterName: prov.shelterName,
                registeredMobile: prov.registeredMobile,
                coordinates: prov.coordinates,
                state: prov.state,
                district: prov.district,
                city: prov.location,
                totalBedCapacity: prov.totalBedCapacity,
                occupiedBeds: prov.occupiedBeds || 0,
                availableBeds: prov.availableBeds || prov.totalBedCapacity,
                shelterScore: 88,
                currentOccupants: [],
                facilities: [],
                inventorySummary: [],
                lastUpdatedAt: prov.lastUpdatedAt || Date.now(),
              });
            }
          });
        }
      } catch (e) {
        console.warn('Error reading SHELTER_PROVIDERS:', e);
      }

      // 4. Online Firebase query if connected
      if (navigator.onLine) {
        try {
          const q = collection(db, 'shelter-providers');
          const snap = await getDocs(q);
          snap.forEach((docSnap) => {
            const data = docSnap.data() as ShelterProvider;
            if (data && data.shelterId) {
              const meta: ShelterMetadata = {
                shelterId: data.shelterId,
                shelterName: data.shelterName,
                registeredMobile: data.registeredMobile,
                coordinates: data.coordinates,
                state: data.state,
                district: data.district,
                city: data.location,
                totalBedCapacity: data.totalBedCapacity,
                occupiedBeds: data.occupiedBeds || 0,
                availableBeds: data.availableBeds || data.totalBedCapacity,
                shelterScore: 90,
                currentOccupants: [],
                facilities: [],
                inventorySummary: [],
                lastUpdatedAt: data.lastUpdatedAt || Date.now(),
              };
              shelterMap.set(data.shelterId, meta);
              void putItem(STORES.SHELTER_CACHE, meta);
            }
          });
        } catch (err) {
          console.warn('Could not query online shelters:', err);
        }
      }

      // 5. Fallback demo shelters if still empty
      if (shelterMap.size === 0) {
        for (const s of INITIAL_DEMO_SHELTERS) {
          shelterMap.set(s.shelterId, s);
          await putItem(STORES.SHELTER_CACHE, s);
        }
      }

      const allShelters = Array.from(shelterMap.values());

      // Rank shelters: composite score = (shelterScore * 0.6) + proximity score (0.4)
      const ranked: RankedShelter[] = allShelters.map((s) => {
        const dist = calculateDistance(userCoords, s.coordinates);
        // Inverse distance score: 0km = 100pts, 20km = 0pts
        const distScore = Math.max(0, 100 - dist * 5);
        const composite = ((s.shelterScore || 80) * 0.6) + (distScore * 0.4);
        return {
          ...s,
          distanceKm: dist,
          compositeScore: composite,
        };
      });

      ranked.sort((a, b) => b.compositeScore - a.compositeScore);
      setRankedShelters(ranked);
      if (ranked.length > 0) {
        setSelectedShelterId(ranked[0].shelterId);
      }
    }

    loadShelters();
  }, [sosData?.coordinates]);

  const handleSendSMS = async () => {
    if (!sosData) {
      navigate('/sos/conditions');
      return;
    }
    if (!selectedShelterId) return;
    const shelter = rankedShelters.find((s) => s.shelterId === selectedShelterId);
    if (!shelter) return;

    // Construct native SMS link
    // Standard SMS URI format: sms:<number>?body=<message>
    const smsUrl = `sms:${shelter.registeredMobile}?body=${encodeURIComponent(sosData.compactCode)}`;

    // Prepare SOS Request record
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

    setDispatchedSuccess(true);

    // Try opening device SMS client (on smartphone)
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

      {/* Ranked Shelters List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {rankedShelters.map((shelter, idx) => {
          const isSelected = shelter.shelterId === selectedShelterId;
          return (
            <div
              key={shelter.shelterId}
              className={`shelter-card ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedShelterId(shelter.shelterId)}
            >
              <div className="shelter-card-top">
                <div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: idx === 0 ? 'var(--color-primary)' : 'var(--color-outline)',
                    textTransform: 'uppercase',
                  }}>
                    {idx === 0 ? '★ Recommended Match' : `#${idx + 1} Alternative`}
                  </span>
                  <div className="shelter-name">{shelter.shelterName}</div>
                  <div className="shelter-location">
                    {shelter.city}, {shelter.state} • {shelter.distanceKm.toFixed(1)} km away
                  </div>
                </div>
                <div className="shelter-score-badge">
                  🛡️ {shelter.shelterScore}/100
                </div>
              </div>

              <div className="shelter-stats-row">
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

      {/* Sticky Bottom SMS Action */}
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
    </div>
  );
}
