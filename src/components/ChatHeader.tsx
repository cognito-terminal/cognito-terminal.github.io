import React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface ChatHeaderProps {
  currentGroup: {
    id: string;
    name: string;
    description?: string;
  } | null;
}

const ChatHeader = ({ currentGroup }: ChatHeaderProps) => {
  const terminalPath = currentGroup ? `/${currentGroup.name.toLowerCase()}` : "";
  const terminalDisplay = `cognito@terminal:${terminalPath}$`;
  
  // Truncate the description to 30 characters if needed
  const truncatedDescription = currentGroup?.description 
    ? currentGroup.description.length > 30 
      ? `${currentGroup.description.substring(0, 30)}...` 
      : currentGroup.description
    : "No description";
  
  return (
    <div className="py-2 px-3 border-b border-terminal-border sticky top-0 bg-terminal z-50 shadow-sm">
      <div className="flex items-center">
        <SidebarTrigger />
        <div className="ml-3 text-xs text-terminal-foreground">
          <span>{terminalDisplay}</span>
        </div>
      </div>

      {currentGroup && (
        <div className="mt-1 ml-8">
          <p className="text-xs text-terminal-foreground/50 truncate max-w-[80%]">
            {truncatedDescription}
          </p>
        </div>
      )}
    </div>
  );
};

export default ChatHeader;