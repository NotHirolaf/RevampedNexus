"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGradeStore } from "@/stores/useGradeStore";
import { toast } from "sonner";

interface AddItemFormProps {
  courseId: string;
  categoryId: string;
}

export function AddItemForm({ courseId, categoryId }: AddItemFormProps) {
  const addItem = useGradeStore((s) => s.addItem);
  const nameRef = useRef<HTMLInputElement>(null);

  const today = new Date().toISOString().split("T")[0];
  const [name, setName] = useState("");
  const [earned, setEarned] = useState("");
  const [possible, setPossible] = useState("");
  const [date, setDate] = useState(today);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const earnedNum = parseFloat(earned);
    const possibleNum = parseFloat(possible);

    if (!name.trim()) {
      toast.error("Item name is required");
      return;
    }
    if (isNaN(earnedNum) || earnedNum < 0) {
      toast.error("Score earned must be a non-negative number");
      return;
    }
    if (isNaN(possibleNum) || possibleNum <= 0) {
      toast.error("Score possible must be a positive number");
      return;
    }

    addItem(courseId, categoryId, {
      id: crypto.randomUUID(),
      name: name.trim(),
      scoreEarned: earnedNum,
      scorePossible: possibleNum,
      date,
    });

    setName("");
    setEarned("");
    setPossible("");
    setDate(today);
    nameRef.current?.focus();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-1.5 pt-1 border-t"
    >
      <Input
        ref={nameRef}
        placeholder="Item name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 h-7 text-sm"
      />
      <Input
        type="number"
        placeholder="Earned"
        value={earned}
        onChange={(e) => setEarned(e.target.value)}
        min={0}
        step="any"
        className="w-20 h-7 text-sm"
      />
      <span className="text-muted-foreground text-sm">/</span>
      <Input
        type="number"
        placeholder="Possible"
        value={possible}
        onChange={(e) => setPossible(e.target.value)}
        min={0.01}
        step="any"
        className="w-20 h-7 text-sm"
      />
      <Input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-32 h-7 text-sm"
      />
      <Button type="submit" size="icon-sm" variant="ghost" title="Add item">
        <Plus className="size-4" />
      </Button>
    </form>
  );
}
