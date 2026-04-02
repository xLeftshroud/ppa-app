import { create } from "zustand";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  isLoading?: boolean;
}

export interface UIAction {
  action: string;
  params: Record<string, unknown>;
}

export interface SuggestedAction {
  label: string;
  message: string;
}

interface ChatState {
  messages: ChatMessage[];
  isOpen: boolean;
  isLoading: boolean;
  suggestedActions: SuggestedAction[];

  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  addUserMessage: (content: string) => string;
  addAssistantMessage: (content: string) => void;
  addSystemError: (content: string) => void;
  setLoading: (loading: boolean) => void;
  setSuggestedActions: (actions: SuggestedAction[]) => void;
  clearHistory: () => void;
}

let _nextId = 0;
function genId() {
  return `chat-${Date.now()}-${++_nextId}`;
}

export const useChatStore = create<ChatState>()((set) => ({
  messages: [],
  isOpen: false,
  isLoading: false,
  suggestedActions: [],

  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),
  setOpen: (open) => set({ isOpen: open }),

  addUserMessage: (content) => {
    const id = genId();
    set((s) => ({
      messages: [
        ...s.messages,
        { id, role: "user", content, timestamp: Date.now() },
      ],
    }));
    return id;
  },

  addAssistantMessage: (content) =>
    set((s) => ({
      messages: [
        ...s.messages,
        { id: genId(), role: "assistant", content, timestamp: Date.now() },
      ],
    })),

  addSystemError: (content) =>
    set((s) => ({
      messages: [
        ...s.messages,
        { id: genId(), role: "system", content, timestamp: Date.now() },
      ],
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  setSuggestedActions: (actions) => set({ suggestedActions: actions }),

  clearHistory: () => set({ messages: [], suggestedActions: [] }),
}));
