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
import { useNavigate } from "react-router-dom";
import { clearTokenAndNotify } from "@/lib/session";
import { signOut as firebaseSignOut } from "@/lib/firebase";
import { useQuery } from "@tanstack/react-query";
import { getMe, getTeam, getJson } from "@/lib/api";
import { cn } from "@/lib/utils";

const accountNavItems: any[] = [];

const eventNavItems = [
  { title: "Overview", url: "/organizer/event/:id", icon: LayoutDashboard },
  { title: "Speakers", url: "/organizer/event/:id/speakers", icon: Mic2 },
  { title: "Event Settings", url: "/organizer/event/:id/settings", icon: Settings },
];

const speakerAccountNavItems = [
  { title: "Overview", url: "/speaker", icon: LayoutDashboard },
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
  const { data: me } = useQuery<any>({ queryKey: ["me"], queryFn: () => getMe() });
  const { data: eventsData } = useQuery<any>({ queryKey: ["events"], queryFn: () => getJson<any>(`/events`) });

  const navItems = eventId
    ? eventNavItems.map((item) => ({
        ...item,
        url: item.url.replace(":id", eventId),
      }))
    : mode === "speaker"
    ? speakerAccountNavItems
    : accountNavItems;

  const isActive = (url: string) => {
    const candidates = [url];
    if (mode === "organizer") {
      if (url === "/") candidates.push("/organizer");
      if (!url.startsWith("/organizer") && url !== "/") candidates.push(`/organizer${url}`);
    }
    return candidates.some((p) => location.pathname === p || location.pathname.startsWith(p));
  };

  const brandLink = mode === "speaker" ? "/speaker" : "/organizer";

  // Get upcoming events
  let events: any[] = [];
  if (Array.isArray(eventsData)) events = eventsData;
  else if (eventsData?.items) events = eventsData.items;
  else if (eventsData?.results) events = eventsData.results;
  else if (eventsData?.data) events = eventsData.data;

  const now = new Date();
  const upcomingEvents = events.filter(e => {
    const endDate = e.endDate || e.end_date ? new Date(e.endDate || e.end_date) : (e.startDate || e.start_date ? new Date(e.startDate || e.start_date) : null);
    return endDate ? endDate >= now : true;
  }).slice(0, 5);

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarContent className="px-2 pt-6 pb-4">
        {!eventId && (
          <>
            <SidebarGroup className="mb-6">
              <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground mb-2">
                Actions
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-2">
                  <Button variant="outline" className="w-full border-[1.5px]" asChild>
                    <Link to="/organizer/events/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create New Event
                    </Link>
                  </Button>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {eventId && window.location.pathname.includes("/speakers") && (
          <>
            <SidebarGroup className="mb-4">
              <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground mb-2">
                Quick Actions
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-2 space-y-2">
                  <button
                    onClick={() => {
                      // Trigger Add Speaker dialog - this is a simplified approach
                      // In reality, you'd want a better state management solution
                      alert("Add Speaker - This will open the Add Speaker dialog");
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded transition-colors"
                  >
                    Add Speaker
                  </button>
                  <button
                    onClick={() => {
                      alert("Email All Speakers - This feature is coming soon");
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded transition-colors"
                  >
                    Email All Speakers
                  </button>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        <SidebarGroup>
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
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!eventId && upcomingEvents.length > 0 && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground">
              Upcoming Events
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {upcomingEvents.map((event) => (
                  <SidebarMenuItem key={event.id}>
                    <SidebarMenuButton asChild>
                      <Link to={`/organizer/event/${event.id}`}>
                        <span className="text-sm">{event.title || event.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="text-muted-foreground hover:text-foreground">
                  <Link to="/support">
                    <span>Help & Support</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export function DashboardLayout({ children, eventId, mode: propMode }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: me } = useQuery<any>({ queryKey: ["me"], queryFn: () => getMe() });
  const { data: teams } = useQuery<any[]>({ queryKey: ["teams"], queryFn: () => getTeam() });
  const { data: eventData } = useQuery<any>({
    queryKey: ["event", eventId],
    queryFn: () => eventId ? getJson<any>(`/events/${eventId}`) : null,
    enabled: !!eventId
  });

  // Extract speakerId from URL if we're on a speaker page
  const speakerIdMatch = location.pathname.match(/\/speakers\/([^/]+)$/);
  const speakerId = speakerIdMatch ? speakerIdMatch[1] : null;

  const { data: speakerData } = useQuery<any>({
    queryKey: ["event", eventId, "speaker", speakerId],
    queryFn: () => speakerId && eventId ? getJson<any>(`/events/${eventId}/speakers/${speakerId}`) : null,
    enabled: !!(eventId && speakerId)
  });

  const [mode, setMode] = useState<"organizer" | "speaker">(propMode ?? "organizer");

  function Header() {
    const orgName = me?.organization?.name || me?.organization_name || "Team Seamless";
    const showBreadcrumbs = eventId || location.pathname.includes("/settings") || location.pathname.includes("/team") || location.pathname.includes("/subscription") || location.pathname.includes("/events/new");

    // Determine page names
    let eventName = "";
    let subPageName = "";
    let speakerName = "";

    if (eventId) {
      // We're on an event page
      eventName = eventData?.title || eventData?.name || "Event";

      // Check if we're on a sub-page of the event
      if (location.pathname.includes("/speakers")) {
        subPageName = "Speakers";

        // Check if we're viewing a specific speaker
        if (speakerId && speakerData) {
          const firstName = speakerData.firstName || speakerData.first_name || "";
          const lastName = speakerData.lastName || speakerData.last_name || "";
          speakerName = `${firstName} ${lastName}`.trim() || "Speaker";
        }
      } else if (location.pathname.includes("/settings")) {
        subPageName = "Event Settings";
      }
      // If no sub-page, we're on event overview (no subPageName)
    } else if (location.pathname.includes("/events/new")) {
      eventName = "Create New Event";
    } else if (location.pathname.includes("/settings")) {
      eventName = "Settings";
    } else if (location.pathname.includes("/team")) {
      eventName = "Team";
    } else if (location.pathname.includes("/subscription")) {
      eventName = "Billing";
    }

    return (
      <header className="fixed top-0 left-0 right-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/95 px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="-ml-2" />
          <Link to={mode === "speaker" ? "/speaker" : "/organizer"} className="flex items-baseline gap-1.5 leading-none">
            <span className="text-[20px] font-semibold text-primary" style={{ letterSpacing: '-0.01em' }}>
              Seamless
            </span>
            <span className="text-[16px] font-normal text-muted-foreground">
              Events
            </span>
          </Link>

          {showBreadcrumbs && (
            <div className="flex items-center gap-2 ml-2 text-sm text-muted-foreground">
              <Link to="/organizer" className="text-primary hover:text-primary-hover no-underline">
                {orgName}
              </Link>
              <span>›</span>
              {subPageName ? (
                <>
                  <Link to={`/organizer/event/${eventId}`} className="text-primary hover:text-primary-hover no-underline">
                    {eventName}
                  </Link>
                  <span>›</span>
                  {speakerName ? (
                    <>
                      <Link to={`/organizer/event/${eventId}/speakers`} className="text-primary hover:text-primary-hover no-underline">
                        {subPageName}
                      </Link>
                      <span>›</span>
                      <span className="text-foreground font-semibold">{speakerName}</span>
                    </>
                  ) : (
                    <span className="text-foreground font-semibold">{subPageName}</span>
                  )}
                </>
              ) : (
                <span className="text-foreground font-semibold">{eventName}</span>
              )}
            </div>
          )}
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
            <DropdownMenuContent align="end" className="w-64">
              {/* Header: Org + User */}
              <div className="px-3 py-3 border-b">
                <Link
                  to="/organizer/settings"
                  className="text-sm font-semibold text-foreground hover:text-primary transition-colors block"
                >
                  {me?.organization?.name || me?.organization_name || "Team Seamless"}
                </Link>
                <Link
                  to="/organizer/settings"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-0.5 block"
                >
                  {me ? `${me.firstName ?? me.first_name ?? ""} ${me.lastName ?? me.last_name ?? ""}`.trim() : "User"}
                  {me?.role === "admin" || me?.isAdmin ? " (Admin)" : " (Member)"}
                </Link>
              </div>

              {/* Organization Section (Admin only) */}
              {(me?.role === "admin" || me?.isAdmin) && (
                <>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    Organization
                  </div>
                  <DropdownMenuItem asChild>
                    <Link to="/organizer/settings">
                      <Settings className="h-4 w-4 mr-2" />
                      Organization Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/organizer/team">
                      <Users className="h-4 w-4 mr-2" />
                      Team
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/organizer/subscription">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Billing
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {/* Personal Section */}
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                Personal
              </div>
              <DropdownMenuItem asChild>
                <Link to="/organizer/settings">
                  <Users className="h-4 w-4 mr-2" />
                  Profile
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Switch Team (if multiple teams) */}
              {teams && teams.length > 1 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Switch Team</div>
                  {teams.map((t: any) => (
                    <DropdownMenuItem key={t.id} onSelect={() => navigate(`/team?team=${encodeURIComponent(t.id)}`)}>
                      <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm">{t.name}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}

              {/* Switch Mode (Organizer/Speaker) */}
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

              {/* Sign Out */}
              <DropdownMenuItem
                className="text-destructive"
                onSelect={async () => {
                  try {
                    await firebaseSignOut();
                  } catch (e) {
                    try {
                      clearTokenAndNotify();
                    } catch (err) {
                      
                    }
                    
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
    <SidebarProvider defaultOpen={false}>
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
