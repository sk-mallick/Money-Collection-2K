import { useState, useEffect, useCallback } from 'react';
import { useSettings } from '@/hooks/useStudents';
import { SettingsPageLoading } from '@/components/loading-skeletons';
import { toast } from 'sonner';
import { api, fetchStudents, fetchPaymentsDirect, fetchReceipts, fetchGroups } from '@/lib/api';
import { formatCurrency } from '@/lib/constants';
import { ReceiptHeaderForm } from '@/components/settings/receipt-header-form';
import { RolloverCard } from '@/components/settings/rollover-card';
import { PricingCard } from '@/components/settings/pricing-card';
import { ChangePasswordCard } from '@/components/settings/change-password-card';

// Fee change preview data
interface FeeChangePreview {
  category: 'Junior' | 'Senior';
  oldFee: number;
  newFee: number;
  affectedCount: number;
  customCount: number;
}

export default function SettingsPage() {
  const { settings, loading, refresh } = useSettings();
  const [form, setForm] = useState({
    instituteName: '',
    address: '',
    phone1: '',
    phone2: '',
    academicYear: '2026-27',
    adminName: 'Admin',
    feeJunior: '1000',
    feeSenior: '1000',
  });
  const [saving, setSaving] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [rollingOver, setRollingOver] = useState(false);
  const [rolloverDialogOpen, setRolloverDialogOpen] = useState(false);

  // Fee change states
  const [feeChangeDialogOpen, setFeeChangeDialogOpen] = useState(false);
  const [feeChangePreviews, setFeeChangePreviews] = useState<FeeChangePreview[]>([]);
  const [feeChangeLoading, setFeeChangeLoading] = useState(false);
  const [applyingFeeChange, setApplyingFeeChange] = useState(false);

  useEffect(() => {
    if (Object.keys(settings).length > 0) {
      const timer = setTimeout(() => {
        setForm({
          instituteName: settings.instituteName || '',
          address: settings.address || '',
          phone1: settings.phone1 || '',
          phone2: settings.phone2 || '',
          academicYear: settings.academicYear || '2026-27',
          adminName: settings.adminName || 'Admin',
          feeJunior: settings.feeJunior || '1000',
          feeSenior: settings.feeSenior || '1000',
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [settings]);

  // Detect if fee values have changed from saved settings
  const hasJuniorFeeChanged = form.feeJunior !== (settings.feeJunior || '1000');
  const hasSeniorFeeChanged = form.feeSenior !== (settings.feeSenior || '1000');
  const hasFeeChanged = hasJuniorFeeChanged || hasSeniorFeeChanged;

  // Build fee change previews before showing dialog
  const prepareFeeChangePreview = useCallback(async () => {
    setFeeChangeLoading(true);
    const previews: FeeChangePreview[] = [];
    try {
      const allStudents = await fetchStudents();

      if (hasJuniorFeeChanged) {
        const oldFee = Number(settings.feeJunior || '1000');
        const newFee = Number(form.feeJunior);
        const categoryStudents = allStudents.filter(s => s.category === 'Junior');
        const affectedCount = categoryStudents.length;
        const customCount = categoryStudents.filter(s => s.feePerMonth !== oldFee).length;
        previews.push({ category: 'Junior', oldFee, newFee, affectedCount, customCount });
      }

      if (hasSeniorFeeChanged) {
        const oldFee = Number(settings.feeSenior || '1000');
        const newFee = Number(form.feeSenior);
        const categoryStudents = allStudents.filter(s => s.category === 'Senior');
        const affectedCount = categoryStudents.length;
        const customCount = categoryStudents.filter(s => s.feePerMonth !== oldFee).length;
        previews.push({ category: 'Senior', oldFee, newFee, affectedCount, customCount });
      }
    } catch (err) {
      console.error('Failed to prepare fee change preview:', err);
    }
    setFeeChangePreviews(previews);
    setFeeChangeLoading(false);
  }, [form.feeJunior, form.feeSenior, settings, hasJuniorFeeChanged, hasSeniorFeeChanged]);

  const handleSave = async () => {
    // If fees changed, show confirmation dialog instead of saving directly
    if (hasFeeChanged) {
      await prepareFeeChangePreview();
      setFeeChangeDialogOpen(true);
      return;
    }

    // No fee change — save normally
    await performSave(false);
  };

  const performSave = async (applyFeeChanges: boolean) => {
    setSaving(true);
    if (applyFeeChanges) {
      setApplyingFeeChange(true);
    }
    try {
      await api.updateSettings(form);

      const totalAffected = feeChangePreviews.reduce((sum, p) => sum + p.affectedCount - p.customCount, 0);
      if (applyFeeChanges && totalAffected > 0) {
        toast.success(`Settings saved! Fee updated for ${totalAffected} student${totalAffected !== 1 ? 's' : ''}.`);
      } else {
        toast.success('Settings saved successfully');
      }

      setFeeChangeDialogOpen(false);
      refresh();
      // Emit data-pulled event to refresh student lists across the app
      window.dispatchEvent(new Event('mcms:data-pulled'));
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
      setApplyingFeeChange(false);
    }
  };

  const handleRollover = async () => {
    if (confirmText !== 'ROLLOVER') return;
    setRollingOver(true);
    try {
      // 0. Export full data backup before rollover
      const backupData = {
        academicYear: form.academicYear,
        backupDate: new Date().toISOString(),
        students: await fetchStudents(),
        payments: await fetchPaymentsDirect('all'),
        receipts: await fetchReceipts(),
        groups: await fetchGroups(),
        settings: settings,
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mcms_backup_${form.academicYear}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // 1. Perform Year Rollover on the Server
      const res = await api.performRollover();
      if (!res.success) {
        throw new Error('Rollover failed on server');
      }

      toast.success(`Successfully rolled over to Academic Year ${res.nextAcademicYear}!`);
      setConfirmText('');
      setRolloverDialogOpen(false);
      refresh();
    } catch (e) {
      const err = e as Error;
      toast.error('Failed to perform year rollover: ' + err.message);
    } finally {
      setRollingOver(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (loading) return <SettingsPageLoading />;

  return (
    <div className="page-enter space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure institute information, fees, and database operations</p>
      </div>

      <div className="space-y-6">
        {/* Receipt Header (Full Width) */}
        <ReceiptHeaderForm form={form} saving={saving} updateField={updateField} handleSave={handleSave} />

        {/* Settings Cards Row (3 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PricingCard
            form={form}
            settings={settings}
            updateField={updateField}
            hasJuniorFeeChanged={hasJuniorFeeChanged}
            hasSeniorFeeChanged={hasSeniorFeeChanged}
            hasFeeChanged={hasFeeChanged}
            saving={saving}
            handleSave={handleSave}
            feeChangePreviews={feeChangePreviews}
            feeChangeDialogOpen={feeChangeDialogOpen}
            setFeeChangeDialogOpen={setFeeChangeDialogOpen}
            feeChangeLoading={feeChangeLoading}
            applyingFeeChange={applyingFeeChange}
            performSave={performSave}
            formatCurrency={formatCurrency}
          />
          <ChangePasswordCard />
          <RolloverCard
            rolloverDialogOpen={rolloverDialogOpen}
            setRolloverDialogOpen={setRolloverDialogOpen}
            confirmText={confirmText}
            setConfirmText={setConfirmText}
            rollingOver={rollingOver}
            handleRollover={handleRollover}
          />
        </div>
      </div>
    </div>
  );
}
