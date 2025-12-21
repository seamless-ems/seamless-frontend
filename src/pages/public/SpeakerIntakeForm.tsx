
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { getJson, createSpeakerIntake, presignUpload, uploadFile, updateSpeaker } from "@/lib/api";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  User,
  Building2,
  Camera,
  Upload,
  MapPin,
  CheckCircle,
} from "lucide-react";
import { useState } from "react";
import React from "react";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const speakerIntakeSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: z.string().email("Invalid email address"),
  companyName: z.string().min(1, "Company name is required").max(100),
  companyRole: z.string().min(1, "Role/Title is required").max(100),
  bio: z.string().min(10, "Bio must be at least 10 characters").max(500),
});

type SpeakerIntakeFormData = z.infer<typeof speakerIntakeSchema>;

export default function SpeakerIntakeForm() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [headshot, setHeadshot] = useState<File | null>(null);
  const [headshotPreview, setHeadshotPreview] = useState<string | null>(null);
  const [companyLogo, setCompanyLogo] = useState<File | null>(null);
  const [companyLogoPreview, setCompanyLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const location = useLocation();
  const search = new URLSearchParams(location.search);
  const speakerId = search.get("speakerId") ?? undefined;
  const isEditing = Boolean(speakerId);

  const form = useForm<SpeakerIntakeFormData>({
    resolver: zodResolver(speakerIntakeSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      companyName: "",
      companyRole: "",
      bio: "",
    },
  });

  const { data: fetchedSpeaker } = useQuery<any, Error>({
    queryKey: ["event", eventId, "speaker", speakerId],
    queryFn: () => getJson<any>(`/events/${eventId}/speakers/${speakerId}`),
    enabled: Boolean(eventId && speakerId),
  });

  React.useEffect(() => {
    const s = fetchedSpeaker as any;
    if (!s) return;
    form.reset({
      firstName: s.first_name ?? s.firstName ?? "",
      lastName: s.last_name ?? s.lastName ?? "",
      email: s.email ?? "",
      companyName: s.company ?? s.company_name ?? "",
      companyRole: s.title ?? s.company_role ?? "",
      bio: s.bio ?? "",
    });
    setHeadshotPreview(s.headshot ?? s.headshot_url ?? null);
    setCompanyLogoPreview(s.company_logo ?? s.companyLogo ?? null);
  }, [fetchedSpeaker]);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "headshot" | "companyLogo"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size must be less than 5MB");
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP images are allowed");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === "headshot") {
        setHeadshot(file);
        setHeadshotPreview(reader.result as string);
      } else {
        setCompanyLogo(file);
        setCompanyLogoPreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: SpeakerIntakeFormData) => {
    setIsSubmitting(true);
    try {
      if (!eventId) {
        toast.error("Invalid event");
        setIsSubmitting(false);
        return;
      }

      const payload: Record<string, any> = {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        company_name: data.companyName,
        company_role: data.companyRole,
        bio: data.bio,
      };

      if (headshot) {
        try {
          const res = await uploadFile(headshot, "speaker", eventId!);
          payload.headshot = res?.public_url ?? res?.publicUrl ?? res?.url ?? null;
        } catch (err) {
          console.error("headshot upload failed", err);
        }
      }

      if (companyLogo) {
        try {
          const res = await uploadFile(companyLogo, "speaker", eventId!);
          payload.company_logo = res?.public_url ?? res?.publicUrl ?? res?.url ?? null;
        } catch (err) {
          console.error("company logo upload failed", err);
        }
      }

      if (isEditing && speakerId) {
        await updateSpeaker(eventId, speakerId, payload);
        toast.success("Speaker updated successfully!");
        navigate(`/organizer/event/${eventId}/speakers`);
      } else {
        await createSpeakerIntake(eventId, payload);
        toast.success("Registration submitted successfully!");
        navigate("/organizer/events", { replace: true });
      }
    } catch (e) {
      console.error("intake submit error", e);
      toast.error(String(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const { data: eventData, isLoading: loadingEvent } = useQuery(
    {
      queryKey: ["event", eventId],
      queryFn: () => getJson<any>(`/events/${eventId}`),
      enabled: Boolean(eventId),
    }
  );

  return (
    <div className="min-h-screen bg-cream">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-border p-6 hidden lg:flex flex-col">
        <div className="flex items-center gap-2 mb-8">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <div>
            <span className="font-display font-bold text-foreground">Seamless</span>
            <span className="text-xs text-primary block">EMS</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 text-primary">
          <User className="h-4 w-4" />
          <span className="text-sm font-medium">Speaker Registration</span>
        </div>

        <div className="mt-auto">
          <Button variant="teal" className="w-full">
            Sign In
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64 p-6 lg:p-12">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Event Header */}
          <div className="bg-white rounded-xl border border-border p-6">
            <p className="text-sm text-muted-foreground">Registering for</p>
            <h1 className="font-display text-2xl font-bold text-foreground mt-1">
              {eventData?.title ?? (loadingEvent ? "Loading…" : "Untitled Event")}
            </h1>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{eventData?.location ?? ""}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{eventData?.type ?? ""}</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Personal Details Section */}
              <div className="bg-white rounded-xl border border-border p-6">
                <div className="flex items-center gap-2 mb-6">
                        <User className="h-5 w-5 text-primary" />
                        <h2 className="font-display text-lg font-semibold text-foreground">
                          Personal Details
                        </h2>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First name</FormLabel>
                              <FormControl>
                                <Input placeholder="First name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last name</FormLabel>
                              <FormControl>
                                <Input placeholder="Last name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input placeholder="you@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Company Details */}
                    <div className="bg-white rounded-xl border border-border p-6">
                      <div className="flex items-center gap-2 mb-6">
                        <Building2 className="h-5 w-5 text-primary" />
                        <h2 className="font-display text-lg font-semibold text-foreground">Company</h2>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company name</FormLabel>
                              <FormControl>
                                <Input placeholder="Company" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="companyRole"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role / Title</FormLabel>
                              <FormControl>
                                <Input placeholder="Speaker role" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Bio */}
                    <div className="bg-white rounded-xl border border-border p-6">
                      <div className="flex items-center gap-2 mb-6">
                        <CheckCircle className="h-5 w-5 text-primary" />
                        <h2 className="font-display text-lg font-semibold text-foreground">Bio</h2>
                      </div>

                      <FormField
                        control={form.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Short bio</FormLabel>
                            <FormControl>
                              <Textarea placeholder="A short bio for event materials" rows={6} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Uploads */}
                    <div className="bg-white rounded-xl border border-border p-6">
                      <div className="flex items-center gap-2 mb-6">
                        <Camera className="h-5 w-5 text-primary" />
                        <h2 className="font-display text-lg font-semibold text-foreground">Uploads</h2>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label>Headshot</Label>
                          <div className="mt-2 flex items-center gap-4">
                            <input type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} onChange={(e) => handleImageUpload(e, "headshot")} />
                            {headshotPreview && <img src={headshotPreview} alt="headshot preview" className="h-20 w-20 object-cover rounded-full" />}
                          </div>
                        </div>

                        <div>
                          <Label>Company logo</Label>
                          <div className="mt-2 flex items-center gap-4">
                            <input type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} onChange={(e) => handleImageUpload(e, "companyLogo")} />
                            {companyLogoPreview && <img src={companyLogoPreview} alt="company logo preview" className="h-16 w-16 object-contain" />}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-4">
                      <Button variant="ghost" type="button" onClick={() => navigate(-1)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (isEditing ? "Updating…" : "Submitting…") : isEditing ? "Update" : "Register"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </div>
          </div>
        );
      }
