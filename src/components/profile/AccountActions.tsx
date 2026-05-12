import { motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';
import { LogOut, Download, Trash2, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';

export default function AccountActions() {
  const { profile, setStage } = useApp();
  const { user, signOut } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const [{ data: sessions }, { data: messages }, { data: emotions }] = await Promise.all([
        supabase.from('sessions').select('*').eq('user_id', user.id),
        supabase.from('chat_messages').select('*').eq('user_id', user.id),
        supabase.from('emotion_analyses').select('*').eq('user_id', user.id),
      ]);
      const payload = { exportedAt: new Date().toISOString(), profile, sessions, messages, emotions };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `mind-sentinel-export-${Date.now()}.json`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const resetPassword = async () => {
    if (!user?.email) {
      toast.error('No email on this account');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/`,
    });
    if (error) toast.error('Could not send reset email');
    else toast.success('Reset email sent');
  };

  const deleteAllData = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await Promise.all([
        supabase.from('chat_messages').delete().eq('user_id', user.id),
        supabase.from('emotion_analyses').delete().eq('user_id', user.id),
        supabase.from('session_memories').delete().eq('user_id', user.id),
        supabase.from('messages').delete().eq('user_id', user.id),
        supabase.from('mood_entries').delete().eq('user_id', user.id),
      ]);
      await supabase.from('sessions').delete().eq('user_id', user.id);
      toast.success('All your data has been removed');
    } catch {
      toast.error('Could not delete data');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6">
      <h3 className="text-xs font-ui tracking-[0.25em] text-muted-foreground uppercase mb-5">Account & Privacy</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ActionButton icon={KeyRound} label="Reset password" onClick={resetPassword} />
        <ActionButton icon={Download} label={exporting ? 'Exporting…' : 'Export my data'} onClick={exportData} disabled={exporting} />
        <ActionButton
          icon={LogOut}
          label="Sign out"
          onClick={async () => { await signOut(); setStage('login'); }}
        />
        <ActionButton
          icon={Trash2}
          label="Delete all my data"
          danger
          onClick={() => setConfirmDelete(true)}
        />
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="glass-strong border-destructive/30">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all your data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove your sessions, messages, and emotional history. Your account itself will remain. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); deleteAllData(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

function ActionButton({
  icon: Icon, label, onClick, danger, disabled,
}: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-sm font-ui disabled:opacity-50 ${
        danger
          ? 'border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive/60'
          : 'border-border/30 text-foreground hover:border-primary/40 hover:bg-primary/5'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </motion.button>
  );
}
