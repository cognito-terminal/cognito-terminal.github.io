import React, { useState, useRef } from "react";
import { Send, Image, Gift, Mic, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MessageInputProps {
  currentGroup: { id: string; name: string; description?: string } | null;
  onSendMessage: (content: string) => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>, text?: string) => void;
  uploadingMedia: boolean;
}

const MessageInput = ({
  currentGroup,
  onSendMessage,
  onFileUpload,
  uploadingMedia,
}: MessageInputProps) => {
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<string | null>(null);
  // ← stash the real input event so we don’t have to fake it later
  const [fileEvent, setFileEvent] = useState<React.ChangeEvent<HTMLInputElement> | null>(null);

  // References to file inputs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const gifInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if ((!text.trim() && !selectedFile) || uploadingMedia) return;

    if (selectedFile && fileEvent) {
      // Use the real file-change event, which includes the files payload
      onFileUpload(fileEvent, text);

      // Reset everything
      setSelectedFile(null);
      setSelectedFileType(null);
      setFileEvent(null);
    } else {
      onSendMessage(text.trim());
    }

    setText("");
  };

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSelectedFileType(event.target.id);
      setFileEvent(event);
    }
  };

  const cancelFileSelection = () => {
    setSelectedFile(null);
    setSelectedFileType(null);
    setFileEvent(null);
    // Reset input values
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (gifInputRef.current) gifInputRef.current.value = "";
    if (audioInputRef.current) audioInputRef.current.value = "";
  };

  if (!currentGroup) return null;

  return (
    <div className="flex flex-col p-2 border-t border-terminal-border bg-terminal z-50">
      {/* Preview selected file */}
      {selectedFile && (
        <div className="mb-2 p-2 bg-terminal-muted rounded-lg flex justify-between items-center">
          <div className="flex items-center space-x-2">
            {selectedFileType?.includes("image") && (
              <Image size={16} className="text-terminal-foreground/70" />
            )}
            {selectedFileType?.includes("gif") && (
              <Gift size={16} className="text-terminal-foreground/70" />
            )}
            {selectedFileType?.includes("audio") && (
              <Mic size={16} className="text-terminal-foreground/70" />
            )}
            <span className="text-sm text-terminal-foreground/70 truncate max-w-[200px]">
              {selectedFile.name}
            </span>
          </div>
          <button
            onClick={cancelFileSelection}
            className="text-terminal-foreground/70 hover:text-terminal-foreground p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-center">
        {/* Attach icons + emoji placeholder */}
        <div className="flex space-x-2 px-2">
          <button
            onClick={() => imageInputRef.current?.click()}
            className="text-terminal-foreground/70 hover:text-terminal-foreground"
            disabled={uploadingMedia}
          >
            <Image size={24} />
            <input
              ref={imageInputRef}
              id="image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelection}
            />
          </button>
          <button
            onClick={() => gifInputRef.current?.click()}
            className="text-terminal-foreground/70 hover:text-terminal-foreground"
            disabled={uploadingMedia}
          >
            <Gift size={24} />
            <input
              ref={gifInputRef}
              id="gif-upload"
              type="file"
              accept="image/gif"
              className="hidden"
              onChange={handleFileSelection}
            />
          </button>
        </div>

        {/* Input box */}
        <div className="flex items-center flex-1 bg-terminal-muted rounded-full px-4 py-2 mx-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={selectedFile ? "Add a caption..." : "Type a message"}
            className="flex-1 resize-none bg-transparent outline-none text-sm text-terminal-foreground placeholder-terminal-foreground/50 h-6 max-h-20"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
        </div>

        {/* Send / mic button */}
        <div className="px-2">
          {text.trim() || selectedFile ? (
            <button
              onClick={handleSend}
              className="bg-green-500 hover:bg-green-600 p-3 rounded-full shadow-md"
              disabled={uploadingMedia}
            >
              <Send size={20} className="text-white" />
            </button>
          ) : (
            <button
              onClick={() => audioInputRef.current?.click()}
              className="text-terminal-foreground/70 hover:text-terminal-foreground p-3"
              disabled={uploadingMedia}
            >
              <Mic size={20} />
              <input
                ref={audioInputRef}
                id="audio-upload"
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleFileSelection}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageInput;
