import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Users, Plus, UserPlus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Group {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  created_by: string | null; // Added to track group creator
}

interface Profile {
  id: string;
  username: string;
  email?: string;
}

const GroupManagementPage = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
  });
  const [inviteData, setInviteData] = useState({
    groupId: "",
    usernameOrEmail: "",
  });
  const [leaveGroupLoading, setLeaveGroupLoading] = useState<Record<string, boolean>>({});

  // Fetch groups
  useEffect(() => {
    if (!user) return;
    
    const fetchGroups = async () => {
      try {
        setLoadingGroups(true);
        
        // Get groups the user is a member of
        const { data: memberData, error: memberError } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id);
          
        if (memberError) throw memberError;
        
        if (!memberData || memberData.length === 0) {
          setGroups([]);
          setLoadingGroups(false);
          return;
        }
        
        const groupIds = memberData.map(item => item.group_id);
        
        // Get the group details - also fetch created_by to identify group creator
        const { data: groupsData, error: groupsError } = await supabase
          .from('groups')
          .select('*, created_by')
          .in('id', groupIds);
          
        if (groupsError) throw groupsError;
        
        // Get member count for each group
        const groupsWithCounts = await Promise.all(
          (groupsData || []).map(async (group) => {
            const { count, error: countError } = await supabase
              .from('group_members')
              .select('*', { count: 'exact', head: true })
              .eq('group_id', group.id);
              
            return {
              ...group,
              memberCount: countError ? 0 : (count || 0)
            };
          })
        );
        
        setGroups(groupsWithCounts);
      } catch (error) {
        console.error('Error fetching groups:', error);
        toast({
          title: "Error",
          description: "Failed to load groups",
          variant: "destructive",
        });
      } finally {
        setLoadingGroups(false);
      }
    };
    
    fetchGroups();
    
    // Subscribe to group member changes
    const groupMemberChannel = supabase.channel('group_members:changes')
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'group_members'
        }, 
        () => {
          fetchGroups();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(groupMemberChannel);
    };
  }, [user]);

  const handleCreateGroup = async () => {
    if (!user) return;
    if (!newGroup.name.trim()) {
      toast({
        title: "Error",
        description: "Group name is required",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Create the group
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert([{
          name: newGroup.name.trim(),
          description: newGroup.description.trim(),
          created_by: user.id
        }])
        .select();
        
      if (groupError) throw groupError;
      
      if (groupData && groupData[0]) {
        // Add the creator as a member
        const { error: memberError } = await supabase
          .from('group_members')
          .insert([{
            group_id: groupData[0].id,
            user_id: user.id
          }]);
          
        if (memberError) throw memberError;
      }
      
      toast({
        title: "Group created",
        description: `Terminal group "${newGroup.name}" has been initialized`,
      });
      
      setNewGroup({ name: "", description: "" });
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (groupId: string, usernameOrEmail: string) => {
    if (!user) return;
    if (!usernameOrEmail.trim()) {
      toast({
        title: "Error",
        description: "Username or email is required",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Check if it's an email or username
      const isEmail = usernameOrEmail.includes('@');
      
      let userId: string | null = null;
      
      // Find the user by email or username
      if (isEmail) {
        // Find a profile with this email via auth.users
        // Since we can't directly query auth.users, we'll try to find them when they accept the invite
        // For now, store just the email
      } else {
        // Find by username
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', usernameOrEmail.trim())
          .single();
          
        if (userError) {
          toast({
            title: "User not found",
            description: `No user with username "${usernameOrEmail}" was found`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        
        userId = userData.id;
      }
      
      // Create the invitation
      const { error: inviteError } = await supabase
        .from('invites')
        .insert([{
          group_id: groupId,
          invited_user_email: isEmail ? usernameOrEmail.trim() : null,
          invited_user_id: userId,
          invited_by: user.id
        }]);
        
      if (inviteError) throw inviteError;
      
      toast({
        title: "Invitation sent",
        description: `Invitation has been sent to ${usernameOrEmail}`,
      });
      
      setInviteData({ groupId: "", usernameOrEmail: "" });
    } catch (error) {
      console.error('Error inviting user:', error);
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // New function to delete a group
  const handleDeleteGroup = async (groupId: string) => {
    if (!user) return;
    
    try {
      setDeletingGroup(true);
      
      // Check if user is the creator of the group
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('created_by')
        .eq('id', groupId)
        .single();
        
      if (groupError) throw groupError;
      
      // Only allow deletion if the user is the creator
      if (groupData.created_by !== user.id) {
        toast({
          title: "Permission denied",
          description: "Only the creator of the group can delete it",
          variant: "destructive",
        });
        return;
      }
      
      // Delete all associated data in the following order:
      // 1. Delete all messages in the group including media
      // First, get all messages with media to delete from storage
      const { data: messagesWithMedia } = await supabase
        .from('messages')
        .select('media_url')
        .eq('group_id', groupId)
        .not('media_url', 'is', null);
      
      // Delete media files from storage if any
      if (messagesWithMedia && messagesWithMedia.length > 0) {
        const mediaUrls = messagesWithMedia
          .map(msg => msg.media_url)
          .filter(url => url && url.includes('media/'));
          
        for (const url of mediaUrls) {
          if (url) {
            const path = url.split('/').pop();
            if (path) {
              await supabase.storage.from('media').remove([path]);
            }
          }
        }
      }
      
      // 2. Delete all messages
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('group_id', groupId);
        
      if (messagesError) throw messagesError;
      
      // 3. Delete all invitations
      const { error: invitesError } = await supabase
        .from('invites')
        .delete()
        .eq('group_id', groupId);
        
      if (invitesError) throw invitesError;
      
      // 4. Delete all group members
      const { error: membersError } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId);
        
      if (membersError) throw membersError;
      
      // 5. Finally delete the group itself
      const { error: deleteError } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);
        
      if (deleteError) throw deleteError;
      
      toast({
        title: "Group deleted",
        description: "The group and all associated data has been removed",
      });
      
      // Update local groups state
      setGroups(groups.filter(group => group.id !== groupId));
      
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        title: "Error",
        description: "Failed to delete group",
        variant: "destructive",
      });
    } finally {
      setDeletingGroup(false);
    }
  };

  // Add a function to handle leaving a group
  const handleLeaveGroup = async (groupId: string) => {
    if (!user) return;
    
    try {
      setLeaveGroupLoading((prev) => ({ ...prev, [groupId]: true }));
      
      // Check if user is the creator of the group
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('created_by')
        .eq('id', groupId)
        .single();
        
      if (groupError) throw groupError;
      
      // Only allow leaving if the user is NOT the creator
      if (groupData.created_by === user.id) {
        toast({
          title: "Cannot leave group",
          description: "As the creator, you cannot leave your own group. You can delete it instead.",
          variant: "destructive",
        });
        return;
      }
      
      // Remove user from the group
      const { error: leaveError } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);
        
      if (leaveError) throw leaveError;
      
      toast({
        title: "Group left",
        description: "You have successfully left the group",
      });
      
      // Update local groups state to remove the left group
      setGroups(groups.filter(group => group.id !== groupId));
      
    } catch (error) {
      console.error('Error leaving group:', error);
      toast({
        title: "Error",
        description: "Failed to leave group",
        variant: "destructive",
      });
    } finally {
      setLeaveGroupLoading((prev) => ({ ...prev, [groupId]: false }));
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="text-terminal-foreground text-lg">
          <span className="cursor">Authentication required...</span>
        </div>
      </div>
    );
  }

  if (loadingGroups) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="text-terminal-foreground text-lg">
          <span className="cursor">Loading terminal data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Rearranged header section - vertical layout */}
    <div className="sticky-header">
      <div className="flex flex-col mb-8">
        <div className="flex items-center mb-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold text-terminal-foreground ml-4">Group Management</h1>
        </div>
      </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-terminal-foreground text-terminal hover:bg-terminal-foreground/80 w-full sm:w-auto">
                <Plus size={16} className="mr-1" />
                New Group
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-terminal-muted border-terminal-border text-terminal-foreground">
              <DialogHeader>
                <DialogTitle className="text-terminal-foreground">Create New Group</DialogTitle>
                <DialogDescription className="text-terminal-foreground/70">
                  Set up a new secure communications channel
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div>
                  <label htmlFor="groupName" className="block text-sm text-terminal-foreground/80 mb-1">
                    Group Name
                  </label>
                  <Input
                    id="groupName"
                    value={newGroup.name}
                    onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                    className="bg-terminal border-terminal-border text-terminal-foreground"
                    placeholder="e.g., SecretOps"
                  />
                </div>
                
                <div>
                  <label htmlFor="groupDescription" className="block text-sm text-terminal-foreground/80 mb-1">
                    Description
                  </label>
                  <Textarea
                    id="groupDescription"
                    value={newGroup.description}
                    onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                    className="bg-terminal border-terminal-border text-terminal-foreground resize-none h-24"
                    placeholder="Describe the purpose of this group..."
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  onClick={handleCreateGroup}
                  disabled={loading}
                  className="bg-terminal-foreground text-terminal hover:bg-terminal-foreground/80"
                >
                  {loading ? "Creating..." : "Create Group"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="border-terminal-border text-terminal-foreground hover:bg-terminal w-full sm:w-auto"
              >
                <UserPlus size={16} className="mr-1" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-terminal-muted border-terminal-border text-terminal-foreground">
              <DialogHeader>
                <DialogTitle className="text-terminal-foreground">Invite User to Group</DialogTitle>
                <DialogDescription className="text-terminal-foreground/70">
                  Send an invitation to join a secure channel
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div>
                  <label htmlFor="inviteGroup" className="block text-sm text-terminal-foreground/80 mb-1">
                    Select Group
                  </label>
                  <select
                    id="inviteGroup"
                    value={inviteData.groupId}
                    onChange={(e) => setInviteData({ ...inviteData, groupId: e.target.value })}
                    className="w-full bg-terminal border border-terminal-border text-terminal-foreground p-2 rounded-md"
                  >
                    <option value="">-- Select Group --</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="userInvite" className="block text-sm text-terminal-foreground/80 mb-1">
                    Username or Email
                  </label>
                  <Input
                    id="userInvite"
                    value={inviteData.usernameOrEmail}
                    onChange={(e) => setInviteData({ ...inviteData, usernameOrEmail: e.target.value })}
                    className="bg-terminal border-terminal-border text-terminal-foreground"
                    placeholder="e.g., hackerman or user@example.com"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  onClick={() => handleInviteUser(inviteData.groupId, inviteData.usernameOrEmail)}
                  disabled={loading || !inviteData.groupId}
                  className="bg-terminal-foreground text-terminal hover:bg-terminal-foreground/80"
                >
                  {loading ? "Sending..." : "Send Invite"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {groups.length === 0 ? (
          <div className="col-span-2 text-center p-8 border border-dashed border-terminal-border rounded-md">
            <Users size={48} className="mx-auto text-terminal-foreground/40 mb-4" />
            <h2 className="text-xl text-terminal-foreground mb-2">No Groups Found</h2>
            <p className="text-terminal-foreground/60 mb-4">
              You haven't joined any groups yet.
            </p>
            <Button 
              onClick={() => document.querySelector<HTMLButtonElement>('[data-dialog-trigger="true"]')?.click()}
              className="bg-terminal-foreground text-terminal hover:bg-terminal-foreground/80"
            >
              <Plus size={16} className="mr-1" />
              Create Your First Group
            </Button>
          </div>
        ) : (
          groups.map((group) => (
            <Card 
              key={group.id}
              className="bg-terminal-muted border-terminal-border text-terminal-foreground"
            >
              <CardHeader>
                <CardTitle className="text-terminal-foreground">
                  #{group.name}
                </CardTitle>
                <CardDescription className="text-terminal-foreground/70">
                  {group.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Users size={16} className="text-terminal-foreground/60" />
                  <span className="text-sm text-terminal-foreground/60">
                    {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap justify-between gap-2">
                <Button
                  variant="outline" 
                  onClick={() => {
                    window.location.href = `/chat/${group.id}`;
                  }}
                  className="border-terminal-border text-terminal-foreground hover:bg-terminal"
                >
                  Open Terminal
                </Button>
                
                <div className="flex space-x-2">
                  {/* Invite button */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="border-terminal-border text-terminal-foreground hover:bg-terminal"
                      >
                        <UserPlus size={16} className="mr-1" />
                        Invite
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-terminal-muted border-terminal-border text-terminal-foreground">
                      <DialogHeader>
                        <DialogTitle className="text-terminal-foreground">Invite to #{group.name}</DialogTitle>
                        <DialogDescription className="text-terminal-foreground/70">
                          Send an invitation to join this secure channel
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="py-4">
                        <label htmlFor={`userInvite-${group.id}`} className="block text-sm text-terminal-foreground/80 mb-1">
                          Username or Email
                        </label>
                        <Input
                          id={`userInvite-${group.id}`}
                          value={inviteData.usernameOrEmail}
                          onChange={(e) => setInviteData({ ...inviteData, usernameOrEmail: e.target.value, groupId: group.id })}
                          className="bg-terminal border-terminal-border text-terminal-foreground"
                          placeholder="e.g., hackerman or user@example.com"
                        />
                      </div>
                      
                      <DialogFooter>
                        <Button 
                          onClick={() => handleInviteUser(group.id, inviteData.usernameOrEmail)}
                          disabled={loading}
                          className="bg-terminal-foreground text-terminal hover:bg-terminal-foreground/80"
                        >
                          {loading ? "Sending..." : "Send Invite"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  {/* Only show delete button if user is the creator */}
                  {user.id === group.created_by ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="border-terminal-border text-red-500 hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-terminal-muted border-terminal-border text-terminal-foreground">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-terminal-foreground">Delete Group</AlertDialogTitle>
                          <AlertDialogDescription className="text-terminal-foreground/70">
                            Are you sure you want to delete <span className="font-bold">#{group.name}</span>? 
                            This will permanently remove all messages and files from this group. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-terminal text-terminal-foreground border-terminal-border">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            disabled={deletingGroup}
                            onClick={(e) => {
                              e.preventDefault();
                              handleDeleteGroup(group.id);
                            }}
                            className="bg-red-500 text-white hover:bg-red-600"
                          >
                            {deletingGroup ? "Deleting..." : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button
                      variant="outline"
                      className="border-terminal-border text-red-500 hover:bg-red-500/10 hover:text-red-400"
                      disabled={leaveGroupLoading[group.id]}
                      onClick={() => handleLeaveGroup(group.id)}
                    >
                      {leaveGroupLoading[group.id] ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        "Leave"
                      )}
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default GroupManagementPage;
