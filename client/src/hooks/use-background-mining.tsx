import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { startBackgroundMining, claimBackgroundMiningReward, getLocalMiningStatus, canClaimReward } from '@/lib/background-mining';
import { apiRequest } from '@/lib/queryClient';
import { isOnline, registerConnectivityListeners, showNotification } from '@/lib/service-worker';
import { formatTime } from '@/lib/mining';
import { useToast } from '@/hooks/use-toast';

// Định nghĩa kiểu dữ liệu API response
interface MiningStatusResponse {
  miningActive: boolean;
  miningUntil: string | null;
  miningCompleted?: boolean;
  timeRemaining?: number;
  progress?: number;
}

export function useBackgroundMining() {
  const [offlineMode, setOfflineMode] = useState(!isOnline());
  const [miningStatus, setMiningStatus] = useState(getLocalMiningStatus());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Lấy trạng thái đào từ API (khi online)
  const { data: apiMiningStatus, isLoading, refetch } = useQuery({
    queryKey: ['/api/mining/status'],
    queryFn: async () => {
      try {
        return await apiRequest<MiningStatusResponse>('GET', '/api/mining/status');
      } catch (error) {
        console.error("Error fetching mining status:", error);
        setOfflineMode(true);
        throw error;
      }
    },
    enabled: !offlineMode,
    refetchInterval: 60000, // Refresh mỗi phút
    onSuccess: (data) => {
      try {
        localStorage.setItem('mining_active', data.miningActive ? 'true' : 'false');
        if (data.miningUntil) {
          localStorage.setItem('mining_until', data.miningUntil);
        }
        updateLocalStatus();
      } catch (error) {
        console.error("Error updating mining status:", error);
      }
    },
  });

  // Mutation để bắt đầu đào
  const startMiningMutation = useMutation({
    mutationFn: startBackgroundMining,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mining/status'] });
      updateLocalStatus();
      toast({
        title: "Đã bắt đầu đào",
        description: "Bạn sẽ nhận được thông báo khi quá trình đào hoàn tất",
      });
    },
    onError: () => {
      toast({
        title: "Không thể bắt đầu đào",
        description: "Hãy kiểm tra kết nối mạng và thử lại",
        variant: "destructive",
      });
    }
  });

  // Mutation để nhận thưởng
  const claimRewardMutation = useMutation({
    mutationFn: claimBackgroundMiningReward,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['/api/mining/status'] });
        updateLocalStatus();
        toast({
          title: "Đã nhận thưởng",
          description: `Bạn đã nhận được ${result.amount || 0} PTC coins`,
        });
      }
    },
    onError: () => {
      toast({
        title: "Không thể nhận thưởng",
        description: "Hãy kiểm tra kết nối mạng và thử lại",
        variant: "destructive",
      });
    }
  });

  // Cập nhật state local từ localStorage
  const updateLocalStatus = useCallback(() => {
    const localStatus = getLocalMiningStatus();
    setMiningStatus(localStatus);
    
    if (localStatus.miningActive && localStatus.timeRemaining <= 0 && !localStatus.miningCompleted) {
      localStorage.setItem('mining_completed', 'true');
      showNotification('Đào PTC đã hoàn thành', {
        body: 'Quá trình đào đã hoàn thành. Bạn có thể nhận thưởng ngay bây giờ!'
      });
    }
  }, []);

  // Định kỳ cập nhật tình trạng đào (khi offline)
  useEffect(() => {
    if (offlineMode && miningStatus.miningActive && !miningStatus.miningCompleted) {
      const interval = setInterval(() => {
        updateLocalStatus();
      }, 10000); // Cập nhật mỗi 10 giây khi offline
      
      return () => clearInterval(interval);
    }
  }, [offlineMode, miningStatus.miningActive, miningStatus.miningCompleted, updateLocalStatus]);

  // Đăng ký listener để theo dõi kết nối internet
  useEffect(() => {
    const cleanup = registerConnectivityListeners(
      () => {
        setOfflineMode(false);
        refetch();
        toast({
          title: "Đã kết nối lại",
          description: "Đang đồng bộ dữ liệu với máy chủ...",
        });
      },
      () => {
        setOfflineMode(true);
        toast({
          title: "Mất kết nối internet",
          description: "Ứng dụng đang chạy ở chế độ offline. Quá trình đào vẫn tiếp tục.",
          variant: "destructive",
        });
      }
    );
    return cleanup;
  }, [refetch, toast]);

  // Lấy dữ liệu ban đầu khi component mount
  useEffect(() => {
    updateLocalStatus();
  }, [updateLocalStatus]);

  // Xử lý bắt đầu đào
  const startMining = useCallback(() => {
    if (offlineMode) {
      toast({
        title: "Không thể bắt đầu đào",
        description: "Cần kết nối internet để bắt đầu đào. Vui lòng kiểm tra kết nối và thử lại.",
        variant: "destructive",
      });
      return;
    }
    startMiningMutation.mutate();
  }, [offlineMode, startMiningMutation, toast]);

  // Xử lý nhận thưởng
  const claimReward = useCallback(() => {
    if (offlineMode) {
      toast({
        title: "Không thể nhận thưởng khi offline",
        description: "Cần kết nối internet để nhận thưởng. Vui lòng kết nối lại và thử lại.",
        variant: "destructive",
      });
      return;
    }
    if (!canClaimReward()) {
      toast({
        title: "Chưa thể nhận thưởng",
        description: "Quá trình đào chưa hoàn thành. Vui lòng đợi tới khi đào kết thúc.",
        variant: "destructive",
      });
      return;
    }
    claimRewardMutation.mutate();
  }, [offlineMode, claimRewardMutation, toast]);

  // Kết hợp dữ liệu từ API và dữ liệu local
  const combinedMiningStatus = useCallback(() => {
    if (apiMiningStatus && !offlineMode) {
      return apiMiningStatus;
    }
    return miningStatus;
  }, [apiMiningStatus, offlineMode, miningStatus]);

  // Trả về các giá trị và hàm cần thiết
  return {
    isLoading,
    offlineMode,
    miningStatus: combinedMiningStatus(),
    canClaimReward: canClaimReward(),
    startMining,
    claimReward,
    isMiningStarting: startMiningMutation.isPending,
    isClaimingReward: claimRewardMutation.isPending,
  };
}
