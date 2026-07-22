import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, Check, Compass } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/roadmap")({
  head: () => ({
    meta: [
      { title: "Your roadmap — PathFinder" },
      { name: "description", content: "A grade-by-grade roadmap from middle school through college applications." },
    ],
  }),
  component: Roadmap,
});

function Roadmap() {
  const { userId } = Route.useRouteContext();

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()).data,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["roadmap-items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roadmap_items").select("*").order("grade").order("order_index");
      if (error) throw error;
      return data;
    },
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["progress", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_progress").select("item_id").eq("user_id", userId);
      if (error) throw error;
      return data;
    },
  });

  const done = new Set(progress.map((p) => p.item_id));
  const grades = [6, 7, 8, 9, 10, 11, 12];
  const [open, setOpen] = useState<number | null>(profile?.grade_level ?? 9);

  const totalDone = items.filter((i) => done.has(i.id)).length;
  const totalPct = items.length > 0 ? Math.round((totalDone / items.length) * 100) : 0;

  return (
    <div>
      <header className="px-5 pt-10 pb-8 gradient-hero">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <Compass className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg">PathFinder</span>
        </div>
        <p className="text-sm font-medium text-primary mb-1">
          Hi{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Your roadmap</h1>
        <p className="text-muted-foreground mt-2 mb-5">One step at a time — grade by grade.</p>
        <div className="rounded-2xl bg-card/70 backdrop-blur border border-border p-4">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-sm font-semibold">Overall progress</span>
            <span className="text-sm text-muted-foreground">
              {totalDone} of {items.length}
            </span>
          </div>
          <Progress value={totalPct} className="h-2" />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-3">
        {grades.map((g) => {
          const gItems = items.filter((i) => i.grade === g);
          const gDone = gItems.filter((i) => done.has(i.id)).length;
          const pct = gItems.length ? Math.round((gDone / gItems.length) * 100) : 0;
          const isOpen = open === g;
          const isCurrent = profile?.grade_level === g;
          return (
            <div key={g} className="rounded-3xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : g)}
                className="w-full flex items-center gap-4 p-5 text-left"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0 ${
                  pct === 100
                    ? "bg-accent text-accent-foreground"
                    : isCurrent
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}>
                  {g}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Grade {g}</span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Progress value={pct} className="h-1.5 flex-1" />
                    <span className="text-xs text-muted-foreground w-14 text-right">
                      {gDone}/{gItems.length}
                    </span>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="px-3 pb-3 space-y-2">
                  {gItems.map((it) => {
                    const isDone = done.has(it.id);
                    return (
                      <Link
                        key={it.id}
                        to="/roadmap/$itemId"
                        params={{ itemId: it.id }}
                        className="flex items-center gap-3 p-4 rounded-2xl bg-background hover:bg-sky-tint transition"
                      >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isDone ? "bg-accent border-accent" : "border-border"
                        }`}>
                          {isDone && <Check className="w-3.5 h-3.5 text-accent-foreground" strokeWidth={3} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                            {it.category}
                          </div>
                          <div className={`font-medium truncate ${isDone ? "text-muted-foreground line-through" : ""}`}>
                            {it.title}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}