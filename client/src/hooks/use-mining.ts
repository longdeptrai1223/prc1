import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { queryClient } from '@/lib/queryClient';
import { showRewardedAd } from '@/lib/admob';
import { 
  startMining, 
  claimMining, 
  applyAdBoost,
  calculateTimeRemaining,
  calculateAdBoostTimeRemaining,
  calculateMiningProgress,
  calculateAdBoostProgress,
  formatTime
} from '@/lib/mining';

export function useMining() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [timeRemaining, setTimeRemaining] = useState<string>("00:00:00");
  const [miningProgress, setMiningProgress] = useState<number>(0);
  const [adBoostTimeRemaining, setAdBoostTimeRemaining] = useState<number>(0);
  const [adBoostProgress, setAdBoostProgress] = useState<number>(0);
  
  // Fetch mining stats
  const { 
    data: miningStats, 
    isLoading: isLoadingMiningStats,
    error: miningStatsError 
  } = useQuery({
    queryKey: ['/api/mining/stats'],
    enabled: !!user,
  });

  // Start mining mutation
  const startMiningMutation = useMutation({
    mutationFn: startMining,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mining/stats'] });
      toast({
        title: "Mining Started",
        description: "You are now mining PTC",
      });
    },
    onError: (error) => {
      toast({
        title: "Mining Failed",
        description: "Could not start mining",
        variant: "destructive",
      });
      console.error("Mining start error:", error);
    },
  });

  // Claim mining rewards mutation
  const claimMiningMutation = useMutation({
    mutationFn: claimMining,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/mining/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mining/history'] });
      toast({
        title: "Mining Rewards Claimed",
        description: `Earned ${data.earned.toFixed(2)} PTC`,
      });
    },
    onError: (error: any) => {
      if (error.message?.includes("Mining is still in progress")) {
        toast({
          title: "Mining In Progress",
          description: "Mining is still in progress. Please wait until it completes.",
          variant: "warning",
        });
      } else {
        toast({
          title: "Claim Failed",
          description: "Could not claim mining rewards",
          variant: "destructive",
        });
      }
      console.error("Mining claim error:", error);
    },
  });

  // Ad boost mutation
  const adBoostMutation = useMutation({
    mutationFn: async () => {
      // First show the ad
      const adWatched = await showRewardedAd();
      if (adWatched) {
        // Then apply the boost
        return applyAdBoost();
      }
      throw new Error("Ad did not complete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mining/stats'] });
      toast({
        title: "Mining Boost Applied",
        description: "Your mining rate has been boosted for 2 hours",
      });
    },
    onError: (error) => {
      toast({
        title: "Boost Failed",
        description: "Could not apply mining boost",
        variant: "destructive",
      });
      console.error("Ad boost error:", error);
    },
  });

  // Update timer and progress
  useEffect(() => {
    if (!miningStats) return;

    const interval = setInterval(() => {
      if (miningStats.miningActive && miningStats.miningUntil) {
        const seconds = calculateTimeRemaining(miningStats.miningUntil);
        setTimeRemaining(formatTime(seconds));
        setMiningProgress(calculateMiningProgress(miningStats.miningUntil));
        
        // If mining just finished, refresh stats
        if (seconds <= 0) {
          queryClient.invalidateQueries({ queryKey: ['/api/mining/stats'] });
        }
      }

      if (miningStats.adBoostActive && miningStats.adBoostUntil) {
        const seconds = calculateAdBoostTimeRemaining(miningStats.adBoostUntil);
        setAdBoostTimeRemaining(seconds);
        setAdBoostProgress(calculateAdBoostProgress(miningStats.adBoostUntil));
        
        // If boost just expired, refresh stats
        if (seconds <= 0) {
          queryClient.invalidateQueries({ queryKey: ['/api/mining/stats'] });
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [miningStats]);

  return {
    miningStats,
    isLoadingMiningStats,
    miningStatsError,
    startMining: startMiningMutation.mutate,
    isStartingMining: startMiningMutation.isPending,
    claimMining: claimMiningMutation.mutate,
    isClaimingMining: claimMiningMutation.isPending,
    watchRewardedAd: adBoostMutation.mutate,
    isWatchingAd: adBoostMutation.isPending,
    timeRemaining,
    miningProgress,
    adBoostTimeRemaining,
    adBoostProgress,
  };
}
