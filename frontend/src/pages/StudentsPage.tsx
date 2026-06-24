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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/constants';
import type { Student } from '@/lib/constants';
import { Plus, Search, Pencil, Trash2, UserRound, IndianRupee, MoreVertical, Settings, SlidersHorizontal, X, ArrowUpDown, Filter } from 'lucide-react';

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
  const [filterOpen, setFilterOpen] = useState(false);
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

  // Sync group parameter back to URL
  const handleGroupFilterChange = (val: string) => {
    setGroupFilter(val);
    if (val === 'all') {
      searchParams.delete('group');
    } else {
      searchParams.set('group', val);
    }
    setSearchParams(searchParams);
  };

  // Dynamic list of unique classes present in students data
  const uniqueClasses = useMemo(() => {
    const classes = new Set<string>();
    students.forEach(s => {
      if (s.class) {
        classes.add(s.class.trim());
      }
    });
    // Sort them alphabetically and numerically if possible
    return Array.from(classes).sort((a, b) => {
      const aNum = parseInt(a.match(/\d+/)?.[0] || '0', 10);
      const bNum = parseInt(b.match(/\d+/)?.[0] || '0', 10);
      if (aNum && bNum) return aNum - bNum;
      return a.localeCompare(b);
    });
  }, [students]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (groupFilter !== 'all') count++;
    if (categoryFilter !== 'all') count++;
    if (classFilter !== 'all') count++;
    if (sortBy !== 'name' || sortOrder !== 'asc') count++;
    return count;
  }, [groupFilter, categoryFilter, classFilter, sortBy, sortOrder]);

  const resetFilters = () => {
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
    <div className="page-enter space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-4 border-b pb-4">
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

      {/* Search and Filters Toolbar */}
      <div className="flex flex-col gap-3">
        {/* Mobile View: Search & Settings Button */}
        <div className="flex items-center gap-2 w-full lg:hidden">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Button 
            variant={activeFiltersCount > 0 ? "secondary" : "outline"} 
            size="icon" 
            onClick={() => setFilterOpen(true)}
            className={`relative shrink-0 active:scale-95 transition-all duration-200 cursor-pointer ${
              activeFiltersCount > 0 
                ? "border-indigo-500/30 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100/50 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-500/20" 
                : ""
            }`}
            title="Filter and Sort"
          >
            <Settings className="size-4" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white dark:bg-indigo-500 border border-background">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </div>

        {/* Desktop View: Inline Filters Toolbar */}
        <div className="hidden lg:flex items-center gap-3 flex-wrap w-full">
          {/* Search Box */}
          <div className="relative w-64 xl:w-80 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search name/ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>

          {/* Group Filter */}
          <Select value={groupFilter} onValueChange={handleGroupFilterChange}>
            <SelectTrigger className="w-[145px] h-9 text-xs cursor-pointer bg-card">
              <SelectValue placeholder="Group" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all" className="text-xs">All Groups</SelectItem>
              {groups.map(g => (
                <SelectItem key={g.id} value={g.id} className="text-xs">
                  Group {g.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[145px] h-9 text-xs cursor-pointer bg-card">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all" className="text-xs">All Categories</SelectItem>
              <SelectItem value="Junior" className="text-xs">Junior</SelectItem>
              <SelectItem value="Senior" className="text-xs">Senior</SelectItem>
            </SelectContent>
          </Select>

          {/* Class Filter */}
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-[140px] h-9 text-xs cursor-pointer bg-card">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all" className="text-xs">All Classes</SelectItem>
              {uniqueClasses.map(cls => (
                <SelectItem key={cls} value={cls} className="text-xs">
                  {cls}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Divider line */}
          <div className="h-5 w-px bg-border shrink-0 mx-0.5" />

          {/* Sort Field */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[155px] h-9 text-xs cursor-pointer bg-card">
              <span className="text-muted-foreground/60 mr-1 shrink-0 font-medium">Sort:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="name" className="text-xs">Name</SelectItem>
              <SelectItem value="group" className="text-xs">Group</SelectItem>
              <SelectItem value="class" className="text-xs">Class</SelectItem>
              <SelectItem value="admDate" className="text-xs">Adm. Date</SelectItem>
              <SelectItem value="feePerMonth" className="text-xs">Monthly Fee</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Order Toggle Button */}
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 cursor-pointer active:scale-95 transition-all text-xs"
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            title={sortOrder === 'asc' ? 'Change to Descending' : 'Change to Ascending'}
          >
            <ArrowUpDown className={`size-3.5 transition-transform duration-200 ${sortOrder === 'desc' ? 'rotate-180 text-indigo-500' : ''}`} />
          </Button>

          {/* Inline Reset Button */}
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2 text-xs text-destructive font-semibold hover:bg-destructive/10 hover:text-destructive cursor-pointer ml-auto"
              onClick={resetFilters}
            >
              Reset All
            </Button>
          )}
        </div>
      </div>

      {/* Active Filter Tags */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground font-medium mr-1 flex items-center gap-1">
            <Filter className="size-3" />
            <span>Active filters:</span>
          </span>
          
          {/* Group Tag */}
          {groupFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1 px-2 py-0.5 font-medium rounded-md">
              <span>Group: {groupFilter === 'none' ? 'None' : groupFilter}</span>
              <button 
                onClick={() => handleGroupFilterChange('all')}
                className="hover:bg-muted-foreground/20 rounded-full p-0.5 focus:outline-none cursor-pointer"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}

          {/* Category Tag */}
          {categoryFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1 px-2 py-0.5 font-medium rounded-md">
              <span>Category: {categoryFilter}</span>
              <button 
                onClick={() => setCategoryFilter('all')}
                className="hover:bg-muted-foreground/20 rounded-full p-0.5 focus:outline-none cursor-pointer"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}

          {/* Class Tag */}
          {classFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1 px-2 py-0.5 font-medium rounded-md">
              <span>Class: {classFilter}</span>
              <button 
                onClick={() => setClassFilter('all')}
                className="hover:bg-muted-foreground/20 rounded-full p-0.5 focus:outline-none cursor-pointer"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}

          {/* Sort Tag */}
          {(sortBy !== 'name' || sortOrder !== 'asc') && (
            <Badge variant="secondary" className="gap-1 px-2 py-0.5 font-medium rounded-md bg-indigo-50/40 text-indigo-600 dark:bg-indigo-950/10 dark:text-indigo-400 border border-indigo-500/10">
              <span>
                Sorted by {sortBy === 'name' ? 'Name' : sortBy === 'group' ? 'Group' : sortBy === 'class' ? 'Class' : sortBy === 'admDate' ? 'Adm. Date' : 'Fee'} ({sortOrder === 'asc' ? 'Asc' : 'Desc'})
              </span>
              <button 
                onClick={() => { setSortBy('name'); setSortOrder('asc'); }}
                className="hover:bg-indigo-200/40 dark:hover:bg-indigo-900/30 rounded-full p-0.5 focus:outline-none cursor-pointer"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetFilters} 
            className="h-7 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/10 px-2 rounded-md cursor-pointer ml-1"
          >
            Clear all
          </Button>
        </div>
      )}

      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" className="w-[300px] max-w-[300px] flex flex-col h-full p-0">
          <SheetHeader className="p-4 pb-3 border-b shrink-0">
            <SheetTitle className="text-base font-bold flex items-center gap-2">
              <SlidersHorizontal className="size-4.5 text-indigo-600 dark:text-indigo-400" />
              <span>Filters & Sorting</span>
            </SheetTitle>
            <SheetDescription className="text-xs leading-normal mt-0.5">
              Refine student list and configure sorting.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Filter by Group */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between text-muted-foreground/90">
                <span>Group Batch</span>
                {groupFilter !== 'all' && (
                  <button 
                    onClick={() => handleGroupFilterChange('all')}
                    className="text-[11px] font-medium text-destructive hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </Label>
              <Select value={groupFilter} onValueChange={handleGroupFilterChange}>
                <SelectTrigger className="w-full h-10 text-sm cursor-pointer">
                  <SelectValue placeholder="All Groups" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="all" className="text-sm">All Groups</SelectItem>
                  {groups.map(g => (
                    <SelectItem key={g.id} value={g.id} className="text-sm">
                      Group {g.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter by Category */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center justify-between text-muted-foreground/90">
                <span>Student Category</span>
                {categoryFilter !== 'all' && (
                  <button 
                    onClick={() => setCategoryFilter('all')}
                    className="text-[11px] font-medium text-destructive hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </Label>
              <div className="flex flex-col gap-2">
                {['Junior', 'Senior'].map(cat => (
                  <Button
                    key={cat}
                    type="button"
                    variant={categoryFilter === cat ? 'default' : 'outline'}
                    className="h-10 font-medium active:scale-95 transition-all text-sm cursor-pointer w-full px-3"
                    onClick={() => setCategoryFilter(prev => prev === cat ? 'all' : cat)}
                  >
                    {cat} Category
                  </Button>
                ))}
              </div>
            </div>

            {/* Filter by Class */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between text-muted-foreground/90">
                <span>Class</span>
                {classFilter !== 'all' && (
                  <button 
                    onClick={() => setClassFilter('all')}
                    className="text-[11px] font-medium text-destructive hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </Label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-full h-10 text-sm cursor-pointer">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="all" className="text-sm">All Classes</SelectItem>
                  {uniqueClasses.map(cls => (
                    <SelectItem key={cls} value={cls} className="text-sm">
                      {cls}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort Section */}
            <div className="space-y-4 pt-3 border-t border-border/40">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground/80">
                <ArrowUpDown className="size-4 text-indigo-500" />
                <span>Sorting Options</span>
              </h3>

              {/* Sort By */}
              <div className="space-y-1.5">
                <Label htmlFor="sortBy" className="text-[11px] text-muted-foreground/75 font-semibold">Sort Field</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger id="sortBy" className="w-full h-10 text-sm cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="name" className="text-sm">Student Name</SelectItem>
                    <SelectItem value="group" className="text-sm">Group Batch</SelectItem>
                    <SelectItem value="class" className="text-sm">Class</SelectItem>
                    <SelectItem value="admDate" className="text-sm">Admission Date</SelectItem>
                    <SelectItem value="feePerMonth" className="text-sm">Monthly Fee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Order */}
              <div className="space-y-2">
                <Label className="text-[11px] text-muted-foreground/75 font-semibold">Sort Order</Label>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant={sortOrder === 'asc' ? 'default' : 'outline'}
                    className="h-10 active:scale-95 transition-all text-sm cursor-pointer font-medium w-full px-3 text-left justify-start"
                    onClick={() => setSortOrder('asc')}
                  >
                    <span className="flex-1 text-center">
                      {sortBy === 'admDate' ? 'Oldest First' : sortBy === 'name' ? 'A-Z (Ascending)' : sortBy === 'feePerMonth' ? 'Lowest Fee first' : 'Ascending'}
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant={sortOrder === 'desc' ? 'default' : 'outline'}
                    className="h-10 active:scale-95 transition-all text-sm cursor-pointer font-medium w-full px-3 text-left justify-start"
                    onClick={() => setSortOrder('desc')}
                  >
                    <span className="flex-1 text-center">
                      {sortBy === 'admDate' ? 'Newest First' : sortBy === 'name' ? 'Z-A (Descending)' : sortBy === 'feePerMonth' ? 'Highest Fee first' : 'Descending'}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <SheetFooter className="p-4 border-t bg-muted/10 flex flex-row gap-3 items-center justify-between shrink-0 mt-auto">
            <Button
              type="button"
              variant="ghost"
              className="text-sm hover:bg-destructive/10 hover:text-destructive text-muted-foreground font-semibold h-10 cursor-pointer px-4"
              onClick={resetFilters}
              disabled={activeFiltersCount === 0}
            >
              Reset All
            </Button>
            <Button
              type="button"
              className="h-10 cursor-pointer font-semibold px-5 text-sm"
              onClick={() => setFilterOpen(false)}
            >
              Apply Filters
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
                            onClick={() => navigate(`/collect?studentId=${student.id}`)}
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
                                  onClick={() => navigate(`/collect?studentId=${student.id}`)}
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
