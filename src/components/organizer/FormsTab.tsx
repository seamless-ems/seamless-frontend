import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getJson } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SpeakerFormBuilder, { type SpeakerFormBuilderHandle } from "@/components/SpeakerFormBuilder";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Copy, MoreVertical } from "lucide-react";
import { Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function FormsTab({ eventId }: { eventId: string | undefined }) {
  const [editingForm, setEditingForm] = useState<string | null>(null);
  const [copiedForm, setCopiedForm] = useState<string | null>(null);
  const [copiedHeader, setCopiedHeader] = useState(false);
  const formBuilderRef = useRef<SpeakerFormBuilderHandle>(null);

  const { data: eventData } = useQuery<any>({
    queryKey: ["event", eventId],
    queryFn: () => getJson<any>(`/events/${eventId}`),
    enabled: Boolean(eventId),
  });

  const eventName = eventData?.title ?? eventData?.name ?? "Event";

  const { data: rawSpeakers } = useQuery<any, Error>({
    queryKey: ["event", eventId, "speakers"],
    queryFn: () => getJson<any>(`/events/${eventId}/speakers`),
    enabled: Boolean(eventId),
  });

  const { data: speakersOverview } = useQuery<any, Error>({
    queryKey: ["event", eventId, "speakers", "overview"],
    queryFn: () => getJson<any>(`/events/${eventId}/speakers/overview`),
    enabled: Boolean(eventId),
  });

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

  const confirmedSpeakersCount = speakerList.length;

  const overviewTotalSpeakers =
    speakersOverview?.totalSpeakers ?? speakersOverview?.total_speakers ?? confirmedSpeakersCount;
  const overviewCallForSpeakers =
    speakersOverview?.totalCallForSpeakers ?? speakersOverview?.total_call_for_speakers ?? 0;

  const forms = [
    {
      id: "speaker-info",
      name: `Speaker Intake | ${eventName}`,
      type: "Speaker Information Form",
      description: "",
      submissions: overviewTotalSpeakers,
      badge: "success",
    },
    {
      id: "call-for-speakers",
      name: `Call for Speakers | ${eventName}`,
      type: "Application Form",
      description: "Applications require approval - submissions go to Call for Speakers tab",
      submissions: overviewCallForSpeakers,
      badge: "warning",
    },
  ];

  const handleGetLink = (formId: string, formType: string) => {
    const url = `${window.location.origin}/${formType}/${eventId}`;
    navigator.clipboard.writeText(url);
    setCopiedForm(formId);
    toast({ title: "Link copied to clipboard!" });
    setTimeout(() => setCopiedForm(null), 2000);
  };

  const handleCopyFormLink = () => {
    const form = forms.find(f => f.id === editingForm);
    if (!form) return;
    const formType = form.type === "Speaker Information Form" ? "speaker-intake" : "call-for-speakers";
    const url = `${window.location.origin}/${formType}/${eventId}`;
    navigator.clipboard.writeText(url);
    setCopiedHeader(true);
    toast({ title: "Link copied to clipboard!" });
    setTimeout(() => setCopiedHeader(false), 2000);
  };

  if (editingForm) {
    const editingFormData = forms.find(f => f.id === editingForm);
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Standard sub-page header */}
        <header className="sticky top-0 z-30 h-14 flex items-center gap-3 border-b border-border bg-card/95 px-4 shrink-0">
          <button
            onClick={() => setEditingForm(null)}
            className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-baseline gap-1.5 leading-none select-none">
            <span className="text-sm font-semibold text-primary" style={{ letterSpacing: "-0.01em" }}>
              Seamless
            </span>
            <span className="text-xs font-normal text-muted-foreground">Forms</span>
          </div>
          {editingFormData && (
            <>
              <span className="text-border">|</span>
              <span className="text-sm font-medium text-foreground truncate">{editingFormData.name}</span>
            </>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" onClick={() => formBuilderRef.current?.save()}>
              Save Changes
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <SpeakerFormBuilder
              ref={formBuilderRef}
              eventId={eventId}
              formType={editingForm ?? undefined}
              formName={editingFormData?.name}
              eventName={eventName}
              onBack={() => setEditingForm(null)}
              onSave={() => setEditingForm(null)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Speaker Forms</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {forms.map((form) => (
          <Card key={form.id} className="hover:shadow-sm hover:border-primary transition-all duration-200 cursor-pointer">
            <CardContent className="pt-6">
              <div className="space-y-4">
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

                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {form.id === "speaker-info"
                      ? "Share this form link with speakers to collect information you customize. Submissions appear instantly in your Speakers list."
                      : "Accept speaker applications. Share the form link, customize your fields, and review submissions in your Call for Speakers tab."}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <div className="text-sm font-semibold text-foreground">{form.submissions}</div>
                    <div className="text-xs text-muted-foreground">submission{form.submissions !== 1 ? 's' : ''}</div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditingForm(form.id)}>
                    Edit Form
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleGetLink(form.id, form.type === "Speaker Information Form" ? "speaker-intake" : "call-for-speakers")}
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
