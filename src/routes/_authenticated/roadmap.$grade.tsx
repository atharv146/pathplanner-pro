import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Check, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/roadmap/$grade")({
  head: () => ({
    meta: [{ title: "Grade roadmap — PathFinder" }],
  }),
  component: GradePage,
});

function GradePage() {
  const { grade } = Route.useParams();
  const { userId } = Route.useRouteContext();
  const navigate = useNavigate();
  const gradeNum = Number(grade);

  const { data: items = [] } = useQuery({
    queryKey: ["roadmap-items-grade", gradeNum],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roadmap_items")
        .select("*")
        .eq("grade", gradeNum)
        .order("order_index");
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
  const prev = gradeNum > 6 ? gradeNum - 1 : null;
  const next = gradeNum < 12 ? gradeNum + 1 : null;

  if (!Number.isFinite(gradeNum) || gradeNum < 6 || gradeNum > 12) {
    return (
      <div className="p-8">
        Invalid grade. <Link to="/roadmap" className="text-primary underline">Back</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <header className="gradient-hero px-5 pt-6 pb-8">
        <button
          onClick={() => navigate({ to: "/roadmap" })}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> All grades
        </button>
        <div className="text-[11px] font-bold uppercase tracking-wide text-primary mb-1">Roadmap</div>
        <h1 className="text-3xl font-bold tracking-tight">Grade {gradeNum}</h1>
      </header>

      <div className="px-5 py-6 space-y-2">
        {items.length === 0 && (
          <div className="text-center text-muted-foreground py-12">No steps yet for this grade.</div>
        )}
        {items.map((it) => {
          const isDone = done.has(it.id);
          return (
            <Link
              key={it.id}
              to="/roadmap/item/$itemId"
              params={{ itemId: it.id }}
              className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:border-primary/40 transition"
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

        <div className="flex gap-3 pt-6">
          {prev !== null ? (
            <Link
              to="/roadmap/$grade"
              params={{ grade: String(prev) }}
              className="flex-1 flex items-center justify-center gap-1 h-12 rounded-xl border border-border bg-card font-medium text-sm"
            >
              <ChevronLeft className="w-4 h-4" /> Grade {prev}
            </Link>
          ) : <div className="flex-1" />}
          {next !== null ? (
            <Link
              to="/roadmap/$grade"
              params={{ grade: String(next) }}
              className="flex-1 flex items-center justify-center gap-1 h-12 rounded-xl border border-border bg-card font-medium text-sm"
            >
              Grade {next} <ChevronRight className="w-4 h-4" />
            </Link>
          ) : <div className="flex-1" />}
        </div>
      </div>
    </div>
  );
}