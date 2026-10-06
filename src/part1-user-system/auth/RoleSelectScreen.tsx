/**
 * VYNTRA — Role Selection Screen
 * User selects: User, Shelter Provider, or Service Provider.
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import '../styles/auth.css';

const roles = [
  {
    id: 'user',
    title: 'I Need Help',
    subtitle: 'User',
    description: 'Access emergency SOS, find nearby shelters, communicate with your district, and manage your personal health records.',
    icon: '👤',
    route: '/user/profile/create',
    color: 'var(--color-primary)',
  },
  {
    id: 'shelter-provider',
    title: 'I Provide Shelter',
    subtitle: 'Women Shelter / Space Provider',
    description: 'Register and manage your shelter — beds, facilities, inventory, and occupant admission through a professional dashboard.',
    icon: '🏠',
    route: '/shelter/register',
    color: 'var(--color-tertiary)',
  },
  {
    id: 'service-provider',
    title: 'I Supply Resources',
    subtitle: 'Service Provider',
    description: 'Receive and fulfill resource orders from shelters — manage dispatch, delivery, and supply logistics.',
    icon: '📦',
    route: '/service/register',
    color: 'var(--color-secondary)',
  },
];

export default function RoleSelectScreen() {
  const navigate = useNavigate();
  const { vyntraUser } = useAuth();

  return (
    <div className="role-screen">
      <div className="role-header">
        <h1 className="role-title">Welcome to VYNTRA</h1>
        {vyntraUser && (
          <p className="role-app-id">Your ID: <strong>{vyntraUser.appId}</strong></p>
        )}
        <p className="role-subtitle">How would you like to use the platform?</p>
      </div>

      <div className="role-cards">
        {roles.map((role) => (
          <button
            key={role.id}
            className="role-card"
            onClick={() => navigate(role.route)}
            style={{ '--role-accent': role.color } as React.CSSProperties}
          >
            <div className="role-card__icon-container">
              <span className="role-card__icon">{role.icon}</span>
            </div>
            <div className="role-card__content">
              <h2 className="role-card__title">{role.title}</h2>
              <p className="role-card__subtitle">{role.subtitle}</p>
              <p className="role-card__description">{role.description}</p>
            </div>
            <div className="role-card__arrow">→</div>
          </button>
        ))}
      </div>
    </div>
  );
}
