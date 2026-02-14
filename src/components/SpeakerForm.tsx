import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "./ui/textarea";

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
        // Initialize values from formConfig and initialValues
        const initValues: Values = {};

        // Get enabled non-file fields from config
        const enabledFields = formConfig?.filter((f: any) => f.enabled && f.type !== 'file') || [];

        enabledFields.forEach((field: any) => {
            const key = FIELD_KEY_MAPPING[field.id] || field.id;
            initValues[key] = initialValues[key] || "";
        });

        setValues(initValues);
    }, [initialValues, formConfig]);

    const renderField = (field: any) => {
        const key = FIELD_KEY_MAPPING[field.id] || field.id;
        const value = values[key] || "";

        // Determine input type
        const inputType = field.type === 'email' ? 'email' : 'text';

        // Render textarea for bio and textarea type fields
        if (field.type === 'textarea' || field.id === 'bio') {
            return (
                <div key={field.id} className="grid gap-2">
                    <label className="text-sm">
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                    </label>
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

        // Render standard input
        return (
            <div key={field.id} className="grid gap-2">
                <label className="text-sm">
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                </label>
                <Input
                    type={inputType}
                    value={value}
                    onChange={(e) => setValues((s) => ({ ...s, [key]: e.target.value }))}
                    placeholder={field.placeholder}
                    required={field.required}
                />
            </div>
        );
    };

    const enabledFields = formConfig?.filter((f: any) => f.enabled && f.type !== 'file') || [];

    // Group fields: first_name and last_name in same row, rest full width
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
            {/* First and Last Name in same row if both exist */}
            {(firstNameField || lastNameField) && (
                <div className="grid gap-2 sm:grid-cols-2">
                    {firstNameField && renderField(firstNameField)}
                    {lastNameField && renderField(lastNameField)}
                </div>
            )}

            {/* Other fields full width */}
            {otherFields.map(renderField)}

            <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={submitting}>{submitting ? submitLabel : submitLabel}</Button>
            </div>
        </form>
    );
}
