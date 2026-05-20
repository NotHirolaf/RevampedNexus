"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useModuleStore } from "@/stores/module-store";
import { useProfileStore } from "@/stores/profile-store";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useThemeStore } from "@/stores/theme-store";
import { useTodoStore } from "@/stores/useTodoStore";
import { useEventStore } from "@/stores/useEventStore";
import { useTimetableStore } from "@/stores/useTimetableStore";
import { useGradeStore } from "@/stores/useGradeStore";
import { useGPAStore } from "@/stores/useGPAStore";
import { usePomodoroStore } from "@/stores/usePomodoroStore";
import { useLinkStore } from "@/stores/useLinkStore";
import { useHabitStore } from "@/stores/useHabitStore";
import { useCanvasStore } from "@/stores/useCanvasStore";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { toast } from "sonner";
import type { ExportData } from "@/types";

export function DataSection() {
  const router = useRouter();
  const [deleteInput, setDeleteInput] = useState("");
  const [importPreview, setImportPreview] = useState<ExportData | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const canvasState = useCanvasStore.getState();
    const data: ExportData = {
      version: "3.0.0",
      timestamp: new Date().toISOString(),
      modules: useModuleStore.getState().enabledModules,
      profile: {
        displayName: useProfileStore.getState().displayName,
        university: useProfileStore.getState().university,
        semester: useProfileStore.getState().semester,
        gpaScale: useProfileStore.getState().gpaScale,
        customGpaMax: useProfileStore.getState().customGpaMax,
        creditsObtained: useProfileStore.getState().creditsObtained,
        creditsRequired: useProfileStore.getState().creditsRequired,
      },
      onboarding: { completed: useOnboardingStore.getState().completed },
      theme: { accentColor: useThemeStore.getState().accentColor },
      todos: useTodoStore.getState().items,
      events: useEventStore.getState().items as ExportData["events"],
      timetable: useTimetableStore.getState().entries,
      courses: useGradeStore.getState().courses,
      gpaData: { baseCGPA: useGPAStore.getState().baseCGPA, baseCredits: useGPAStore.getState().baseCredits, semesterUpdates: useGPAStore.getState().semesterUpdates },
      pomodoroSessions: usePomodoroStore.getState().sessions,
      pomodoroSettings: usePomodoroStore.getState().settings,
      links: useLinkStore.getState().links as unknown as ExportData["links"],
      habits: useHabitStore.getState().habits,
      canvasConfig: canvasState.baseUrl
        ? {
            baseUrl: canvasState.baseUrl,
            selectedCourseIds: canvasState.selectedCourseIds,
            syncIntervalMinutes: canvasState.syncIntervalMinutes,
          }
        : undefined,
      dashboardLayout: {
        widgetOrder: useDashboardStore.getState().widgetOrder,
        hiddenWidgets: useDashboardStore.getState().hiddenWidgets,
      },
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().split("T")[0];
    a.href = url;
    a.download = `nexus-backup-${date}-v3.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported successfully");
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as ExportData;
        // Basic validation
        if (!data.version || !data.modules || !data.profile) {
          toast.error("Invalid backup file format");
          return;
        }
        setImportPreview(data);
        setShowImportDialog(true);
      } catch {
        toast.error("Failed to parse backup file");
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  }

  function handleImport() {
    if (!importPreview) return;

    try {
      if (importPreview.modules) {
        useModuleStore.getState().setModules(importPreview.modules);
      }
      if (importPreview.profile) {
        useProfileStore.getState().updateProfile(importPreview.profile);
      }
      if (importPreview.onboarding?.completed !== undefined) {
        if (importPreview.onboarding.completed) {
          useOnboardingStore.getState().completeOnboarding();
        }
      }
      if (importPreview.theme?.accentColor) {
        useThemeStore.getState().setAccentColor(importPreview.theme.accentColor);
      }
      // v2 fields
      if (importPreview.todos) {
        useTodoStore.getState().setTodos(importPreview.todos);
      }
      if (importPreview.events) {
        useEventStore.getState().setEvents(importPreview.events);
      }
      if (importPreview.timetable) {
        useTimetableStore.getState().setEntries(importPreview.timetable);
      }
      if (importPreview.courses) {
        useGradeStore.getState().setCourses(importPreview.courses);
      }
      if (importPreview.gpaData) {
        const d = importPreview.gpaData;
        useGPAStore.getState().setBase(d.baseCGPA ?? null, d.baseCredits ?? 0);
        if (d.semesterUpdates) useGPAStore.getState().setSemesterUpdates(d.semesterUpdates);
      }
      if (importPreview.pomodoroSessions) {
        usePomodoroStore.getState().setSessions(importPreview.pomodoroSessions);
      }
      if (importPreview.pomodoroSettings) {
        usePomodoroStore.getState().setSettings(importPreview.pomodoroSettings);
      }
      if (importPreview.links) {
        useLinkStore.getState().setLinks(importPreview.links);
      }
      if (importPreview.habits) {
        useHabitStore.getState().setHabits(importPreview.habits);
      }
      if (importPreview.canvasConfig) {
        useCanvasStore.getState().setSelectedCourses(importPreview.canvasConfig.selectedCourseIds);
        useCanvasStore.getState().setSyncInterval(importPreview.canvasConfig.syncIntervalMinutes);
      }
      if (importPreview.dashboardLayout) {
        if (importPreview.dashboardLayout.widgetOrder) useDashboardStore.getState().setWidgetOrder(importPreview.dashboardLayout.widgetOrder);
        if (importPreview.dashboardLayout.hiddenWidgets) useDashboardStore.getState().setHiddenWidgets(importPreview.dashboardLayout.hiddenWidgets);
      }

      toast.success("Data imported successfully");
      setShowImportDialog(false);
      setImportPreview(null);
    } catch {
      toast.error("Failed to import data");
    }
  }

  function handleClearAll() {
    if (deleteInput !== "DELETE") return;

    // Clear all nexus:* keys from localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("nexus:")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    // Reset all stores
    useModuleStore.getState().resetToDefaults();
    useProfileStore.getState().resetProfile();
    useOnboardingStore.getState().resetOnboarding();
    useThemeStore.getState().resetTheme();
    useDashboardStore.getState().resetDashboard();

    setDeleteInput("");
    toast.success("All data cleared");
    router.replace("/onboarding");
  }

  return (
    <div className="space-y-6">
      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle>Export data</CardTitle>
          <CardDescription>
            Download all your Nexus data as a JSON file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="size-4" />
            Export All Data
          </Button>
        </CardContent>
      </Card>

      {/* Import */}
      <Card>
        <CardHeader>
          <CardTitle>Import data</CardTitle>
          <CardDescription>
            Restore from a previously exported backup file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="gap-2"
          >
            <Upload className="size-4" />
            Import Data
          </Button>
        </CardContent>
      </Card>

      {/* Import preview dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import data</DialogTitle>
            <DialogDescription>
              This will overwrite your current data with the backup.
            </DialogDescription>
          </DialogHeader>
          {importPreview && (
            <div className="text-sm space-y-2 rounded-lg bg-muted p-3">
              <p>
                <strong>Backup date:</strong>{" "}
                {new Date(importPreview.timestamp).toLocaleDateString()}
              </p>
              <p>
                <strong>Version:</strong> {importPreview.version}
              </p>
              <p>
                <strong>Modules enabled:</strong>{" "}
                {Object.values(importPreview.modules).filter(Boolean).length}
              </p>
              <p>
                <strong>Profile name:</strong>{" "}
                {importPreview.profile.displayName || "(empty)"}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport}>Confirm Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear All */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Permanently delete all your Nexus data. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button variant="destructive" className="gap-2" />}
            >
              <Trash2 className="size-4" />
              Clear All Data
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all your data and reset the app.
                  Type <strong>DELETE</strong> below to confirm.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input
                placeholder='Type "DELETE" to confirm'
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                className="my-2"
              />
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteInput("")}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearAll}
                  disabled={deleteInput !== "DELETE"}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
