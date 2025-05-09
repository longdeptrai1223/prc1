import { initBackgroundMining } from './background-mining';

/**
 * Đăng ký service worker cho ứng dụng PWA
 * Service worker sẽ giúp ứng dụng hoạt động offline và đồng bộ dữ liệu khi có kết nối internet
 */
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
      });
      
      console.log('Service worker registration successful with scope:', registration.scope);
      
      // Đăng ký background sync nếu trình duyệt hỗ trợ
      if ('sync' in registration) {
        navigator.serviceWorker.ready.then(reg => {
          // Đăng ký sync task cho mining operations
          reg.sync.register('mining-sync').catch(err => {
            console.error('Error registering background sync:', err);
          });
        });
      }
      
      // Khởi tạo đào coin ở background
      initBackgroundMining();
      
      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return null;
    }
  } else {
    console.warn('Service workers are not supported by this browser');
    return null;
  }
};

/**
 * Kiểm tra xem ứng dụng có đang hoạt động ở chế độ PWA (installed) hay không
 */
export const isPwaMode = () => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone || // for iOS
         document.referrer.includes('android-app://');
};

/**
 * Kiểm tra xem thiết bị có online hay không
 */
export const isOnline = () => {
  return navigator.onLine;
};

/**
 * Đăng ký listener cho sự kiện online/offline
 */
export const registerConnectivityListeners = (
  onOnline: () => void, 
  onOffline: () => void
) => {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
};

/**
 * Xử lý push notification
 */
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};

/**
 * Gửi thông báo với service worker
 */
export const showNotification = async (title: string, options: NotificationOptions = {}) => {
  if (!('Notification' in window)) {
    return false;
  }
  
  if (Notification.permission !== 'granted') {
    return false;
  }
  
  if (navigator.serviceWorker.controller) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/logo192.png',
      badge: '/logo192.png',
      vibrate: [100, 50, 100],
      ...options
    });
    return true;
  } else {
    new Notification(title, options);
    return true;
  }
};

/**
 * Kiểm tra và gợi ý cài đặt PWA
 */
export const checkInstallPrompt = (callback: (event: BeforeInstallPromptEvent) => void) => {
  // Biến deferredPrompt sẽ lưu sự kiện beforeinstallprompt
  let deferredPrompt: BeforeInstallPromptEvent | null = null;
  
  // Lắng nghe sự kiện beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    // Ngăn Chrome hiển thị dialog cài đặt tự động
    e.preventDefault();
    
    // Lưu sự kiện để có thể kích hoạt sau
    deferredPrompt = e as BeforeInstallPromptEvent;
    
    // Thông báo cho người dùng rằng có thể cài đặt ứng dụng
    callback(deferredPrompt);
  });
};

// Định nghĩa kiểu cho BeforeInstallPromptEvent (không có sẵn trong TypeScript)
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
};