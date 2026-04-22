import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Values = Record<string, any>;

type Props = {
    initialValues?: Values;
    formConfig?: any[];
    onSubmit: (values: Values) => Promise<void> | void;
    onCancel?: () => void;
    submitLabel?: string;
    submitting?: boolean;
};

// Map field IDs to camelCase keys for the values object
const FIELD_KEY_MAPPING: Record<string, string> = {
    first_name: 'firstName',
    last_name: 'lastName',
    email: 'email',
    company_name: 'companyName',
    company_role: 'companyRole',
    bio: 'bio',
    linkedin: 'linkedin',
    talk_topic: 'talkTopic',
    talk_title: 'talkTitle',
    talk_description: 'talkDescription',
};

export default function SpeakerForm({
    initialValues = {},
    formConfig,
    onSubmit,
    onCancel,
    submitLabel = "Save",
    submitting = false
}: Props) {
    const [values, setValues] = useState<Values>({});

    useEffect(() => {
        const initValues: Values = {};
        const enabledFields = formConfig?.filter((f: any) => f.enabled && f.type !== 'file') || [];
        enabledFields.forEach((field: any) => {
            const key = FIELD_KEY_MAPPING[field.id] || field.id;
            initValues[key] = initialValues[key] ?? "";
        });
        setValues(initValues);
    }, [initialValues, formConfig]);

    const renderField = (field: any) => {
        const key = FIELD_KEY_MAPPING[field.id] || field.id;
        const value = values[key] ?? "";
        const label = (
            <label className="text-sm">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
        );

        if (field.type === 'textarea' || field.id === 'bio' || field.id === 'talk_description') {
            return (
                <div key={field.id} className="grid gap-2">
                    {label}
                    <Textarea
                        value={value}
                        onChange={(e) => setValues((s) => ({ ...s, [key]: e.target.value }))}
                        placeholder={field.placeholder}
                        required={field.required}
                        className="min-h-[100px]"
                    />
                </div>
            );
        }

        if ((field.type === 'radio' || field.type === 'checkbox') && Array.isArray(field.options) && field.options.length > 0) {
            return (
                <div key={field.id} className="grid gap-2">
                    {label}
                    <Select value={value} onValueChange={(v) => setValues((s) => ({ ...s, [key]: v }))}>
                        <SelectTrigger>
                            <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                            {field.options.map((opt: string) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            );
        }

        return (
            <div key={field.id} className="grid gap-2">
                {label}
                <Input
                    type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
                    value={value}
                    onChange={(e) => setValues((s) => ({ ...s, [key]: e.target.value }))}
                    placeholder={field.placeholder}
                    required={field.required}
                />
            </div>
        );
    };

    const enabledFields = formConfig?.filter((f: any) => f.enabled && f.type !== 'file') || [];
    const firstNameField = enabledFields.find((f: any) => f.id === 'first_name');
    const lastNameField = enabledFields.find((f: any) => f.id === 'last_name');
    const otherFields = enabledFields.filter((f: any) => f.id !== 'first_name' && f.id !== 'last_name');

    return (
        <form
            onSubmit={async (e) => {
                e.preventDefault();
                await onSubmit(values);
            }}
            className="space-y-4"
        >
            {(firstNameField || lastNameField) && (
                <div className="grid gap-2 sm:grid-cols-2">
                    {firstNameField && renderField(firstNameField)}
                    {lastNameField && renderField(lastNameField)}
                </div>
            )}
            {otherFields.map(renderField)}
            <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={submitting}>{submitLabel}</Button>
            </div>
        </form>
    );
}
