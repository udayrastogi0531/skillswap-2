// lib/firestore.ts
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  Unsubscribe
} from "firebase/firestore";
import { db } from "./firebase";
import type { User, Skill, SwapRequest, Rating, Message, Conversation, Notification, NotificationType, MessageType, MessageAttachment, MessageReaction, ConversationType } from "@/types";

// Collection references
const COLLECTIONS = {
  USERS: "users",
  SKILLS: "skills", 
  SWAP_REQUESTS: "swapRequests",
  RATINGS: "ratings",
  CONVERSATIONS: "conversations",
  MESSAGES: "messages"
} as const;

// User Management
export const userService = {
  // Create user profile
  async createUserProfile(userId: string, userData: Partial<User>) {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const profileData = {
      ...userData,
      uid: userId,
      id: userId,
      name: userData.displayName || userData.name || '',
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      skillsOffered: [],
      skillsWanted: [],
      rating: 0,
      reviewCount: 0,
      totalSwaps: 0,
      isVerified: false
    };
    
    await setDoc(userRef, profileData);
    return profileData;
  },

  // Get user profile
  async getUserProfile(userId: string): Promise<User | null> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() } as User;
    }
    return null;
  },

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<User>) {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  },

  // Search users by skills or location
  async searchUsers(searchQuery?: string, skillCategory?: string, location?: string, verifiedOnly: boolean = true) {
    let q = query(collection(db, COLLECTIONS.USERS), limit(20));

    // Apply filters one at a time to avoid complex queries
    if (skillCategory) {
      q = query(q, where("skillsOffered.category", "array-contains", skillCategory));
    }

    if (location) {
      q = query(q, where("location", ">=", location), where("location", "<=", location + "\uf8ff"));
    }

    const querySnapshot = await getDocs(q);
    let users = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as User[];

    // Filter in memory to avoid complex Firestore queries
    users = users.filter(user => {
      // Filter out banned users
      if (user.isBanned === true) {
        return false;
      }
      
      // Filter for verified users only if required
      if (verifiedOnly && user.isVerified !== true) {
        return false;
      }
      
      return true;
    });

    // Load skills for each user
    for (const user of users) {
      const skillsQuery = query(
        collection(db, COLLECTIONS.SKILLS),
        where("userId", "==", user.id)
      );
      const skillsSnapshot = await getDocs(skillsQuery);
      const skills = skillsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (Skill & { type: 'offered' | 'wanted'; userId: string })[];
      
      user.skillsOffered = skills.filter(skill => skill.type === 'offered');
      user.skillsWanted = skills.filter(skill => skill.type === 'wanted');
    }

    // Sort by rating since we can't use orderBy with multiple where clauses
    return users.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  },

  // Admin-only: Search all users (including unverified and banned)
  async searchAllUsers(searchQuery?: string, skillCategory?: string, location?: string) {
    return this.searchUsers(searchQuery, skillCategory, location, false);
  },

  // Admin-only: Search all users including banned users for user management
  async searchAllUsersIncludingBanned(searchQuery?: string, skillCategory?: string, location?: string) {
    // Get base users query
    let usersQuery = query(collection(db, COLLECTIONS.USERS));
    
    const querySnapshot = await getDocs(usersQuery);
    let users = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as User[];

    // Apply search filters without excluding banned users
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      users = users.filter(user => 
        user.displayName?.toLowerCase().includes(lowerQuery) ||
        user.bio?.toLowerCase().includes(lowerQuery) ||
        user.location?.toLowerCase().includes(lowerQuery)
      );
    }

    if (location) {
      users = users.filter(user => 
        user.location?.toLowerCase().includes(location.toLowerCase())
      );
    }

    // Load skills for each user
    for (const user of users) {
      const skillsQuery = query(
        collection(db, COLLECTIONS.SKILLS),
        where("userId", "==", user.id)
      );
      const skillsSnapshot = await getDocs(skillsQuery);
      const skills = skillsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (Skill & { type: 'offered' | 'wanted'; userId: string })[];
      
      user.skillsOffered = skills.filter(skill => skill.type === 'offered');
      user.skillsWanted = skills.filter(skill => skill.type === 'wanted');

      // Apply skill category filter if specified
      if (skillCategory) {
        const hasMatchingSkill = [...(user.skillsOffered || []), ...(user.skillsWanted || [])]
          .some(skill => skill.category?.id === skillCategory);
        if (!hasMatchingSkill) {
          continue;
        }
      }
    }

    // Filter by skill category after loading skills
    if (skillCategory) {
      users = users.filter(user => {
        const allSkills = [...(user.skillsOffered || []), ...(user.skillsWanted || [])];
        return allSkills.some(skill => skill.category?.id === skillCategory);
      });
    }

    // Sort by rating
    return users.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  },

  // Admin Methods
  async getFlaggedContent() {
    const q = query(
      collection(db, "flaggedContent"),
      orderBy("reportedAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  async handleFlaggedContent(flagId: string, action: 'approve' | 'reject') {
    const flagRef = doc(db, "flaggedContent", flagId);
    
    if (action === 'reject') {
      // Remove the flagged content
      await deleteDoc(flagRef);
      // TODO: Also remove the actual content (skill, profile, etc.)
    } else {
      // Mark as reviewed
      await updateDoc(flagRef, {
        reviewed: true,
        reviewedAt: serverTimestamp(),
        action: 'approved'
      });
    }
  },

  async banUser(userId: string, reason: string) {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      isBanned: true,
      banReason: reason,
      bannedAt: serverTimestamp(),
      isVerified: false
    });
  },

  async unbanUser(userId: string) {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      isBanned: false,
      banReason: null,
      bannedAt: null
    });
  },

  async sendBroadcastMessage(message: string, type: 'info' | 'warning' | 'success') {
    const messageRef = collection(db, "systemMessages");
    await addDoc(messageRef, {
      content: message,
      type: type,
      createdAt: serverTimestamp(),
      isActive: true
    });
  },

  subscribeToAdminData(callback: (data: any) => void): Unsubscribe {
    // Subscribe to flagged content
    const flaggedContentQuery = query(
      collection(db, "flaggedContent"),
      orderBy("reportedAt", "desc")
    );

    const systemMessagesQuery = query(
      collection(db, "systemMessages"),
      where("isActive", "==", true),
      limit(10)
    );

    const unsubscribeFlagged = onSnapshot(flaggedContentQuery, (snapshot) => {
      const flaggedContent = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback({ type: 'flaggedContent', data: flaggedContent });
    });

    const unsubscribeMessages = onSnapshot(systemMessagesQuery, (snapshot) => {
      const systemMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      // Sort by createdAt in memory to avoid composite index requirement
      .sort((a: any, b: any) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : a.createdAt || 0;
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : b.createdAt || 0;
        return bTime - aTime; // Descending order
      });
      
      callback({ type: 'systemMessages', data: systemMessages });
    });

    // Return combined unsubscribe function
    return () => {
      unsubscribeFlagged();
      unsubscribeMessages();
    };
  }
};

