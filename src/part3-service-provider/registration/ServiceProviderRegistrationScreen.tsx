/**
 * VYNTRA — Service Provider Registration Screen
 * Module A — First-Time Provider Onboarding & GPS Hub Setup.
 * Design: Serene Sanctuary (Tactile Bento Cards, Min 48px touch targets, warm rose-coral & spruce).
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../part1-user-system/auth/AuthContext';
import { registerServiceProvider, type RegistrationInput } from './registration-service';
import ProviderInfoForm from './components/ProviderInfoForm';
import LocationPicker from './components/LocationPicker';
import '../styles/part3-base.css';
import '../styles/registration.css';

export default function ServiceProviderRegistrationScreen() {
  const navigate = useNavigate();
  const { user, vyntraUser } = useAuth();

  const [formData, setFormData] = useState<RegistrationInput>({
    providerName: '',
    location: '',
    state: 'Madhya Pradesh',
    district: 'Jabalpur',
    coordinates: { lat: 23.1685, lng: 79.9338 },
    providerGoogleUid: user?.uid || vyntraUser?.googleUid || 'guest-provider-uid',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleFieldChange = (partial: Partial<RegistrationInput>) => {
    setFormData((prev) => ({ ...prev, ...partial }));
    setErrors({});
    setGeneralError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setGeneralError(null);

    try {
      const res = await registerServiceProvider(formData);
      if (res.success && res.provider) {
        // Navigate directly to Service Provider Dashboard
        navigate('/service/dashboard', { replace: true });
      } else {
        setGeneralError(res.error || 'Failed to complete registration. Please check all fields.');
      }
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="part3-container">
      {/* Top Header */}
      <header className="part3-top-header">
        <div className="part3-top-header__left">
          <button
            type="button"
            className="part3-back-btn"
            onClick={() => navigate('/auth/role-select')}
            title="Back to Role Select"
          >
            ←
          </button>
          <div className="part3-top-header__title-group">
            <h1 className="part3-top-header__title">Provider Onboarding</h1>
            <span className="part3-top-header__subtitle">Resource Supply & Emergency Dispatch</span>
          </div>
        </div>
        <span className="part3-badge part3-badge--warning">🚚 Supply Hub</span>
      </header>

      <main className="svc-registration-screen">
        {/* Hero Section */}
        <div className="svc-registration-hero">
          <div className="svc-registration-hero__icon">📦</div>
          <h2 className="svc-registration-hero__title">Register Dispatch Hub</h2>
          <p className="svc-registration-hero__subtitle">
            Connect your relief supplies to emergency women shelters. Receive replenishment orders and broadcast availability within regional radii.
          </p>
        </div>

        {generalError && (
          <div className="part3-error-alert">
            <span>⚠️</span>
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Main Provider Form Card */}
          <div className="part3-card" style={{ marginBottom: '18px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0', fontFamily: 'var(--font-display)' }}>
              1. Organization & Contact
            </h3>
            <ProviderInfoForm
              formData={formData}
              onChange={handleFieldChange}
              errors={errors}
            />
          </div>

          {/* Location & GPS Card */}
          <div className="part3-card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0', fontFamily: 'var(--font-display)' }}>
              2. Depot Location & Coordinates
            </h3>
            <LocationPicker
              coordinates={formData.coordinates}
              onChange={(coords) => handleFieldChange({ coordinates: coords })}
              error={errors.coordinates}
            />
          </div>

          {/* Action CTA */}
          <button
            type="submit"
            className="part3-btn part3-btn--primary"
            style={{ width: '100%', minHeight: '56px', fontSize: '16px' }}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="loading-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
                <span>Activating Dispatch Hub...</span>
              </>
            ) : (
              <>
                <span>Complete Registration & Open Dashboard</span>
                <span>→</span>
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
