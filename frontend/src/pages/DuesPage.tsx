import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDues } from '@/hooks/useStudents';
import { DuesPageLoading } from '@/components/loading-skeletons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ButtonGroup } from '@/components/ui/button-group';
import { MONTH_CODES, MONTH_NAMES, formatCurrency, getCurrentMonthCode } from '@/lib/constants';
import type { MonthCode } from '@/lib/constants';
import { AlertTriangle, Users, IndianRupee, Calendar } from 'lucide-react';

export default function DuesPage() {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState<MonthCode>(getCurrentMonthCode());
  const { dues, loading } = useDues(selectedMonth);

  const totalOutstanding = dues.reduce((sum, d) => sum + d.outstandingDue, 0);

  if (loading) return <DuesPageLoading />;

  return (
    <div className="page-enter space-y-6 p-4 md:p-6">
      <div className="flex flex-row items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Dues List</h1>
          <Badge className="font-mono text-xs sm:text-sm px-2 py-0.5 rounded-full shrink-0 font-bold bg-red-600 text-white dark:bg-red-500 border-none shadow-sm">
            {dues.length}
          </Badge>
        </div>
        <div className="shrink-0">
          <Select value={selectedMonth} onValueChange={v => setSelectedMonth(v as MonthCode)}>
            <SelectTrigger className="w-[140px] h-9 text-xs sm:text-sm font-medium bg-card/50 border hover:bg-accent/50 transition-colors">
              <Calendar className="mr-2 size-4 text-muted-foreground shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" className="mt-1">
              {MONTH_CODES.map(month => (
                <SelectItem key={month} value={month}>{MONTH_NAMES[month]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Card className="shadow-xs border bg-card/45 backdrop-blur-md py-0 gap-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-2.5 px-3.5">
            <CardTitle className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">Total Defaulters</CardTitle>
            <Users className="size-3.5 text-muted-foreground/70" />
          </CardHeader>
          <CardContent className="p-2.5 px-3.5 pt-0">
            <p className="text-xl font-bold tracking-tight">{dues.length}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">for {MONTH_NAMES[selectedMonth]}</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-xs border bg-card/45 backdrop-blur-md py-0 gap-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-2.5 px-3.5">
            <CardTitle className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">Total Outstanding</CardTitle>
            <IndianRupee className="size-3.5 text-muted-foreground/70" />
          </CardHeader>
          <CardContent className="p-2.5 px-3.5 pt-0">
            <p className="text-xl font-bold tracking-tight">{formatCurrency(totalOutstanding)}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">unpaid fees this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Dues Table */}
      {dues.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <AlertTriangle className="size-6 text-emerald-500" />
          </div>
          <p className="text-lg font-medium">All Clear!</p>
          <p className="text-sm text-muted-foreground">Every student has paid for {MONTH_NAMES[selectedMonth]}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Card List View */}
          <div className="block sm:hidden space-y-2">
            {dues.map(student => (
              <Card key={student.id} className="overflow-hidden border bg-card/45 backdrop-blur-md transition-all duration-300 hover:bg-card/70 py-0 gap-0 rounded-xl">
                <CardContent className="p-3 flex items-center justify-between gap-4 px-3">
                  {/* Student Info Details */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="font-semibold text-sm text-foreground leading-none truncate">{student.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap leading-none">
                      <Badge className={student.category === 'Junior' ? 'font-mono font-bold text-[9px] px-1.5 py-0.5 leading-tight bg-blue-600 text-white dark:bg-blue-500 border-none hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors' : 'font-mono font-bold text-[9px] px-1.5 py-0.5 leading-tight bg-red-600 text-white dark:bg-red-500 border-none hover:bg-red-700 dark:hover:bg-red-600 transition-colors'}>
                        {student.id}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">•</span>
                      <span className="text-[11px] font-medium text-muted-foreground">{student.pendingMonths} month{student.pendingMonths > 1 ? 's' : ''} due (₹{student.outstandingDue} due)</span>
                      <span className="text-[10px] text-muted-foreground">•</span>
                      <span className="text-[11px] font-semibold text-foreground">Fee: {formatCurrency(student.feePerMonth)}/m</span>
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
                    <TableHead className="font-semibold">ID</TableHead>
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="hidden md:table-cell font-semibold">Category</TableHead>
                    <TableHead className="font-semibold">Fee/Month</TableHead>
                    <TableHead className="hidden sm:table-cell font-semibold">Dues</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dues.map(student => (
                    <TableRow key={student.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-muted-foreground">{student.id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-foreground">{student.name}</p>
                          <p className="text-xs text-muted-foreground sm:hidden">{student.category}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge className={student.category === 'Junior' ? 'bg-blue-600 text-white dark:bg-blue-500 text-xs font-bold border-none hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors' : 'bg-red-600 text-white dark:bg-red-500 text-xs font-bold border-none hover:bg-red-700 dark:hover:bg-red-600 transition-colors'}>
                          {student.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{formatCurrency(student.feePerMonth)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        <div className="flex items-center gap-2">
                          <Badge className="text-xs font-bold border-none bg-red-600 text-white dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 transition-colors">
                            {student.pendingMonths} month{student.pendingMonths > 1 ? 's' : ''}
                          </Badge>
                          <span className="font-bold text-red-600 dark:text-red-400">
                            {formatCurrency(student.outstandingDue)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <ButtonGroup>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="size-8 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20" 
                                  onClick={() => navigate(`/collect?studentId=${student.id}`)}
                                >
                                  <IndianRupee className="size-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Collect Fee</TooltipContent>
                            </Tooltip>
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
    </div>
  );
}
