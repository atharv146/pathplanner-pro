import { createFileRoute, Outlet, redirect, useMatchRoute, useNavigate } from "@tanstack/react-router";
void redirect;
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/bottom-nav";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { userId: data.user.id };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { userId } = Route.useRouteContext();
  const matchRoute = useMatchRoute();
  const onOnboarding = !!matchRoute({ to: "/onboarding" });
  const navigate = useNavigate();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const needsOnboarding = profile && !profile.onboarding_complete;

  useEffect(() => {
    if (needsOnboarding && !onOnboarding) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [needsOnboarding, onOnboarding, navigate]);

  if (isLoading || (needsOnboarding && !onOnboarding)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pb-24">
        <Outlet />
      </main>
      {!onOnboarding && <BottomNav accountType={profile?.account_type ?? "student"} />}
    </div>
  );
}