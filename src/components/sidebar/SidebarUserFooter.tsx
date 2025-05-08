
import { useState, useEffect } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SidebarFooter } from "@/components/ui/sidebar";

interface Profile {
  id: string;
  username: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  email?: string;
}

const SidebarUserFooter = () => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  
  // Fetch user profile
  useEffect(() => {
    if (!user) return;
    
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }
      
      setProfile({
        ...data,
        email: user.email
      });
    };
    
    fetchProfile();
  }, [user]);

  if (!profile) return null;

  return (
    <SidebarFooter>
      <div className="p-4 border-t border-terminal-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-terminal-muted border border-terminal-foreground/30 flex items-center justify-center">
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.username} 
                  className="w-8 h-8 rounded-full object-cover" 
                />
              ) : (
                <span className="text-terminal-foreground text-sm">
                  {profile.username.charAt(0)}
                </span>
              )}
            </div>
            <div className="text-sm">
              <p className="font-medium text-terminal-foreground">{profile.username}</p>
              <p className="text-terminal-foreground/50 text-xs truncate">{profile.email}</p>
            </div>
          </div>
          <button onClick={() => signOut()} className="text-terminal-foreground/70 hover:text-terminal-foreground">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </SidebarFooter>
  );
};

export default SidebarUserFooter;
