import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertUserSchema, 
  insertMiningStatsSchema, 
  insertMiningHistorySchema, 
  insertNotificationSettingsSchema,
  insertChatMessageSchema,
  insertChatConversationSchema
} from "@shared/schema";
import { nanoid } from "nanoid";

// Fallback responses for chat
const generateAIResponse = (message: string) => {
  const fallbackResponses = [
    "Hello! How can I help you today?",
    "That's an interesting question. What made you think of that?",
    "I understand your concern. Let me know more about your situation.",
    "Thanks for sharing that information. Is there anything else you'd like to discuss?",
    "I'm designed to provide information and assistance with PTC mining. What would you like to know?",
    "I'm here to help with any questions or concerns about mining PTC.",
    "That's a great point! I appreciate your perspective.",
    "Let me know if you need any clarification about PTC mining.",
    "I can help explain more about this topic if you're interested.",
    "Your question is important. I'll do my best to address it properly."
  ];
  
  return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
};

// Authentication middleware
const authenticate = async (req: Request, res: Response, next: () => void) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }
  
  try {
    const user = await storage.getUserByUid(token);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Public routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUid(userData.uid);
      if (existingUser) {
        return res.status(200).json(existingUser);
      }
      
      const referralId = nanoid(8);
      const user = await storage.createUser({
        ...userData,
        referralId
      });
      
      await storage.createMiningStats({
        userId: user.id,
        totalMined: 0,
        currentRate: 0.1,
        miningActive: false,
        lastMined: null,
        miningUntil: null,
        adBoostActive: false,
        adBoostUntil: null,
        referralCount: 0,
        referralMultiplier: 1.0
      });
      
      await storage.createNotificationSettings({
        userId: user.id,
        enabled: true,
        token: null
      });
      
      res.status(201).json(user);
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(400).json({ error: 'Invalid user data' });
    }
  });

  // Protected routes (require authentication)
  app.get('/api/mining/status', authenticate, async (req, res) => {
    try {
      const user = (req as any).user;
      const stats = await storage.getMiningStatsByUserId(user.id);
      if (!stats) {
        return res.status(404).json({ error: 'Mining stats not found' });
      }

      const now = new Date();
      const miningActive = stats.miningActive && (!stats.miningUntil || now < stats.miningUntil);
      const timeRemaining = stats.miningUntil ? Math.max(0, (new Date(stats.miningUntil).getTime() - now.getTime()) / 1000) : 0;
      const progress = stats.miningUntil ? Math.min(100, Math.max(0, ((24 * 60 * 60 * 1000 - (new Date(stats.miningUntil).getTime() - now.getTime())) / (24 * 60 * 60 * 1000)) * 100)) : 0;
      const miningCompleted = !miningActive && stats.miningUntil && now >= stats.miningUntil;

      res.status(200).json({
        miningActive,
        miningUntil: stats.miningUntil,
        miningCompleted,
        timeRemaining,
        progress
      });
    } catch (error) {
      console.error('Error fetching mining status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/user/profile', authenticate, async (req, res) => {
    const user = (req as any).user;
    res.status(200).json(user);
  });
  
  app.get('/api/mining/stats', authenticate, async (req, res) => {
    const user = (req as any).user;
    const stats = await storage.getMiningStatsByUserId(user.id);
    if (!stats) {
      return res.status(404).json({ error: 'Mining stats not found' });
    }
    res.status(200).json(stats);
  });
  
  app.post('/api/mining/start', authenticate, async (req, res) => {
    const user = (req as any).user;
    
    let stats = await storage.getMiningStatsByUserId(user.id);
    if (!stats) {
      return res.status(404).json({ error: 'Mining stats not found' });
    }
    
    const now = new Date();
    const miningUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const updatedStats = await storage.updateMiningStats(user.id, {
      miningActive: true,
      lastMined: now,
      miningUntil
    });
    
    res.status(200).json(updatedStats);
  });
  
  app.post('/api/mining/claim', authenticate, async (req, res) => {
    const user = (req as any).user;
    
    let stats = await storage.getMiningStatsByUserId(user.id);
    if (!stats) {
      return res.status(404).json({ error: 'Mining stats not found' });
    }
    
    if (!stats.miningActive) {
      return res.status(400).json({ error: 'Mining is not active' });
    }
    
    const now = new Date();
    if (stats.miningUntil && now < stats.miningUntil) {
      return res.status(400).json({ 
        error: 'Mining is still in progress',
        timeRemaining: stats.miningUntil.getTime() - now.getTime()
      });
    }
    
    let baseAmount = 0.1; // Base mining rate
    let referralMultiplier = stats.referralMultiplier || 1.0;
    let adBoostMultiplier = 1.0;
    if (stats.adBoostActive && stats.adBoostUntil && stats.adBoostUntil > now) {
      adBoostMultiplier = 5.0;
    }
    
    const totalMultiplier = Math.min(10.0, referralMultiplier * adBoostMultiplier);
    const totalEarned = baseAmount * totalMultiplier;
    
    const updatedStats = await storage.updateMiningStats(user.id, {
      miningActive: false,
      totalMined: stats.totalMined + totalEarned,
      lastMined: now,
      miningUntil: null
    });
    
    await storage.createMiningHistory({
      userId: user.id,
      amount: totalEarned,
      type: 'mining'
    });
    
    res.status(200).json({
      earned: totalEarned,
      stats: updatedStats
    });
  });
  
  app.post('/api/mining/ad-boost', authenticate, async (req, res) => {
    const user = (req as any).user;
    
    let stats = await storage.getMiningStatsByUserId(user.id);
    if (!stats) {
      return res.status(404).json({ error: 'Mining stats not found' });
    }
    
    const now = new Date();
    let adBoostUntil = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    if (stats.adBoostActive && stats.adBoostUntil && stats.adBoostUntil > now) {
      adBoostUntil = new Date(stats.adBoostUntil.getTime() + 2 * 60 * 60 * 1000);
      const maxBoostTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      if (adBoostUntil > maxBoostTime) {
        adBoostUntil = maxBoostTime;
      }
    }
    
    const updatedStats = await storage.updateMiningStats(user.id, {
      adBoostActive: true,
      adBoostUntil
    });
    
    res.status(200).json(updatedStats);
  });
  
  app.get('/api/mining/history', authenticate, async (req, res) => {
    const user = (req as any).user;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    const history = await storage.getMiningHistoryByUserId(user.id, limit);
    res.status(200).json(history);
  });
  
  app.post('/api/referral/validate', authenticate, async (req, res) => {
    try {
      const user = (req as any).user;
      const { referralId } = z.object({ referralId: z.string() }).parse(req.body);
      
      if (user.referralId === referralId) {
        return res.status(400).json({ error: 'Cannot use your own referral code' });
      }
      
      const referringUser = await storage.getUserByReferralId(referralId);
      if (!referringUser) {
        return res.status(404).json({ error: 'Invalid referral code' });
      }
      
      if (user.referredBy) {
        return res.status(400).json({ error: 'You already have a referrer' });
      }
      
      await storage.updateUser(user.id, {
        referredBy: referralId
      });
      
      const referrerStats = await storage.getMiningStatsByUserId(referringUser.id);
      if (referrerStats) {
        const referralCount = referrerStats.referralCount + 1;
        const referralMultiplier = Math.min(2.0, 1.0 + (referralCount * 0.1));
        
        await storage.updateMiningStats(referringUser.id, {
          referralCount,
          referralMultiplier
        });
        
        await storage.createMiningHistory({
          userId: referringUser.id,
          amount: 0.05,
          type: 'referral'
        });
      }
      
      res.status(200).json({ success: true, message: 'Referral applied successfully' });
    } catch (error) {
      console.error('Error validating referral:', error);
      res.status(400).json({ error: 'Invalid referral data' });
    }
  });
  
  app.post('/api/notifications/register', authenticate, async (req, res) => {
    try {
      const user = (req as any).user;
      const { token } = z.object({ token: z.string() }).parse(req.body);
      
      const settings = await storage.getNotificationSettingsByUserId(user.id);
      if (settings) {
        await storage.updateNotificationSettings(user.id, { token, enabled: true });
      } else {
        await storage.createNotificationSettings({
          userId: user.id,
          enabled: true,
          token
        });
      }
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error registering for notifications:', error);
      res.status(400).json({ error: 'Invalid notification data' });
    }
  });
  
  app.post('/api/notifications/toggle', authenticate, async (req, res) => {
    try {
      const user = (req as any).user;
      const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);
      
      const settings = await storage.getNotificationSettingsByUserId(user.id);
      if (settings) {
        const updatedSettings = await storage.updateNotificationSettings(user.id, { enabled });
        res.status(200).json(updatedSettings);
      } else {
        res.status(404).json({ error: 'Notification settings not found' });
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      res.status(400).json({ error: 'Invalid notification data' });
    }
  });

  // Chat routes
  app.get('/api/chat/conversations', authenticate, async (req, res) => {
    try {
      const user = (req as any).user;
      const conversations = await storage.getChatConversationsByUserId(user.id);
      res.status(200).json(conversations);
    } catch (error) {
      console.error('Error fetching chat conversations:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  });
  
  app.post('/api/chat/conversations', authenticate, async (req, res) => {
    try {
      const user = (req as any).user;
      const { title } = insertChatConversationSchema.parse(req.body);
      
      const conversation = await storage.createChatConversation({
        userId: user.id,
        title
      });
      
      res.status(201).json(conversation);
    } catch (error) {
      console.error('Error creating chat conversation:', error);
      res.status(400).json({ error: 'Invalid conversation data' });
    }
  });
  
  app.get('/api/chat/conversations/:id', authenticate, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getChatConversationById(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      const user = (req as any).user;
      if (conversation.userId !== user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const messages = await storage.getChatMessagesByConversationId(conversationId.toString());
      
      res.status(200).json({
        conversation,
        messages
      });
    } catch (error) {
      console.error('Error fetching conversation:', error);
      res.status(500).json({ error: 'Failed to fetch conversation' });
    }
  });
  
  app.put('/api/chat/conversations/:id', authenticate, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { title } = z.object({ title: z.string() }).parse(req.body);
      
      const conversation = await storage.getChatConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      const user = (req as any).user;
      if (conversation.userId !== user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const updatedConversation = await storage.updateChatConversation(conversationId, { title });
      
      res.status(200).json(updatedConversation);
    } catch (error) {
      console.error('Error updating conversation:', error);
      res.status(400).json({ error: 'Invalid conversation data' });
    }
  });
  
  app.delete('/api/chat/conversations/:id', authenticate, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      
      const conversation = await storage.getChatConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      const user = (req as any).user;
      if (conversation.userId !== user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      await storage.deleteChatConversation(conversationId);
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      res.status(500).json({ error: 'Failed to delete conversation' });
    }
  });
  
  app.post('/api/chat/conversations/:id/messages', authenticate, async (req, res) => {
    try {
      const conversationId = req.params.id;
      const { content } = insertChatMessageSchema.omit({ userId: true, conversationId: true, role: true }).parse(req.body);
      
      const user = (req as any).user;
      
      const conversation = await storage.getChatConversationById(parseInt(conversationId));
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      if (conversation.userId !== user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const userMessage = await storage.createChatMessage({
        userId: user.id,
        conversationId,
        content,
        role: 'user'
      });
      
      const aiResponse = generateAIResponse(content);
      
      const aiResponseObj = await storage.createChatMessage({
        userId: user.id,
        conversationId,
        content: aiResponse,
        role: 'assistant'
      });
      
      res.status(201).json({
        userMessage,
        aiMessage: aiResponse
      });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(400).json({ error: 'Invalid message data' });
    }
  });
  
  app.post('/api/chat/username', authenticate, async (req, res) => {
    try {
      const user = (req as any).user;
      const { username } = z.object({ username: z.string().min(3).max(20) }).parse(req.body);
      
      const updatedUser = await storage.updateUser(user.id, { username });
      
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error('Error updating username:', error);
      res.status(400).json({ error: 'Invalid username' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
