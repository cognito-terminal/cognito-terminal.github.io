
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useGroupNavigation } from "@/hooks/useGroupNavigation";
import { Message } from "@/services/messageService";
import { Play, Pause, Clock, CheckCheck } from "lucide-react";

interface MessageItemProps {
  message: Message;
  isCurrentUser: boolean;
  showAvatar?: boolean;
  currentGroup?: { id: string; name: string } | null;
}

const MessageItem = ({
  message,
  isCurrentUser,
  showAvatar = true,
  currentGroup,
}: MessageItemProps) => {
  const { user } = useAuth();
  const { navigateToGroup } = useGroupNavigation();

  // Force a re-render every minute for live "time ago"
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Timestamp
  const formattedTime = message.timestamp
    ? formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })
    : "Just now";

  const senderName = message.username || "Anonymous";
  const initials = senderName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const getHue = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash % 360;
  };
  const bgColor = message.userId
    ? `hsl(${getHue(message.userId)}, 70%, 30%)`
    : "#333";

  const handleGroupNameClick = () => {
    if (message.group_id) navigateToGroup(message.group_id, user?.id);
  };

  // Audio player state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [message.media_url]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const time = Number(e.target.value);
    if (audio) audio.currentTime = time;
    setProgress(time);
  };

  // Format seconds to mm:ss
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div
      className={cn(
        "flex gap-2 p-2 relative",
        isCurrentUser ? "justify-end" : "justify-start",
        message.status === 'sending' && "opacity-90"
      )}
    >
      {!isCurrentUser && showAvatar && (
        <div className="shrink-0">
          <Avatar className="h-5 w-5">
            {message.avatar_url ? (
              <AvatarImage src={message.avatar_url} alt={senderName} />
            ) : (
              <AvatarFallback style={{ backgroundColor: bgColor }} className="text-xs">
                {initials}
              </AvatarFallback>
            )}
          </Avatar>
        </div>
      )}

      <div
        className={cn(
          "flex flex-col max-w-[85%] rounded px-1 py-2 break-words overflow-hidden",
          isCurrentUser
            ? "bg-terminal-foreground/20 text-terminal-foreground"
            : "bg-terminal-muted text-terminal-foreground"
        )}
      >
        <div className="flex items-center gap-2 mb-1 text-xs text-terminal-foreground/60">
          {!isCurrentUser && <span className="font-semibold">{senderName}</span>}
          {message.group_id &&
            currentGroup &&
            message.group_id !== currentGroup.id && (
              <button
                onClick={handleGroupNameClick}
                className="underline hover:text-terminal-foreground transition-colors"
              >
                #{currentGroup.name}
              </button>
            )}
          <span>{formattedTime}</span>
          
          {/* Message status indicator for current user's messages */}
          {isCurrentUser && message.status && (
            <span className="ml-1">
              {message.status === 'sending' ? (
                <Clock size={12} className="text-terminal-foreground/60" />
              ) : message.status === 'sent' ? (
                <CheckCheck size={12} className="text-green-500" />
              ) : null}
            </span>
          )}
        </div>

        {message.media_url && message.media_type === 'audio' && (
          <div className="bg-terminal-muted p-2 rounded-xl">
          <audio ref={audioRef} src={message.media_url} preload="metadata" hidden />
        
          {/* Controls Row */}
          <div className="flex items-center space-x-2">
            <button onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
        
            <input
              type="range"
              min={0}
              max={duration}
              value={progress}
              onChange={onSeek}
              className="flex-1 h-3 rounded-lg bg-terminal-border accent-[#3bf654] focus:outline-none"
            />
          </div>
        
          {/* Time display below */}
          <div className="text-center text-xs text-terminal-foreground/60 mt-3">
            {formatTime(progress)} / {formatTime(duration)}
          </div>
        </div>
        
        )}

        {message.media_url && message.media_type !== 'audio' && (
          <img
            src={message.media_url}
            alt="Media attachment"
            className="max-w-full rounded"
            style={{ maxHeight: "300px" }}
          />
        )}

        {message.content && (
          <div className="text-sm -foreground/80 markdown-content break-words overflow-hidden">
            <ReactMarkdown
              components={{
                code({ node, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  return (
                    <pre
                      className={cn(
                        "my-2 p-2 rounded bg-terminal-input overflow-auto",
                        match && match[1] ? `language-${match[1]}` : ""
                      )}
                    >
                      <code className={cn("text-terminal-foreground text-xs", className)} {...props}>
                        {children}
                      </code>
                    </pre>
                  );
                },
                a: ({ node, ...props }) => (
                  <a {...props} className="text-terminal-foreground underline break-all" target="_blank" rel="noopener noreferrer" />
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageItem;
