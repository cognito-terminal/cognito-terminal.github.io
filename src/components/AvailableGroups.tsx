
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { fetchAllGroups, requestToJoinGroup, Group, leaveGroup } from "@/services/groupService";
import { useGroupNavigation } from "@/hooks/useGroupNavigation";
import { Terminal, User, UserPlus, Loader2 } from "lucide-react";

interface AvailableGroupsProps {
  onJoinRequest?: (groupId: string, groupName: string) => Promise<void>;
}

// Update the Group interface to include the pendingRequest property
interface ExtendedGroup extends Group {
  pendingRequest?: boolean;
}

const AvailableGroups = ({ onJoinRequest }: AvailableGroupsProps) => {
  const [allGroups, setAllGroups] = useState<ExtendedGroup[]>([]);
  const [joinRequestLoading, setJoinRequestLoading] = useState<Record<string, boolean>>({});
  const [leaveGroupLoading, setLeaveGroupLoading] = useState<Record<string, boolean>>({});
  const { user } = useAuth();
  const navigate = useNavigate();
  const { navigateToGroup } = useGroupNavigation();

  // Fetch groups when component mounts
  useEffect(() => {
    if (user) {
      (async () => {
        try {
          const groups = await fetchAllGroups(user.id);
          setAllGroups(groups.map(g => ({ ...g, pendingRequest: false })));
        } catch (err) {
          console.error("Error loading groups:", err);
          toast.error("Failed to load available groups");
        }
      })();
    }
  }, [user]);

  const handleJoinRequest = async (groupId: string, groupName: string) => {
    if (!user) return;
    setJoinRequestLoading((prev) => ({ ...prev, [groupId]: true }));
    try {
      await requestToJoinGroup(groupId, user.id);
      toast.success(`Request to join ${groupName} sent successfully`);
      setAllGroups((gs) =>
        gs.map((g) =>
          g.id === groupId ? { ...g, pendingRequest: true } : g
        )
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to send join request");
    } finally {
      setJoinRequestLoading((prev) => ({ ...prev, [groupId]: false }));
    }
  };

  const handleLeaveGroup = async (groupId: string, groupName: string) => {
    if (!user) return;
    setLeaveGroupLoading((prev) => ({ ...prev, [groupId]: true }));
    
    try {
      if (onJoinRequest) {
        await onJoinRequest(groupId, groupName);
      } else {
        await leaveGroup(groupId, user.id);
        toast.success(`You have left ${groupName}`);
        // Update the local state to reflect the change
        setAllGroups(gs => gs.map(g => 
          g.id === groupId ? { ...g, isMember: false } : g
        ));
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to leave group");
    } finally {
      setLeaveGroupLoading((prev) => ({ ...prev, [groupId]: false }));
    }
  };

  const handleOpenTerminal = (groupId: string) => {
    if (user) {
      navigateToGroup(groupId, user.id);
    }
  };

  if (allGroups.length === 0) {
    return (
      <div className="text-center text-terminal-foreground/50 mt-10">
        <p>No groups available. Create a new group from the sidebar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-mono text-terminal-foreground mb-4">
        Available Groups
      </h2>
      <div className="grid gap-4">
        {allGroups.map((group) => (
          <div 
            key={group.id} 
            className="border border-terminal-border bg-terminal-muted p-4 rounded-md"
          >
            <div className="flex flex-col">
              <div>
                <h3 className="text-lg font-mono text-terminal-green">{group.name}</h3>
                <p className="text-sm text-terminal-foreground/70 mt-1">
                  {group.description || "No description available"}
                </p>
                <div className="flex items-center mt-2 text-xs text-terminal-foreground/50">
                  <User size={12} className="mr-1" />
                  <span>Created by: {group.created_by_username}</span>
                </div>
              </div>
              
              {/* Fixed button layout for better mobile experience */}
              <div className="mt-4 flex flex-wrap gap-2">
                {group.isMember ? (
                  <div className="w-full flex justify-between items-center">
                  {group.created_by !== user?.id ? (
                    <Button
                      className="flex items-center"
                      size="sm"
                      variant="outline" 
                      disabled={leaveGroupLoading[group.id]}
                      onClick={() => handleLeaveGroup(group.id, group.name)}
                    >
                      {leaveGroupLoading[group.id] ? (
                        <Loader2 size={16} className="animate-spin mr-1" />
                      ) : (
                        <span className="text-red-500">Leave</span>
                      )}
                    </Button>
                  ) : <div />}
                
                  <Button
                    className="flex items-center"
                    size="sm"
                    onClick={() => handleOpenTerminal(group.id)}
                  >
                    <Terminal size={16} className="mr-1" />
                    Open Terminal
                  </Button>
                </div>
                
                ) : (
                  <Button
                    className="flex items-center"
                    size="sm"
                    variant="outline"
                    disabled={joinRequestLoading[group.id] || group.pendingRequest}
                    onClick={() => handleJoinRequest(group.id, group.name)}
                  >
                    {joinRequestLoading[group.id] ? (
                      <Loader2 size={16} className="animate-spin mr-1" />
                    ) : (
                      <UserPlus size={16} className="mr-1" />
                    )}
                    {group.pendingRequest
                      ? "Request Pending"
                      : "Request to Join"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AvailableGroups;
