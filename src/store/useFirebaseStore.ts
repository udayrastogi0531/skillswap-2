// src/store/useFirebaseStore.ts
"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { User, Skill, SwapRequest, Rating, Message, Conversation, Notification, MessageType, MessageAttachment, MessageReaction } from "@/types";
import { 
  userService, 
  skillService, 
  swapRequestService, 
  ratingService, 
  messageService,
  notificationService,
  enhancedMessageService
} from "@/lib/firestore";

interface FirebaseState {
  // Users
  users: User[];
  currentUserProfile: User | null;
  isLoadingUsers: boolean;

  // Skills
  userSkills: { offered: Skill[]; wanted: Skill[] };
  isLoadingSkills: boolean;

  // Swap Requests
  swapRequests: SwapRequest[];
  adminRequests: SwapRequest[]; // For admin dashboard
  isLoadingRequests: boolean;

  // Messages
  conversations: Conversation[];
  messages: { [conversationId: string]: Message[] };
  activeConversation: string | null;
  isLoadingMessages: boolean;

  // Notifications
  notifications: Notification[];
  unreadNotificationCount: number;
  isLoadingNotifications: boolean;

  // Search & Filters
  searchQuery: string;
  selectedCategory: string;
  selectedLocation: string;
  searchResults: User[];

  // Admin data
  flaggedContent: any[];
  systemMessages: any[];
  isLoadingAdminData: boolean;

  // Error handling
  error: string | null;

  // Actions
  // User actions
  loadUsers: (searchQuery?: string, category?: string, location?: string) => Promise<void>;
  loadAllUsers: (searchQuery?: string, category?: string, location?: string) => Promise<void>; // Admin-only: loads all users
  loadCurrentUserProfile: (userId: string) => Promise<void>;
  updateUserProfile: (userId: string, updates: Partial<User>) => Promise<void>;
  searchUsers: (query?: string, category?: string, location?: string) => Promise<void>;

  // Skill actions
  loadUserSkills: (userId: string, type?: "offered" | "wanted") => Promise<void>;
  addSkill: (userId: string, skill: Omit<Skill, "id">, type: "offered" | "wanted") => Promise<void>;
  removeSkill: (userId: string, skillId: string, type: "offered" | "wanted") => Promise<void>;

  // Swap request actions
  loadSwapRequests: (userId: string, type?: "incoming" | "outgoing") => Promise<void>;
  createSwapRequest: (requestData: Omit<SwapRequest, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateSwapRequestStatus: (requestId: string, status: SwapRequest["status"], adminNotes?: string) => Promise<void>;
  loadAllSwapRequests: (status?: SwapRequest["status"], priority?: string) => Promise<void>; // For admin
  loadAdminRequests: () => Promise<void>; // Alias for loadAllSwapRequests

  // Rating actions
  addRating: (ratingData: Omit<Rating, "id" | "createdAt">) => Promise<void>;
  loadUserRatings: (userId: string) => Promise<Rating[]>;

  // Message actions
  loadConversations: (userId: string) => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, senderId: string, content: string) => Promise<void>;
  createConversation: (participants: string[], swapRequestId?: string) => Promise<string>;
  setActiveConversation: (conversationId: string | null) => void;

  // Search & Filter actions
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  setSelectedLocation: (location: string) => void;
  clearFilters: () => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;

  // Admin actions
  loadFlaggedContent: () => Promise<void>;
  handleFlaggedContent: (flagId: string, action: 'approve' | 'reject') => Promise<void>;
  banUser: (userId: string, reason: string) => Promise<void>;
  unbanUser: (userId: string) => Promise<void>;
  sendBroadcastMessage: (message: string, type: 'info' | 'warning' | 'success') => Promise<void>;
  subscribeToAdminData: () => () => void; // Returns unsubscribe function

  // Notification actions
  loadNotifications: () => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  subscribeToNotifications: () => () => void;
  getUnreadNotificationCount: () => number;

