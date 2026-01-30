import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getJson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Check, Copy, MoreVertical } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function EmbedBuilder({ eventId }: { eventId: string | undefined }) {
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
      return isApproved;
    });

  const approvedCount = approvedSpeakers.length;

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
    setSelectedSpeakers([]);
    setEditingEmbed(null);
    setCreateModalOpen(true);
  };

  const openEditModal = (embed: any) => {
    setEmbedName(embed.title);
    setCardType(embed.type === "Website Cards" ? "website" : "promo");
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
    toast({ title: "Embed saved successfully" });
    setCreateModalOpen(false);
  };

  return (
    <div className="space-y-6 pt-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Embed Builder</h2>
        <p className="text-sm text-muted-foreground mt-1">Create and manage embeds for your website, newsletters, and partner pages</p>
      </div>

      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
        <p className="text-sm font-medium text-primary">✓ Only approved speakers will appear in embeds</p>
        <p className="text-sm text-muted-foreground mt-1">Approve speakers on their individual portal page to include them in the embed</p>
      </div>

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
                    <DropdownMenuItem onClick={() => openEditModal(embed)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast({ title: "Duplicate feature coming soon" })}>Duplicate</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => toast({ title: "Delete feature coming soon" })}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div style={{ fontSize: 'var(--font-body)', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: 'var(--font-h3)' }}>{embed.count}</strong> speakers live
              </div>
              <Button variant="outline" className="w-full border-[1.5px]" onClick={() => openEmbedCodeModal(embed)}>
                &lt;&gt; Get Embed Code
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEmbed ? "Edit Embed" : "Create New Embed"}</DialogTitle>
            <DialogDescription>Select speakers to include in your embed</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label style={{ fontSize: 'var(--font-body)', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                Embed Name
              </Label>
              <Input placeholder="e.g., All Speakers, Newsletter Feature, Keynote Speakers" value={embedName} onChange={(e) => setEmbedName(e.target.value)} />
            </div>

            <div>
              <Label style={{ fontSize: 'var(--font-body)', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                Card Type
              </Label>
              <div className="flex gap-3">
                <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${cardType === "website" ? "border-primary bg-primary/5" : "border-border bg-background"}`} onClick={() => setCardType("website")}>
                  <input type="radio" name="card-type" checked={cardType === "website"} onChange={() => setCardType("website")} className="w-4 h-4" />
                  <span style={{ fontWeight: 500, fontSize: 'var(--font-body)' }}>Website Cards</span>
                </label>
                <label className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${cardType === "promo" ? "border-primary bg-primary/5" : "border-border bg-background"}`} onClick={() => setCardType("promo")}>
                  <input type="radio" name="card-type" checked={cardType === "promo"} onChange={() => setCardType("promo")} className="w-4 h-4" />
                  <span style={{ fontWeight: 500, fontSize: 'var(--font-body)' }}>Promo Cards</span>
                </label>
              </div>
            </div>

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
                      <label key={speakerId} className="flex items-center gap-3 p-3 border-b hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => toggleSpeaker(speakerId)}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSpeaker(speakerId)} onClick={(e) => e.stopPropagation()} />
                        <div className="flex-1">
                          <div style={{ fontWeight: 500, fontSize: 'var(--font-body)' }}>{name}</div>
                          {company && (
                            <div style={{ fontSize: 'var(--font-small)', color: 'var(--text-secondary)' }}>{company}</div>
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
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEmbed} disabled={!embedName || selectedSpeakers.length === 0}>{editingEmbed ? "Update Embed" : "Save Embed"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={embedCodeModalOpen} onOpenChange={setEmbedCodeModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedEmbed?.title} - Embed Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label style={{ fontSize: 'var(--font-body)', fontWeight: 500, marginBottom: '8px', display: 'block' }}>HTML Code</Label>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm"><code>{selectedEmbed?.code}</code></pre>
                <Button variant="outline" size="sm" className="absolute top-2 right-2" onClick={() => selectedEmbed && copyToClipboard(selectedEmbed.code, 'html')}>
                  {copiedCode === 'html' ? (<><Check className="h-4 w-4 mr-1" />Copied</>) : (<><Copy className="h-4 w-4 mr-1" />Copy</>)}
                </Button>
              </div>
            </div>

            <div>
              <Label style={{ fontSize: 'var(--font-body)', fontWeight: 500, marginBottom: '8px', display: 'block' }}>Direct URL</Label>
              <div className="relative">
                <Input value={selectedEmbed?.url || ''} readOnly className="pr-24" />
                <Button variant="outline" size="sm" className="absolute top-1/2 right-1 transform -translate-y-1/2" onClick={() => selectedEmbed && copyToClipboard(selectedEmbed.url, 'url')}>
                  {copiedCode === 'url' ? (<><Check className="h-4 w-4 mr-1" />Copied</>) : (<><Copy className="h-4 w-4 mr-1" />Copy</>)}
                </Button>
              </div>
              <p style={{ fontSize: 'var(--font-small)', color: 'var(--text-secondary)', marginTop: '4px' }}>Use this URL for testing or direct linking</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
