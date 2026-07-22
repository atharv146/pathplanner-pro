import { createFileRoute, Outlet, redirect, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";

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
  const qc = useQueryClient();

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

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!onOnboarding && (
        <div className="fixed top-3 right-3 z-50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full h-10 w-10 bg-card/90 backdrop-blur shadow-sm">
                <UserRound className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl">
              <DropdownMenuLabel className="truncate">
                {profile?.full_name || "Account"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      <main className="flex-1 pb-24">
        <Outlet />
      </main>
      {!onOnboarding && <BottomNav accountType={profile?.account_type ?? "student"} />}
    </div>
  );
}