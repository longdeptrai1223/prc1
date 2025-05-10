import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  startBackgroundMining,
  claimBackgroundMiningReward,
  getLocalMiningStatus,
  canClaimReward,
  calculateTimeRemaining,
  generateReferralId,
  getReferralId,
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
  const [miningStatus, setMiningStatus] = useState<MiningStatus>({
    ...getLocalMiningStatus(),
    timeRemainingFormatted: '--:--:--', // Giá trị mặc định
  });
  const [referralId, setReferralId] = useState<string | null>(getReferralId()); // State cho referral ID
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Tạo referral ID nếu chưa có
  useEffect(() => {
    if (!referralId) {
      const newReferralId = generateReferralId();
      setReferralId(newReferralId);
      console.log('Generated referral ID:', newReferralId); // Debug
    }
  }, [referralId]);

  // Lấy trạng thái đào từ API (khi online)
  const { data: apiMiningStatus, isLoading, refetch } = useQuery({
    queryKey: ['/api/mining/status'],
    queryFn: async () => {
      try {
        const response = await apiRequest<MiningStatusResponse>('GET', '/api/mining/status');
        console.log('API response:', response); // Debug: Kiểm tra dữ liệu từ API
        const timeRemainingInSeconds = response.timeRemaining || calculateTimeRemaining(response.miningUntil);
        return {
          ...response,
          timeRemainingFormatted: formatTime(timeRemainingInSeconds), // formatTime nhận giây
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
    console.log('Local status:', localStatus); // Debug: Kiểm tra trạng thái local
    const timeRemainingInSeconds = calculateTimeRemaining(localStatus.miningUntil);
    const formattedStatus: MiningStatus = {
      ...localStatus,
      timeRemainingFormatted: formatTime(timeRemainingInSeconds), // formatTime nhận giây
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

  // Cập nhật thời gian đếm ngược theo thời gian thực (mỗi giây)
  useEffect(() => {
    if (miningStatus.miningActive && !miningStatus.miningCompleted) {
      const interval = setInterval(() => {
        const newTimeRemaining = calculateTimeRemaining(miningStatus.miningUntil);
        setMiningStatus((prevStatus) => ({
          ...prevStatus,
          timeRemaining: newTimeRemaining,
          timeRemainingFormatted: formatTime(newTimeRemaining),
        }));

        if (newTimeRemaining <= 0 && miningStatus.miningActive) {
          localStorage.setItem('mining_completed', 'true');
          showNotification('PTC Mining Completed', {
            body: 'Mining has finished. You can now claim your reward!',
          });
        }
      }, 1000); // Cập nhật mỗi giây để đếm ngược mượt mà

      return () => clearInterval(interval);
    }
  }, [miningStatus.miningActive, miningStatus.miningCompleted, miningStatus.miningUntil]);

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
      const timeRemainingInSeconds = apiMiningStatus.timeRemaining || calculateTimeRemaining(apiMiningStatus.miningUntil);
      return {
        ...apiMiningStatus,
        timeRemainingFormatted: formatTime(timeRemainingInSeconds),
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
    referralId, // Trả về referral ID
  };
}