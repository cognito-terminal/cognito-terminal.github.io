import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Group {
  id: string;
  name: string;
  description?: string;
  created_by?: string;
  created_by_username?: string;
  isMember?: boolean; // Added to track if user is a member
}

export const fetchGroupInfo = async (groupId: string): Promise<Group | null> => {
  try {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (error) {
      console.error("Error fetching group:", error);
      toast.error("Failed to load group info.");
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in fetchGroupInfo:", error);
    throw error;
  }
};

export const subscribeToGroupChanges = (userId: string, callback: () => void) => {
  const groupsChannel = supabase.channel('public:group_members')
    .on('postgres_changes', 
      {
        event: '*',
        schema: 'public',
        table: 'group_members',
        filter: `user_id=eq.${userId}`
      }, 
      () => {
        callback();
      }
    )
    .subscribe();
    
  return groupsChannel;
};

export const fetchUserGroups = async (userId: string): Promise<Group[]> => {
  try {
    // Get groups the user is a member of
    const { data: memberData, error: memberError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);
      
    if (memberError) {
      console.error('Error fetching group memberships:', memberError);
      throw memberError;
    }
    
    if (!memberData || memberData.length === 0) {
      return [];
    }
    
    const groupIds = memberData.map(item => item.group_id);
    
    // Get the group details
    const { data: groupsData, error: groupsError } = await supabase
      .from('groups')
      .select('*')
      .in('id', groupIds);
      
    if (groupsError) {
      console.error('Error fetching groups:', groupsError);
      throw groupsError;
    }
    
    return groupsData || [];
  } catch (error) {
    console.error("Error in fetchUserGroups:", error);
    throw error;
  }
};

// Check if a user is a member of a specific group
export const checkGroupMembership = async (userId: string, groupId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();
      
    if (error) {
      // If the error is because no rows were found, user is not a member
      if (error.code === 'PGRST116') {
        return false;
      }
      throw error;
    }
    
    return !!data;
  } catch (error) {
    console.error("Error checking group membership:", error);
    return false;
  }
};

// Updated function to fetch all available groups
export const fetchAllGroups = async (userId: string): Promise<Group[]> => {
  try {
    // First fetch all groups
    const { data: allGroups, error: groupsError } = await supabase
      .from('groups')
      .select('*');
      
    if (groupsError) {
      console.error('Error fetching all groups:', groupsError);
      throw groupsError;
    }
    
    if (!allGroups || allGroups.length === 0) {
      return [];
    }
    
    // Separately fetch profile information for creators
    const creatorIds = allGroups.map(group => group.created_by).filter(Boolean);
    
    let profilesMap = new Map();
    if (creatorIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', creatorIds);
        
      if (!profilesError && profilesData) {
        profilesData.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });
      }
    }
    
    // Get user's memberships
    const { data: memberships, error: membershipError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);
      
    const userGroupIds = new Set(memberships?.map(m => m.group_id) || []);
    
    // Transform the data to include creator username and membership status
    return allGroups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      created_by: group.created_by,
      created_by_username: group.created_by ? 
        profilesMap.get(group.created_by)?.username || 'Unknown' : 
        'Unknown',
      isMember: userGroupIds.has(group.id)
    }));
    
  } catch (error) {
    console.error("Error in fetchAllGroups:", error);
    throw error;
  }
};

// Function to send a join request
export const requestToJoinGroup = async (groupId: string, userId: string): Promise<void> => {
  try {
    // Check if user is already a member
    const { data: existingMembership, error: membershipError } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single();
      
    if (!membershipError && existingMembership) {
      throw new Error("You are already a member of this group");
    }
    
    // Check if there's already a pending invitation
    const { data: existingInvite, error: inviteError } = await supabase
      .from('invites')
      .select('*')
      .eq('group_id', groupId)
      .eq('invited_user_id', userId)
      .eq('status', 'pending')
      .single();
      
    if (!inviteError && existingInvite) {
      throw new Error("You already have a pending request for this group");
    }
    
    // Get group creator info
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('created_by')
      .eq('id', groupId)
      .single();
      
    if (groupError) {
      console.error('Error fetching group info:', groupError);
      throw new Error("Failed to find group information");
    }
    
    // Create a join request (using invites table)
    // The key change here is setting invited_by to null to indicate it's a join request, not an invite
    const { error: requestError } = await supabase
      .from('invites')
      .insert({
        group_id: groupId,
        invited_user_id: userId,
        invited_by: null, // This field must be null for join requests
        status: 'pending'
      });
      
    if (requestError) {
      console.error('Error creating join request:', requestError);
      throw new Error("Failed to create join request");
    }
    
  } catch (error: any) {
    console.error("Error in requestToJoinGroup:", error);
    throw new Error(error.message || "Failed to request joining the group");
  }
};

// New function to leave a group
export const leaveGroup = async (groupId: string, userId: string): Promise<void> => {
  try {
    // Check if user is the creator of the group
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('created_by')
      .eq('id', groupId)
      .single();
      
    if (groupError) {
      console.error('Error fetching group info:', groupError);
      throw new Error("Failed to find group information");
    }
    
    // Don't allow the creator to leave their own group
    if (groupData.created_by === userId) {
      throw new Error("As the creator, you cannot leave your own group. Please delete the group instead.");
    }
    
    // Remove user from the group
    const { error: leaveError } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);
      
    if (leaveError) {
      console.error('Error leaving group:', leaveError);
      throw new Error("Failed to leave the group");
    }
    
  } catch (error: any) {
    console.error("Error in leaveGroup:", error);
    throw new Error(error.message || "Failed to leave the group");
  }
};
