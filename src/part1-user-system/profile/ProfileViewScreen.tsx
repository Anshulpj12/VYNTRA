/**
 * VYNTRA — Profile View & Edit Screen
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getItem, STORES } from '../../shared/utils/offline-cache';
import type { UserProfile } from '../../shared/types';
import { useNavigate } from 'react-router-dom';
import '../styles/profile.css';

export default function ProfileViewScreen() {
  const { vyntraUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!vyntraUser) return;
      const cached = await getItem<UserProfile>(STORES.PROFILE, vyntraUser.appId);
      if (cached) setProfile(cached);
      setLoading(false);
    };
    load();
  }, [vyntraUser]);

  if (loading) return <div className="loading-screen"><div className="loading-spinner" /></div>;
  if (!profile) return (
    <div className="profile-empty">
      <h2>No Profile Found</h2>
      <p>Create your profile to get started.</p>
      <button className="form-btn-primary" onClick={() => navigate('/user/profile/create')}>
        Create Profile
      </button>
    </div>
  );

  return (
    <div className="profile-view-screen">
      <div className="profile-view-header">
        <div className="profile-view-avatar">
          <span>{profile.name.charAt(0).toUpperCase()}</span>
        </div>
        <h1 className="profile-view-name">{profile.name}</h1>
        <p className="profile-view-id">{vyntraUser?.appId}</p>
        <div className="profile-completeness" style={{ marginTop: 'var(--space-sm)' }}>
          <div className="profile-completeness__bar">
            <div className="profile-completeness__fill" style={{ width: `${profile.profileCompleteness}%` }} />
          </div>
          <span className="profile-completeness__text">{profile.profileCompleteness}% Complete</span>
        </div>
        {profile.pendingSync && (
          <div className="profile-sync-badge">⏳ Pending sync</div>
        )}
      </div>

      <div className="profile-view-section">
        <h3 className="profile-view-section-title">Basic Information</h3>
        <div className="profile-view-item"><span>Gender</span><strong>{profile.gender}</strong></div>
        <div className="profile-view-item"><span>Age</span><strong>{profile.age}</strong></div>
        <div className="profile-view-item"><span>State</span><strong>{profile.state}</strong></div>
        <div className="profile-view-item"><span>District</span><strong>{profile.district}</strong></div>
        <div className="profile-view-item"><span>Address</span><strong>{profile.homeAddress}</strong></div>
        <div className="profile-view-item"><span>Coordinates</span><strong>{profile.homeCoordinates.lat}, {profile.homeCoordinates.lng}</strong></div>
        <div className="profile-view-item"><span>Emergency Contact</span><strong>{profile.emergencyContact}</strong></div>
      </div>

      {profile.gender === 'female' && (
        <div className="profile-view-section">
          <h3 className="profile-view-section-title">Health Information</h3>
          <div className="profile-view-item">
            <span>Pregnancy</span>
            <strong>{profile.pregnancyStatus?.isPregnant ? `Yes (Month ${profile.pregnancyStatus.estimatedMonth || '?'})` : 'No'}</strong>
          </div>
          <div className="profile-view-item"><span>Disabilities</span><strong>{profile.disabilities?.join(', ') || 'None'}</strong></div>
          <div className="profile-view-item"><span>Medical Conditions</span><strong>{profile.medicalConditions || 'None specified'}</strong></div>
          <div className="profile-view-item"><span>Menstruating</span><strong>{profile.currentlyMenstruating ? 'Yes' : 'No'}</strong></div>
          {profile.specialRequirements && (
            <div className="profile-view-item"><span>Special Requirements</span><strong>{profile.specialRequirements}</strong></div>
          )}
        </div>
      )}

      <div className="profile-view-actions">
        <button className="form-btn-primary" onClick={() => navigate('/user/profile/create')}>Edit Profile</button>
        <button className="form-btn-secondary" onClick={() => navigate('/user/home')}>← Back to Home</button>
      </div>
    </div>
  );
}
