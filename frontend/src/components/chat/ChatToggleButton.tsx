import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

export function ChatToggleButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      size="icon"
      className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full shadow-lg"
    >
      <MessageSquare className="h-5 w-5" />
    </Button>
  );
}
