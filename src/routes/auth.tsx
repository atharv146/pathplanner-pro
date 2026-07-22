import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Compass } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/roadmap" });
  },
  head: () => ({
    meta: [
      { title: "Sign in — PathFinder" },
      { name: "description", content: "Sign in or create your PathFinder account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [accountType, setAccountType] = useState<"student" | "parent">("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        if (password.length < 7 || !/\d/.test(password)) {
          toast.error("Password must be at least 7 characters and include a number.");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { account_type: accountType, full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Account created. Welcome!");
        navigate({ to: "/onboarding" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/roadmap" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/roadmap" });
  }

  return (
    <div className="min-h-screen w-full gradient-hero flex flex-col">
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
              <Compass className="w-7 h-7" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">PathFinder</h1>
            <p className="text-muted-foreground mt-1 text-sm">Your calm guide from 6th grade to college.</p>
          </div>

          <div className="bg-card rounded-3xl p-6 shadow-xl shadow-primary/5 border border-border">
            <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
              <TabsList className="grid grid-cols-2 w-full mb-6 rounded-full h-11 p-1">
                <TabsTrigger value="signin" className="rounded-full">Sign in</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-full">Sign up</TabsTrigger>
              </TabsList>

              <TabsContent value="signup">
                <div className="mb-4">
                  <Label className="mb-2 block">I'm a…</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["student","parent"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAccountType(t)}
                        className={`rounded-2xl border-2 py-3 text-sm font-semibold capitalize transition ${
                          accountType === t
                            ? "border-primary bg-sky-tint text-primary"
                            : "border-border bg-background text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5 h-11 rounded-xl" required />
                </div>
              )}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-11 rounded-xl" required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 h-11 rounded-xl" required minLength={mode === "signup" ? 7 : undefined} pattern={mode === "signup" ? "(?=.*\\d).{7,}" : undefined} title="At least 7 characters and include a number" />
                {mode === "signup" && (
                  <p className="text-xs text-muted-foreground mt-1.5">At least 7 characters and include a number.</p>
                )}
              </div>
              <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold">
                {loading ? "…" : mode === "signup" ? "Create account" : "Sign in"}
              </Button>
            </form>

            <div className="flex items-center gap-3 my-5">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button variant="outline" onClick={google} className="w-full h-12 rounded-xl font-medium">
              Continue with Google
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}