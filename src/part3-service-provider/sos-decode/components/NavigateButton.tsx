/**
 * VYNTRA — Tactical Navigation Button Component
 * 64px high tactile button that opens turn-by-turn navigation directly to the woman's coordinates.
 */

import { launchNavigation } from '../navigation-launcher';

interface NavigateButtonProps {
  lat: number;
  lng: number;
}

export default function NavigateButton({ lat, lng }: NavigateButtonProps) {
  const handleLaunch = () => {
    launchNavigation(lat, lng);
  };

  return (
    <button
      type="button"
      className="sos-launch-nav-btn"
      onClick={handleLaunch}
      aria-label="Launch Google Maps Navigation"
    >
      <span style={{ fontSize: '22px' }}>🧭</span>
      <span>Launch Google Maps Navigation</span>
      <span style={{ fontSize: '20px' }}>→</span>
    </button>
  );
}