// Skill Management
export const skillService = {
  // Add skill to user
  async addSkillToUser(userId: string, skill: Omit<Skill, "id">, type: "offered" | "wanted") {
    const skillRef = await addDoc(collection(db, COLLECTIONS.SKILLS), {
      ...skill,
      userId,
      type,
      createdAt: serverTimestamp()
    });

    // Update user's skill arrays
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const fieldName = type === "offered" ? "skillsOffered" : "skillsWanted";
    
    await updateDoc(userRef, {
      [fieldName]: arrayUnion(skillRef.id)
    });

    return skillRef.id;
  },

  // Remove skill from user
  async removeSkillFromUser(userId: string, skillId: string, type: "offered" | "wanted") {
    // Delete skill document
    await deleteDoc(doc(db, COLLECTIONS.SKILLS, skillId));

    // Update user's skill arrays
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const fieldName = type === "offered" ? "skillsOffered" : "skillsWanted";
    
    await updateDoc(userRef, {
      [fieldName]: arrayRemove(skillId)
    });
  },

  // Get user's skills
  async getUserSkills(userId: string, type?: "offered" | "wanted") {
    let q = query(
      collection(db, COLLECTIONS.SKILLS),
      where("userId", "==", userId)
    );

    if (type) {
      q = query(q, where("type", "==", type));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Skill[];
  }
};

// Swap Request Management
export const swapRequestService = {
  // Create swap request
  async createSwapRequest(requestData: Omit<SwapRequest, "id" | "createdAt" | "updatedAt">) {
    const requestRef = await addDoc(collection(db, COLLECTIONS.SWAP_REQUESTS), {
      ...requestData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return requestRef.id;
  },

  // Update swap request status
  async updateSwapRequestStatus(requestId: string, status: SwapRequest["status"], adminNotes?: string) {
    const requestRef = doc(db, COLLECTIONS.SWAP_REQUESTS, requestId);
    const updates: any = {
      status,
      updatedAt: serverTimestamp()
    };

    if (adminNotes) {
      updates.adminNotes = adminNotes;
    }

    await updateDoc(requestRef, updates);
  },

  // Get swap requests for user
  async getUserSwapRequests(userId: string, type?: "incoming" | "outgoing") {
    let q;
    
    if (type === "incoming") {
      q = query(
        collection(db, COLLECTIONS.SWAP_REQUESTS),
        where("responderId", "==", userId)
      );
    } else if (type === "outgoing") {
      q = query(
        collection(db, COLLECTIONS.SWAP_REQUESTS),
        where("requesterId", "==", userId)
      );
    } else {
      // Get both incoming and outgoing
      // Note: This requires multiple queries in Firestore
      const [incoming, outgoing] = await Promise.all([
        getDocs(query(
          collection(db, COLLECTIONS.SWAP_REQUESTS),
          where("responderId", "==", userId)
        )),
        getDocs(query(
          collection(db, COLLECTIONS.SWAP_REQUESTS),
          where("requesterId", "==", userId)
        ))
      ]);

      const incomingRequests = incoming.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toMillis() || Date.now(),
        updatedAt: doc.data().updatedAt?.toMillis() || Date.now()
      }));

      const outgoingRequests = outgoing.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toMillis() || Date.now(),
        updatedAt: doc.data().updatedAt?.toMillis() || Date.now()
      }));

      const allRequests = [...incomingRequests, ...outgoingRequests] as SwapRequest[];
      
      // Populate skill details for each swap request
      for (const request of allRequests) {
        // If offeredSkill is just an ID string, fetch the full skill object
        if (typeof request.offeredSkill === 'string') {
          const skillDoc = await getDoc(doc(db, COLLECTIONS.SKILLS, request.offeredSkill));
          if (skillDoc.exists()) {
            request.offeredSkill = { id: skillDoc.id, ...skillDoc.data() } as Skill;
          }
        }
        
        // If requestedSkill is just an ID string, fetch the full skill object
        if (typeof request.requestedSkill === 'string') {
          const skillDoc = await getDoc(doc(db, COLLECTIONS.SKILLS, request.requestedSkill));
          if (skillDoc.exists()) {
            request.requestedSkill = { id: skillDoc.id, ...skillDoc.data() } as Skill;
          }
        }
      }

      return allRequests.sort((a, b) => 
        b.createdAt - a.createdAt
      );
    }

    const querySnapshot = await getDocs(q);
    const swapRequests = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toMillis() || Date.now(),
      updatedAt: doc.data().updatedAt?.toMillis() || Date.now()
    })) as SwapRequest[];

    // Populate skill details for each swap request
    for (const request of swapRequests) {
      // If offeredSkill is just an ID string, fetch the full skill object
      if (typeof request.offeredSkill === 'string') {
        const skillDoc = await getDoc(doc(db, COLLECTIONS.SKILLS, request.offeredSkill));
        if (skillDoc.exists()) {
          request.offeredSkill = { id: skillDoc.id, ...skillDoc.data() } as Skill;
        }
      }
      
      // If requestedSkill is just an ID string, fetch the full skill object
      if (typeof request.requestedSkill === 'string') {
        const skillDoc = await getDoc(doc(db, COLLECTIONS.SKILLS, request.requestedSkill));
        if (skillDoc.exists()) {
          request.requestedSkill = { id: skillDoc.id, ...skillDoc.data() } as Skill;
        }
      }
    }

    return swapRequests.sort((a, b) => b.createdAt - a.createdAt);
  },

  // Get all swap requests (admin)
  async getAllSwapRequests(status?: SwapRequest["status"], priority?: string) {
    let q = query(collection(db, COLLECTIONS.SWAP_REQUESTS));

    if (status) {
      q = query(q, where("status", "==", status));
    }

    if (priority) {
      q = query(q, where("priority", "==", priority));
    }

    const querySnapshot = await getDocs(q);
    const swapRequests = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toMillis() || Date.now(),
      updatedAt: doc.data().updatedAt?.toMillis() || Date.now()
    })) as SwapRequest[];

    // Populate skill details for each swap request
    for (const request of swapRequests) {
      // If offeredSkill is just an ID string, fetch the full skill object
      if (typeof request.offeredSkill === 'string') {
        const skillDoc = await getDoc(doc(db, COLLECTIONS.SKILLS, request.offeredSkill));
        if (skillDoc.exists()) {
          request.offeredSkill = { id: skillDoc.id, ...skillDoc.data() } as Skill;
        }
      }
      
      // If requestedSkill is just an ID string, fetch the full skill object
      if (typeof request.requestedSkill === 'string') {
        const skillDoc = await getDoc(doc(db, COLLECTIONS.SKILLS, request.requestedSkill));
        if (skillDoc.exists()) {
          request.requestedSkill = { id: skillDoc.id, ...skillDoc.data() } as Skill;
        }
      }
    }

    return swapRequests.sort((a, b) => b.createdAt - a.createdAt);
  },

  // Subscribe to swap request updates
  subscribeToSwapRequests(
    userId: string, 
    callback: (requests: SwapRequest[]) => void,
    type?: "incoming" | "outgoing"
  ): Unsubscribe {
    let q;
    
    if (type === "incoming") {
      q = query(
        collection(db, COLLECTIONS.SWAP_REQUESTS),
        where("responderId", "==", userId)
      );
    } else {
      q = query(
        collection(db, COLLECTIONS.SWAP_REQUESTS),
        where("requesterId", "==", userId)
      );
    }

    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toMillis() || Date.now(),
        updatedAt: doc.data().updatedAt?.toMillis() || Date.now()
      })) as SwapRequest[];
      
      // Sort by createdAt in memory since we removed orderBy from query
      const sortedRequests = requests.sort((a, b) => b.createdAt - a.createdAt);
      
      callback(sortedRequests);
    });
  }
};

