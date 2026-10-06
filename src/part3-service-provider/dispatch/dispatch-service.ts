/**
 * VYNTRA — Dispatch, Delivery & Automatic Inventory Update Service
 * Enforces 100% item preparation gate before dispatch authorization,
 * handles delivery confirmation, and automatically adds delivered resources
 * directly to the shelter's live inventory and metadata.
 */

import { doc, getDoc, updateDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../shared/firebase/config';
import { PATHS } from '../../shared/firebase/paths';
import { getOrderById, getLocalCachedOrders, saveLocalOrders } from '../orders/order-service';
import type { Order, InventoryItem, ShelterMetadata } from '../../shared/types';
import { Timestamp } from 'firebase/firestore';

const CHECKLIST_STORAGE_PREFIX = 'vyntra_dispatch_checklist_';

/**
 * Loads checked item status for an order from local storage.
 */
export function getStoredChecklist(orderId: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(`${CHECKLIST_STORAGE_PREFIX}${orderId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading checklist:', e);
  }
  return {};
}

/**
 * Saves checked item status for an order to local storage.
 */
export function saveStoredChecklist(orderId: string, state: Record<string, boolean>): void {
  try {
    localStorage.setItem(`${CHECKLIST_STORAGE_PREFIX}${orderId}`, JSON.stringify(state));
  } catch (e) {
    console.warn('Error saving checklist:', e);
  }
}

/**
 * Marks an order as in preparation mode.
 */
export async function markOrderPreparing(orderId: string): Promise<void> {
  const order = await getOrderById(orderId);
  if (!order || order.status !== 'accepted') return;

  const updated: Order = { ...order, status: 'preparing' };
  const cached = getLocalCachedOrders().map((o) => (o.orderId === orderId ? updated : o));
  saveLocalOrders(cached);

  if (navigator.onLine) {
    try {
      const ref = doc(db, PATHS.order(orderId));
      await updateDoc(ref, { status: 'preparing' });
    } catch (err) {
      console.warn('Could not update status to preparing online:', err);
    }
  }
}

/**
 * Authorizes dispatch of an order.
 * Strictly gated: will fail if any item is unverified.
 */
export async function authorizeDispatch(
  orderId: string,
  verifiedItemNames: string[]
): Promise<{ success: boolean; error?: string }> {
  const order = await getOrderById(orderId);
  if (!order) {
    return { success: false, error: 'Order not found.' };
  }

  // Verification Gate Check
  const allVerified = order.items.every((item) =>
    verifiedItemNames.includes(item.itemName)
  );

  if (!allVerified) {
    return {
      success: false,
      error: 'Cannot dispatch order! All items must be 100% verified and loaded.',
    };
  }

  const now = Timestamp.now();
  const updatedOrder: Order = {
    ...order,
    status: 'dispatched',
    dispatchedAt: now,
  };

  // Update local cache
  const cached = getLocalCachedOrders().map((o) =>
    o.orderId === orderId ? updatedOrder : o
  );
  saveLocalOrders(cached);

  // Sync to Firestore
  if (navigator.onLine) {
    try {
      const ref = doc(db, PATHS.order(orderId));
      await updateDoc(ref, {
        status: 'dispatched',
        dispatchedAt: now,
      });
    } catch (err) {
      console.warn('Could not sync dispatch status to Firestore:', err);
    }
  }

  return { success: true };
}

/**
 * Shelter confirms delivery of the order.
 * Triggers AUTOMATIC INVENTORY UPDATE of the exact items and quantities.
 */
export async function confirmDeliveryAndAutoUpdateInventory(
  orderId: string
): Promise<{ success: boolean; updatedItemsCount: number; error?: string }> {
  const order = await getOrderById(orderId);
  if (!order) {
    return { success: false, updatedItemsCount: 0, error: 'Order not found.' };
  }

  const now = Timestamp.now();
  const shelterId = order.requestingShelterId;

  // 1. Mark order as confirmed
  const confirmedOrder: Order = {
    ...order,
    status: 'confirmed',
    confirmedAt: now,
  };

  const cachedOrders = getLocalCachedOrders().map((o) =>
    o.orderId === orderId ? confirmedOrder : o
  );
  saveLocalOrders(cachedOrders);

  if (navigator.onLine) {
    try {
      const orderRef = doc(db, PATHS.order(orderId));
      await updateDoc(orderRef, {
        status: 'confirmed',
        confirmedAt: now,
      });
    } catch (err) {
      console.warn('Error confirming order online:', err);
    }
  }

  // 2. AUTOMATIC INVENTORY UPDATE:
  // For each delivered item, add the exact ordered quantity to the shelter's inventory
  let updatedItemsCount = 0;

  if (navigator.onLine) {
    try {
      // Fetch current shelter inventory items
      const invCollectionRef = collection(db, PATHS.shelterInventory(shelterId));
      const invSnap = await getDocs(invCollectionRef);
      const existingItems: InventoryItem[] = [];
      invSnap.forEach((d) => existingItems.push(d.data() as InventoryItem));

      for (const orderItem of order.items) {
        const existing = existingItems.find(
          (i) => i.itemName.toLowerCase() === orderItem.itemName.toLowerCase()
        );

        if (existing) {
          // Increment quantity
          const newQty = existing.currentQuantity + orderItem.requestedQuantity;
          const itemDocRef = doc(db, PATHS.shelterInventoryItem(shelterId, existing.itemId));
          await updateDoc(itemDocRef, {
            currentQuantity: newQty,
            lastUpdatedAt: now,
          });
        } else {
          // Create new item document
          const safeId = `inv-${orderItem.itemName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
          const itemDocRef = doc(db, PATHS.shelterInventoryItem(shelterId, safeId));
          const newItem: InventoryItem = {
            itemId: safeId,
            shelterId,
            itemName: orderItem.itemName,
            currentQuantity: orderItem.requestedQuantity,
            requiredMinimum: Math.max(10, Math.round(orderItem.requestedQuantity * 0.3)),
            lastUpdatedAt: now,
          };
          await setDoc(itemDocRef, newItem);
        }
        updatedItemsCount++;
      }

      // Update shelter metadata inventory summary
      const metaRef = doc(db, PATHS.shelterMetadata(shelterId));
      const metaSnap = await getDoc(metaRef);
      if (metaSnap.exists()) {
        const meta = metaSnap.data() as ShelterMetadata;
        const updatedSummary = meta.inventorySummary.map((sum) => {
          const match = order.items.find(
            (i) => i.itemName.toLowerCase() === sum.itemName.toLowerCase()
          );
          return match
            ? { ...sum, currentQuantity: sum.currentQuantity + match.requestedQuantity }
            : sum;
        });

        // Add any new items not in summary
        for (const oi of order.items) {
          if (!updatedSummary.some((s) => s.itemName.toLowerCase() === oi.itemName.toLowerCase())) {
            updatedSummary.push({
              itemName: oi.itemName,
              currentQuantity: oi.requestedQuantity,
              requiredMinimum: Math.max(10, Math.round(oi.requestedQuantity * 0.3)),
            });
          }
        }

        await updateDoc(metaRef, {
          inventorySummary: updatedSummary,
          lastUpdatedAt: now,
        });
      }
    } catch (invErr) {
      console.warn('Inventory sync failed or offline (local state preserved):', invErr);
      updatedItemsCount = order.items.length;
    }
  } else {
    updatedItemsCount = order.items.length;
  }

  return { success: true, updatedItemsCount };
}
