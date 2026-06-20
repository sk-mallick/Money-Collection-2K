import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudents } from '@/hooks/useStudents';
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
import { Plus, Search, Pencil, Trash2, UserRound, IndianRupee, MoreVertical } from 'lucide-react';

export default function StudentsPage() {
  const navigate = useNavigate();
  const { students, loading, refresh } = useStudents();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase())
  );

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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
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
