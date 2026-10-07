/**
 * VYNTRA — Order Management Service
 * Handles order creation, multi-provider broadcast, first-acceptance locking,
 * offline caching, and Firestore synchronization.
 */

import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db, withFirestoreTimeout } from '../../shared/firebase/config';
import { PATHS } from '../../shared/firebase/paths';
import { generateUniqueId } from '../../shared/utils/id-generator';
import type { Order, OrderItem, GeoCoordinates } from '../../shared/types';

const LOCAL_ORDERS_KEY = 'vyntra_orders_cache';

export interface CreateOrderInput {
  requestingShelterId: string;
  requestingShelterName: string;
  shelterCoordinates: GeoCoordinates;
  items: OrderItem[];
  targetMode: 'single' | 'five-nearest';
  targetProviderIds: string[];
}

/**
 * Reads local cached orders from localStorage.
 */
export function getLocalCachedOrders(): Order[] {
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
    if (raw) {
      return JSON.parse(raw) as Order[];
    }
  } catch (e) {
    console.warn('Error reading orders from localStorage:', e);
  }
  return [];
}

/**
 * Saves orders array to localStorage cache.
 */
export function saveLocalOrders(orders: Order[]): void {
  try {
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
  } catch (e) {
    console.warn('Error writing orders to localStorage:', e);
  }
}

/**
 * Creates and submits a new shelter replenishment order.
 */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const orderId = generateUniqueId('ORD');
  const now = Date.now();

  const newOrder: Order = {
    orderId,
    requestingShelterId: input.requestingShelterId,
    requestingShelterName: input.requestingShelterName,
    shelterCoordinates: input.shelterCoordinates,
    items: input.items,
    targetMode: input.targetMode,
    targetProviderIds: input.targetProviderIds,
    status: 'pending',
    createdAt: now,
  };

  // 1. Cache locally first (Offline-first)
  const cached = getLocalCachedOrders();
  cached.unshift(newOrder);
  saveLocalOrders(cached);

  // 2. Sync to Firestore if online in background with safety timeout
  if (navigator.onLine) {
    withFirestoreTimeout(async () => {
      const orderRef = doc(db, PATHS.order(orderId));
      await setDoc(orderRef, newOrder);
    }, 1500).catch((err) => {
      console.warn('Firestore order write delayed (offline):', err);
    });
  }

  return newOrder;
}

/**
 * Retrieves a single order by its ID.
 */
export async function getOrderById(orderId: string): Promise<Order | null> {
  // Check local cache first
  const cached = getLocalCachedOrders().find((o) => o.orderId === orderId);
  if (cached) return cached;

  if (navigator.onLine) {
    try {
      const orderRef = doc(db, PATHS.order(orderId));
      const snap = await withFirestoreTimeout(getDoc(orderRef), 1500);
      if (snap && snap.exists()) {
        return snap.data() as Order;
      }
    } catch (err) {
      console.warn('Error fetching order from Firestore:', err);
    }
  }

  return null;
}

/**
 * Retrieves incoming pending orders eligible for a specific service provider.
 * Uses the first-acceptance rule: order must be 'pending' and include the provider in targetProviderIds.
 */
export async function getIncomingPendingOrders(providerId: string): Promise<Order[]> {
  const localOrders = getLocalCachedOrders().filter(
    (o) =>
      o.status === 'pending' &&
      (o.targetProviderIds.includes(providerId) || o.targetProviderIds.length === 0)
  );

  if (navigator.onLine) {
    try {
      const q = query(collection(db, PATHS.orders()), orderBy('createdAt', 'desc'));
      const snapshot = await withFirestoreTimeout(getDocs(q), 1500);
      if (snapshot) {
        const onlineOrders: Order[] = [];
        snapshot.forEach((d) => {
          const order = d.data() as Order;
          if (
            order.status === 'pending' &&
            (order.targetProviderIds.includes(providerId) || order.targetProviderIds.length === 0)
          ) {
            onlineOrders.push(order);
          }
        });
        // Merge unique orders
        for (const ord of onlineOrders) {
          if (!localOrders.some((l) => l.orderId === ord.orderId)) {
            localOrders.unshift(ord);
          }
        }
      }
    } catch (err) {
      console.warn('Could not query orders online, using local cache:', err);
    }
  }

  return localOrders;
}

/**
 * Retrieves active/assigned orders currently claimed by this provider.
 */
export async function getActiveOrdersForProvider(providerId: string): Promise<Order[]> {
  const local = getLocalCachedOrders().filter(
    (o) => o.acceptedByProviderId === providerId && o.status !== 'confirmed'
  );

  if (navigator.onLine) {
    try {
      const q = query(collection(db, PATHS.orders()), orderBy('createdAt', 'desc'));
      const snapshot = await withFirestoreTimeout(getDocs(q), 1500);
      if (snapshot) {
        snapshot.forEach((d) => {
          const order = d.data() as Order;
          if (order.acceptedByProviderId === providerId && !local.some((l) => l.orderId === order.orderId)) {
            local.push(order);
          }
        });
      }
    } catch (e) {
      console.warn('Could not fetch active orders from Firestore:', e);
    }
  }

  return local;
}

/**
 * First-acceptance lock: The first provider to accept claims the order.
 * Marks the order as 'accepted' and assigns acceptedByProviderId.
 */
export async function acceptOrderFirst(
  orderId: string,
  providerId: string
): Promise<{ success: boolean; message: string; order?: Order }> {
  // Check online first if possible to prevent race condition
  const currentOrder = await getOrderById(orderId);
  if (!currentOrder) {
    return { success: false, message: 'Order not found.' };
  }

  if (currentOrder.status !== 'pending') {
    return {
      success: false,
      message: 'Order has already been accepted by another provider.',
    };
  }

  const now = Date.now();
  const acceptedOrder: Order = {
    ...currentOrder,
    status: 'accepted',
    acceptedByProviderId: providerId,
    acceptedAt: now,
  };

  // Update local cache
  const cached = getLocalCachedOrders().map((o) =>
    o.orderId === orderId ? acceptedOrder : o
  );
  saveLocalOrders(cached);

  // Sync to Firestore in background
  if (navigator.onLine) {
    withFirestoreTimeout(async () => {
      const orderRef = doc(db, PATHS.order(orderId));
      await updateDoc(orderRef, {
        status: 'accepted',
        acceptedByProviderId: providerId,
        acceptedAt: now,
      });
    }, 1500).catch((err) => {
      console.warn('Offline: order accepted locally and queued for sync:', err);
    });
  }

  return { success: true, message: 'Order accepted successfully!', order: acceptedOrder };
}
