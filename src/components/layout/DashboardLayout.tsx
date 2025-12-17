import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Mic2,
  FileText,
  Settings,
  CreditCard,
  HelpCircle,
  ChevronDown,
  Plus,
  Bell,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { clearToken } from "@/lib/auth";
import { cn } from "@/lib/utils";

const accountNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Events", url: "/events", icon: Calendar },
  { title: "Team", url: "/team", icon: Users },
  // { title: "Subscription", url: "/subscription", icon: CreditCard },
  { title: "Settings", url: "/settings", icon: Settings },
];

const eventNavItems = [
  { title: "Overview", url: "/event/:id", icon: LayoutDashboard },
  { title: "Speakers", url: "/event/:id/speakers", icon: Mic2 },
  // { title: "Schedule", url: "/event/:id/schedule", icon: Calendar },
  // { title: "Content", url: "/event/:id/content", icon: FileText },
  // { title: "Settings", url: "/event/:id/settings", icon: Settings },
];

interface DashboardLayoutProps {
  children: ReactNode;
  eventId?: string;
}

function AppSidebar({ eventId }: { eventId?: string }) {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const navItems = eventId
    ? eventNavItems.map((item) => ({
        ...item,
        url: item.url.replace(":id", eventId),
      }))
    : accountNavItems;

  const isActive = (url: string) => {
    if (url === "/" || url === `/event/${eventId}`) {
      return location.pathname === url;
    }
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-display font-bold">
            S
          </div>
          {!collapsed && (
            <span className="font-display text-xl font-semibold text-foreground">
              seamless
            </span>
          )}
        </Link>
      </div>

      <SidebarContent className="px-2 py-4">
        {eventId && (
          <div className="mb-4 px-2">
            <Button
              variant="soft"
              size="sm"
              className="w-full justify-start"
              asChild
            >
              <Link to="/events">
                <ChevronDown className="mr-2 h-4 w-4 rotate-90" />
                {!collapsed && "Back to Events"}
              </Link>
            </Button>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {eventId ? "Event" : "Account"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={cn(
                      "transition-colors",
                      isActive(item.url) &&
                        "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!eventId && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton className="text-muted-foreground hover:text-foreground">
                    <HelpCircle className="h-4 w-4" />
                    {!collapsed && <span>Help & Support</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

export function DashboardLayout({ children, eventId }: DashboardLayoutProps) {
  const navigate = useNavigate();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar eventId={eventId} />
        <div className="flex flex-1 flex-col">
          {/* Top Header */}
          <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-2" />
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="w-64 pl-9 bg-background"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="teal" size="sm" asChild>
                <Link to="/events/new">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New Event</span>
                </Link>
              </Button>

              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] text-accent-foreground">
                  3
                </span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 pl-2"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        JD
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline text-sm font-medium">
                      James Demo
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={() => {
                      try {
                        clearToken();
                      } catch (e) {
                        // ignore
                      }
                      // navigate to login page
                      navigate("/login");
                    }}
                  >
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto bg-background p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
