import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrganization, createOrganization } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export default function OrganizationSection() {
  const qc = useQueryClient();
  const { data: orgs, isLoading } = useQuery<any[]>({ queryKey: ["organization"], queryFn: () => getOrganization() });
  const [creating, setCreating] = React.useState(false);

  const createMut = useMutation({
    mutationFn: (body: { name: string; domain?: string; description?: string }) => createOrganization(body),
    onSuccess: () => {
      toast.success("Organization created");
      qc.invalidateQueries({ queryKey: ["organization"] });
      setCreating(false);
    },
    onError: (err: any) => toast.error(String(err)),
  });

  const form = useForm<{ name: string; domain?: string; description?: string }>({ defaultValues: { name: "", domain: "", description: "" } });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>Loading organizations...</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Organizations</CardTitle>
        <CardDescription>Organization-level information</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {orgs && orgs.length > 0 && (
            <div className="space-y-4">
              {orgs.map((o) => (
                <div key={o.id} className="space-y-2 border p-3 rounded">
                  <div>
                    <div className="text-sm text-muted-foreground">Name</div>
                    <div className="font-medium">{o.name ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Created At</div>
                    <div className="font-medium">{o.createdAt ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Created By</div>
                    <div className="font-medium">{o.createdBy?.email || o.createdBy?.name || "—"}</div>
                  </div>
                  {o.users && o.users.length > 0 && (
                    <div>
                      <div className="text-sm text-muted-foreground">Members</div>
                      <div className="font-medium">{o.users.map((u: any) => u.email || u.name).join(", ")}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {creating ? (
            <form onSubmit={form.handleSubmit((vals) => createMut.mutate(vals))} className="grid gap-2">
              <div>
                <Label htmlFor="org-name">Name</Label>
                <Input id="org-name" {...form.register("name", { required: true })} />
              </div>
              <div className="flex items-center gap-2">
                <Button type="submit" disabled={createMut.status === "pending"}>Create</Button>
                <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
              </div>
            </form>
          ) : (
            <div>
              <div className="text-sm text-muted-foreground">
                {orgs && orgs.length > 0 ? "You can create additional organizations for your account." : "No organization found for your account."}
              </div>
              <div className="pt-2">
                <Button onClick={() => setCreating(true)}>Create Organization</Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
