import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
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
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    console.log("Form submitted:", {
      ...data,
      headshot,
      companyLogo,
    });
    
    toast.success("Registration submitted successfully!");
    setIsSubmitting(false);
  };

  // Mock event data
  const eventData = {
    title: "Tech Conference 2024",
    location: "San Francisco, USA",
    type: "Conference",
  };

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
              {eventData.title}
            </h1>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{eventData.location}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{eventData.type}</p>
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

                <div className="flex flex-col md:flex-row gap-6">
                  {/* Profile Photo Upload */}
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <div className="h-28 w-28 rounded-full border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                        {headshotPreview ? (
                          <img
                            src={headshotPreview}
                            alt="Profile preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <User className="h-10 w-10 text-muted-foreground" />
                        )}
                      </div>
                      <label
                        htmlFor="headshot-upload"
                        className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
                      >
                        <Camera className="h-4 w-4" />
                      </label>
                      <input
                        id="headshot-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, "headshot")}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground mt-2">
                      Profile Photo
                    </span>
                  </div>

                  {/* Form Fields */}
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Jane" {...field} />
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
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="e.g. jane@company.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Speaker Bio</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tell us about yourself..."
                              className="min-h-[100px] resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Company Information Section */}
              <div className="bg-white rounded-xl border border-border p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    Company Information
                  </h2>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                  {/* Company Logo Upload */}
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <div className="h-28 w-28 rounded-lg border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                        {companyLogoPreview ? (
                          <img
                            src={companyLogoPreview}
                            alt="Company logo preview"
                            className="h-full w-full object-contain p-2"
                          />
                        ) : (
                          <Building2 className="h-10 w-10 text-muted-foreground" />
                        )}
                      </div>
                      <label
                        htmlFor="logo-upload"
                        className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
                      >
                        <Upload className="h-4 w-4" />
                      </label>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, "companyLogo")}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground mt-2">
                      Company Logo
                    </span>
                  </div>

                  {/* Form Fields */}
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Acme Inc" {...field} />
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
                              <Input placeholder="e.g. CEO" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="teal"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  "Submitting..."
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Registration
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
