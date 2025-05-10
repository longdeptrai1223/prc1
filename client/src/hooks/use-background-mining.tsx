import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  startBackgroundMining,
  claimBackgroundMiningReward,
  getLocalMiningStatus,
  canClaimReward,
  calculateTimeRemaining,
} from '@/lib/background-mining';
import { apiRequest } from '@/lib/queryClient';
import { isOnline, registerConnectivityListeners, showNotification } from '@/lib/service-worker';
import { formatTime } from '@/lib/mining';
import { useToast } from '@/hooks/use-toast';

// Định nghĩa kiểu dữ liệu API response
interface MiningStatusResponse {
  miningActive: boolean;
  miningUntil: string | null;
  miningCompleted?: boolean;
  timeRemaining?: number; // Giây từ API
  progress?: number;
}

interface MiningStatus extends MiningStatusResponse {
  timeRemainingFormatted: string;
}

export function useBackgroundMining() {
  const [offlineMode, setOfflineMode] = useState(!isOnline());
  const [miningStatus, setMiningStatus] = useState<MiningStatus>(getLocalMiningStatus());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Lấy trạng thái đào từ API (khi online)
  const { data: apiMiningStatus, isLoading, refetch } = useQuery({
    queryKey: ['/api/mining/status'],
    queryFn: async () => {
      try {
        const response = await apiRequest<MiningStatusResponse>('GET', '/api/mining/status');
        return {
          ...response,
          timeRemainingFormatted: formatTime(
            (response.timeRemaining || calculateTimeRemaining(response.miningUntil)) * 1000 // Chuyển từ giây sang mili-giây
          ),
        };
      } catch (error) {
        console.error('Error fetching mining status:', error);
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
        console.error('Error updating mining status:', error);
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
        title: 'Mining Started',
        description: 'You will be notified when the mining process is complete',
      });
    },
    onError: () => {
      toast({
        title: 'Unable to Start Mining',
        description: 'Please check your network connection and try again',
        variant: 'destructive',
      });
    },
  });

  // Mutation để nhận thưởng
  const claimRewardMutation = useMutation({
    mutationFn: claimBackgroundMiningReward,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['/api/mining/status'] });
        updateLocalStatus();
        toast({
          title: 'Reward Claimed',
          description: `You have received ${result.amount || 0} PTC coins`,
        });
      }
    },
    onError: () => {
      toast({
        title: 'Unable to Claim Reward',
        description: 'Please check your network connection and try again',
        variant: 'destructive',
      });
    },
  });

  // Cập nhật state local từ localStorage
  const updateLocalStatus = useCallback(() => {
    const localStatus = getLocalMiningStatus();
    const timeRemainingInSeconds = calculateTimeRemaining(localStatus.miningUntil);
    const formattedStatus: MiningStatus = {
      ...localStatus,
      timeRemainingFormatted: formatTime(timeRemainingInSeconds * 1000), // Chuyển từ giây sang mili-giây
    };
    setMiningStatus(formattedStatus);

    if (
      localStatus.miningActive &&
      timeRemainingInSeconds <= 0 &&
      !localStatus.miningCompleted
    ) {
      localStorage.setItem('mining_completed', 'true');
      showNotification('PTC Mining Completed', {
        body: 'Mining has finished. You can now claim your reward!',
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
          title: 'Reconnected',
          description: 'Syncing data with the server...',
        });
      },
      () => {
        setOfflineMode(true);
        toast({
          title: 'Lost Internet Connection',
          description: 'App is running in offline mode. Mining will continue.',
          variant: 'destructive',
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
        title: 'Unable to Start Mining',
        description:
          'Internet connection required to start mining. Please check your connection and try again.',
        variant: 'destructive',
      });
      return;
    }
    startMiningMutation.mutate();
  }, [offlineMode, startMiningMutation, toast]);

  // Xử lý nhận thưởng
  const claimReward = useCallback(() => {
    if (offlineMode) {
      toast({
        title: 'Unable to Claim Reward Offline',
        description:
          'Internet connection required to claim rewards. Please reconnect and try again.',
        variant: 'destructive',
      });
      return;
    }
    if (!canClaimReward()) {
      toast({
        title: 'Cannot Claim Reward Yet',
        description: 'Mining is not yet complete. Please wait until mining finishes.',
        variant: 'destructive',
      });
      return;
    }
    claimRewardMutation.mutate();
  }, [offlineMode, claimRewardMutation, toast]);

  // Kết hợp dữ liệu từ API và dữ liệu local
  const combinedMiningStatus = useCallback((): MiningStatus => {
    if (apiMiningStatus && !offlineMode) {
      return {
        ...apiMiningStatus,
        timeRemainingFormatted:
          apiMiningStatus.timeRemainingFormatted ||
          formatTime((apiMiningStatus.timeRemaining || calculateTimeRemaining(apiMiningStatus.miningUntil)) * 1000), // Chuyển từ giây sang mili-giây
      };
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