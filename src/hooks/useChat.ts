
import { useState, useEffect } from "react";
import { useChatMessages } from "./useChatMessages";
import { useSendMessage } from "./useSendMessage";
import { useMediaUpload } from "./useMediaUpload";
import { Message } from "@/services/messageService";

interface User {
  id: string;
}

/**
 * Custom hook to manage chat state with optimistic message sending.
 */
export const useChat = (
  groupId: string | undefined,
  user: User | null
) => {
  // 1️⃣ Fetch server messages and group metadata
  const {
    messages: fetchedMessages,
    currentGroup,
    loading,
  } = useChatMessages(groupId, user);

  // 2️⃣ Local copy of messages to support optimistic UI updates
  const [messages, setMessages] = useState<Message[]>([]);

  // 3️⃣ Sync local messages when the group or fetchedMessages changes
  useEffect(() => {
    setMessages(fetchedMessages);
  }, [fetchedMessages, groupId]);

  // 4️⃣ Hook to send a message: performs optimistic append and reconciliation
  const { sendMessage } = useSendMessage(groupId, user, setMessages);

  // 5️⃣ Hook to upload media: can also append optimistic media messages
  const { uploadingMedia, handleFileUpload } = useMediaUpload(
    groupId,
    user,
    setMessages
  );

  return {
    messages,
    currentGroup,
    loading,
    uploadingMedia,
    sendMessage,
    handleFileUpload,
  };
};
