
import { useLocation, useNavigate } from "react-router-dom";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
} from "@/components/ui/sidebar";
import { MessageCircle, Users, User } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const SidebarNavMenu = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState(0);

  // Fix the highlighting logic - only highlight chat when on main chat page, not group chats
  const isChatPageWithoutGroup = location.pathname === "/chat" || location.pathname === "/";
  const isGroupsPage = location.pathname === "/groups";
  const isProfilePage = location.pathname === "/profile";
  
  // If we're on a specific group's chat page (/chat/[groupId]), don't highlight the chat button
  const isSpecificGroupChatPage = location.pathname.match(/^\/chat\/[0-9a-fA-F-]+$/);
  
  // Fetch pending join requests for groups created by the current user
  useEffect(() => {
    if (!user) return;
    
    const fetchPendingRequests = async () => {
      try {
        // First get all groups created by the user
        const { data: userGroups } = await supabase
          .from('groups')
          .select('id')
          .eq('created_by', user.id);
          
        if (!userGroups || userGroups.length === 0) return;
        
        // Get all pending join requests for these groups
        const groupIds = userGroups.map(g => g.id);
        const { data: requests, error } = await supabase
          .from('invites')
          .select('id')
          .in('group_id', groupIds)
          .eq('status', 'pending')
          .eq('invited_by', null); // These are join requests, not invites
          
        if (error) {
          console.error('Error fetching join requests:', error);
          return;
        }
        
        setPendingRequests(requests?.length || 0);
      } catch (error) {
        console.error('Error checking for pending requests:', error);
      }
    };

    fetchPendingRequests();
    
    // Set up a real-time listener for new join requests
    const channel = supabase
      .channel('join-requests')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'invites',
          filter: `status=eq.pending`
        }, 
        () => {
          fetchPendingRequests();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-terminal-foreground/70">Terminal</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={() => navigate("/chat")}
              className={isChatPageWithoutGroup && !isSpecificGroupChatPage ? "bg-terminal-muted" : ""}
            >
              <MessageCircle size={18} />
              <span>Chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={() => navigate("/groups")}
              className={isGroupsPage ? "bg-terminal-muted" : ""}
            >
              <Users size={18} />
              <span>Groups</span>
              {pendingRequests > 0 && (
                <SidebarMenuBadge>
                  {pendingRequests}
                </SidebarMenuBadge>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={() => navigate("/profile")}
              className={isProfilePage ? "bg-terminal-muted" : ""}
            >
              <User size={18} />
              <span>Profile</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

export default SidebarNavMenu;
