import React from 'react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string | null;
  onSave: (name: string) => Promise<void>;
  userId?: string | null;
};

export default function UpdateNameDialog({ open, onOpenChange, initialName, onSave }: Props) {
  const [name, setName] = React.useState(initialName || '');
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    setName('');
  }, [initialName, open]);

  const handleSave = async () => {
    const clean = (name || '').trim();
    if (!clean) return;
    setIsSaving(true);
    try {
      await onSave(clean);
      toast.success('Name saved');
      onOpenChange(false);
    } catch (err) {
      console.error('UpdateNameDialog save failed', err);
      toast.error('Failed to save name — please try again');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    try {
      const key = `seamless-skip-update-name`;
      console.log('Setting skip key in localStorage:', key);
      localStorage.setItem(key, '1');
    } catch (e) {
        console.warn('Failed to set skip key in localStorage', e);
      // ignore
    }
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Welcome — add your name</AlertDialogTitle>
          <AlertDialogDescription>
            Please provide the name you'd like displayed in the app. You can change this later in account settings.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="pt-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display Name" autoFocus />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleSkip}>Skip</AlertDialogCancel>
          <AlertDialogAction onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? 'Saving…' : 'Save'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
