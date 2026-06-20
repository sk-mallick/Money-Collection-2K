import { RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';

interface RolloverCardProps {
  rolloverDialogOpen: boolean;
  setRolloverDialogOpen: (open: boolean) => void;
  confirmText: string;
  setConfirmText: (text: string) => void;
  rollingOver: boolean;
  handleRollover: () => Promise<void>;
}

export function RolloverCard({
  rolloverDialogOpen,
  setRolloverDialogOpen,
  confirmText,
  setConfirmText,
  rollingOver,
  handleRollover,
}: RolloverCardProps) {
  return (
    <Card className="border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/5 backdrop-blur-md overflow-hidden flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2.5 text-base font-bold text-amber-600 dark:text-amber-400">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/15 to-orange-500/15 dark:from-amber-400/20 dark:to-orange-400/20">
            <RefreshCw className="size-4 text-amber-600 dark:text-amber-400" />
          </div>
          New Academic Year Rollover
        </CardTitle>
        <CardDescription className="text-xs">
          Transition the system to the next academic year to start a fresh fee collection cycle.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 flex-1 flex flex-col justify-between">
        <div className="text-sm space-y-2 text-muted-foreground">
          <p className="font-semibold text-foreground/80 text-xs">Performing a rollover will:</p>
          <ul className="space-y-1.5 text-xs">
            <li className="flex items-start gap-2 leading-relaxed">
              <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>Reset student fee payment statuses back to <strong>Pending</strong>.</span>
            </li>
            <li className="flex items-start gap-2 leading-relaxed">
              <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>Promote student classes automatically (e.g. &quot;3rd&quot; to &quot;4th&quot;).</span>
            </li>
            <li className="flex items-start gap-2 leading-relaxed">
              <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>Keep registration details and settings intact.</span>
            </li>
          </ul>
          
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Warning:</strong> Download/print all past receipts before rollover. A JSON data backup will download automatically.
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Dialog open={rolloverDialogOpen} onOpenChange={setRolloverDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 font-bold h-9 text-xs bg-amber-600 hover:bg-amber-700 text-white border-none shadow-md transition-all duration-300">
                <RefreshCw className="size-3.5" />
                Start New Year Rollover
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="size-5 text-destructive" />
                  Confirm Year Rollover
                </DialogTitle>
                <DialogDescription className="text-xs leading-relaxed">
                  Are you absolutely sure you want to transition to the next academic year? This will clear all payment history and receipts.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  To prevent accidental rollovers, please type <strong>ROLLOVER</strong> in the box below to confirm:
                </p>
                <Input
                  placeholder="Type ROLLOVER to confirm"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  className="font-bold border-border"
                />
              </div>
              <DialogFooter className="flex gap-2 justify-end">
                <DialogClose asChild>
                  <Button variant="outline" className="text-xs font-semibold">Cancel</Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  disabled={confirmText !== 'ROLLOVER' || rollingOver}
                  onClick={handleRollover}
                  className="text-xs font-bold"
                >
                  {rollingOver ? 'Processing Rollover...' : 'Confirm & Reset Year'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
