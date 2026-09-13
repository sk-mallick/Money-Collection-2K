import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { Plus, Trash2, Pencil, Eye, ClipboardList, RotateCcw, Search, Filter, X, ChevronDown, Check } from 'lucide-react';

interface CustomDropdownProps {
  value: string;
  placeholder: string;
  options: { label: string; value: string; disabled?: boolean }[];
  onChange: (val: string) => void;
  disabled?: boolean;
  className?: string;
  width?: string;
}

function CustomDropdown({
  value,
  placeholder,
  options,
  onChange,
  disabled = false,
  className = '',
  width = 'w-[135px]',
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className={`relative inline-block ${width} ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`h-9 w-full px-2.5 text-xs rounded-md border flex items-center justify-between gap-1.5 transition-all outline-none select-none ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-muted/40 text-muted-foreground border-border/40'
            : 'bg-card hover:bg-muted/40 cursor-pointer border-input text-foreground focus:ring-1 focus:ring-primary shadow-2xs'
        }`}
      >
        <span className={`truncate font-medium ${selectedOption ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {isOpen && !disabled && (
        <div
          className="absolute left-0 top-full mt-1 z-50 w-full min-w-[130px] bg-popover text-popover-foreground border rounded-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{ maxHeight: '220px' }}
        >
          <div className="overflow-y-auto max-h-[210px] p-1 space-y-0.5 divide-y divide-border/10">
            {options.length === 0 ? (
              <div className="px-2.5 py-2 text-center text-xs text-muted-foreground">
                No options
              </div>
            ) : (
              options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors cursor-pointer flex items-center justify-between ${
                    opt.disabled
                      ? 'opacity-40 cursor-not-allowed text-muted-foreground'
                      : opt.value === value
                      ? 'bg-primary/15 text-primary font-bold'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.value === value && <Check className="h-3 w-3 text-primary shrink-0 ml-1" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MonthlyResultsPage() {
  const navigate = useNavigate();
  const [periods, setPeriods] = useState<ResultPeriod[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
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
        // Do not set default max marks of any subject
        setFormMaxMarks({});
      });
    }
  }, [formGroupId, formCategory]);

  const activeFormYear = formYear || academicYear;

  // Filter available months: only show months that don't already have all groups created
  const availableMonths = useMemo(() => {
    if (groups.length === 0) return MONTH_CODES;
    return MONTH_CODES.filter((m) => {
      const createdCount = periods.filter(
        (p) => p.academic_year === activeFormYear && p.month === m
      ).length;
      return createdCount < groups.length;
    });
  }, [groups, periods, activeFormYear]);

  // Filter available groups for the selected month: only show groups that haven't been created yet for this month
  const availableGroupsForMonth = useMemo(() => {
    if (!formMonth) return groups;
    const createdGroupIds = new Set(
      periods
        .filter((p) => p.academic_year === activeFormYear && p.month === formMonth)
        .map((p) => p.group_id)
    );
    return groups.filter((g) => !createdGroupIds.has(g.id));
  }, [groups, periods, activeFormYear, formMonth]);

  // Auto-reset formMonth if it's no longer in availableMonths
  useEffect(() => {
    if (formMonth && !availableMonths.some((m) => m === formMonth)) {
      setFormMonth('');
      setFormGroupId('');
    }
  }, [formMonth, availableMonths]);

  // Auto-reset formGroupId if it's no longer in availableGroupsForMonth
  useEffect(() => {
    if (formGroupId && !availableGroupsForMonth.some((g) => g.id === formGroupId)) {
      setFormGroupId('');
    }
  }, [formGroupId, availableGroupsForMonth]);

  const formMonthOptions = useMemo(() => {
    return availableMonths.map((m) => ({
      label: MONTH_NAMES[m] || m,
      value: m,
    }));
  }, [availableMonths]);

  const formGroupOptions = useMemo(() => {
    const list = formMonth ? availableGroupsForMonth : groups;
    return list.map((g) => ({
      label: `Group ${g.id}`,
      value: g.id,
    }));
  }, [formMonth, availableGroupsForMonth, groups]);

  const existingPeriod = useMemo(() => {
    if (!formYear || !formMonth || !formGroupId) return null;
    return periods.find(p => p.academic_year === formYear && p.month === formMonth && p.group_id === formGroupId);
  }, [periods, formYear, formMonth, formGroupId]);

  const filteredPeriods = useMemo(() => {
    if (!searchTerm.trim()) return periods;
    const q = searchTerm.toLowerCase().trim();
    return periods.filter(p => {
      const monthName = (MONTH_NAMES[p.month] || p.month).toLowerCase();
      const year = (p.academic_year || '').toLowerCase();
      const group = `group ${p.group_id}`.toLowerCase();
      const groupClass = (p.group_class || '').toLowerCase();
      const category = (p.category || '').toLowerCase();
      const status = (p.status || '').toLowerCase();
      return (
        monthName.includes(q) ||
        year.includes(q) ||
        group.includes(q) ||
        p.group_id.toLowerCase().includes(q) ||
        groupClass.includes(q) ||
        category.includes(q) ||
        status.includes(q)
      );
    });
  }, [periods, searchTerm]);

  const handleYearChange = (val: string) => {
    setAcademicYear(val);
    setFormYear(val);
    fetchResultPeriods({ academic_year: val }).then(setPeriods);
  };

  const handleCreate = async () => {
    if (!formYear || !formMonth || !formGroupId) {
      toast.error('Please fill all required fields');
      return;
    }

    if (existingPeriod) {
      navigate(`/reports/monthly/${existingPeriod.id}/marks`);
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

      toast.success(`Period created with ${result.studentCount} students`);
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
    <div className="page-enter p-3 sm:p-5 lg:p-6 space-y-3.5 sm:space-y-4 w-full">
      {/* Header */}
      <div className="border-b pb-3 sm:pb-3.5">
        <div className="flex flex-row items-center justify-between gap-3 w-full">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground leading-tight">
              Monthly Results
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
              Create and manage monthly examination results
            </p>
          </div>
          
          {/* Mobile / Tablet Create Button (opens dialog) */}
          <Button
            size="sm"
            className="md:hidden h-8 w-8 sm:h-9 sm:w-auto p-0 sm:px-3.5 font-medium gap-1.5 cursor-pointer bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 shrink-0"
            onClick={() => setCreateOpen(true)}
            title="Create Monthly Result"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline text-xs">Create Result</span>
          </Button>
        </div>
      </div>

      {/* Desktop Search & Step-by-Step Creation Toolbar */}
      <div className="hidden md:flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 w-full">
          {/* Search Box (Expands flexibly to available space) */}
          <div className="relative flex-1 min-w-[200px] max-w-sm lg:max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search month, group, class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-7 text-xs h-9 bg-card rounded-md shadow-2xs border"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer transition-colors"
                title="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Inline Step-by-Step Creation Bar (Always displayed with all slots) */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-muted-foreground mr-0.5 flex items-center gap-1 shrink-0">
              <Plus className="h-3.5 w-3.5 text-primary" />
              <span>New Result:</span>
            </span>

            {/* 1. Academic Year */}
            <CustomDropdown
              value={formYear || academicYear}
              placeholder="Academic Year"
              options={yearOptions.map(y => ({ label: y, value: y }))}
              onChange={handleYearChange}
              width="w-[115px] shrink-0"
            />

            {/* 2. Month */}
            <CustomDropdown
              value={formMonth}
              placeholder={availableMonths.length === 0 ? "Months Done" : "Select Month"}
              options={formMonthOptions}
              onChange={setFormMonth}
              disabled={availableMonths.length === 0}
              width="w-[130px] shrink-0"
            />

            {/* 3. Group / Batch */}
            <CustomDropdown
              value={formGroupId}
              placeholder={!formMonth ? "Select Group" : availableGroupsForMonth.length === 0 ? "Groups Done" : "Select Group"}
              options={formGroupOptions}
              onChange={setFormGroupId}
              disabled={!formMonth || availableGroupsForMonth.length === 0}
              width="w-[130px] shrink-0"
            />

            {/* 4. Action Button (Active or Inactive / Disabled state) */}
            {!formGroupId || !formMonth ? (
              <Button
                size="sm"
                disabled
                className="h-9 text-xs px-3.5 gap-1.5 opacity-50 cursor-not-allowed bg-primary/40 text-primary-foreground shadow-xs shrink-0"
                title="Select month and group to proceed"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create & Enter Marks</span>
              </Button>
            ) : existingPeriod ? (
              <Button
                size="sm"
                className="h-9 text-xs px-3.5 gap-1.5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs shrink-0 active:scale-[0.98] transition-all"
                onClick={() => navigate(`/reports/monthly/${existingPeriod.id}/marks`)}
                title="Open existing marks sheet"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Open Marks Sheet</span>
              </Button>
            ) : (
              <Button
                size="sm"
                className="h-9 text-xs px-3.5 gap-1.5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs shrink-0 active:scale-[0.98] transition-all"
                onClick={handleCreate}
                disabled={creating}
                title="Create new result period and enter marks"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{creating ? 'Creating...' : 'Create & Enter Marks'}</span>
              </Button>
            )}

            {/* 5. Reset / Refresh Button (With outline border) */}
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-md bg-card hover:bg-accent border shadow-2xs cursor-pointer shrink-0 transition-all"
              onClick={() => {
                setFormMonth('');
                setFormGroupId('');
              }}
              disabled={!formMonth && !formGroupId}
              title="Reset selection"
            >
              <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Active Search Tag */}
        {searchTerm.trim() !== '' && (
          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-muted/20 border text-xs animate-in fade-in duration-200">
            <span className="text-[11px] font-bold text-muted-foreground mr-1 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" />
              <span>Active:</span>
            </span>

            <Badge
              variant="secondary"
              className="h-6 gap-1 pl-2 pr-1 text-[11px] font-medium bg-primary/10 text-primary border-primary/20"
            >
              <span>Search: "{searchTerm}"</span>
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="rounded-full p-0.5 hover:bg-primary/20 cursor-pointer"
                title="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>

            <Button
              variant="ghost"
              size="xs"
              onClick={() => setSearchTerm('')}
              className="h-6 text-[11px] px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer font-medium"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              <span>Reset</span>
            </Button>

            <span className="text-[11px] text-muted-foreground ml-auto hidden sm:inline">
              Showing <strong className="text-foreground font-bold">{filteredPeriods.length}</strong> of {periods.length} result periods
            </span>
          </div>
        )}
      </div>

      {/* Mobile-Only Search & Filter */}
      <div className="flex md:hidden flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search month, group..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 text-xs h-9 bg-card"
            />
          </div>
          <Select value={academicYear} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[125px] h-9 text-xs bg-card shrink-0">
              <SelectValue placeholder="Academic Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {searchTerm.trim() !== '' && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Showing {filteredPeriods.length} of {periods.length} results</span>
            <Button variant="ghost" size="xs" onClick={() => setSearchTerm('')} className="h-6 text-[11px] text-destructive">
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Results List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : filteredPeriods.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-base font-medium mb-1">
              {searchTerm ? 'No matching result periods' : 'No result periods yet'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm ? 'Try a different search term or clear the filter' : 'Create your first monthly result to start managing student marks'}
            </p>
            {searchTerm ? (
              <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
                Clear Search
              </Button>
            ) : (
              <Button className="md:hidden" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Result
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredPeriods.map(period => (
            <Card key={period.id} className="hover:bg-accent/30 transition-colors shadow-2xs border rounded-xl overflow-hidden">
              <CardContent className="p-3 sm:p-3.5 flex flex-row items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="font-bold text-sm text-foreground">
                      {MONTH_NAMES[period.month] || period.month} {period.academic_year}
                    </span>
                    <Badge variant={period.status === 'Published' ? 'default' : period.status === 'Completed' ? 'secondary' : 'outline'} className="text-[10px] px-1.5 py-0 font-semibold">
                      {period.status}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium">{period.category}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    <span>Group {period.group_id}</span>
                    <span className="hidden sm:inline">
                      {period.group_class ? ` — ${period.group_class}` : ''}
                      {period.group_timing ? ` · ${period.group_timing}` : ''}
                    </span>
                    <span> · {period.student_count || 0} students</span>
                    {Number(period.absent_count) > 0 && (
                      <span className="text-destructive font-medium"> · {period.absent_count} absent</span>
                    )}
                  </div>
                </div>

                {/* Actions (Always on right side) */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2 sm:px-3 text-xs gap-1 cursor-pointer bg-card hover:bg-accent shadow-2xs"
                    onClick={() => navigate(`/reports/monthly/${period.id}/marks`)}
                    title="Open Marks Entry"
                  >
                    <Pencil className="h-3.5 w-3.5 text-primary" />
                    <span className="hidden sm:inline">Marks</span>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                    onClick={() => setDeleteTarget(period)}
                    title="Delete Result Period"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog (Mobile only / fallback) */}
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
              <CustomDropdown
                value={formYear}
                placeholder="Select academic year"
                options={yearOptions.map(y => ({ label: y, value: y }))}
                onChange={setFormYear}
                width="w-full"
              />
            </div>

            {/* Month */}
            <div className="space-y-1.5">
              <Label htmlFor="create-month">Month</Label>
              <CustomDropdown
                value={formMonth}
                placeholder={availableMonths.length === 0 ? "All months completed" : "Select month"}
                options={availableMonths.map(m => ({ label: MONTH_NAMES[m], value: m }))}
                onChange={setFormMonth}
                disabled={availableMonths.length === 0}
                width="w-full"
              />
            </div>

            {/* Group */}
            <div className="space-y-1.5">
              <Label htmlFor="create-group">Group / Batch</Label>
              <CustomDropdown
                value={formGroupId}
                placeholder={!formMonth ? "Select month first" : availableGroupsForMonth.length === 0 ? "All groups done for this month" : "Select group"}
                options={availableGroupsForMonth.map(g => ({ label: `Group ${g.id}`, value: g.id }))}
                onChange={setFormGroupId}
                disabled={!formMonth || availableGroupsForMonth.length === 0}
                width="w-full"
              />
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
