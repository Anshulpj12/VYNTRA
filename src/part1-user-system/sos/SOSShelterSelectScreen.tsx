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
import type { ShelterMetadata, GeoCoordinates } from '../../shared/types';
import { db } from '../../shared/firebase/config';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
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
    lastUpdatedAt: Timestamp.now(),
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
    lastUpdatedAt: Timestamp.now(),
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
    lastUpdatedAt: Timestamp.now(),
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

  useEffect(() => {
    const userCoords: GeoCoordinates = sosData?.coordinates || { lat: 28.6139, lng: 77.2090 };

    async function loadShelters() {
      let shelters = await getAllItems<ShelterMetadata>(STORES.SHELTER_CACHE);
      if (!shelters || shelters.length === 0) {
        // Populate fallback demo shelters into cache for offline survival
        for (const s of INITIAL_DEMO_SHELTERS) {
          await putItem(STORES.SHELTER_CACHE, s);
        }
        shelters = INITIAL_DEMO_SHELTERS;
      }

      // Rank shelters: composite score = (shelterScore * 0.6) + proximity score (0.4)
      const ranked: RankedShelter[] = shelters.map((s) => {
        const dist = calculateDistance(userCoords, s.coordinates);
        // Inverse distance score: 0km = 100pts, 20km = 0pts
        const distScore = Math.max(0, 100 - dist * 5);
        const composite = (s.shelterScore * 0.6) + (distScore * 0.4);
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

    // Open device SMS client
    window.location.href = smsUrl;
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
          gap: '4px',
          fontFamily: 'monospace',
          fontSize: '0.8rem',
        }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-outline)', fontWeight: 700 }}>
            ENCODED SMS PAYLOAD:
          </span>
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
        }}>
          <strong>✓ SOS Dispatched to Device SMS!</strong>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>
            If your messaging app did not open automatically, send the code above to{' '}
            <strong>{selectedShelter?.registeredMobile}</strong>.
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
