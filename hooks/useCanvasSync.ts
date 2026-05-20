"use client";

import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useCanvasStore } from "@/stores/useCanvasStore";
import { useTodoStore } from "@/stores/useTodoStore";
import { useEventStore } from "@/stores/useEventStore";
import {
  fetchAllUpcoming,
  CanvasAuthError,
  CanvasRateLimitError,
} from "@/lib/canvas";
import type {
  TodoItem,
  TodoPriority,
  EventItem,
  EventType,
  CanvasAssignment,
  CanvasCalendarEvent,
} from "@/types";

function computePriority(dueAt: string | null): TodoPriority {
  if (!dueAt) return "low";
  const now = Date.now();
  const due = new Date(dueAt).getTime();
  const hoursUntil = (due - now) / (1000 * 60 * 60);
  if (hoursUntil < 0 || hoursUntil <= 24) return "high";
  if (hoursUntil <= 72) return "medium";
  return "low";
}

function detectEventType(title: string): EventType {
  const t = title.toLowerCase();
  if (/exam|midterm|final|quiz|test/.test(t)) return "exam";
  if (/assignment|due|deadline|submit/.test(t)) return "assignment";
  return "custom";
}

function parseCourseIdFromContext(contextCode: string): number | null {
  const match = contextCode.match(/^course_(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

function mapAssignmentToTodo(a: CanvasAssignment): TodoItem {
  return {
    id: `canvas-assignment-${a.id}-${a.course_id}`,
    title: a.name,
    description: "",
    priority: computePriority(a.due_at),
    status: "pending",
    dueDate: a.due_at,
    courseId: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
    source: "canvas",
    canvasAssignmentId: a.id,
    canvasCourseId: a.course_id,
    canvasUrl: a.html_url,
  };
}

function mapCalendarToEvent(e: CanvasCalendarEvent): EventItem {
  const courseId = parseCourseIdFromContext(e.context_code);
  const startDate = new Date(e.start_at);
  const endDate = e.end_at ? new Date(e.end_at) : null;

  return {
    id: `canvas-event-${e.id}-${courseId}`,
    title: e.title,
    description: "",
    type: detectEventType(e.title),
    date: startDate.toISOString().split("T")[0],
    time: startDate.toTimeString().slice(0, 5),
    endTime: endDate ? endDate.toTimeString().slice(0, 5) : null,
    allDay: false,
    courseId: null,
    createdAt: new Date().toISOString(),
    source: "canvas",
    canvasEventId: e.id,
    canvasCourseId: courseId,
    canvasUrl: e.html_url,
  };
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useCanvasSync(): void {
  const isConnected = useCanvasStore((s) => s.isConnected);
  const token = useCanvasStore((s) => s.token);
  const baseUrl = useCanvasStore((s) => s.baseUrl);
  const selectedCourseIds = useCanvasStore((s) => s.selectedCourseIds);
  const syncIntervalMinutes = useCanvasStore((s) => s.syncIntervalMinutes);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSyncingRef = useRef(false);

  const syncNow = useCallback(async () => {
    if (!token || !baseUrl || selectedCourseIds.length === 0) return;
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    const maxRetries = 2;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const { assignments, events } = await fetchAllUpcoming(
          { baseUrl, token },
          selectedCourseIds
        );

        // Get current Canvas todos to flag removed ones
        const currentTodos = useTodoStore.getState().items;
        const returnedAssignmentKeys = new Set(
          assignments.map((a) => `${a.id}-${a.course_id}`)
        );
        for (const todo of currentTodos) {
          if (
            todo.source === "canvas" &&
            todo.canvasAssignmentId !== null &&
            todo.canvasCourseId !== null &&
            !returnedAssignmentKeys.has(
              `${todo.canvasAssignmentId}-${todo.canvasCourseId}`
            )
          ) {
            useTodoStore
              .getState()
              .updateTodo(todo.id, { removedFromCanvas: true });
          }
        }

        // Upsert assignments
        for (const a of assignments) {
          useTodoStore.getState().upsertCanvasTodo(mapAssignmentToTodo(a));
        }

        // Get current Canvas events to flag cancelled ones
        const currentEvents = useEventStore.getState().items;
        const returnedEventKeys = new Set(
          events.map((e) => {
            const cid = parseCourseIdFromContext(e.context_code);
            return `${e.id}-${cid}`;
          })
        );
        for (const ev of currentEvents) {
          if (
            ev.source === "canvas" &&
            ev.canvasEventId !== null &&
            ev.canvasCourseId !== null &&
            !returnedEventKeys.has(
              `${ev.canvasEventId}-${ev.canvasCourseId}`
            )
          ) {
            useEventStore
              .getState()
              .updateEvent(ev.id, { cancelledOnCanvas: true });
          }
        }

        // Upsert events
        for (const e of events) {
          useEventStore.getState().upsertCanvasEvent(mapCalendarToEvent(e));
        }

        useCanvasStore
          .getState()
          .setLastSyncedAt(new Date().toISOString());

        isSyncingRef.current = false;
        return;
      } catch (err) {
        if (err instanceof CanvasAuthError) {
          toast.error("Canvas token expired — update it in Settings.");
          isSyncingRef.current = false;
          return;
        }
        if (err instanceof CanvasRateLimitError) {
          toast.error("Canvas rate limit reached — will retry shortly.");
          await delay(err.retryAfter * 1000);
          isSyncingRef.current = false;
          return;
        }
        // Network / other errors
        attempt++;
        if (attempt > maxRetries) {
          toast.error("Canvas sync failed. Will retry at next interval.");
          isSyncingRef.current = false;
          return;
        }
        await delay(5000);
      }
    }

    isSyncingRef.current = false;
  }, [token, baseUrl, selectedCourseIds]);

  useEffect(() => {
    const shouldSync =
      isConnected &&
      !!token &&
      !!baseUrl &&
      selectedCourseIds.length > 0;

    if (!shouldSync) {
      useCanvasStore.getState().setSyncNow(null);
      return;
    }

    // Expose syncNow to the store so settings UI can trigger it
    useCanvasStore.getState().setSyncNow(syncNow);

    // Initial sync after a short delay (let stores hydrate)
    timeoutRef.current = setTimeout(() => {
      syncNow();
    }, 2000);

    // Set up polling if not manual-only (0 means manual)
    if (syncIntervalMinutes > 0) {
      intervalRef.current = setInterval(
        syncNow,
        syncIntervalMinutes * 60 * 1000
      );
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      useCanvasStore.getState().setSyncNow(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, token, baseUrl, syncIntervalMinutes, syncNow]);
}
