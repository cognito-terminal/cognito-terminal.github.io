
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

export const useGroupNavigation = () => {
  const navigate = useNavigate();

  const navigateToGroup = async (groupId: string, userId: string | undefined) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "You must be logged in to view groups",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if the user is a member of this group
      const { data: membership, error: membershipError } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();

      if (membershipError && membershipError.code !== 'PGRST116') {
        console.error("Error checking group membership:", membershipError);
        return;
      }

      if (membership) {
        // User is a member, navigate to the group chat
        navigate(`/chat/${groupId}`);
      } else {
        // User is not a member, navigate to the groups page
        navigate('/groups');
        toast({
          title: "Access Denied",
          description: "You are not a member of this group",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  return { navigateToGroup };
};
