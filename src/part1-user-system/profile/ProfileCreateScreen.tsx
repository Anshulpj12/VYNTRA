/**
 * VYNTRA — Profile Creation Screen
 * Multi-step form: basic info → extended info (female) → review & submit.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../shared/firebase/config';
import { putItem, STORES, addPendingSync } from '../../shared/utils/offline-cache';
import type { UserProfile } from '../../shared/types';
import { Timestamp } from 'firebase/firestore';
import { getStateList } from '../../shared/constants/state-codes';
import '../styles/profile.css';

const DISABILITY_OPTIONS = ['Mobility', 'Visual', 'Hearing', 'Cognitive', 'None'];

export default function ProfileCreateScreen() {
  const { vyntraUser, isOnline } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'basic' | 'extended' | 'review'>('basic');
  const [saving, setSaving] = useState(false);

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

  // Extended info state (female users)
  const [isPregnant, setIsPregnant] = useState(false);
  const [estimatedMonth, setEstimatedMonth] = useState('');
  const [disabilities, setDisabilities] = useState<string[]>([]);
  const [medicalConditions, setMedicalConditions] = useState('');
  const [currentlyMenstruating, setCurrentlyMenstruating] = useState(false);
  const [specialRequirements, setSpecialRequirements] = useState('');

  const detectLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude.toFixed(6));
          setLng(pos.coords.longitude.toFixed(6));
        },
        () => alert('Could not detect location. Please enter manually.')
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
    const basicFields = [name, gender, age, state, district, homeAddress, lat, lng, emergencyContact];
    const basicFilled = basicFields.filter(Boolean).length;
    const basicTotal = basicFields.length;

    if (gender !== 'female') return Math.round((basicFilled / basicTotal) * 100);

    const extFields = [
      isPregnant ? 'y' : '',
      disabilities.length > 0 ? 'y' : '',
      medicalConditions,
      specialRequirements,
    ];
    const extFilled = extFields.filter(Boolean).length;
    const totalFields = basicTotal + extFields.length;
    return Math.round(((basicFilled + extFilled) / totalFields) * 100);
  };

  const isBasicValid = () => name && gender && age && state && district && homeAddress && emergencyContact;

  const handleSubmit = async () => {
    if (!vyntraUser) return;
    setSaving(true);

    const profile: UserProfile = {
      appId: vyntraUser.appId,
      name,
      gender,
      age: parseInt(age),
      state,
      district,
      homeAddress,
      homeCoordinates: { lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0 },
      emergencyContact,
      profileCompleteness: calculateCompleteness(),
      lastModifiedAt: Timestamp.now(),
      pendingSync: !isOnline,
    };

    if (gender === 'female') {
      profile.pregnancyStatus = { isPregnant, estimatedMonth: estimatedMonth ? parseInt(estimatedMonth) : undefined };
      profile.disabilities = disabilities;
      profile.medicalConditions = medicalConditions;
      profile.currentlyMenstruating = currentlyMenstruating;
      profile.specialRequirements = specialRequirements;
    }

    // Save locally first (offline-first)
    await putItem(STORES.PROFILE, profile);

    if (isOnline) {
      try {
        const profileRef = doc(db, 'users', vyntraUser.appId);
        await setDoc(profileRef, { profile }, { merge: true });
      } catch {
        await addPendingSync({
          type: 'create',
          collection: 'users',
          docId: vyntraUser.appId,
          data: { profile },
        });
      }
    } else {
      await addPendingSync({
        type: 'create',
        collection: 'users',
        docId: vyntraUser.appId,
        data: { profile },
      });
    }

    setSaving(false);
    navigate('/user/home', { replace: true });
  };

  return (
    <div className="profile-create-screen">
      <div className="profile-header">
        <h1 className="profile-title">Create Your Profile</h1>
        <p className="profile-subtitle">
          This information helps us understand your needs during emergencies.
        </p>
        <div className="profile-completeness">
          <div className="profile-completeness__bar">
            <div
              className="profile-completeness__fill"
              style={{ width: `${calculateCompleteness()}%` }}
            />
          </div>
          <span className="profile-completeness__text">{calculateCompleteness()}% Complete</span>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="profile-steps">
        <button
          className={`profile-step ${step === 'basic' ? 'profile-step--active' : ''}`}
          onClick={() => setStep('basic')}
        >
          <span className="profile-step__number">1</span>
          <span className="profile-step__label">Basic Info</span>
        </button>
        {gender === 'female' && (
          <button
            className={`profile-step ${step === 'extended' ? 'profile-step--active' : ''}`}
            onClick={() => isBasicValid() && setStep('extended')}
          >
            <span className="profile-step__number">2</span>
            <span className="profile-step__label">Health Info</span>
          </button>
        )}
        <button
          className={`profile-step ${step === 'review' ? 'profile-step--active' : ''}`}
          onClick={() => isBasicValid() && setStep('review')}
        >
          <span className="profile-step__number">{gender === 'female' ? '3' : '2'}</span>
          <span className="profile-step__label">Review</span>
        </button>
      </div>

      {/* Basic Info Step */}
      {step === 'basic' && (
        <div className="profile-form">
          <div className="form-group">
            <label className="form-label" htmlFor="profile-name">Full Name *</label>
            <input
              id="profile-name"
              className="form-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Gender *</label>
            <div className="form-radio-group">
              {(['female', 'male', 'other', 'prefer-not-to-say'] as const).map((g) => (
                <label key={g} className={`form-radio ${gender === g ? 'form-radio--selected' : ''}`}>
                  <input type="radio" name="gender" value={g} checked={gender === g} onChange={() => setGender(g)} />
                  <span>{g.charAt(0).toUpperCase() + g.slice(1).replace(/-/g, ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="profile-age">Age *</label>
            <input
              id="profile-age"
              className="form-input"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Your age"
              min="10"
              max="120"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="profile-state">State *</label>
              <select
                id="profile-state"
                className="form-select"
                value={state}
                onChange={(e) => setState(e.target.value)}
              >
                <option value="">Select State</option>
                {getStateList().map((s) => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="profile-district">District *</label>
              <input
                id="profile-district"
                className="form-input"
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="District name"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="profile-address">Home Address *</label>
            <textarea
              id="profile-address"
              className="form-textarea"
              value={homeAddress}
              onChange={(e) => setHomeAddress(e.target.value)}
              placeholder="Enter your home address"
              rows={2}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Home Coordinates</label>
            <div className="form-row">
              <input className="form-input" type="text" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude" />
              <input className="form-input" type="text" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude" />
            </div>
            <button className="form-btn-detect" onClick={detectLocation} type="button">
              📍 Auto-detect Location
            </button>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="profile-emergency">Emergency Contact *</label>
            <input
              id="profile-emergency"
              className="form-input"
              type="tel"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="+91 XXXXX XXXXX"
            />
          </div>

          <button
            className="form-btn-primary"
            disabled={!isBasicValid()}
            onClick={() => setStep(gender === 'female' ? 'extended' : 'review')}
          >
            {gender === 'female' ? 'Continue to Health Info →' : 'Review Profile →'}
          </button>
        </div>
      )}

      {/* Extended Info Step (Female Users) */}
      {step === 'extended' && gender === 'female' && (
        <div className="profile-form">
          <div className="form-group">
            <label className="form-label">Pregnancy Status</label>
            <div className="form-radio-group">
              <label className={`form-radio ${isPregnant ? 'form-radio--selected' : ''}`}>
                <input type="radio" checked={isPregnant} onChange={() => setIsPregnant(true)} />
                <span>Currently Pregnant</span>
              </label>
              <label className={`form-radio ${!isPregnant ? 'form-radio--selected' : ''}`}>
                <input type="radio" checked={!isPregnant} onChange={() => setIsPregnant(false)} />
                <span>Not Pregnant</span>
              </label>
            </div>
            {isPregnant && (
              <input
                className="form-input"
                type="number"
                value={estimatedMonth}
                onChange={(e) => setEstimatedMonth(e.target.value)}
                placeholder="Estimated month (1-9)"
                min="1"
                max="9"
                style={{ marginTop: 'var(--space-sm)' }}
              />
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Disabilities</label>
            <div className="form-checkbox-group">
              {DISABILITY_OPTIONS.map((d) => (
                <label key={d} className={`form-checkbox ${disabilities.includes(d) ? 'form-checkbox--selected' : ''}`}>
                  <input type="checkbox" checked={disabilities.includes(d)} onChange={() => toggleDisability(d)} />
                  <span>{d}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="profile-medical">Medical Conditions</label>
            <textarea
              id="profile-medical"
              className="form-textarea"
              value={medicalConditions}
              onChange={(e) => setMedicalConditions(e.target.value)}
              placeholder="Any chronic conditions, allergies, or important health information"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Currently Menstruating?</label>
            <div className="form-radio-group">
              <label className={`form-radio ${currentlyMenstruating ? 'form-radio--selected' : ''}`}>
                <input type="radio" checked={currentlyMenstruating} onChange={() => setCurrentlyMenstruating(true)} />
                <span>Yes</span>
              </label>
              <label className={`form-radio ${!currentlyMenstruating ? 'form-radio--selected' : ''}`}>
                <input type="radio" checked={!currentlyMenstruating} onChange={() => setCurrentlyMenstruating(false)} />
                <span>No</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="profile-special">Special Requirements</label>
            <textarea
              id="profile-special"
              className="form-textarea"
              value={specialRequirements}
              onChange={(e) => setSpecialRequirements(e.target.value)}
              placeholder="Any special needs during emergencies"
              rows={2}
            />
          </div>

          <div className="form-btn-row">
            <button className="form-btn-secondary" onClick={() => setStep('basic')}>← Back</button>
            <button className="form-btn-primary" onClick={() => setStep('review')}>Review Profile →</button>
          </div>
        </div>
      )}

      {/* Review Step */}
      {step === 'review' && (
        <div className="profile-form">
          <div className="profile-review-card">
            <h3 className="profile-review-title">Profile Summary</h3>
            <div className="profile-review-row"><span>Name</span><strong>{name}</strong></div>
            <div className="profile-review-row"><span>Gender</span><strong>{gender}</strong></div>
            <div className="profile-review-row"><span>Age</span><strong>{age}</strong></div>
            <div className="profile-review-row"><span>State</span><strong>{state}</strong></div>
            <div className="profile-review-row"><span>District</span><strong>{district}</strong></div>
            <div className="profile-review-row"><span>Emergency Contact</span><strong>{emergencyContact}</strong></div>
            {gender === 'female' && (
              <>
                <div className="profile-review-divider" />
                <div className="profile-review-row"><span>Pregnant</span><strong>{isPregnant ? `Yes (Month ${estimatedMonth || '?'})` : 'No'}</strong></div>
                <div className="profile-review-row"><span>Disabilities</span><strong>{disabilities.join(', ') || 'None specified'}</strong></div>
                <div className="profile-review-row"><span>Menstruating</span><strong>{currentlyMenstruating ? 'Yes' : 'No'}</strong></div>
              </>
            )}
          </div>

          {!isOnline && (
            <div className="login-offline-banner" style={{ marginBottom: 'var(--space-md)' }}>
              <span>📱</span>
              <p>Profile will be saved locally and synced when online.</p>
            </div>
          )}

          <div className="form-btn-row">
            <button className="form-btn-secondary" onClick={() => setStep(gender === 'female' ? 'extended' : 'basic')}>← Edit</button>
            <button className="form-btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : '✓ Save Profile'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
