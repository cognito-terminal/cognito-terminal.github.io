
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { fetchUserGroups, subscribeToGroupChanges, Group } from "@/services/groupService";

const SidebarGroupsList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  
  // Fetch groups the user is part of
  useEffect(() => {
    if (!user) return;
    
    const loadGroups = async () => {
      try {
        const groupsData = await fetchUserGroups(user.id);
        setGroups(groupsData || []);
        
        // Set up unread counts
        const initialUnreadCounts: Record<string, number> = {};
        groupsData?.forEach(group => {
          initialUnreadCounts[group.id] = 0;
        });
        setUnreadCounts(initialUnreadCounts);
      } catch (error) {
        console.error("Error loading groups:", error);
      }
    };
    
    loadGroups();
    
    // Subscribe to group changes
    const groupsChannel = subscribeToGroupChanges(user.id, loadGroups);
      
    return () => {
      supabase.removeChannel(groupsChannel);
    };
  }, [user]);
  
  // Set active group based on URL and subscribe to new messages
  useEffect(() => {
    const pathParts = location.pathname.split("/");
    if (pathParts.includes("chat") && pathParts.length > 2) {
      setActiveGroup(pathParts[2]);
    } else if (groups.length > 0) {
      setActiveGroup(groups[0].id); // Default to first group
    }
    
    if (!user) return;
    
    // Subscribe to new messages for unread counts
    const messagesChannel = supabase.channel('public:messages')
      .on('postgres_changes', 
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        }, 
        (payload) => {
          const newMessage = payload.new as {
            id: string;
            group_id: string;
            user_id: string;
            content: string;
          };
          
          // Only count as unread if not from the current user and not in active group
          if (newMessage.user_id !== user.id && 
              newMessage.group_id !== activeGroup) {
            setUnreadCounts(prev => ({
              ...prev,
              [newMessage.group_id]: (prev[newMessage.group_id] || 0) + 1
            }));
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [location.pathname, groups, user, activeGroup]);
  
  // Reset unread count when switching to a group
  useEffect(() => {
    if (activeGroup) {
      setUnreadCounts(prev => ({
        ...prev,
        [activeGroup]: 0
      }));
    }
  }, [activeGroup]);

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-terminal-foreground/70">Groups</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {groups.map((group) => (
            <SidebarMenuItem key={group.id}>
              <SidebarMenuButton 
                onClick={() => navigate(`/chat/${group.id}`)}
                className={group.id === activeGroup ? "bg-terminal-muted" : ""}
              >
                <span># {group.name}</span>
                {unreadCounts[group.id] > 0 && (
                  <span className="ml-auto bg-terminal-foreground text-terminal rounded-full text-xs px-2 py-0.5">
                    {unreadCounts[group.id]}
                  </span>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          {groups.length === 0 && (
            <div className="px-3 py-2 text-sm text-terminal-foreground/50">
              No groups joined yet
            </div>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

export default SidebarGroupsList;
