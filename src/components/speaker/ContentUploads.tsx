import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, CheckCircle2 } from "lucide-react";

export type ContentItem = {
  id: string;
  file?: File | null;
  preview?: string | null;
  name: string;
  contentType?: string | null;
};

export default function ContentUploads({
  items,
  setItems,
  readOnly,
  showValidation,
}: {
  items: ContentItem[];
  setItems: (items: ContentItem[]) => void;
  readOnly?: boolean;
  showValidation?: boolean;
}) {
  const [touched, setTouched] = React.useState<Set<string>>(new Set());

  const addItem = () => {
    setItems([...items, { id: `content_${Date.now()}`, file: null, preview: null, name: "", contentType: null }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
    setTouched(prev => { const next = new Set(prev); next.delete(id); return next; });
  };

  const onFileChange = (id: string, file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setItems(items.map(i => i.id === id ? { ...i, file, preview: typeof reader.result === "string" ? reader.result : null } : i));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2 pt-2">
      {items.map(item => {
        const hasError = (showValidation || touched.has(item.id)) && !!item.file && !item.name.trim();
        return (
          <div key={item.id}>
            <div className="flex gap-2 items-center">
              <Input
                placeholder="File description"
                value={item.name}
                onChange={(e) => setItems(items.map(it => it.id === item.id ? { ...it, name: e.target.value } : it))}
                onBlur={() => setTouched(prev => new Set(prev).add(item.id))}
                className={`flex-1${hasError ? " border-destructive focus-visible:ring-destructive" : ""}`}
                disabled={readOnly}
              />
              {!readOnly && (
                <>
                  <div>
                    <input id={`content-file-${item.id}`} type="file" className="hidden" onChange={(e) => onFileChange(item.id, e.target.files?.[0])} />
                    <label htmlFor={`content-file-${item.id}`} className="inline-flex items-center h-9 px-3 rounded-md border border-border hover:bg-muted/30 cursor-pointer text-sm">
                      {item.file ? "Replace" : "Choose file"}
                    </label>
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeItem(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
            {item.file && (
              <div className="flex items-center gap-1.5 mt-1 pl-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                <span className="text-xs text-muted-foreground truncate">{item.file.name}</span>
              </div>
            )}
            {hasError && <p className="text-xs text-destructive mt-1">Description is required</p>}
          </div>
        );
      })}
      {!readOnly && (
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-4 w-4 mr-2" /> Add file
        </Button>
      )}
    </div>
  );
}
