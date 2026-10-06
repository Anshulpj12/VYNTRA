/**
 * VYNTRA — Stock Prediction & Consumption Intensity Engine
 * Analyzes historical usage logs from shelter inventory to predict depletion rates
 * and hours/days remaining for critical relief resources.
 */

import type { InventoryItem, UsageLogEntry } from '../../shared/types';

export interface StockPrediction {
  itemId: string;
  itemName: string;
  currentQuantity: number;
  requiredMinimum: number;
  dailyUsageRate: number;
  estimatedRemainingDays: number;
  estimatedRemainingHours: number;
  stockStatus: 'healthy' | 'warning' | 'critical';
  recommendedReorderQuantity: number;
  reason: string;
}

/**
 * Calculates stock depletion prediction for a specific inventory item
 * based on real historical usage logs.
 */
export function predictItemDepletion(
  item: InventoryItem,
  usageLogs: UsageLogEntry[] = []
): StockPrediction {
  let dailyUsageRate = item.usageRate || 0;

  if (usageLogs.length > 0) {
    // Sort logs chronologically
    const sortedLogs = [...usageLogs].sort(
      (a, b) => a.usedAt.toMillis() - b.usedAt.toMillis()
    );

    const firstTime = sortedLogs[0].usedAt.toMillis();
    const lastTime = Math.max(
      sortedLogs[sortedLogs.length - 1].usedAt.toMillis(),
      Date.now()
    );

    const elapsedDays = Math.max(1, (lastTime - firstTime) / (1000 * 60 * 60 * 24));
    const totalConsumed = sortedLogs.reduce((sum, log) => sum + log.quantityUsed, 0);

    dailyUsageRate = Number((totalConsumed / elapsedDays).toFixed(2));
  }

  // If no usage rate is detectable yet, use default proportional baseline
  if (dailyUsageRate <= 0) {
    dailyUsageRate = Math.max(1, Math.round(item.requiredMinimum * 0.15));
  }

  const estimatedRemainingDays = Number(
    (item.currentQuantity / dailyUsageRate).toFixed(1)
  );
  const estimatedRemainingHours = Math.max(
    0,
    Math.round(estimatedRemainingDays * 24)
  );

  let stockStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
  let reason = 'Stock levels adequate for current operational pace.';

  if (item.currentQuantity <= 0 || estimatedRemainingHours <= 24) {
    stockStatus = 'critical';
    reason = `Critical shortage imminent! Under ${estimatedRemainingHours}h remaining (~${dailyUsageRate}/day consumed).`;
  } else if (
    item.currentQuantity <= item.requiredMinimum ||
    estimatedRemainingDays <= 3
  ) {
    stockStatus = 'warning';
    reason = `Stock below safety reserve threshold (${item.requiredMinimum} units required).`;
  }

  // Recommended reorder brings stock back to 2.5x the minimum reserve
  const targetStock = item.requiredMinimum * 2.5;
  const recommendedReorderQuantity = Math.max(
    item.requiredMinimum,
    Math.round(targetStock - item.currentQuantity)
  );

  return {
    itemId: item.itemId,
    itemName: item.itemName,
    currentQuantity: item.currentQuantity,
    requiredMinimum: item.requiredMinimum,
    dailyUsageRate,
    estimatedRemainingDays,
    estimatedRemainingHours,
    stockStatus,
    recommendedReorderQuantity,
    reason,
  };
}

/**
 * Evaluates an entire shelter inventory and returns all items requiring replenishment.
 */
export function identifyLowStockItems(
  items: InventoryItem[],
  logsMap: Record<string, UsageLogEntry[]> = {}
): StockPrediction[] {
  return items
    .map((item) => predictItemDepletion(item, logsMap[item.itemId] || []))
    .filter((pred) => pred.stockStatus !== 'healthy')
    .sort((a, b) => {
      // Critical first, then sorted by remaining hours ascending
      if (a.stockStatus === 'critical' && b.stockStatus !== 'critical') return -1;
      if (b.stockStatus === 'critical' && a.stockStatus !== 'critical') return 1;
      return a.estimatedRemainingHours - b.estimatedRemainingHours;
    });
}
