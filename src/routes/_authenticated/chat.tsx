import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { askAI } from "@/lib/chat.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Ask AI — PathFinder" },
      { name: "description", content: "Chat with your personalized college-prep AI coach." },
    ],
  }),
  component: Chat,
});

function Chat() {
  const { userId } = Route.useRouteContext();
  const qc = useQueryClient();
  const ask = useServerFn(askAI);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["chat", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, role, content, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const mutate = useMutation({
    mutationFn: async (message: string) => ask({ data: { message } }),
    onMutate: () => setInput(""),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat", userId] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Something went wrong"),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, mutate.isPending]);

  function send(e?: React.FormEvent) {
    e?.preventDefault();
    const t = input.trim();
    if (!t || mutate.isPending) return;
    mutate.mutate(t);
  }

  const empty = messages.length === 0;

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      <header className="px-5 pt-8 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent text-accent-foreground flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Ask PathFinder</h1>
            <p className="text-xs text-muted-foreground">Personalized to your profile</p>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {empty && (
            <div className="text-center py-10">
              <p className="text-muted-foreground mb-4">What's on your mind?</p>
              <div className="grid gap-2">
                {[
                  "What should I focus on this year?",
                  "How do I write a strong college essay?",
                  "Which extracurriculars matter most?",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="text-left px-4 py-3 rounded-2xl bg-card border border-border hover:border-primary/40 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] px-4 py-3 rounded-3xl whitespace-pre-wrap text-[15px] leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-card border border-border rounded-bl-md"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {mutate.isPending && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-3xl bg-card border border-border rounded-bl-md">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse [animation-delay:150ms]" />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={send} className="border-t border-border bg-card p-3">
        <div className="max-w-2xl mx-auto flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask anything about your path…"
            className="flex-1 min-h-[48px] max-h-32 rounded-2xl resize-none"
            rows={1}
          />
          <Button type="submit" disabled={!input.trim() || mutate.isPending} className="h-12 w-12 rounded-2xl shrink-0 p-0">
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}