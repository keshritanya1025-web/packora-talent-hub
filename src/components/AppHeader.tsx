import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useUserRoles } from "@/hooks/useAuth";
import packforaLogo from "@/assets/packfora-logo.png";

const ROLE_LABEL: Record<string, string> = {
  system_admin: "System Admin",
  recruiter: "Recruiter",
  business_lead: "Business Lead",
};

export function AppHeader() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { roles } = useUserRoles();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="flex h-16 items-center gap-3 border-b border-border bg-card px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      <div className="flex items-center gap-2">
        <img src={packforaLogo} alt="Packfora" className="h-7 w-auto object-contain" />
      </div>
      <div className="ml-4 hidden md:block">
        <p className="text-sm font-medium text-foreground">
          Welcome, Packfora People Champion
        </p>
        <p className="text-xs text-muted-foreground">
          {user?.email}
          {roles.length > 0 && (
            <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
              {roles.map((r) => ROLE_LABEL[r] ?? r).join(", ")}
            </span>
          )}
        </p>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </header>
  );
}
