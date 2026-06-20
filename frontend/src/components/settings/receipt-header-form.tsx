import { Settings as SettingsIcon, Loader2, Save, Building, MapPin, Phone, Calendar, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface ReceiptHeaderFormProps {
  form: {
    instituteName: string;
    address: string;
    phone1: string;
    phone2: string;
    academicYear: string;
    adminName: string;
  };
  saving: boolean;
  updateField: (field: string, value: string) => void;
  handleSave: () => Promise<void>;
}

export function ReceiptHeaderForm({
  form,
  saving,
  updateField,
  handleSave,
}: ReceiptHeaderFormProps) {
  return (
    <Card className="border border-border bg-card/45 backdrop-blur-md overflow-hidden flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500/15 to-blue-500/15 dark:from-indigo-400/20 dark:to-blue-400/20">
            <SettingsIcon className="size-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          Receipt Header Information
        </CardTitle>
        <CardDescription className="text-xs">
          This information appears at the top of every generated receipt and PDF download
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Institute Name */}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="instituteName" className="text-xs font-bold text-muted-foreground/80">
              Institute Name
            </Label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
              <Input
                id="instituteName"
                placeholder="e.g. ABC Coaching Centre"
                value={form.instituteName}
                onChange={e => updateField('instituteName', e.target.value)}
                className="pl-9 h-10 bg-background/50 focus:bg-background/90 transition-colors font-medium border-border"
              />
            </div>
          </div>

          {/* Academic Year */}
          <div className="space-y-2 sm:col-span-1">
            <Label htmlFor="academicYear" className="text-xs font-bold text-muted-foreground/80">
              Academic Year
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
              <Input
                id="academicYear"
                placeholder="e.g. 2026-27"
                value={form.academicYear}
                onChange={e => updateField('academicYear', e.target.value)}
                className="pl-9 h-10 bg-background/50 focus:bg-background/90 transition-colors font-medium border-border"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address" className="text-xs font-bold text-muted-foreground/80">
              Address
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
              <Input
                id="address"
                placeholder="e.g. 123 Main Street, City"
                value={form.address}
                onChange={e => updateField('address', e.target.value)}
                className="pl-9 h-10 bg-background/50 focus:bg-background/90 transition-colors font-medium border-border"
              />
            </div>
          </div>

          {/* Admin Name */}
          <div className="space-y-2 sm:col-span-1">
            <Label htmlFor="adminName" className="text-xs font-bold text-muted-foreground/80">
              Admin Name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
              <Input
                id="adminName"
                placeholder="Name shown on receipts"
                value={form.adminName}
                onChange={e => updateField('adminName', e.target.value)}
                className="pl-9 h-10 bg-background/50 focus:bg-background/90 transition-colors font-medium border-border"
              />
            </div>
          </div>

          {/* Phone 1 */}
          <div className="space-y-2 sm:col-span-1">
            <Label htmlFor="phone1" className="text-xs font-bold text-muted-foreground/80">
              Phone 1
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
              <Input
                id="phone1"
                type="tel"
                placeholder="Primary phone number"
                value={form.phone1}
                onChange={e => updateField('phone1', e.target.value)}
                className="pl-9 h-10 bg-background/50 focus:bg-background/90 transition-colors font-medium border-border"
              />
            </div>
          </div>

          {/* Phone 2 */}
          <div className="space-y-2 sm:col-span-1">
            <Label htmlFor="phone2" className="text-xs font-bold text-muted-foreground/80">
              Phone 2
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
              <Input
                id="phone2"
                type="tel"
                placeholder="Secondary phone number"
                value={form.phone2}
                onChange={e => updateField('phone2', e.target.value)}
                className="pl-9 h-10 bg-background/50 focus:bg-background/90 transition-colors font-medium border-border"
              />
            </div>
          </div>

          {/* Save Button (Aligned inline under label heights) */}
          <div className="flex items-end sm:col-span-1 pb-[1px]">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-10 gap-2 font-bold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white border-none shadow-md transition-all duration-300"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save Settings
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
