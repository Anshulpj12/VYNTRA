/**
 * VYNTRA Part 2 — Shelter Registration Screen
 * 
 * Multi-step registration wizard for shelter providers.
 * Step 1: Shelter info & location
 * Step 2: Capacity (beds)
 * Step 3: Facilities
 * Step 4: Review & activate
 * 
 * @module part2-shelter-provider/registration/ShelterRegistrationScreen
 * @part Part 2 — Shelter Provider
 */

import { useState, useCallback } from 'react';
import { useShelter } from '../context/ShelterContext';
import { useConnectivity } from '../context/ConnectivityContext';
import {
  registerShelter,
  validateRegistrationForm,
  type RegistrationFormData,
} from './registration-service';
import { ALL_STATES } from '../../shared/constants/state-codes';
import '../styles/registration.css';

/** Registration step definition */
interface RegistrationStep {
  id: number;
  label: string;
  shortLabel: string;
  icon: string;
}

const STEPS: RegistrationStep[] = [
  { id: 1, label: 'Shelter Information & Location', shortLabel: 'Info & Location', icon: '📍' },
  { id: 2, label: 'Baseline Capacity & Bed Matrix', shortLabel: 'Capacity', icon: '🛏️' },
  { id: 3, label: 'Women-Specific Facilities & Sanitation', shortLabel: 'Facilities', icon: '🏥' },
  { id: 4, label: 'Review & Activate Shelter Profile', shortLabel: 'Activate', icon: '✅' },
];

/** Facility template for the form */
interface FacilityEntry {
  name: string;
  type: 'women-specific' | 'sanitation' | 'medical' | 'general';
  capacity: number;
  description: string;
}

/**
 * Multi-step shelter registration wizard.
 * Collects all required information before activating the shelter profile.
 */
