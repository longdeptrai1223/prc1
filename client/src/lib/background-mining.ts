import { formatTime, calculateTimeRemaining, calculateMiningProgress } from './mining';
import { apiRequest } from './queryClient';

let backgroundMiningInterval: number | null = null;
const MINING_CHECK_INTERVAL = 60000; // Check every minute

// Định nghĩa kiểu dữ liệu cho kết quả trả về từ API
interface MiningStatusResponse {
  miningActive: boolean;
  miningUntil: string | null;
  miningCompleted?: boolean;
  timeRemaining?: number;
  progress?: number;
}

interface MiningStartResponse {
  success: boolean;
  miningUntil: string;
}

interface MiningClaimResponse {
  success: boolean;
  amount: number;
}

/**
 * Khởi tạo hệ thống đào coin ở background
 * - Hệ thống sẽ tự động đào coin dựa vào thời gian thực, không phụ thuộc vào việc người dùng online hay không
 * - Chỉ yêu cầu kết nối internet khi bắt đầu đào và khi nhận thưởng
 */
export const initBackgroundMining = () => {
  // Kiểm tra trạng thái đào hiện tại khi khởi động ứng dụng
  checkMiningStatus();
  
  // Thiết lập interval để kiểm tra định kỳ
  if (!backgroundMiningInterval) {
    backgroundMiningInterval = window.setInterval(() => {
      checkMiningStatus();
    }, MINING_CHECK_INTERVAL);
  }
};

/**
 * Kiểm tra trạng thái đào hiện tại
 * - Nếu thời gian đào đã kết thúc, tự động đánh dấu là hoàn thành và người dùng có thể nhận thưởng
 * - Xử lý offline: Lưu trạng thái vào localStorage nếu không có kết nối
 */
export const checkMiningStatus = async () => {
  try {
    // Kiểm tra trạng thái đào từ server
    const stats = await apiRequest<MiningStatusResponse>('/api/mining/status');
    
    // Nếu đang đào và thời gian đã hết
    if (stats.miningActive && stats.miningUntil) {
      const timeRemaining = calculateTimeRemaining(stats.miningUntil);
      
      // Nếu đã hết thời gian đào
      if (timeRemaining <= 0) {
        console.log('Mining completed, ready to claim rewards');
        // Lưu trạng thái để người dùng có thể yêu cầu thưởng sau
        localStorage.setItem('mining_completed', 'true');
        
        // Trigger notification nếu được hỗ trợ và được cấp quyền
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('PTC Mining Completed', {
            body: 'Your mining session is complete! Claim your rewards now.',
            icon: '/logo192.png'
          });
        }
      } else {
        // Đang trong quá trình đào
        const progress = calculateMiningProgress(stats.miningUntil);
        const timeRemainingFormatted = formatTime(timeRemaining);
        
        console.log(`Mining in progress: ${progress.toFixed(2)}%, Time remaining: ${timeRemainingFormatted}`);
        
        // Lưu vào localStorage để hiển thị khi không có kết nối internet
        localStorage.setItem('mining_progress', progress.toString());
        localStorage.setItem('mining_time_remaining', timeRemaining.toString());
        localStorage.setItem('mining_until', stats.miningUntil);
      }
    }
  } catch (error) {
    console.error('Failed to check mining status:', error);
    
    // Sử dụng dữ liệu đã lưu nếu không kết nối được internet
    const miningUntil = localStorage.getItem('mining_until');
    if (miningUntil) {
      const timeRemaining = calculateTimeRemaining(miningUntil);
      if (timeRemaining <= 0) {
        localStorage.setItem('mining_completed', 'true');
      }
    }
  }
};

/**
 * Bắt đầu phiên đào coin mới
 * - Yêu cầu kết nối internet
 * - Lưu thông tin vào localStorage để xử lý offline
 */
export const startBackgroundMining = async (): Promise<boolean> => {
  try {
    const response = await apiRequest<MiningStartResponse>('/api/mining/start', {
      method: 'POST'
    });
    
    if (response.success) {
      // Lưu thời gian kết thúc vào localStorage
      localStorage.setItem('mining_until', response.miningUntil);
      localStorage.setItem('mining_active', 'true');
      localStorage.removeItem('mining_completed');
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to start mining:', error);
    return false;
  }
};

/**
 * Nhận phần thưởng từ phiên đào đã hoàn thành
 * - Yêu cầu kết nối internet
 * - Xóa dữ liệu đã lưu trong localStorage
 */
export const claimBackgroundMiningReward = async (): Promise<{success: boolean, amount?: number}> => {
  try {
    const response = await apiRequest<MiningClaimResponse>('/api/mining/claim', {
      method: 'POST'
    });
    
    if (response.success) {
      // Xóa các dữ liệu đã lưu khi đã nhận thưởng thành công
      localStorage.removeItem('mining_completed');
      localStorage.removeItem('mining_active');
      localStorage.removeItem('mining_until');
      localStorage.removeItem('mining_progress');
      localStorage.removeItem('mining_time_remaining');
      
      return {
        success: true,
        amount: response.amount
      };
    }
    return { success: false };
  } catch (error) {
    console.error('Failed to claim mining rewards:', error);
    return { success: false };
  }
};

/**
 * Kiểm tra xem có thể nhận thưởng không (không cần kết nối internet)
 */
export const canClaimReward = (): boolean => {
  return localStorage.getItem('mining_completed') === 'true';
};

/**
 * Lấy thông tin về tiến trình đào hiện tại (không cần kết nối internet)
 */
export const getLocalMiningStatus = () => {
  const miningActive = localStorage.getItem('mining_active') === 'true';
  const miningCompleted = localStorage.getItem('mining_completed') === 'true';
  const miningUntil = localStorage.getItem('mining_until') || null;
  
  let progress = 0;
  let timeRemaining = 0;
  
  if (miningUntil) {
    progress = calculateMiningProgress(miningUntil);
    timeRemaining = calculateTimeRemaining(miningUntil);
  }
  
  return {
    miningActive,
    miningCompleted,
    miningUntil,
    progress,
    timeRemaining,
    timeRemainingFormatted: formatTime(timeRemaining)
  };
};

/**
 * Dừng hệ thống kiểm tra đào coin background
 */
export const stopBackgroundMining = () => {
  if (backgroundMiningInterval) {
    window.clearInterval(backgroundMiningInterval);
    backgroundMiningInterval = null;
  }
};