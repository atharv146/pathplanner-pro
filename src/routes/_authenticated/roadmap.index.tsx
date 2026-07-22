import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Compass } from "lucide-react";

export const Route = createFileRoute("/_authenticated/roadmap/")({
  head: () => ({
    meta: [
      { title: "Your roadmap — PathFinder" },
      { name: "description", content: "A grade-by-grade roadmap from middle school through college applications." },
    ],
  }),
  component: RoadmapIndex,
});

function RoadmapIndex() {
  const { userId } = Route.useRouteContext();

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()).data,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["roadmap-items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roadmap_items").select("id, grade").order("grade");
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
        <p className="text-muted-foreground mt-2">Pick a grade to see the steps for that year.</p>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-3">
        {grades.map((g) => {
          const gItems = items.filter((i) => i.grade === g);
          const gDone = gItems.filter((i) => done.has(i.id)).length;
          const isCurrent = profile?.grade_level === g;
          return (
            <Link
              key={g}
              to="/roadmap/$grade"
              params={{ grade: String(g) }}
              className="flex items-center gap-4 p-5 rounded-3xl border border-border bg-card hover:border-primary/40 transition"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0 ${
                isCurrent ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
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
                <div className="text-sm text-muted-foreground mt-0.5">
                  {gItems.length > 0 ? `${gDone} of ${gItems.length} done` : "No steps yet"}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}