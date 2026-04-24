import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTeam,
  inviteTeamMember,
  deleteTeamMember,
  updateTeamMember,
  createTeam,
  deleteTeam,
  updateTeamDetails,
  getOrganization,
  getRoles,
} from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Check, X, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CircleLoader } from "react-spinners";

function roleLabel(role: string): string {
  const stripped = role.replace(/^[^:]+:/, "");
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

export default function TeamSection() {
  const qc = useQueryClient();
  const { data: team = [], isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: () => getTeam(),
  });
  const { data: roles = [] } = useQuery<any[]>({
    queryKey: ["roles"],
    queryFn: () => getRoles(),
  });
  const { data: orgs = [] } = useQuery<any[]>({
    queryKey: ["organization"],
    queryFn: () => getOrganization(),
  });

  const [confirmRemoveMemberId, setConfirmRemoveMemberId] = React.useState<
    string | null
  >(null);
  const [confirmRemoveMemberName, setConfirmRemoveMemberName] =
    React.useState("");
  const [confirmDeleteTeamId, setConfirmDeleteTeamId] = React.useState<
    string | null
  >(null);
  const [confirmDeleteTeamName, setConfirmDeleteTeamName] = React.useState("");
  const [creatingTeam, setCreatingTeam] = React.useState(false);
  const [inviteForTeam, setInviteForTeam] = React.useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState("member");
  const [editingTeamId, setEditingTeamId] = React.useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = React.useState("");
  const [pendingRoles, setPendingRoles] = React.useState<
    Record<string, string>
  >({});

  const inviteMut = useMutation({
    mutationFn: (body: any) => inviteTeamMember(body),
    onSuccess: () => {
      toast.success("Invite sent");
      qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (err: any) => toast.error(String(err)),
  });

  const createTeamMut = useMutation({
    mutationFn: (body: { name: string; organizationId: string }) =>
      createTeam(body),
    onSuccess: () => {
      toast.success("Team created");
      qc.invalidateQueries({ queryKey: ["team"] });
      setCreatingTeam(false);
      teamForm.reset();
    },
    onError: (err: any) => toast.error(String(err)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTeamMember(id),
    onSuccess: () => {
      toast.success("Member removed");
      qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (err: any) => toast.error(String(err)),
  });

  const deleteTeamMut = useMutation({
    mutationFn: (id: string) => deleteTeam(id),
    onSuccess: () => {
      toast.success("Team deleted");
      qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (err: any) => toast.error(String(err)),
  });

  const roleMut = useMutation({
    mutationFn: ({ id, role }: any) => updateTeamMember(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
    onError: (err: any) => toast.error(String(err)),
  });

  const updateTeamMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateTeamDetails(id, { name }),
    onSuccess: () => {
      toast.success("Team name updated");
      qc.invalidateQueries({ queryKey: ["team"] });
      setEditingTeamId(null);
    },
    onError: (err: any) => toast.error(String(err)),
  });

  const teamForm = useForm<{ name: string }>({ defaultValues: { name: "" } });

  // Default invite role to first available
  React.useEffect(() => {
    if (roles && roles.length > 0 && inviteRole === "member") {
      setInviteRole(roles[0].id || roles[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Teams</CardTitle>
          <CardDescription>
            <div className="col-span-full flex justify-center py-8">
              <CircleLoader size={40} color="#4e5ca6" />
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    );
  }

  const isTeamList = team.length > 0 && (team[0].users || team[0].members);

  return (
    <>
      {/* Confirm delete team dialog */}
      <AlertDialog
        open={!!confirmDeleteTeamId}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteTeamId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Delete team?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete{" "}
            <strong>{confirmDeleteTeamName}</strong> and remove all its members.
            This cannot be undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirmDeleteTeamId)
                    deleteTeamMut.mutate(confirmDeleteTeamId);
                  setConfirmDeleteTeamId(null);
                }}
              >
                Delete Team
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm remove member dialog */}
      <AlertDialog
        open={!!confirmRemoveMemberId}
        onOpenChange={(open) => {
          if (!open) setConfirmRemoveMemberId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Remove member?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove <strong>{confirmRemoveMemberName}</strong> from the
            team. They will lose access immediately.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirmRemoveMemberId)
                    deleteMut.mutate(confirmRemoveMemberId);
                  setConfirmRemoveMemberId(null);
                }}
              >
                Remove
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        {/* For now we use org in background but do not allow user to edit */}
        {/* For now we only allow a single team */}
        {team.length === 0 ? (
          <>
            <CardHeader>
              <CardTitle className="text-lg">Team</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No teams found.</p>
            </CardContent>
          </>
        ) : isTeamList ? (
          team.map((t: any) => {
            const members = t.users || t.members || [];
            return (
              <React.Fragment key={t.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">Team</CardTitle>
                      <span className="text-muted-foreground">|</span>
                      {editingTeamId === t.id ? (
                        <>
                          <Input
                            autoFocus
                            value={editingTeamName}
                            onChange={(e) => setEditingTeamName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                updateTeamMut.mutate({
                                  id: t.id,
                                  name: editingTeamName,
                                });
                              if (e.key === "Escape") setEditingTeamId(null);
                            }}
                            className="h-7 w-48"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
                            onClick={() =>
                              updateTeamMut.mutate({
                                id: t.id,
                                name: editingTeamName,
                              })
                            }
                            disabled={updateTeamMut.isPending}
                          >
                            <Check className="h-3.5 w-3.5 text-success" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
                            onClick={() => setEditingTeamId(null)}
                          >
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="text-base font-medium text-muted-foreground">
                            {t.name ?? t.id}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => {
                              setEditingTeamId(t.id);
                              setEditingTeamName(t.name ?? "");
                            }}
                          >
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setInviteForTeam(t.id);
                        setInviteEmail("");
                        setInviteRole(roles?.[0]?.id ?? roles?.[0] ?? "member");
                      }}
                    >
                      Add Teammate
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1">
                    {members.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No members
                      </p>
                    ) : (
                      members.map((m: any) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between py-1.5"
                        >
                          <div>
                            <div className="font-medium text-sm">
                              {m.name ?? m.email}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {m.email}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={pendingRoles[m.id] ?? m.role}
                              onChange={(e) =>
                                setPendingRoles((prev) => ({
                                  ...prev,
                                  [m.id]: e.target.value,
                                }))
                              }
                              className="border rounded px-2 py-1 text-sm"
                            >
                              <option value="team:admin">Admin</option>
                              <option value="team:member">Member</option>
                              <option value="team:viewer">Viewer</option>
                            </select>
                            {pendingRoles[m.id] &&
                            pendingRoles[m.id] !== m.role ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  roleMut.mutate({
                                    id: m.id,
                                    role: pendingRoles[m.id],
                                  });
                                  setPendingRoles((prev) => {
                                    const n = { ...prev };
                                    delete n[m.id];
                                    return n;
                                  });
                                }}
                              >
                                Update Role
                              </Button>
                            ) : (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setConfirmRemoveMemberName(
                                    m.name ?? m.email ?? "this member",
                                  );
                                  setConfirmRemoveMemberId(m.id);
                                }}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    {inviteForTeam === t.id && (
                      <div className="pt-3 border-t mt-2">
                        <div className="grid sm:grid-cols-3 gap-2 items-end">
                          <div className="sm:col-span-2">
                            <Label htmlFor={`invite-email-${t.id}`}>
                              Invite by email
                            </Label>
                            <Input
                              id={`invite-email-${t.id}`}
                              type="email"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={inviteRole}
                              onChange={(e) => setInviteRole(e.target.value)}
                              className="border rounded px-2 py-1 text-sm"
                            >
                              <option value="team:admin">Admin</option>
                              <option value="team:member">Member</option>
                              <option value="team:viewer">Viewer</option>
                            </select>
                            <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-pointer shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="w-72 text-xs space-y-2"
                                >
                                  <p>
                                    <strong>Admin</strong> — can do everything
                                    within the team.
                                  </p>
                                  <p>
                                    <strong>Member</strong> — can do everything
                                    except delete the team and manage team
                                    members.
                                  </p>
                                  <p>
                                    <strong>Viewer</strong> — can only view team
                                    and event information.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Button
                              size="sm"
                              onClick={async () => {
                                if (!inviteEmail) return;
                                try {
                                  await inviteMut.mutateAsync({
                                    email: inviteEmail,
                                    role: inviteRole,
                                    teamId: t.id,
                                  });
                                  setInviteForTeam(null);
                                } catch {}
                              }}
                            >
                              Send
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setInviteForTeam(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </React.Fragment>
            );
          })
        ) : (
          // Flat list of members (non-grouped response shape)
          <>
            <CardHeader>
              <CardTitle className="text-lg">Team</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {team.map((m: any) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between py-1.5"
                  >
                    <div>
                      <div className="font-medium text-sm">
                        {m.name ?? m.email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {m.email}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={m.role}
                        onChange={(e) =>
                          roleMut.mutate({ id: m.id, role: e.target.value })
                        }
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value="team:admin">Admin</option>
                        <option value="team:member">Member</option>
                        <option value="team:viewer">Viewer</option>
                      </select>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setConfirmRemoveMemberName(
                            m.name ?? m.email ?? "this member",
                          );
                          setConfirmRemoveMemberId(m.id);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </>
  );
}
