/**
 * VYNTRA — Delivery Receipt Card Component
 * Shelter handover receipt detailing items and quantities to be merged into inventory.
 */

import type { Order } from '../../../shared/types';

interface DeliveryReceiptCardProps {
  order: Order;
  confirming: boolean;
  onConfirmReceipt: () => void;
}

export default function DeliveryReceiptCard({
  order,
  confirming,
  onConfirmReceipt,
}: DeliveryReceiptCardProps) {
  const isConfirmed = order.status === 'confirmed';

  return (
    <div className="delivery-receipt">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="part3-badge part3-badge--secondary">VYNTRA RELIEF DISPATCH</span>
          <h3 style={{ margin: '6px 0 2px', fontFamily: 'var(--font-display)', fontSize: '18px' }}>
            Consignment Handover Receipt
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
            Order ID: {order.orderId}
          </span>
        </div>
        {isConfirmed && <div className="delivery-receipt-stamp">DELIVERED & SYNCED</div>}
      </div>

      <div style={{ background: 'var(--color-surface-container-low)', padding: '12px', borderRadius: '8px' }}>
        <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Recipient Shelter:</span>
          <strong>{order.requestingShelterName}</strong>
        </div>
        <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
          <span>Shelter ID:</span>
          <span>{order.requestingShelterId}</span>
        </div>
      </div>

      {/* Item Table */}
      <div>
        <h4 style={{ fontSize: '14px', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Itemized Verified Inventory
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {order.items.map((item, idx) => (
            <div
              key={item.itemName}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                fontSize: '13px',
              }}
            >
              <span>{idx + 1}. {item.itemName}</span>
              <strong>{item.requestedQuantity} Units</strong>
            </div>
          ))}
        </div>
      </div>

      {!isConfirmed && (
        <button
          type="button"
          className="part3-btn part3-btn--primary"
          style={{ width: '100%', minHeight: '56px', fontSize: '15px' }}
          disabled={confirming}
          onClick={onConfirmReceipt}
        >
          {confirming ? (
            <>
              <span className="loading-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
              <span>Confirming & Syncing Inventory...</span>
            </>
          ) : (
            <>
              <span>📦 Confirm Receipt & Auto-Add to Inventory</span>
              <span>→</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
