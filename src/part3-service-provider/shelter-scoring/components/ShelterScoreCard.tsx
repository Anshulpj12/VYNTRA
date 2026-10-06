/**
 * VYNTRA — Shelter Score Card Component
 * Displays readiness score gauge, tier badge, and component factors.
 */

import { type ScoreBreakdown } from '../score-calculator';

interface ShelterScoreCardProps {
  scoreData: ScoreBreakdown;
  shelterName?: string;
}

export default function ShelterScoreCard({
  scoreData,
  shelterName,
}: ShelterScoreCardProps) {
  const circleClass =
    scoreData.totalScore >= 80
      ? 'scoring-circle--high'
      : scoreData.totalScore >= 50
      ? 'scoring-circle--medium'
      : 'scoring-circle--low';

  const badgeType =
    scoreData.totalScore >= 80
      ? 'part3-badge--success'
      : scoreData.totalScore >= 50
      ? 'part3-badge--warning'
      : 'part3-badge--danger';

  return (
    <div className="scoring-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="scoring-title">
          {shelterName ? `${shelterName} Readiness` : 'Emergency Readiness Index'}
        </h3>
        <span className={`part3-badge ${badgeType}`}>
          {scoreData.ratingTier.toUpperCase()}
        </span>
      </div>

      <div className="scoring-gauge-container">
        <div className={`scoring-circle ${circleClass}`}>
          <span className="scoring-number">{scoreData.totalScore}</span>
          <span className="scoring-max">/ 100</span>
        </div>

        <div className="scoring-info">
          <strong style={{ fontSize: '15px' }}>
            {scoreData.totalScore >= 80
              ? '🛡️ Fully Ready for Displacement Influx'
              : scoreData.totalScore >= 50
              ? '⚠️ Operational with Resource Constraints'
              : '🚨 Critical Shortages — Restock Urgently Required'}
          </strong>
          <p className="scoring-desc">
            Calculated across live bed occupancy, women's sanitation capacity, hygiene reserves, and mobility access.
          </p>
        </div>
      </div>

      {/* Breakdown Factors */}
      <div className="scoring-breakdown">
        {/* Beds */}
        <div className="scoring-factor-row">
          <div className="scoring-factor-header">
            <span>Bed Capacity & Intake Space</span>
            <strong>{scoreData.availableBedsScore} / 25 pts</strong>
          </div>
          <div className="scoring-factor-bar">
            <div
              className="scoring-factor-fill"
              style={{ width: `${(scoreData.availableBedsScore / 25) * 100}%` }}
            />
          </div>
        </div>

        {/* Sanitation */}
        <div className="scoring-factor-row">
          <div className="scoring-factor-header">
            <span>Women Sanitation Facilities</span>
            <strong>{scoreData.womenSanitationScore} / 20 pts</strong>
          </div>
          <div className="scoring-factor-bar">
            <div
              className="scoring-factor-fill"
              style={{ width: `${(scoreData.womenSanitationScore / 20) * 100}%` }}
            />
          </div>
        </div>

        {/* Hygiene */}
        <div className="scoring-factor-row">
          <div className="scoring-factor-header">
            <span>Sanitary Pads & Hygiene Reserve</span>
            <strong>{scoreData.hygieneResourcesScore} / 20 pts</strong>
          </div>
          <div className="scoring-factor-bar">
            <div
              className="scoring-factor-fill"
              style={{ width: `${(scoreData.hygieneResourcesScore / 20) * 100}%` }}
            />
          </div>
        </div>

        {/* Healthcare */}
        <div className="scoring-factor-row">
          <div className="scoring-factor-header">
            <span>Medical & Healthcare Support</span>
            <strong>{scoreData.healthcareScore} / 15 pts</strong>
          </div>
          <div className="scoring-factor-bar">
            <div
              className="scoring-factor-fill"
              style={{ width: `${(scoreData.healthcareScore / 15) * 100}%` }}
            />
          </div>
        </div>

        {/* Mobility */}
        <div className="scoring-factor-row">
          <div className="scoring-factor-header">
            <span>Wheelchair & Mobility Access</span>
            <strong>{scoreData.mobilityScore} / 10 pts</strong>
          </div>
          <div className="scoring-factor-bar">
            <div
              className="scoring-factor-fill"
              style={{ width: `${(scoreData.mobilityScore / 10) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
