import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Clock, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/guide")({
  head: () => ({
    meta: [
      { title: "Parent guide — PathFinder" },
      { name: "description", content: "Articles and guidance for parents supporting a college-bound student." },
    ],
  }),
  component: Guide,
});

function Guide() {
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const open = articles.find((a) => a.id === openId);

  if (open) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="gradient-hero px-5 pt-6 pb-8">
          <button onClick={() => setOpenId(null)} className="flex items-center gap-1 text-sm font-medium text-muted-foreground mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to guide
          </button>
          <div className="text-[11px] font-bold uppercase tracking-wide text-primary mb-2">{open.category}</div>
          <h1 className="text-3xl font-bold tracking-tight leading-tight">{open.title}</h1>
          <div className="flex items-center gap-1.5 mt-3 text-sm text-muted-foreground">
            <Clock className="w-3.5 h-3.5" /> {open.read_minutes} min read
          </div>
        </div>
        <div className="px-5 py-6 prose prose-neutral max-w-none whitespace-pre-wrap text-[16px] leading-relaxed">
          {open.content}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <header className="px-5 pt-10 pb-6 gradient-hero">
        <div className="w-11 h-11 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center mb-4">
          <BookOpen className="w-5 h-5" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Parent guide</h1>
        <p className="text-muted-foreground mt-2">Short reads to help you support your student.</p>
      </header>

      <div className="px-5 py-6 space-y-3">
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {!isLoading && articles.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center">
            <BookOpen className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold">No articles yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              New guidance articles will appear here as they are published.
            </p>
          </div>
        )}
        {articles.map((a) => (
          <button
            key={a.id}
            onClick={() => setOpenId(a.id)}
            className="w-full text-left rounded-3xl bg-card border border-border p-5 hover:border-primary/40 transition"
          >
            <div className="text-[11px] font-bold uppercase tracking-wide text-primary mb-1">{a.category}</div>
            <h3 className="font-semibold text-lg leading-snug">{a.title}</h3>
            <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{a.summary}</p>
            <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" /> {a.read_minutes} min read
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}