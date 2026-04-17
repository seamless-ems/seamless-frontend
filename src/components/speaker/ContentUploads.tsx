import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  const onFileChange = (id: string, file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setItems(items.map(i => i.id === id ? { ...i, file, preview: typeof reader.result === 'string' ? reader.result : null } : i));
      toast.success("Content ready to submit");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4 pt-2">
      <h3 className="text-sm font-semibold text-foreground">Speaker Content</h3>
      <p className="text-xs text-muted-foreground">Upload slides, videos, or other supporting files. These will be attached as speaker content.</p>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="flex gap-3 items-start">
            <div className="flex-1">
              <Input placeholder="Content name (e.g. Slide deck)" value={item.name} onChange={(e) => setItems(items.map(it => it.id === item.id ? { ...it, name: e.target.value } : it))} />
              <div className="flex gap-2 mt-2">
                <Select onValueChange={(val) => setItems(items.map(it => it.id === item.id ? { ...it, contentType: val } : it))}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder={item.contentType ?? "Select type"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="application/pdf">PDF</SelectItem>
                    <SelectItem value="application/vnd.ms-powerpoint">PowerPoint</SelectItem>
                    <SelectItem value="video/mp4">MP4</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <div>
                  <input id={`content-file-${item.id}`} type="file" className="hidden" onChange={(e) => onFileChange(item.id, e.target.files?.[0])} />
                  <label htmlFor={`content-file-${item.id}`} className="inline-flex items-center h-9 px-3 rounded-md border border-border hover:bg-muted/30 cursor-pointer">
                    {item.file ? 'Replace file' : 'Choose file'}
                  </label>
                </div>
                <div className="ml-auto">
                  <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)} disabled={readOnly}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {item.preview && item.preview.startsWith('data:') && (
                <div className="mt-2">
                  <img src={item.preview} alt={item.name} className="max-w-full max-h-36 object-contain" />
                </div>
              )}
            </div>
          </div>
        ))}

        <div>
          <Button variant="outline" size="sm" onClick={addItem} disabled={readOnly}>
            <Plus className="h-4 w-4 mr-2" /> Add content
          </Button>
        </div>
      </div>
    </div>
  );
}
