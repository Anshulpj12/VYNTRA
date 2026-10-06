/**
 * VYNTRA — Dashboard Overview Component
 * Tactile Bento metric cards displaying pending queue, in-transit, shortages, and completed deliveries.
 */

import type { DashboardMetrics } from '../dashboard-service';

interface DashboardOverviewProps {
  metrics: DashboardMetrics;
  onNavigateTab?: (tab: string) => void;
}

export default function DashboardOverview({ metrics, onNavigateTab }: DashboardOverviewProps) {
  return (
    <div className="svc-bento-grid">
      {/* Tile 1: Pending Queue */}
      <div
        className="svc-bento-card svc-bento-card--urgent"
        onClick={() => onNavigateTab && onNavigateTab('incoming')}
        style={{ cursor: 'pointer' }}
      >
        <span className="svc-bento-card__num">
          {metrics.pendingCount < 10 ? `0${metrics.pendingCount}` : metrics.pendingCount}
        </span>
        <span className="svc-bento-card__label">Pending Orders</span>
      </div>

      {/* Tile 2: In-Transit / Preparing */}
      <div
        className="svc-bento-card svc-bento-card--transit"
        onClick={() => onNavigateTab && onNavigateTab('active')}
        style={{ cursor: 'pointer' }}
      >
        <span className="svc-bento-card__num">
          {metrics.inTransitCount < 10 ? `0${metrics.inTransitCount}` : metrics.inTransitCount}
        </span>
        <span className="svc-bento-card__label">Active Dispatches</span>
      </div>

      {/* Tile 3: Critical Depletions */}
      <div
        className="svc-bento-card svc-bento-card--shortage"
        onClick={() => onNavigateTab && onNavigateTab('depletions')}
        style={{ cursor: 'pointer' }}
      >
        <span className="svc-bento-card__num">
          {metrics.criticalShortagesCount < 10
            ? `0${metrics.criticalShortagesCount}`
            : metrics.criticalShortagesCount}
        </span>
        <span className="svc-bento-card__label">Shelter Shortages</span>
      </div>
    </div>
  );
}