export default function ShelterRegistrationScreen() {
  const { dispatch } = useShelter();
  const { status } = useConnectivity();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ─── Form State ─── */
  const [shelterName, setShelterName] = useState('');
  const [location, setLocation] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [registeredMobile, setRegisteredMobile] = useState('');
  const [totalBedCapacity, setTotalBedCapacity] = useState('');
  const [facilities, setFacilities] = useState<FacilityEntry[]>([
    { name: 'Women\'s Washrooms', type: 'sanitation', capacity: 4, description: 'Private washrooms with clean water supply' },
    { name: 'Sanitary Pad Dispensers', type: 'women-specific', capacity: 2, description: 'Touchless sanitary napkin vending units' },
    { name: 'First Aid Station', type: 'medical', capacity: 1, description: 'Basic medical support and first-aid kits' },
  ]);

  /** Get GPS coordinates from device */
  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setErrors((prev) => ({ ...prev, latitude: 'Geolocation not supported' }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setErrors((prev) => {
          const { latitude: _lat, longitude: _lng, ...rest } = prev;
          return rest;
        });
      },
      (error) => {
        setErrors((prev) => ({ ...prev, latitude: `GPS error: ${error.message}` }));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  /** Validate current step before advancing */
  const validateCurrentStep = (): boolean => {
    const formData: Partial<RegistrationFormData> = {
      shelterName,
      location,
      state,
      district,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      registeredMobile,
      totalBedCapacity: totalBedCapacity ? parseInt(totalBedCapacity, 10) : undefined,
    };

    if (currentStep === 1) {
      const validation = validateRegistrationForm(formData);
      const step1Errors: Record<string, string> = {};
      ['shelterName', 'location', 'state', 'district', 'registeredMobile', 'latitude', 'longitude'].forEach(
        (field) => {
          if (validation[field]) step1Errors[field] = validation[field];
        }
      );
      setErrors(step1Errors);
      return Object.keys(step1Errors).length === 0;
    }

    if (currentStep === 2) {
      const step2Errors: Record<string, string> = {};
      if (!totalBedCapacity || parseInt(totalBedCapacity, 10) <= 0) {
        step2Errors.totalBedCapacity = 'At least 1 bed is required';
      }
      setErrors(step2Errors);
      return Object.keys(step2Errors).length === 0;
    }

    return true;
  };

  /** Handle step navigation */
  const goNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((s) => Math.min(s + 1, 4));
    }
  };

  const goBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 1));
    setErrors({});
  };

  /** Add a new facility entry */
  const addFacility = () => {
    setFacilities((prev) => [
      ...prev,
      { name: '', type: 'general', capacity: 1, description: '' },
    ]);
  };

  /** Remove a facility entry */
  const removeFacility = (index: number) => {
    setFacilities((prev) => prev.filter((_, i) => i !== index));
  };

  /** Update a facility entry */
  const updateFacility = (index: number, field: keyof FacilityEntry, value: string | number) => {
    setFacilities((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [field]: value } : f))
    );
  };

  /** Submit registration */
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrors({});

    try {
      const formData: RegistrationFormData = {
        shelterName,
        location,
        state,
        district,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        registeredMobile,
        totalBedCapacity: parseInt(totalBedCapacity, 10),
        facilities: facilities.filter((f) => f.name.trim()),
      };

      /* Use a demo Google UID for now (will connect to real auth later) */
      const googleUid = 'demo-provider-uid';
      const shelter = await registerShelter(formData, googleUid);

      dispatch({ type: 'SET_SHELTER', payload: shelter });
      dispatch({ type: 'SET_TAB', payload: 'dashboard' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      setErrors({ submit: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Quick fill form with valid realistic test data */
  const handleQuickFill = () => {
    setShelterName('Bangalore Central Women Sanctuary & Emergency Desk');
    setLocation('42 Richmond Circle, Shanthi Nagar');
    setState('Karnataka');
    setDistrict('Bengaluru Urban');
    setLatitude('12.966700');
    setLongitude('77.595600');
    setRegisteredMobile('+91 98450 12345');
    setTotalBedCapacity('30');
    setFacilities([
      { name: 'Dedicated Women Washrooms', type: 'sanitation', capacity: 8, description: 'Clean private washrooms with hot water' },
      { name: 'Sanitary Napkin Dispensers', type: 'women-specific', capacity: 4, description: 'Touchless sanitary pad dispensing kiosks' },
      { name: 'Emergency Medical & Triage Station', type: 'medical', capacity: 2, description: 'First responder paramedic station with vital monitors' },
      { name: 'Infant & Child Safe Space', type: 'general', capacity: 10, description: 'Safe room for mothers and children' },
    ]);
    setErrors({});
  };

  /** 1-click test launcher with full occupants and inventory preloaded */
  const handleInstantDemoActivate = () => {
    dispatch({ type: 'LOAD_DEMO_DATA' });
  };

  return (
    <div className="registration">
      {/* ─── Testing Mode Notice & Quick Actions ─── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(16, 185, 129, 0.12))',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          borderRadius: 'var(--vyntra-radius-md)',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
        id="testing-mode-bar"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '26px' }}>🧪</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--vyntra-on-surface)' }}>
              Open Testing Mode Active (Firebase Bypassed for Testing)
            </div>
            <div style={{ fontSize: '13px', color: 'var(--vyntra-on-surface-muted)' }}>
              All shelter data is stored locally in IndexedDB. Live Firebase connection will be linked later.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="part2-btn part2-btn--secondary part2-btn--sm"
            onClick={handleQuickFill}
            id="quick-fill-btn"
            title="Pre-fill form fields with sample shelter data"
          >
            ⚡ Quick Fill Form
          </button>
          <button
            type="button"
            className="part2-btn part2-btn--primary part2-btn--sm"
            onClick={handleInstantDemoActivate}
            id="instant-demo-btn"
            title="Launch dashboard immediately with preloaded occupants, beds, and inventory"
          >
            🚀 1-Click Launch Demo Shelter
          </button>
        </div>
      </div>
      {/* ─── Header ─── */}
      <div className="registration__header">
        <div className="registration__header-content">
          <div className="registration__title-row">
            <span className="registration__icon">🏛️</span>
            <div>
              <h1 className="registration__title">Registration Desk</h1>
              <p className="registration__subtitle">
                Complete baseline parameters to activate shelter availability to the regional crisis dispatch grid.
              </p>
            </div>
          </div>
          <div className="registration__state-badge">
            STATE: <strong>INCOMPLETE</strong>
          </div>
        </div>
      </div>

      {/* ─── Step Progress ─── */}
      <div className="registration__steps">
        {STEPS.map((step) => (
          <div
            key={step.id}
            className={`registration__step ${
              step.id === currentStep
                ? 'registration__step--active'
                : step.id < currentStep
                ? 'registration__step--complete'
                : 'registration__step--pending'
            }`}
          >
            <div className="registration__step-number">
              {step.id < currentStep ? '✓' : step.id}
            </div>
            <div className="registration__step-info">
              <span className="registration__step-label">{step.shortLabel}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Step Content ─── */}
      <div className="registration__body">
        {/* Step 1: Shelter Info & Location */}
        {currentStep === 1 && (
          <div className="registration__section" id="step-1-info">
            <div className="part2-section__overline">SECTION 01</div>
            <h2 className="part2-section__title">Physical Sanctuary & Geo-Coordinates</h2>

            <div className="registration__form-grid">
              <div className="registration__form-main">
                <div className="part2-input-group">
                  <label className="part2-input-group__label">
                    Sanctuary Formal Registration Name <span className="part2-input-group__required">*</span>
                  </label>
                  <input
                    id="shelter-name-input"
                    className={`part2-input ${errors.shelterName ? 'part2-input--error' : ''}`}
                    type="text"
                    value={shelterName}
                    onChange={(e) => setShelterName(e.target.value)}
                    placeholder="e.g., Ananya Women's Safe Haven & Transit Center"
                  />
                  {errors.shelterName && (
                    <span className="part2-input-group__error">⚠ {errors.shelterName}</span>
                  )}
                  <span className="part2-input-group__helper">
                    Official crisis naming compliant with District Vulnerable Protection Registry.
                  </span>
                </div>

                <div className="part2-input-group">
                  <label className="part2-input-group__label">
                    Address / Street Vector <span className="part2-input-group__required">*</span>
                  </label>
                  <input
                    id="shelter-location-input"
                    className={`part2-input ${errors.location ? 'part2-input--error' : ''}`}
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., Sector 4, Near Outer Ring Flyover"
                  />
                  {errors.location && (
                    <span className="part2-input-group__error">⚠ {errors.location}</span>
                  )}
                </div>

                <div className="part2-grid part2-grid--2">
                  <div className="part2-input-group">
                    <label className="part2-input-group__label">
                      State Jurisdiction <span className="part2-input-group__required">*</span>
                    </label>
                    <select
                      id="shelter-state-select"
                      className={`part2-select ${errors.state ? 'part2-input--error' : ''}`}
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    >
                      <option value="">Select State</option>
                      {ALL_STATES.map((s) => (
                        <option key={s.code} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                    {errors.state && (
                      <span className="part2-input-group__error">⚠ {errors.state}</span>
                    )}
                  </div>

                  <div className="part2-input-group">
                    <label className="part2-input-group__label">
                      District / Zone <span className="part2-input-group__required">*</span>
                    </label>
                    <input
                      id="shelter-district-input"
                      className={`part2-input ${errors.district ? 'part2-input--error' : ''}`}
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="e.g., Bengaluru Urban"
                    />
                    {errors.district && (
                      <span className="part2-input-group__error">⚠ {errors.district}</span>
                    )}
                  </div>
                </div>

                <div className="part2-input-group">
                  <label className="part2-input-group__label">
                    Registered Mobile Number <span className="part2-input-group__required">*</span>
                  </label>
                  <input
                    id="shelter-mobile-input"
                    className={`part2-input ${errors.registeredMobile ? 'part2-input--error' : ''}`}
                    type="tel"
                    value={registeredMobile}
                    onChange={(e) => setRegisteredMobile(e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                  {errors.registeredMobile && (
                    <span className="part2-input-group__error">⚠ {errors.registeredMobile}</span>
                  )}
                </div>

                {/* Coordinates */}
                <div className="registration__coords-section" style={{ background: 'var(--vyntra-surface-variant)', padding: '16px', borderRadius: '12px', border: '1px solid var(--vyntra-border)', marginTop: '12px' }}>
                  <div className="registration__coords-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🎯</span> Precise Sanctuary GPS Coordinates (Linked to SOS Network)
                    </span>
                    <button
                      type="button"
                      className="part2-btn part2-btn--secondary part2-btn--sm"
                      onClick={handleGetLocation}
                      id="get-gps-btn"
                    >
                      📡 Auto-Detect GPS
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--vyntra-on-surface-muted)', alignSelf: 'center' }}>Quick Anchors:</span>
                    <button
                      type="button"
                      className="part2-btn part2-btn--ghost part2-btn--sm"
                      style={{ fontSize: '11px', padding: '2px 8px' }}
                      onClick={() => { setLatitude('12.9716'); setLongitude('77.5946'); setState('Karnataka'); setDistrict('Bengaluru Urban'); }}
                    >
                      📍 Bengaluru
                    </button>
                    <button
                      type="button"
                      className="part2-btn part2-btn--ghost part2-btn--sm"
                      style={{ fontSize: '11px', padding: '2px 8px' }}
                      onClick={() => { setLatitude('28.6139'); setLongitude('77.2090'); setState('Delhi'); setDistrict('Central Delhi'); }}
                    >
                      📍 Delhi
                    </button>
                    <button
                      type="button"
                      className="part2-btn part2-btn--ghost part2-btn--sm"
                      style={{ fontSize: '11px', padding: '2px 8px' }}
                      onClick={() => { setLatitude('23.1815'); setLongitude('79.9412'); setState('Madhya Pradesh'); setDistrict('Jabalpur'); }}
                    >
                      📍 Jabalpur
                    </button>
                    <button
                      type="button"
                      className="part2-btn part2-btn--ghost part2-btn--sm"
                      style={{ fontSize: '11px', padding: '2px 8px' }}
                      onClick={() => { setLatitude('23.2599'); setLongitude('77.4126'); setState('Madhya Pradesh'); setDistrict('Bhopal'); }}
                    >
                      📍 Bhopal
                    </button>
                    <button
                      type="button"
                      className="part2-btn part2-btn--ghost part2-btn--sm"
                      style={{ fontSize: '11px', padding: '2px 8px' }}
                      onClick={() => { setLatitude('19.0760'); setLongitude('72.8777'); setState('Maharashtra'); setDistrict('Mumbai'); }}
                    >
                      📍 Mumbai
                    </button>
                  </div>

                  <div className="part2-grid part2-grid--2">
                    <div className="part2-input-group">
                      <label className="part2-input-group__label">Latitude <span className="part2-input-group__required">*</span></label>
                      <input
                        id="shelter-lat-input"
                        className={`part2-input ${errors.latitude ? 'part2-input--error' : ''}`}
                        type="number"
                        step="0.000001"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        placeholder="e.g. 23.1815"
                      />
                      {errors.latitude && (
                        <span className="part2-input-group__error">⚠ {errors.latitude}</span>
                      )}
                    </div>
                    <div className="part2-input-group">
                      <label className="part2-input-group__label">Longitude <span className="part2-input-group__required">*</span></label>
                      <input
                        id="shelter-lng-input"
                        className={`part2-input ${errors.longitude ? 'part2-input--error' : ''}`}
                        type="number"
                        step="0.000001"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        placeholder="e.g. 79.9412"
                      />
                      {errors.longitude && (
                        <span className="part2-input-group__error">⚠ {errors.longitude}</span>
                      )}
                    </div>
                  </div>

                  {latitude && longitude && (
                    <div style={{ marginTop: '8px', padding: '6px 12px', background: 'rgba(56, 102, 65, 0.1)', color: 'var(--vyntra-success)', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>✅</span>
                      <span>Coordinates Verified: [{latitude}, {longitude}] — Shelter ready to link to Emergency SOS network.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Capacity */}
        {currentStep === 2 && (
          <div className="registration__section" id="step-2-capacity">
            <div className="part2-section__overline">SECTION 02</div>
            <h2 className="part2-section__title">Baseline Capacity & Protective Bed Matrix</h2>

            <div className="registration__capacity-hero">
              <div className="registration__capacity-card registration__capacity-card--primary">
                <div className="registration__capacity-card-icon">🛏️</div>
                <div className="registration__capacity-card-label text-badge">TOTAL CAPACITY</div>
                <div className="registration__capacity-input-wrapper">
                  <button
                    type="button"
                    className="registration__capacity-btn"
                    onClick={() => setTotalBedCapacity((v) => String(Math.max(1, (parseInt(v) || 0) - 1)))}
                    id="beds-decrease-btn"
                  >
                    −
                  </button>
                  <input
                    id="total-beds-input"
                    className="registration__capacity-number"
                    type="number"
                    min="1"
                    value={totalBedCapacity}
                    onChange={(e) => setTotalBedCapacity(e.target.value)}
                    placeholder="0"
                  />
                  <button
                    type="button"
                    className="registration__capacity-btn"
                    onClick={() => setTotalBedCapacity((v) => String((parseInt(v) || 0) + 1))}
                    id="beds-increase-btn"
                  >
                    +
                  </button>
                </div>
                <div className="registration__capacity-card-sub">Maximum Beds</div>
              </div>
            </div>
            {errors.totalBedCapacity && (
              <div className="part2-input-group__error" style={{ textAlign: 'center', marginTop: '8px' }}>
                ⚠ {errors.totalBedCapacity}
              </div>
            )}

            <p className="registration__capacity-note">
              Initial active unassigned beds. This becomes the shelter's baseline capacity
              that can be managed through the operational dashboard.
            </p>
          </div>
        )}

        {/* Step 3: Facilities */}
        {currentStep === 3 && (
          <div className="registration__section" id="step-3-facilities">
            <div className="part2-section__overline">SECTION 03</div>
            <h2 className="part2-section__title">Women-Specific Facilities & Sanitation Baseline</h2>

            <div className="registration__facilities-list">
              {facilities.map((facility, index) => (
                <div key={index} className="registration__facility-card part2-card">
                  <div className="registration__facility-header">
                    <span className="registration__facility-number">#{index + 1}</span>
                    {facilities.length > 1 && (
                      <button
                        type="button"
                        className="part2-btn part2-btn--ghost part2-btn--sm"
                        onClick={() => removeFacility(index)}
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>

                  <div className="part2-grid part2-grid--2">
                    <div className="part2-input-group">
                      <label className="part2-input-group__label">Facility Name</label>
                      <input
                        className="part2-input"
                        type="text"
                        value={facility.name}
                        onChange={(e) => updateFacility(index, 'name', e.target.value)}
                        placeholder="e.g., Private Showers"
                      />
                    </div>

                    <div className="part2-input-group">
                      <label className="part2-input-group__label">Type</label>
                      <select
                        className="part2-select"
                        value={facility.type}
                        onChange={(e) => updateFacility(index, 'type', e.target.value)}
                      >
                        <option value="women-specific">Women-Specific</option>
                        <option value="sanitation">Sanitation</option>
                        <option value="medical">Medical</option>
                        <option value="general">General</option>
                      </select>
                    </div>
                  </div>

                  <div className="part2-grid part2-grid--2">
                    <div className="part2-input-group">
                      <label className="part2-input-group__label">Capacity / Quantity</label>
                      <input
                        className="part2-input"
                        type="number"
                        min="0"
                        value={facility.capacity}
                        onChange={(e) => updateFacility(index, 'capacity', parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <div className="part2-input-group">
                      <label className="part2-input-group__label">Description</label>
                      <input
                        className="part2-input"
                        type="text"
                        value={facility.description}
                        onChange={(e) => updateFacility(index, 'description', e.target.value)}
                        placeholder="Brief description"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="part2-btn part2-btn--secondary part2-btn--full"
              onClick={addFacility}
              id="add-facility-btn"
              style={{ marginTop: 'var(--vyntra-space-md)' }}
            >
              ＋ Add Another Facility
            </button>
          </div>
        )}

        {/* Step 4: Review & Activate */}
        {currentStep === 4 && (
          <div className="registration__section" id="step-4-review">
            <div className="part2-section__overline">SECTION 04</div>
            <h2 className="part2-section__title">Review & Activate Shelter Profile</h2>

            <div className="registration__review">
              <div className="part2-card registration__review-card">
                <h3 className="text-headline-sm">📍 Shelter Information</h3>
                <div className="registration__review-grid">
                  <div className="registration__review-item">
                    <span className="registration__review-label">Name</span>
                    <span className="registration__review-value">{shelterName || '—'}</span>
                  </div>
                  <div className="registration__review-item">
                    <span className="registration__review-label">Location</span>
                    <span className="registration__review-value">{location || '—'}</span>
                  </div>
                  <div className="registration__review-item">
                    <span className="registration__review-label">State</span>
                    <span className="registration__review-value">{state || '—'}</span>
                  </div>
                  <div className="registration__review-item">
                    <span className="registration__review-label">District</span>
                    <span className="registration__review-value">{district || '—'}</span>
                  </div>
                  <div className="registration__review-item">
                    <span className="registration__review-label">Coordinates</span>
                    <span className="registration__review-value">{latitude}° N, {longitude}° E</span>
                  </div>
                  <div className="registration__review-item">
                    <span className="registration__review-label">Mobile</span>
                    <span className="registration__review-value">{registeredMobile || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="part2-card registration__review-card">
                <h3 className="text-headline-sm">🛏️ Capacity</h3>
                <div className="registration__review-capacity">
                  <span className="text-counter">{totalBedCapacity || '0'}</span>
                  <span className="text-muted">Maximum Beds</span>
                </div>
              </div>

              <div className="part2-card registration__review-card">
                <h3 className="text-headline-sm">🏥 Facilities ({facilities.filter((f) => f.name.trim()).length})</h3>
                <div className="registration__review-facilities">
                  {facilities.filter((f) => f.name.trim()).map((f, i) => (
                    <div key={i} className="registration__review-facility">
                      <span className="registration__review-facility-name">{f.name}</span>
                      <span className="part2-status-badge part2-status-badge--info">{f.type}</span>
                      <span className="text-muted">Qty: {f.capacity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {errors.submit && (
              <div className="registration__error-banner">
                ⚠ {errors.submit}
              </div>
            )}

            <div className="registration__activate-banner">
              <div className="registration__activate-icon">🔒</div>
              <div className="registration__activate-text">
                <strong>Ready for One-Touch Sanctuary Network Activation</strong>
                <p>
                  Submitting writes encrypted baseline directly to IndexedDB local cache
                  {status === 'online-synced' && ' and syncs to regional Firebase network'}.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Footer Navigation ─── */}
      <div className="registration__footer">
        <div className="registration__footer-left">
          {currentStep > 1 && (
            <button
              type="button"
              className="part2-btn part2-btn--secondary"
              onClick={goBack}
              id="reg-back-btn"
            >
              ← Back
            </button>
          )}
        </div>
        <div className="registration__footer-right">
          {currentStep < 4 ? (
            <button
              type="button"
              className="part2-btn part2-btn--primary"
              onClick={goNext}
              id="reg-next-btn"
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              className="part2-btn part2-btn--primary part2-btn--lg"
              onClick={handleSubmit}
              disabled={isSubmitting}
              id="reg-activate-btn"
            >
              {isSubmitting ? '⏳ Activating...' : '🛡️ Activate Shelter Profile & Generate ID'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
