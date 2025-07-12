"use client";

import { useState, useEffect } from 'react';
import { useFirebaseStore } from '@/store/useFirebaseStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Conversation, Message, MessageType } from '@/types';
import { 
  IconSend, 
  IconPhoto, 
  IconFile, 
  IconMoodSmile,
  IconArrowBackUp,
  IconEdit,
  IconTrash 
} from '@tabler/icons-react';

export default function MessagesPage() {
  const { session } = useAuthStore();
  const currentUserProfile = session;
  const { 
    conversations, 
    messages, 
    loadConversations, 
    loadMessages,
    sendEnhancedMessage,
    addMessageReaction,
    removeMessageReaction,
    editMessage,
    deleteMessage,
    markMessagesAsRead,
    createConversation
  } = useFirebaseStore();
  const { toast } = useToast();

  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('text');
  const [replyTo, setReplyTo] = useState<string | undefined>();
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    if (currentUserProfile?.uid) {
      loadConversations(currentUserProfile.uid);
    }
  }, [currentUserProfile, loadConversations]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    }
  }, [selectedConversation, loadMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !currentUserProfile) return;

    try {
      await sendEnhancedMessage(selectedConversation, newMessage, messageType, [], replyTo);
      setNewMessage('');
      setReplyTo(undefined);
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const currentMessage = selectedConversation ? 
        messages[selectedConversation]?.find(m => m.id === messageId) : null;
      
      if (currentMessage?.reactions?.some(r => r.emoji === emoji && r.users.includes(currentUserProfile?.uid || ''))) {
        await removeMessageReaction(messageId, emoji);
      } else {
        await addMessageReaction(messageId, emoji);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update reaction",
        variant: "destructive"
      });
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editContent.trim()) return;

    try {
      await editMessage(messageId, editContent);
      setEditingMessage(null);
      setEditContent('');
      toast({
        title: "Message edited",
        description: "Your message has been updated",
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to edit message",
        variant: "destructive"
      });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      toast({
        title: "Message deleted",
        description: "The message has been deleted",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete message", 
        variant: "destructive"
      });
    }
  };

  const startReply = (messageId: string) => {
    setReplyTo(messageId);
  };

  const startEdit = (messageId: string, content: string) => {
    setEditingMessage(messageId);
    setEditContent(content);
  };

  const conversationList = conversations || [];
  const conversationMessages = selectedConversation ? (messages[selectedConversation] || []) : [];

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        
        {/* Conversation List */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {conversationList.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-3 cursor-pointer hover:bg-muted/50 border-b transition-colors ${ 
                    selectedConversation === conversation.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => setSelectedConversation(conversation.id)}
                >
                  <div className="font-medium text-sm">
                    {conversation.title || `Conversation ${conversation.id.slice(0, 8)}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {conversation.participants.length} participants
                  </div>
                  {conversation.lastMessage && (
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {conversation.lastMessage.content}
                    </div>
                  )}
                </div>
              ))}
              
              {conversationList.length === 0 && (
                <div className="p-4 text-center text-muted-foreground">
                  No conversations yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Messages View */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedConversation ? 'Messages' : 'Select a conversation'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedConversation ? (
              <div className="space-y-4">
                
                {/* Messages */}
                <div className="max-h-[350px] overflow-y-auto space-y-3 p-2">
                  {conversationMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === currentUserProfile?.uid ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] p-3 rounded-lg ${
                        message.senderId === currentUserProfile?.uid 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        
                        {/* Reply indicator */}
                        {message.replyTo && (
                          <div className="text-xs opacity-70 mb-1 italic">
                            Replying to message
                          </div>
                        )}
                        
                        {/* Message content */}
                        {editingMessage === message.id ? (
                          <div className="space-y-2">
                            <Input
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && handleEditMessage(message.id)}
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleEditMessage(message.id)}>
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingMessage(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-sm">{message.content}</div>
                            
                            {/* Message metadata */}
                            <div className="flex items-center gap-2 mt-2">
                              <div className="text-xs opacity-70">
                                {new Date(message.timestamp).toLocaleTimeString()}
                              </div>
                              {message.edited && (
                                <Badge variant="secondary" className="text-xs">edited</Badge>
                              )}
                              <Badge variant="outline" className="text-xs">{message.type}</Badge>
                            </div>
                            
                            {/* Reactions */}
                            {message.reactions && message.reactions.length > 0 && (
                              <div className="flex gap-1 mt-2">
                                {message.reactions.map((reaction, index) => (
                                  <button
                                    key={index}
                                    onClick={() => handleReaction(message.id, reaction.emoji)}
                                    className="text-xs px-2 py-1 rounded bg-background/20 hover:bg-background/40"
                                  >
                                    {reaction.emoji} {reaction.users.length}
                                  </button>
                                ))}
                              </div>
                            )}
                            
                            {/* Message actions */}
                            {message.senderId === currentUserProfile?.uid && (
                              <div className="flex gap-1 mt-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => startReply(message.id)}
                                >
                                  <IconArrowBackUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => startEdit(message.id, message.content)}
                                >
                                  <IconEdit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteMessage(message.id)}
                                >
                                  <IconTrash className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleReaction(message.id, '👍')}
                                >
                                  <IconMoodSmile className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {conversationMessages.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No messages in this conversation yet
                    </div>
                  )}
                </div>

                {/* Message input */}
                <div className="space-y-2">
                  {replyTo && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <IconArrowBackUp className="h-3 w-3" />
                      Replying to message
                      <Button size="sm" variant="ghost" onClick={() => setReplyTo(undefined)}>
                        Cancel
                      </Button>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <select
                      value={messageType}
                      onChange={(e) => setMessageType(e.target.value as MessageType)}
                      className="px-2 py-1 border rounded text-xs"
                    >
                      <option value="text">Text</option>
                      <option value="image">Image</option>
                      <option value="file">File</option>
                      <option value="system">System</option>
                    </select>
                    
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1"
                    />
                    
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                      <IconSend className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-16">
                Select a conversation to start messaging
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
