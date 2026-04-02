import type { SuggestedAction } from "@/store/useChatStore";

export function SuggestedActions({
  actions,
  onSelect,
  disabled,
}: {
  actions: SuggestedAction[];
  onSelect: (message: string) => void;
  disabled?: boolean;
}) {
  if (actions.length === 0) return null;

  return (
    <div className="flex gap-1.5 px-3 py-1.5 overflow-x-auto border-t">
      {actions.map((a, i) => (
        <button
          key={i}
          onClick={() => !disabled && onSelect(a.message)}
          disabled={disabled}
          className="shrink-0 text-xs px-2.5 py-1 rounded-full border bg-background hover:bg-muted text-foreground transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
