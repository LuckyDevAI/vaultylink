import { useState } from 'react';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface LegacyResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<boolean>;
}

export default function LegacyResetDialog({ open, onOpenChange, onConfirm }: LegacyResetDialogProps) {
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const changeOpen = (next: boolean) => {
    if (pending) return;
    setConfirmation('');
    setError('');
    onOpenChange(next);
  };

  const confirm = async () => {
    if (confirmation !== 'RESET' || pending) return;
    setPending(true);
    setError('');
    try {
      if (await onConfirm()) {
        setConfirmation('');
        onOpenChange(false);
      } else {
        setError('Reset non riuscito. Verifica la connessione e riprova.');
      }
    } catch {
      setError('Reset non riuscito. Verifica la connessione e riprova.');
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={changeOpen}>
      <AlertDialogContent className="w-[calc(100%-2rem)] rounded-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Resettare il vecchio archivio?</AlertDialogTitle>
          <AlertDialogDescription>
            Tutti i link del vecchio archivio verranno eliminati definitivamente e non potranno essere recuperati. Verrà creato un Vault nuovo e vuoto, senza il vecchio PIN.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form onSubmit={(event) => { event.preventDefault(); void confirm(); }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="legacy-reset-confirmation">Scrivi RESET per confermare</Label>
            <Input id="legacy-reset-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} disabled={pending} />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel disabled={pending}>Annulla</AlertDialogCancel>
            <Button type="submit" variant="destructive" disabled={confirmation !== 'RESET' || pending} className="h-auto min-h-10 whitespace-normal">
              {pending && <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />}
              {pending ? 'Reset in corso...' : 'Resetta e inizia da zero'}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}