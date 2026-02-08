import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getJson } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SpeakerFormBuilder from "@/components/SpeakerFormBuilder";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Copy, MoreVertical } from "lucide-react";
import { Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function FormsTab({ eventId }: { eventId: string | undefined }) {
  const [editingForm, setEditingForm] = useState<string | null>(null);
  const [copiedForm, setCopiedForm] = useState<string | null>(null);

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

  const handleGetLink = (formId: string, formType: string) => {
    const url = `${window.location.origin}/${formType}/${eventId}`;
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
          formType={editingForm ?? undefined}
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
                    onClick={() => handleGetLink(form.id, form.type === "Speaker Information Form" ? "speaker-info" : "call-for-speakers")}
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
