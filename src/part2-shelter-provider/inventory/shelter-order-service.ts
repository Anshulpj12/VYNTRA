/**
 * VYNTRA Part 2 — Shelter Order & Replenishment Service
 * 
 * Enables shelter providers to independently create replenishment orders
 * when stock drops below threshold, select target service providers,
 * track active orders, and confirm received deliveries with automatic
 * inventory increment.
 * 
 * @module part2-shelter-provider/inventory/shelter-order-service
 */

import { doc, setDoc, updateDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db, isFirebaseConfigured, withFirestoreTimeout } from '../../shared/firebase/config';
import { PATHS } from '../../shared/firebase/paths';
import { generateUniqueId } from '../../shared/utils/id-generator';
import { calculateDistance, formatDistance } from '../../shared/utils/geo-distance';
import { saveToCache, getFromCache, getAllFromCache, STORES } from '../../shared/utils/offline-cache';
import type { Order, OrderItem, ServiceProvider, InventoryItem, ShelterMetadata, GeoCoordinates } from '../../shared/types';

// Fallback seed registered service providers for offline selection
export const SEED_SERVICE_PROVIDERS: ServiceProvider[] = [
  {
    providerId: 'VYNTRA-SVC-JBP01DEP',
    providerGoogleUid: 'uid-jbp01',
    providerName: 'Mahila Emergency Supply Squadron & Relief Depot',
    location: 'Plot 4, Wright Town Central Warehouse',
    state: 'Madhya Pradesh',
    district: 'Jabalpur',
    coordinates: { lat: 23.1685, lng: 79.9338 },
    registeredAt: Date.now() - 86400000 * 3,
    isActive: true,
  },
  {
    providerId: 'VYNTRA-SVC-BHP02MED',
    providerGoogleUid: 'uid-bhp02',
    providerName: 'Bhopal Urgent Aid & Medical Supply Depot',
    location: 'Sector 3, MP Nagar Hub',
    state: 'Madhya Pradesh',
    district: 'Bhopal',
    coordinates: { lat: 23.2599, lng: 77.4126 },
    registeredAt: Date.now() - 86400000 * 5,
    isActive: true,
  },
  {
    providerId: 'VYNTRA-SVC-BLR03SAN',
    providerGoogleUid: 'uid-blr03',
    providerName: 'Bangalore Central Crisis Logistics Fleet',
    location: 'Richmond Town Depot Hub',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    coordinates: { lat: 12.9690, lng: 77.6000 },
    registeredAt: Date.now() - 86400000 * 2,
    isActive: true,
  },
  {
    providerId: 'VYNTRA-SVC-DEL04REL',
    providerGoogleUid: 'uid-del04',
    providerName: 'Delhi Central Relief & Dignity Fleet',
    location: 'Palam Colony Supply Base',
    state: 'Delhi',
    district: 'Central Delhi',
    coordinates: { lat: 28.6139, lng: 77.2090 },
    registeredAt: Date.now() - 86400000 * 4,
    isActive: true,
  },
];

export interface ProviderWithDistance extends ServiceProvider {
  distanceKm: number;
  formattedDistance: string;
}

/**
 * Fetches all active service providers from local cache and Firestore.
 */
