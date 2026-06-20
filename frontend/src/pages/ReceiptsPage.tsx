import { useState } from 'react';
import { useReceipts, useSettings } from '@/hooks/useStudents';
import { ReceiptsPageLoading } from '@/components/loading-skeletons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, MONTH_SHORT, formatReceiptPeriod, notifyReceiptsChanged } from '@/lib/constants';
import { generateReceiptPDF } from '@/lib/pdf';
import type { Receipt } from '@/lib/constants';
import { Search, Eye, Download, Trash2, FileText, MoreVertical } from 'lucide-react';

export default function ReceiptsPage() {
  const { receipts, loading, refresh } = useReceipts();
  const { settings } = useSettings();
  const [search, setSearch] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState('all');
  const [preview, setPreview] = useState<Receipt | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Receipt | null>(null);
  const [deleting, setDeleting] = useState(false);

  const getAcademicYearOptions = (activeYear: string) => {
    const years = new Set<string>();
    years.add(activeYear || '2026-27');
    const parts = (activeYear || '2026-27').split('-');
    const startYear = parseInt(parts[0]) || 2026;
    for (let i = -2; i <= 2; i++) {
      const y = startYear + i;
      const nextY = (y + 1).toString().slice(-2);
      years.add(`${y}-${nextY}`);
    }
    return Array.from(years).sort();
  };

  const filtered = receipts.filter(r => {
    const matchesSearch =
      r.studentName.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.studentId.toLowerCase().includes(search.toLowerCase());
      
    if (!matchesSearch) return false;
    
    if (selectedYearFilter === 'all') return true;
    
    const rYear = r.academicYear || '2026-27';
    return rYear === selectedYearFilter;
  });

  const handleDownload = async (receipt: Receipt) => {
    try {
      await generateReceiptPDF(receipt);
      toast.success('Receipt downloaded');
    } catch {
      toast.error('Failed to generate PDF');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteReceipt(deleteTarget.id);
      toast.success('Receipt deleted');
      setDeleteTarget(null);
      notifyReceiptsChanged();
      refresh();
    } catch {
      toast.error('Failed to delete receipt');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <ReceiptsPageLoading />;

  return (
    <div className="page-enter space-y-6 p-4 md:p-6">
      <div className="flex flex-row items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Receipts</h1>
          <Badge className="font-mono text-xs sm:text-sm px-2 py-0.5 rounded-full shrink-0 font-bold bg-emerald-600 text-white dark:bg-emerald-500 border-none shadow-sm">
            {filtered.length}
          </Badge>
        </div>
      </div>

      {/* Search & Spacing Filter */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search by name, ID, or receipt no..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {/* Session Filter */}
        <div className="flex items-center gap-2 justify-between w-full sm:w-auto">
          <span className="text-xs text-muted-foreground font-bold shrink-0">Session Filter:</span>
          <Select
            value={selectedYearFilter}
            onValueChange={(val) => setSelectedYearFilter(val)}
          >
            <SelectTrigger className="h-9 w-full sm:w-[150px] text-xs font-bold text-muted-foreground bg-background border-input shadow-xs select-none">
              <SelectValue placeholder="All Sessions" />
            </SelectTrigger>
            <SelectContent position="popper" align="end" className="w-[150px]">
              <SelectItem value="all" className="text-xs font-semibold">
                All Sessions
              </SelectItem>
              {getAcademicYearOptions(settings?.academicYear || '2026-27').map(year => (
                <SelectItem key={year} value={year} className="text-xs font-semibold">
                  Session {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <FileText className="mb-4 size-12 text-muted-foreground/40" />
          <p className="text-lg font-medium">No receipts found</p>
          <p className="text-sm text-muted-foreground">{search ? 'Try a different search' : 'Receipts will appear here after collecting fees'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Card List View */}
          <div className="block sm:hidden space-y-2">
            {filtered.map(receipt => (
              <Card key={receipt.id} className="overflow-hidden border bg-card/45 backdrop-blur-md transition-all duration-300 hover:bg-card/70 py-0 gap-0 rounded-xl">
                <CardContent className="p-3 flex items-center justify-between gap-4 px-3">
                  {/* Student Info Details */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="font-semibold text-sm text-foreground leading-none truncate">{receipt.studentName}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap leading-none">
                      <span className="text-[11px] font-medium">{formatReceiptPeriod(receipt)}</span>
                      <span className="text-[10px] text-muted-foreground">•</span>
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(receipt.totalRecv)}</span>
                      <span className="text-[10px] text-muted-foreground">•</span>
                      <span className="text-[10px] text-muted-foreground/80">{formatDate(receipt.generatedOn)}</span>
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
                            onClick={() => handleDownload(receipt)}
                          >
                            <Download className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Download PDF</TooltipContent>
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
                          <DropdownMenuItem onClick={() => setPreview(receipt)}>
                            <Eye className="size-4" />
                            <span>Preview</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            variant="destructive"
                            onClick={() => setDeleteTarget(receipt)}
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
                    <TableHead className="font-semibold">Receipt No</TableHead>
                    <TableHead className="font-semibold">Student</TableHead>
                    <TableHead className="hidden sm:table-cell font-semibold">Period</TableHead>
                    <TableHead className="hidden md:table-cell font-semibold">Amount</TableHead>
                    <TableHead className="hidden lg:table-cell font-semibold">Date</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(receipt => (
                    <TableRow key={receipt.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell>
                        <span className="font-mono text-xs font-bold text-muted-foreground">{receipt.id}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-foreground">{receipt.studentName}</p>
                          <p className="text-xs text-muted-foreground sm:hidden">{formatReceiptPeriod(receipt)} · {formatCurrency(receipt.totalRecv)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{formatReceiptPeriod(receipt)}</TableCell>
                      <TableCell className="hidden md:table-cell font-medium text-foreground">{formatCurrency(receipt.totalRecv)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">{formatDate(receipt.generatedOn)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <ButtonGroup>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="size-8 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 active:scale-95 transition-transform" 
                                  onClick={() => handleDownload(receipt)}
                                >
                                  <Download className="size-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Download PDF</TooltipContent>
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
                                <DropdownMenuItem onClick={() => setPreview(receipt)}>
                                  <Eye className="size-4" />
                                  <span>Preview</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  variant="destructive"
                                  onClick={() => setDeleteTarget(receipt)}
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

      {/* Receipt Preview Dialog */}
      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Receipt {preview?.id}</DialogTitle>
            <DialogDescription className="sr-only">
              Detailed preview of the selected receipt
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Student:</span> <span className="font-medium">{preview.studentName}</span></div>
                <div><span className="text-muted-foreground">ID:</span> <span className="font-mono font-bold">{preview.studentId}</span></div>
                <div><span className="text-muted-foreground">Category:</span> {preview.category}</div>
                <div><span className="text-muted-foreground">Class:</span> {preview.class || '-'}</div>
                <div><span className="text-muted-foreground">School:</span> {preview.school || '-'}</div>
                <div><span className="text-muted-foreground">Fee/Month:</span> {formatCurrency(preview.feePerMonth)}</div>
              </div>
              <Separator />
              {(() => {
                const totalFee = preview.months.length * preview.feePerMonth;
                const adjustedAmount = totalFee - preview.amtPaid - (preview.remainingAmount || 0);
                return (
                  <div className="grid grid-cols-2 gap-3">
                    <div><span className="text-muted-foreground">Period:</span> {formatReceiptPeriod(preview)}</div>
                    <div><span className="text-muted-foreground">Months:</span> {preview.months.map(m => MONTH_SHORT[m]).join(', ')}</div>
                    <div><span className="text-muted-foreground">Total Fee:</span> <span className="font-semibold">{formatCurrency(totalFee)}</span></div>
                    {adjustedAmount > 0 && (
                      <div className="text-amber-600 dark:text-amber-400 font-semibold col-span-2 flex items-center justify-between">
                        <span>Adjusted (Previously Paid):</span>
                        <span>-{formatCurrency(adjustedAmount)}</span>
                      </div>
                    )}
                    <div><span className="text-muted-foreground">Amount Paid:</span> <span className="font-semibold">{formatCurrency(preview.amtPaid)}</span></div>
                    {preview.prevDue > 0 && <div><span className="text-muted-foreground">Prev Dues:</span> {formatCurrency(preview.prevDue)}</div>}
                    {preview.remainingAmount !== undefined && preview.remainingAmount > 0 && (
                      <div className="text-red-600 dark:text-red-400 font-semibold col-span-2 flex items-center justify-between border-t pt-1">
                        <span>
                          {preview.remainingMonths ? `Remaining Balance (${preview.remainingMonths}):` : 'Remaining Balance:'}
                        </span>
                        <span>{formatCurrency(preview.remainingAmount)}</span>
                      </div>
                    )}
                    {preview.remainingAmount !== undefined && preview.remainingAmount === 0 && preview.remainingMonths && (
                      <div className="text-emerald-600 dark:text-emerald-400 font-semibold col-span-2 flex items-center justify-between border-t pt-1">
                        <span>Remaining Balance:</span>
                        <span>
                          {formatCurrency(0)} (Fully Paid for {preview.remainingMonths})
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total Received:</span>
                <span className="text-lg">{formatCurrency(preview.totalRecv)}</span>
              </div>
              {preview.nextDue && <div><span className="text-muted-foreground">Next Due:</span> {preview.nextDue}</div>}
              {preview.notes && <div><span className="text-muted-foreground">Notes:</span> {preview.notes}</div>}
              <div className="text-xs text-muted-foreground">
                Generated on {formatDate(preview.generatedOn)} by {preview.generatedBy}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>Close</Button>
            <Button onClick={() => preview && handleDownload(preview)} className="gap-2">
              <Download className="size-4" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Receipt</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete receipt <strong>{deleteTarget?.id}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
