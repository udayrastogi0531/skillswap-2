"use client";

import { NotificationCenter } from "@/components/NotificationCenter";

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Notifications
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Stay updated with your swap requests, messages, and platform updates.
          </p>
        </div>
        
        <NotificationCenter />
      </div>
    </div>
  );
}
