"use client";

import { useState } from "react";
import { ChevronDown, MoreHorizontal, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useGradeStore } from "@/stores/useGradeStore";
import { getCategoryAverage } from "@/lib/grade-utils";
import { GradeItemRow } from "./grade-item-row";
import { AddItemForm } from "./add-item-form";
import { toast } from "sonner";
import type { GradeCategory } from "@/types";

interface CategorySectionProps {
  courseId: string;
  category: GradeCategory;
}

export function CategorySection({ courseId, category }: CategorySectionProps) {
  const updateCategory = useGradeStore((s) => s.updateCategory);
  const deleteCategory = useGradeStore((s) => s.deleteCategory);

  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [editWeight, setEditWeight] = useState(String(category.weight));

  const avg = getCategoryAverage(category);
  const avgDisplay = avg !== null ? `${avg.toFixed(1)}%` : "No items";

  function saveEdit() {
    const w = parseFloat(editWeight);
    if (!editName.trim()) { toast.error("Name required"); return; }
    if (isNaN(w) || w < 0 || w > 100) { toast.error("Weight must be 0–100"); return; }
    updateCategory(courseId, category.id, { name: editName.trim(), weight: w });
    setEditing(false);
  }

  function cancelEdit() {
    setEditName(category.name);
    setEditWeight(String(category.weight));
    setEditing(false);
  }

  function handleDelete() {
    deleteCategory(courseId, category.id);
    toast.success("Category deleted");
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 flex-1 text-left"
          aria-expanded={open}
        >
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform duration-150 ${open ? "" : "-rotate-90"}`}
          />
          {editing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-6 text-sm flex-1"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.key === "Enter" && saveEdit()}
            />
          ) : (
            <span className="font-medium text-sm">{category.name}</span>
          )}
        </button>

        {editing ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={editWeight}
              onChange={(e) => setEditWeight(e.target.value)}
              min={0}
              max={100}
              className="w-16 h-6 text-sm"
              placeholder="Weight"
              onClick={(e) => e.stopPropagation()}
            />
            <span className="text-xs text-muted-foreground">%</span>
            <Button size="icon-sm" variant="ghost" onClick={saveEdit}>
              <Check className="size-3.5 text-green-500" />
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={cancelEdit}>
              <X className="size-3.5 text-muted-foreground" />
            </Button>
          </div>
        ) : (
          <>
            <Badge variant="secondary" className="text-xs">
              {category.weight}%
            </Badge>
            <span className="text-sm text-muted-foreground tabular-nums">
              {avgDisplay}
            </span>
            <AlertDialog>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" />}>
                  <MoreHorizontal className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setEditing(true); setOpen(true); }}>
                    <Pencil className="size-3.5 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <AlertDialogTrigger
                    render={
                      <DropdownMenuItem className="text-destructive focus:text-destructive" />
                    }
                  >
                    <Trash2 className="size-3.5 mr-2" />
                    Delete
                  </AlertDialogTrigger>
                </DropdownMenuContent>
              </DropdownMenu>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete category?</AlertDialogTitle>
                  <AlertDialogDescription>
                    "{category.name}" and all its items will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>

      {/* Body */}
      {open && (
        <div className="px-3 pb-3 pt-2">
          {category.items.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">
              No items yet — add one below.
            </p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-xs text-muted-foreground border-b">
                  <th className="text-left pb-1 pr-2 font-normal">Name</th>
                  <th className="text-left pb-1 pr-2 font-normal">Score</th>
                  <th className="text-left pb-1 pr-2 font-normal">%</th>
                  <th className="text-left pb-1 pr-2 font-normal">Date</th>
                  <th className="pb-1" />
                </tr>
              </thead>
              <tbody>
                {category.items.map((item) => (
                  <GradeItemRow
                    key={item.id}
                    courseId={courseId}
                    categoryId={category.id}
                    item={item}
                  />
                ))}
              </tbody>
            </table>
          )}
          <AddItemForm courseId={courseId} categoryId={category.id} />
        </div>
      )}
    </div>
  );
}
