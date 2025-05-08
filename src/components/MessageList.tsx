import React, { useRef, useLayoutEffect, useEffect, useState } from "react";
import MessageItem from "@/components/MessageItem";
import AvailableGroups from "@/components/AvailableGroups";
import { leaveGroup } from "@/services/groupService";
import { useAuth } from "@/hooks/useAuth";
import { Message } from "@/services/messageService";
import { toast } from "sonner";

interface MessageListProps {
  messages: Message[];
  currentGroup: { id: string; name: string; description?: string } | null;
  loading: boolean;
  userId: string | undefined;
}

const MessageList = ({
  messages,
  currentGroup,
  loading,
  userId,
}: MessageListProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [leaveGroupLoading, setLeaveGroupLoading] = useState<Record<string, boolean>>({});

  // Local display state to prevent "leaked" messages on group switch
  const [displayMessages, setDisplayMessages] = useState<Message[]>([]);

  // Dummy state to trigger re-renders for live "time ago" updates
  const [now, setNow] = useState(Date.now());

  // 1️⃣ Clear when switching groups
  useEffect(() => {
    setDisplayMessages([]);
  }, [currentGroup?.id]);

  // 2️⃣ Mirror new incoming messages
  useEffect(() => {
    setDisplayMessages(messages);
  }, [messages]);

  // 3️⃣ Scroll to bottom on displayMessages change
  useLayoutEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ block: "end" });
    }
  }, [displayMessages]);

  // 4️⃣ Tick every minute to update relative timestamps
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleLeaveGroup = async (groupId: string, groupName: string) => {
    if (!user) return;
    setLeaveGroupLoading((prev) => ({ ...prev, [groupId]: true }));
    try {
      await leaveGroup(groupId, user.id);
      toast.success(`You have left ${groupName}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to leave group");
    } finally {
      setLeaveGroupLoading((prev) => ({ ...prev, [groupId]: false }));
    }
  };

  return (
    <div
      className="flex-1 overflow-y-auto terminal-scrollbar px-1 py-1 relative"
      ref={containerRef}
    >
      {/* Show available groups when no group is selected */}
      {!currentGroup && <AvailableGroups onJoinRequest={handleLeaveGroup} />}

      {/* No messages in current group */}
      {currentGroup && displayMessages.length === 0 && !loading && (
        <div className="text-center text-terminal-foreground/50 mt-10">
          <p>No messages yet. Start the conversation!</p>
        </div>
      )}

      {/* Loading messages */}
      {loading && (
        <div className="text-center text-terminal-foreground/50 mt-10">
          <p>Loading messages...</p>
        </div>
      )}

      {/* Render messages */}
      {currentGroup &&
        displayMessages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            isCurrentUser={message.userId === userId}
            currentGroup={currentGroup}
          />
        ))}

      {/* Sentinel for scrollIntoView fallback */}
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
