import React, { useEffect, useState } from "react";
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
    onDirtyChange?: (dirty: boolean) => void;
    onValuesChange?: (values: Values) => void;
    submitLabel?: string;
    submitting?: boolean;
    formRef?: React.RefObject<HTMLFormElement>;
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
    onDirtyChange,
    onValuesChange,
    submitLabel = "Save",
    submitting = false,
    formRef,
}: Props) {
    const [values, setValues] = useState<Values>({});

    const markDirty = () => onDirtyChange?.(true);

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

        const update = (newVal: string) => {
            setValues((s) => {
                const next = { ...s, [key]: newVal };
                onValuesChange?.(next);
                return next;
            });
            markDirty();
        };

        if (field.type === 'textarea' || field.id === 'bio' || field.id === 'talk_description') {
            return (
                <div key={field.id} className="grid gap-2">
                    {label}
                    <Textarea
                        value={value}
                        onChange={(e) => update(e.target.value)}
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
                    <Select value={value} onValueChange={update}>
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
                    onChange={(e) => update(e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                />
            </div>
        );
    };

    const enabledFields = formConfig?.filter((f: any) => f.enabled && f.type !== 'file') || [];
    const getField = (id: string) => enabledFields.find((f: any) => f.id === id);

    // Paired rows mirroring the portal info layout
    const PAIRS: [string, string][] = [
        ['first_name', 'last_name'],
        ['company_role', 'company_name'],
        ['email', 'linkedin'],
    ];
    const SOLO_ORDER = ['talk_title', 'talk_topic', 'bio', 'talk_description'];
    const pairedIds = new Set(PAIRS.flat());
    const remainingFields = enabledFields.filter(
        (f: any) => !pairedIds.has(f.id) && !SOLO_ORDER.includes(f.id)
    );

    return (
        <form
            ref={formRef}
            onSubmit={async (e) => {
                e.preventDefault();
                await onSubmit(values);
            }}
            className="space-y-4 pb-2"
        >
            {PAIRS.map(([a, b]) => {
                const fa = getField(a), fb = getField(b);
                if (!fa && !fb) return null;
                if (fa && fb) return (
                    <div key={`${a}-${b}`} className="grid grid-cols-2 gap-4">
                        {renderField(fa)}
                        {renderField(fb)}
                    </div>
                );
                return fa ? renderField(fa) : renderField(fb!);
            })}
            {SOLO_ORDER.map(id => {
                const f = getField(id);
                return f ? renderField(f) : null;
            })}
            {remainingFields.map(renderField)}
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={submitting}>{submitLabel}</Button>
            </div>
        </form>
    );
}
