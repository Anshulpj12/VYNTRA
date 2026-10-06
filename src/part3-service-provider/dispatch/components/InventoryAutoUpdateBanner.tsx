/**
 * VYNTRA — Inventory Auto-Update Banner Component
 * Displays confirmation that delivered supplies have been merged into shelter inventory.
 */

interface InventoryAutoUpdateBannerProps {
  itemsCount: number;
  shelterName: string;
}

export default function InventoryAutoUpdateBanner({
  itemsCount,
  shelterName,
}: InventoryAutoUpdateBannerProps) {
  return (
    <div className="auto-update-banner">
      <span className="auto-update-banner__icon">🔄</span>
      <div className="auto-update-banner__content">
        <h4 className="auto-update-banner__title">Automatic Inventory Sync Completed</h4>
        <p className="auto-update-banner__text">
          {itemsCount} verified supply categories have been automatically synchronized with{' '}
          <strong>{shelterName}</strong>'s live storage. Manual stock re-entry bypassed to eliminate data discrepancies.
        </p>
      </div>
    </div>
  );
}