// Rating System
export const ratingService = {
  // Add rating/review
  async addRating(ratingData: Omit<Rating, "id" | "createdAt">) {
    const ratingRef = await addDoc(collection(db, COLLECTIONS.RATINGS), {
      ...ratingData,
      createdAt: serverTimestamp()
    });

    // Update user's rating average
    await this.updateUserRating(ratingData.toUid);

    return ratingRef.id;
  },

  // Get user ratings
  async getUserRatings(userId: string) {
    const q = query(
      collection(db, COLLECTIONS.RATINGS),
      where("ratedUserId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Rating[];
  },

  // Update user's overall rating
  async updateUserRating(userId: string) {
    const ratings = await this.getUserRatings(userId);
    
    if (ratings.length > 0) {
      const averageRating = ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length;
      
      await userService.updateUserProfile(userId, {
        rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        reviewCount: ratings.length
      });
    }
  }
};

// Messaging System
export const messageService = {
  // Create conversation
  async createConversation(participants: string[], swapRequestId?: string) {
    const conversationData: any = {
      participants,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: null
    };

    // Only add swapRequestId if it's defined to avoid Firestore undefined value error
    if (swapRequestId) {
      conversationData.swapRequestId = swapRequestId;
    }

    const conversationRef = await addDoc(collection(db, COLLECTIONS.CONVERSATIONS), conversationData);

    return conversationRef.id;
  },

  // Send message
  async sendMessage(conversationId: string, senderId: string, content: string, type: "text" | "image" = "text") {
    const messageRef = await addDoc(collection(db, COLLECTIONS.MESSAGES), {
      conversationId,
      senderId,
      content,
      type,
      createdAt: serverTimestamp(),
      isRead: false
    });

    // Update conversation's last message
    const conversationRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId);
    await updateDoc(conversationRef, {
      lastMessage: {
        content,
        senderId,
        createdAt: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    });

    return messageRef.id;
  },

  // Get user conversations
  async getUserConversations(userId: string) {
    const q = query(
      collection(db, COLLECTIONS.CONVERSATIONS),
      where("participants", "array-contains", userId),
      orderBy("updatedAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Conversation[];
  },

  // Get conversation messages
  async getConversationMessages(conversationId: string) {
    const q = query(
      collection(db, COLLECTIONS.MESSAGES),
      where("conversationId", "==", conversationId),
      orderBy("createdAt", "asc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Message[];
  },

  // Subscribe to conversation messages
  subscribeToMessages(
    conversationId: string,
    callback: (messages: Message[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, COLLECTIONS.MESSAGES),
      where("conversationId", "==", conversationId),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      
      callback(messages);
    });
  },

  // Mark messages as read
  async markMessagesAsRead(conversationId: string, userId: string) {
    const q = query(
      collection(db, COLLECTIONS.MESSAGES),
      where("conversationId", "==", conversationId),
      where("senderId", "!=", userId),
      where("isRead", "==", false)
    );

    const querySnapshot = await getDocs(q);
    const batch = querySnapshot.docs.map(doc => 
      updateDoc(doc.ref, { isRead: true })
    );

    await Promise.all(batch);
  }
};

// Notification System
export const notificationService = {
  // Create notification
  async createNotification(notificationData: Omit<Notification, "id" | "createdAt">) {
    const notificationRef = await addDoc(collection(db, "notifications"), {
      ...notificationData,
      createdAt: serverTimestamp()
    });
    return notificationRef.id;
  },

  // Get user notifications
  async getUserNotifications(userId: string, notificationLimit: number = 20) {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(notificationLimit)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toMillis() || Date.now()
    })) as Notification[];
  },

  // Mark notification as read
  async markNotificationAsRead(notificationId: string) {
    const notificationRef = doc(db, "notifications", notificationId);
    await updateDoc(notificationRef, {
      read: true
    });
  },

  // Mark all notifications as read for user
  async markAllNotificationsAsRead(userId: string) {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("read", "==", false)
    );
    const querySnapshot = await getDocs(q);
    
    const batch: Promise<void>[] = [];
    querySnapshot.docs.forEach(doc => {
      batch.push(updateDoc(doc.ref, { read: true }));
    });
    
    await Promise.all(batch);
  },

  // Subscribe to user notifications
  subscribeToUserNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    
    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toMillis() || Date.now()
      })) as Notification[];
      callback(notifications);
    });
  },

  // Get unread notification count
  async getUnreadNotificationCount(userId: string): Promise<number> {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("read", "==", false)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  },

  // Delete notification
  async deleteNotification(notificationId: string) {
    const notificationRef = doc(db, "notifications", notificationId);
    await deleteDoc(notificationRef);
  }
};

