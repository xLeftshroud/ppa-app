import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { SuggestedActions } from "./SuggestedActions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { X, Trash2 } from "lucide-react";
import type { useChat } from "@/hooks/useChat";
import { cn } from "@/lib/utils";

type ChatHook = ReturnType<typeof useChat>;

export function ChatPanel({ chat }: { chat: ChatHook }) {
  const {
    messages,
    isOpen,
    isLoading,
    suggestedActions,
    selectedProvider,
    setSelectedProvider,
    activeProvider,
    canSwitchProviders,
    isChatAvailable,
    areProvidersLoaded,
    setOpen,
    sendMessage,
    clearHistory,
  } = chat;

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
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm">PPA Assistant</h3>
            <div className="mt-1">
              {canSwitchProviders ? (
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-xs transition-colors",
                      selectedProvider === "openai" ? "text-foreground font-medium" : "text-muted-foreground",
                    )}
                  >
                    OpenAI
                  </span>
                  <Switch
                    checked={selectedProvider === "ollama"}
                    onCheckedChange={(checked) => setSelectedProvider(checked ? "ollama" : "openai")}
                    disabled={isLoading}
                    aria-label="Switch chat provider"
                  />
                  <span
                    className={cn(
                      "text-xs transition-colors",
                      selectedProvider === "ollama" ? "text-foreground font-medium" : "text-muted-foreground",
                    )}
                  >
                    Ollama
                  </span>
                  {activeProvider?.model && (
                    <span className="min-w-0 truncate text-xs text-muted-foreground">
                      {activeProvider.model}
                    </span>
                  )}
                </div>
              ) : activeProvider ? (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{activeProvider.label}</Badge>
                  {activeProvider.model && (
                    <span className="min-w-0 truncate text-xs text-muted-foreground">
                      {activeProvider.model}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="warning">
                    {areProvidersLoaded ? "No provider" : "Loading"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {areProvidersLoaded ? "Configure OpenAI or Ollama in backend/.env" : "Fetching chat provider settings"}
                  </span>
                </div>
              )}
            </div>
          </div>
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
          disabled={isLoading || !isChatAvailable}
        />

        {/* Input */}
        <ChatInput
          onSend={sendMessage}
          disabled={isLoading || !isChatAvailable}
          placeholder={isChatAvailable ? "Ask about pricing..." : "Configure OpenAI or Ollama in backend/.env"}
        />
      </div>
    </>
  );
}
