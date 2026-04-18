import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
}: {
  items: ContentItem[];
  setItems: (items: ContentItem[]) => void;
  readOnly?: boolean;
}) {
  const addItem = () => {
    setItems([...items, { id: `content_${Date.now()}`, file: null, preview: null, name: "", contentType: null }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.html,.zip,.mp3,.wma,.mpg,.flv,.avi,.jpg,.jpeg,.png,.gif";

  const onFileChange = (id: string, file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const updated = items.map(i => i.id === id ? { ...i, file, name: i.name || file.name, preview: typeof reader.result === 'string' ? reader.result : null } : i);
      // Auto-add an empty row so the speaker can easily attach another file
      const hasEmpty = updated.some(i => !i.file);
      setItems(hasEmpty ? updated : [...updated, { id: `content_${Date.now()}`, file: null, preview: null, name: "", contentType: null }]);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2 pt-2">
      {items.map(item => (
        <div key={item.id} className="flex gap-2 items-center">
          <Input
            placeholder="File description"
            value={item.name}
            onChange={(e) => setItems(items.map(it => it.id === item.id ? { ...it, name: e.target.value } : it))}
            className="flex-1"
            disabled={readOnly}
          />
          {!readOnly && (
            <>
              <div>
                <input id={`content-file-${item.id}`} type="file" accept={ACCEPT} className="hidden" onChange={(e) => onFileChange(item.id, e.target.files?.[0])} />
                <label htmlFor={`content-file-${item.id}`} className="inline-flex items-center h-9 px-3 rounded-md border border-border hover:bg-muted/30 cursor-pointer text-sm">
                  {item.file ? 'Replace' : 'Choose file'}
                </label>
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeItem(item.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      ))}
      {!readOnly && (
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-4 w-4 mr-2" /> Add file
        </Button>
      )}
    </div>
  );
}
