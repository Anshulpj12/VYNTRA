/**
 * VYNTRA — Dispatch Enforcement Button Component
 * Strictly locks dispatch until all items are 100% checked and verified.
 */

interface DispatchButtonProps {
  isFullyPrepared: boolean;
  submitting: boolean;
  onDispatch: () => void;
}

export default function DispatchButton({
  isFullyPrepared,
  submitting,
  onDispatch,
}: DispatchButtonProps) {
  return (
    <div className="dispatch-gate-card">
      <p className={`dispatch-gate-message ${isFullyPrepared ? 'unlocked' : ''}`}>
        {isFullyPrepared
          ? '✓ 100% Item Verification Complete — Dispatch Safety Gate Unlocked'
          : '🔒 Dispatch Safety Gate Active: All requested items must be verified before dispatch'}
      </p>

      <button
        type="button"
        className={`part3-btn ${isFullyPrepared ? 'part3-btn--primary' : 'part3-btn--outline'}`}
        style={{ width: '100%', minHeight: '56px', fontSize: '16px' }}
        disabled={!isFullyPrepared || submitting}
        onClick={onDispatch}
      >
        {submitting ? (
          <>
            <span className="loading-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
            <span>Authorizing En-Route Dispatch...</span>
          </>
        ) : isFullyPrepared ? (
          <>
            <span>🚚 Confirm & Dispatch Relief Supplies</span>
            <span>→</span>
          </>
        ) : (
          <>
            <span>Complete Checklist to Unlock Dispatch</span>
            <span>🔒</span>
          </>
        )}
      </button>
    </div>
  );
}
