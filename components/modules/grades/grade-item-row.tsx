"use client";

import { useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGradeStore } from "@/stores/useGradeStore";
import { toast } from "sonner";
import type { GradeItem } from "@/types";

interface GradeItemRowProps {
  courseId: string;
  categoryId: string;
  item: GradeItem;
}

export function GradeItemRow({ courseId, categoryId, item }: GradeItemRowProps) {
  const updateItem = useGradeStore((s) => s.updateItem);
  const deleteItem = useGradeStore((s) => s.deleteItem);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [earned, setEarned] = useState(String(item.scoreEarned));
  const [possible, setPossible] = useState(String(item.scorePossible));
  const [date, setDate] = useState(item.date);

  const pct =
    item.scorePossible > 0
      ? ((item.scoreEarned / item.scorePossible) * 100).toFixed(1)
      : "—";

  function saveEdit() {
    const earnedNum = parseFloat(earned);
    const possibleNum = parseFloat(possible);
    if (!name.trim() || isNaN(earnedNum) || earnedNum < 0 || isNaN(possibleNum) || possibleNum <= 0) {
      toast.error("Invalid values");
      return;
    }
    updateItem(courseId, categoryId, item.id, {
      name: name.trim(),
      scoreEarned: earnedNum,
      scorePossible: possibleNum,
      date,
    });
    setEditing(false);
  }

  function cancelEdit() {
    setName(item.name);
    setEarned(String(item.scoreEarned));
    setPossible(String(item.scorePossible));
    setDate(item.date);
    setEditing(false);
  }

  function handleDelete() {
    deleteItem(courseId, categoryId, item.id);
    toast.success("Item deleted");
  }

  if (editing) {
    return (
      <tr>
        <td className="py-1 pr-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-7 text-sm"
            onKeyDown={(e) => e.key === "Enter" && saveEdit()}
          />
        </td>
        <td className="py-1 pr-2">
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={earned}
              onChange={(e) => setEarned(e.target.value)}
              min={0}
              step="any"
              className="w-16 h-7 text-sm"
            />
            <span className="text-muted-foreground text-xs">/</span>
            <Input
              type="number"
              value={possible}
              onChange={(e) => setPossible(e.target.value)}
              min={0.01}
              step="any"
              className="w-16 h-7 text-sm"
            />
          </div>
        </td>
        <td className="py-1 pr-2 text-sm text-muted-foreground">—</td>
        <td className="py-1 pr-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-7 text-sm w-32"
          />
        </td>
        <td className="py-1">
          <div className="flex gap-1">
            <Button size="icon-sm" variant="ghost" onClick={saveEdit}>
              <Check className="size-3.5 text-green-500" />
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={cancelEdit}>
              <X className="size-3.5 text-muted-foreground" />
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="group hover:bg-muted/40 transition-colors">
      <td className="py-1.5 pr-2 text-sm">{item.name}</td>
      <td className="py-1.5 pr-2 text-sm tabular-nums text-muted-foreground">
        {item.scoreEarned} / {item.scorePossible}
      </td>
      <td className="py-1.5 pr-2 text-sm tabular-nums font-medium">{pct}%</td>
      <td className="py-1.5 pr-2 text-sm text-muted-foreground">
        {item.date ? new Date(item.date + "T00:00:00").toLocaleDateString() : "—"}
      </td>
      <td className="py-1.5">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={handleDelete}>
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
