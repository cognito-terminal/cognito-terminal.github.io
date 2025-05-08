
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  fetchMessages, 
  fetchUserProfiles, 
  formatMessages, 
  getUserProfile,
  Message
} from "@/services/messageService";
import { fetchGroupInfo, Group } from "@/services/groupService";

interface User {
  id: string;
}

export const useChatMessages = (groupId: string | undefined, user: User | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const pollingIntervalRef = useRef<number | null>(null);
  const lastMessageTimestampRef = useRef<string | null>(null);

  // Function to fetch latest messages
  const fetchLatestMessages = async () => {
    if (!groupId || !user) return;

    try {
      // Fetch only new messages since the last message timestamp
      const { data: newMessagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('group_id', groupId)
        .gt('created_at', lastMessageTimestampRef.current || '1970-01-01T00:00:00Z')
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error fetching latest messages:", error);
        return;
      }

      // If no new messages, return
      if (!newMessagesData || newMessagesData.length === 0) return;

      // Update the last message timestamp
      if (newMessagesData.length > 0) {
        const latestTimestamp = newMessagesData[newMessagesData.length - 1].created_at;
        lastMessageTimestampRef.current = latestTimestamp;
      }

      // Get unique user IDs from messages
      const userIds = [...new Set(newMessagesData?.map(msg => msg.user_id) || [])];
      
      // Fetch profiles for those user IDs
      const profilesData = await fetchUserProfiles(userIds);

      // Create a map of user IDs to their profile data for easy lookup
      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      // Transform the new messages data with the profiles information
      const formattedNewMessages = formatMessages(newMessagesData, profilesMap);

      // Append new messages
      setMessages(prevMessages => {
        // Filter out any messages that might be duplicates
        const existingMessageIds = new Set(prevMessages.map(msg => msg.id));
        const uniqueNewMessages = formattedNewMessages.filter(msg => !existingMessageIds.has(msg.id));
        
        return [...prevMessages, ...uniqueNewMessages];
      });
    } catch (error) {
      console.error("Error in polling for new messages:", error);
    }
  };

  // Fetch messages and group info
  useEffect(() => {
    if (!user) return;

    const fetchChatData = async () => {
      setLoading(true);
      if (!groupId) {
        setMessages([]);
        setCurrentGroup(null);
        setLoading(false);
        return;
      }

      try {
        // Fetch group info
        const groupData = await fetchGroupInfo(groupId);
        setCurrentGroup(groupData);

        // Fetch messages
        const messagesData = await fetchMessages(groupId);

        // Get unique user IDs from messages
        const userIds = [...new Set(messagesData?.map(msg => msg.user_id) || [])];
        
        // Fetch profiles for those user IDs
        const profilesData = await fetchUserProfiles(userIds);

        // Create a map of user IDs to their profile data for easy lookup
        const profilesMap = new Map();
        profilesData?.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });

        // Transform the messages data with the profiles information
        const formattedMessages = formatMessages(messagesData, profilesMap);

        // Set the last message timestamp if there are messages
        if (messagesData && messagesData.length > 0) {
          lastMessageTimestampRef.current = messagesData[messagesData.length - 1].created_at;
        }

        setMessages(formattedMessages);
      } catch (error) {
        console.error("Error fetching chat data:", error);
        toast.error("Failed to load chat data.");
      } finally {
        setLoading(false);
      }
    };

    fetchChatData();

    // Set up polling interval to check for new messages every 2 seconds
    pollingIntervalRef.current = window.setInterval(fetchLatestMessages, 2000);

    // Subscribe to new messages
    const messagesSubscription = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const newMsg = payload.new as any;
        
        if (newMsg.group_id === groupId) {
          try {
            // Fetch the user data for this message
            const userData = await getUserProfile(newMsg.user_id);
            
            const formattedMessage: Message = {
              id: newMsg.id,
              userId: newMsg.user_id,
              username: userData?.username || "Unknown User",
              content: newMsg.content || "",
              timestamp: newMsg.created_at,
              media_url: newMsg.media_url,
              media_type: newMsg.media_type,
              avatar_url: userData?.avatar_url,
              group_id: newMsg.group_id
            };

            // Update last message timestamp
            lastMessageTimestampRef.current = newMsg.created_at;

            setMessages(prevMessages => {
              // Check if message already exists in the list
              const messageExists = prevMessages.some(msg => msg.id === formattedMessage.id);
              if (messageExists) {
                return prevMessages;
              }
              return [...prevMessages, formattedMessage];
            });
          } catch (error) {
            console.error("Error processing new message:", error);
          }
        }
      })
      .subscribe();

    return () => {
      // Clear polling interval when component unmounts or groupId changes
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      supabase.removeChannel(messagesSubscription);
    };
  }, [groupId, user]);

  return {
    messages,
    currentGroup,
    loading,
  };
};
