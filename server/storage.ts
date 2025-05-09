import { 
  users, type User, type InsertUser,
  miningStats, type MiningStats, type InsertMiningStats,
  miningHistory, type MiningHistory, type InsertMiningHistory,
  notificationSettings, type NotificationSettings, type InsertNotificationSettings,
  chatMessages, type ChatMessage, type InsertChatMessage,
  chatConversations, type ChatConversation, type InsertChatConversation
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
  
  // Chat operations
  getChatConversationsByUserId(userId: number): Promise<ChatConversation[]>;
  getChatConversationById(id: number): Promise<ChatConversation | undefined>;
  createChatConversation(conversation: InsertChatConversation): Promise<ChatConversation>;
  updateChatConversation(id: number, data: Partial<ChatConversation>): Promise<ChatConversation | undefined>;
  deleteChatConversation(id: number): Promise<boolean>;
  
  // Chat message operations
  getChatMessagesByConversationId(conversationId: string, limit?: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
}

// Memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private miningStats: Map<number, MiningStats>;
  private miningHistory: MiningHistory[];
  private notificationSettings: Map<number, NotificationSettings>;
  private chatConversations: Map<number, ChatConversation>;
  private chatMessages: ChatMessage[];
  
  private userIdCounter: number;
  private miningStatsIdCounter: number;
  private miningHistoryIdCounter: number;
  private notificationSettingsIdCounter: number;
  private chatConversationsIdCounter: number;
  private chatMessagesIdCounter: number;

  constructor() {
    this.users = new Map();
    this.miningStats = new Map();
    this.miningHistory = [];
    this.notificationSettings = new Map();
    this.chatConversations = new Map();
    this.chatMessages = [];
    
    this.userIdCounter = 1;
    this.miningStatsIdCounter = 1;
    this.miningHistoryIdCounter = 1;
    this.notificationSettingsIdCounter = 1;
    this.chatConversationsIdCounter = 1;
    this.chatMessagesIdCounter = 1;
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
      .sort((a, b) => {
        if (a.timestamp && b.timestamp) {
          return b.timestamp.getTime() - a.timestamp.getTime();
        }
        return 0;
      })
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
  
  // Chat conversations operations
  async getChatConversationsByUserId(userId: number): Promise<ChatConversation[]> {
    return Array.from(this.chatConversations.values())
      .filter(conversation => conversation.userId === userId)
      .sort((a, b) => {
        if (a.updatedAt && b.updatedAt) {
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        }
        return 0;
      });
  }
  
  async getChatConversationById(id: number): Promise<ChatConversation | undefined> {
    return this.chatConversations.get(id);
  }
  
  async createChatConversation(conversationData: InsertChatConversation): Promise<ChatConversation> {
    const id = this.chatConversationsIdCounter++;
    const now = new Date();
    
    const conversation: ChatConversation = {
      ...conversationData,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    this.chatConversations.set(id, conversation);
    return conversation;
  }
  
  async updateChatConversation(id: number, data: Partial<ChatConversation>): Promise<ChatConversation | undefined> {
    const conversation = this.chatConversations.get(id);
    if (!conversation) return undefined;
    
    const updatedConversation = {
      ...conversation,
      ...data,
      updatedAt: new Date()
    };
    
    this.chatConversations.set(id, updatedConversation);
    return updatedConversation;
  }
  
  async deleteChatConversation(id: number): Promise<boolean> {
    return this.chatConversations.delete(id);
  }
  
  // Chat messages operations
  async getChatMessagesByConversationId(conversationId: string, limit: number = 50): Promise<ChatMessage[]> {
    return this.chatMessages
      .filter(message => message.conversationId === conversationId)
      .sort((a, b) => {
        if (a.timestamp && b.timestamp) {
          return a.timestamp.getTime() - b.timestamp.getTime();
        }
        return 0;
      })
      .slice(0, limit);
  }
  
  async createChatMessage(messageData: InsertChatMessage): Promise<ChatMessage> {
    const id = this.chatMessagesIdCounter++;
    
    const message: ChatMessage = {
      ...messageData,
      id,
      timestamp: new Date()
    };
    
    this.chatMessages.push(message);
    
    // Also update the conversation's updatedAt timestamp
    const conversationId = Number(this.chatConversations.entries().next().value?.[0]);
    if (conversationId) {
      const conversation = await this.getChatConversationById(conversationId);
      if (conversation) {
        await this.updateChatConversation(conversationId, {});
      }
    }
    
    return message;
  }
}

// Export storage instance
export const storage = new MemStorage();
