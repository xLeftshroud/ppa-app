import { ChatInput } from "./ChatInput";
import { ChatMessages } from "./ChatMessages";
import { SuggestedActions } from "./SuggestedActions";
import type { useChat } from "@/hooks/useChat";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Trash2, X } from "lucide-react";

type ChatHook = ReturnType<typeof useChat>;

function ChatPanelContent({
  chat,
  className,
}: {
  chat: ChatHook;
  className: string;
}) {
  const {
    messages,
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
    <div className={className}>
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">PPA Assistant</h3>
          <div className="mt-1">
            {canSwitchProviders ? (
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-xs transition-colors",
                    selectedProvider === "openai" ? "font-medium text-foreground" : "text-muted-foreground",
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
                    selectedProvider === "ollama" ? "font-medium text-foreground" : "text-muted-foreground",
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

      <ChatMessages messages={messages} isLoading={isLoading} />

      <SuggestedActions
        actions={suggestedActions}
        onSelect={sendMessage}
        disabled={isLoading || !isChatAvailable}
      />

      <ChatInput
        onSend={sendMessage}
        disabled={isLoading || !isChatAvailable}
        placeholder={isChatAvailable ? "Ask about pricing..." : "Configure OpenAI or Ollama in backend/.env"}
      />
    </div>
  );
}

export function ChatPanel({ chat }: { chat: ChatHook }) {
  const { isOpen, setOpen } = chat;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <ChatPanelContent
        chat={chat}
        className={cn(
          "fixed top-0 right-0 z-50 flex h-full w-[400px] max-w-full flex-col border-l bg-background shadow-xl transition-transform duration-200 ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      />

      <div className="hidden min-w-0 self-start overflow-hidden md:block">
        <ChatPanelContent
          chat={chat}
          className={cn(
            "sticky top-4 flex h-[calc(100vh-7rem)] max-h-[calc(100vh-4rem)] min-w-0 flex-col overflow-hidden rounded-2xl border bg-background shadow-xl transition-[opacity,transform,box-shadow] duration-200 ease-in-out",
            isOpen ? "pointer-events-auto translate-x-0 opacity-100" : "pointer-events-none translate-x-6 opacity-0 shadow-none",
          )}
        />
      </div>
    </>
  );
}
