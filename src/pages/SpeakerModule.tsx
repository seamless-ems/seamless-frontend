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
} from "lucide-react";
import { Speaker } from "@/types/event";

const mockSpeakers: Speaker[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah@example.com",
    title: "CEO",
    company: "TechCorp",
    headshot: "",
    intakeFormStatus: "approved",
    websiteCardApproved: true,
    promoCardApproved: true,
    registeredAt: "2024-12-01",
  },
  {
    id: "2",
    name: "Mike Chen",
    email: "mike@example.com",
    title: "CTO",
    company: "StartupXYZ",
    headshot: "",
    intakeFormStatus: "submitted",
    websiteCardApproved: true,
    promoCardApproved: false,
    registeredAt: "2024-12-05",
  },
  {
    id: "3",
    name: "Emily Davis",
    email: "emily@example.com",
    title: "VP Engineering",
    company: "BigTech Inc",
    headshot: "",
    intakeFormStatus: "pending",
    websiteCardApproved: false,
    promoCardApproved: false,
    registeredAt: "2024-12-08",
  },
  {
    id: "4",
    name: "James Wilson",
    email: "james@example.com",
    title: "Product Lead",
    company: "InnovateCo",
    headshot: "",
    intakeFormStatus: "submitted",
    websiteCardApproved: false,
    promoCardApproved: false,
    registeredAt: "2024-12-10",
  },
];

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");

  const filteredSpeakers = mockSpeakers.filter((speaker) => {
    const matchesSearch =
      speaker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      speaker.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      speaker.company.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedTab === "all") return matchesSearch;
    return matchesSearch && speaker.intakeFormStatus === selectedTab;
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
            <Button variant="outline">
              <Mail className="h-4 w-4" />
              Send Reminder
            </Button>
            <Button variant="teal">
              <Plus className="h-4 w-4" />
              Add Speaker
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Speakers</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {mockSpeakers.length}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Forms Submitted</p>
            <p className="text-2xl font-bold text-success mt-1">
              {
                mockSpeakers.filter(
                  (s) =>
                    s.intakeFormStatus === "submitted" ||
                    s.intakeFormStatus === "approved"
                ).length
              }
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Pending Forms</p>
            <p className="text-2xl font-bold text-warning mt-1">
              {mockSpeakers.filter((s) => s.intakeFormStatus === "pending").length}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Cards Approved</p>
            <p className="text-2xl font-bold text-primary mt-1">
              {mockSpeakers.filter((s) => s.promoCardApproved).length}
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
                    const status = statusConfig[speaker.intakeFormStatus];
                    const StatusIcon = status.icon;

                    return (
                      <TableRow key={speaker.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={speaker.headshot} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {speaker.name
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