  // Enhanced message methods
  sendEnhancedMessage: (conversationId: string, content: string, type?: MessageType, attachments?: MessageAttachment[], replyTo?: string) => Promise<void>;
  addMessageReaction: (messageId: string, emoji: string) => Promise<void>;
  removeMessageReaction: (messageId: string, emoji: string) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  markMessagesAsRead: (conversationId: string, messageIds: string[]) => Promise<void>;

  // Reset
  reset: () => void;
}

const initialState = {
  users: [],
  currentUserProfile: null,
  isLoadingUsers: false,
  userSkills: { offered: [], wanted: [] },
  isLoadingSkills: false,
  swapRequests: [],
  adminRequests: [],
  isLoadingRequests: false,
  conversations: [],
  messages: {},
  activeConversation: null,
  isLoadingMessages: false,
  notifications: [],
  unreadNotificationCount: 0,
  isLoadingNotifications: false,
  searchQuery: "",
  selectedCategory: "",
  selectedLocation: "",
  searchResults: [],
  error: null,
  flaggedContent: [],
  systemMessages: [],
  isLoadingAdminData: false,
};

export const useFirebaseStore = create<FirebaseState>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // User actions
      loadUsers: async (searchQuery, category, location) => {
        try {
          set({ isLoadingUsers: true, error: null });
          // Always show only verified users for public contexts (explore page)
          const users = await userService.searchUsers(searchQuery, category, location);
          set({ users, searchResults: users });
        } catch (error: any) {
          console.error("Error loading users:", error);
          set({ error: error.message || "Failed to load users" });
        } finally {
          set({ isLoadingUsers: false });
        }
      },

      // Admin-only: Load all users regardless of verification status and including banned users
      loadAllUsers: async (searchQuery, category, location) => {
        try {
          set({ isLoadingUsers: true, error: null });
          // Use searchAllUsersIncludingBanned for admin dashboard - shows ALL users including banned ones
          const users = await userService.searchAllUsersIncludingBanned(searchQuery, category, location);
          set({ users, searchResults: users });
        } catch (error: any) {
          console.error("Error loading all users:", error);
          set({ error: error.message || "Failed to load users" });
        } finally {
          set({ isLoadingUsers: false });
        }
      },

      loadCurrentUserProfile: async (userId) => {
        try {
          set({ error: null });
          const profile = await userService.getUserProfile(userId);
          set({ currentUserProfile: profile });
        } catch (error: any) {
          console.error("Error loading user profile:", error);
          set({ error: error.message || "Failed to load profile" });
        }
      },

      updateUserProfile: async (userId, updates) => {
        try {
          set({ error: null });
          await userService.updateUserProfile(userId, updates);
          
          // Update local state
          set((state) => {
            if (state.currentUserProfile?.id === userId) {
              state.currentUserProfile = { ...state.currentUserProfile, ...updates };
            }
            
            const userIndex = state.users.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
              state.users[userIndex] = { ...state.users[userIndex], ...updates };
            }
          });
        } catch (error: any) {
          console.error("Error updating user profile:", error);
          set({ error: error.message || "Failed to update profile" });
        }
      },

      searchUsers: async (query, category, location) => {
        try {
          set({ isLoadingUsers: true, error: null });
          // Always show only verified users for public search (explore page)
          const users = await userService.searchUsers(query, category, location);
          set({ searchResults: users });
        } catch (error: any) {
          console.error("Error searching users:", error);
          set({ error: error.message || "Failed to search users" });
        } finally {
          set({ isLoadingUsers: false });
        }
      },

      // Skill actions
      loadUserSkills: async (userId, type) => {
        try {
          set({ isLoadingSkills: true, error: null });
          const skills = await skillService.getUserSkills(userId, type);
          
          set((state) => {
            if (type === "offered") {
              state.userSkills.offered = skills;
            } else if (type === "wanted") {
              state.userSkills.wanted = skills;
            } else {
              // Load both            // Note: Skills categorization will be handled in user profile
            state.userSkills.offered = skills;
            state.userSkills.wanted = [];
            }
          });
        } catch (error: any) {
          console.error("Error loading user skills:", error);
          set({ error: error.message || "Failed to load skills" });
        } finally {
          set({ isLoadingSkills: false });
        }
      },

      addSkill: async (userId, skill, type) => {
        try {
          set({ error: null });
          const skillId = await skillService.addSkillToUser(userId, skill, type);
          
          // Update local state
          const newSkill = { ...skill, id: skillId, userId, type };
          set((state) => {
            if (type === "offered") {
              state.userSkills.offered.push(newSkill);
            } else {
              state.userSkills.wanted.push(newSkill);
            }
          });
        } catch (error: any) {
          console.error("Error adding skill:", error);
          set({ error: error.message || "Failed to add skill" });
        }
      },

      removeSkill: async (userId, skillId, type) => {
        try {
          set({ error: null });
          await skillService.removeSkillFromUser(userId, skillId, type);
          
          // Update local state
          set((state) => {
            if (type === "offered") {
              state.userSkills.offered = state.userSkills.offered.filter(s => s.id !== skillId);
            } else {
              state.userSkills.wanted = state.userSkills.wanted.filter(s => s.id !== skillId);
            }
          });
        } catch (error: any) {
          console.error("Error removing skill:", error);
          set({ error: error.message || "Failed to remove skill" });
        }
      },

      // Swap request actions
      loadSwapRequests: async (userId, type) => {
        try {
          set({ isLoadingRequests: true, error: null });
          const requests = await swapRequestService.getUserSwapRequests(userId, type);
          set({ swapRequests: requests });
        } catch (error: any) {
          console.error("Error loading swap requests:", error);
          set({ error: error.message || "Failed to load requests" });
        } finally {
          set({ isLoadingRequests: false });
        }
      },

      createSwapRequest: async (requestData) => {
        try {
          set({ error: null });
          const requestId = await swapRequestService.createSwapRequest(requestData);
          
          // Add to local state
          const newRequest = {
            ...requestData,
            id: requestId,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          
          set((state) => {
            state.swapRequests.push(newRequest);
          });
        } catch (error: any) {
          console.error("Error creating swap request:", error);
          set({ error: error.message || "Failed to create request" });
        }
      },

      updateSwapRequestStatus: async (requestId, status, adminNotes) => {
        try {
          set({ error: null });
          await swapRequestService.updateSwapRequestStatus(requestId, status, adminNotes);
          
          // Update local state
          set((state) => {
            const requestIndex = state.swapRequests.findIndex(r => r.id === requestId);
            if (requestIndex !== -1) {
              state.swapRequests[requestIndex].status = status;
              state.swapRequests[requestIndex].updatedAt = Date.now();
              if (adminNotes) {
                state.swapRequests[requestIndex].adminNotes = adminNotes;
              }
            }
            
            const adminRequestIndex = state.adminRequests.findIndex(r => r.id === requestId);
            if (adminRequestIndex !== -1) {
              state.adminRequests[adminRequestIndex].status = status;
              state.adminRequests[adminRequestIndex].updatedAt = Date.now();
              if (adminNotes) {
                state.adminRequests[adminRequestIndex].adminNotes = adminNotes;
              }
            }
          });
        } catch (error: any) {
          console.error("Error updating swap request:", error);
          set({ error: error.message || "Failed to update request" });
        }
      },

      loadAllSwapRequests: async (status, priority) => {
        try {
          set({ isLoadingRequests: true, error: null });
          const requests = await swapRequestService.getAllSwapRequests(status, priority);
          set({ adminRequests: requests });
        } catch (error: any) {
          console.error("Error loading admin requests:", error);
          set({ error: error.message || "Failed to load admin requests" });
        } finally {
          set({ isLoadingRequests: false });
        }
      },

      loadAdminRequests: async () => {
        try {
          set({ isLoadingRequests: true, error: null });
          const requests = await swapRequestService.getAllSwapRequests();
          set({ adminRequests: requests });
        } catch (error: any) {
          console.error("Error loading admin requests:", error);
          set({ error: error.message || "Failed to load admin requests" });
        } finally {
          set({ isLoadingRequests: false });
        }
      },

      // Rating actions
      addRating: async (ratingData) => {
        try {
          set({ error: null });
          await ratingService.addRating(ratingData);
        } catch (error: any) {
          console.error("Error adding rating:", error);
          set({ error: error.message || "Failed to add rating" });
        }
      },

      loadUserRatings: async (userId) => {
        try {
          set({ error: null });
          const ratings = await ratingService.getUserRatings(userId);
          return ratings;
        } catch (error: any) {
          console.error("Error loading ratings:", error);
          set({ error: error.message || "Failed to load ratings" });
          return [];
        }
      },

      // Message actions
      loadConversations: async (userId) => {
        try {
          set({ isLoadingMessages: true, error: null });
          const conversations = await messageService.getUserConversations(userId);
          set({ conversations });
        } catch (error: any) {
          console.error("Error loading conversations:", error);
          set({ error: error.message || "Failed to load conversations" });
        } finally {
          set({ isLoadingMessages: false });
        }
      },

      loadMessages: async (conversationId) => {
        try {
          set({ error: null });
          const messages = await messageService.getConversationMessages(conversationId);
          set((state) => {
            state.messages[conversationId] = messages;
          });
        } catch (error: any) {
          console.error("Error loading messages:", error);
          set({ error: error.message || "Failed to load messages" });
        }
      },

      sendMessage: async (conversationId, senderId, content) => {
        try {
          set({ error: null });
          const messageId = await messageService.sendMessage(conversationId, senderId, content);
          
          // Add to local state
          const newMessage = {
            id: messageId,
            conversationId,
            senderId,
            content,
            timestamp: Date.now(),
            read: false,
            type: 'text' as const,
            attachments: [],
            reactions: [],
            replyTo: undefined,
            edited: false,
            deletedAt: undefined
          };
          
          set((state) => {
            if (!state.messages[conversationId]) {
              state.messages[conversationId] = [];
            }
            state.messages[conversationId].push(newMessage);
          });
        } catch (error: any) {
          console.error("Error sending message:", error);
          set({ error: error.message || "Failed to send message" });
        }
      },

      createConversation: async (participants, swapRequestId) => {
        try {
          set({ error: null });
          const conversationId = await messageService.createConversation(participants, swapRequestId);
          
          // Add to local state
          const newConversation = {
            id: conversationId,
            participants,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastMessage: undefined,
            type: 'direct' as const,
            title: undefined,
            metadata: {}
          };
          
          set((state) => {
            state.conversations.push(newConversation);
          });
          
          return conversationId;
        } catch (error: any) {
          console.error("Error creating conversation:", error);
          set({ error: error.message || "Failed to create conversation" });
          throw error;
        }
      },

      setActiveConversation: (conversationId) => {
        set({ activeConversation: conversationId });
      },

      // Search & Filter actions
      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      setSelectedCategory: (category) => {
        set({ selectedCategory: category });
      },

      setSelectedLocation: (location) => {
        set({ selectedLocation: location });
      },

      clearFilters: () => {
        set({
          searchQuery: "",
          selectedCategory: "",
          selectedLocation: "",
          searchResults: []
        });
      },

      // Error handling
      setError: (error) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      // Admin actions
      loadFlaggedContent: async () => {
        try {
          set({ isLoadingAdminData: true, error: null });
          const flaggedContent = await userService.getFlaggedContent();
          set({ flaggedContent });
        } catch (error: any) {
          console.error("Error loading flagged content:", error);
          set({ error: error.message || "Failed to load flagged content" });
        } finally {
          set({ isLoadingAdminData: false });
        }
      },

      handleFlaggedContent: async (flagId, action) => {
        try {
          set({ error: null });
          await userService.handleFlaggedContent(flagId, action);
          
          // Update local state
          set((state) => {
            state.flaggedContent = state.flaggedContent.filter(f => f.id !== flagId);
          });
        } catch (error: any) {
          console.error("Error handling flagged content:", error);
          set({ error: error.message || "Failed to handle flagged content" });
        }
      },

      banUser: async (userId, reason) => {
        try {
          set({ error: null });
          await userService.banUser(userId, reason);
          
          // Update local state
          set((state) => {
            const userIndex = state.users.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
              state.users[userIndex].isBanned = true;
            }
          });
        } catch (error: any) {
          console.error("Error banning user:", error);
          set({ error: error.message || "Failed to ban user" });
        }
      },

      unbanUser: async (userId) => {
        try {
          set({ error: null });
          await userService.unbanUser(userId);
          
          // Update local state
          set((state) => {
            const userIndex = state.users.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
              state.users[userIndex].isBanned = false;
            }
          });
        } catch (error: any) {
          console.error("Error unbanning user:", error);
          set({ error: error.message || "Failed to unban user" });
        }
      },

      sendBroadcastMessage: async (message, type) => {
        try {
          set({ error: null });
          await userService.sendBroadcastMessage(message, type);
        } catch (error: any) {
          console.error("Error sending broadcast message:", error);
          set({ error: error.message || "Failed to send broadcast message" });
        }
      },

      subscribeToAdminData: () => {
        return userService.subscribeToAdminData((data) => {
          set({ flaggedContent: data.flaggedContent, systemMessages: data.systemMessages });
        });
      },

      // Notification actions
      loadNotifications: async () => {
        try {
          set({ isLoadingNotifications: true, error: null });
          const state = get();
          if (!state.currentUserProfile?.id) return;
          
          const notifications = await notificationService.getUserNotifications(state.currentUserProfile.id);
          set({ notifications });
        } catch (error: any) {
          console.error("Error loading notifications:", error);
          set({ error: error.message || "Failed to load notifications" });
        } finally {
          set({ isLoadingNotifications: false });
        }
      },

      markNotificationAsRead: async (notificationId) => {
        try {
          set({ error: null });
          await notificationService.markNotificationAsRead(notificationId);
          
          // Update local state
          set((state) => {
            const notification = state.notifications.find(n => n.id === notificationId);
            if (notification) {
              notification.read = true;
            }
          });
        } catch (error: any) {
          console.error("Error marking notification as read:", error);
          set({ error: error.message || "Failed to mark notification as read" });
        }
      },

      markAllNotificationsAsRead: async () => {
        try {
          set({ error: null });
          const state = get();
          if (!state.currentUserProfile?.id) return;
          
          await notificationService.markAllNotificationsAsRead(state.currentUserProfile.id);
          
          // Update local state
          set((state) => {
            state.notifications.forEach(n => {
              n.read = true;
            });
          });
        } catch (error: any) {
          console.error("Error marking all notifications as read:", error);
          set({ error: error.message || "Failed to mark all notifications as read" });
        }
      },

      deleteNotification: async (notificationId) => {
        try {
          set({ error: null });
          await notificationService.deleteNotification(notificationId);
          
          // Update local state
          set((state) => {
            state.notifications = state.notifications.filter(n => n.id !== notificationId);
          });
        } catch (error: any) {
          console.error("Error deleting notification:", error);
          set({ error: error.message || "Failed to delete notification" });
        }
      },

      subscribeToNotifications: () => {
        const state = get();
        if (!state.currentUserProfile?.id) return () => {};
        
        return notificationService.subscribeToUserNotifications(state.currentUserProfile.id, (notifications: Notification[]) => {
          set({ notifications });
        });
      },

      getUnreadNotificationCount: () => {
        return get().notifications.filter(n => !n.read).length;
      },

      // Enhanced message methods
      sendEnhancedMessage: async (conversationId, content, type, attachments, replyTo) => {
        try {
          set({ error: null });
          const messageId = await enhancedMessageService.sendMessage(conversationId, get().currentUserProfile?.id || "", content, type, attachments, replyTo);
          
          // Add to local state
          const newMessage = {
            id: messageId,
            conversationId,
            senderId: get().currentUserProfile?.id || "",
            content,
            timestamp: Date.now(),
            read: false,
            type: type || 'text',
            attachments: attachments || [],
            reactions: [],
            replyTo,
            edited: false,
            deletedAt: undefined
          };
          
          set((state) => {
            if (!state.messages[conversationId]) {
              state.messages[conversationId] = [];
            }
            state.messages[conversationId].push(newMessage);
          });
        } catch (error: any) {
          console.error("Error sending enhanced message:", error);
          set({ error: error.message || "Failed to send enhanced message" });
        }
      },

      addMessageReaction: async (messageId, emoji) => {
        try {
          set({ error: null });
          const state = get();
          if (!state.currentUserProfile?.id) throw new Error("User not authenticated");
          
          await enhancedMessageService.addMessageReaction(messageId, emoji, state.currentUserProfile.id);
          
          // Local state will be updated via subscription
        } catch (error: any) {
          console.error("Error adding message reaction:", error);
          set({ error: error.message || "Failed to add message reaction" });
        }
      },

      removeMessageReaction: async (messageId, emoji) => {
        try {
          set({ error: null });
          const state = get();
          if (!state.currentUserProfile?.id) throw new Error("User not authenticated");
          
          await enhancedMessageService.removeMessageReaction(messageId, emoji, state.currentUserProfile.id);
          
          // Local state will be updated via subscription
        } catch (error: any) {
          console.error("Error removing message reaction:", error);
          set({ error: error.message || "Failed to remove message reaction" });
        }
      },

      editMessage: async (messageId, newContent) => {
        try {
          set({ error: null });
          await enhancedMessageService.editMessage(messageId, newContent);
          
          // Update local state
          set((state) => {
            const message = state.messages[Object.keys(state.messages).find(convoId => {
              return state.messages[convoId].find(msg => msg.id === messageId);
            })!]?.find(msg => msg.id === messageId);
            
            if (message) {
              message.content = newContent;
              message.edited = true;
            }
          });
        } catch (error: any) {
          console.error("Error editing message:", error);
          set({ error: error.message || "Failed to edit message" });
        }
      },

      deleteMessage: async (messageId) => {
        try {
          set({ error: null });
          await enhancedMessageService.deleteMessage(messageId);
          
          // Update local state
          set((state) => {
            Object.keys(state.messages).forEach(convoId => {
              state.messages[convoId] = state.messages[convoId].filter(msg => msg.id !== messageId);
            });
          });
        } catch (error: any) {
          console.error("Error deleting message:", error);
          set({ error: error.message || "Failed to delete message" });
        }
      },

      markMessagesAsRead: async (conversationId, messageIds) => {
        try {
          set({ error: null });
          const state = get();
          if (!state.currentUserProfile?.id) throw new Error("User not authenticated");
          
          await enhancedMessageService.markConversationAsRead(conversationId, state.currentUserProfile.id);
          
          // Local state will be updated via subscription
        } catch (error: any) {
          console.error("Error marking messages as read:", error);
          set({ error: error.message || "Failed to mark messages as read" });
        }
      },

      // Reset
      reset: () => {
        set(initialState);
      }
    })),
    {
      name: "firebase-store",
      enabled: process.env.NODE_ENV === "development",
    }
  )
);
