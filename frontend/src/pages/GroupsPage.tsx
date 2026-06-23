import React, { useState, useMemo } from "react"
import { Plus, EllipsisVertical, Pencil, Trash2, Calendar, Users, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useGroups, useStudents, useInvalidate } from "@/hooks/useStudents"
import { api } from "@/lib/api"
import { type Group } from "@/lib/constants"
import { toast } from "sonner"

const initialGroupState = {
  id: "",
  class: "",
  timing: "",
  category: "Junior" as const,
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const CLASSES = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"]

export default function GroupsPage() {
  const { groups, loading } = useGroups()
  const { students } = useStudents()
  const { invalidate } = useInvalidate()

  // Calculate student count per group batch
  const groupStudentCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    students.forEach((s) => {
      if (s.group) {
        counts[s.group] = (counts[s.group] || 0) + 1
      }
    })
    return counts
  }, [students])

  // Dialog & Form states
  const [open, setOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [formData, setFormData] = useState<Group>(initialGroupState)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Reset form
  const handleOpenAdd = () => {
    setFormData({
      id: "",
      class: "",
      timing: "",
      category: "Junior",
    })
    setIsEdit(false)
    setOpen(true)
  }

  // Open edit modal
  const handleOpenEdit = (group: Group) => {
    setFormData({ ...group })
    setIsEdit(true)
    setOpen(true)
  }

  // Save handler
  const handleSave = async () => {
    const groupId = formData.id.trim().toUpperCase()
    if (!groupId || !formData.class.trim()) {
      toast.error("Group ID and class are required.")
      return
    }

    setSaving(true)
    try {
      if (isEdit) {
        await api.updateGroup(groupId, { ...formData, id: groupId })
      } else {
        await api.createGroup({ ...formData, id: groupId })
      }
      toast.success(isEdit ? "Group updated successfully." : "Group added successfully.")
      setOpen(false)
      invalidate("groups")
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "Failed to save group.")
    } finally {
      setSaving(false)
    }
  }

  // Delete handler
  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try {
      await api.deleteGroup(deleteId)
      toast.success("Group deleted successfully.")
      invalidate("groups")
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "Failed to delete group.")
    } finally {
      setDeleteId(null)
    }
  }

  // Helper arrays for current selections
  const selectedDays = useMemo(() => {
    return formData.timing
      ? formData.timing.split(",").map((d) => d.trim()).filter(Boolean)
      : []
  }, [formData.timing])

  const selectedClasses = useMemo(() => {
    return formData.class
      ? formData.class.split(/,|\s+&\s+/).map((c) => c.trim()).filter(Boolean)
      : []
  }, [formData.class])

  // Helper to update selected classes string
  const toggleClass = (cls: string) => {
    const updated = selectedClasses.includes(cls)
      ? selectedClasses.filter((c) => c !== cls)
      : [...selectedClasses, cls]

    // Sort based on CLASSES index order
    updated.sort((a, b) => CLASSES.indexOf(a) - CLASSES.indexOf(b))

    let classStr = ""
    if (updated.length === 1) {
      classStr = updated[0]
    } else if (updated.length === 2) {
      classStr = `${updated[0]} & ${updated[1]}`
    } else if (updated.length > 2) {
      classStr = `${updated.slice(0, -1).join(", ")} & ${updated[updated.length - 1]}`
    }

    setFormData((prev) => ({ ...prev, class: classStr }))
  }

  // Helper to update selected days string
  const toggleDay = (day: string) => {
    const updated = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day]

    // Sort based on DAYS index order
    updated.sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b))

    setFormData((prev) => ({ ...prev, timing: updated.join(", ") }))
  }

  return (
    <div className="space-y-6 animate-content-in text-left p-4 md:p-6">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Groups</h1>
          <p className="text-muted-foreground text-sm">
            {groups.length} groups configured
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="hidden sm:flex items-center cursor-pointer">
          <Plus className="mr-1.5 h-4 w-4" /> Add Group
        </Button>
        <Button onClick={handleOpenAdd} size="sm" className="flex sm:hidden items-center cursor-pointer px-3 h-9 text-xs">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Group
        </Button>
      </div>

      {/* Group Create/Edit Modal Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Group" : "Add Group"}</DialogTitle>
            <DialogDescription>Configure class group, timing, and days.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* ID Input */}
            <div className="space-y-1.5">
              <Label htmlFor="gid">Group ID</Label>
              <Input
                id="gid"
                placeholder="e.g. A"
                value={formData.id}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, id: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').trim() }))
                }
                disabled={isEdit}
                maxLength={10}
              />
            </div>

            {/* Classes Multi Selector */}
            <div className="space-y-1.5">
              <Label>Classes</Label>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 pt-1">
                {CLASSES.map((cls) => {
                  const isSel = selectedClasses.includes(cls)
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => toggleClass(cls)}
                      className={`h-8 rounded-md text-xs font-bold border transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none ${
                        isSel
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs dark:bg-indigo-500 dark:border-indigo-500"
                          : "bg-background hover:bg-accent hover:text-accent-foreground text-muted-foreground border-border"
                      }`}
                    >
                      {cls}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Days Multi Selector */}
            <div className="space-y-1.5">
              <Label>Days</Label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 pt-1">
                {DAYS.map((day) => {
                  const isSel = selectedDays.includes(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`h-8 rounded-md text-xs font-bold border transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none ${
                        isSel
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs dark:bg-indigo-500 dark:border-indigo-500"
                          : "bg-background hover:bg-accent hover:text-accent-foreground text-muted-foreground border-border"
                      }`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Category selector */}
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(v: "Junior" | "Senior") =>
                  setFormData((prev) => ({ ...prev, category: v }))
                }
              >
                <SelectTrigger className="w-full h-9 cursor-pointer">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Junior">Junior</SelectItem>
                  <SelectItem value="Senior">Senior</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save" : "Add Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batches Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Card key={idx} className="overflow-hidden flex flex-col justify-between pb-3">
              <div>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-lg bg-accent animate-pulse shrink-0" />
                    <div className="space-y-1.5 min-w-0">
                      <div className="h-4 w-20 rounded-md bg-accent animate-pulse" />
                      <div className="h-3 w-14 rounded-md bg-accent animate-pulse" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="h-5 w-14 rounded-full bg-accent animate-pulse" />
                    <div className="h-7 w-7 rounded-md bg-accent animate-pulse" />
                  </div>
                </CardHeader>
                <CardContent className="pb-2 space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg">
                    <div className="flex items-center space-x-1.5">
                      <div className="h-3.5 w-3.5 rounded-sm bg-accent animate-pulse shrink-0" />
                      <div className="h-3 w-[72px] rounded-md bg-accent animate-pulse" />
                    </div>
                    <div className="h-3 w-20 rounded-md bg-accent animate-pulse" />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg">
                    <div className="flex items-center space-x-1.5">
                      <div className="h-3.5 w-3.5 rounded-sm bg-accent animate-pulse shrink-0" />
                      <div className="h-3 w-[58px] rounded-md bg-accent animate-pulse" />
                    </div>
                    <div className="h-3 w-6 rounded-md bg-accent animate-pulse" />
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold">No groups configured</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Create group batches (e.g. Class 5-7, Evening Batch) to organize your students.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={handleOpenAdd}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add First Group
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {groups.map((group) => (
            <Card
              key={group.id}
              className="relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-primary/20 flex flex-col justify-between pb-3"
            >
              <div>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 font-mono text-lg font-bold text-primary ring-1 ring-primary/20 shrink-0">
                      {group.id}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-semibold truncate max-w-[120px]" title={group.class}>
                        {group.class}
                      </CardTitle>
                      <CardDescription className="text-[10px] mt-0.5">
                        Group ID: {group.id}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 select-none">
                    <Badge variant={group.category === "Junior" ? "junior" : "senior"}>
                      {group.category}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-md cursor-pointer text-muted-foreground hover:text-foreground"
                        >
                          <EllipsisVertical className="h-4 w-4" />
                          <span className="sr-only">More options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-28">
                        <DropdownMenuItem onClick={() => handleOpenEdit(group)} className="cursor-pointer text-xs">
                          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteId(group.id)}
                          className="cursor-pointer text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pb-2 space-y-2">
                  <div className="text-xs text-muted-foreground flex items-center justify-between p-2 rounded-lg border border-border/50 bg-muted/40">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium shrink-0">Classes On:</span>
                    </div>
                    <span className="font-bold text-foreground truncate max-w-[120px] text-right" title={group.timing}>
                      {group.timing || "None"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center justify-between p-2 rounded-lg border border-border/50 bg-muted/40">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium shrink-0">Students:</span>
                    </div>
                    <span className="font-bold text-foreground font-mono text-right">
                      {groupStudentCounts[group.id] || 0}
                    </span>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Group"
        description={`Are you sure you want to delete group ${deleteId}? Students assigned to this group must be reassigned first.`}
        actionLabel="Delete Group"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />
    </div>
  )
}
