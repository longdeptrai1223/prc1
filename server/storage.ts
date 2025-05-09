import { 
  users, type User, type InsertUser,
  miningStats, type MiningStats, type InsertMiningStats,
  miningHistory, type MiningHistory, type InsertMiningHistory,
  notificationSettings, type NotificationSettings, type InsertNotificationSettings
} from "@shared/schema";
import { nanoid } from "nanoid";

// Storage interface
export interface IStorage {
  // User operations
  getUserById(id: number): Promise<User | undefined>;
  getUserByUid(uid: string): Promise<User | undefined>;
  getUserByReferralId(referralId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;

  // Mining stats operations
  getMiningStatsByUserId(userId: number): Promise<MiningStats | undefined>;
  createMiningStats(stats: InsertMiningStats): Promise<MiningStats>;
  updateMiningStats(userId: number, statsData: Partial<MiningStats>): Promise<MiningStats | undefined>;

  // Mining history operations
  getMiningHistoryByUserId(userId: number, limit?: number): Promise<MiningHistory[]>;
  createMiningHistory(history: InsertMiningHistory): Promise<MiningHistory>;

  // Notification settings operations
  getNotificationSettingsByUserId(userId: number): Promise<NotificationSettings | undefined>;
  createNotificationSettings(settings: InsertNotificationSettings): Promise<NotificationSettings>;
  updateNotificationSettings(userId: number, settingsData: Partial<NotificationSettings>): Promise<NotificationSettings | undefined>;
}

// Memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private miningStats: Map<number, MiningStats>;
  private miningHistory: MiningHistory[];
  private notificationSettings: Map<number, NotificationSettings>;
  
  private userIdCounter: number;
  private miningStatsIdCounter: number;
  private miningHistoryIdCounter: number;
  private notificationSettingsIdCounter: number;

  constructor() {
    this.users = new Map();
    this.miningStats = new Map();
    this.miningHistory = [];
    this.notificationSettings = new Map();
    
    this.userIdCounter = 1;
    this.miningStatsIdCounter = 1;
    this.miningHistoryIdCounter = 1;
    this.notificationSettingsIdCounter = 1;
  }

  // User operations
  async getUserById(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUid(uid: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.uid === uid);
  }

  async getUserByReferralId(referralId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.referralId === referralId);
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { 
      ...userData, 
      id,
      createdAt: new Date()
    };
    
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Mining stats operations
  async getMiningStatsByUserId(userId: number): Promise<MiningStats | undefined> {
    return Array.from(this.miningStats.values()).find(stats => stats.userId === userId);
  }

  async createMiningStats(statsData: InsertMiningStats): Promise<MiningStats> {
    const id = this.miningStatsIdCounter++;
    const stats: MiningStats = {
      ...statsData,
      id,
      updatedAt: new Date()
    };
    
    this.miningStats.set(id, stats);
    return stats;
  }

  async updateMiningStats(userId: number, statsData: Partial<MiningStats>): Promise<MiningStats | undefined> {
    const stats = Array.from(this.miningStats.values()).find(stats => stats.userId === userId);
    if (!stats) return undefined;
    
    const updatedStats = { 
      ...stats, 
      ...statsData, 
      updatedAt: new Date() 
    };
    
    this.miningStats.set(stats.id, updatedStats);
    return updatedStats;
  }

  // Mining history operations
  async getMiningHistoryByUserId(userId: number, limit: number = 10): Promise<MiningHistory[]> {
    return this.miningHistory
      .filter(history => history.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async createMiningHistory(historyData: InsertMiningHistory): Promise<MiningHistory> {
    const id = this.miningHistoryIdCounter++;
    const history: MiningHistory = {
      ...historyData,
      id,
      timestamp: new Date()
    };
    
    this.miningHistory.push(history);
    return history;
  }

  // Notification settings operations
  async getNotificationSettingsByUserId(userId: number): Promise<NotificationSettings | undefined> {
    return Array.from(this.notificationSettings.values()).find(settings => settings.userId === userId);
  }

  async createNotificationSettings(settingsData: InsertNotificationSettings): Promise<NotificationSettings> {
    const id = this.notificationSettingsIdCounter++;
    const settings: NotificationSettings = {
      ...settingsData,
      id,
      updatedAt: new Date()
    };
    
    this.notificationSettings.set(id, settings);
    return settings;
  }

  async updateNotificationSettings(userId: number, settingsData: Partial<NotificationSettings>): Promise<NotificationSettings | undefined> {
    const settings = Array.from(this.notificationSettings.values()).find(settings => settings.userId === userId);
    if (!settings) return undefined;
    
    const updatedSettings = { 
      ...settings, 
      ...settingsData, 
      updatedAt: new Date() 
    };
    
    this.notificationSettings.set(settings.id, updatedSettings);
    return updatedSettings;
  }
}

// Export storage instance
export const storage = new MemStorage();
