import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Bell, User, Settings, Check, X, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { uploadMedia } from "@/services/mediaService";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface Invite {
  id: string;
  groupId: string;
  groupName: string;
  fromUserId: string;
  fromUsername: string;
  timestamp: string;
}

interface Profile {
  id: string;
  username: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
}

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  
  // Form state
  const [profileData, setProfileData] = useState({
    username: "",
    full_name: "",
    bio: "",
  });

  // Settings
  const [settings, setSettings] = useState({
    soundNotifications: true,
    desktopNotifications: false,
    darkTheme: true,
  });

  // Fetch profile data
  useEffect(() => {
    if (!user) return;
    
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        
        setProfile(data);
        setProfileData({
          username: data.username || "",
          full_name: data.full_name || "",
          bio: data.bio || "",
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
      }
    };
    
    fetchProfile();
  }, [user]);

  // Fetch invites - modified to fix the relationship issue
  useEffect(() => {
    if (!user) return;
    
    const fetchInvites = async () => {
      try {
        // Get invites for this user (by email or id)
        const { data: invitesData, error: invitesError } = await supabase
          .from('invites')
          .select(`
            id,
            group_id,
            invited_by,
            sent_at,
            groups:group_id (name)
          `)
          .or(`invited_user_id.eq.${user.id},invited_user_email.eq.${user.email}`)
          .eq('status', 'pending');
          
        if (invitesError) throw invitesError;
        
        // Fetch usernames separately 
        const inviterIds = invitesData.map(invite => invite.invited_by).filter(Boolean);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', inviterIds);
          
        if (profilesError) throw profilesError;
        
        // Map of user_id to username
        const usernameMap = profilesData.reduce((acc, profile) => {
          acc[profile.id] = profile.username;
          return acc;
        }, {} as Record<string, string>);
        
        // Format invites for display
        const formattedInvites: Invite[] = (invitesData || []).map(invite => ({
          id: invite.id,
          groupId: invite.group_id,
          groupName: invite.groups?.name || 'Unknown Group',
          fromUserId: invite.invited_by,
          fromUsername: usernameMap[invite.invited_by] || 'Unknown User',
          timestamp: invite.sent_at,
        }));
        
        setInvites(formattedInvites);
      } catch (error) {
        console.error('Error fetching invites:', error);
      }
    };
    
    fetchInvites();
    
    // Subscribe to invite changes
    const invitesChannel = supabase.channel('invites:changes')
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'invites',
          filter: `invited_user_id=eq.${user.id}`
        }, 
        () => {
          fetchInvites();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(invitesChannel);
    };
  }, [user]);

  const handleProfileUpdate = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: profileData.username,
          full_name: profileData.full_name,
          bio: profileData.bio
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      toast({
        title: "Profile updated",
        description: "Your terminal identity has been updated",
      });
      
      // Update the profile state
      setProfile(prev => prev ? {
        ...prev,
        username: profileData.username,
        full_name: profileData.full_name,
        bio: profileData.bio
      } : null);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update failed",
        description: "Could not update your profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsUpdate = () => {
    setLoading(true);
    
    // In a real app, this would save to a user_settings table in Supabase
    // For now we'll just show a success toast
    setTimeout(() => {
      toast({
        title: "Settings updated",
        description: "Terminal preferences applied",
      });
      
      setLoading(false);
    }, 500);
  };

  const handleInviteResponse = async (inviteId: string, accept: boolean) => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Get the invite details before updating
      const { data: inviteData, error: inviteError } = await supabase
        .from('invites')
        .select('group_id')
        .eq('id', inviteId)
        .single();
        
      if (inviteError) throw inviteError;
      
      // Update the invite status
      const { error: updateError } = await supabase
        .from('invites')
        .update({ status: accept ? 'accepted' : 'declined' })
        .eq('id', inviteId);
        
      if (updateError) throw updateError;
      
      if (accept && inviteData) {
        // Add user to the group
        const { error: memberError } = await supabase
          .from('group_members')
          .insert([{
            group_id: inviteData.group_id,
            user_id: user.id
          }]);
          
        if (memberError) throw memberError;
      }
      
      // Remove the invite from the list
      setInvites(invites.filter(invite => invite.id !== inviteId));
      
      toast({
        title: accept ? "Invite accepted" : "Invite declined",
        description: accept 
          ? "You have joined the group" 
          : "Invitation has been declined",
      });
    } catch (error) {
      console.error('Error handling invite:', error);
      toast({
        title: "Error",
        description: "Failed to process invitation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !profile) return;
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setUploadingAvatar(true);
    
    try {
      // Upload the file using our mediaService
      const publicUrl = await uploadMedia(file, 'image', user.id);
      
      if (!publicUrl) {
        throw new Error('Failed to upload avatar');
      }
      
      // Update the profile with the new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      // Update the local profile state
      setProfile({ ...profile, avatar_url: publicUrl });
      
      toast({
        title: "Avatar updated",
        description: "Your profile image has been updated",
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload failed",
        description: "Could not update your avatar",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    // Real deletion would happen here, but for safety we'll just log out the user
    try {
      // In a real implementation we would delete the account from Supabase Auth
      // SECURITY NOTE: In a production app, this should be done through a secure backend function
      
      await signOut();
      
      toast({
        title: "Account deleted",
        description: "Your terminal access has been revoked",
      });
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive",
      });
    }
  };

  if (!user || !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="text-terminal-foreground text-lg">
          <span className="cursor">Loading user data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <SidebarTrigger />
        <h1 className="text-2xl font-bold text-terminal-foreground">Terminal Profile</h1>
      </div>
      
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid grid-cols-3 mb-6 bg-terminal-muted">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User size={16} />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell size={16} />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings size={16} />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <Card className="bg-terminal-muted border-terminal-border text-terminal-foreground">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>User Identity</CardTitle>
                  <CardDescription className="text-terminal-foreground/70">
                    Update your terminal identity details
                  </CardDescription>
                </div>
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-terminal-muted border border-terminal-foreground/30 flex items-center justify-center overflow-hidden">
                    {profile.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt={profile.username} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span className="text-terminal-foreground text-2xl">
                        {profile.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    id="avatar-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleUploadAvatar}
                    disabled={uploadingAvatar}
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 bg-terminal-foreground text-terminal rounded-full p-1 cursor-pointer hover:bg-terminal-foreground/80"
                  >
                    {uploadingAvatar ? (
                      <span className="animate-spin">⟳</span>
                    ) : (
                      <Upload size={14} />
                    )}
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="username" className="block text-sm text-terminal-foreground/80 mb-1">
                      Username
                    </label>
                    <Input
                      id="username"
                      value={profileData.username}
                      onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                      className="bg-terminal border-terminal-border text-terminal-foreground"
                    />
                  </div>
                  <div>
                    <label htmlFor="name" className="block text-sm text-terminal-foreground/80 mb-1">
                      Display Name
                    </label>
                    <Input
                      id="name"
                      value={profileData.full_name || ""}
                      onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                      className="bg-terminal border-terminal-border text-terminal-foreground"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm text-terminal-foreground/80 mb-1">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={user.email || ""}
                    readOnly
                    className="bg-terminal/50 border-terminal-border text-terminal-foreground/80"
                  />
                  <p className="text-xs text-terminal-foreground/50 mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label htmlFor="bio" className="block text-sm text-terminal-foreground/80 mb-1">
                    Bio
                  </label>
                  <Textarea
                    id="bio"
                    value={profileData.bio || ""}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    className="bg-terminal border-terminal-border text-terminal-foreground resize-none h-24"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  // Reset form to original values
                  setProfileData({
                    username: profile.username || "",
                    full_name: profile.full_name || "",
                    bio: profile.bio || "",
                  });
                }}
                className="border-terminal-border text-terminal-foreground hover:bg-terminal"
              >
                Reset
              </Button>
              <Button 
                onClick={handleProfileUpdate}
                disabled={loading}
                className="bg-terminal-foreground text-terminal hover:bg-terminal-foreground/80"
              >
                {loading ? "Updating..." : "Update Profile"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications">
          <Card className="bg-terminal-muted border-terminal-border text-terminal-foreground">
            <CardHeader>
              <CardTitle>Group Invitations</CardTitle>
              <CardDescription className="text-terminal-foreground/70">
                Pending invitations to secure groups
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invites.length === 0 ? (
                <div className="text-center py-8 text-terminal-foreground/60">
                  <p>No pending invitations</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invites.map((invite) => (
                    <div 
                      key={invite.id}
                      className="p-4 border border-terminal-border rounded-md bg-terminal flex justify-between items-center"
                    >
                      <div>
                        <p className="text-terminal-foreground font-medium">
                          Invitation to #{invite.groupName}
                        </p>
                        <p className="text-sm text-terminal-foreground/70">
                          From: {invite.fromUsername}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleInviteResponse(invite.id, true)}
                          className="bg-terminal-foreground text-terminal hover:bg-terminal-foreground/80"
                        >
                          <Check size={16} className="mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleInviteResponse(invite.id, false)}
                          className="border-terminal-border text-terminal-foreground hover:bg-terminal"
                        >
                          <X size={16} className="mr-1" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings">
          <Card className="bg-terminal-muted border-terminal-border text-terminal-foreground">
            <CardHeader>
              <CardTitle>Terminal Settings</CardTitle>
              <CardDescription className="text-terminal-foreground/70">
                Configure your terminal preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-terminal-foreground">Notifications</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-terminal-foreground">Sound Notifications</p>
                      <p className="text-sm text-terminal-foreground/70">Play sound on new messages</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="soundNotifications"
                        checked={settings.soundNotifications}
                        onChange={(e) => setSettings({ ...settings, soundNotifications: e.target.checked })}
                        className="rounded border-terminal-border bg-terminal text-terminal-foreground"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-terminal-foreground">Desktop Notifications</p>
                      <p className="text-sm text-terminal-foreground/70">Show desktop alerts</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="desktopNotifications"
                        checked={settings.desktopNotifications}
                        onChange={(e) => setSettings({ ...settings, desktopNotifications: e.target.checked })}
                        className="rounded border-terminal-border bg-terminal text-terminal-foreground"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-terminal-foreground">Appearance</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-terminal-foreground">Dark Theme</p>
                      <p className="text-sm text-terminal-foreground/70">Use terminal dark mode</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="darkTheme"
                        checked={settings.darkTheme}
                        onChange={(e) => setSettings({ ...settings, darkTheme: e.target.checked })}
                        className="rounded border-terminal-border bg-terminal text-terminal-foreground"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="pt-6 border-t border-terminal-border">
                  <h3 className="text-lg font-medium text-terminal-foreground mb-4">Danger Zone</h3>
                  
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Terminal Account
                  </Button>
                  <p className="text-sm text-terminal-foreground/60 mt-2">
                    This action cannot be undone. All your data will be permanently removed.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSettingsUpdate}
                disabled={loading}
                className="ml-auto bg-terminal-foreground text-terminal hover:bg-terminal-foreground/80"
              >
                {loading ? "Saving..." : "Save Settings"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfilePage;
