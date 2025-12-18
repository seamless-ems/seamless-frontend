import { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Mail, Shield, User, Users } from "lucide-react";
import { TeamMember } from "@/types/event";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inviteTeamMember, updateTeamMember, deleteTeamMember, getTeam, updateTeamDetails } from "@/lib/api";

const roleConfig = {
  admin: {
    label: "Admin",
    description: "Full access to all features",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  member: {
    label: "Member",
    description: "Can manage events and speakers",
    className: "bg-info/10 text-info border-info/20",
  },
  viewer: {
    label: "Viewer",
    description: "View-only access",
    className: "bg-muted text-muted-foreground border-muted",
  },
};

export default function Team() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("member");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Edit team modal state
  const [editTeamOpen, setEditTeamOpen] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");

  const queryClient = useQueryClient();

  const { data: teamMembers, isLoading } = useQuery<TeamMember[], Error>({
    queryKey: ["account", "team"],
    queryFn: () => getTeam(),
  });

  const inviteMutation = useMutation({
    mutationFn: (body: any) => inviteTeamMember(body),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ["account", "team"] });
      setInviteEmail("");
      setInviteFirstName("");
      setInviteLastName("");
      setInviteRole("member");
      setIsDialogOpen(false);
    },
  }) as any;

  const updateTeamDetailsMut = useMutation({
    mutationFn: ({ teamId, name, description }: { teamId: string; name?: string; description?: string }) =>
      updateTeamDetails(teamId, { name, description }),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ["account", "team"] });
      setEditTeamOpen(false);
      setEditingTeamId(null);
    },
  }) as any;

  const changeRoleMutation = useMutation({
    mutationFn: (payload: { memberId: string; role: string }) => updateTeamMember(payload.memberId, payload.role),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ["account", "team"] });
      setRoleDialogOpenFor(null);
    },
  }) as any;

  const deleteMutation = useMutation({
    mutationFn: (memberId: string) => deleteTeamMember(memberId),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ["account", "team"] });
    },
  }) as any;

  const [roleDialogOpenFor, setRoleDialogOpenFor] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("member");

  const members = teamMembers ?? [];

  const handleInvite = () => inviteMutation.mutate({ first_name: inviteFirstName, last_name: inviteLastName, email: inviteEmail, role: inviteRole });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Team Members</h1>
            <p className="text-muted-foreground mt-1">Manage who has access to your account</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const first = members && members.length ? (members[0] as any) : null;
                setTeamName(first?.name ?? first?.display_name ?? "");
                setTeamDescription(first?.description ?? "");
                setEditingTeamId(first?.team_id ?? first?.id ?? null);
                setEditTeamOpen(true);
              }}
            >
              Edit Team
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="teal">
                  <Plus className="h-4 w-4" />
                  Invite Member
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>Send an invitation to join your account</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input value={inviteFirstName} onChange={(e) => setInviteFirstName(e.target.value)} placeholder="First name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input value={inviteLastName} onChange={(e) => setInviteLastName(e.target.value)} placeholder="Last name" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      placeholder="colleague@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            <span>Admin</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="member">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Member</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="viewer">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>Viewer</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <p className="text-sm text-muted-foreground">
                      {roleConfig[inviteRole as keyof typeof roleConfig]?.description}
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="teal" onClick={handleInvite}>
                    <Mail className="h-4 w-4" />
                    Send Invitation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Edit Team Modal */}
        <Dialog open={editTeamOpen} onOpenChange={(v) => setEditTeamOpen(v)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Team</DialogTitle>
              <DialogDescription>Update the team's name and description.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Team Name</Label>
                <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Team Description</Label>
                <Input value={teamDescription} onChange={(e) => setTeamDescription(e.target.value)} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditTeamOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="teal"
                onClick={() => {
                  const teamId = editingTeamId ?? (members && members.length ? (members[0] as any)?.team_id ?? (members[0] as any)?.id ?? null : null);
                  if (!teamId) {
                    setEditTeamOpen(false);
                    return;
                  }
                  updateTeamDetailsMut.mutate({ teamId, name: teamName, description: teamDescription });
                }}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Role Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {Object.entries(roleConfig).map(([key, config]) => {
            const count = isLoading ? "…" : members.filter((m) => (m.role ?? "admin") === key).length;
            return (
              <div key={key} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className={config.className}>
                    {config.label}
                  </Badge>
                  <span className="text-2xl font-bold text-foreground">{count}</span>
                </div>
                <p className="text-sm text-muted-foreground">{config.description}</p>
              </div>
            );
          })}
        </div>

        {/* Team Table */}
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => {
                const m: any = member as any;
                const memberRoleKey = (m.role as string) ?? "viewer";
                const role = roleConfig[memberRoleKey] ?? {
                  label: memberRoleKey ? String(memberRoleKey) : "Member",
                  description: "",
                  className: "bg-muted text-muted-foreground border-muted",
                };

                const displayName: string = (m.name ?? m.display_name ?? m.description ?? m.id ?? "") as string;
                const initials = (displayName
                  ? displayName
                      .split(" ")
                      .map((n: string) => (n ? n[0] : ""))
                      .join("")
                  : String((m.created_by ?? m.id ?? "")).slice(0, 2));
                const avatarSrc = (m.avatar ?? m.avatar_url ?? "") as string;
                const contactEmail = (m.email ?? m.contact_email ?? "") as string;

                return (
                  <TableRow key={member.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={avatarSrc} />
                          <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{displayName}</p>
                          <p className="text-sm text-muted-foreground">{contactEmail}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className={role.className ?? "bg-muted text-muted-foreground border-muted"}>
                        {role.label}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                        Active
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setRoleDialogOpenFor(member.id)}>Change Role</DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              const first = member as any;
                              setTeamName(first?.name ?? first?.display_name ?? "");
                              setTeamDescription(first?.description ?? "");
                              setEditingTeamId(first?.team_id ?? first?.id ?? null);
                              setEditTeamOpen(true);
                            }}
                          >
                            Edit Team
                          </DropdownMenuItem>
                          <DropdownMenuItem>Resend Invite</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={() => {
                              if (confirm("Remove this member from the team?")) {
                                deleteMutation.mutate(member.id);
                              }
                            }}
                          >
                            Remove Member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Change Role Dialog */}
        <Dialog open={Boolean(roleDialogOpenFor)} onOpenChange={(open) => { if (!open) setRoleDialogOpenFor(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Role</DialogTitle>
              <DialogDescription>Change the role for this team member.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>

                <p className="text-sm text-muted-foreground">{roleConfig[selectedRole as keyof typeof roleConfig]?.description}</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRoleDialogOpenFor(null)}>Cancel</Button>
              <Button
                variant="teal"
                onClick={() => {
                  if (roleDialogOpenFor) {
                    changeRoleMutation.mutate({ memberId: roleDialogOpenFor, role: selectedRole });
                  }
                }}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
