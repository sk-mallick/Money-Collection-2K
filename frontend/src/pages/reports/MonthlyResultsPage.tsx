import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { fetchResultPeriods, createResultPeriod, deleteResultPeriod, fetchSubjects, type ResultPeriod, type Subject } from '@/lib/reports-api';
import { fetchGroups, fetchSettings } from '@/lib/api';
import type { Group } from '@/lib/constants';
import { MONTH_NAMES, MONTH_CODES } from '@/lib/constants';
import { Plus, Trash2, Pencil, Eye, ClipboardList } from 'lucide-react';

export default function MonthlyResultsPage() {
  const navigate = useNavigate();
  const [periods, setPeriods] = useState<ResultPeriod[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ResultPeriod | null>(null);
  const [creating, setCreating] = useState(false);

  // Create form state
  const [formYear, setFormYear] = useState('');
  const [formMonth, setFormMonth] = useState('');
  const [formGroupId, setFormGroupId] = useState('');
  const [formMaxMarks, setFormMaxMarks] = useState<Record<number, number>>({});
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const selectedGroup = groups.find(g => g.id === formGroupId);
  const formCategory = selectedGroup?.category || 'Senior';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsData, groupsData] = await Promise.all([fetchSettings(), fetchGroups()]);
      const ay = settingsData.academicYear || '2026-27';
      setAcademicYear(ay);
      setFormYear(ay);
      setGroups(groupsData);

      const periodsData = await fetchResultPeriods({ academic_year: ay });
      setPeriods(periodsData);
    } catch (err) {
      console.error('Failed to load:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load subjects when category changes
  useEffect(() => {
    if (formGroupId && formCategory) {
      fetchSubjects(formCategory).then(subs => {
        setSubjects(subs);
        // Set default max marks
        const defaults: Record<number, number> = {};
        subs.forEach(s => {
          defaults[s.id] = s.name === 'Literature' || s.name === 'Olympiad' ? 30 : 20;
        });
        setFormMaxMarks(defaults);
      });
    }
  }, [formGroupId, formCategory]);

  const handleCreate = async () => {
    if (!formYear || !formMonth || !formGroupId) {
      toast.error('Please fill all required fields');
      return;
    }

    setCreating(true);
    try {
      const defaultMaxMarks = Object.entries(formMaxMarks).map(([subjectId, maxMarks]) => ({
        subjectId: Number(subjectId),
        maxMarks,
      }));

      const result = await createResultPeriod({
        academicYear: formYear,
        month: formMonth,
        groupId: formGroupId,
        category: formCategory,
        defaultMaxMarks,
      });

      toast.success(`Result period created with ${result.studentCount} students`);
      setCreateOpen(false);
      setFormMonth('');
      setFormGroupId('');
      load();

      // Navigate to marks entry
      navigate(`/reports/monthly/${result.id}/marks`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteResultPeriod(deleteTarget.id);
      toast.success('Result period deleted');
      setDeleteTarget(null);
      load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete';
      toast.error(message);
    }
  };

  // Generate academic year options
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = currentYear - 2 + i;
    return `${y}-${String(y + 1).slice(-2)}`;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Monthly Results</h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage monthly examination results</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Result
        </Button>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={academicYear} onValueChange={(val) => { setAcademicYear(val); fetchResultPeriods({ academic_year: val }).then(setPeriods); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Academic Year" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Results List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : periods.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-base font-medium mb-1">No result periods yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first monthly result to start managing student marks</p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Result
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {periods.map(period => (
            <Card key={period.id} className="hover:bg-accent/30 transition-colors">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">
                      {MONTH_NAMES[period.month] || period.month} {period.academic_year}
                    </span>
                    <Badge variant={period.status === 'Published' ? 'default' : period.status === 'Completed' ? 'secondary' : 'outline'} className="text-[10px]">
                      {period.status}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{period.category}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Group {period.group_id}{period.group_class ? ` — ${period.group_class}` : ''}
                    {period.group_timing ? ` · ${period.group_timing}` : ''}
                    {' · '}{period.student_count || 0} students
                    {Number(period.absent_count) > 0 ? ` · ${period.absent_count} absent` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/reports/monthly/${period.id}/marks`)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    <span className="hidden sm:inline">Marks</span>
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(period)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Monthly Result</DialogTitle>
            <DialogDescription>Select the academic year, month, and group to create a new result period</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Academic Year */}
            <div className="space-y-1.5">
              <Label htmlFor="create-year">Academic Year</Label>
              <Select value={formYear} onValueChange={setFormYear}>
                <SelectTrigger id="create-year" className="w-full">
                  <SelectValue placeholder="Select academic year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Month */}
            <div className="space-y-1.5">
              <Label htmlFor="create-month">Month</Label>
              <Select value={formMonth} onValueChange={setFormMonth}>
                <SelectTrigger id="create-month" className="w-full">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_CODES.map(m => <SelectItem key={m} value={m}>{MONTH_NAMES[m]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Group */}
            <div className="space-y-1.5">
              <Label htmlFor="create-group">Group / Batch</Label>
              <Select value={formGroupId} onValueChange={setFormGroupId} disabled={groups.length === 0}>
                <SelectTrigger id="create-group" className="w-full">
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map(g => (
                    <SelectItem key={g.id} value={g.id}>
                      Group {g.id} — {g.class} ({g.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category & Info */}
            {formGroupId && (
              <div className="rounded-lg border p-3.5 bg-muted/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Category:</span>
                  <Badge variant="outline" className="font-semibold">{formCategory}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Subjects will be loaded automatically. You can enter and adjust maximum marks individually for each student directly inside the marks entry screen.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !formYear || !formMonth || !formGroupId}>
              {creating ? 'Creating...' : 'Create & Enter Marks'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Result Period"
        description={deleteTarget ? `This will permanently delete the result for ${MONTH_NAMES[deleteTarget.month] || deleteTarget.month} ${deleteTarget.academic_year} (Group ${deleteTarget.group_id}), including all student marks and rankings. This action cannot be undone.` : ''}
        actionLabel="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
