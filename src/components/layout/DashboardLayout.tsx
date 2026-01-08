import { ReactNode, useState, useEffect } from "react";
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
import { signOut as firebaseSignOut } from "@/lib/firebase";
import { useQuery } from "@tanstack/react-query";
import { getMe, getTeam } from "@/lib/api";
import { cn } from "@/lib/utils";

const accountNavItems = [
  { title: "Dashboard", url: "/organizer", icon: LayoutDashboard },
  { title: "Events", url: "/organizer/events", icon: Calendar },
  { title: "Team", url: "/organizer/team", icon: Users },
  // { title: "Subscription", url: "/organizer/subscription", icon: CreditCard },
  { title: "Settings", url: "/organizer/settings", icon: Settings },
];

const eventNavItems = [
  { title: "Overview", url: "/organizer/event/:id", icon: LayoutDashboard },
  { title: "Speakers", url: "/organizer/event/:id/speakers", icon: Mic2 },
  // { title: "Schedule", url: "/organizer/event/:id/schedule", icon: Calendar },
  // { title: "Content", url: "/organizer/event/:id/content", icon: FileText },
  // { title: "Settings", url: "/organizer/event/:id/settings", icon: Settings },
];

const speakerAccountNavItems = [
  { title: "Dashboard", url: "/speaker", icon: LayoutDashboard },
  { title: "Profile", url: "/speaker/profile", icon: Users },
];

interface DashboardLayoutProps {
  children: ReactNode;
  eventId?: string;
  mode?: "organizer" | "speaker";
}

function AppSidebar({ eventId, mode }: { eventId?: string; mode?: "organizer" | "speaker" }) {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const navItems = eventId
    ? eventNavItems.map((item) => ({
        ...item,
        url: item.url.replace(":id", eventId),
      }))
    : mode === "speaker"
    ? speakerAccountNavItems
    : accountNavItems;

  const isActive = (url: string) => {
    // Build candidate paths to check. When in organizer mode, also check organizer-prefixed paths.
    const candidates = [url];
    if (mode === "organizer") {
      // Map root to organizer events when appropriate
      if (url === "/") candidates.push("/organizer");
      // Prefix other urls with /organizer if not already
      if (!url.startsWith("/organizer") && url !== "/") candidates.push(`/organizer${url}`);
    }

    return candidates.some((p) => location.pathname === p || location.pathname.startsWith(p));
  };

  const brandLink = mode === "speaker" ? "/speaker" : "/organizer";

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        <Link to={brandLink} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-display font-bold">
            S
          </div>
          {!collapsed && (
            <span className="font-display text-xl font-semibold text-foreground">seamless</span>
          )}
        </Link>
      </div>

      <SidebarContent className="px-2 py-4">
        {eventId && (
          <div className="mb-4 px-2">
            <Button variant="soft" size="sm" className="w-full justify-start" asChild>
              <Link to="/organizer/events">
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
              {navItems.map((item) => {
                const linkTo = mode === "organizer" && item.url === "/" ? "/organizer" : item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={cn("transition-colors", isActive(item.url) && "bg-primary/10 text-primary font-medium")}
                    >
                      <Link to={linkTo}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!eventId && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="text-muted-foreground hover:text-foreground">
                    <Link to="/support">
                      <HelpCircle className="h-4 w-4" />
                      {!collapsed && <span>Help & Support</span>}
                    </Link>
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

export function DashboardLayout({ children, eventId, mode: propMode }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const { data: me } = useQuery<any>({ queryKey: ["me"], queryFn: () => getMe() });
  const { data: teams } = useQuery<any[]>({ queryKey: ["teams"], queryFn: () => getTeam() });
  const [mode, setMode] = useState<"organizer" | "speaker">(propMode ?? "organizer");
  function Header() {
    const { state: sidebarState } = useSidebar();

  const left = sidebarState === "collapsed" ? "0" : "var(--sidebar-width)";

    return (
      <header style={{ left }} className="fixed top-0 right-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/95 px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="-ml-2" />
        </div>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 pl-2"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={me?.avatarUrl ?? me?.avatar_url ?? ""} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {(((me?.firstName ?? me?.first_name)?.[0] ?? "") + ((me?.lastName ?? me?.last_name)?.[0] ?? "")).toUpperCase() || (me?.email?.[0] ?? "").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline text-sm font-medium">
                  {me ? `${me.firstName ?? me.first_name ?? ""} ${me.lastName ?? me.last_name ?? ""}`.trim() : "Account"}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link to="/organizer/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/organizer/team">Team</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1 text-xs text-muted-foreground">Switch Team</div>
              {teams && teams.length > 0 ? (
                teams.map((t: any) => (
                  <DropdownMenuItem key={t.id} onSelect={() => navigate(`/team?team=${encodeURIComponent(t.id)}`)}>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{t.name}</span>
                    </div>
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>No teams</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {mode !== "organizer" ? (
                <DropdownMenuItem
                  onSelect={() => {
                    setMode("organizer");
                    if (typeof window !== "undefined") window.localStorage.setItem("dashboardMode", "organizer");
                    navigate("/organizer");
                  }}
                >
                  Switch to Organizer
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onSelect={() => {
                    setMode("speaker");
                    if (typeof window !== "undefined") window.localStorage.setItem("dashboardMode", "speaker");
                    navigate("/speaker");
                  }}
                >
                  Switch to Speaker
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onSelect={async () => {
                  try {
                    await firebaseSignOut();
                  } catch (e) {
                    try {
                      clearToken();
                    } catch (err) {
                      // eslint-disable-next-line no-console
                      console.error("Error clearing token after signOut failure:", err);
                    }
                    // eslint-disable-next-line no-console
                    console.error("Firebase signOut failed:", e);
                  }
                  navigate("/login");
                }}
              >
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    );
  }
  useEffect(() => {
    // Priority: propMode > localStorage > infer from me
    if (propMode) {
      setMode(propMode);
      if (typeof window !== "undefined") window.localStorage.setItem("dashboardMode", propMode);
      return;
    }

    const stored = typeof window !== "undefined" ? window.localStorage.getItem("dashboardMode") : null;
    if (stored === "organizer" || stored === "speaker") {
      setMode(stored as "organizer" | "speaker");
      return;
    }

    if (me) {
      const isSpeaker = Array.isArray(me.roles) ? me.roles.includes("speaker") : (me.role === "speaker");
      setMode(isSpeaker ? "speaker" : "organizer");
    }
  }, [propMode, me]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar eventId={eventId} mode={mode} />
        <div className="flex flex-1 flex-col overflow-auto pt-16">
          {/* Top Header (fixed) */}
          <Header />
          {/* Main Content */}
          <main className="flex-1 bg-background p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
