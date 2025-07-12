export interface User {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  name: string;
  role: 'user' | 'admin';
  profilePhoto?: string;
  avatar?: string;
  location?: string;
  bio?: string;
  createdAt: number;
  lastLoginAt?: number;
  skillsOffered: Skill[];
  skillsWanted: Skill[];
  rating: number;
  reviewCount: number;
  totalSwaps: number;
  isVerified?: boolean;
  isBanned?: boolean;
  banReason?: string;
  bannedAt?: number;
}

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  level: SkillLevel;
  description?: string;
  tags: string[];
}

export interface SkillCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface SwapRequest {
  id: string;
  requesterId: string;
  requesterUid: string;
  targetUid: string;
  offeredSkill: Skill;
  requestedSkill: Skill;
  status: SwapStatus;
  message?: string;
  adminNotes?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: number;
  updatedAt: number;
  scheduledDate?: number;
  location?: string;
  duration?: number; // in minutes
}

export interface Rating {
  id: string;
  fromUid: string;
  toUid: string;
  swapRequestId: string;
  rating: number; // 1-5
  comment?: string;
  createdAt: number;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any; // Additional data like swapRequestId, conversationId, etc.
  read: boolean;
  createdAt: number;
  actionUrl?: string; // URL to navigate when notification is clicked
}

export type NotificationType = 
  | 'swap_request_received'
  | 'swap_request_accepted' 
  | 'swap_request_declined'
  | 'swap_request_completed'
  | 'new_message'
  | 'system_announcement'
  | 'account_verification'
  | 'skill_rating_received'
  | 'admin_action';

// Enhanced Message Types
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  timestamp: number;
  read: boolean;
  edited?: boolean;
  editedAt?: number;
  attachments?: MessageAttachment[];
  replyTo?: string; // Message ID this is replying to
  reactions?: MessageReaction[];
}

export type MessageType = 'text' | 'image' | 'file' | 'system' | 'swap_request' | 'swap_update';

export interface MessageAttachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'file';
  size: number;
}

export interface MessageReaction {
  emoji: string;
  users: string[]; // User IDs who reacted
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
  updatedAt: number;
  createdAt: number;
  swapRequestId?: string; // If conversation is related to a swap request
  title?: string; // Optional conversation title
  type: ConversationType;
  unreadCount?: { [userId: string]: number }; // Unread count per user
}

export type ConversationType = 'direct' | 'swap_related' | 'group';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type SwapStatus = 'pending' | 'approved' | 'rejected' | 'accepted' | 'declined' | 'completed' | 'cancelled';

export interface SwapPlatformState {
  users: User[];
  skills: Skill[];
  categories: SkillCategory[];
  swapRequests: SwapRequest[];
  ratings: Rating[];
  currentUser: User | null;
  loading: boolean;
  error: string | null;
}

// Default skill categories
export const DEFAULT_SKILL_CATEGORIES: SkillCategory[] = [
  {
    id: 'programming',
    name: 'Programming',
    icon: '💻',
    color: '#3B82F6'
  },
  {
    id: 'design',
    name: 'Design',
    icon: '🎨',
    color: '#8B5CF6'
  },
  {
    id: 'music',
    name: 'Music',
    icon: '🎵',
    color: '#F59E0B'
  },
  {
    id: 'languages',
    name: 'Languages',
    icon: '🗣️',
    color: '#10B981'
  },
  {
    id: 'cooking',
    name: 'Cooking',
    icon: '👨‍🍳',
    color: '#EF4444'
  },
  {
    id: 'fitness',
    name: 'Fitness',
    icon: '💪',
    color: '#F97316'
  },
  {
    id: 'crafts',
    name: 'Crafts',
    icon: '🛠️',
    color: '#6366F1'
  },
  {
    id: 'business',
    name: 'Business',
    icon: '💼',
    color: '#059669'
  }
];
