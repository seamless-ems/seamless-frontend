import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Plus,
  Mail,
  MoreVertical,
  Settings,
  Download,
  Code,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Send,
  FileText,
  Share2,
  Trash,
} from "lucide-react";
import { Speaker } from "@/types/event";
import { useQuery } from "@tanstack/react-query";
import { getJson, createSpeaker, deleteSpeaker } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

// speakers will be fetched from API when event id is available

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-warning/10 text-warning border-warning/20",
  },
  submitted: {
    label: "Submitted",
    icon: AlertCircle,
    className: "bg-info/10 text-info border-info/20",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle,
    className: "bg-success/10 text-success border-success/20",
  },
};

export default function SpeakerModule() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSpeaker, setNewSpeaker] = useState({ firstName: "", lastName: "", email: "", companyName: "", companyRole: "" });
  const { data: rawSpeakers, isLoading, error } = useQuery<any, Error>({
    queryKey: ["event", id, "speakers"],
    queryFn: () => getJson<any>(`/events/${id}/speakers`),
    enabled: Boolean(id),
  });

  // Normalize response shapes (array or paginated object) into any[]
  const speakerList: any[] = (() => {
    if (!rawSpeakers) return [];
    let arr: any[] = [];
    if (Array.isArray(rawSpeakers)) arr = rawSpeakers as any[];
    else if (Array.isArray(rawSpeakers.items)) arr = rawSpeakers.items as any[];
    else if (Array.isArray(rawSpeakers.results)) arr = rawSpeakers.results as any[];
    else if (Array.isArray(rawSpeakers.speakers)) arr = rawSpeakers.speakers as any[];
    else if (Array.isArray(rawSpeakers.data)) arr = rawSpeakers.data as any[];
    else {
      const firstArray = Object.values(rawSpeakers).find((v) => Array.isArray(v));
      if (Array.isArray(firstArray)) arr = firstArray as any[];
    }

    // Map various backend shapes to a consistent camelCase speaker shape
    return arr.map((it: any) => {
      const firstName = it.first_name ?? it.firstName ?? "";
      const lastName = it.last_name ?? it.lastName ?? "";
      const email = it.email ?? it.email_address ?? "";
      const company = it.company_name ?? it.company ?? it.companyName ?? null;
      const companyRole = it.company_role ?? it.companyRole ?? it.title ?? null;
      const headshot = it.headshot ?? it.headshot_url ?? it.avatar_url ?? it.avatar ?? null;
      const intakeFormStatus = it.intake_form_status ?? it.intakeFormStatus ?? it.intakeStatus ?? null;
      const name = it.name ?? (`${firstName} ${lastName}`.trim() || email);

      return {
        ...it,
        firstName,
        lastName,
        email,
        // provide both legacy and camelCase keys for compatibility
        company,
        companyName: company,
        companyRole,
        avatarUrl: headshot,
        intakeFormStatus,
        name,
      } as any;
    });
  })();

  const filteredSpeakers = speakerList.filter((speaker) => {
    const name = (speaker.name ?? "").toString();
    const email = (speaker.email ?? "").toString();
    const company = (speaker.company ?? "").toString();
    const q = searchQuery.toLowerCase();

    const matchesSearch =
      name.toLowerCase().includes(q) ||
      email.toLowerCase().includes(q) ||
      company.toLowerCase().includes(q);

    if (selectedTab === "all") return matchesSearch;
    return matchesSearch && (speaker.intakeFormStatus ?? "") === selectedTab;
  });

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Speaker Management</h1>
            <p className="text-muted-foreground mt-1">Manage speakers, intake forms, and promotional materials</p>
          </div>
          <div className="flex gap-3 items-center">
            {/* Combined options dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onSelect={() => {
                    if (!id) {
                      toast({ title: "No event selected" });
                      return;
                    }
                    const embedUrl = `${window.location.origin}/event/${id}/speakers/embed`;
                    window.open(embedUrl, "_blank");
                    toast({ title: "Opened embed", description: "Speaker embed opened in a new tab" });
                  }}
                >
                  <Code className="h-4 w-4 mr-2" />
                  Embed: Speakers
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    if (!id) {
                      toast({ title: "No event selected" });
                      return;
                    }
                    const promoUrl = `${window.location.origin}/event/${id}/speakers/embed/promo`;
                    window.open(promoUrl, "_blank");
                    toast({ title: "Opened embed", description: "Promo embed opened in a new tab" });
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Embed: Promo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => setCustomizeOpen(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Customize Form
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    if (!id) {
                      toast({ title: "No event selected" });
                      return;
                    }
                    const shareUrl = `${window.location.origin}/speaker-intake/${id}`;
                    window.open(shareUrl, "_blank");
                    toast({ title: "Opened intake form", description: "Opened in a new tab" });
                  }}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Form
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    if (!id) {
                      toast({ title: "No event selected" });
                      return;
                    }
                    // Placeholder reminder action — implement API call if available
                    const confirmed = window.confirm("Send reminder to all speakers?");
                    if (!confirmed) return;
                    toast({ title: "Reminders sent", description: "Speaker reminders have been queued." });
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Reminder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button variant="teal">
                  <Plus className="h-4 w-4" />
                  Add Speaker
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Speaker</DialogTitle>
                  <DialogDescription>Manually add a new speaker to this event.</DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!id) return;
                    setCreating(true);
                    try {
                      // normalize payload to backend expected shape
                      const payload = {
                        firstName: newSpeaker.firstName,
                        lastName: newSpeaker.lastName,
                        email: newSpeaker.email,
                        companyName: newSpeaker.companyName,
                        companyRole: newSpeaker.companyRole,
                      };
                      await createSpeaker(id, payload);
                      toast({ title: "Speaker added", description: `${newSpeaker.firstName} ${newSpeaker.lastName} was added` });
                      queryClient.invalidateQueries({ queryKey: ["event", id, "speakers"] });
                      setAddOpen(false);
                      setNewSpeaker({ firstName: "", lastName: "", email: "", companyName: "", companyRole: "" });
                    } catch (err: any) {
                      toast({ title: "Failed to add speaker", description: String(err?.message || err) });
                    } finally {
                      setCreating(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <label className="text-sm">First name</label>
                      <Input value={newSpeaker.firstName} onChange={(e) => setNewSpeaker((s) => ({ ...s, firstName: e.target.value }))} required />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm">Last name</label>
                      <Input value={newSpeaker.lastName} onChange={(e) => setNewSpeaker((s) => ({ ...s, lastName: e.target.value }))} required />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm">Email</label>
                    <Input type="email" value={newSpeaker.email} onChange={(e) => setNewSpeaker((s) => ({ ...s, email: e.target.value }))} required />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input placeholder="Company Name" value={newSpeaker.companyName} onChange={(e) => setNewSpeaker((s) => ({ ...s, companyName: e.target.value }))} />
                    <Input placeholder="Company Role" value={newSpeaker.companyRole} onChange={(e) => setNewSpeaker((s) => ({ ...s, companyRole: e.target.value }))} /> <div />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" type="button" onClick={() => setAddOpen(false)}>Cancel</Button> <Button type="submit" disabled={creating}>{creating ? "Adding…" : "Add Speaker"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            {/* Controlled dialog for customize form (opened from dropdown) */}
            <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Customize Intake Form</DialogTitle>
                  <DialogDescription>Configure the fields speakers need to fill out</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-sm text-muted-foreground">Form customization coming in the next update...</p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search speakers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Speakers Table */}
        {isLoading ? (
          <div className="py-16 text-center">Loading speakers…</div>
        ) : error ? (
          <div className="py-16 text-center text-destructive">Error loading speakers: {String(error.message)}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Speaker</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSpeakers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-16 text-center text-muted-foreground">
                    No speakers found. Invite some speakers to get started.
                  </TableCell>
                </TableRow>
              )}
              {filteredSpeakers.map((speaker) => {
                const name = speaker.name ?? `${speaker.firstName} ${speaker.lastName}`;
                const status = (speaker.intakeFormStatus ?? "").toString();
                const { label, icon, className } = statusConfig[status] ?? {
                  label: "Unknown",
                  icon: FileText,
                  className: "bg-muted/10 text-muted",
                };

                return (
                  <TableRow key={speaker.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar>
                          <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                          <AvatarImage src={speaker.avatarUrl} alt={name} />
                        </Avatar>
                        <div className="font-medium text-foreground">
                          {name}
                          <div className="text-sm text-muted-foreground">
                            {speaker.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {speaker.companyName ?? "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>
                            <Link to={`/organizer/event/${id}/speakers/${speaker.id}`} className="flex gap-2">
                              <Eye className="h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={async () => {
                              if (!id) return;
                              const confirmed = window.confirm(`Are you sure you want to remove ${name} as a speaker?`);
                              if (!confirmed) return;
                              try {
                                await deleteSpeaker(id!, speaker.id);
                                toast({ title: "Speaker removed", description: `${name} has been removed from the event` });
                                queryClient.invalidateQueries({ queryKey: ["event", id, "speakers"] });
                              } catch (err: any) {
                                toast({ title: "Failed to remove speaker", description: String(err?.message || err) });
                              }
                            }}
                            className="text-destructive"
                          >
                            <Trash className="h-4 w-4" />
                            Remove Speaker
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
