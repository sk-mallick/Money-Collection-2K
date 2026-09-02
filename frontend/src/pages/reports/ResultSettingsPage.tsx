import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  fetchSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  type Subject,
} from '@/lib/reports-api';
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  SlidersHorizontal,
  Info,
  Layers,
} from 'lucide-react';

export default function ResultSettingsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);

  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<'Junior' | 'Senior' | 'Both'>('Both');
  const [formOrder, setFormOrder] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const loadSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSubjects();
      setSubjects(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load subjects';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  const handleOpenCreate = () => {
    setEditingSubject(null);
    setFormName('');
    setFormCategory('Both');
    setFormOrder(subjects.length + 1);
    setDialogOpen(true);
  };

  const handleOpenEdit = (sub: Subject) => {
    setEditingSubject(sub);
    setFormName(sub.name);
    setFormCategory(sub.category);
    setFormOrder(sub.display_order);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Subject name is required');
      return;
    }

    setSaving(true);
    try {
      if (editingSubject) {
        await updateSubject(editingSubject.id, {
          name: formName.trim(),
          category: formCategory,
          displayOrder: formOrder,
        });
        toast.success('Subject updated successfully');
      } else {
        await createSubject({
          name: formName.trim(),
          category: formCategory,
          displayOrder: formOrder,
        });
        toast.success('Subject created successfully');
      }
      setDialogOpen(false);
      loadSubjects();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save subject';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSubject(deleteTarget.id);
      toast.success('Subject deactivated successfully');
      setDeleteTarget(null);
      loadSubjects();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to deactivate';
      toast.error(msg);
    }
  };

  const handleToggleActive = async (sub: Subject) => {
    try {
      await updateSubject(sub.id, { isActive: !sub.is_active });
      toast.success(`Subject marked as ${!sub.is_active ? 'Active' : 'Inactive'}`);
      loadSubjects();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update';
      toast.error(msg);
    }
  };

  const juniorSubjects = subjects.filter(
    (s) => s.is_active && (s.category === 'Junior' || s.category === 'Both')
  );
  const seniorSubjects = subjects.filter(
    (s) => s.is_active && (s.category === 'Senior' || s.category === 'Both')
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Report Card & Subject Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure examination subject structures and category patterns
          </p>
        </div>

        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Subject
        </Button>
      </div>

      {/* Overview Cards: Junior vs Senior Structures */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Junior Structure */}
        <Card className="border-emerald-500/20 bg-emerald-500/[0.02]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-500" />
                Junior Subject Structure
              </CardTitle>
              <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                Junior
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Includes Olympiad. Does not include Literature.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {juniorSubjects.map((s) => (
                <Badge key={s.id} variant="secondary" className="px-2.5 py-1 text-xs">
                  {s.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Senior Structure */}
        <Card className="border-indigo-500/20 bg-indigo-500/[0.02]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-500" />
                Senior Subject Structure
              </CardTitle>
              <Badge variant="outline" className="text-xs border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
                Senior
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Includes Literature. Does not include Olympiad.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {seniorSubjects.map((s) => (
                <Badge key={s.id} variant="secondary" className="px-2.5 py-1 text-xs">
                  {s.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Master Subjects Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Configured Subjects List
          </CardTitle>
          <CardDescription className="text-xs">
            Manage all subjects and their applicability across student categories
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="p-3 font-semibold text-muted-foreground w-16 text-center">Order</th>
                    <th className="p-3 font-semibold text-muted-foreground">Subject Name</th>
                    <th className="p-3 font-semibold text-muted-foreground">Category Applicable</th>
                    <th className="p-3 font-semibold text-muted-foreground text-center">Status</th>
                    <th className="p-3 font-semibold text-muted-foreground text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {subjects.map((sub) => (
                    <tr key={sub.id} className="hover:bg-accent/40 transition-colors">
                      <td className="p-3 text-center font-mono font-medium text-muted-foreground">
                        {sub.display_order}
                      </td>
                      <td className="p-3 font-bold text-foreground">{sub.name}</td>
                      <td className="p-3">
                        <Badge
                          variant={
                            sub.category === 'Junior'
                              ? 'secondary'
                              : sub.category === 'Senior'
                              ? 'default'
                              : 'outline'
                          }
                          className="text-[11px]"
                        >
                          {sub.category}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(sub)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                            sub.is_active
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {sub.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="p-3 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(sub)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(sub)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSubject ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
            <DialogDescription>
              Define the subject name, category structure, and display sequence.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="sub-name">Subject Name</Label>
              <Input
                id="sub-name"
                placeholder="e.g. Olympiad, Literature, Grammar"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sub-cat">Category</Label>
              <Select
                value={formCategory}
                onValueChange={(val: 'Junior' | 'Senior' | 'Both') => setFormCategory(val)}
              >
                <SelectTrigger id="sub-cat" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Both">Both (Junior & Senior)</SelectItem>
                  <SelectItem value="Junior">Junior Only</SelectItem>
                  <SelectItem value="Senior">Senior Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sub-order">Display Sequence Order</Label>
              <Input
                id="sub-order"
                type="number"
                min={1}
                max={50}
                value={formOrder}
                onChange={(e) => setFormOrder(Number(e.target.value))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving ? 'Saving...' : editingSubject ? 'Update Subject' : 'Create Subject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete / Deactivate Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Deactivate Subject"
        description={
          deleteTarget
            ? `Are you sure you want to deactivate "${deleteTarget.name}"? It will no longer appear in new result periods, but historical records will remain intact.`
            : ''
        }
        actionLabel="Deactivate"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
