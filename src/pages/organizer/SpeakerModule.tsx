import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Copy, Check, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getJson, createSpeaker } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import SpeakerFormBuilder from "@/components/SpeakerFormBuilder";
import PromoCardBuilder from "@/components/PromoCardBuilder";

export default function SpeakerModule() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedTab, setSelectedTab] = useState("speakers");
  const [addOpen, setAddOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSpeaker, setNewSpeaker] = useState({ firstName: "", lastName: "", email: "", companyName: "", companyRole: "" });

  const { data: rawSpeakers, isLoading } = useQuery<any, Error>({
    queryKey: ["event", id, "speakers"],
    queryFn: () => getJson<any>(`/events/${id}/speakers`),
    enabled: Boolean(id),
  });

  // Normalize response shapes into any[]
  const speakerList: any[] = (() => {
    if (!rawSpeakers) return [];
    let arr: any[] = [];
    if (Array.isArray(rawSpeakers)) arr = rawSpeakers;
    else if (Array.isArray(rawSpeakers.items)) arr = rawSpeakers.items;
    else if (Array.isArray(rawSpeakers.results)) arr = rawSpeakers.results;
    else if (Array.isArray(rawSpeakers.speakers)) arr = rawSpeakers.speakers;
    else if (Array.isArray(rawSpeakers.data)) arr = rawSpeakers.data;

    return arr.map((it: any) => {
      const firstName = it.first_name ?? it.firstName ?? "";
      const lastName = it.last_name ?? it.lastName ?? "";
      const email = it.email ?? "";
      const company = it.company_name ?? it.company ?? it.companyName ?? "";
      const headshot = it.headshot ?? it.headshot_url ?? it.avatar_url ?? null;
      const intakeFormStatus = it.intake_form_status ?? it.intakeFormStatus ?? "pending";
      const createdAt = it.registered_at ?? it.created_at ?? it.createdAt ?? null;
      const name = `${firstName} ${lastName}`.trim() || email;

      return {
        ...it,
        firstName,
        lastName,
        email,
        company,
        avatarUrl: headshot,
        intakeFormStatus,
        createdAt,
        name,
      };
    });
  })();

  const filteredSpeakers = speakerList
    .filter((speaker) => {
      const matchesSearch =
        speaker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        speaker.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        speaker.company.toLowerCase().includes(searchQuery.toLowerCase());

      const isArchived = speaker.status === "archived";
      let matchesStatus = true;
      if (statusFilter === "active") {
        matchesStatus = !isArchived;
      } else if (statusFilter === "archived") {
        matchesStatus = isArchived;
      } else if (statusFilter !== "all") {
        matchesStatus = speaker.intakeFormStatus === statusFilter;
      }

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "newest") {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      } else if (sortBy === "oldest") {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      } else if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

  const pendingCount = speakerList.filter(s => s.intakeFormStatus === "pending").length;
  const totalCount = speakerList.length;

  return (
    <div className="space-y-0">
      {/* Tabs Navigation */}
      <div className="border-b border-border">
        <div className="flex gap-8 px-0">
          <button
            onClick={() => setSelectedTab("speakers")}
            className={`pb-3 border-b-2 transition-colors text-sm ${
              selectedTab === "speakers"
                ? "border-primary text-foreground font-semibold bg-muted/50 px-3 py-2 rounded-t"
                : "border-transparent text-muted-foreground hover:text-foreground font-medium"
            }`}
          >
            Speakers
          </button>
          <button
            onClick={() => setSelectedTab("applications")}
            className={`pb-3 border-b-2 transition-colors text-sm ${
              selectedTab === "applications"
                ? "border-primary text-foreground font-semibold bg-muted/50 px-3 py-2 rounded-t"
                : "border-transparent text-muted-foreground hover:text-foreground font-medium"
            }`}
          >
            Call for Speakers
          </button>
          <button
            onClick={() => setSelectedTab("forms")}
            className={`pb-3 border-b-2 transition-colors text-sm ${
              selectedTab === "forms"
                ? "border-primary text-foreground font-semibold bg-muted/50 px-3 py-2 rounded-t"
                : "border-transparent text-muted-foreground hover:text-foreground font-medium"
            }`}
          >
            Forms
          </button>
          <button
            onClick={() => setSelectedTab("embed-builder")}
            className={`pb-3 border-b-2 transition-colors text-sm ${
              selectedTab === "embed-builder"
                ? "border-primary text-foreground font-semibold bg-muted/50 px-3 py-2 rounded-t"
                : "border-transparent text-muted-foreground hover:text-foreground font-medium"
            }`}
          >
            Embed Builder
          </button>
          <button
            onClick={() => setSelectedTab("promo-builder")}
            className={`pb-3 border-b-2 transition-colors text-sm ${
              selectedTab === "promo-builder"
                ? "border-primary text-foreground font-semibold bg-muted/50 px-3 py-2 rounded-t"
                : "border-transparent text-muted-foreground hover:text-foreground font-medium"
            }`}
          >
            Website & Promo Card Builder
          </button>
        </div>
      </div>

      {/* Speakers Tab Content */}
      {selectedTab === "speakers" && (
        <div className="space-y-6 pt-6">
          {/* Header and Action */}
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Manage and approve event speakers</p>
            </div>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button variant="default" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
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
                      await createSpeaker(id, {
                        first_name: newSpeaker.firstName,
                        last_name: newSpeaker.lastName,
                        email: newSpeaker.email,
                        company_name: newSpeaker.companyName,
                        company_role: newSpeaker.companyRole,
                      });
                      toast({ title: "Speaker added" });
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
                    <Input placeholder="Company Role" value={newSpeaker.companyRole} onChange={(e) => setNewSpeaker((s) => ({ ...s, companyRole: e.target.value }))} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" type="button" onClick={() => setAddOpen(false)}>Cancel</Button>
                    <Button variant="outline" className="border-[1.5px]" type="submit" disabled={creating}>{creating ? "Adding…" : "Add Speaker"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Table Container */}
          <div className="space-y-4">
            {/* Controls Bar */}
            <div className="flex justify-between items-center">
              <div className="flex gap-3">
                <Input
                  placeholder="Search speakers…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-[280px] h-9 text-sm"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px] h-9 text-sm">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px] h-9 text-sm">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="name">Name A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground">
                {totalCount} speaker{totalCount !== 1 ? 's' : ''}
                {pendingCount > 0 && (
                  <span className="ml-3 inline-flex items-center gap-1 px-2 py-1 bg-warning/10 text-warning rounded text-xs font-medium">
                    ⚠ {pendingCount} pending
                  </span>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-border overflow-hidden">
              {isLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Loading speakers…</div>
              ) : filteredSpeakers.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No speakers found</div>
              ) : (
                <table className="w-full">
                  <thead className="border-b border-border bg-muted/30">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Speaker</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Company</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Submitted</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                  {filteredSpeakers.map((speaker) => (
                    <tr
                      key={speaker.id}
                      className="border-b border-border hover:bg-muted/40 transition-colors group"
                    >
                      <td className="px-5 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded">
                              <MoreVertical className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => window.location.href = `/organizer/event/${id}/speakers/${speaker.id}`}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {!speaker.status || speaker.status !== "archived" ? (
                              <>
                                <DropdownMenuItem
                                  className="text-warning"
                                  onClick={async () => {
                                    if (confirm(`Archive ${speaker.name}?\n\nSpeaker will be hidden from the active list, but their data is retained. You can restore them anytime.`)) {
                                      try {
                                        await updateSpeaker(id, speaker.id, { status: "archived" });
                                        toast({ 
                                          title: "Speaker archived", 
                                          description: `${speaker.name} archived. Filter by "Archived" to restore.`
                                        });
                                        queryClient.invalidateQueries({ queryKey: ["event", id, "speakers"] });
                                      } catch (err: any) {
                                        toast({ title: "Failed to archive speaker", description: String(err?.message || err) });
                                      }
                                    }
                                  }}
                                >
                                  Archive Speaker
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={async () => {
                                    if (confirm(`Permanently delete ${speaker.name}?\n\nThis action cannot be undone. All speaker data will be permanently deleted.`)) {
                                      try {
                                        await deleteSpeaker(id, speaker.id);
                                        toast({ title: "Speaker deleted", description: `${speaker.name} has been permanently deleted` });
                                        queryClient.invalidateQueries({ queryKey: ["event", id, "speakers"] });
                                      } catch (err: any) {
                                        toast({ title: "Failed to delete speaker", description: String(err?.message || err) });
                                      }
                                    }
                                  }}
                                >
                                  Delete Speaker
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem
                                onClick={async () => {
                                  if (confirm(`Restore ${speaker.name} to active speakers?`)) {
                                    try {
                                      await updateSpeaker(id, speaker.id, { status: "active" });
                                      toast({ title: "Speaker restored", description: `${speaker.name} has been restored` });
                                      queryClient.invalidateQueries({ queryKey: ["event", id, "speakers"] });
                                    } catch (err: any) {
                                      toast({ title: "Failed to restore speaker", description: String(err?.message || err) });
                                    }
                                  }
                                }}
                              >
                                Restore Speaker
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                      <td className="px-5 py-4">
                        <div 
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => window.location.href = `/organizer/event/${id}/speakers/${speaker.id}`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-sm font-medium bg-muted">{speaker.name.charAt(0).toUpperCase()}</AvatarFallback>
                            <AvatarImage src={speaker.avatarUrl} alt={speaker.name} />
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium text-foreground">
                              {speaker.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {speaker.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-foreground cursor-pointer" onClick={() => window.location.href = `/organizer/event/${id}/speakers/${speaker.id}`}>
                        {speaker.company || "-"}
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground cursor-pointer" onClick={() => window.location.href = `/organizer/event/${id}/speakers/${speaker.id}`}>
                        {speaker.createdAt ? new Date(speaker.createdAt).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          variant="outline"
                          className={`text-xs font-medium capitalize cursor-pointer ${
                            speaker.intakeFormStatus === "approved"
                              ? "bg-success/10 text-success border-success/30"
                              : speaker.intakeFormStatus === "pending"
                              ? "bg-warning/10 text-warning border-warning/30"
                              : "bg-muted/50 text-muted-foreground border-muted/50"
                          }`}
                          onClick={() => window.location.href = `/organizer/event/${id}/speakers/${speaker.id}`}
                        >
                          {speaker.intakeFormStatus}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            </div>
          </div>
        </div>
      )}

      {/* Applications Tab */}
      {selectedTab === "applications" && (
        <div className="space-y-6 pt-6">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Call for Speakers</h2>
            <p className="text-sm text-muted-foreground mt-1">Review and approve speaker applications</p>
          </div>

          {/* Applications Table */}
          <div className="space-y-4">
            {/* Controls Bar */}
            <div className="flex justify-between items-center">
              <div className="flex gap-3">
                <Input
                  placeholder="Search applications…"
                  className="w-[280px] h-9 text-sm"
                />
                <Select>
                  <SelectTrigger className="w-[150px] h-9 text-sm">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground">
                0 applications
              </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="py-12 text-center text-sm text-muted-foreground">
                No applications yet. Share the application form link with potential speakers.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forms Tab */}
      {selectedTab === "forms" && (
        <FormsTabContent eventId={id} />
      )}

      {/* Embed Builder Tab */}
      {selectedTab === "embed-builder" && (
        <EmbedBuilderContent eventId={id} />
      )}

      {/* Website & Promo Card Builder Tab */}
      {selectedTab === "promo-builder" && (
        <PromoCardBuilder eventId={id} />
      )}
    </div>
  );
}

function EmbedBuilderContent({ eventId }: { eventId: string | undefined }) {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [embedCodeModalOpen, setEmbedCodeModalOpen] = useState(false);
  const [selectedEmbed, setSelectedEmbed] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [embedName, setEmbedName] = useState("");
  const [cardType, setCardType] = useState<"website" | "promo">("website");
  const [selectedSpeakers, setSelectedSpeakers] = useState<string[]>([]);
  const [editingEmbed, setEditingEmbed] = useState<any | null>(null);

  const { data: speakersData, isLoading, error } = useQuery<any>({
    queryKey: ["event", eventId, "speakers"],
    queryFn: () => getJson<any>(`/events/${eventId}/speakers`),
    enabled: Boolean(eventId),
  });

  if (isLoading) {
    return <div className="py-16 text-center">Loading speakers...</div>;
  }

  if (error) {
    return <div className="py-16 text-center text-destructive">Error loading speakers: {String(error)}</div>;
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://seamlessevents.io';

  // Handle different API response formats (same logic as main speaker list)
  const allSpeakers = (() => {
    if (!speakersData) return [];
    let arr: any[] = [];
    if (Array.isArray(speakersData)) arr = speakersData;
    else if (Array.isArray(speakersData.items)) arr = speakersData.items;
    else if (Array.isArray(speakersData.results)) arr = speakersData.results;
    else if (Array.isArray(speakersData.speakers)) arr = speakersData.speakers;
    else if (Array.isArray(speakersData.data)) arr = speakersData.data;
    return arr;
  })();

  // raw speakers data processed

  // Normalize and filter to only approved speakers
  const approvedSpeakers = allSpeakers
    .map((s: any) => ({
      ...s,
      id: s.id,
      firstName: s.first_name ?? s.firstName ?? "",
      lastName: s.last_name ?? s.lastName ?? "",
      name: (s.first_name || s.firstName) ? `${s.first_name ?? s.firstName} ${s.last_name ?? s.lastName ?? ""}`.trim() : s.name ?? "",
      companyName: s.company_name ?? s.company ?? s.companyName ?? "",
      websiteCardApproved: s.website_card_approved ?? s.websiteCardApproved ?? false,
      promoCardApproved: s.promo_card_approved ?? s.promoCardApproved ?? false,
    }))
    .filter((s: any) => {
      const websiteApproved = s.websiteCardApproved;
      const promoApproved = s.promoCardApproved;
      const isApproved = websiteApproved && promoApproved;

      // speaker approval flags evaluated

      return isApproved;
    });

  // approvedSpeakers computed

  const approvedCount = approvedSpeakers.length;

  // Default embeds
  const embeds = [
    {
      id: "all-speakers",
      title: "All Speakers",
      type: "Website Cards",
      count: approvedCount,
      url: `${origin}/event/${eventId}/speakers/embed`,
      code: `<iframe src="${origin}/event/${eventId}/speakers/embed" width="100%" height="600" frameborder="0" style="border: none; border-radius: 8px;"></iframe>`,
    },
    {
      id: "promo-cards",
      title: "Promo Cards",
      type: "Promo Cards",
      count: approvedCount,
      url: `${origin}/event/${eventId}/speakers/embed/promo`,
      code: `<iframe src="${origin}/event/${eventId}/speakers/embed/promo" width="100%" height="600" frameborder="0" style="border: none; border-radius: 8px;"></iframe>`,
    },
  ];

  const copyToClipboard = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(label);
    toast({ title: "Copied to clipboard!" });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const openCreateModal = () => {
    setEmbedName("");
    setCardType("website");
    setSelectedSpeakers([]); // Start with no speakers selected
    setEditingEmbed(null);
    setCreateModalOpen(true);
  };

  const openEditModal = (embed: any) => {
    setEmbedName(embed.title);
    setCardType(embed.type === "Website Cards" ? "website" : "promo");
    // For default embeds, select all approved speakers
    setSelectedSpeakers(approvedSpeakers.map((s: any) => s.id));
    setEditingEmbed(embed);
    setCreateModalOpen(true);
  };

  const openEmbedCodeModal = (embed: any) => {
    setSelectedEmbed(embed);
    setEmbedCodeModalOpen(true);
  };

  const toggleSpeaker = (speakerId: string) => {
    setSelectedSpeakers(prev =>
      prev.includes(speakerId)
        ? prev.filter(id => id !== speakerId)
        : [...prev, speakerId]
    );
  };

  const handleSaveEmbed = () => {
    // TODO: In future, save custom embeds to backend
    toast({ title: "Embed saved successfully" });
    setCreateModalOpen(false);
  };

  return (
    <div className="space-y-6 pt-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Embed Builder</h2>
        <p className="text-sm text-muted-foreground mt-1">Create and manage embeds for your website, newsletters, and partner pages</p>
      </div>

      {/* Info box */}
      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
        <p className="text-sm font-medium text-primary">✓ Only approved speakers will appear in embeds</p>
        <p className="text-sm text-muted-foreground mt-1">Approve speakers on their individual portal page to include them in the embed</p>
      </div>

      {/* Embed Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {embeds.map((embed) => (
          <Card key={embed.id} className="hover:shadow-sm hover:border-primary transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 style={{ fontSize: 'var(--font-h3)', fontWeight: 600, marginBottom: '8px' }}>
                    {embed.title}
                  </h3>
                  <span className="inline-block px-2 py-1 bg-primary/10 text-primary rounded" style={{ fontSize: 'var(--font-small)', fontWeight: 500 }}>
                    {embed.type}
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditModal(embed)}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast({ title: "Duplicate feature coming soon" })}>
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => toast({ title: "Delete feature coming soon" })}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: 'var(--font-h3)' }}>{embed.count}</strong> speakers live
              </div>
              <Button
                variant="outline"
                className="w-full border-[1.5px]"
                onClick={() => openEmbedCodeModal(embed)}
              >
                &lt;&gt; Get Embed Code
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Embed Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEmbed ? "Edit Embed" : "Create New Embed"}</DialogTitle>
            <DialogDescription>Select speakers to include in your embed</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Embed Name */}
            <div>
              <Label style={{ fontSize: 'var(--font-body)', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                Embed Name
              </Label>
              <Input
                placeholder="e.g., All Speakers, Newsletter Feature, Keynote Speakers"
                value={embedName}
                onChange={(e) => setEmbedName(e.target.value)}
              />
            </div>

            {/* Card Type */}
            <div>
              <Label style={{ fontSize: 'var(--font-body)', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                Card Type
              </Label>
              <div className="flex gap-3">
                <label
                  className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    cardType === "website"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background"
                  }`}
                  onClick={() => setCardType("website")}
                >
                  <input
                    type="radio"
                    name="card-type"
                    checked={cardType === "website"}
                    onChange={() => setCardType("website")}
                    className="w-4 h-4"
                  />
                  <span style={{ fontWeight: 500, fontSize: 'var(--font-body)' }}>Website Cards</span>
                </label>
                <label
                  className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    cardType === "promo"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background"
                  }`}
                  onClick={() => setCardType("promo")}
                >
                  <input
                    type="radio"
                    name="card-type"
                    checked={cardType === "promo"}
                    onChange={() => setCardType("promo")}
                    className="w-4 h-4"
                  />
                  <span style={{ fontWeight: 500, fontSize: 'var(--font-body)' }}>Promo Cards</span>
                </label>
              </div>
            </div>

            {/* Select Speakers */}
            <div>
              <Label style={{ fontSize: 'var(--font-body)', fontWeight: 600, marginBottom: '12px', display: 'block' }}>
                Select Speakers <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(Only approved speakers shown)</span>
              </Label>
              <div className="max-h-[400px] overflow-y-auto border rounded-lg">
                {approvedSpeakers.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground" style={{ fontSize: 'var(--font-small)' }}>
                    No approved speakers yet. Approve speakers to include them in embeds.
                  </div>
                ) : (
                  approvedSpeakers.map((speaker: any) => {
                    const speakerId = speaker.id;
                    const isSelected = selectedSpeakers.includes(speakerId);
                    const name = speaker.firstName
                      ? `${speaker.firstName} ${speaker.lastName || ""}`.trim()
                      : speaker.name || "Unknown Speaker";
                    const company = speaker.companyName || speaker.company_name || speaker.company || "";
                    const initial = name.charAt(0).toUpperCase();

                    return (
                      <label
                        key={speakerId}
                        className="flex items-center gap-3 p-3 border-b hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => toggleSpeaker(speakerId)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSpeaker(speakerId)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-sm bg-primary/10 text-primary">
                            {initial}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div style={{ fontWeight: 500, fontSize: 'var(--font-body)' }}>{name}</div>
                          {company && (
                            <div style={{ fontSize: 'var(--font-small)', color: 'var(--text-secondary)' }}>
                              {company}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEmbed} disabled={!embedName || selectedSpeakers.length === 0}>
              {editingEmbed ? "Update Embed" : "Save Embed"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Embed Code Modal */}
      <Dialog open={embedCodeModalOpen} onOpenChange={setEmbedCodeModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedEmbed?.title} - Embed Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label style={{ fontSize: 'var(--font-body)', fontWeight: 500, marginBottom: '8px', display: 'block' }}>
                HTML Code
              </Label>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{selectedEmbed?.code}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => selectedEmbed && copyToClipboard(selectedEmbed.code, 'html')}
                >
                  {copiedCode === 'html' ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div>
              <Label style={{ fontSize: 'var(--font-body)', fontWeight: 500, marginBottom: '8px', display: 'block' }}>
                Direct URL
              </Label>
              <div className="relative">
                <Input
                  value={selectedEmbed?.url || ''}
                  readOnly
                  className="pr-24"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-1/2 right-1 transform -translate-y-1/2"
                  onClick={() => selectedEmbed && copyToClipboard(selectedEmbed.url, 'url')}
                >
                  {copiedCode === 'url' ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p style={{ fontSize: 'var(--font-small)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Use this URL for testing or direct linking
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormsTabContent({ eventId }: { eventId: string | undefined }) {
  const [editingForm, setEditingForm] = useState<string | null>(null);
  const [copiedForm, setCopiedForm] = useState<string | null>(null);

  // Fetch event data for event name
  const { data: eventData } = useQuery<any>({
    queryKey: ["event", eventId],
    queryFn: () => getJson<any>(`/events/${eventId}`),
    enabled: Boolean(eventId),
  });

  const eventName = eventData?.title ?? eventData?.name ?? "Event";

  // Fetch speakers to get real submission counts
  const { data: rawSpeakers } = useQuery<any, Error>({
    queryKey: ["event", eventId, "speakers"],
    queryFn: () => getJson<any>(`/events/${eventId}/speakers`),
    enabled: Boolean(eventId),
  });

  // Normalize speakers list
  const speakerList: any[] = (() => {
    if (!rawSpeakers) return [];
    let arr: any[] = [];
    if (Array.isArray(rawSpeakers)) arr = rawSpeakers;
    else if (Array.isArray(rawSpeakers.items)) arr = rawSpeakers.items;
    else if (Array.isArray(rawSpeakers.results)) arr = rawSpeakers.results;
    else if (Array.isArray(rawSpeakers.speakers)) arr = rawSpeakers.speakers;
    else if (Array.isArray(rawSpeakers.data)) arr = rawSpeakers.data;
    return arr;
  })();

  // Count confirmed speakers (those submitted via speaker intake form)
  const confirmedSpeakersCount = speakerList.length;

  const forms = [
    {
      id: "speaker-info",
      name: `Speaker Information | ${eventName}`,
      type: "Speaker Information Form",
      description: "",
      submissions: confirmedSpeakersCount,
      badge: "success",
    },
    {
      id: "call-for-speakers",
      name: `Call for Speakers | ${eventName}`,
      type: "Application Form",
      description: "Applications require approval - submissions go to Call for Speakers tab",
      submissions: 0,
      badge: "warning",
    },
  ];

  const handleGetLink = (formId: string) => {
    const url = `${window.location.origin}/speaker-intake/${eventId}`;
    navigator.clipboard.writeText(url);
    setCopiedForm(formId);
    toast({ title: "Link copied to clipboard!" });
    setTimeout(() => setCopiedForm(null), 2000);
  };

  if (editingForm) {
    return (
      <div className="space-y-6 pt-6">
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setEditingForm(null)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Forms
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium text-foreground">
            {forms.find(f => f.id === editingForm)?.name}
          </span>
        </div>
        <SpeakerFormBuilder
          eventId={eventId}
          onSave={(config) => {
            toast({ title: "Form saved successfully" });
            setEditingForm(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Speaker Forms</h2>
      </div>

      {/* Forms Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {forms.map((form) => (
          <Card key={form.id} className="hover:shadow-sm hover:border-primary transition-all duration-200 cursor-pointer">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">{form.name}</h3>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground transition-colors p-1">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingForm(form.id)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>Duplicate</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Description */}
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {form.id === "speaker-info"
                      ? "Share this form link with speakers to collect information you customize. Submissions appear instantly in your Speakers list."
                      : "Accept speaker applications. Share the form link, customize your fields, and review submissions in your Call for Speakers tab."}
                  </p>
                </div>

                {/* Stats */}
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <div className="text-sm font-semibold text-foreground">{form.submissions}</div>
                    <div className="text-xs text-muted-foreground">submission{form.submissions !== 1 ? 's' : ''}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditingForm(form.id)}>
                    Edit Form
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleGetLink(form.id)}
                  >
                    {copiedForm === form.id ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Get Link
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
