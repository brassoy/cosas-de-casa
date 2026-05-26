import { create } from 'zustand';
import type { NotificationPermissionStatus } from '../types';

interface NotificationsState {
  permissionStatus: NotificationPermissionStatus;
  isSubscribed: boolean;
  isLoading: boolean;
  setPermissionStatus: (status: NotificationPermissionStatus) => void;
  setSubscribed: (subscribed: boolean) => void;
  setLoading: (loading: boolean) => void;
}

function getInitialPermissionStatus(): NotificationPermissionStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionStatus;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  permissionStatus: getInitialPermissionStatus(),
  isSubscribed: false,
  isLoading: false,
  setPermissionStatus: (permissionStatus) => set({ permissionStatus }),
  setSubscribed: (isSubscribed) => set({ isSubscribed }),
  setLoading: (isLoading) => set({ isLoading }),
}));
