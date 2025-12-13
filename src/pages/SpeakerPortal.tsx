import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronLeft,
  Download,
  Code,
  CheckCircle,
  Clock,
  Upload,
  Image,
  FileText,
  Linkedin,
  Mail,
  Building,
  User,
  Edit,
  Eye,
  Copy,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock speaker data
const mockSpeaker = {
  id: "1",
  name: "Sarah Johnson",
  email: "sarah@example.com",
  title: "CEO",
  company: "TechCorp",
  bio: "Sarah is a visionary leader with over 15 years of experience in the tech industry. She has led multiple successful startups and is passionate about innovation and empowering teams.",
  linkedin: "https://linkedin.com/in/sarahjohnson",
  headshot: "",
  companyLogo: "",
  intakeFormStatus: "approved" as const,
  websiteCardApproved: true,
  promoCardApproved: true,
  registeredAt: "2024-12-01",
};

export default function SpeakerPortal() {
  const { id, speakerId } = useParams();

  return (
    <DashboardLayout eventId={id}>
      <div className="space-y-6">
        {/* Back Button & Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/event/${id}/speakers`}>
              <ChevronLeft className="h-4 w-4" />
              Back to Speakers
            </Link>
          </Button>
        </div>

        {/* Speaker Header Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-start">
              <Avatar className="h-24 w-24 border-4 border-primary/20">
                <AvatarImage src={mockSpeaker.headshot} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-display">
                  {mockSpeaker.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="font-display text-2xl font-bold text-foreground">
                    {mockSpeaker.name}
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    {mockSpeaker.title} at {mockSpeaker.company}
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{mockSpeaker.email}</span>
                  </div>
                  {mockSpeaker.linkedin && (
                    <a
                      href={mockSpeaker.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-primary transition-colors"
                    >
                      <Linkedin className="h-4 w-4" />
                      <span>LinkedIn Profile</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className="bg-success/10 text-success border-success/20"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Form Submitted
                  </Badge>
                  {mockSpeaker.websiteCardApproved && (
                    <Badge
                      variant="outline"
                      className="bg-primary/10 text-primary border-primary/20"
                    >
                      Website Card Approved
                    </Badge>
                  )}
                  {mockSpeaker.promoCardApproved && (
                    <Badge
                      variant="outline"
                      className="bg-accent/10 text-accent border-accent/20"
                    >
                      Promo Card Approved
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button variant="teal" size="sm">
                  <Mail className="h-4 w-4" />
                  Contact
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="info" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="info">Speaker Info</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="cards">Cards</TabsTrigger>
            <TabsTrigger value="embed">Embed Codes</TabsTrigger>
          </TabsList>

          {/* Speaker Info Tab */}
          <TabsContent value="info" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={mockSpeaker.name} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={mockSpeaker.email} readOnly />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input value={mockSpeaker.title} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Company</Label>
                      <Input value={mockSpeaker.company} readOnly />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>LinkedIn</Label>
                    <Input value={mockSpeaker.linkedin || ""} readOnly />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Bio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={mockSpeaker.bio}
                    readOnly
                    className="min-h-[200px]"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Assets Tab */}
          <TabsContent value="assets" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Image className="h-5 w-5 text-primary" />
                    Headshot
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-square max-w-[300px] rounded-xl bg-muted flex items-center justify-center border-2 border-dashed border-border">
                    {mockSpeaker.headshot ? (
                      <img
                        src={mockSpeaker.headshot}
                        alt="Headshot"
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No headshot uploaded
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4" />
                      Replace
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building className="h-5 w-5 text-primary" />
                    Company Logo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video max-w-[300px] rounded-xl bg-muted flex items-center justify-center border-2 border-dashed border-border">
                    {mockSpeaker.companyLogo ? (
                      <img
                        src={mockSpeaker.companyLogo}
                        alt="Company Logo"
                        className="max-w-full max-h-full object-contain p-4"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No logo uploaded
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4" />
                      Replace
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cards Tab */}
          <TabsContent value="cards" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Website Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Website Card</CardTitle>
                  <Badge
                    variant="outline"
                    className={cn(
                      mockSpeaker.websiteCardApproved
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-warning/10 text-warning border-warning/20"
                    )}
                  >
                    {mockSpeaker.websiteCardApproved ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approved
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3 mr-1" />
                        Pending Approval
                      </>
                    )}
                  </Badge>
                </CardHeader>
                <CardContent>
                  {/* Preview Card */}
                  <div className="rounded-xl border border-border bg-card p-4 mb-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback className="bg-primary/10 text-primary font-display">
                          {mockSpeaker.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold text-foreground">
                          {mockSpeaker.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {mockSpeaker.title}
                        </p>
                        <p className="text-sm text-primary">
                          {mockSpeaker.company}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                      Preview
                    </Button>
                    {!mockSpeaker.websiteCardApproved && (
                      <Button variant="teal" size="sm">
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Promo Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Promo Card</CardTitle>
                  <Badge
                    variant="outline"
                    className={cn(
                      mockSpeaker.promoCardApproved
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-warning/10 text-warning border-warning/20"
                    )}
                  >
                    {mockSpeaker.promoCardApproved ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approved
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3 mr-1" />
                        Pending Approval
                      </>
                    )}
                  </Badge>
                </CardHeader>
                <CardContent>
                  {/* Promo Card Preview */}
                  <div className="aspect-[4/5] rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 flex flex-col justify-end mb-4">
                    <div className="space-y-2">
                      <h4 className="font-display text-xl font-bold">
                        {mockSpeaker.name}
                      </h4>
                      <p className="text-sm opacity-90">{mockSpeaker.title}</p>
                      <p className="text-sm font-semibold">
                        {mockSpeaker.company}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm">
                      <Mail className="h-4 w-4" />
                      Email to Speaker
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Embed Codes Tab */}
          <TabsContent value="embed" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  Website Card Embed Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-muted p-4 font-mono text-sm overflow-x-auto">
                  <code className="text-foreground">
                    {`<iframe src="https://seamlessevents.io/embed/speaker/${mockSpeaker.id}" width="300" height="200" frameborder="0"></iframe>`}
                  </code>
                </div>
                <Button variant="outline" size="sm" className="mt-4">
                  <Copy className="h-4 w-4" />
                  Copy Code
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  Promo Card Embed Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-muted p-4 font-mono text-sm overflow-x-auto">
                  <code className="text-foreground">
                    {`<iframe src="https://seamlessevents.io/embed/promo/${mockSpeaker.id}" width="400" height="500" frameborder="0"></iframe>`}
                  </code>
                </div>
                <Button variant="outline" size="sm" className="mt-4">
                  <Copy className="h-4 w-4" />
                  Copy Code
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
