import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  CalendarDays,
  FileCheck2,
  Upload,
  Shield,
} from "lucide-react";
import packforaLogo from "@/assets/packfora-logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useUserRoles } from "@/hooks/useAuth";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Requisitions", url: "/requisitions", icon: Briefcase },
  { title: "Candidates", url: "/candidates", icon: Users },
  { title: "Interviews", url: "/interviews", icon: CalendarDays },
  { title: "Offers", url: "/offers", icon: FileCheck2 },
  { title: "Upload Data", url: "/upload-data", icon: Upload },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isAdmin } = useUserRoles();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border bg-white px-4 py-4">
        <div className="flex items-center gap-2">
          {collapsed ? (
            <img src={packforaLogo} alt="Packfora" className="h-8 w-8 object-contain" />
          ) : (
            <img src={packforaLogo} alt="Packfora — Make Your Packaging Shine" className="h-9 w-auto object-contain" />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/admin"}>
                    <Link to="/admin" className="flex items-center gap-3">
                      <Shield className="h-4 w-4" />
                      <span>Admin Panel</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-4 py-3">
        {!collapsed && (
          <p className="text-[10px] text-sidebar-foreground/50">
            © {new Date().getFullYear()} Packfora
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
