import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
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
  const [creating, setCreating] = useState(false);
  const [newSpeaker, setNewSpeaker] = useState({ name: "", email: "", title: "", company: "" });

  const { data: rawSpeakers, isLoading, error } = useQuery<any, Error>({
    queryKey: ["event", id, "speakers"],
    queryFn: () => getJson<any>(`/events/${id}/speakers`),
    enabled: Boolean(id),
  });

  // Normalize response shapes (array or paginated object) into Speaker[]
  const speakerList: Speaker[] = (() => {
    if (!rawSpeakers) return [];
    if (Array.isArray(rawSpeakers)) return rawSpeakers as Speaker[];
    if (Array.isArray(rawSpeakers.items)) return rawSpeakers.items as Speaker[];
    if (Array.isArray(rawSpeakers.results)) return rawSpeakers.results as Speaker[];
    if (Array.isArray(rawSpeakers.speakers)) return rawSpeakers.speakers as Speaker[];
    if (Array.isArray(rawSpeakers.data)) return rawSpeakers.data as Speaker[];
    const firstArray = Object.values(rawSpeakers).find((v) => Array.isArray(v));
    if (Array.isArray(firstArray)) return firstArray as Speaker[];
    return [];
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
    <DashboardLayout eventId={id}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Speaker Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage speakers, intake forms, and promotional materials
            </p>
          </div>
            <div className="flex gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="h-4 w-4" />
                  Customize Form
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Customize Intake Form</DialogTitle>
                  <DialogDescription>
                    Configure the fields speakers need to fill out
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-sm text-muted-foreground">
                    Form customization coming in the next update...
                  </p>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              onClick={() => {
                if (!id) {
                  toast({ title: "No event selected" });
                  return;
                }
                const shareUrl = `${window.location.origin}/speaker-intake/${id}`;
                window.open(shareUrl, "_blank");
                toast({ title: "Opened intake form", description: "Opened in a new tab" });
              }}
            >
              <Share2 className="h-4 w-4" />
              Share Form
            </Button>

            <Button variant="outline">
              <Mail className="h-4 w-4" />
              Send Reminder
            </Button>
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
                  <DialogDescription>
                    Manually add a new speaker to this event.
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!id) return;
                    setCreating(true);
                    try {
                      const payload = { ...newSpeaker };
                      await createSpeaker(id, payload);
                      toast({ title: "Speaker added", description: `${newSpeaker.name} was added` });
                      queryClient.invalidateQueries({ queryKey: ["event", id, "speakers"] });
                      setAddOpen(false);
                      setNewSpeaker({ name: "", email: "", title: "", company: "" });
                    } catch (err: any) {
                      toast({ title: "Failed to add speaker", description: String(err?.message || err) });
                    } finally {
                      setCreating(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="grid gap-2">
                    <label className="text-sm">Full name</label>
                    <Input value={newSpeaker.name} onChange={(e) => setNewSpeaker((s) => ({ ...s, name: e.target.value }))} required />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm">Email</label>
                    <Input type="email" value={newSpeaker.email} onChange={(e) => setNewSpeaker((s) => ({ ...s, email: e.target.value }))} required />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input placeholder="Title" value={newSpeaker.title} onChange={(e) => setNewSpeaker((s) => ({ ...s, title: e.target.value }))} />
                    <Input placeholder="Company" value={newSpeaker.company} onChange={(e) => setNewSpeaker((s) => ({ ...s, company: e.target.value }))} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" type="button" onClick={() => setAddOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={creating}>
                      {creating ? "Adding…" : "Add Speaker"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Speakers</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {isLoading ? "…" : speakerList.length}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Forms Submitted</p>
            <p className="text-2xl font-bold text-success mt-1">
              {isLoading ? "…" : speakerList.filter(
                (s) => s.intakeFormStatus === "submitted" || s.intakeFormStatus === "approved"
              ).length}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Pending Forms</p>
            <p className="text-2xl font-bold text-warning mt-1">
              {isLoading ? "…" : speakerList.filter((s) => s.intakeFormStatus === "pending").length}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Cards Approved</p>
            <p className="text-2xl font-bold text-primary mt-1">
              {isLoading ? "…" : speakerList.filter((s) => s.promoCardApproved).length}
            </p>
          </div>
        </div>

        {/* Tabs and Table */}
        <div className="rounded-xl border border-border bg-card">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <div className="flex flex-col gap-4 p-4 border-b border-border sm:flex-row sm:items-center sm:justify-between">
              <TabsList>
                <TabsTrigger value="all">All Speakers</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="submitted">Submitted</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
              </TabsList>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search speakers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
            </div>

            <TabsContent value={selectedTab} className="m-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Speaker</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Form Status</TableHead>
                    <TableHead>Website Card</TableHead>
                    <TableHead>Promo Card</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSpeakers.map((speaker) => {
                    const status = statusConfig[speaker.intakeFormStatus ?? "pending"] || statusConfig.pending;
                    const StatusIcon = status.icon || Clock;

                    return (
                      <TableRow key={speaker.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={speaker.headshot} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                  {String(speaker.name ?? "")
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">
                                {speaker.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {speaker.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">
                              {speaker.company}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {speaker.title}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={status.className}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {speaker.websiteCardApproved ? (
                            <Badge
                              variant="outline"
                              className="bg-success/10 text-success border-success/20"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approved
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-muted-foreground"
                            >
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {speaker.promoCardApproved ? (
                            <Badge
                              variant="outline"
                              className="bg-success/10 text-success border-success/20"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approved
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-muted-foreground"
                            >
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link
                                  to={`/event/${id}/speakers/${speaker.id}`}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Portal
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <FileText className="h-4 w-4 mr-2" />
                                View Form
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="h-4 w-4 mr-2" />
                                Download Assets
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Code className="h-4 w-4 mr-2" />
                                Get Embed Code
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Send className="h-4 w-4 mr-2" />
                                Send Reminder
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={async () => {
                                  if (!id) return;
                                  const ok = window.confirm(`Delete speaker ${speaker.name ?? speaker.email}?`);
                                  if (!ok) return;
                                  try {
                                    await deleteSpeaker(id, speaker.id);
                                    toast({ title: "Speaker deleted" });
                                    queryClient.invalidateQueries({ queryKey: ["event", id, "speakers"] });
                                  } catch (err: any) {
                                    toast({ title: "Failed to delete speaker", description: String(err?.message || err) });
                                  }
                                }}
                              >
                                <span className="text-destructive flex items-center gap-2">
                                  Delete
                                </span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Button
            variant="soft"
            className="h-auto py-4 flex-col gap-2 justify-center"
          >
            <Download className="h-5 w-5" />
            <span>Download All Assets</span>
          </Button>
          <Button
            variant="soft"
            className="h-auto py-4 flex-col gap-2 justify-center"
          >
            <Code className="h-5 w-5" />
            <span>Copy All Embed Codes</span>
          </Button>
          <Button
            variant="soft"
            className="h-auto py-4 flex-col gap-2 justify-center"
          >
            <Mail className="h-5 w-5" />
            <span>Email All Speakers</span>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
