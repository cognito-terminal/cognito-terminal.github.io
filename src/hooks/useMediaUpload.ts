import { useState } from "react";
import { toast } from "sonner";
import {
  sendMediaMessage,
  getUserProfile,
  createOptimisticMessage,
  Message
} from "@/services/messageService";
import { uploadMedia } from "@/services/mediaService";

interface User {
  id: string;
}

export const useMediaUpload = (
  groupId: string | undefined,
  user: User | null,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
) => {
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Function to handle file upload (images, GIFs, audio) with optional text
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, text?: string) => {
    const file = event.target.files?.[0];
    if (!file || !user || !groupId) return;

    let tempMessage: Message | undefined;
    let tempId = crypto.randomUUID();

    try {
      setUploadingMedia(true);
      
      // Determine media type based on input id or file type
      const mediaType = event.target.id === 'image-upload' 
        ? 'image' 
        : event.target.id === 'gif-upload' 
          ? 'gif' 
          : event.target.id === 'audio-upload' || file.type.startsWith('audio/')
            ? 'audio' 
            : 'image';
      
      // Get user profile data first for the optimistic update
      const profileData = await getUserProfile(user.id);
      
      // Create an optimistic message before the file is uploaded
      tempMessage = createOptimisticMessage(
        user.id, 
        text || "", 
        groupId, 
        profileData.username,
        profileData.avatar_url,
        URL.createObjectURL(file), // Use temporary local URL for immediate display
        mediaType
      );
      
      // Set the temporary ID and add it with 'sending' status
      tempMessage.id = tempId;
      tempMessage.status = 'sending';
      
      // Add to messages immediately
      setMessages(prevMessages => [...prevMessages, tempMessage!]);
      
      // Upload the media file
      const publicUrl = await uploadMedia(file, mediaType as any, user.id);
      
      if (!publicUrl) {
        throw new Error("Failed to upload media");
      }

      // Send the media message to the database with the actual URL
      const result = await sendMediaMessage(groupId, user.id, publicUrl, mediaType, text, tempId);
      
      // Update status to 'sent' when successfully delivered
      if (result && result.success) {
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === tempId ? { 
              ...msg, 
              status: 'sent',
              media_url: publicUrl // Replace the local blob URL with the actual URL
            } : msg
          )
        );
      }
    } catch (error: any) {
      console.error("Error uploading media:", error);
      toast.error(error.message || "Failed to upload media.");
      // Keep the message but indicate it failed (we don't remove it)
    } finally {
      setUploadingMedia(false);
      // Reset the input value so the same file can be uploaded again
      event.target.value = '';
    }
  };

  return {
    uploadingMedia,
    handleFileUpload
  };
};
