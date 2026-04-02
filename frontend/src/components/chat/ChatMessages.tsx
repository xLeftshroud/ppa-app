import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/store/useChatStore";

function formatContent(content: string) {
  // Simple markdown-lite: bold (**text**) and line breaks
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function ChatMessages({
  messages,
  isLoading,
}: {
  messages: ChatMessage[];
  isLoading: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
      {messages.length === 0 && !isLoading && (
        <div className="text-sm text-muted-foreground text-center mt-8">
          Ask me about your pricing data — e.g. "What volume would I get at £2.50?"
        </div>
      )}

      {messages.map((msg) => {
        if (msg.role === "user") {
          return (
            <div key={msg.id} className="flex justify-end">
              <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 max-w-[85%] text-sm whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          );
        }
        if (msg.role === "system") {
          return (
            <div key={msg.id} className="flex justify-center">
              <div className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 max-w-[90%] text-xs">
                {msg.content}
              </div>
            </div>
          );
        }
        // assistant
        return (
          <div key={msg.id} className="flex justify-start">
            <div className="bg-muted rounded-lg px-3 py-2 max-w-[85%] text-sm whitespace-pre-wrap">
              {formatContent(msg.content)}
            </div>
          </div>
        );
      })}

      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground">
            <span className="inline-flex gap-1">
              <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
            </span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
