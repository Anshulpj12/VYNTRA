/**
 * VYNTRA Part 2 — Shelter Active Orders & Delivery Confirmation Hub
 * 
 * Displays all replenishment orders placed by this shelter with real-time status.
 * Allows shelter staff to confirm received dispatches, automatically updating
 * the shelter's live inventory records and metadata.
 * 
 * @module part2-shelter-provider/inventory/ShelterActiveOrders
 */

import { useState } from 'react';
import type { Order, InventoryItem, ShelterProvider } from '../../shared/types';
import {
  confirmShelterDelivery,
  simulateOrderTransition,
} from './shelter-order-service';

interface ShelterActiveOrdersProps {
  shelter: ShelterProvider;
  orders: Order[];
  currentInventory: InventoryItem[];
  onOrderUpdated: (updatedInventory: InventoryItem[], message: string) => void;
  onRefreshOrders: () => void;
}

export default function ShelterActiveOrders({
  shelter: _shelter,
  orders,
  currentInventory,
  onOrderUpdated,
  onRefreshOrders,
}: ShelterActiveOrdersProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleConfirmDelivery = async (order: Order) => {
    setProcessingId(order.orderId);
    try {
      const result = await confirmShelterDelivery(order, currentInventory);
      const totalUnits = order.items.reduce((sum, i) => sum + i.requestedQuantity, 0);
      const message = `🎉 Delivery for #${order.orderId} Confirmed! ${totalUnits} units (${order.items.map((i) => `${i.requestedQuantity}x ${i.itemName}`).join(', ')}) have been automatically added to your live inventory!`;
      onOrderUpdated(result.updatedInventory, message);
      onRefreshOrders();
    } catch (e) {
      console.error('Error confirming delivery:', e);
    } finally {
      setProcessingId(null);
    }
  };

  const handleSimulateStatus = async (order: Order) => {
    let nextStatus: Order['status'] = 'accepted';
    if (order.status === 'pending') nextStatus = 'accepted';
    else if (order.status === 'accepted') nextStatus = 'dispatched';
    else if (order.status === 'dispatched') nextStatus = 'confirmed';

    if (nextStatus === 'confirmed') {
      await handleConfirmDelivery(order);
    } else {
      await simulateOrderTransition(order.orderId, nextStatus, 'Mahila Emergency Supply Squadron');
      onRefreshOrders();
    }
  };

  if (orders.length === 0) {
    return (
      <div
        className="part2-card"
        style={{
          padding: '32px',
          textAlign: 'center',
          background: 'var(--vyntra-surface)',
          borderRadius: '12px',
          border: '1.5px dashed var(--vyntra-border)',
        }}
      >
        <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>📦</span>
        <h3 className="text-headline-sm" style={{ marginBottom: '4px' }}>
          No Active Replenishment Orders
        </h3>
        <p className="text-muted" style={{ fontSize: '13px', maxWidth: '420px', margin: '0 auto' }}>
          When emergency stock or buffer levels drop, use the "Order Supplies" action to request provisions from regional service providers.
        </p>
      </div>
    );
  }

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return {
          label: '⏳ Pending Provider Claim',
          bg: 'rgba(224, 159, 62, 0.15)',
          color: '#b7791f',
          border: 'rgba(224, 159, 62, 0.4)',
        };
      case 'accepted':
      case 'preparing':
        return {
          label: '📦 Claimed & Preparing at Depot',
          bg: 'rgba(59, 130, 246, 0.15)',
          color: '#2563eb',
          border: 'rgba(59, 130, 246, 0.4)',
        };
      case 'dispatched':
        return {
          label: '🚚 Dispatched / En Route',
          bg: 'rgba(214, 90, 90, 0.18)',
          color: 'var(--vyntra-primary)',
          border: 'rgba(214, 90, 90, 0.4)',
        };
      case 'delivered':
      case 'confirmed':
        return {
          label: '✅ Delivered & Verified',
          bg: 'rgba(56, 102, 65, 0.15)',
          color: 'var(--vyntra-success)',
          border: 'rgba(56, 102, 65, 0.4)',
        };
      default:
        return {
          label: status,
          bg: 'var(--vyntra-surface-variant)',
          color: 'var(--vyntra-on-surface)',
          border: 'var(--vyntra-border)',
        };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {orders.map((order) => {
        const badge = getStatusBadge(order.status);
        const isDispatched = order.status === 'dispatched';
        const isConfirmed = order.status === 'confirmed';

        return (
          <div
            key={order.orderId}
            className="part2-card part2-card--elevated"
            style={{
              padding: '18px 20px',
              borderRadius: '14px',
              background: 'var(--vyntra-surface)',
              border: `1.5px solid ${isDispatched ? 'var(--vyntra-primary)' : 'var(--vyntra-border)'}`,
              boxShadow: isDispatched ? '0 4px 16px rgba(214, 90, 90, 0.12)' : 'none',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '15px', color: 'var(--vyntra-on-surface)' }}>
                    #{order.orderId}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '12px',
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                    }}
                  >
                    {badge.label}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--vyntra-on-surface-muted)', marginTop: '4px' }}>
                  {order.targetMode === 'five-nearest' ? '⚡ Broadcast to 5 Nearest Depots' : '🎯 Targeted Depot Route'}
                  {order.acceptedByProviderId && ` • Assigned Depot: ${order.acceptedByProviderId}`}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {/* Demo status simulation button */}
                {!isConfirmed && (
                  <button
                    type="button"
                    className="part2-btn part2-btn--ghost part2-btn--sm"
                    style={{ fontSize: '11px', padding: '3px 8px', color: 'var(--vyntra-on-surface-muted)' }}
                    onClick={() => handleSimulateStatus(order)}
                    title="Simulate next status transition for local testing"
                  >
                    ⚡ Test Step →
                  </button>
                )}

                {/* Primary Action Button: Confirm Delivery Received */}
                {isDispatched && (
                  <button
                    type="button"
                    className="part2-btn part2-btn--primary part2-btn--sm"
                    style={{
                      background: 'var(--vyntra-success)',
                      borderColor: 'var(--vyntra-success)',
                      padding: '8px 16px',
                      fontWeight: 700,
                      fontSize: '13px',
                      boxShadow: '0 4px 12px rgba(56, 102, 65, 0.25)',
                    }}
                    onClick={() => handleConfirmDelivery(order)}
                    disabled={processingId === order.orderId}
                  >
                    {processingId === order.orderId ? 'Updating Inventory...' : '✅ Confirm Delivery Received'}
                  </button>
                )}
              </div>
            </div>

            {/* Requested Items */}
            <div style={{ background: 'var(--vyntra-surface-variant)', padding: '12px 14px', borderRadius: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--vyntra-on-surface-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Manifest Items ({order.items.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {order.items.map((item, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: 'var(--vyntra-surface)',
                      border: '1px solid var(--vyntra-border)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span style={{ color: 'var(--vyntra-primary)', fontWeight: 800 }}>
                      {item.requestedQuantity}x
                    </span>
                    <span>{item.itemName}</span>
                  </span>
                ))}
              </div>
            </div>

            {isConfirmed && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--vyntra-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>✨</span>
                <span>All delivered quantities were automatically injected into your active shelter inventory.</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
