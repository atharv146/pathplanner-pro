import { Link } from "@tanstack/react-router";
import { Map, MessageCircle, BookOpen } from "lucide-react";

export function BottomNav({ accountType }: { accountType: "student" | "parent" }) {
  const tabs = [
    { to: "/roadmap" as const, label: "Roadmap", Icon: Map },
    { to: "/chat" as const, label: "Ask AI", Icon: MessageCircle },
    { to: "/guide" as const, label: accountType === "parent" ? "Guide" : "Guide", Icon: BookOpen },
  ];
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur-lg">
      <div className="mx-auto max-w-2xl grid grid-cols-3 px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {tabs.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center gap-1 py-2 rounded-2xl text-muted-foreground data-[status=active]:text-primary transition"
            activeProps={{ className: "text-primary" }}
          >
            <Icon className="w-5 h-5" strokeWidth={2.2} />
            <span className="text-[11px] font-semibold">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}