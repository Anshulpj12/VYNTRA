/**
 * VYNTRA — World Chat Categories
 * A user must select one category before submitting a chat message.
 */

export interface ChatCategory {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export const CHAT_CATEGORIES: ChatCategory[] = [
  {
    id: 'safety-alert',
    label: 'Safety Alert',
    icon: '🚨',
    description: 'Report an unsafe situation or danger in your area',
  },
  {
    id: 'medical-need',
    label: 'Medical Need',
    icon: '🏥',
    description: 'Share medical emergencies or healthcare requirements',
  },
  {
    id: 'resource-request',
    label: 'Resource Request',
    icon: '📦',
    description: 'Request supplies, food, water, or other essentials',
  },
  {
    id: 'community-update',
    label: 'Community Update',
    icon: '📢',
    description: 'Share local news, road conditions, or area updates',
  },
  {
    id: 'general-experience',
    label: 'General Experience',
    icon: '💬',
    description: 'Share feelings, observations, or personal experiences',
  },
  {
    id: 'shelter-info',
    label: 'Shelter Information',
    icon: '🏠',
    description: 'Share information about available shelters or safe spaces',
  },
];

export function getCategoryLabel(categoryId: string): string {
  return CHAT_CATEGORIES.find((c) => c.id === categoryId)?.label || categoryId;
}
