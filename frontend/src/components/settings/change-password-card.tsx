import { useState } from 'react';
import { KeyRound, ShieldCheck, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function ChangePasswordCard() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('All fields are required');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await api.changePassword({ oldPassword, newPassword });
      if (res.success) {
        toast.success('Admin password updated successfully');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(res.message || 'Failed to update password');
      }
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border border-border bg-card/45 backdrop-blur-md overflow-hidden flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-500/15 to-red-500/15 dark:from-rose-400/20 dark:to-red-400/20">
            <KeyRound className="size-4 text-rose-600 dark:text-rose-400" />
          </div>
          Change Admin Password
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          Update your administrator access password. We recommend choosing a strong, unique password.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="old-password" className="text-xs font-bold text-muted-foreground/80">
                Current Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
                <Input
                  id="old-password"
                  type="password"
                  placeholder="Enter current password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  disabled={loading}
                  className="pl-9 h-10 bg-background/50 focus:bg-background/90 transition-colors font-medium border-border"
                  required
                />
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-xs font-bold text-muted-foreground/80">
                New Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Min 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  className="pl-9 h-10 bg-background/50 focus:bg-background/90 transition-colors font-medium border-border"
                  required
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-xs font-bold text-muted-foreground/80">
                Confirm New Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="pl-9 h-10 bg-background/50 focus:bg-background/90 transition-colors font-medium border-border"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="gap-2 font-bold bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white border-none shadow-md transition-all duration-300 w-full sm:w-auto"
            >
              <ShieldCheck className="size-4" />
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
