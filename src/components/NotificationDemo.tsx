"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { notificationService } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { NotificationType } from '@/types';

export default function NotificationDemo() {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const createTestNotification = async (type: NotificationType) => {
    setIsCreating(true);
    try {
      const notificationData = {
        userId: 'test-user-id', // This would be the current user's ID
        type,
        title: getNotificationTitle(type),
        message: getNotificationMessage(type),
        data: {},
        read: false,
        actionUrl: getActionUrl(type)
      };

      // Direct call to service since store method doesn't exist
      await notificationService.createNotification(notificationData);
      toast({
        title: "Success",
        description: `${type} notification created successfully`,
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to create notification",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getNotificationTitle = (type: NotificationType) => {
    switch (type) {
      case 'swap_request_received': return 'New Swap Request';
      case 'swap_request_accepted': return 'Swap Request Accepted';
      case 'swap_request_declined': return 'Swap Request Declined';
      case 'swap_request_completed': return 'Swap Completed';
      case 'new_message': return 'New Message';
      case 'system_announcement': return 'System Announcement';
      case 'account_verification': return 'Account Verification';
      case 'skill_rating_received': return 'New Rating Received';
      case 'admin_action': return 'Admin Action';
      default: return 'Notification';
    }
  };

  const getNotificationMessage = (type: NotificationType) => {
    switch (type) {
      case 'swap_request_received': return 'Someone wants to swap skills with you!';
      case 'swap_request_accepted': return 'Your swap request has been accepted';
      case 'swap_request_declined': return 'Your swap request has been declined';
      case 'swap_request_completed': return 'Your skill swap has been completed';
      case 'new_message': return 'You have a new message';
      case 'system_announcement': return 'System has been updated with new features';
      case 'account_verification': return 'Your account has been verified';
      case 'skill_rating_received': return 'Someone rated your skill sharing';
      case 'admin_action': return 'Admin has taken action on your account';
      default: return 'You have a new notification';
    }
  };

  const getActionUrl = (type: NotificationType) => {
    switch (type) {
      case 'swap_request_received': return '/dashboard/swaps';
      case 'swap_request_accepted': return '/dashboard/swaps';
      case 'swap_request_declined': return '/dashboard/swaps';
      case 'swap_request_completed': return '/dashboard/swaps';
      case 'new_message': return '/messages';
      case 'system_announcement': return '/';
      case 'account_verification': return '/profile';
      case 'skill_rating_received': return '/profile';
      case 'admin_action': return '/profile';
      default: return '/notifications';
    }
  };

  const notificationTypes: NotificationType[] = [
    'swap_request_received',
    'swap_request_accepted', 
    'swap_request_declined',
    'swap_request_completed',
    'new_message',
    'system_announcement',
    'account_verification',
    'skill_rating_received',
    'admin_action'
  ];

  return (
    <div className="space-y-4 p-6 border rounded-lg">
      <h3 className="text-lg font-semibold">Notification System Demo</h3>
      <p className="text-sm text-muted-foreground">
        Test the notification system by creating different types of notifications
      </p>
      
      <div className="grid grid-cols-2 gap-2">
        {notificationTypes.map((type) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            onClick={() => createTestNotification(type)}
            disabled={isCreating}
            className="text-xs"
          >
            {getNotificationTitle(type)}
          </Button>
        ))}
      </div>
      
      <div className="text-xs text-muted-foreground">
        Click any button to create a test notification. Check the notifications page to see them.
      </div>
    </div>
  );
}
