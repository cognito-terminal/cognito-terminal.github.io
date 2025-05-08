
import { useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import ChatHeader from "@/components/ChatHeader";
import MessageList from "@/components/MessageList";
import MessageInput from "@/components/MessageInput";

const ChatPage = () => {
  const { groupId } = useParams<{ groupId?: string }>();
  const { user } = useAuth();

  const {
    messages,
    currentGroup,
    loading,
    uploadingMedia,
    sendMessage,
    handleFileUpload
  } = useChat(groupId, user);

  return (
    <div className="flex flex-col h-screen">
      {/* Sticky header */}
      <ChatHeader currentGroup={currentGroup} />

      {/* Scrollable messages area */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        <MessageList 
          messages={messages} 
          currentGroup={currentGroup} 
          loading={loading} 
          userId={user?.id} 
        />
      </div>

      {/* Sticky input area */}
      <div className="sticky bottom-0 bg-terminal border-t border-terminal-border z-10">
        <MessageInput 
          currentGroup={currentGroup} 
          onSendMessage={sendMessage}
          onFileUpload={handleFileUpload}
          uploadingMedia={uploadingMedia}
        />
      </div>
    </div>
  );
};

export default ChatPage;
