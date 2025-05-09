import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Send, Loader2, RefreshCw, ArrowLeft, Edit, Delete, MessageSquare, Bot } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Validation schemas
const UsernameSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username cannot exceed 20 characters"),
});

const MessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(5000, "Message is too long"),
});

const ConversationSchema = z.object({
  title: z.string().min(1, "Title cannot be empty").max(100, "Title is too long"),
});

// Chat Page Component
export default function Chat() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const [location, navigate] = useLocation();
  const [_, params] = useRoute("/chat/:id");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [message, setMessage] = useState("");
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);
  const [username, setUsername] = useState("");
  const [showConversationDialog, setShowConversationDialog] = useState(false);
  const [conversationTitle, setConversationTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [isMobileConversationsOpen, setIsMobileConversationsOpen] = useState(false);
  
  // Fetch conversations
  const { 
    data: conversations,
    isLoading: isLoadingConversations,
    error: conversationsError
  } = useQuery({
    queryKey: ['/api/chat/conversations'],
    enabled: !!user
  });
  
  // Fetch current conversation if ID is provided
  const conversationId = params?.id;
  const { 
    data: currentConversation,
    isLoading: isLoadingCurrentConversation,
    error: currentConversationError
  } = useQuery({
    queryKey: ['/api/chat/conversations', conversationId],
    enabled: !!user && !!conversationId
  });
  
  // Create new conversation
  const createConversationMutation = useMutation({
    mutationFn: async (data: { title: string }) => {
      const response = await apiRequest('POST', '/api/chat/conversations', data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations'] });
      navigate(`/chat/${data.id}`);
      setShowConversationDialog(false);
      setConversationTitle("");
    },
    onError: (error) => {
      toast({
        title: "Failed to create conversation",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  });
  
  // Update conversation title
  const updateConversationMutation = useMutation({
    mutationFn: async (data: { id: number, title: string }) => {
      const response = await apiRequest('PUT', `/api/chat/conversations/${data.id}`, { title: data.title });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations', conversationId] });
      setIsEditingTitle(false);
      setEditedTitle("");
    },
    onError: (error) => {
      toast({
        title: "Failed to update conversation",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  });
  
  // Delete conversation
  const deleteConversationMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/chat/conversations/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations'] });
      navigate('/chat');
    },
    onError: (error) => {
      toast({
        title: "Failed to delete conversation",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  });
  
  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string }) => {
      if (!conversationId) throw new Error("No conversation selected");
      const response = await apiRequest('POST', `/api/chat/conversations/${conversationId}/messages`, data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations', conversationId] });
      setMessage("");
    },
    onError: (error) => {
      toast({
        title: "Failed to send message",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  });
  
  // Save username
  const saveUsernameMutation = useMutation({
    mutationFn: async (data: { username: string }) => {
      const response = await apiRequest('POST', '/api/chat/username', data);
      return response.json();
    },
    onSuccess: (data) => {
      setShowUsernameDialog(false);
      toast({
        title: "Username saved",
        description: `Your username is now set to ${data.username}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to save username",
        description: "Please try again with a different username",
        variant: "destructive",
      });
    }
  });
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current && currentConversation?.messages) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentConversation?.messages]);
  
  // Check if user has a username
  useEffect(() => {
    if (user && !user.username && !isLoadingAuth) {
      setShowUsernameDialog(true);
    }
  }, [user, isLoadingAuth]);
  
  // Set conversation title when editing
  useEffect(() => {
    if (currentConversation?.conversation) {
      setEditedTitle(currentConversation.conversation.title);
    }
  }, [currentConversation?.conversation, isEditingTitle]);
  
  // Redirect if not logged in
  useEffect(() => {
    if (!isLoadingAuth && !user) {
      navigate("/");
    }
  }, [user, isLoadingAuth, navigate]);
  
  // Handlers
  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    try {
      MessageSchema.parse({ content: message });
      sendMessageMutation.mutate({ content: message });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid message",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };
  
  const handleSaveUsername = () => {
    try {
      UsernameSchema.parse({ username });
      saveUsernameMutation.mutate({ username });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid username",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };
  
  const handleCreateConversation = () => {
    try {
      ConversationSchema.parse({ title: conversationTitle });
      createConversationMutation.mutate({ title: conversationTitle });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid title",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };
  
  const handleUpdateConversationTitle = () => {
    if (!currentConversation?.conversation) return;
    
    try {
      ConversationSchema.parse({ title: editedTitle });
      updateConversationMutation.mutate({ 
        id: currentConversation.conversation.id, 
        title: editedTitle 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid title",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };
  
  const handleDeleteConversation = () => {
    if (!currentConversation?.conversation) return;
    
    if (confirm("Are you sure you want to delete this conversation?")) {
      deleteConversationMutation.mutate(currentConversation.conversation.id);
    }
  };
  
  // Render loading state
  if (isLoadingAuth) {
    return (
      <div className="flex justify-center items-center h-full py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // Render conversation list
  const renderConversationList = () => {
    if (isLoadingConversations) {
      return (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-2 hover:bg-gray-100 rounded-md">
              <Skeleton className="h-6 w-full mb-1" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      );
    }
    
    if (conversationsError) {
      return (
        <div className="text-center p-4 text-gray-500">
          <p>Failed to load conversations.</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations'] })}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      );
    }
    
    if (!conversations || conversations.length === 0) {
      return (
        <div className="text-center p-4 text-gray-500">
          <p>No conversations yet.</p>
          <p className="text-sm mt-1">Start a new chat!</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-1">
        {conversations.map((conversation: any) => (
          <Button
            key={conversation.id}
            variant={Number(conversationId) === conversation.id ? "default" : "ghost"}
            className="w-full justify-start px-2 py-2 h-auto text-left"
            onClick={() => {
              navigate(`/chat/${conversation.id}`);
              setIsMobileConversationsOpen(false);
            }}
          >
            <MessageSquare className="h-4 w-4 mr-2 shrink-0" />
            <span className="truncate">{conversation.title}</span>
          </Button>
        ))}
      </div>
    );
  };
  
  // Render messages
  const renderMessages = () => {
    if (isLoadingCurrentConversation) {
      return (
        <div className="space-y-4 p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <div className={`flex gap-3 max-w-[80%] ${i % 2 === 0 ? 'items-start' : 'items-end flex-row-reverse'}`}>
                <Skeleton className="h-8 w-8 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-16 w-60" />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    if (currentConversationError) {
      return (
        <div className="text-center p-4 text-gray-500 h-full flex flex-col items-center justify-center">
          <p>Failed to load conversation.</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations', conversationId] })}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      );
    }
    
    if (!currentConversation || !currentConversation.messages || currentConversation.messages.length === 0) {
      return (
        <div className="text-center p-4 text-gray-500 h-full flex flex-col items-center justify-center">
          <Bot className="h-12 w-12 text-gray-400 mb-2" />
          <p>No messages yet.</p>
          <p className="text-sm mt-1">Start the conversation by typing a message below.</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4 p-4">
        {currentConversation.messages.map((message: any) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'items-end flex-row-reverse' : 'items-start'}`}>
              <Avatar className="h-8 w-8">
                {message.role === 'user' ? (
                  <AvatarImage src={user?.photoURL || ""} alt="User" />
                ) : (
                  <AvatarImage src="/bot-avatar.png" alt="AI Assistant" />
                )}
                <AvatarFallback>{message.role === 'user' ? 'U' : 'AI'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-gray-500 mb-1">
                  {message.role === 'user' ? user?.username || user?.displayName : 'AI Assistant'}
                </p>
                <div className={`p-3 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    );
  };
  
  return (
    <main className="flex-grow pb-16 flex flex-col">
      <div className="flex h-[calc(100vh-8rem)]">
        {/* Desktop sidebar */}
        <div className="w-64 border-r border-gray-200 hidden md:block overflow-y-auto">
          <div className="p-4">
            <Button 
              variant="default" 
              className="w-full mb-4"
              onClick={() => setShowConversationDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
            
            {renderConversationList()}
          </div>
        </div>
        
        {/* Mobile top bar with conversation list button */}
        <div className="md:hidden border-b border-gray-200 p-2 flex items-center">
          <SheetTrigger asChild onClick={() => setIsMobileConversationsOpen(true)}>
            <Button variant="outline" size="icon" className="mr-2">
              <MessageSquare className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          
          <h1 className="text-lg font-semibold flex-1 truncate">
            {currentConversation?.conversation?.title || "AI Chat"}
          </h1>
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowConversationDialog(true)}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Mobile conversation list sheet */}
        <Sheet open={isMobileConversationsOpen} onOpenChange={setIsMobileConversationsOpen}>
          <SheetContent side="left" className="w-[80%] sm:w-[350px]">
            <SheetHeader>
              <SheetTitle>Conversations</SheetTitle>
              <SheetDescription>
                Select a conversation or start a new one.
              </SheetDescription>
            </SheetHeader>
            
            <div className="mt-4">
              <Button 
                variant="default" 
                className="w-full mb-4"
                onClick={() => {
                  setShowConversationDialog(true);
                  setIsMobileConversationsOpen(false);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Chat
              </Button>
              
              {renderConversationList()}
            </div>
          </SheetContent>
        </Sheet>
        
        {/* Main chat area */}
        <div className="flex-1 flex flex-col h-full max-h-full overflow-hidden">
          {/* Conversation header */}
          {currentConversation?.conversation && (
            <div className="border-b border-gray-200 p-3 flex items-center justify-between bg-white hidden md:flex">
              {isEditingTitle ? (
                <div className="flex-1 flex items-center">
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="mr-2"
                    autoFocus
                  />
                  <Button 
                    size="sm" 
                    onClick={handleUpdateConversationTitle}
                    disabled={updateConversationMutation.isPending}
                  >
                    {updateConversationMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : "Save"}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setIsEditingTitle(false)}
                    className="ml-1"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <h1 className="text-lg font-semibold flex-1 truncate">
                  {currentConversation.conversation.title}
                </h1>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-more-vertical">
                      <circle cx="12" cy="12" r="1"/>
                      <circle cx="12" cy="5" r="1"/>
                      <circle cx="12" cy="19" r="1"/>
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsEditingTitle(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Title
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive" 
                    onClick={handleDeleteConversation}
                  >
                    <Delete className="h-4 w-4 mr-2" />
                    Delete Chat
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          
          {/* Messages container */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            {!conversationId ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Bot className="h-16 w-16 mb-4 text-primary/50" />
                <h2 className="text-2xl font-bold mb-2">AI Chat Assistant</h2>
                <p className="text-gray-500 mb-6 max-w-md">
                  Start a new conversation to chat with our AI assistant about PTC mining, cryptocurrencies, or any other topic.
                </p>
                <Button onClick={() => setShowConversationDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Conversation
                </Button>
              </div>
            ) : (
              renderMessages()
            )}
          </div>
          
          {/* Message input */}
          {conversationId && (
            <div className="border-t border-gray-200 p-3 bg-white">
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1"
                  disabled={sendMessageMutation.isPending}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!message.trim() || sendMessageMutation.isPending}
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Username Dialog */}
      <Dialog open={showUsernameDialog} onOpenChange={setShowUsernameDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Your Username</DialogTitle>
            <DialogDescription>
              Choose a username so others know who you are in the chat.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center space-x-2 my-4">
            <Input
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          
          <DialogFooter>
            <Button 
              onClick={handleSaveUsername}
              disabled={!username || saveUsernameMutation.isPending}
            >
              {saveUsernameMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : "Save Username"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* New Conversation Dialog */}
      <Dialog open={showConversationDialog} onOpenChange={setShowConversationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
            <DialogDescription>
              Give your conversation a title to help you find it later.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center space-x-2 my-4">
            <Input
              placeholder="Conversation title"
              value={conversationTitle}
              onChange={(e) => setConversationTitle(e.target.value)}
            />
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowConversationDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateConversation}
              disabled={!conversationTitle || createConversationMutation.isPending}
            >
              {createConversationMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}