export async function getActiveServiceProviders(
  shelterCoords?: GeoCoordinates
): Promise<ProviderWithDistance[]> {
  const providerMap = new Map<string, ServiceProvider>();

  // 1. Seed providers
  for (const s of SEED_SERVICE_PROVIDERS) {
    providerMap.set(s.providerId, s);
  }

  // 2. Read local cache
  try {
    const cached = await getAllFromCache<ServiceProvider>(STORES.SERVICE_PROVIDERS);
    if (cached && Array.isArray(cached)) {
      cached.forEach((p) => {
        if (p && p.providerId && p.isActive) providerMap.set(p.providerId, p);
      });
    }
  } catch (e) {
    console.warn('Error reading SERVICE_PROVIDERS store:', e);
  }

  // 3. Online Firestore query with safety timeout
  if (isFirebaseConfigured() && navigator.onLine) {
    try {
      const q = collection(db, PATHS.serviceProviders());
      const snap = await withFirestoreTimeout(getDocs(q), 1500);
      if (snap) {
        snap.forEach((docSnap) => {
          const data = docSnap.data() as ServiceProvider;
          if (data && data.providerId && data.isActive) {
            providerMap.set(data.providerId, data);
          }
        });
      }
    } catch (e) {
      console.warn('Could not query online providers:', e);
    }
  }

  const allProviders = Array.from(providerMap.values());
  const refCoords = shelterCoords || { lat: 12.9716, lng: 77.5946 };

  const withDistance: ProviderWithDistance[] = allProviders.map((prov) => {
    const dist = calculateDistance(refCoords, prov.coordinates);
    return {
      ...prov,
      distanceKm: dist,
      formattedDistance: formatDistance(dist),
    };
  });

  return withDistance.sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Creates and submits a replenishment order from this shelter.
 */
export async function createShelterReplenishmentOrder(input: {
  requestingShelterId: string;
  requestingShelterName: string;
  shelterCoordinates: GeoCoordinates;
  items: OrderItem[];
  targetMode: 'single' | 'five-nearest';
  targetProviderIds: string[];
}): Promise<Order> {
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

  // 1. Save to IndexedDB
  try {
    await saveToCache(STORES.ORDERS, newOrder);
  } catch (e) {
    console.warn('Could not save to IndexedDB ORDERS store:', e);
  }

  // Also cache in localStorage for fast synchronous render
  try {
    const raw = localStorage.getItem('vyntra_orders_cache');
    const orders: Order[] = raw ? JSON.parse(raw) : [];
    orders.unshift(newOrder);
    localStorage.setItem('vyntra_orders_cache', JSON.stringify(orders));
  } catch {}

  // 2. Sync to Firestore in background with safety timeout — NEVER block UI
  if (isFirebaseConfigured() && navigator.onLine) {
    withFirestoreTimeout(async () => {
      const ref = doc(db, PATHS.order(orderId));
      await setDoc(ref, newOrder);
    }, 1500).catch((e) => {
      console.warn('Firestore order write delayed:', e);
    });
  }

  return newOrder;
}

/**
 * Loads all orders placed by this shelter.
 */
export async function getShelterOrders(shelterId: string): Promise<Order[]> {
  const orderMap = new Map<string, Order>();

  // Check localStorage fast cache
  try {
    const raw = localStorage.getItem('vyntra_orders_cache');
    if (raw) {
      const orders: Order[] = JSON.parse(raw);
      orders
        .filter((o) => o.requestingShelterId === shelterId)
        .forEach((o) => orderMap.set(o.orderId, o));
    }
  } catch {}

  // Check IndexedDB
  try {
    const cached = await getAllFromCache<Order>(STORES.ORDERS);
    if (cached && Array.isArray(cached)) {
      cached
        .filter((o) => o.requestingShelterId === shelterId)
        .forEach((o) => orderMap.set(o.orderId, o));
    }
  } catch {}

  // Online Firestore with safety timeout
  if (isFirebaseConfigured() && navigator.onLine) {
    try {
      const q = query(collection(db, PATHS.orders()), orderBy('createdAt', 'desc'));
      const snap = await withFirestoreTimeout(getDocs(q), 1500);
      if (snap) {
        snap.forEach((docSnap) => {
          const order = docSnap.data() as Order;
          if (order && order.requestingShelterId === shelterId) {
            orderMap.set(order.orderId, order);
          }
        });
      }
    } catch (e) {
      console.warn('Could not query online orders:', e);
    }
  }

  return Array.from(orderMap.values()).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Shelter confirms received delivery.
 * Marks the order as 'confirmed' and automatically increments the shelter's
 * live inventory items with the exact received quantities!
 */
export async function confirmShelterDelivery(
  order: Order,
  currentInventory: InventoryItem[]
): Promise<{ updatedInventory: InventoryItem[]; count: number }> {
  const now = Date.now();
  const confirmedOrder: Order = {
    ...order,
    status: 'confirmed',
    confirmedAt: now,
  };

  // 1. Update order status in cache & Firestore
  await saveToCache(STORES.ORDERS, confirmedOrder);

  try {
    const raw = localStorage.getItem('vyntra_orders_cache');
    if (raw) {
      const list: Order[] = JSON.parse(raw);
      const updatedList = list.map((o) => (o.orderId === order.orderId ? confirmedOrder : o));
      localStorage.setItem('vyntra_orders_cache', JSON.stringify(updatedList));
    }
  } catch {}

  if (isFirebaseConfigured() && navigator.onLine) {
    withFirestoreTimeout(async () => {
      const orderRef = doc(db, PATHS.order(order.orderId));
      await updateDoc(orderRef, { status: 'confirmed', confirmedAt: now });
    }, 1500).catch((e) => {
      console.warn('Could not sync confirmed status to Firestore:', e);
    });
  }

  // 2. Automatically update live inventory items
  let count = 0;
  const updatedInventory = [...currentInventory];

  for (const item of order.items) {
    const existingIndex = updatedInventory.findIndex(
      (inv) => inv.itemName.toLowerCase() === item.itemName.toLowerCase()
    );

    if (existingIndex >= 0) {
      // Increment existing inventory quantity
      const existing = updatedInventory[existingIndex];
      const updated: InventoryItem = {
        ...existing,
        currentQuantity: existing.currentQuantity + item.requestedQuantity,
        lastUpdatedAt: now,
      };
      updatedInventory[existingIndex] = updated;
      await saveToCache(STORES.INVENTORY, updated);

      if (isFirebaseConfigured() && navigator.onLine) {
        withFirestoreTimeout(async () => {
          const itemRef = doc(db, PATHS.shelterInventoryItem(order.requestingShelterId, existing.itemId));
          await updateDoc(itemRef, {
            currentQuantity: updated.currentQuantity,
            lastUpdatedAt: now,
          });
        }, 1500).catch(() => {});
      }
      count++;
    } else {
      // Create new inventory item
      const newItemId = generateUniqueId('INV');
      const lower = item.itemName.toLowerCase();
      const category: InventoryItem['category'] =
        lower.includes('pad') || lower.includes('hygiene') || lower.includes('sanitary')
          ? 'hygiene'
          : lower.includes('medical') || lower.includes('trauma') || lower.includes('first aid')
          ? 'medical'
          : lower.includes('blanket') || lower.includes('bed')
          ? 'bedding'
          : lower.includes('food') || lower.includes('water')
          ? 'provisions'
          : 'general';

      const newItem: InventoryItem = {
        itemId: newItemId,
        shelterId: order.requestingShelterId,
        itemName: item.itemName,
        category,
        currentQuantity: item.requestedQuantity,
        requiredMinimum: Math.max(5, Math.round(item.requestedQuantity * 0.4)),
        lastUpdatedAt: now,
      };
      updatedInventory.push(newItem);
      await saveToCache(STORES.INVENTORY, newItem);

      if (isFirebaseConfigured() && navigator.onLine) {
        withFirestoreTimeout(async () => {
          const itemRef = doc(db, PATHS.shelterInventoryItem(order.requestingShelterId, newItemId));
          await setDoc(itemRef, newItem);
        }, 1500).catch(() => {});
      }
      count++;
    }
  }

  // 3. Update shelter metadata inventory summary
  const metadata = await getFromCache<ShelterMetadata>(STORES.METADATA, order.requestingShelterId);
  if (metadata) {
    const updatedMeta: ShelterMetadata = {
      ...metadata,
      inventorySummary: updatedInventory.map((i) => ({
        itemName: i.itemName,
        currentQuantity: i.currentQuantity,
        requiredMinimum: i.requiredMinimum,
      })),
      lastUpdatedAt: now,
    };
    await saveToCache(STORES.METADATA, updatedMeta);
    await saveToCache(STORES.SHELTER_CACHE, updatedMeta);

    if (isFirebaseConfigured() && navigator.onLine) {
      try {
        const metaRef = doc(db, PATHS.shelterMetadata(order.requestingShelterId));
        await updateDoc(metaRef, {
          inventorySummary: updatedMeta.inventorySummary,
          lastUpdatedAt: now,
        });
      } catch {}
    }
  }

  return { updatedInventory, count };
}

/**
 * Testing helper: Simulates order state transition (e.g. accepted -> dispatched).
 */
export async function simulateOrderTransition(
  orderId: string,
  newStatus: Order['status'],
  providerName?: string
): Promise<Order | null> {
  const cachedList: Order[] = (() => {
    try {
      const raw = localStorage.getItem('vyntra_orders_cache');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  })();

  const index = cachedList.findIndex((o) => o.orderId === orderId);
  if (index < 0) return null;

  const now = Date.now();
  const updated: Order = {
    ...cachedList[index],
    status: newStatus,
    acceptedByProviderId: providerName || cachedList[index].acceptedByProviderId || 'VYNTRA-SVC-JBP01DEP',
    ...(newStatus === 'accepted' ? { acceptedAt: now } : {}),
    ...(newStatus === 'dispatched' ? { dispatchedAt: now } : {}),
    ...(newStatus === 'confirmed' ? { confirmedAt: now } : {}),
  };

  cachedList[index] = updated;
  localStorage.setItem('vyntra_orders_cache', JSON.stringify(cachedList));
  await saveToCache(STORES.ORDERS, updated);

  if (isFirebaseConfigured() && navigator.onLine) {
    try {
      const ref = doc(db, PATHS.order(orderId));
      await updateDoc(ref, {
        status: newStatus,
        acceptedByProviderId: updated.acceptedByProviderId,
        ...(newStatus === 'accepted' ? { acceptedAt: now } : {}),
        ...(newStatus === 'dispatched' ? { dispatchedAt: now } : {}),
        ...(newStatus === 'confirmed' ? { confirmedAt: now } : {}),
      });
    } catch {}
  }

  return updated;
}
