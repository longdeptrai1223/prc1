import { apiRequest } from "./queryClient";
import { queryClient } from "./queryClient";

// Format time in HH:MM:SS format
export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0')
  ].join(':');
};

// Format date in human-readable format
export const formatDate = (date: Date | string): string => {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

// Format date and time in human-readable format
export const formatDateTime = (date: Date | string): string => {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
};

// Start mining operation
export const startMining = async () => {
  try {
    const response = await apiRequest('POST', '/api/mining/start', {});
    queryClient.invalidateQueries({ queryKey: ['/api/mining/stats'] });
    return response.json();
  } catch (error) {
    console.error('Error starting mining:', error);
    throw error;
  }
};

// Claim mining rewards
export const claimMining = async () => {
  try {
    const response = await apiRequest('POST', '/api/mining/claim', {});
    queryClient.invalidateQueries({ queryKey: ['/api/mining/stats'] });
    queryClient.invalidateQueries({ queryKey: ['/api/mining/history'] });
    return response.json();
  } catch (error) {
    console.error('Error claiming mining rewards:', error);
    throw error;
  }
};

// Apply ad boost
export const applyAdBoost = async () => {
  try {
    const response = await apiRequest('POST', '/api/mining/ad-boost', {});
    queryClient.invalidateQueries({ queryKey: ['/api/mining/stats'] });
    return response.json();
  } catch (error) {
    console.error('Error applying ad boost:', error);
    throw error;
  }
};

// Apply referral code
export const applyReferralCode = async (referralId: string) => {
  try {
    const response = await apiRequest('POST', '/api/referral/validate', { referralId });
    queryClient.invalidateQueries({ queryKey: ['/api/mining/stats'] });
    return response.json();
  } catch (error) {
    console.error('Error applying referral code:', error);
    throw error;
  }
};

// Calculate time remaining for mining
export const calculateTimeRemaining = (miningUntil: string | Date | null): number => {
  if (!miningUntil) return 0;
  
  const endTime = new Date(miningUntil).getTime();
  const now = new Date().getTime();
  const remaining = Math.max(0, endTime - now);
  
  return Math.floor(remaining / 1000);
};

// Calculate time remaining for ad boost
export const calculateAdBoostTimeRemaining = (adBoostUntil: string | Date | null): number => {
  if (!adBoostUntil) return 0;
  
  const endTime = new Date(adBoostUntil).getTime();
  const now = new Date().getTime();
  const remaining = Math.max(0, endTime - now);
  
  return Math.floor(remaining / 1000);
};

// Format ad boost time remaining in human-readable format
export const formatAdBoostTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return '0h remaining';
  
  const hours = Math.floor(seconds / 3600);
  
  if (hours > 0) {
    return `${hours}h remaining`;
  }
  
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${minutes}m remaining`;
};

// Calculate mining progress percentage
export const calculateMiningProgress = (miningUntil: string | Date | null): number => {
  if (!miningUntil) return 0;
  
  const totalDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  const endTime = new Date(miningUntil).getTime();
  const now = new Date().getTime();
  const elapsed = totalDuration - Math.max(0, endTime - now);
  
  return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
};

// Calculate ad boost progress percentage
export const calculateAdBoostProgress = (adBoostUntil: string | Date | null): number => {
  if (!adBoostUntil) return 0;
  
  const maxDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  const endTime = new Date(adBoostUntil).getTime();
  const now = new Date().getTime();
  const remaining = Math.max(0, endTime - now);
  
  return Math.min(100, Math.max(0, (remaining / maxDuration) * 100));
};

// Calculate referral progress percentage
export const calculateReferralProgress = (referralCount: number): number => {
  const maxReferrals = 20;
  return Math.min(100, Math.max(0, (referralCount / maxReferrals) * 100));
};
