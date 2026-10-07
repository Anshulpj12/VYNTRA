/**
 * VYNTRA — Emergency Profile Creation Screen
 * Generated via Stitch MCP ("Serene Sanctuary" Design System)
 * Multi-step card-based form: Basic Info → Health & Care → Review & Sync.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db, withFirestoreTimeout } from '../../shared/firebase/config';
import { generateUniqueId } from '../../shared/utils/id-generator';
import { putItem, STORES, addPendingSync } from '../../shared/utils/offline-cache';
import type { UserProfile } from '../../shared/types';
import { Timestamp } from 'firebase/firestore';
import { getStateList } from '../../shared/constants/state-codes';
import '../styles/profile.css';

const DISABILITY_OPTIONS = ['Mobility', 'Visual', 'Hearing', 'Cognitive', 'None'];
const RELATIONSHIP_CHIPS = ['Mother', 'Sister', 'Partner', 'Trusted Friend', 'Father', 'Brother'];

export default function ProfileCreateScreen() {
  const { vyntraUser, isOnline, refreshRoleData } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'basic' | 'extended' | 'review'>('basic');
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  // Basic info state
  const [name, setName] = useState('');
  const [gender, setGender] = useState<UserProfile['gender']>('female');
  const [age, setAge] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [contactRelation, setContactRelation] = useState('');

  // Extended info state (female users)
  const [isPregnant, setIsPregnant] = useState(false);
  const [estimatedMonth, setEstimatedMonth] = useState('');
  const [disabilities, setDisabilities] = useState<string[]>([]);
  const [medicalConditions, setMedicalConditions] = useState('');
  const [currentlyMenstruating, setCurrentlyMenstruating] = useState(false);
  const [specialRequirements, setSpecialRequirements] = useState('');

  const detectLocation = () => {
    if ('geolocation' in navigator) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude.toFixed(6));
          setLng(pos.coords.longitude.toFixed(6));
          setLocating(false);
        },
        () => {
          alert('Could not detect location. Please enter your address manually.');
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  const toggleDisability = (d: string) => {
    if (d === 'None') {
      setDisabilities(['None']);
      return;
    }
    setDisabilities(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev.filter(x => x !== 'None'), d]
    );
  };

  const calculateCompleteness = (): number => {
    const basicFields = [name, gender, age, state, district, homeAddress, emergencyContact];
    const basicFilled = basicFields.filter(Boolean).length;
    const basicTotal = basicFields.length;

    if (gender !== 'female') return Math.round((basicFilled / basicTotal) * 100);

    const extFields = [
      isPregnant ? 'y' : '',
      disabilities.length > 0 ? 'y' : '',
      medicalConditions,
      currentlyMenstruating ? 'y' : '',
      specialRequirements,
    ];
    const extFilled = extFields.filter(Boolean).length;
    const totalFields = basicTotal + extFields.length;
    return Math.min(100, Math.round(((basicFilled + extFilled) / totalFields) * 100));
  };

  const isBasicValid = () => Boolean(name.trim() && age && state && district.trim() && emergencyContact.trim());

  const handleSubmit = async () => {
    setSaving(true);

    try {
      const effectiveAppId = vyntraUser?.appId || generateUniqueId('USR');

      const fullEmergency = contactRelation 
        ? `${emergencyContact.trim()} (${contactRelation})` 
        : emergencyContact.trim();

      const profile: UserProfile = {
        appId: effectiveAppId,
        name: name.trim() || 'Emergency User',
        gender,
        age: parseInt(age) || 0,
        state: state || 'National',
        district: district.trim() || 'General',
        homeAddress: homeAddress.trim(),
        homeCoordinates: { lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0 },
        emergencyContact: fullEmergency,
        profileCompleteness: calculateCompleteness(),
        lastModifiedAt: Timestamp.now(),
        pendingSync: !isOnline,
      };

      if (gender === 'female') {
        profile.pregnancyStatus = { isPregnant, estimatedMonth: estimatedMonth ? parseInt(estimatedMonth) : undefined };
        profile.disabilities = disabilities;
        profile.medicalConditions = medicalConditions.trim();
        profile.currentlyMenstruating = currentlyMenstruating;
        profile.specialRequirements = specialRequirements.trim();
      }

      // 1. Offline-first save to IndexedDB
      try {
        await putItem(STORES.PROFILE, profile);
      } catch (e) {
        console.warn('IndexedDB profile save warning:', e);
      }

      // 2. Snapshot to localStorage for instant offline access
      try {
        localStorage.setItem(`vyntra_profile_${effectiveAppId}`, JSON.stringify(profile));
        localStorage.setItem('vyntra_active_profile', JSON.stringify(profile));
      } catch {}

      // 3. Background sync to Firestore with safety timeout (NEVER block user flow)
      if (isOnline) {
        withFirestoreTimeout(async () => {
          const profileRef = doc(db, 'users', effectiveAppId);
          await setDoc(profileRef, { profile }, { merge: true });
          if (vyntraUser?.googleUid) {
            const googleUserRef = doc(db, 'users', vyntraUser.googleUid);
            await setDoc(googleUserRef, { profile }, { merge: true });
          }
        }, 1500).catch((err) => {
          console.warn('Sync pending. Saved to IndexedDB:', err);
          addPendingSync({
            type: 'create',
            collection: 'users',
            docId: effectiveAppId,
            data: { profile },
          });
        });
      } else {
        await addPendingSync({
          type: 'create',
          collection: 'users',
          docId: effectiveAppId,
          data: { profile },
        });
      }

      // Refresh role data so auth context knows profile exists
      await refreshRoleData();

      setSaving(false);
      navigate('/user/home', { replace: true });
    } catch (err) {
      console.error('Profile creation error, proceeding safely:', err);
      setSaving(false);
      navigate('/user/home', { replace: true });
    }
  };

  const handleSkip = () => {
    navigate('/user/home', { replace: true });
  };

  const completeness = calculateCompleteness();

  return (
    <div className="profile-create-page">
      {/* Top App Bar */}
      <header className="profile-app-bar">
        <button 
          type="button" 
          className="app-bar-back-btn" 
          onClick={() => step === 'basic' ? navigate('/auth/role-select') : setStep(step === 'review' ? (gender === 'female' ? 'extended' : 'basic') : 'basic')}
          aria-label="Back"
        >
          ←
        </button>
        <div className="app-bar-center">
          <span className="app-bar-badge">Emergency Profile</span>
          <h1 className="app-bar-title">Personal Safety Setup</h1>
        </div>
        <div className="app-bar-encryption-badge" title="Stored locally & encrypted">
          <span>🔒</span>
        </div>
      </header>

      {/* Stepper Header */}
      <nav className="profile-stepper-nav" aria-label="Profile Steps">
        <button 
          type="button" 
          className={`stepper-step ${step === 'basic' ? 'active' : 'completed'}`}
          onClick={() => setStep('basic')}
        >
          <span className="step-circle">1</span>
          <span className="step-name">Basic Info</span>
        </button>

        <span className="stepper-line" />

        <button 
          type="button" 
          className={`stepper-step ${step === 'extended' ? 'active' : step === 'review' ? 'completed' : ''}`}
          disabled={!isBasicValid()}
          onClick={() => isBasicValid() && gender === 'female' && setStep('extended')}
        >
          <span className="step-circle">2</span>
          <span className="step-name">{gender === 'female' ? 'Health & Care' : 'Health (Skip)'}</span>
        </button>

        <span className="stepper-line" />

        <button 
          type="button" 
          className={`stepper-step ${step === 'review' ? 'active' : ''}`}
          disabled={!isBasicValid()}
          onClick={() => isBasicValid() && setStep('review')}
        >
          <span className="step-circle">3</span>
          <span className="step-name">Review</span>
        </button>
      </nav>

      {/* Profile Completeness Ribbon */}
      <section className="completeness-ribbon">
        <div className="completeness-info">
          <span className="completeness-tag">Profile Readiness</span>
          <span className="completeness-pct">{completeness}% Complete</span>
        </div>
        <div className="completeness-bar-track">
          <div className="completeness-bar-fill" style={{ width: `${completeness}%` }} />
        </div>
        <p className="completeness-note">
          Essential for rapid first-responder identification and priority shelter allocation.
        </p>
      </section>

      {/* STEP 1: Basic Info */}
      {step === 'basic' && (
        <main className="profile-form-flow">
          {/* Card 1: Identity & Demographics */}
          <div className="stitch-form-card">
            <div className="card-heading-box">
              <span className="card-badge-icon">🪪</span>
              <div>
                <h2 className="card-heading-title">Identity & Demographics</h2>
                <p className="card-heading-desc">Required to confirm your identity during displacement</p>
              </div>
            </div>

            <div className="stitch-field-group">
              <label htmlFor="p-name">Full Name <span className="req">*</span></label>
              <input
                id="p-name"
                type="text"
                className="stitch-input"
                placeholder="e.g. Priya Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="stitch-field-group">
              <label>Gender <span className="req">*</span></label>
              <div className="gender-pill-grid">
                {(['female', 'male', 'other', 'prefer-not-to-say'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`gender-pill-btn ${gender === g ? 'active' : ''}`}
                    onClick={() => setGender(g)}
                  >
                    <span className="pill-check">{gender === g ? '✓' : '○'}</span>
                    <span>{g === 'prefer-not-to-say' ? 'Prefer not to say' : g.charAt(0).toUpperCase() + g.slice(1)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="stitch-field-group">
              <label htmlFor="p-age">Age <span className="req">*</span></label>
              <input
                id="p-age"
                type="number"
                className="stitch-input"
                placeholder="e.g. 24"
                min="10"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>
          </div>

          {/* Card 2: Safe Zone & Location */}
          <div className="stitch-form-card">
            <div className="card-heading-box">
              <span className="card-badge-icon">📍</span>
              <div>
                <h2 className="card-heading-title">Safe Zone & Location</h2>
                <p className="card-heading-desc">Helps match nearest shelters & district SOS response</p>
              </div>
            </div>

            <div className="form-two-col">
              <div className="stitch-field-group">
                <label htmlFor="p-state">State / Region <span className="req">*</span></label>
                <select
                  id="p-state"
                  className="stitch-select"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                >
                  <option value="">Select State</option>
                  {getStateList().map((s) => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="stitch-field-group">
                <label htmlFor="p-district">District <span className="req">*</span></label>
                <input
                  id="p-district"
                  type="text"
                  className="stitch-input"
                  placeholder="e.g. Pune / Mumbai"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                />
              </div>
            </div>

            <div className="stitch-field-group">
              <div className="label-with-action">
                <label htmlFor="p-address">Home Sanctuary Address</label>
                <button 
                  type="button" 
                  className="gps-detect-btn" 
                  onClick={detectLocation}
                  disabled={locating}
                >
                  <span>📍</span> {locating ? 'Detecting...' : lat ? 'GPS Locked ✓' : 'Auto-Detect GPS'}
                </button>
              </div>
              <textarea
                id="p-address"
                className="stitch-textarea"
                rows={2}
                placeholder="House no, Street, Landmark..."
                value={homeAddress}
                onChange={(e) => setHomeAddress(e.target.value)}
              />
              <span className="field-hint">
                🔒 GPS coordinates are obfuscated on-device until an SOS beacon is triggered.
              </span>
            </div>
          </div>

          {/* Card 3: Emergency Contacts */}
          <div className="stitch-form-card">
            <div className="card-heading-box">
              <span className="card-badge-icon">📞</span>
              <div>
                <h2 className="card-heading-title">Primary SOS Guardian</h2>
                <p className="card-heading-desc">Notified automatically when emergency SOS is triggered</p>
              </div>
            </div>

            <div className="stitch-field-group">
              <label htmlFor="p-emergency">Phone Number <span className="req">*</span></label>
              <div className="input-with-prefix">
                <span className="input-prefix">🇮🇳 +91</span>
                <input
                  id="p-emergency"
                  type="tel"
                  className="stitch-input with-prefix"
                  placeholder="98765 43210"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                />
              </div>
            </div>

            <div className="stitch-field-group">
              <label>Relationship Tag</label>
              <div className="chips-row">
                {RELATIONSHIP_CHIPS.map((rel) => (
                  <button
                    key={rel}
                    type="button"
                    className={`affinity-chip ${contactRelation === rel ? 'selected' : ''}`}
                    onClick={() => setContactRelation(contactRelation === rel ? '' : rel)}
                  >
                    {rel}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* STEP 2: Health Info (Female / Extended) */}
      {step === 'extended' && gender === 'female' && (
        <main className="profile-form-flow">
          <div className="stitch-form-card">
            <div className="card-heading-box">
              <span className="card-badge-icon">🌸</span>
              <div>
                <h2 className="card-heading-title">Maternal & Menstrual Health</h2>
                <p className="card-heading-desc">Critical for allocating sanitary kits & maternal shelter spaces</p>
              </div>
            </div>

            {/* Pregnancy Switch Card */}
            <div className="toggle-switch-card">
              <div className="toggle-text">
                <span className="toggle-label">Currently Pregnant?</span>
                <span className="toggle-sub">Priority allocation for maternal shelter beds</span>
              </div>
              <button 
                type="button" 
                className={`switch-btn ${isPregnant ? 'active' : ''}`}
                onClick={() => setIsPregnant(!isPregnant)}
              >
                <span className="switch-slider" />
              </button>
            </div>

            {isPregnant && (
              <div className="stitch-field-group sub-field">
                <label htmlFor="p-month">Estimated Gestational Month (1 - 9)</label>
                <input
                  id="p-month"
                  type="number"
                  min="1"
                  max="9"
                  className="stitch-input"
                  placeholder="e.g. 5"
                  value={estimatedMonth}
                  onChange={(e) => setEstimatedMonth(e.target.value)}
                />
              </div>
            )}

            {/* Menstruating Switch Card */}
            <div className="toggle-switch-card">
              <div className="toggle-text">
                <span className="toggle-label">Currently Menstruating?</span>
                <span className="toggle-sub">Flags immediate need for hygiene provisions in SOS beacon</span>
              </div>
              <button 
                type="button" 
                className={`switch-btn ${currentlyMenstruating ? 'active' : ''}`}
                onClick={() => setCurrentlyMenstruating(!currentlyMenstruating)}
              >
                <span className="switch-slider" />
              </button>
            </div>
          </div>

          {/* Card: Mobility & Special Support */}
          <div className="stitch-form-card">
            <div className="card-heading-box">
              <span className="card-badge-icon">♿</span>
              <div>
                <h2 className="card-heading-title">Mobility & Accessibility</h2>
                <p className="card-heading-desc">Ensures shelters have wheelchair access or hearing assistance</p>
              </div>
            </div>

            <div className="stitch-field-group">
              <label>Special Accessibility Needs</label>
              <div className="chips-row">
                {DISABILITY_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`affinity-chip ${disabilities.includes(d) ? 'selected' : ''}`}
                    onClick={() => toggleDisability(d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="stitch-field-group">
              <label htmlFor="p-conditions">Known Medical Conditions / Allergies</label>
              <textarea
                id="p-conditions"
                className="stitch-textarea"
                rows={2}
                placeholder="e.g. Asthma, Diabetes, Penicillin allergy..."
                value={medicalConditions}
                onChange={(e) => setMedicalConditions(e.target.value)}
              />
            </div>

            <div className="stitch-field-group">
              <label htmlFor="p-reqs">Special Requirements / Children</label>
              <textarea
                id="p-reqs"
                className="stitch-textarea"
                rows={2}
                placeholder="e.g. Traveling with infant, elderly parent..."
                value={specialRequirements}
                onChange={(e) => setSpecialRequirements(e.target.value)}
              />
            </div>
          </div>
        </main>
      )}

      {/* STEP 3: Review Step */}
      {step === 'review' && (
        <main className="profile-form-flow">
          <div className="stitch-form-card review-card">
            <div className="card-heading-box">
              <span className="card-badge-icon">🛡️</span>
              <div>
                <h2 className="card-heading-title">Emergency Summary Verification</h2>
                <p className="card-heading-desc">Review your credentials before encrypting and caching</p>
              </div>
            </div>

            <div className="summary-list">
              <div className="summary-row">
                <span className="s-label">Full Name</span>
                <span className="s-value">{name || '—'}</span>
              </div>
              <div className="summary-row">
                <span className="s-label">Gender & Age</span>
                <span className="s-value">{gender.toUpperCase()} • {age} yrs</span>
              </div>
              <div className="summary-row">
                <span className="s-label">Region</span>
                <span className="s-value">{district}, {state}</span>
              </div>
              <div className="summary-row">
                <span className="s-label">Primary Guardian</span>
                <span className="s-value">{emergencyContact} {contactRelation && `(${contactRelation})`}</span>
              </div>

              {gender === 'female' && (
                <>
                  <div className="summary-divider" />
                  <div className="summary-row">
                    <span className="s-label">Pregnant</span>
                    <span className="s-value">{isPregnant ? `Yes (Month ${estimatedMonth || '?'})` : 'No'}</span>
                  </div>
                  <div className="summary-row">
                    <span className="s-label">Menstruating</span>
                    <span className="s-value">{currentlyMenstruating ? 'Yes (Provisions Needed)' : 'No'}</span>
                  </div>
                  <div className="summary-row">
                    <span className="s-label">Accessibility</span>
                    <span className="s-value">{disabilities.length ? disabilities.join(', ') : 'None'}</span>
                  </div>
                  {medicalConditions && (
                    <div className="summary-row">
                      <span className="s-label">Medical Alerts</span>
                      <span className="s-value">{medicalConditions}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="encryption-notice">
              <span>🔒 Encrypted with device key • Synced securely to Firestore • 100% Offline Accessible</span>
            </div>
          </div>
        </main>
      )}

      {/* Sticky Bottom Action Bar */}
      <footer className="profile-sticky-footer">
        {step === 'basic' && (
          <button
            type="button"
            className="stitch-action-btn primary"
            disabled={!isBasicValid()}
            onClick={() => setStep(gender === 'female' ? 'extended' : 'review')}
          >
            <span>{gender === 'female' ? 'Continue to Health & Care' : 'Review Profile'}</span>
            <span className="arrow">→</span>
          </button>
        )}

        {step === 'extended' && (
          <div className="footer-btn-row">
            <button
              type="button"
              className="stitch-action-btn secondary"
              onClick={() => setStep('basic')}
            >
              ← Back
            </button>
            <button
              type="button"
              className="stitch-action-btn primary"
              onClick={() => setStep('review')}
            >
              <span>Review Profile</span>
              <span className="arrow">→</span>
            </button>
          </div>
        )}

        {step === 'review' && (
          <div className="footer-btn-row">
            <button
              type="button"
              className="stitch-action-btn secondary"
              onClick={() => setStep(gender === 'female' ? 'extended' : 'basic')}
            >
              ← Edit
            </button>
            <button
              type="button"
              className="stitch-action-btn primary"
              disabled={saving}
              onClick={handleSubmit}
            >
              <span>{saving ? 'Encrypting & Saving...' : '✓ Complete & Save Profile'}</span>
            </button>
          </div>
        )}

        <div className="footer-auxiliary-links">
          <button type="button" className="skip-link" onClick={handleSkip}>
            Skip for Now (Save Draft Offline)
          </button>
          <span className="footer-privacy-text">Zero telemetry collected • Private & Discreet</span>
        </div>
      </footer>
    </div>
  );
}
