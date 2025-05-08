import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

export interface Message {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
  media_url?: string;
  media_type?: string;
  avatar_url?: string;
  group_id?: string;
  status?: 'sending' | 'sent'; // New status field
}

export const fetchMessages = async (groupId: string) => {
  try {
    // Fetch messages
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
      toast.error("Failed to load messages.");
      throw messagesError;
    }

    return messagesData;
  } catch (error) {
    console.error("Error in fetchMessages:", error);
    throw error;
  }
};

export const fetchUserProfiles = async (userIds: string[]) => {
  try {
    // Fetch profiles for those user IDs
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', userIds);
      
    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    return profilesData;
  } catch (error) {
    console.error("Error in fetchUserProfiles:", error);
    throw error;
  }
};

export const formatMessages = (messagesData: any[], profilesMap: Map<string, any>): Message[] => {
  return messagesData?.map(msg => {
    const profile = profilesMap.get(msg.user_id);
    return {
      id: msg.id,
      userId: msg.user_id,
      username: profile?.username || "Unknown User",
      content: msg.content || "",
      timestamp: msg.created_at,
      media_url: msg.media_url,
      media_type: msg.media_type,
      avatar_url: profile?.avatar_url,
      group_id: msg.group_id,
      status: 'sent' // New status field - all messages are initially 'sent'
    };
  }) || [];
};

export const sendTextMessage = async (groupId: string, userId: string, content: string, tempId?: string) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          group_id: groupId,
          user_id: userId,
          content,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message.");
      throw error;
    }
    
    return { success: true, tempId, serverMessage: data?.[0] };
  } catch (error) {
    console.error("Error in sendTextMessage:", error);
    throw error;
  }
};

export const sendMediaMessage = async (
  groupId: string, 
  userId: string, 
  mediaUrl: string, 
  mediaType: string,
  content?: string,
  tempId?: string
) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          group_id: groupId,
          user_id: userId,
          content: content || "", // Optional text content when sending media
          created_at: new Date().toISOString(),
          media_url: mediaUrl,
          media_type: mediaType,
        },
      ])
      .select();

    if (error) {
      console.error("Error sending media message:", error);
      toast.error("Failed to send media message.");
      throw error;
    }
    
    return { success: true, tempId, serverMessage: data?.[0] };
  } catch (error) {
    console.error("Error in sendMediaMessage:", error);
    throw error;
  }
};

export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    throw error;
  }
};

export const createOptimisticMessage = (
  userId: string, 
  content: string, 
  groupId: string, 
  username: string,
  avatarUrl?: string,
  mediaUrl?: string,
  mediaType?: string
): Message => {
  return {
    id: uuidv4(),
    userId,
    username,
    content,
    timestamp: new Date().toISOString(),
    avatar_url: avatarUrl,
    group_id: groupId,
    media_url: mediaUrl,
    media_type: mediaType,
    status: 'sending' // New status field - all optimistic messages start as 'sending'
  };
};
