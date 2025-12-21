import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "./ui/textarea";

type Values = {
    firstName?: string;
    lastName?: string;
    email?: string;
    companyName?: string;
    companyRole?: string;
    linkedin?: string;
    bio?: string;
};

type Props = {
    initialValues?: Values;
    onSubmit: (values: Values) => Promise<void> | void;
    onCancel?: () => void;
    submitLabel?: string;
    submitting?: boolean;
};

export default function SpeakerForm({ initialValues = {}, onSubmit, onCancel, submitLabel = "Save", submitting = false }: Props) {
    const [values, setValues] = useState<Values>({
        firstName: "",
        lastName: "",
        email: "",
        companyName: "",
        companyRole: "",
        linkedin: "",
        bio: "",
        ...initialValues,
    });

    useEffect(() => {
        setValues((v) => ({ ...v, ...initialValues }));
    }, [initialValues]);

    return (
        <form
            onSubmit={async (e) => {
                e.preventDefault();
                await onSubmit(values);
            }}
            className="space-y-4"
        >
            <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                    <label className="text-sm">First name</label>
                    <Input value={values.firstName ?? ""} onChange={(e) => setValues((s) => ({ ...s, firstName: e.target.value }))} required />
                </div>
                <div className="grid gap-2">
                    <label className="text-sm">Last name</label>
                    <Input value={values.lastName ?? ""} onChange={(e) => setValues((s) => ({ ...s, lastName: e.target.value }))} required />
                </div>
            </div>

            <div className="grid gap-2">
                <label className="text-sm">Email</label>
                <Input type="email" value={values.email ?? ""} onChange={(e) => setValues((s) => ({ ...s, email: e.target.value }))} required />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Company Name" value={values.companyName ?? ""} onChange={(e) => setValues((s) => ({ ...s, companyName: e.target.value }))} />
                <Input placeholder="Company Role" value={values.companyRole ?? ""} onChange={(e) => setValues((s) => ({ ...s, companyRole: e.target.value }))} />
                <Input placeholder="LinkedIn URL" value={values.linkedin ?? ""} onChange={(e) => setValues((s) => ({ ...s, linkedin: e.target.value }))} />
            </div>
            <div className="grid gap-2">
                <label className="text-sm">Bio</label>
                <Textarea value={values.bio ?? ""} onChange={(e) => setValues((s) => ({ ...s, bio: e.target.value }))} />
            </div>

            <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={submitting}>{submitting ? `${submitLabel}` : submitLabel}</Button>
            </div>
        </form>
    );
}
