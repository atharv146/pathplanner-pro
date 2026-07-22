import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Circle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/roadmap/item/$itemId")({
  head: () => ({ meta: [{ title: "Roadmap step — PathFinder" }] }),
  component: ItemDetail,
});

function ItemDetail() {
  const { itemId } = Route.useParams();
  const { userId } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: item, isLoading } = useQuery({
    queryKey: ["roadmap-item", itemId],
    queryFn: async () => {
      const { data, error } = await supabase.from("roadmap_items").select("*").eq("id", itemId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: prog } = useQuery({
    queryKey: ["progress-item", userId, itemId],
    queryFn: async () => {
      const { data } = await supabase.from("user_progress").select("item_id").eq("user_id", userId).eq("item_id", itemId).maybeSingle();
      return data;
    },
  });

  const isDone = !!prog;

  const toggle = useMutation({
    mutationFn: async () => {
      if (isDone) {
        const { error } = await supabase.from("user_progress").delete().eq("user_id", userId).eq("item_id", itemId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_progress").insert({ user_id: userId, item_id: itemId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progress", userId] });
      qc.invalidateQueries({ queryKey: ["progress-item", userId, itemId] });
      toast.success(isDone ? "Marked as not done" : "Nice — one more step done!");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Something went wrong"),
  });

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!item) return <div className="p-8">Not found. <Link to="/roadmap" className="text-primary underline">Back</Link></div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="gradient-hero px-5 pt-6 pb-10">
        <button onClick={() => navigate({ to: "/roadmap/$grade", params: { grade: String(item.grade) } })} className="flex items-center gap-1 text-sm font-medium text-muted-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to grade {item.grade}
        </button>
        <div className="text-[11px] font-bold uppercase tracking-wide text-primary mb-2">
          Grade {item.grade} · {item.category}
        </div>
        <h1 className="text-3xl font-bold tracking-tight leading-tight">{item.title}</h1>
      </div>

      <div className="px-5 py-6 space-y-6">
        <p className="text-base leading-relaxed text-foreground/80">{item.description}</p>

        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            {isDone ? <Check className="w-5 h-5 text-accent" strokeWidth={3} /> : <Circle className="w-5 h-5 text-muted-foreground" />}
            <span className="font-semibold">{isDone ? "Completed" : "Not done yet"}</span>
          </div>
          <Button
            onClick={() => toggle.mutate()}
            disabled={toggle.isPending}
            variant={isDone ? "outline" : "default"}
            className="w-full h-12 rounded-xl font-semibold"
          >
            {isDone ? "Mark as not done" : "Mark as done"}
          </Button>
        </div>
      </div>
    </div>
  );
}