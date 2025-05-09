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
// We'll use a simpler approach instead of OpenAI for chat responses
const generateAIResponse = (message: string) => {
  // Fallback responses for chat
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
const authenticate = async (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // In a real implementation, we would verify the Firebase token
  // For this demo, we'll just check if there's a user with that UID
  const user = await storage.getUserByUid(token);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Add user to request object
  (req as any).user = user;
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Public routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUid(userData.uid);
      if (existingUser) {
        return res.status(200).json(existingUser);
      }
      
      // Generate unique referral ID
      const referralId = nanoid(8);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        referralId
      });
      
      // Initialize mining stats
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
      
      // Initialize notification settings
      await storage.createNotificationSettings({
        userId: user.id,
        enabled: true,
        token: null
      });
      
      res.status(201).json(user);
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(400).json({ message: 'Invalid user data' });
    }
  });

  // Protected routes (require authentication)
  app.get('/api/user/profile', authenticate, async (req, res) => {
    const user = (req as any).user;
    res.status(200).json(user);
  });
  
  app.get('/api/mining/stats', authenticate, async (req, res) => {
    const user = (req as any).user;
    const stats = await storage.getMiningStatsByUserId(user.id);
    if (!stats) {
      return res.status(404).json({ message: 'Mining stats not found' });
    }
    res.status(200).json(stats);
  });
  
  app.post('/api/mining/start', authenticate, async (req, res) => {
    const user = (req as any).user;
    
    // Get user's current mining stats
    let stats = await storage.getMiningStatsByUserId(user.id);
    if (!stats) {
      return res.status(404).json({ message: 'Mining stats not found' });
    }
    
    // Calculate mining time (24 hours)
    const now = new Date();
    const miningUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Update mining stats
    const updatedStats = await storage.updateMiningStats(user.id, {
      miningActive: true,
      lastMined: now,
      miningUntil
    });
    
    res.status(200).json(updatedStats);
  });
  
  app.post('/api/mining/claim', authenticate, async (req, res) => {
    const user = (req as any).user;
    
    // Get user's current mining stats
    let stats = await storage.getMiningStatsByUserId(user.id);
    if (!stats) {
      return res.status(404).json({ message: 'Mining stats not found' });
    }
    
    // Check if mining is active
    if (!stats.miningActive) {
      return res.status(400).json({ message: 'Mining is not active' });
    }
    
    // Check if mining time has passed
    const now = new Date();
    if (stats.miningUntil && now < stats.miningUntil) {
      return res.status(400).json({ 
        message: 'Mining is still in progress',
        timeRemaining: stats.miningUntil.getTime() - now.getTime()
      });
    }
    
    // Calculate earned amount (base rate * multipliers)
    let baseAmount = 0.1; // Base mining rate
    
    // Apply referral multiplier
    let referralMultiplier = stats.referralMultiplier || 1.0;
    
    // Apply ad boost multiplier if active
    let adBoostMultiplier = 1.0;
    if (stats.adBoostActive && stats.adBoostUntil && stats.adBoostUntil > now) {
      adBoostMultiplier = 5.0;
    }
    
    // Total multiplier should not exceed x10
    const totalMultiplier = Math.min(10.0, referralMultiplier * adBoostMultiplier);
    const totalEarned = baseAmount * totalMultiplier;
    
    // Update mining stats
    const updatedStats = await storage.updateMiningStats(user.id, {
      miningActive: false,
      totalMined: stats.totalMined + totalEarned,
      lastMined: now,
      miningUntil: null
    });
    
    // Create mining history
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
    
    // Get user's current mining stats
    let stats = await storage.getMiningStatsByUserId(user.id);
    if (!stats) {
      return res.status(404).json({ message: 'Mining stats not found' });
    }
    
    // Calculate ad boost time (current + 2 hours)
    const now = new Date();
    let adBoostUntil = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    // If already has a boost, add on top (up to 24h max)
    if (stats.adBoostActive && stats.adBoostUntil && stats.adBoostUntil > now) {
      adBoostUntil = new Date(stats.adBoostUntil.getTime() + 2 * 60 * 60 * 1000);
      
      // Cap at 24h max from now
      const maxBoostTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      if (adBoostUntil > maxBoostTime) {
        adBoostUntil = maxBoostTime;
      }
    }
    
    // Update mining stats
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
      
      // Prevent self-referral
      if (user.referralId === referralId) {
        return res.status(400).json({ message: 'Cannot use your own referral code' });
      }
      
      // Check if referral ID exists
      const referringUser = await storage.getUserByReferralId(referralId);
      if (!referringUser) {
        return res.status(404).json({ message: 'Invalid referral code' });
      }
      
      // Check if user already has a referrer
      if (user.referredBy) {
        return res.status(400).json({ message: 'You already have a referrer' });
      }
      
      // Update user's referredBy field
      await storage.updateUser(user.id, {
        referredBy: referralId
      });
      
      // Get referrer's mining stats
      const referrerStats = await storage.getMiningStatsByUserId(referringUser.id);
      if (referrerStats) {
        // Increase referral count
        const referralCount = referrerStats.referralCount + 1;
        
        // Calculate new multiplier (0.1 increment per referral, max 2.0)
        // 1.0 base + (referralCount * 0.1), capped at 2.0
        const referralMultiplier = Math.min(2.0, 1.0 + (referralCount * 0.1));
        
        // Update referrer's mining stats
        await storage.updateMiningStats(referringUser.id, {
          referralCount,
          referralMultiplier
        });
        
        // Add referral bonus to history
        await storage.createMiningHistory({
          userId: referringUser.id,
          amount: 0.05, // Small bonus for getting a referral
          type: 'referral'
        });
      }
      
      res.status(200).json({ success: true, message: 'Referral applied successfully' });
    } catch (error) {
      console.error('Error validating referral:', error);
      res.status(400).json({ message: 'Invalid referral data' });
    }
  });
  
  app.post('/api/notifications/register', authenticate, async (req, res) => {
    try {
      const user = (req as any).user;
      const { token } = z.object({ token: z.string() }).parse(req.body);
      
      // Update notification settings
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
      res.status(400).json({ message: 'Invalid notification data' });
    }
  });
  
  app.post('/api/notifications/toggle', authenticate, async (req, res) => {
    try {
      const user = (req as any).user;
      const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);
      
      // Update notification settings
      const settings = await storage.getNotificationSettingsByUserId(user.id);
      if (settings) {
        const updatedSettings = await storage.updateNotificationSettings(user.id, { enabled });
        res.status(200).json(updatedSettings);
      } else {
        res.status(404).json({ message: 'Notification settings not found' });
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      res.status(400).json({ message: 'Invalid notification data' });
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
      res.status(500).json({ message: 'Failed to fetch conversations' });
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
      res.status(400).json({ message: 'Invalid conversation data' });
    }
  });
  
  app.get('/api/chat/conversations/:id', authenticate, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getChatConversationById(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      // Check if conversation belongs to user
      const user = (req as any).user;
      if (conversation.userId !== user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const messages = await storage.getChatMessagesByConversationId(conversationId.toString());
      
      res.status(200).json({
        conversation,
        messages
      });
    } catch (error) {
      console.error('Error fetching conversation:', error);
      res.status(500).json({ message: 'Failed to fetch conversation' });
    }
  });
  
  app.put('/api/chat/conversations/:id', authenticate, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { title } = z.object({ title: z.string() }).parse(req.body);
      
      const conversation = await storage.getChatConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      // Check if conversation belongs to user
      const user = (req as any).user;
      if (conversation.userId !== user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const updatedConversation = await storage.updateChatConversation(conversationId, { title });
      
      res.status(200).json(updatedConversation);
    } catch (error) {
      console.error('Error updating conversation:', error);
      res.status(400).json({ message: 'Invalid conversation data' });
    }
  });
  
  app.delete('/api/chat/conversations/:id', authenticate, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      
      const conversation = await storage.getChatConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      // Check if conversation belongs to user
      const user = (req as any).user;
      if (conversation.userId !== user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      await storage.deleteChatConversation(conversationId);
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      res.status(500).json({ message: 'Failed to delete conversation' });
    }
  });
  
  app.post('/api/chat/conversations/:id/messages', authenticate, async (req, res) => {
    try {
      const conversationId = req.params.id;
      const { content } = insertChatMessageSchema.omit({ userId: true, conversationId: true, role: true }).parse(req.body);
      
      const user = (req as any).user;
      
      // Check if conversation exists and belongs to user
      const conversation = await storage.getChatConversationById(parseInt(conversationId));
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      if (conversation.userId !== user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Create user message
      const userMessage = await storage.createChatMessage({
        userId: user.id,
        conversationId,
        content,
        role: 'user'
      });
      
      // Generate AI response using our simple function
      const aiResponse = generateAIResponse(content);
      
      // Save AI response
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
      res.status(400).json({ message: 'Invalid message data' });
    }
  });
  
  app.post('/api/chat/username', authenticate, async (req, res) => {
    try {
      const user = (req as any).user;
      const { username } = z.object({ username: z.string().min(3).max(20) }).parse(req.body);
      
      // Update username
      const updatedUser = await storage.updateUser(user.id, { username });
      
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error('Error updating username:', error);
      res.status(400).json({ message: 'Invalid username' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
