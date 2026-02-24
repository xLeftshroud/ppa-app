import { useAppStore } from "@/store/useAppStore";

export function WarningsBanner() {
  const result = useAppStore((s) => s.simulateResult);
  const warnings = result?.warnings ?? [];

  if (warnings.length === 0) return null;

  return (
    <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3">
      <div className="flex items-start gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-600 mt-0.5 shrink-0">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
        <div className="space-y-1">
          {warnings.map((w, i) => (
            <p key={i} className="text-sm text-yellow-800">{w}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
