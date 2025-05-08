import { useState } from "react";
import { toast } from "sonner";
import {
  sendTextMessage,
  getUserProfile,
  createOptimisticMessage,
  Message
} from "@/services/messageService";

interface User {
  id: string;
}

export const useSendMessage = (
  groupId: string | undefined,
  user: User | null,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
) => {
  // Function to send a new message
  const sendMessage = async (messageContent: string) => {
    if (!messageContent.trim()) return;
    if (!groupId || !user) {
      toast.error("Select a group to send messages.");
      return;
    }

    try {
      // Get user profile data
      const profileData = await getUserProfile(user.id);

      // Create a unique temp ID for this message
      const tempId = crypto.randomUUID();

      // Optimistically update the local state
      const tempMessage = createOptimisticMessage(
        user.id, 
        messageContent, 
        groupId, 
        profileData.username,
        profileData.avatar_url
      );

      // Set the temporary ID to track this specific message
      tempMessage.id = tempId;
      
      // Add the message to the local state immediately with 'sending' status
      setMessages(prevMessages => [...prevMessages, tempMessage]);

      // Send the message to the database
      const result = await sendTextMessage(groupId, user.id, messageContent, tempId);
      
      // Update the message status to 'sent' when successfully delivered
      if (result && result.success) {
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === tempId ? { ...msg, status: 'sent' } : msg
          )
        );
      }
    } catch (error) {
      console.error("Error in sendMessage:", error);
      toast.error("Failed to send message.");
      // Keep the message but indicate it failed (we don't remove it)
      // UI can show retry option if needed
    }
  };

  return {
    sendMessage
  };
};
