import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { SuggestedActions } from "./SuggestedActions";
import { Button } from "@/components/ui/button";
import { X, Trash2 } from "lucide-react";
import type { useChat } from "@/hooks/useChat";

type ChatHook = ReturnType<typeof useChat>;

export function ChatPanel({ chat }: { chat: ChatHook }) {
  const { messages, isOpen, isLoading, suggestedActions, setOpen, sendMessage, clearHistory } = chat;

  return (
    <>
      {/* Backdrop on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[400px] max-w-full bg-background border-l shadow-xl z-50 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">PPA Assistant</h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={clearHistory}
              title="Clear chat history"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ChatMessages messages={messages} isLoading={isLoading} />

        {/* Suggested actions */}
        <SuggestedActions
          actions={suggestedActions}
          onSelect={sendMessage}
          disabled={isLoading}
        />

        {/* Input */}
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>
    </>
  );
}
