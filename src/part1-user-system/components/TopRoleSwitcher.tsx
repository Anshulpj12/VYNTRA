/**
 * VYNTRA — Top Role Switcher Header Bar
 * 
 * Persistent navigation header mounted at the top of the application shell.
 * Enables users to effortlessly switch roles from above across all screens,
 * automatically loading and preserving their saved profile/shelter/service data
 * without having to re-enter details.
 * 
 * @module part1-user-system/components/TopRoleSwitcher
 */

import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth, type UserRole } from '../auth/AuthContext';
import '../styles/top-role-switcher.css';

interface RoleButtonConfig {
  role: UserRole;
  icon: string;
  shortLabel: string;
  hasData: boolean;
  activePath: string;
  setupPath: string;
  classModifier: string;
}

export default function TopRoleSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    vyntraUser,
    activeRole,
    roleData,
    setActiveRole,
    signOut,
    isOnline,
  } = useAuth();
  const [switchingRole, setSwitchingRole] = useState<UserRole | null>(null);

  // Hide on login screen or if no user is signed in
  if (!vyntraUser || location.pathname.startsWith('/auth/login')) {
    return null;
  }

  const displayName = user?.displayName || user?.email?.split('@')[0] || vyntraUser.appId.slice(-6);
  const userPhoto = user?.photoURL;

  const roleConfigs: RoleButtonConfig[] = [
    {
      role: 'user',
      icon: '🆘',
      shortLabel: 'User',
      hasData: Boolean(roleData.userProfile),
      activePath: '/user/home',
      setupPath: '/user/profile/create',
      classModifier: 'user',
    },
    {
      role: 'shelter-provider',
      icon: '🏡',
      shortLabel: 'Shelter',
      hasData: Boolean(roleData.shelterProvider),
      activePath: '/shelter/dashboard',
      setupPath: '/shelter/register',
      classModifier: 'shelter',
    },
    {
      role: 'service-provider',
      icon: '🚚',
      shortLabel: 'Supply',
      hasData: Boolean(roleData.serviceProvider),
      activePath: '/service/dashboard',
      setupPath: '/service/register',
      classModifier: 'service',
    },
  ];

  const handleRoleClick = async (config: RoleButtonConfig) => {
    if (switchingRole) return;

    if (config.role === activeRole) {
      // Already in this role — navigate to main screen if not already there
      const target = config.hasData ? config.activePath : config.setupPath;
      if (location.pathname !== target) {
        navigate(target);
      }
      return;
    }

    setSwitchingRole(config.role);
    try {
      await setActiveRole(config.role);
      // Navigate to existing dashboard if data exists, otherwise setup screen
      const target = config.hasData ? config.activePath : config.setupPath;
      navigate(target);
    } catch (err) {
      console.warn('[VYNTRA] Top bar role switch error:', err);
    } finally {
      setSwitchingRole(null);
    }
  };

  const currentRoleConfig = roleConfigs.find((r) => r.role === activeRole);

  return (
    <header className="vyntra-top-role-bar" role="banner" id="vyntra-top-role-bar">
      {/* ─── Left: Brand & Active Role ─── */}
      <div className="top-role-bar__brand-group">
        <Link to="/" className="top-role-bar__logo" title="VYNTRA Safety Home">
          <span className="top-role-bar__logo-icon">🛡️</span>
          <span>VYNTRA</span>
        </Link>

        {currentRoleConfig && (
          <span
            className={`top-role-bar__current-role-pill top-role-bar__current-role-pill--${currentRoleConfig.classModifier}`}
            title={`Active Operational Mode: ${currentRoleConfig.shortLabel}`}
          >
            {currentRoleConfig.icon} {currentRoleConfig.shortLabel}
          </span>
        )}
      </div>

      {/* ─── Center: Quick Role Switcher Pills ─── */}
      <nav className="top-role-bar__switcher" aria-label="Role Switcher">
        {roleConfigs.map((cfg) => {
          const isActive = cfg.role === activeRole;
          const isPending = switchingRole === cfg.role;

          return (
            <button
              key={cfg.role}
              type="button"
              className={`top-role-bar__role-btn ${isActive ? `top-role-bar__role-btn--active top-role-bar__role-btn--${cfg.classModifier}` : ''}`}
              onClick={() => handleRoleClick(cfg)}
              disabled={isPending}
              title={`Switch to ${cfg.shortLabel} mode ${cfg.hasData ? '(Data Ready)' : '(Setup)'}`}
            >
              <span>{isPending ? '⏳' : cfg.icon}</span>
              <span className="role-title">{cfg.shortLabel}</span>
              <span
                className={`top-role-bar__role-badge ${cfg.hasData ? 'top-role-bar__role-badge--ready' : 'top-role-bar__role-badge--new'}`}
              >
                {cfg.hasData ? '✓' : '+'}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ─── Right: All Roles Directory, User Profile & Status ─── */}
      <div className="top-role-bar__actions">
        {/* Full Bento role select directory link */}
        <button
          type="button"
          className="top-role-bar__all-roles-btn"
          onClick={() => navigate('/auth/role-select')}
          title="Open Role Selection & Profile Overview"
        >
          <span>🎛️</span>
          <span>All Roles</span>
        </button>

        {/* User Identity Chip */}
        <div className="top-role-bar__user-chip" title={`Signed in as ${displayName}`}>
          <div className="top-role-bar__avatar">
            {userPhoto ? (
              <img
                src={userPhoto}
                alt={displayName}
                className="top-role-bar__avatar-img"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span>{displayName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <span className="top-role-bar__user-name">{displayName}</span>
          <button
            type="button"
            className="top-role-bar__logout-btn"
            onClick={signOut}
            title="Sign Out"
          >
            Exit
          </button>
        </div>

        {/* Connectivity Dot */}
        <span
          className={`top-role-bar__status-dot ${isOnline ? '' : 'top-role-bar__status-dot--offline'}`}
          title={isOnline ? 'Network Synced & Online' : 'Offline — Local Storage Active'}
        />
      </div>
    </header>
  );
}
