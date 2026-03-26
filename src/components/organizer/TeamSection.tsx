import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTeam, inviteTeamMember, deleteTeamMember, updateTeamMember, createTeam, deleteTeam, getOrganization, getRoles } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

export default function TeamSection() {
    const qc = useQueryClient();
    const { data: team = [], isLoading } = useQuery({ queryKey: ["team"], queryFn: () => getTeam() });
    const { data: roles = [] } = useQuery<any[]>({ queryKey: ["roles"], queryFn: () => getRoles() });
    const { data: orgs = [] } = useQuery<any[]>({ queryKey: ["organization"], queryFn: () => getOrganization() });

    const [confirmRemoveMemberId, setConfirmRemoveMemberId] = React.useState<string | null>(null);
    const [confirmRemoveMemberName, setConfirmRemoveMemberName] = React.useState("");
    const [confirmDeleteTeamId, setConfirmDeleteTeamId] = React.useState<string | null>(null);
    const [confirmDeleteTeamName, setConfirmDeleteTeamName] = React.useState("");
    const [creatingTeam, setCreatingTeam] = React.useState(false);
    const [inviteForTeam, setInviteForTeam] = React.useState<string | null>(null);
    const [inviteEmail, setInviteEmail] = React.useState("");
    const [inviteRole, setInviteRole] = React.useState("member");

    const inviteMut = useMutation({
        mutationFn: (body: any) => inviteTeamMember(body),
        onSuccess: () => {
            toast.success("Invite sent");
            qc.invalidateQueries({ queryKey: ["team"] });
        },
        onError: (err: any) => toast.error(String(err)),
    });

    const createTeamMut = useMutation({
        mutationFn: (body: { name: string; organizationId: string }) => createTeam(body),
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
                    <CardDescription>Loading teams...</CardDescription>
                </CardHeader>
                <CardContent />
            </Card>
        );
    }

    const isTeamList = team.length > 0 && (team[0].users || team[0].members);

    return (
        <>
            {/* Confirm delete team dialog */}
            <AlertDialog open={!!confirmDeleteTeamId} onOpenChange={(open) => { if (!open) setConfirmDeleteTeamId(null); }}>
                <AlertDialogContent>
                    <AlertDialogTitle>Delete team?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete <strong>{confirmDeleteTeamName}</strong> and remove all its members. This cannot be undone.
                    </AlertDialogDescription>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Button variant="destructive" onClick={() => {
                                if (confirmDeleteTeamId) deleteTeamMut.mutate(confirmDeleteTeamId);
                                setConfirmDeleteTeamId(null);
                            }}>
                                Delete Team
                            </Button>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Confirm remove member dialog */}
            <AlertDialog open={!!confirmRemoveMemberId} onOpenChange={(open) => { if (!open) setConfirmRemoveMemberId(null); }}>
                <AlertDialogContent>
                    <AlertDialogTitle>Remove member?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will remove <strong>{confirmRemoveMemberName}</strong> from the team. They will lose access immediately.
                    </AlertDialogDescription>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Button variant="destructive" onClick={() => {
                                if (confirmRemoveMemberId) deleteMut.mutate(confirmRemoveMemberId);
                                setConfirmRemoveMemberId(null);
                            }}>
                                Remove
                            </Button>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Teams</CardTitle>
                    <CardDescription>Manage your teams and members</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {team.length === 0 ? (
                            <div className="text-sm text-muted-foreground">No teams found.</div>
                        ) : isTeamList ? (
                            <div className="space-y-4">
                                {team.map((t: any) => {
                                    const members = t.users || t.members || [];
                                    return (
                                        <div key={t.id} className="border rounded-lg p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="font-medium">{t.name ?? t.id}</div>
                                                    {t.description && <div className="text-sm text-muted-foreground">{t.description}</div>}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => {
                                                        setInviteForTeam(t.id);
                                                        setInviteEmail("");
                                                        if (roles && roles.length > 0) setInviteRole(roles[0].id || roles[0]);
                                                        else setInviteRole("member");
                                                    }}>
                                                        Add Member
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => {
                                                        setConfirmDeleteTeamName(t.name ?? t.id);
                                                        setConfirmDeleteTeamId(t.id);
                                                    }}>
                                                        Delete
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                {members.length === 0 ? (
                                                    <div className="text-sm text-muted-foreground">No members</div>
                                                ) : (
                                                    members.map((m: any) => (
                                                        <div key={m.id} className="flex items-center justify-between py-1">
                                                            <div>
                                                                <div className="font-medium text-sm">{m.name ?? m.email}</div>
                                                                <div className="text-xs text-muted-foreground">{m.email}</div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <select
                                                                    value={m.role}
                                                                    onChange={(e) => roleMut.mutate({ id: m.id, role: e.target.value })}
                                                                    className="border rounded px-2 py-1 text-sm"
                                                                >
                                                                    {roles && roles.length > 0 ? (
                                                                        roles.map((r: any) => (
                                                                            <option key={r.id || r} value={r.id || r}>{r.id || r}</option>
                                                                        ))
                                                                    ) : (
                                                                        <>
                                                                            <option value="owner">Owner</option>
                                                                            <option value="admin">Admin</option>
                                                                            <option value="member">Member</option>
                                                                        </>
                                                                    )}
                                                                </select>
                                                                <Button
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setConfirmRemoveMemberName(m.name ?? m.email ?? "this member");
                                                                        setConfirmRemoveMemberId(m.id);
                                                                    }}
                                                                >
                                                                    Remove
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>

                                            {inviteForTeam === t.id && (
                                                <div className="pt-2 border-t">
                                                    <div className="grid sm:grid-cols-3 gap-2 items-end">
                                                        <div className="sm:col-span-2">
                                                            <Label htmlFor={`invite-email-${t.id}`}>Invite by email</Label>
                                                            <Input id={`invite-email-${t.id}`} type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="border rounded px-2 py-1 text-sm">
                                                                {roles && roles.length > 0 ? (
                                                                    roles.map((r: any) => (
                                                                        <option key={r.id || r} value={r.id || r}>{r.id || r}</option>
                                                                    ))
                                                                ) : (
                                                                    <>
                                                                        <option value="owner">Owner</option>
                                                                        <option value="admin">Admin</option>
                                                                        <option value="member">Member</option>
                                                                    </>
                                                                )}
                                                            </select>
                                                            <Button size="sm" onClick={async () => {
                                                                if (!inviteEmail) return;
                                                                try {
                                                                    await inviteMut.mutateAsync({ email: inviteEmail, role: inviteRole, teamId: t.id });
                                                                    setInviteForTeam(null);
                                                                } catch {}
                                                            }}>Send</Button>
                                                            <Button size="sm" variant="ghost" onClick={() => setInviteForTeam(null)}>Cancel</Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            // Flat list of members (non-grouped response shape)
                            <div className="space-y-2">
                                {team.map((m: any) => (
                                    <div key={m.id} className="flex items-center justify-between py-1">
                                        <div>
                                            <div className="font-medium text-sm">{m.name ?? m.email}</div>
                                            <div className="text-xs text-muted-foreground">{m.email}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={m.role}
                                                onChange={(e) => roleMut.mutate({ id: m.id, role: e.target.value })}
                                                className="border rounded px-2 py-1 text-sm"
                                            >
                                                <option value="owner">Owner</option>
                                                <option value="admin">Admin</option>
                                                <option value="member">Member</option>
                                            </select>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => {
                                                    setConfirmRemoveMemberName(m.name ?? m.email ?? "this member");
                                                    setConfirmRemoveMemberId(m.id);
                                                }}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="pt-2 border-t">
                            {creatingTeam ? (
                                <form onSubmit={teamForm.handleSubmit((vals) => {
                                    const orgId = orgs?.[0]?.id ?? "";
                                    createTeamMut.mutate({ name: vals.name, organizationId: orgId });
                                })} className="grid gap-2">
                                    <div>
                                        <Label htmlFor="team-name">Team Name</Label>
                                        <Input id="team-name" {...teamForm.register("name", { required: true })} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button type="submit" disabled={createTeamMut.status === "pending"}>Create Team</Button>
                                        <Button type="button" variant="ghost" onClick={() => setCreatingTeam(false)}>Cancel</Button>
                                    </div>
                                </form>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">Create a new team for this account.</p>
                                    <Button size="sm" variant="outline" onClick={() => setCreatingTeam(true)}>Create Team</Button>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
