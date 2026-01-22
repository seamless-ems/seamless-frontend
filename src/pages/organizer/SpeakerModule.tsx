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
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getJson, createSpeaker } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import SpeakerFormBuilder from "@/components/SpeakerFormBuilder";

export default function SpeakerModule() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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
      const name = `${firstName} ${lastName}`.trim() || email;

      return {
        ...it,
        firstName,
        lastName,
        email,
        company,
        avatarUrl: headshot,
        intakeFormStatus,
        name,
      };
    });
  })();

  const filteredSpeakers = speakerList.filter((speaker) => {
    const matchesSearch =
      speaker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      speaker.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      speaker.company.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || speaker.intakeFormStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = speakerList.filter(s => s.intakeFormStatus === "pending").length;
  const totalCount = speakerList.length;

  return (
    <div>
      {/* Tabs Navigation */}
      <div className="border-b border-border bg-card mb-6">
        <div className="flex gap-8 px-6">
          <button
            onClick={() => setSelectedTab("speakers")}
            className={`pb-4 pt-4 border-b-2 transition-colors ${
              selectedTab === "speakers"
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            style={{ fontSize: 'var(--font-body)' }}
          >
            Speakers
          </button>
          <button
            onClick={() => setSelectedTab("applications")}
            className={`pb-4 pt-4 border-b-2 transition-colors ${
              selectedTab === "applications"
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            style={{ fontSize: 'var(--font-body)' }}
          >
            Applications
          </button>
          <button
            onClick={() => setSelectedTab("forms")}
            className={`pb-4 pt-4 border-b-2 transition-colors ${
              selectedTab === "forms"
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            style={{ fontSize: 'var(--font-body)' }}
          >
            Forms
          </button>
          <button
            onClick={() => setSelectedTab("embed-builder")}
            className={`pb-4 pt-4 border-b-2 transition-colors ${
              selectedTab === "embed-builder"
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            style={{ fontSize: 'var(--font-body)' }}
          >
            Embed Builder
          </button>
        </div>
      </div>

      {/* Speakers Tab Content */}
      {selectedTab === "speakers" && (
        <div className="space-y-6">
          {/* Explainer */}
          <div className="flex justify-between items-center">
            <p style={{ fontSize: 'var(--font-body)' }} className="text-muted-foreground">
              Add new speakers by approving an application or directly adding a speaker
            </p>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-[1.5px]">
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
                        firstName: newSpeaker.firstName,
                        lastName: newSpeaker.lastName,
                        email: newSpeaker.email,
                        companyName: newSpeaker.companyName,
                        companyRole: newSpeaker.companyRole,
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
          <div className="rounded-lg border border-border bg-card">
            {/* Table Header */}
            <div className="flex justify-between items-center p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <h3 style={{ fontSize: 'var(--font-h3)', fontWeight: 600 }}>
                  All Speakers ({totalCount})
                </h3>
                {pendingCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-warning text-white border-warning hover:bg-warning/90 hover:text-white"
                  >
                    ⚠ {pendingCount} Pending
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Search speakers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-[240px]"
                />
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="py-16 text-center text-muted-foreground">Loading speakers…</div>
            ) : filteredSpeakers.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                No speakers found. Add some speakers to get started.
              </div>
            ) : (
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr className="text-left">
                    <th className="p-4 font-medium text-muted-foreground" style={{ fontSize: 'var(--font-small)' }}>Speaker</th>
                    <th className="p-4 font-medium text-muted-foreground" style={{ fontSize: 'var(--font-small)' }}>Company</th>
                    <th className="p-4 font-medium text-muted-foreground" style={{ fontSize: 'var(--font-small)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSpeakers.map((speaker) => (
                    <tr
                      key={speaker.id}
                      className="border-b border-border hover:bg-muted/5 cursor-pointer transition-colors"
                      onClick={() => window.location.href = `/organizer/event/${id}/speakers/${speaker.id}`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-sm">{speaker.name.charAt(0).toUpperCase()}</AvatarFallback>
                            <AvatarImage src={speaker.avatarUrl} alt={speaker.name} />
                          </Avatar>
                          <div>
                            <div style={{ fontSize: 'var(--font-body)', fontWeight: 500 }}>
                              {speaker.name}
                            </div>
                            <div style={{ fontSize: 'var(--font-small)' }} className="text-muted-foreground">
                              {speaker.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4" style={{ fontSize: 'var(--font-body)' }}>
                        {speaker.company || "-"}
                      </td>
                      <td className="p-4">
                        <Badge
                          variant="outline"
                          className={`capitalize ${
                            speaker.intakeFormStatus === "approved"
                              ? "bg-success/10 text-success border-success/20"
                              : speaker.intakeFormStatus === "pending"
                              ? "bg-warning/10 text-warning border-warning/20"
                              : "bg-muted/10 text-muted-foreground"
                          }`}
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
      )}

      {/* Applications Tab */}
      {selectedTab === "applications" && (
        <div className="py-16 text-center text-muted-foreground">
          Applications tab coming soon...
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

  console.log('Raw speakers data:', speakersData);
  console.log('All speakers data:', allSpeakers);

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

      console.log(`Speaker: ${s.name}`, {
        websiteApproved,
        promoApproved,
        isApproved,
        rawData: s
      });

      return isApproved;
    });

  console.log('Approved speakers count:', approvedSpeakers.length);
  console.log('Approved speakers:', approvedSpeakers);

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
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 style={{ fontSize: 'var(--font-h2)', fontWeight: 600, marginBottom: '8px' }}>Embed Builder</h2>
          <p style={{ fontSize: 'var(--font-body)', color: 'var(--text-secondary)' }}>
            Create and manage embeds for your website, newsletters, and partner pages
          </p>
        </div>
        <Button variant="outline" className="border-[1.5px]" onClick={openCreateModal}>
          + Create New Embed
        </Button>
      </div>

      {/* Info box */}
      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 mb-8">
        <p style={{ fontSize: 'var(--font-small)', color: 'var(--primary)', fontWeight: 500 }}>
          ✓ Only approved speakers will appear in embeds
        </p>
        <p style={{ fontSize: 'var(--font-small)', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Approve speakers on their individual portal page to include them in the embed
        </p>
      </div>

      {/* Embed Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {embeds.map((embed) => (
          <Card key={embed.id}>
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
  if (!eventId) return null;

  return (
    <div className="space-y-6">
      <div>
        <h3 style={{ fontSize: 'var(--font-h2)', fontWeight: 600 }} className="mb-1">
          Speaker Intake Form
        </h3>
        <p className="text-muted-foreground" style={{ fontSize: 'var(--font-body)' }}>
          Customize the fields that speakers fill out when registering for your event
        </p>
      </div>

      <SpeakerFormBuilder
        eventId={eventId}
        onSave={(config) => {
          // TODO: Save to backend when API is ready
          console.log("Form config to save:", config);
          toast({ title: "Form configuration saved" });
        }}
      />
    </div>
  );
}
