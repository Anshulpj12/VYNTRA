/**
 * VYNTRA — Provider Information Form Component
 * Form inputs for Service Provider details, operational categories, state and district.
 */

import type { RegistrationInput } from '../registration-service';

interface ProviderInfoFormProps {
  formData: RegistrationInput;
  onChange: (data: Partial<RegistrationInput>) => void;
  errors: Record<string, string>;
}

const INDIAN_STATES = [
  'Madhya Pradesh',
  'Maharashtra',
  'Rajasthan',
  'Delhi',
  'Uttar Pradesh',
  'Gujarat',
  'Karnataka',
  'Tamil Nadu',
];

const DISTRICT_SUGGESTIONS: Record<string, string[]> = {
  'Madhya Pradesh': ['Jabalpur', 'Bhopal', 'Indore', 'Gwalior', 'Ujjain'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer'],
  'Delhi': ['Central Delhi', 'New Delhi', 'South Delhi', 'North Delhi'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Varanasi', 'Noida', 'Agra'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot'],
  'Karnataka': ['Bengaluru Urban', 'Mysuru', 'Hubballi', 'Mangaluru'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli'],
};

export default function ProviderInfoForm({ formData, onChange, errors }: ProviderInfoFormProps) {
  const currentDistricts = DISTRICT_SUGGESTIONS[formData.state] || ['Central District', 'North District', 'South District'];

  return (
    <div>
      {/* Provider Name */}
      <div className="part3-form-group">
        <label htmlFor="provider-name" className="part3-form-label">
          <span>Organization or Dispatch Provider Name</span>
          <span style={{ color: 'var(--color-primary)' }}>*</span>
        </label>
        <input
          id="provider-name"
          type="text"
          className="part3-form-input"
          placeholder="e.g. Mahila Relief Logistics Network"
          value={formData.providerName}
          onChange={(e) => onChange({ providerName: e.target.value })}
        />
        {errors.providerName && <span className="part3-form-hint" style={{ color: 'var(--color-error)' }}>{errors.providerName}</span>}
      </div>

      {/* Depot Address */}
      <div className="part3-form-group">
        <label htmlFor="depot-location" className="part3-form-label">
          <span>Physical Supply Depot / Dispatch Warehouse</span>
          <span style={{ color: 'var(--color-primary)' }}>*</span>
        </label>
        <input
          id="depot-location"
          type="text"
          className="part3-form-input"
          placeholder="e.g. Plot 14, Civil Lines Emergency Logistics Compound"
          value={formData.location}
          onChange={(e) => onChange({ location: e.target.value })}
        />
        {errors.location && <span className="part3-form-hint" style={{ color: 'var(--color-error)' }}>{errors.location}</span>}
      </div>

      {/* State & District Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="part3-form-group">
          <label htmlFor="provider-state" className="part3-form-label">
            <span>State</span>
            <span style={{ color: 'var(--color-primary)' }}>*</span>
          </label>
          <select
            id="provider-state"
            className="part3-form-select"
            value={formData.state}
            onChange={(e) => onChange({ state: e.target.value, district: DISTRICT_SUGGESTIONS[e.target.value]?.[0] || '' })}
          >
            {INDIAN_STATES.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
          {errors.state && <span className="part3-form-hint" style={{ color: 'var(--color-error)' }}>{errors.state}</span>}
        </div>

        <div className="part3-form-group">
          <label htmlFor="provider-district" className="part3-form-label">
            <span>District</span>
            <span style={{ color: 'var(--color-primary)' }}>*</span>
          </label>
          <select
            id="provider-district"
            className="part3-form-select"
            value={formData.district}
            onChange={(e) => onChange({ district: e.target.value })}
          >
            {currentDistricts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {errors.district && <span className="part3-form-hint" style={{ color: 'var(--color-error)' }}>{errors.district}</span>}
        </div>
      </div>
    </div>
  );
}
