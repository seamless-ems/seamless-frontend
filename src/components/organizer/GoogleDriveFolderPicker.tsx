import { useState, useMemo, useRef, useEffect } from "react";
import { 
    ChevronRight, 
    FolderPlus, 
    Folder, 
    ChevronLeft, 
    X, 
    Loader2, 
    Plus,
    FolderOpen
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { createGoogleDriveFolder } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
    driveFolders: any[];
    setDriveFolders: (f: any[]) => void;
    selectedFolderPath: string[]; // Array of IDs representing the path
    setSelectedFolderPath: (p: string[]) => void;
    formData: any;
    setFormData: (f: any) => void;
};

export default function GoogleDriveFolderPicker({
    driveFolders,
    setDriveFolders,
    selectedFolderPath,
    setSelectedFolderPath,
    formData,
    setFormData,
}: Props) {
    const [newFolderName, setNewFolderName] = useState<string>("");
    const [creatingFolder, setCreatingFolder] = useState<boolean>(false);
    const [isAdding, setIsAdding] = useState<boolean>(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input automatically when the "New Folder" mode is toggled on
    useEffect(() => {
        if (isAdding) {
            inputRef.current?.focus();
        }
    }, [isAdding]);

    // Helper to find folder by ID
    const findFolderById = (folders: any[], id: string): any | null => {
        for (const f of folders) {
            if (f.id === id) return f;
            if (f.children?.length) {
                const res = findFolderById(f.children, id);
                if (res) return res;
            }
        }
        return null;
    };

    // Calculate current viewable folders based on the path
    const currentFolders = useMemo(() => {
        if (selectedFolderPath.length === 0) return driveFolders;
        const lastId = selectedFolderPath[selectedFolderPath.length - 1];
        const folder = findFolderById(driveFolders, lastId);
        return folder?.children || [];
    }, [driveFolders, selectedFolderPath]);

    // Add a folder into the nested folders tree
    const addFolderToTree = (folders: any[], parentId: string | null, folderToAdd: any): any[] => {
        if (!parentId) {
            return [folderToAdd, ...folders];
        }

        let changed = false;
        const walk = (items: any[]): any[] => {
            return items.map((it: any) => {
                if (it.id === parentId) {
                    changed = true;
                    const children = it.children ? [folderToAdd, ...it.children] : [folderToAdd];
                    return { ...it, children };
                }
                if (it.children && it.children.length) {
                    const updated = walk(it.children);
                    if (updated !== it.children) {
                        changed = true;
                        return { ...it, children: updated };
                    }
                }
                return it;
            });
        };

        const result = walk(folders);
        return changed ? result : folders;
    };

    const handleNavigate = (folderId: string) => {
        const newPath = [...selectedFolderPath, folderId];
        setSelectedFolderPath(newPath);
        setFormData((f: any) => ({ ...f, rootFolder: folderId }));
        setIsAdding(false); // Close input if navigating
    };

    const jumpToBreadcrumb = (index: number) => {
        const newPath = selectedFolderPath.slice(0, index + 1);
        setSelectedFolderPath(newPath);
        const lastId = newPath[newPath.length - 1];
        setFormData((f: any) => ({ ...f, rootFolder: lastId }));
        setIsAdding(false);
    };

    const handleBack = () => {
        const newPath = selectedFolderPath.slice(0, -1);
        setSelectedFolderPath(newPath);
        const lastId = newPath.length > 0 ? newPath[newPath.length - 1] : "";
        setFormData((f: any) => ({ ...f, rootFolder: lastId }));
        setIsAdding(false);
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) {
            setIsAdding(false);
            return;
        }
        setCreatingFolder(true);
        try {
            const parentId = selectedFolderPath[selectedFolderPath.length - 1] || null;
            const res = await createGoogleDriveFolder({ 
                folder_name: newFolderName.trim(), 
                parent_folder_id: parentId 
            });
            const newFolder = res?.folder ?? res;

            setDriveFolders((prev) => addFolderToTree(prev, parentId, newFolder));
            setNewFolderName("");
            setIsAdding(false);
            toast({ title: "Success", description: `Created ${newFolder.name}` });
        } catch (err) {
            toast({ title: "Error", variant: "destructive", description: "Could not create folder" });
        } finally {
            setCreatingFolder(false);
        }
    };

    return (
        <div className="space-y-3 border rounded-lg p-4 bg-card text-card-foreground shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <Label className="text-base font-semibold">Event Folder</Label>
                    <p className="text-xs text-muted-foreground leading-none">Select or create a storage location</p>
                </div>
                <div className="flex items-center gap-1">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className={cn("h-8 px-2 transition-all", isAdding && "bg-primary text-primary-foreground hover:bg-primary/90")}
                        onClick={() => setIsAdding(!isAdding)}
                    >
                        {isAdding ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                        {isAdding ? "Cancel" : "New Folder"}
                    </Button>
                    
                    {selectedFolderPath.length > 0 && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-xs"
                            onClick={() => { 
                                setSelectedFolderPath([]); 
                                setFormData((f:any) => ({...f, rootFolder: ""}));
                                setIsAdding(false);
                            }}
                        >
                            Reset
                        </Button>
                    )}
                </div>
            </div>

            {/* Breadcrumbs */}
            <nav className="flex items-center flex-wrap gap-1 text-[11px] font-medium text-muted-foreground bg-muted/40 p-2 rounded-md border border-border/50">
                <button 
                    onClick={() => setSelectedFolderPath([])}
                    className={cn("hover:text-primary transition-colors uppercase tracking-wider", selectedFolderPath.length === 0 && "text-primary font-bold")}
                >
                    My Drive
                </button>
                {selectedFolderPath.map((id, idx) => (
                    <div key={id} className="flex items-center gap-1">
                        <ChevronRight className="h-3 w-3 opacity-50" />
                        <button 
                            onClick={() => jumpToBreadcrumb(idx)}
                            className={cn("hover:text-primary transition-colors truncate max-w-[120px]", idx === selectedFolderPath.length - 1 && "text-primary font-bold")}
                        >
                            {findFolderById(driveFolders, id)?.name || "..."}
                        </button>
                    </div>
                ))}
            </nav>

            {/* Folder List Area */}
            <ScrollArea className="h-[240px] border rounded-md bg-background">
                <div className="p-1 space-y-0.5">
                    {/* Inline Creation Input */}
                    {isAdding && (
                        <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-sm mb-1 animate-in fade-in slide-in-from-top-1">
                            <FolderPlus className="h-4 w-4 text-primary shrink-0" />
                            <Input
                                ref={inputRef}
                                placeholder="Name your folder..."
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                className="h-8 text-sm"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreateFolder();
                                    if (e.key === 'Escape') setIsAdding(false);
                                }}
                            />
                            <Button 
                                size="sm" 
                                className="h-8" 
                                onClick={handleCreateFolder}
                                disabled={creatingFolder || !newFolderName.trim()}
                            >
                                {creatingFolder ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create"}
                            </Button>
                        </div>
                    )}

                    {selectedFolderPath.length > 0 && !isAdding && (
                        <button
                            onClick={handleBack}
                            className="flex items-center w-full gap-2 p-2 text-xs hover:bg-muted rounded-sm transition-colors text-muted-foreground font-medium"
                        >
                            <ChevronLeft className="h-3 w-3" /> ... Back to Parent
                        </button>
                    )}
                    
                    {currentFolders.length === 0 && !isAdding ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center opacity-60">
                            <FolderOpen className="h-10 w-10 mb-2 stroke-[1.5px]" />
                            <p className="text-sm">This folder is empty</p>
                            <Button variant="link" size="sm" className="mt-1" onClick={() => setIsAdding(true)}>
                                Create a subfolder
                            </Button>
                        </div>
                    ) : (
                        currentFolders.map((folder: any) => (
                            <button
                                key={folder.id}
                                onClick={() => handleNavigate(folder.id)}
                                className="flex items-center justify-between w-full p-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm group transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <Folder className="h-4 w-4 text-blue-500 fill-blue-500/10" />
                                    <span className="truncate">{folder.name}</span>
                                </div>
                                <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}