// Enhanced Messaging System
export const enhancedMessageService = {
  // Create conversation with enhanced features
  async createConversation(participants: string[], type: ConversationType = 'direct', title?: string, swapRequestId?: string) {
    const conversationData: any = {
      participants,
      type,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: null
    };

    if (title) conversationData.title = title;
    if (swapRequestId) conversationData.swapRequestId = swapRequestId;

    // Initialize unread counts
    const unreadCount: { [key: string]: number } = {};
    participants.forEach(userId => {
      unreadCount[userId] = 0;
    });
    conversationData.unreadCount = unreadCount;

    const conversationRef = await addDoc(collection(db, COLLECTIONS.CONVERSATIONS), conversationData);
    return conversationRef.id;
  },

  // Send enhanced message
  async sendMessage(
    conversationId: string, 
    senderId: string, 
    content: string, 
    type: MessageType = "text",
    attachments?: MessageAttachment[],
    replyTo?: string
  ) {
    const messageData: any = {
      conversationId,
      senderId,
      content,
      type,
      timestamp: serverTimestamp(),
      read: false
    };

    if (attachments) messageData.attachments = attachments;
    if (replyTo) messageData.replyTo = replyTo;

    const messageRef = await addDoc(collection(db, COLLECTIONS.MESSAGES), messageData);

    // Update conversation's last message and unread counts
    const conversationRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId);
    const conversationSnap = await getDoc(conversationRef);
    
    if (conversationSnap.exists()) {
      const conversationData = conversationSnap.data();
      const participants = conversationData.participants || [];
      const currentUnreadCount = conversationData.unreadCount || {};

      // Increment unread count for all participants except sender
      const newUnreadCount = { ...currentUnreadCount };
      participants.forEach((userId: string) => {
        if (userId !== senderId) {
          newUnreadCount[userId] = (newUnreadCount[userId] || 0) + 1;
        }
      });

      await updateDoc(conversationRef, {
        lastMessage: {
          content,
          senderId,
          timestamp: serverTimestamp(),
          type
        },
        updatedAt: serverTimestamp(),
        unreadCount: newUnreadCount
      });

      // Create notifications for other participants
      const otherParticipants = participants.filter((id: string) => id !== senderId);
      for (const participantId of otherParticipants) {
        await notificationService.createNotification({
          userId: participantId,
          type: 'new_message',
          title: 'New Message',
          message: `You have a new message: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
          data: { conversationId, messageId: messageRef.id },
          read: false,
          actionUrl: `/messages?conversation=${conversationId}`
        });
      }
    }

    return messageRef.id;
  },

  // Mark messages as read in conversation
  async markConversationAsRead(conversationId: string, userId: string) {
    // Mark all unread messages in conversation as read
    const q = query(
      collection(db, COLLECTIONS.MESSAGES),
      where("conversationId", "==", conversationId),
      where("senderId", "!=", userId),
      where("read", "==", false)
    );
    
    const querySnapshot = await getDocs(q);
    const batch: Promise<void>[] = [];
    
    querySnapshot.docs.forEach(doc => {
      batch.push(updateDoc(doc.ref, { read: true }));
    });
    
    await Promise.all(batch);

    // Reset unread count for this user in conversation
    const conversationRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId);
    const conversationSnap = await getDoc(conversationRef);
    
    if (conversationSnap.exists()) {
      const conversationData = conversationSnap.data();
      const currentUnreadCount = conversationData.unreadCount || {};
      const newUnreadCount = { ...currentUnreadCount };
      newUnreadCount[userId] = 0;

      await updateDoc(conversationRef, {
        unreadCount: newUnreadCount
      });
    }
  },

  // Add reaction to message
  async addMessageReaction(messageId: string, emoji: string, userId: string) {
    const messageRef = doc(db, COLLECTIONS.MESSAGES, messageId);
    const messageSnap = await getDoc(messageRef);
    
    if (messageSnap.exists()) {
      const messageData = messageSnap.data();
      const reactions = messageData.reactions || [];
      
      // Find existing reaction with this emoji
      const existingReactionIndex = reactions.findIndex((r: MessageReaction) => r.emoji === emoji);
      
      if (existingReactionIndex >= 0) {
        // Add user to existing reaction
        const existingReaction = reactions[existingReactionIndex];
        if (!existingReaction.users.includes(userId)) {
          existingReaction.users.push(userId);
        }
      } else {
        // Create new reaction
        reactions.push({
          emoji,
          users: [userId]
        });
      }

      await updateDoc(messageRef, { reactions });
    }
  },

  // Remove reaction from message
  async removeMessageReaction(messageId: string, emoji: string, userId: string) {
    const messageRef = doc(db, COLLECTIONS.MESSAGES, messageId);
    const messageSnap = await getDoc(messageRef);
    
    if (messageSnap.exists()) {
      const messageData = messageSnap.data();
      const reactions = messageData.reactions || [];
      
      const updatedReactions = reactions
        .map((r: MessageReaction) => {
          if (r.emoji === emoji) {
            return {
              ...r,
              users: r.users.filter((id: string) => id !== userId)
            };
          }
          return r;
        })
        .filter((r: MessageReaction) => r.users.length > 0);

      await updateDoc(messageRef, { reactions: updatedReactions });
    }
  },

  // Edit message
  async editMessage(messageId: string, newContent: string) {
    const messageRef = doc(db, COLLECTIONS.MESSAGES, messageId);
    await updateDoc(messageRef, {
      content: newContent,
      edited: true,
      editedAt: serverTimestamp()
    });
  },

  // Delete message
  async deleteMessage(messageId: string) {
    const messageRef = doc(db, COLLECTIONS.MESSAGES, messageId);
    await deleteDoc(messageRef);
  },

  // Get enhanced conversations for user
  async getUserConversations(userId: string) {
    const q = query(
      collection(db, COLLECTIONS.CONVERSATIONS),
      where("participants", "array-contains", userId),
      orderBy("updatedAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toMillis() || Date.now(),
      updatedAt: doc.data().updatedAt?.toMillis() || Date.now()
    })) as Conversation[];
  },

  // Subscribe to enhanced conversations
  subscribeToUserConversations(
    userId: string,
    callback: (conversations: Conversation[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, COLLECTIONS.CONVERSATIONS),
      where("participants", "array-contains", userId),
      orderBy("updatedAt", "desc")
    );
    
    return onSnapshot(q, (snapshot) => {
      const conversations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toMillis() || Date.now(),
        updatedAt: doc.data().updatedAt?.toMillis() || Date.now()
      })) as Conversation[];
      callback(conversations);
    });
  },

  // Subscribe to enhanced messages
  subscribeToMessages(
    conversationId: string,
    callback: (messages: Message[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, COLLECTIONS.MESSAGES),
      where("conversationId", "==", conversationId),
      orderBy("timestamp", "asc")
    );
    
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toMillis() || Date.now()
      })) as Message[];
      callback(messages);
    });
  }
};
