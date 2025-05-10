import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, push, update, remove, query, orderByChild, equalTo, limitToFirst } from 'firebase/database';
import { 
  users, type User, type InsertUser,
  miningStats, type MiningStats, type InsertMiningStats,
  miningHistory, type MiningHistory, type InsertMiningHistory,
  notificationSettings, type NotificationSettings, type InsertNotificationSettings,
  chatMessages, type ChatMessage, type InsertChatMessage,
  chatConversations, type ChatConversation, type InsertChatConversation
} from "@shared/schema";

// Firebase config (lấy từ biến môi trường)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  databaseURL: process.env.FIREBASE_DATABASE_URL
};

// Kiểm tra xem cấu hình có đầy đủ không
if (!firebaseConfig.databaseURL || !firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error("Missing Firebase configuration. Please check environment variables.");
}

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export interface IStorage {
  getUserById(id: number): Promise<User | undefined>;
  getUserByUid(uid: string): Promise<User | undefined>;
  getUserByReferralId(referralId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  getMiningStatsByUserId(userId: number): Promise<MiningStats | undefined>;
  createMiningStats(stats: InsertMiningStats): Promise<MiningStats>;
  updateMiningStats(userId: number, statsData: Partial<MiningStats>): Promise<MiningStats | undefined>;
  getMiningHistoryByUserId(userId: number, limit?: number): Promise<MiningHistory[]>;
  createMiningHistory(history: InsertMiningHistory): Promise<MiningHistory>;
  getNotificationSettingsByUserId(userId: number): Promise<NotificationSettings | undefined>;
  createNotificationSettings(settings: InsertNotificationSettings): Promise<NotificationSettings>;
  updateNotificationSettings(userId: number, settingsData: Partial<NotificationSettings>): Promise<NotificationSettings | undefined>;
  getChatConversationsByUserId(userId: number): Promise<ChatConversation[]>;
  getChatConversationById(id: number): Promise<ChatConversation | undefined>;
  createChatConversation(conversation: InsertChatConversation): Promise<ChatConversation>;
  updateChatConversation(id: number, data: Partial<ChatConversation>): Promise<ChatConversation | undefined>;
  deleteChatConversation(id: number): Promise<boolean>;
  getChatMessagesByConversationId(conversationId: string, limit?: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
}

export class RealtimeStorage implements IStorage {
  async getUserById(id: number): Promise<User | undefined> {
    const userRef = ref(db, `users/${id}`);
    const snapshot = await get(userRef);
    return snapshot.exists() ? (snapshot.val() as User) : undefined;
  }

  async getUserByUid(uid: string): Promise<User | undefined> {
    const usersRef = ref(db, 'users');
    const q = query(usersRef, orderByChild('uid'), equalTo(uid), limitToFirst(1));
    const snapshot = await get(q);
    const user = snapshot.val();
    return user ? Object.values(user)[0] as User : undefined;
  }

  async getUserByReferralId(referralId: string): Promise<User | undefined> {
    const usersRef = ref(db, 'users');
    const q = query(usersRef, orderByChild('referralId'), equalTo(referralId), limitToFirst(1));
    const snapshot = await get(q);
    const user = snapshot.val();
    return user ? Object.values(user)[0] as User : undefined;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = Date.now(); // Sử dụng timestamp làm ID
    const userRef = ref(db, `users/${id}`);
    const user: User = { ...userData, id, createdAt: new Date().toISOString() };
    await set(userRef, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const userRef = ref(db, `users/${id}`);
    const snapshot = await get(userRef);
    if (!snapshot.exists()) return undefined;
    await update(userRef, userData);
    const updatedSnapshot = await get(userRef);
    return updatedSnapshot.val() as User;
  }

  async getMiningStatsByUserId(userId: number): Promise<MiningStats | undefined> {
    const statsRef = ref(db, 'miningStats');
    const q = query(statsRef, orderByChild('userId'), equalTo(userId), limitToFirst(1));
    const snapshot = await get(q);
    const stats = snapshot.val();
    return stats ? Object.values(stats)[0] as MiningStats : undefined;
  }

  async createMiningStats(statsData: InsertMiningStats): Promise<MiningStats> {
    const newStatsRef = push(ref(db, 'miningStats'));
    const stats: MiningStats = { ...statsData, id: newStatsRef.key as string, updatedAt: new Date().toISOString() };
    await set(newStatsRef, stats);
    return stats;
  }

  async updateMiningStats(userId: number, statsData: Partial<MiningStats>): Promise<MiningStats | undefined> {
    const statsRef = ref(db, 'miningStats');
    const q = query(statsRef, orderByChild('userId'), equalTo(userId), limitToFirst(1));
    const snapshot = await get(q);
    if (!snapshot.exists()) return undefined;
    const statsKey = Object.keys(snapshot.val())[0];
    const statsRefToUpdate = ref(db, `miningStats/${statsKey}`);
    await update(statsRefToUpdate, { ...statsData, updatedAt: new Date().toISOString() });
    const updatedSnapshot = await get(statsRefToUpdate);
    return updatedSnapshot.val() as MiningStats;
  }

  async getMiningHistoryByUserId(userId: number, limit: number = 10): Promise<MiningHistory[]> {
    const historyRef = ref(db, 'miningHistory');
    const q = query(historyRef, orderByChild('userId'), equalTo(userId), limitToFirst(limit));
    const snapshot = await get(q);
    const history = snapshot.val();
    return history ? Object.values(history).sort((a, b) => (b.timestamp ? new Date(b.timestamp).getTime() : 0) - (a.timestamp ? new Date(a.timestamp).getTime() : 0)) as MiningHistory[] : [];
  }

  async createMiningHistory(historyData: InsertMiningHistory): Promise<MiningHistory> {
    const newHistoryRef = push(ref(db, 'miningHistory'));
    const history: MiningHistory = { ...historyData, id: newHistoryRef.key as string, timestamp: new Date().toISOString() };
    await set(newHistoryRef, history);
    return history;
  }

  async getNotificationSettingsByUserId(userId: number): Promise<NotificationSettings | undefined> {
    const settingsRef = ref(db, 'notificationSettings');
    const q = query(settingsRef, orderByChild('userId'), equalTo(userId), limitToFirst(1));
    const snapshot = await get(q);
    const settings = snapshot.val();
    return settings ? Object.values(settings)[0] as NotificationSettings : undefined;
  }

  async createNotificationSettings(settingsData: InsertNotificationSettings): Promise<NotificationSettings> {
    const newSettingsRef = push(ref(db, 'notificationSettings'));
    const settings: NotificationSettings = { ...settingsData, id: newSettingsRef.key as string, updatedAt: new Date().toISOString() };
    await set(newSettingsRef, settings);
    return settings;
  }

  async updateNotificationSettings(userId: number, settingsData: Partial<NotificationSettings>): Promise<NotificationSettings | undefined> {
    const settingsRef = ref(db, 'notificationSettings');
    const q = query(settingsRef, orderByChild('userId'), equalTo(userId), limitToFirst(1));
    const snapshot = await get(q);
    if (!snapshot.exists()) return undefined;
    const settingsKey = Object.keys(snapshot.val())[0];
    const settingsRefToUpdate = ref(db, `notificationSettings/${settingsKey}`);
    await update(settingsRefToUpdate, { ...settingsData, updatedAt: new Date().toISOString() });
    const updatedSnapshot = await get(settingsRefToUpdate);
    return updatedSnapshot.val() as NotificationSettings;
  }

  async getChatConversationsByUserId(userId: number): Promise<ChatConversation[]> {
    const conversationsRef = ref(db, 'chatConversations');
    const q = query(conversationsRef, orderByChild('userId'), equalTo(userId));
    const snapshot = await get(q);
    const conversations = snapshot.val();
    return conversations ? Object.values(conversations).sort((a, b) => (b.updatedAt ? new Date(b.updatedAt).getTime() : 0) - (a.updatedAt ? new Date(a.updatedAt).getTime() : 0)) as ChatConversation[] : [];
  }

  async getChatConversationById(id: number): Promise<ChatConversation | undefined> {
    const conversationRef = ref(db, `chatConversations/${id}`);
    const snapshot = await get(conversationRef);
    return snapshot.exists() ? (snapshot.val() as ChatConversation) : undefined;
  }

  async createChatConversation(conversationData: InsertChatConversation): Promise<ChatConversation> {
    const now = new Date().toISOString();
    const newConversationRef = push(ref(db, 'chatConversations'));
    const conversation: ChatConversation = { ...conversationData, id: newConversationRef.key as string, createdAt: now, updatedAt: now };
    await set(newConversationRef, conversation);
    return conversation;
  }

  async updateChatConversation(id: number, data: Partial<ChatConversation>): Promise<ChatConversation | undefined> {
    const conversationRef = ref(db, `chatConversations/${id}`);
    const snapshot = await get(conversationRef);
    if (!snapshot.exists()) return undefined;
    await update(conversationRef, { ...data, updatedAt: new Date().toISOString() });
    const updatedSnapshot = await get(conversationRef);
    return updatedSnapshot.val() as ChatConversation;
  }

  async deleteChatConversation(id: number): Promise<boolean> {
    const conversationRef = ref(db, `chatConversations/${id}`);
    await remove(conversationRef);
    return true;
  }

  async getChatMessagesByConversationId(conversationId: string, limit: number = 50): Promise<ChatMessage[]> {
    const messagesRef = ref(db, 'chatMessages');
    const q = query(messagesRef, orderByChild('conversationId'), equalTo(conversationId), limitToFirst(limit));
    const snapshot = await get(q);
    const messages = snapshot.val();
    return messages ? Object.values(messages).sort((a, b) => (a.timestamp ? new Date(a.timestamp).getTime() : 0) - (b.timestamp ? new Date(b.timestamp).getTime() : 0)) as ChatMessage[] : [];
  }

  async createChatMessage(messageData: InsertChatMessage): Promise<ChatMessage> {
    const newMessageRef = push(ref(db, 'chatMessages'));
    const message: ChatMessage = { ...messageData, id: newMessageRef.key as string, timestamp: new Date().toISOString() };
    await set(newMessageRef, message);

    const conversationRef = ref(db, `chatConversations/${messageData.conversationId}`);
    await update(conversationRef, { updatedAt: new Date().toISOString() });

    return message;
  }
}

export const storage = new RealtimeStorage();
