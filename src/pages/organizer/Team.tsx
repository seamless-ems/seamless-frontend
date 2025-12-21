import React, { useEffect, useState } from "react";
// ...existing code...
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
// team shape is returned as an array of teams each containing a `users` array
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inviteTeamMember, updateTeamMember, deleteTeamMember, getTeam, updateTeamDetails }
 from "@/lib/api";
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

  const { data: teams, isLoading } = useQuery<any[], Error>({
    queryKey: ["account", "team"],
    queryFn: () => getTeam(),
  });

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedTeamId && teams && teams.length) setSelectedTeamId(teams[0].id);
  }, [teams, selectedTeamId]);

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
    mutationFn: (payload: { teamId: string; name?: string; description?: string }) =>
      updateTeamDetails(payload.teamId, { name: payload.name, description: payload.description }),
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

  // derive members from the selected team (API returns teams with users[])
  const members = (teams?.find((t) => t.id === selectedTeamId)?.users) ?? [];

  const handleInvite = () => {
    if (!selectedTeamId) return;
    inviteMutation.mutate({ first_name: inviteFirstName, last_name: inviteLastName, email: inviteEmail, role: inviteRole, team_id: selectedTeamId });
  };
  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Team Members</h1>
            <p className="text-muted-foreground mt-1">Manage who has access to your account</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <Select value={selectedTeamId ?? ""} onValueChange={(v) => setSelectedTeamId(v || null)}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {(teams ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                // edit currently-selected team
                const selected = teams?.find((t) => t.id === selectedTeamId) ?? teams?.[0];
                setTeamName(selected?.name ?? "");
                setTeamDescription(selected?.description ?? "");
                setEditingTeamId(selected?.id ?? null);
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
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Inviting to</Label>
                    <div className="text-sm text-foreground">{teams?.find((t) => t.id === selectedTeamId)?.name ?? "No team selected"}</div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      placeholder="jane.smith@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="first-name">First Name</Label>
                    <Input
                      id="first-name"
                      placeholder="Jane"
                      value={inviteFirstName}
                      onChange={(e) => setInviteFirstName(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="last-name">Last Name</Label>
                    <Input
                      id="last-name"
                      placeholder="Smith"
                      value={inviteLastName}
                      onChange={(e) => setInviteLastName(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={inviteRole}
                      onValueChange={setInviteRole}
                      defaultValue="member"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(roleConfig).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleInvite}
                    className="w-full sm:w-auto"
                    disabled={inviteMutation.isLoading || !selectedTeamId}
                  >
                    Send Invite
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Team Members Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Avatar</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-[150px]">Role</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    No team members found.
                  </TableCell>
                </TableRow>
              )}
              {members.map((member: any) => {
                const displayName = `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim() || member.email;
                const avatarSrc = member.avatar_url ?? member.avatar ?? "";
                const roleKey = member.role ?? (member.is_admin ? "admin" : "member");
                const roleMeta = (roleConfig as any)[roleKey] ?? { label: String(roleKey ?? "Member"), className: "bg-muted text-muted-foreground" };

                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <Avatar>
                        <AvatarImage src={avatarSrc} alt={displayName} />
                        <AvatarFallback>
                          {displayName?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{displayName}</div>
                      <div className="text-sm text-muted-foreground">{member.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">{member.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={roleMeta.className}>{roleMeta.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">Active</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => {
                              setRoleDialogOpenFor(member.id);
                              setSelectedRole(member.role ?? (member.is_admin ? "admin" : "member"));
                            }}
                          >
                            <User className="mr-2 h-4 w-4" />
                            Change Role
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              deleteMutation.mutate(member.id);
                            }}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Remove from team
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

        {/* Edit Team Modal */}
        <Dialog open={editTeamOpen} onOpenChange={setEditTeamOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Team Details</DialogTitle>
              <DialogDescription>
                Update the information about your team.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="team-name">Team Name</Label>
                <Input
                  id="team-name"
                  placeholder="Enter team name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="team-description">Description</Label>
                <Input
                  id="team-description"
                  placeholder="Enter team description"
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditTeamOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
                <Button
                onClick={() => {
                  updateTeamDetailsMut.mutate({
                    teamId: editingTeamId!,
                    name: teamName,
                    description: teamDescription,
                  });
                }}
                className="w-full sm:w-auto"
                disabled={updateTeamDetailsMut.isLoading}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Role Dialog */}
        <Dialog open={!!roleDialogOpenFor} onOpenChange={() => setRoleDialogOpenFor(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Team Member Role</DialogTitle>
              <DialogDescription>
                Update the role of the team member.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={selectedRole}
                  onValueChange={setSelectedRole}
                  defaultValue="member"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleConfig).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRoleDialogOpenFor(null)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  changeRoleMutation.mutate({
                    memberId: roleDialogOpenFor!,
                    role: selectedRole,
                  });
                }}
                className="w-full sm:w-auto"
                disabled={changeRoleMutation.isLoading}
              >
                Change Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
