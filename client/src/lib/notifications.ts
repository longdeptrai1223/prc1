import { requestNotificationPermission, registerNotificationListener } from './firebase';
import { apiRequest } from './queryClient';

// Register service worker
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });
      console.log('Service worker registration successful with scope:', registration.scope);
      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return null;
    }
  }
  return null;
};

// Register for push notifications
export const registerForPushNotifications = async () => {
  try {
    // Request permission and get token
    const token = await requestNotificationPermission();
    
    if (token) {
      // Send token to backend
      await apiRequest('POST', '/api/notifications/register', { token });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return false;
  }
};

// Toggle notification settings
export const toggleNotifications = async (enabled: boolean) => {
  try {
    await apiRequest('POST', '/api/notifications/toggle', { enabled });
    
    if (enabled) {
      // If enabling notifications, request permission again
      await registerForPushNotifications();
    }
    
    return true;
  } catch (error) {
    console.error('Error toggling notifications:', error);
    return false;
  }
};

// Show a notification
export const showNotification = (title: string, options: NotificationOptions = {}) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      ...options
    });
    
    return notification;
  }
  
  return null;
};

// Listen for push notifications
export const listenForPushNotifications = (callback: (payload: any) => void) => {
  return registerNotificationListener(callback);
};

// Initialize notifications
export const initializeNotifications = async () => {
  // Register for push notifications if permission is already granted
  if ('Notification' in window && Notification.permission === 'granted') {
    await registerForPushNotifications();
  }
  
  // Listen for notifications
  listenForPushNotifications((payload) => {
    console.log('Received notification payload:', payload);
    
    const { notification } = payload;
    if (notification) {
      showNotification(notification.title, {
        body: notification.body,
        data: payload.data
      });
    }
  });
};
