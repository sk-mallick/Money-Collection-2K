import { IndianRupee, ShieldAlert, ArrowRight, Save, Loader2, CheckCircle, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';

interface FeeChangePreview {
  category: 'Junior' | 'Senior';
  oldFee: number;
  newFee: number;
  affectedCount: number;
  customCount: number;
}

interface PricingCardProps {
  form: {
    feeJunior: string;
    feeSenior: string;
  };
  settings: {
    feeJunior?: string;
    feeSenior?: string;
  };
  updateField: (field: string, value: string) => void;
  hasJuniorFeeChanged: boolean;
  hasSeniorFeeChanged: boolean;
  hasFeeChanged: boolean;
  saving: boolean;
  handleSave: () => Promise<void>;
  feeChangePreviews: FeeChangePreview[];
  feeChangeDialogOpen: boolean;
  setFeeChangeDialogOpen: (open: boolean) => void;
  feeChangeLoading: boolean;
  applyingFeeChange: boolean;
  performSave: (applyFeeChanges: boolean) => Promise<void>;
  formatCurrency: (val: number) => string;
}

export function PricingCard({
  form,
  settings,
  updateField,
  hasJuniorFeeChanged,
  hasSeniorFeeChanged,
  hasFeeChanged,
  saving,
  handleSave,
  feeChangePreviews,
  feeChangeDialogOpen,
  setFeeChangeDialogOpen,
  feeChangeLoading,
  applyingFeeChange,
  performSave,
  formatCurrency,
}: PricingCardProps) {
  return (
    <>
      <Card className="border border-border bg-card/45 backdrop-blur-md overflow-hidden flex flex-col h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-foreground font-bold">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/15 dark:from-emerald-400/20 dark:to-teal-400/20">
              <IndianRupee className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            Default Monthly Fee Pricing
          </CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            Set default monthly fees for Junior and Senior categories. Changing a default will update all students of that category (you can still override this individually when adding or editing a student).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between gap-4">
          {/* Current Defaults Display */}
          <div className="grid grid-cols-1 gap-4">
            {/* Junior Fee Card */}
            <div className="relative rounded-xl border bg-gradient-to-br from-blue-500/5 to-indigo-500/5 dark:from-blue-500/10 dark:to-indigo-500/10 p-3 flex items-center justify-between gap-4 transition-all">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-blue-600 text-white border-none">
                    Junior
                  </span>
                  {hasJuniorFeeChanged && (
                    <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                      <ShieldAlert className="size-2.5" />
                      Changed
                    </span>
                  )}
                </div>
                {hasJuniorFeeChanged && (
                  <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg px-2 py-0.5 mt-0.5">
                    <ArrowRight className="size-3 shrink-0" />
                    <span>
                      <span className="line-through text-muted-foreground">
                        {formatCurrency(Number(settings.feeJunior || '1000'))}
                      </span>
                      <span className="mx-1">→</span>
                      <strong>{formatCurrency(Number(form.feeJunior))}</strong>
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Label htmlFor="feeJunior" className="text-[11px] font-bold text-muted-foreground">
                  Monthly Fee
                </Label>
                <div className="relative w-28">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground/60">₹</span>
                  <Input
                    id="feeJunior"
                    type="number"
                    min="0"
                    placeholder="1000"
                    value={form.feeJunior}
                    onChange={e => updateField('feeJunior', e.target.value)}
                    className="pl-6 text-sm font-bold h-9 bg-background/80 w-full"
                  />
                </div>
              </div>
            </div>

            {/* Senior Fee Card */}
            <div className="relative rounded-xl border bg-gradient-to-br from-rose-500/5 to-orange-500/5 dark:from-rose-500/10 dark:to-orange-500/10 p-3 flex items-center justify-between gap-4 transition-all">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-red-600 text-white border-none">
                    Senior
                  </span>
                  {hasSeniorFeeChanged && (
                    <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                      <ShieldAlert className="size-2.5" />
                      Changed
                    </span>
                  )}
                </div>
                {hasSeniorFeeChanged && (
                  <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg px-2 py-0.5 mt-0.5">
                    <ArrowRight className="size-3 shrink-0" />
                    <span>
                      <span className="line-through text-muted-foreground">
                        {formatCurrency(Number(settings.feeSenior || '1000'))}
                      </span>
                      <span className="mx-1">→</span>
                      <strong>{formatCurrency(Number(form.feeSenior))}</strong>
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Label htmlFor="feeSenior" className="text-[11px] font-bold text-muted-foreground">
                  Monthly Fee
                </Label>
                <div className="relative w-28">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground/60">₹</span>
                  <Input
                    id="feeSenior"
                    type="number"
                    min="0"
                    placeholder="1000"
                    value={form.feeSenior}
                    onChange={e => updateField('feeSenior', e.target.value)}
                    className="pl-6 text-sm font-bold h-9 bg-background/80 w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Save Fee Button */}
          <div className="flex items-center justify-between pt-1">
            {hasFeeChanged && (
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 animate-in fade-in duration-300">
                <ShieldAlert className="size-3.5" />
                Unsaved changes detected
              </span>
            )}
            {!hasFeeChanged && (
              <span className="text-xs text-muted-foreground/60 flex items-center gap-1.5">
                <CheckCircle className="size-3.5" />
                All fees are saved
              </span>
            )}
            <Button
              onClick={handleSave}
              disabled={saving || !hasFeeChanged}
              className={`gap-2 font-bold h-9 transition-all text-xs ${
                hasFeeChanged
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-none shadow-md'
                  : ''
              }`}
              variant={hasFeeChanged ? 'default' : 'outline'}
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {hasFeeChanged ? 'Apply Fee Changes' : 'Fees Saved'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={feeChangeDialogOpen} onOpenChange={setFeeChangeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base font-bold">
              <div className="p-1.5 rounded-lg bg-amber-500/15">
                <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400" />
              </div>
              Confirm Fee Changes
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed pt-1">
              You are about to change the global default fee. Review the impact below before confirming.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {feeChangeLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              feeChangePreviews.map((preview, i) => (
                <div key={i} className="rounded-xl border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white border-none ${
                        preview.category === 'Junior' ? 'bg-blue-600' : 'bg-red-600'
                      }`}
                    >
                      {preview.category}
                    </span>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-bold text-muted-foreground line-through">
                        {formatCurrency(preview.oldFee)}
                      </span>
                      <ArrowRight className="size-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(preview.newFee)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-background border p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Users className="size-3.5 text-emerald-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          Total {preview.category}
                        </span>
                      </div>
                      <span className="text-xl font-extrabold text-foreground">{preview.affectedCount}</span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        student{preview.affectedCount !== 1 ? 's' : ''} will be updated
                      </span>
                    </div>
                    <div className="rounded-lg bg-background border p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <ShieldAlert className="size-3.5 text-amber-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          Custom Fees
                        </span>
                      </div>
                      <span className="text-xl font-extrabold text-foreground">{preview.customCount}</span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        student{preview.customCount !== 1 ? 's' : ''} will also be reset
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="flex gap-2 justify-end pt-1">
            <DialogClose asChild>
              <Button variant="outline" className="text-xs font-bold">
                Cancel
              </Button>
            </DialogClose>
            <Button
              disabled={applyingFeeChange || feeChangeLoading}
              onClick={async () => {
                await performSave(true);
              }}
              className="gap-2 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-none shadow-md"
            >
              {applyingFeeChange ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
              {applyingFeeChange ? 'Applying...' : 'Confirm & Apply Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
