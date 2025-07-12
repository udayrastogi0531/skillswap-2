"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store/useAuthStore";
import { useFirebaseStore } from "@/store/useFirebaseStore";
import {
  ArrowLeftRight,
  Check,
  X,
  Clock,
  Star,
  MapPin,
  Search,
  Filter,
  Eye,
  MessageSquare,
  AlertTriangle,
  Shield,
  Users,
  TrendingUp,
  Calendar,
  Ban,
  Loader2,
  UserCheck,
  UserX,
  AlertCircle,
  Download,
  Send,
  Flag,
  FileText,
  Settings,
  Bell,
  Trash2,
  Plus
} from "lucide-react";
import type { SwapRequest, User, SwapStatus } from "@/types";

export default function AdminDashboard() {
  const { user, userRole } = useAuthStore();
  const {
    adminRequests,
    users,
    flaggedContent,
    systemMessages,
    isLoadingRequests,
    isLoadingUsers,
    isLoadingAdminData,
    loadAdminRequests,
    loadAllUsers,
    loadFlaggedContent,
    updateUserProfile,
    handleFlaggedContent,
    banUser,
    unbanUser,
    sendBroadcastMessage,
    subscribeToAdminData,
    createSwapRequest
  } = useFirebaseStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<SwapRequest | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"requests" | "users" | "moderation" | "messages" | "reports">("requests");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [messageType, setMessageType] = useState<"info" | "warning" | "success">("info");
  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [banReason, setBanReason] = useState("");

  // Load data on mount and set up real-time subscriptions
  useEffect(() => {
    if (userRole === 'admin') {
      console.log('Admin dashboard loading data...');
      loadAdminRequests();
      loadAllUsers();
      loadFlaggedContent();
      
      // Set up real-time subscriptions
      const unsubscribe = subscribeToAdminData();
      
      // Cleanup subscription on unmount
      return unsubscribe;
    }
  }, [userRole, loadAdminRequests, loadAllUsers, loadFlaggedContent, subscribeToAdminData]);

  // Debug logging
  useEffect(() => {
    console.log('Admin dashboard state:', {
      users: users?.length || 0,
      adminRequests: adminRequests?.length || 0,
      flaggedContent: flaggedContent?.length || 0,
      userRole,
      isLoadingUsers,
      isLoadingRequests
    });
  }, [users, adminRequests, flaggedContent, userRole, isLoadingUsers, isLoadingRequests]);

  // Test function to add sample data for demonstration
  const addSampleData = async () => {
    console.log('Adding sample data for admin demonstration...');
    
    // This is for demonstration purposes only
    try {
      const sampleRequest = {
        requesterId: user?.uid || 'sample-user',
        requesterUid: user?.uid || 'sample-user',
        targetUid: 'target-user-uid',
        status: 'pending' as const,
        offeredSkill: {
          id: 'skill1',
          name: 'JavaScript Programming',
          category: { id: 'tech', name: 'Technology', icon: '💻', color: 'blue' },
          level: 'intermediate' as const,
          description: 'Modern JavaScript development',
          tags: ['javascript', 'programming', 'web']
        },
        requestedSkill: {
          id: 'skill2',
          name: 'Python Data Science',
          category: { id: 'tech', name: 'Technology', icon: '🐍', color: 'green' },
          level: 'advanced' as const,
          description: 'Data analysis and machine learning',
          tags: ['python', 'data', 'ml']
        },
        message: 'I would love to learn Python data science in exchange for JavaScript tutoring!',
        priority: 'normal' as const
      };
      
      await createSwapRequest(sampleRequest);
      await loadAdminRequests();
      console.log('Sample request added successfully');
    } catch (error) {
      console.error('Error adding sample data:', error);
    }
  };

  const handleBroadcastMessage = async () => {
    if (!broadcastMessage.trim()) return;
    
    try {
      await sendBroadcastMessage(broadcastMessage, messageType);
      setBroadcastMessage("");
      setBroadcastTitle("");
      setShowBroadcastDialog(false);
    } catch (error) {
      console.error("Error sending broadcast message:", error);
    }
  };

  const handleBanUser = async (userId: string) => {
    if (!banReason.trim()) {
      alert("Please provide a reason for banning the user.");
      return;
    }
    
    console.log('Attempting to ban user:', userId, 'with reason:', banReason);
    
    try {
      await banUser(userId, banReason);
      console.log('User banned successfully');
      setShowBanDialog(false);
      setBanReason("");
      setSelectedUser(null);
      // Reload users to reflect the change
      await loadAllUsers();
      alert("User has been banned successfully.");
    } catch (error) {
      console.error("Error banning user:", error);
      alert("Failed to ban user. Please try again.");
    }
  };

  const handleUnbanUser = async (userId: string) => {
    console.log('Attempting to unban user:', userId);
    
    try {
      await unbanUser(userId);
      console.log('User unbanned successfully');
      await loadAllUsers();
      alert("User has been unbanned successfully.");
    } catch (error) {
      console.error("Error unbanning user:", error);
      alert("Failed to unban user. Please try again.");
    }
  };

  const handleFlaggedContentAction = async (flagId: string, action: 'approve' | 'reject') => {
    try {
      await handleFlaggedContent(flagId, action);
      // Data will be updated automatically through real-time subscription
    } catch (error) {
      console.error("Error handling flagged content:", error);
    }
  };

  const generateReport = (reportType: 'users' | 'swaps' | 'activity') => {
    let data = [];
    let filename = "";

    switch (reportType) {
      case 'users':
        data = (users || []).map(u => ({
          name: u.name,
          email: u.email,
          verified: u.isVerified,
          rating: u.rating,
          totalSwaps: u.totalSwaps,
          joinDate: new Date(u.createdAt).toLocaleDateString()
        }));
        filename = "users_report.csv";
        break;
      case 'swaps':
        data = (adminRequests || []).map(r => ({
          status: r.status,
          offeredSkill: r.offeredSkill.name,
          requestedSkill: r.requestedSkill.name,
          priority: r.priority || 'normal',
          createdAt: new Date(r.createdAt).toLocaleDateString()
        }));
        filename = "swaps_report.csv";
        break;
      case 'activity':
        data = [
          { metric: "Total Users", value: (users || []).length },
          { metric: "Verified Users", value: (users || []).filter(u => u.isVerified).length },
          { metric: "Total Requests", value: (adminRequests || []).length },
          { metric: "Pending Requests", value: (adminRequests || []).filter(r => r.status === 'pending').length },
          { metric: "Accepted Requests", value: (adminRequests || []).filter(r => r.status === 'accepted').length }
        ];
        filename = "activity_report.csv";
        break;
    }

    const csvContent = convertToCSV(data);
    downloadCSV(csvContent, filename);
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return "";
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(",");
    const csvRows = data.map(row => 
      headers.map(header => `"${row[header]}"`).join(",")
    );
    
    return [csvHeaders, ...csvRows].join("\n");
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Filter functions
  const filteredRequests = (adminRequests || []).filter((request) => {
    const matchesSearch = searchQuery === "" || 
      request.offeredSkill?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.requestedSkill?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || request.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const filteredUsers = (users || []).filter((u) => 
    searchQuery === "" || 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUserStatusToggle = async (userId: string, currentStatus: boolean) => {
    console.log('Toggling user verification:', userId, 'current status:', currentStatus);
    
    try {
      await updateUserProfile(userId, { isVerified: !currentStatus });
      console.log('User verification status updated successfully');
      await loadAllUsers();
      alert(`User has been ${!currentStatus ? 'verified' : 'unverified'} successfully.`);
    } catch (error) {
      console.error("Error updating user status:", error);
      alert("Failed to update user verification status. Please try again.");
    }
  };

  const getStatusBadge = (status: SwapRequest["status"]) => {
    const variants: Record<SwapStatus, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      accepted: "bg-blue-100 text-blue-800",
      declined: "bg-red-100 text-red-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-gray-100 text-gray-800"
    };
    return variants[status] || variants.pending;
  };

  const getPriorityBadge = (priority?: string) => {
    const variants = {
      low: "bg-blue-100 text-blue-800",
      normal: "bg-gray-100 text-gray-800",
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800"
    };
    return variants[priority as keyof typeof variants] || variants.normal;
  };

  // Admin role check
  if (!user || userRole !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center space-y-4 p-6">
              <Shield className="h-12 w-12 text-red-500" />
              <h2 className="text-xl font-semibold text-center">Access Denied</h2>
              <p className="text-muted-foreground text-center">
                You need admin privileges to access this page.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const stats = {
    totalRequests: (adminRequests || []).length,
    pendingRequests: (adminRequests || []).filter(r => r.status === 'pending').length,
    totalUsers: (users || []).length,
    verifiedUsers: (users || []).filter(u => u.isVerified).length
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Monitor platform activity, manage users, moderate content, and oversee operations
            </p>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <Button
              onClick={addSampleData}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Sample Request
            </Button>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="mb-6">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900">Admin Dashboard Information</h3>
                <p className="text-sm text-blue-800 mt-1">
                  This dashboard is for monitoring and administration only. Swap request approvals/rejections are handled by users themselves. 
                  Admin functions include: user verification, banning/unbanning, content moderation, platform messaging, and analytics.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{stats.totalRequests}</p>
              </div>
              <ArrowLeftRight className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pendingRequests}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Flagged Content</p>
                <p className="text-2xl font-bold text-red-600">{(flaggedContent || []).filter(item => !item.reviewed).length}</p>
              </div>
              <Flag className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          variant={activeTab === "requests" ? "default" : "outline"}
          onClick={() => setActiveTab("requests")}
          className="flex items-center gap-2"
        >
          <ArrowLeftRight className="h-4 w-4" />
          Swap Requests
        </Button>
        <Button
          variant={activeTab === "users" ? "default" : "outline"}
          onClick={() => setActiveTab("users")}
          className="flex items-center gap-2"
        >
          <Users className="h-4 w-4" />
          User Management
        </Button>
        <Button
          variant={activeTab === "moderation" ? "default" : "outline"}
          onClick={() => setActiveTab("moderation")}
          className="flex items-center gap-2"
        >
          <Flag className="h-4 w-4" />
          Content Moderation
        </Button>
        <Button
          variant={activeTab === "messages" ? "default" : "outline"}
          onClick={() => setActiveTab("messages")}
          className="flex items-center gap-2"
        >
          <Send className="h-4 w-4" />
          Platform Messages
        </Button>
        <Button
          variant={activeTab === "reports" ? "default" : "outline"}
          onClick={() => setActiveTab("reports")}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Reports & Analytics
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder={
              activeTab === "requests" ? "Search requests..." : 
              activeTab === "users" ? "Search users..." :
              activeTab === "moderation" ? "Search flagged content..." :
              "Search..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {activeTab === "requests" && (
          <>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === "requests" && (
        <div className="space-y-6">
          {isLoadingRequests ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading requests...</span>
            </div>
          ) : filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <ArrowLeftRight className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No swap requests found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "No swap requests have been created yet. This is a monitoring view - users handle their own request approvals."}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((request) => (
              <Card key={request.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusBadge(request.status)}>
                          {request.status}
                        </Badge>
                        {request.priority && (
                          <Badge variant="outline" className={getPriorityBadge(request.priority)}>
                            {request.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedRequest(request)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Swap Request Details</DialogTitle>
                          </DialogHeader>
                        {selectedRequest && (
                          <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                              <div>
                                <h4 className="font-semibold mb-2">Offered Skill</h4>
                                <p className="text-lg">{selectedRequest.offeredSkill.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {typeof selectedRequest.offeredSkill.category === 'object' 
                                    ? selectedRequest.offeredSkill.category.name 
                                    : selectedRequest.offeredSkill.category}
                                </p>
                              </div>
                              <div>
                                <h4 className="font-semibold mb-2">Requested Skill</h4>
                                <p className="text-lg">{selectedRequest.requestedSkill.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {typeof selectedRequest.requestedSkill.category === 'object' 
                                    ? selectedRequest.requestedSkill.category.name 
                                    : selectedRequest.requestedSkill.category}
                                </p>
                              </div>
                            </div>

                            {selectedRequest.message && (
                              <div>
                                <h4 className="font-semibold mb-2">Message</h4>
                                <p className="text-sm bg-gray-500 p-3 rounded">
                                  {selectedRequest.message}
                                </p>
                              </div>
                            )}


                            <div className="bg-blue-50 border border-blue-200 rounded p-3">
                              <p className="text-sm font-medium text-blue-800 mb-1">Admin Note:</p>
                              <p className="text-sm text-blue-700">
                                Request approval/rejection is handled by the recipient user, not by admin. 
                                This is for monitoring purposes only.
                              </p>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Offering:</span>
                        <Badge variant="secondary">
                          {typeof request.offeredSkill.category === 'object' 
                            ? request.offeredSkill.category.name 
                            : request.offeredSkill.category}
                        </Badge>
                      </div>
                      <p className="font-semibold">{request.offeredSkill.name}</p>
                      <p className="text-xs text-muted-foreground">From: {request.requesterId}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Requesting:</span>
                        <Badge variant="secondary">
                          {typeof request.requestedSkill.category === 'object' 
                            ? request.requestedSkill.category.name 
                            : request.requestedSkill.category}
                        </Badge>
                      </div>
                      <p className="font-semibold">{request.requestedSkill.name}</p>
                      <p className="text-xs text-muted-foreground">To: {request.targetUid}</p>
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-muted-foreground">
                    Created: {new Date(request.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === "users" && (
        <div className="space-y-4">
          {isLoadingUsers ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading users...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No users found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "Try adjusting your search" : "No users have registered yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredUsers.map((u) => (
              <Card key={u.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={u.profilePhoto} />
                        <AvatarFallback>{u.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{u.name}</h3>
                          {u.isVerified && (
                            <UserCheck className="h-4 w-4 text-green-500" />
                          )}
                          {u.isBanned && (
                            <Badge variant="destructive">Banned</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm">{u.rating.toFixed(1)}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {u.totalSwaps} swaps
                          </span>
                          {u.location && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-muted-foreground">{u.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}>
                        {u.role}
                      </Badge>
                      
                      {!u.isBanned ? (
                        <>
                          <Button
                            variant={u.isVerified ? "outline" : "default"}
                            size="sm"
                            onClick={() => handleUserStatusToggle(u.id, u.isVerified || false)}
                            className="flex items-center gap-2"
                          >
                            {u.isVerified ? (
                              <>
                                <UserX className="h-4 w-4" />
                                Unverify
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4" />
                                Verify
                              </>
                            )}
                          </Button>
                          
                          {u.role !== 'admin' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(u);
                                setShowBanDialog(true);
                              }}
                              className="flex items-center gap-2"
                            >
                              <Ban className="h-4 w-4" />
                              Ban
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnbanUser(u.id)}
                          className="flex items-center gap-2"
                        >
                          <UserCheck className="h-4 w-4" />
                          Unban
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === "moderation" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Content Moderation</h2>
            <Badge variant="destructive" className="px-3 py-1">
              {(flaggedContent || []).filter(item => !item.reviewed).length} Pending Review
            </Badge>
          </div>

          {(flaggedContent || []).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Flag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No flagged content</h3>
                <p className="text-muted-foreground">
                  All content is clean and compliant with platform policies.
                </p>
              </CardContent>
            </Card>
          ) : (
            flaggedContent.map((item) => (
              <Card key={item.id} className="border-orange-200">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="destructive" className="capitalize">
                          {item.type.replace('_', ' ')}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Reported {new Date(item.reportedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="font-medium">User ID: {item.userId}</p>
                      {item.skillId && <p className="text-sm text-muted-foreground">Skill ID: {item.skillId}</p>}
                    </div>
                    {!item.reviewed && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleFlaggedContentAction(item.id, 'reject')}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Content
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleFlaggedContentAction(item.id, 'approve')}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Keep Content
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                    <p className="text-sm font-medium text-red-800 mb-1">Flagged Content:</p>
                    <p className="text-sm text-red-700">"{item.content}"</p>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Reported by: {item.reportedBy}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === "messages" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Platform Messages</h2>
            <Button
              onClick={() => setShowBroadcastDialog(true)}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Send Broadcast Message
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Message Center
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-muted-foreground mb-4">
                Send platform-wide announcements, feature updates, or maintenance notifications to all users.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Message Type</label>
                  <Select value={messageType} onValueChange={(value: "info" | "warning" | "success") => setMessageType(value)}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Information</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="success">Success/Update</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Message Content</label>
                  <textarea
                    placeholder="Enter your message here..."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    className="w-full mt-1 p-3 border rounded-md resize-none"
                    rows={4}
                  />
                </div>
                
                <Button
                  onClick={handleBroadcastMessage}
                  disabled={!broadcastMessage.trim()}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Message to All Users
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "reports" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Reports & Analytics</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Download detailed user statistics including verification status, ratings, and activity.
                </p>
                <Button
                  onClick={() => generateReport('users')}
                  className="w-full"
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Users CSV
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowLeftRight className="h-5 w-5" />
                  Swaps Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Export all swap requests with status, skills, and timeline information.
                </p>
                <Button
                  onClick={() => generateReport('swaps')}
                  className="w-full"
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Swaps CSV
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Activity Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Get platform-wide activity metrics and engagement statistics.
                </p>
                <Button
                  onClick={() => generateReport('activity')}
                  className="w-full"
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Activity CSV
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Platform Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{(users || []).length}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{(users || []).filter(u => u.isVerified).length}</p>
                  <p className="text-sm text-muted-foreground">Verified Users</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{(adminRequests || []).length}</p>
                  <p className="text-sm text-muted-foreground">Total Requests</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{(adminRequests || []).filter(r => r.status === 'accepted').length}</p>
                  <p className="text-sm text-muted-foreground">Accepted Swaps</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Ban Dialog */}
      {showBanDialog && selectedUser && (
        <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ban User: {selectedUser.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This action will ban the user from the platform. They will no longer be able to access their account.
              </p>
              <div>
                <label className="text-sm font-medium">Ban Reason</label>
                <textarea
                  placeholder="Enter reason for ban..."
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="w-full mt-1 p-3 border rounded-md resize-none"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowBanDialog(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleBanUser(selectedUser.id)}
                  disabled={!banReason.trim()}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Ban User
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Broadcast Message Dialog */}
      {showBroadcastDialog && (
        <Dialog open={showBroadcastDialog} onOpenChange={setShowBroadcastDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Broadcast Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Message Type</label>
                <Select value={messageType} onValueChange={(value: "info" | "warning" | "success") => setMessageType(value)}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Information</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="success">Success/Update</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Message Content</label>
                <textarea
                  placeholder="Enter your message here..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full mt-1 p-3 border rounded-md resize-none"
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowBroadcastDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleBroadcastMessage}
                  disabled={!broadcastMessage.trim()}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Test Data Button - For Admin Use Only */}
      {userRole === 'admin' && (
        <div className="mt-8">
          <Button
            onClick={addSampleData}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeftRight className="h-4 w-4" />
            Add Sample Data
          </Button>
        </div>
      )}
    </div>
  );
}
