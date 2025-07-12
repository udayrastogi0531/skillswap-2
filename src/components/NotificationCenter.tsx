"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Bell, 
  Check, 
  X, 
  MessageSquare, 
  ArrowLeftRight, 
  Star, 
  Settings,
  ExternalLink 
} from "lucide-react";
import { notificationService } from "@/lib/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { useToast } from "@/hooks/use-toast";
import type { Notification } from "@/types";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onMarkAsRead, 
  onDelete 
}) => {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'swap_request_received':
      case 'swap_request_accepted':
      case 'swap_request_declined':
      case 'swap_request_completed':
        return <ArrowLeftRight className="h-4 w-4" />;
      case 'new_message':
        return <MessageSquare className="h-4 w-4" />;
      case 'skill_rating_received':
        return <Star className="h-4 w-4" />;
      case 'system_announcement':
      case 'admin_action':
        return <Settings className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'swap_request_received':
        return 'bg-blue-500';
      case 'swap_request_accepted':
      case 'swap_request_completed':
        return 'bg-green-500';
      case 'swap_request_declined':
        return 'bg-red-500';
      case 'new_message':
        return 'bg-purple-500';
      case 'skill_rating_received':
        return 'bg-yellow-500';
      case 'system_announcement':
      case 'admin_action':
        return 'bg-gray-500';
      default:
        return 'bg-blue-500';
    }
  };

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  return (
    <div 
      className={`p-4 border rounded-lg cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800 ${
        !notification.read ? 'border-blue-200 bg-blue-50 dark:bg-blue-950' : 'border-gray-200'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-full text-white ${getNotificationColor(notification.type)}`}>
          {getNotificationIcon(notification.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {notification.title}
            </h4>
            <div className="flex items-center space-x-2">
              {!notification.read && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
              <span className="text-xs text-gray-500">
                {new Date(notification.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {notification.message}
          </p>
          
          {notification.actionUrl && (
            <div className="flex items-center mt-2 text-xs text-blue-600 dark:text-blue-400">
              <ExternalLink className="h-3 w-3 mr-1" />
              View Details
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          {!notification.read && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification.id);
              }}
              title="Mark as read"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
            title="Delete notification"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export const NotificationCenter: React.FC = () => {
  const { session } = useAuthStore();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!session?.uid) return;

    // Subscribe to real-time notifications
    const unsubscribe = notificationService.subscribeToUserNotifications(
      session.uid,
      (notifications) => {
        setNotifications(notifications);
        setUnreadCount(notifications.filter(n => !n.read).length);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [session?.uid]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markNotificationAsRead(notificationId);
      toast({
        variant: "success",
        title: "Marked as Read",
        description: "Notification marked as read."
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark notification as read."
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!session?.uid) return;
    
    try {
      await notificationService.markAllNotificationsAsRead(session.uid);
      toast({
        variant: "success",
        title: "All Marked as Read",
        description: "All notifications marked as read."
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark all notifications as read."
      });
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      toast({
        variant: "success",
        title: "Deleted",
        description: "Notification deleted successfully."
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast({
        variant: "destructive",
        title: "Error", 
        description: "Failed to delete notification."
      });
    }
  };

  if (!session) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">
            Please sign in to view notifications.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notifications</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
          
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
            >
              Mark All Read
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex space-x-3">
                  <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
