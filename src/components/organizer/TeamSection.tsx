import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTeam, inviteTeamMember, deleteTeamMember, updateTeamMember, createTeam, getOrganization } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export default function TeamSection() {
    const qc = useQueryClient();
    const { data: team = [], isLoading } = useQuery({ queryKey: ["team"], queryFn: () => getTeam() });

    const inviteMut = useMutation({
        mutationFn: (body: any) => inviteTeamMember(body),
        onSuccess: () => {
            toast.success("Invite sent");
            qc.invalidateQueries({ queryKey: ["team"] });
        },
        onError: (err: any) => toast.error(String(err)),
    });

    const [creatingTeam, setCreatingTeam] = React.useState(false);

    const createTeamMut = useMutation({
        mutationFn: (body: { name: string; description?: string }) => createTeam(body),
        onSuccess: () => {
            toast.success("Team created");
            qc.invalidateQueries({ queryKey: ["team"] });
            setCreatingTeam(false);
        },
        onError: (err: any) => toast.error(String(err)),
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => deleteTeamMember(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
        onError: (err: any) => toast.error(String(err)),
    });

    const roleMut = useMutation({
        mutationFn: ({ id, role }: any) => updateTeamMember(id, role),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
        onError: (err: any) => toast.error(String(err)),
    });

    const form = useForm<{ email: string; role?: string }>({ defaultValues: { email: "", role: "member" } });
    const teamForm = useForm<{ name: string; description?: string; organizationId?: string }>({ defaultValues: { name: "", description: "", organizationId: "" } });

    const { data: orgs = [] } = useQuery<any[]>({ queryKey: ["organization"], queryFn: () => getOrganization() });

    // When orgs load, default the organizationId to the first org if not set
    React.useEffect(() => {
        if (orgs && orgs.length > 0) {
            const current = teamForm.getValues("organizationId");
            if (!current) teamForm.setValue("organizationId", orgs[0].id);
        }
    }, [orgs]);

    const [inviteForTeam, setInviteForTeam] = React.useState<string | null>(null);
    const [inviteEmail, setInviteEmail] = React.useState("");
    const [inviteRole, setInviteRole] = React.useState("member");

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Teams</CardTitle>
                    <CardDescription>Loading team members...</CardDescription>
                </CardHeader>
                <CardContent />
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Teams</CardTitle>
                <CardDescription>Manage team members and invites</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="grid gap-2">
                        {team.length === 0 ? (
                            <div className="text-sm text-muted-foreground">No team members</div>
                        ) : (
                            <div className="space-y-4">
                                {/* Detect whether `team` is actually a list of teams (each with users/members) */}
                                {team[0] && (team[0].users || team[0].members) ? (
                                    team.map((t: any) => {
                                        const members = t.users || t.members || [];
                                        return (
                                            <div key={t.id} className="border rounded p-3 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="font-medium">{t.name ?? t.id}</div>
                                                        {t.description && <div className="text-sm text-muted-foreground">{t.description}</div>}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button size="sm" onClick={() => { setInviteForTeam(t.id); setInviteEmail(""); setInviteRole("member"); }}>
                                                            Add Member
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    {members.length === 0 ? (
                                                        <div className="text-sm text-muted-foreground">No members</div>
                                                    ) : (
                                                        members.map((m: any) => (
                                                            <div key={m.id} className="flex items-center justify-between">
                                                                <div>
                                                                    <div className="font-medium">{m.name ?? m.email}</div>
                                                                    <div className="text-sm text-muted-foreground">{m.email}</div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <select
                                                                        value={m.role}
                                                                        onChange={(e) => roleMut.mutate({ id: m.id, role: e.target.value })}
                                                                        className="border rounded px-2 py-1"
                                                                    >
                                                                        <option value="owner">Owner</option>
                                                                        <option value="admin">Admin</option>
                                                                        <option value="member">Member</option>
                                                                    </select>
                                                                    <Button variant="destructive" size="sm" onClick={() => deleteMut.mutate(m.id)}>
                                                                        Remove
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>

                                                {inviteForTeam === t.id && (
                                                    <div className="pt-2">
                                                        <div className="grid sm:grid-cols-3 gap-2 items-end">
                                                            <div className="sm:col-span-2">
                                                                <Label htmlFor={`invite-email-${t.id}`}>Invite by email</Label>
                                                                <Input id={`invite-email-${t.id}`} value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="border rounded px-2 py-1">
                                                                    <option value="owner">Owner</option>
                                                                    <option value="admin">Admin</option>
                                                                    <option value="member">Member</option>
                                                                </select>
                                                                <Button onClick={() => { if (inviteEmail) inviteMut.mutate({ email: inviteEmail, role: inviteRole, teamId: t.id }); setInviteForTeam(null); }}>Send Invite</Button>
                                                                <Button variant="ghost" onClick={() => setInviteForTeam(null)}>Cancel</Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="space-y-2">
                                        {team.map((m: any) => (
                                            <div key={m.id} className="flex items-center justify-between">
                                                <div>
                                                    <div className="font-medium">{m.name ?? m.email}</div>
                                                    <div className="text-sm text-muted-foreground">{m.email}</div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={m.role}
                                                        onChange={(e) => roleMut.mutate({ id: m.id, role: e.target.value })}
                                                        className="border rounded px-2 py-1"
                                                    >
                                                        <option value="owner">Owner</option>
                                                        <option value="admin">Admin</option>
                                                        <option value="member">Member</option>
                                                    </select>
                                                    <Button variant="destructive" size="sm" onClick={() => deleteMut.mutate(m.id)}>
                                                        Remove
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="pt-2 border-t">
                        <div className="mb-4">
                            {creatingTeam ? (
                                <form onSubmit={teamForm.handleSubmit((vals) => createTeamMut.mutate({ ...vals, organizationId: vals.organizationId || "" }))} className="grid gap-2">
                                    <div>
                                        <Label htmlFor="team-org">Organization</Label>
                                        <select id="team-org" className="w-full border rounded px-2 py-1" {...teamForm.register("organizationId", { required: true })}>
                                            {orgs && orgs.length > 0 ? (
                                                orgs.map((o: any) => (
                                                    <option key={o.id} value={o.id}>{o.name || o.id}</option>
                                                ))
                                            ) : (
                                                <option value="">No organizations</option>
                                            )}
                                        </select>
                                    </div>
                                    <div>
                                        <Label htmlFor="team-name">Team Name</Label>
                                        <Input id="team-name" {...teamForm.register("name", { required: true })} />
                                    </div>
                                    <div>
                                        <Label htmlFor="team-desc">Description</Label>
                                        <Input id="team-desc" {...teamForm.register("description")} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button type="submit" disabled={createTeamMut.status === "pending"}>Create Team</Button>
                                        <Button variant="ghost" onClick={() => setCreatingTeam(false)}>Cancel</Button>
                                    </div>
                                </form>
                            ) : (
                                <div>
                                    <div className="text-sm text-muted-foreground">Create a new team for this account.</div>
                                    <div className="pt-2">
                                        <Button onClick={() => setCreatingTeam(true)}>Create Team</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
