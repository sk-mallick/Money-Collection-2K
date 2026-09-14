import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStudents, useGroups } from '@/hooks/useStudents';
import { StudentForm } from '@/components/student-form';
import { StudentsPageLoading } from '@/components/loading-skeletons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ButtonGroup } from '@/components/ui/button-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/constants';
import type { Student } from '@/lib/constants';
import { Plus, Search, Pencil, Trash2, UserRound, IndianRupee, MoreVertical, X, ArrowUpDown, Filter, RotateCcw, Settings } from 'lucide-react';

const CLASSES = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];

export default function StudentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { students, loading, refresh } = useStudents();
  const { groups } = useGroups();

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filter & Sorting state
  const [groupFilter, setGroupFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Synchronize Group filter with URL query parameter
  useEffect(() => {
    const groupVal = searchParams.get('group');
    if (groupVal) {
      setGroupFilter(groupVal);
    } else {
      setGroupFilter('all');
    }
  }, [searchParams]);

  // Dependent Available Groups based on Category & Class filters
  const availableGroups = useMemo(() => {
    return groups.filter((g) => {
      const matchCategory = categoryFilter === 'all' || g.category === categoryFilter;
      const matchClass =
        classFilter === 'all' ||
        (g.class && g.class.toLowerCase().includes(classFilter.toLowerCase())) ||
        students.some((s) => s.group === g.id && s.class === classFilter);
      return matchCategory && matchClass;
    });
  }, [groups, categoryFilter, classFilter, students]);

  // Dependent Available Classes based on Category & Group filters
  const availableClasses = useMemo(() => {
    const matchingStudents = students.filter((s) => {
      const matchCategory = categoryFilter === 'all' || s.category === categoryFilter;
      const matchGroup = groupFilter === 'all' || s.group === groupFilter;
      return matchCategory && matchGroup;
    });

    const classesSet = new Set(matchingStudents.map((s) => s.class).filter(Boolean));

    // Also include classes defined on selected group
    if (groupFilter !== 'all') {
      const grp = groups.find((g) => g.id === groupFilter);
      if (grp && grp.class) {
        grp.class.split('&').forEach((c) => {
          const clean = c.trim();
          if (clean) classesSet.add(clean);
        });
      }
    }

    return Array.from(classesSet).sort((a, b) => {
      const aNum = parseInt(a.match(/\d+/)?.[0] || '0', 10);
      const bNum = parseInt(b.match(/\d+/)?.[0] || '0', 10);
      if (aNum && bNum) return aNum - bNum;
      return a.localeCompare(b);
    });
  }, [students, groups, categoryFilter, groupFilter]);

  // Category change handler with cascading auto-reset
  const handleCategoryChange = (val: string) => {
    setCategoryFilter(val);
    if (val !== 'all') {
      if (groupFilter !== 'all') {
        const grp = groups.find((g) => g.id === groupFilter);
        if (grp && grp.category !== val) {
          handleGroupFilterChange('all');
        }
      }
      if (classFilter !== 'all') {
        const classBelongs = students.some(
          (s) => s.class === classFilter && s.category === val
        );
        if (!classBelongs) {
          setClassFilter('all');
        }
      }
    }
  };

  // Group change handler with auto-sync category and cascading class filter
  const handleGroupFilterChange = (val: string) => {
    setGroupFilter(val);
    if (val === 'all') {
      searchParams.delete('group');
    } else {
      searchParams.set('group', val);
      const grp = groups.find((g) => g.id === val);
      if (grp) {
        setCategoryFilter(grp.category);
      }
      if (classFilter !== 'all') {
        const hasClass = students.some((s) => s.group === val && s.class === classFilter);
        if (!hasClass) {
          setClassFilter('all');
        }
      }
    }
    setSearchParams(searchParams);
  };

  // Class change handler with auto-sync category and cascading group filter
  const handleClassChange = (val: string) => {
    setClassFilter(val);
    if (val !== 'all') {
      const matching = students.filter((s) => s.class === val);
      if (matching.length > 0) {
        const categories = Array.from(new Set(matching.map((s) => s.category)));
        if (categories.length === 1 && categoryFilter !== categories[0]) {
          setCategoryFilter(categories[0]);
        }
      }
      if (groupFilter !== 'all') {
        const hasClassInGroup = students.some(
          (s) => s.group === groupFilter && s.class === val
        );
        if (!hasClassInGroup) {
          handleGroupFilterChange('all');
        }
      }
    }
  };

  // Check if any filters or sorting are actively applied
  const hasActiveFilters = Boolean(
    search.trim() !== '' ||
    groupFilter !== 'all' ||
    categoryFilter !== 'all' ||
    classFilter !== 'all' ||
    sortBy !== 'name' ||
    sortOrder !== 'asc'
  );

  const resetFilters = () => {
    setSearch('');
    setGroupFilter('all');
    setCategoryFilter('all');
    setClassFilter('all');
    setSortBy('name');
    setSortOrder('asc');
    searchParams.delete('group');
    setSearchParams(searchParams);
  };

  // Helper for class index sorting
  const getClassSortValue = (classStr: string) => {
    if (!classStr) return 999;
    const match = classStr.match(/\d+/);
    if (match) return parseInt(match[0], 10);
    const index = CLASSES.findIndex(c => classStr.toLowerCase().includes(c.toLowerCase()));
    if (index !== -1) return index;
    return 999;
  };

  const filtered = useMemo(() => {
    // 1. Filtering
    let list = students.filter(s => {
      const matchesSearch = search.trim() === '' || 
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.id.toLowerCase().includes(search.toLowerCase());
      
      let matchesGroup = true;
      if (groupFilter !== 'all') {
        if (groupFilter === 'none') {
          matchesGroup = !s.group;
        } else {
          matchesGroup = s.group === groupFilter;
        }
      }

      let matchesCategory = true;
      if (categoryFilter !== 'all') {
        matchesCategory = s.category === categoryFilter;
      }

      let matchesClass = true;
      if (classFilter !== 'all') {
        matchesClass = s.class === classFilter;
      }

      return matchesSearch && matchesGroup && matchesCategory && matchesClass;
    });

    // 2. Sorting
    list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'group') {
        const groupA = a.group || '';
        const groupB = b.group || '';
        if (groupA === groupB) {
          comparison = 0;
        } else if (!groupA) {
          comparison = 1;
        } else if (!groupB) {
          comparison = -1;
        } else {
          comparison = groupA.localeCompare(groupB);
        }
      } else if (sortBy === 'class') {
        comparison = getClassSortValue(a.class) - getClassSortValue(b.class);
      } else if (sortBy === 'admDate') {
        const timeA = a.admDate ? new Date(a.admDate).getTime() : 0;
        const timeB = b.admDate ? new Date(b.admDate).getTime() : 0;
        comparison = timeA - timeB;
      } else if (sortBy === 'feePerMonth') {
        comparison = a.feePerMonth - b.feePerMonth;
      }

      if (comparison === 0) {
        return a.name.localeCompare(b.name);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [students, search, groupFilter, categoryFilter, classFilter, sortBy, sortOrder]);

  const handleEdit = (student: Student) => {
    setEditStudent(student);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditStudent(null);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteStudent(deleteTarget.id);
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
      refresh();
    } catch {
      toast.error('Failed to delete student');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <StudentsPageLoading />;

  return (
    <div className="page-enter space-y-3 sm:space-y-6 p-3 sm:p-4 md:p-6 w-full">
      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-4 border-b pb-3 sm:pb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Students</h1>
          <Badge variant="secondary" className="font-mono text-xs sm:text-sm px-2 py-0.5 rounded-full shrink-0 font-bold bg-muted text-muted-foreground border">
            {students.length}
          </Badge>
        </div>
        <Button onClick={handleAdd} size="sm" className="gap-1.5 shrink-0 active:scale-95 transition-transform">
          <Plus className="size-4" />
          <span>Add Student</span>
        </Button>
      </div>

      {/* Search & Filter Toolbar & Active Filters */}
      <div className="space-y-2 sm:space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 sm:gap-3 justify-between">
          {/* Search Input & Mobile Settings/Filters Button (Line 1 on responsive screens) */}
          <div className="flex items-center gap-2 flex-1 w-full lg:w-auto lg:min-w-[200px]">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search name, ID, school, class..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs sm:text-sm h-9 bg-card w-full"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full cursor-pointer"
                  title="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Mobile Standalone Settings & Filters Pop-up Menu (< sm only) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="sm:hidden h-9 w-9 shrink-0 rounded-md bg-card hover:bg-accent border shadow-xs cursor-pointer relative"
                  title="Settings & Filters"
                  aria-label="Settings and Filters"
                >
                  <Settings className="h-4 w-4 text-foreground" />
                  {hasActiveFilters && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={6}
                className="w-80 max-w-[calc(100vw-24px)] max-h-[82vh] overflow-y-auto p-3 shadow-2xl border bg-popover text-popover-foreground z-50 rounded-2xl space-y-3"
              >
                {/* 1. Header with Title & Reset Button */}
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Filters & Sort</span>
                  </span>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="text-[11px] font-semibold text-muted-foreground hover:text-destructive cursor-pointer transition-colors px-1.5 py-0.5 rounded hover:bg-muted/50 flex items-center gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Reset All</span>
                    </button>
                  )}
                </div>

                {/* 2. Category / Section */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-0.5">
                    Category / Section
                  </div>
                  <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-muted/40 border border-border/50 text-xs">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'Junior', label: 'Junior' },
                      { id: 'Senior', label: 'Senior' },
                    ].map((cat) => {
                      const isSelected = categoryFilter === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleCategoryChange(cat.id)}
                          className={`py-1.5 px-2 text-xs font-semibold rounded-md transition-all cursor-pointer text-center truncate ${
                            isSelected
                              ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
                              : 'text-muted-foreground hover:text-foreground hover:bg-card/60'
                          }`}
                        >
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Class Filter */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Class
                    </span>
                    {classFilter !== 'all' && (
                      <span className="text-[10px] font-semibold text-primary">
                        Class {classFilter}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-0.5">
                    <button
                      type="button"
                      onClick={() => handleClassChange('all')}
                      className={`py-1 px-2.5 text-xs rounded-md border text-center transition-all cursor-pointer ${
                        classFilter === 'all'
                          ? 'bg-primary text-primary-foreground border-primary font-bold shadow-2xs'
                          : 'bg-card text-foreground hover:bg-muted border-border/70 font-medium'
                      }`}
                    >
                      All
                    </button>
                    {availableClasses.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleClassChange(c)}
                        className={`py-1 px-2.5 text-xs rounded-md border text-center transition-all cursor-pointer ${
                          classFilter === c
                            ? 'bg-primary text-primary-foreground border-primary font-bold shadow-2xs'
                            : 'bg-card text-foreground hover:bg-muted border-border/70 font-medium'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Group Filter */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Group
                    </span>
                    {groupFilter !== 'all' && (
                      <span className="text-[10px] font-semibold text-primary">
                        Group {groupFilter}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-0.5">
                    <button
                      type="button"
                      onClick={() => handleGroupFilterChange('all')}
                      className={`py-1 px-2.5 text-xs rounded-md border text-center transition-all cursor-pointer ${
                        groupFilter === 'all'
                          ? 'bg-primary text-primary-foreground border-primary font-bold shadow-2xs'
                          : 'bg-card text-foreground hover:bg-muted border-border/70 font-medium'
                      }`}
                    >
                      All
                    </button>
                    {availableGroups.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleGroupFilterChange(g.id)}
                        className={`min-w-[28px] py-1 px-2 text-xs rounded-md border text-center transition-all cursor-pointer ${
                          groupFilter === g.id
                            ? 'bg-primary text-primary-foreground border-primary font-bold shadow-2xs'
                            : 'bg-card text-foreground hover:bg-muted border-border/70 font-medium'
                        }`}
                      >
                        {g.id.replace(/^Group\s*/i, '')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Sort By & Sort Order */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-0.5">
                    Sort By
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-muted/40 border border-border/50 text-xs flex-1">
                      {[
                        { id: 'group', label: 'Group' },
                        { id: 'class', label: 'Class' },
                        { id: 'admDate', label: 'Adm. Date' },
                      ].map((item) => {
                        const isSelected = sortBy === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSortBy(isSelected ? 'name' : item.id)}
                            className={`py-1.5 px-1 text-xs font-semibold rounded-md transition-all cursor-pointer text-center truncate ${
                              isSelected
                                ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-card/60'
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Sort Order Toggle Button Beside Options */}
                    <button
                      type="button"
                      onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center bg-muted/40 border border-border/50 hover:bg-muted/70 cursor-pointer transition-all active:scale-95 shadow-2xs"
                      title={sortOrder === 'asc' ? 'Ascending (tap to change to Descending)' : 'Descending (tap to change to Ascending)'}
                    >
                      <ArrowUpDown className={`h-3.5 w-3.5 transition-transform duration-200 ${sortOrder === 'desc' ? 'rotate-180 text-primary' : 'text-muted-foreground'}`} />
                    </button>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Filters & Sort Controls (Desktop toolbar >= sm, hidden on mobile < sm) */}
          <div className="hidden sm:flex flex-wrap lg:flex-nowrap items-center justify-between sm:justify-start lg:justify-end gap-2 sm:gap-2.5 w-full lg:w-auto shrink-0">
            {/* Filter Dropdowns Group */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Group Filter */}
              <Select value={groupFilter} onValueChange={handleGroupFilterChange}>
                <SelectTrigger className="w-auto sm:w-[110px] xl:w-[125px] text-xs sm:text-sm h-9 bg-card px-2.5">
                  <SelectValue placeholder="All Groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  {availableGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      Group {g.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Class Filter */}
              <Select value={classFilter} onValueChange={handleClassChange}>
                <SelectTrigger className="w-auto sm:w-[105px] xl:w-[115px] text-xs sm:text-sm h-9 bg-card px-2.5">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {availableClasses.map((c) => (
                    <SelectItem key={c} value={c}>
                      Class {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-auto sm:w-[115px] xl:w-[125px] text-xs sm:text-sm h-9 bg-card px-2.5">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Junior">Junior Section</SelectItem>
                  <SelectItem value="Senior">Senior Section</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Controls Group */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Sort Field */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-auto sm:w-[145px] xl:w-[165px] text-xs sm:text-sm h-9 bg-card px-2.5">
                  <span className="flex items-center gap-1.5 min-w-0 text-left">
                    <span className="text-muted-foreground/70 shrink-0 font-medium">Sort:</span>
                    <span className="truncate">
                      <SelectValue />
                    </span>
                  </span>
                </SelectTrigger>
                <SelectContent position="popper" align="end">
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="group">Group</SelectItem>
                  <SelectItem value="class">Class</SelectItem>
                  <SelectItem value="admDate">Adm. Date</SelectItem>
                  <SelectItem value="feePerMonth">Monthly Fee</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort Order Toggle Button */}
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 cursor-pointer active:scale-95 transition-all text-xs bg-card"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                title={sortOrder === 'asc' ? 'Change to Descending' : 'Change to Ascending'}
              >
                <ArrowUpDown className={`h-3.5 w-3.5 transition-transform duration-200 ${sortOrder === 'desc' ? 'rotate-180 text-primary' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Active Filters Summary Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-muted/20 border text-xs animate-in fade-in duration-200">
            <span className="text-muted-foreground mr-0.5 flex items-center shrink-0" title="Active Filters">
              <Filter className="h-3.5 w-3.5" />
            </span>

            {/* Search chip */}
            {search.trim() !== '' && (
              <Badge
                variant="secondary"
                className="h-6 gap-1 pl-2 pr-1 text-[11px] font-medium bg-primary/10 text-primary border-primary/20"
              >
                <span>&quot;{search}&quot;</span>
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="rounded-full p-0.5 hover:bg-primary/20 cursor-pointer"
                  title="Clear search filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {/* Category chip (Direct: Junior / Senior) */}
            {categoryFilter !== 'all' && (
              <Badge
                variant="secondary"
                className={`h-6 gap-1 pl-2 pr-1 text-[11px] font-bold ${
                  categoryFilter === 'Junior'
                    ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400 border-blue-600/30'
                    : 'bg-red-600/15 text-red-600 dark:text-red-400 border-red-600/30'
                }`}
              >
                <span>{categoryFilter}</span>
                <button
                  type="button"
                  onClick={() => handleCategoryChange('all')}
                  className="rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                  title="Clear category filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {/* Group chip (Direct: Group H) */}
            {groupFilter !== 'all' && (
              <Badge
                variant="secondary"
                className="h-6 gap-1 pl-2 pr-1 text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
              >
                <span>{groupFilter.startsWith('Group') ? groupFilter : `Group ${groupFilter}`}</span>
                <button
                  type="button"
                  onClick={() => handleGroupFilterChange('all')}
                  className="rounded-full p-0.5 hover:bg-blue-500/20 cursor-pointer"
                  title="Clear group filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {/* Class chip (Direct: 6th) */}
            {classFilter !== 'all' && (
              <Badge
                variant="secondary"
                className="h-6 gap-1 pl-2 pr-1 text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              >
                <span>{classFilter}</span>
                <button
                  type="button"
                  onClick={() => handleClassChange('all')}
                  className="rounded-full p-0.5 hover:bg-emerald-500/20 cursor-pointer"
                  title="Clear class filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {/* Sort chip (Direct: Adm Date (Desc) / Asc / Desc) */}
            {(sortBy !== 'name' || sortOrder !== 'asc') && (
              <Badge
                variant="secondary"
                className="h-6 gap-1 pl-2 pr-1 text-[11px] font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
              >
                <span>
                  {sortBy !== 'name'
                    ? `${sortBy === 'group' ? 'Group' : sortBy === 'class' ? 'Class' : sortBy === 'admDate' ? 'Adm Date' : 'Fee'} (${sortOrder === 'asc' ? 'Asc' : 'Desc'})`
                    : sortOrder === 'desc'
                    ? 'Desc'
                    : 'Asc'}
                </span>
                <button
                  type="button"
                  onClick={() => { setSortBy('name'); setSortOrder('asc'); }}
                  className="rounded-full p-0.5 hover:bg-indigo-500/20 cursor-pointer"
                  title="Reset sort"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {/* Clear / Reset All Button */}
            <Button
              variant="ghost"
              size="xs"
              onClick={resetFilters}
              title="Reset All Filters"
              aria-label="Reset All Filters"
              className="h-6 w-6 sm:w-auto p-0 sm:px-2 text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer font-medium ml-auto sm:ml-0 shrink-0"
            >
              <RotateCcw className="h-3 w-3 sm:mr-1 shrink-0" />
              <span className="hidden sm:inline">Reset All</span>
            </Button>

            <span className="text-[11px] text-muted-foreground ml-auto hidden sm:inline">
              Showing <strong className="text-foreground font-bold">{filtered.length}</strong> of {students.length} students
            </span>
          </div>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <UserRound className="mb-4 size-12 text-muted-foreground/40" />
          <p className="text-lg font-medium">No students found</p>
          <p className="text-sm text-muted-foreground mb-4">
            {search ? 'Try a different search term' : 'Add your first student to get started'}
          </p>
          {!search && (
            <Button onClick={handleAdd} variant="outline" className="gap-2">
              <Plus className="size-4" />
              Add Student
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Card List View */}
          <div className="block sm:hidden space-y-2">
            {filtered.map(student => (
              <Card key={student.id} className="overflow-hidden border bg-card/45 backdrop-blur-md transition-all duration-300 hover:bg-card/70 py-0 gap-0 rounded-xl">
                <CardContent className="p-3 flex items-center justify-between gap-4 px-3">
                  {/* Student Info Details */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="font-semibold text-sm text-foreground leading-none truncate">{student.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap leading-none">
                      <span className="font-mono font-bold text-[10px] text-primary/80 bg-primary/5 border border-primary/10 px-1.5 py-0.5 rounded-sm">{student.id}</span>
                      <span className="text-[10px] text-muted-foreground">•</span>
                      <Badge className={student.category === 'Junior' ? 'bg-blue-600 text-white dark:bg-blue-500 text-[9px] px-1.5 py-0.5 leading-tight font-bold border-none hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors' : 'bg-red-600 text-white dark:bg-red-500 text-[9px] px-1.5 py-0.5 leading-tight font-bold border-none hover:bg-red-700 dark:hover:bg-red-600 transition-colors'}>
                        {student.category}
                      </Badge>
                      {student.class && (
                        <>
                          <span className="text-[10px] text-muted-foreground">•</span>
                          <span className="text-[11px]">{student.class}</span>
                        </>
                      )}
                      <span className="text-[10px] text-muted-foreground">•</span>
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(student.feePerMonth)}</span>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <ButtonGroup>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="size-9 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 active:scale-95 transition-transform" 
                            onClick={() => navigate(`/mcms/collect?studentId=${student.id}`)}
                          >
                            <IndianRupee className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Collect Fee</TooltipContent>
                      </Tooltip>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="size-9 active:scale-95 transition-transform"
                          >
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={() => handleEdit(student)}>
                            <Pencil className="size-4" />
                            <span>Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            variant="destructive"
                            onClick={() => setDeleteTarget(student)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </ButtonGroup>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-20 font-semibold">ID</TableHead>
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="hidden sm:table-cell font-semibold">Category</TableHead>
                    <TableHead className="hidden md:table-cell font-semibold">Class</TableHead>
                    <TableHead className="hidden lg:table-cell font-semibold">Fee/Month</TableHead>
                    <TableHead className="hidden lg:table-cell font-semibold">Admission</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(student => (
                    <TableRow key={student.id} className="group hover:bg-muted/20 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-muted-foreground">{student.id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-foreground">{student.name}</p>
                          <p className="text-xs text-muted-foreground sm:hidden">
                            {student.category} · {formatCurrency(student.feePerMonth)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge className={student.category === 'Junior' ? 'bg-blue-600 text-white dark:bg-blue-500 text-xs font-bold border-none hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors' : 'bg-red-600 text-white dark:bg-red-500 text-xs font-bold border-none hover:bg-red-700 dark:hover:bg-red-600 transition-colors'}>
                          {student.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{student.class || '-'}</TableCell>
                      <TableCell className="hidden lg:table-cell font-medium text-foreground">{formatCurrency(student.feePerMonth)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">{formatDate(student.admDate)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <ButtonGroup>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="size-8 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 active:scale-95 transition-transform" 
                                  onClick={() => navigate(`/mcms/collect?studentId=${student.id}`)}
                                >
                                  <IndianRupee className="size-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Collect Fee</TooltipContent>
                            </Tooltip>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="size-8 active:scale-95 transition-transform"
                                >
                                  <MoreVertical className="size-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem onClick={() => handleEdit(student)}>
                                  <Pencil className="size-4" />
                                  <span>Edit</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  variant="destructive"
                                  onClick={() => setDeleteTarget(student)}
                                >
                                  <Trash2 className="size-4 text-destructive" />
                                  <span>Delete</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </ButtonGroup>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* Student Form Dialog */}
      <StudentForm open={formOpen} onOpenChange={setFormOpen} student={editStudent} onSaved={refresh} />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.id})? This will also remove all their payment records. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
