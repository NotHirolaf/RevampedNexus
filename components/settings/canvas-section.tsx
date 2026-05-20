"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Unplug,
  Wifi,
  Shield,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useCanvasStore } from "@/stores/useCanvasStore";
import { fetchProfile, fetchCourses } from "@/lib/canvas";
import { toast } from "sonner";

const COMMON_URLS = [
  { label: "UofT Quercus", value: "https://q.utoronto.ca" },
  { label: "UBC Canvas", value: "https://canvas.ubc.ca" },
  { label: "Oxford Canvas", value: "https://canvas.ox.ac.uk" },
  { label: "Harvard Canvas", value: "https://canvas.harvard.edu" },
  { label: "Custom URL", value: "__custom__" },
];

const SYNC_INTERVALS = [
  { label: "15 minutes", value: "15" },
  { label: "30 minutes", value: "30" },
  { label: "1 hour", value: "60" },
  { label: "Manual only", value: "0" },
];

export function CanvasSection() {
  const store = useCanvasStore();
  const [urlSelection, setUrlSelection] = useState("__custom__");
  const [customUrl, setCustomUrl] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const resolvedUrl =
    urlSelection === "__custom__" ? customUrl : urlSelection;

  async function handleConnect() {
    if (!resolvedUrl || !tokenInput) {
      setError("Please enter both a Canvas URL and access token.");
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const profile = await fetchProfile({
        baseUrl: resolvedUrl,
        token: tokenInput,
      });

      store.connect(resolvedUrl, tokenInput, profile.name || profile.short_name);

      const courses = await fetchCourses({
        baseUrl: resolvedUrl,
        token: tokenInput,
      });
      store.setCourses(courses);
      store.setSelectedCourses(courses.map((c) => c.id));

      toast.success(`Connected to Canvas as ${profile.name || profile.short_name}`);
      setTokenInput("");
    } catch {
      setError(
        "Could not connect to Canvas. Check your institution URL and access token."
      );
    } finally {
      setConnecting(false);
    }
  }

  function handleDisconnect() {
    store.disconnect();
    setTokenInput("");
    setCustomUrl("");
    setUrlSelection("__custom__");
    toast.success("Disconnected from Canvas");
  }

  function handleCourseToggle(courseId: number) {
    const current = store.selectedCourseIds;
    if (current.includes(courseId)) {
      store.setSelectedCourses(current.filter((id) => id !== courseId));
    } else {
      store.setSelectedCourses([...current, courseId]);
    }
  }

  async function handleSyncNow() {
    if (!store._syncNow) return;
    setSyncing(true);
    try {
      await store._syncNow();
      toast.success("Canvas sync complete");
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  // ─── Not Connected ──────────────────────────────────────────────────

  if (!store.isConnected) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Canvas LMS</CardTitle>
            <CardDescription>
              Connect your Canvas account to automatically sync assignments and
              calendar events into Nexus.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Base URL */}
            <div className="space-y-2">
              <Label>Canvas Institution URL</Label>
              <Select value={urlSelection} onValueChange={(v) => { if (v) setUrlSelection(v); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your institution" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_URLS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {urlSelection === "__custom__" && (
                <Input
                  placeholder="https://yourschool.instructure.com"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                />
              )}
            </div>

            {/* Token */}
            <div className="space-y-2">
              <Label>Access Token</Label>
              <div className="relative">
                <Input
                  type={showToken ? "text" : "password"}
                  placeholder="Paste your Canvas access token"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showToken ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              onClick={handleConnect}
              disabled={connecting || !resolvedUrl || !tokenInput}
              className="gap-2"
            >
              {connecting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Wifi className="size-4" />
              )}
              {connecting ? "Connecting..." : "Connect"}
            </Button>

            {/* Token guide */}
            <div className="border rounded-lg">
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="flex items-center justify-between w-full p-3 text-sm font-medium text-left hover:bg-accent/50 rounded-lg"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle className="size-4" />
                  How to generate a Canvas access token
                </span>
                {showGuide ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </button>
              {showGuide && (
                <div className="px-3 pb-3 text-sm text-muted-foreground space-y-2">
                  <ol className="list-decimal list-inside space-y-1.5">
                    <li>Log in to your Canvas/Quercus instance</li>
                    <li>
                      Go to <strong>Account</strong> &rarr;{" "}
                      <strong>Settings</strong>
                    </li>
                    <li>
                      Scroll to &ldquo;Approved Integrations&rdquo; &rarr; click{" "}
                      <strong>+ New Access Token</strong>
                    </li>
                    <li>
                      Enter a purpose (e.g. &ldquo;Nexus&rdquo;) and click{" "}
                      <strong>Generate Token</strong>
                    </li>
                    <li>
                      Copy the token immediately &mdash; it won&apos;t be shown
                      again
                    </li>
                    <li>Paste it in the field above</li>
                  </ol>
                </div>
              )}
            </div>

            {/* Privacy note */}
            <div className="border rounded-lg">
              <button
                type="button"
                onClick={() => setShowPrivacy(!showPrivacy)}
                className="flex items-center justify-between w-full p-3 text-sm font-medium text-left hover:bg-accent/50 rounded-lg"
              >
                <span className="flex items-center gap-2">
                  <Shield className="size-4" />
                  Privacy &amp; security
                </span>
                {showPrivacy ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </button>
              {showPrivacy && (
                <p className="px-3 pb-3 text-sm text-muted-foreground">
                  Your Canvas token is stored only on your device and never
                  shared with any third party. It is sent directly to your
                  Canvas instance through a secure proxy. You can revoke the
                  token at any time from your Canvas settings.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Connected ────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Connection status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Canvas LMS</CardTitle>
              <CardDescription>
                Connected to {store.baseUrl}
              </CardDescription>
            </div>
            <Badge variant="default" className="gap-1.5">
              <Check className="size-3" />
              Connected
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {store.displayName && (
            <p className="text-sm text-muted-foreground">
              Signed in as <strong>{store.displayName}</strong>
            </p>
          )}
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button variant="outline" size="sm" className="gap-2" />}
            >
              <Unplug className="size-4" />
              Disconnect
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect from Canvas?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove your Canvas connection and stop syncing.
                  Your existing synced data will remain in Nexus.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDisconnect}>
                  Disconnect
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Course selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Courses</CardTitle>
              <CardDescription>
                Select which courses to sync with Nexus
              </CardDescription>
            </div>
            <Badge variant="secondary">
              {store.selectedCourseIds.length} of {store.courses.length}{" "}
              selected
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                store.setSelectedCourses(store.courses.map((c) => c.id))
              }
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => store.setSelectedCourses([])}
            >
              Deselect All
            </Button>
          </div>
          <div className="space-y-2">
            {store.courses.map((course) => (
              <label
                key={course.id}
                className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors"
              >
                <Checkbox
                  checked={store.selectedCourseIds.includes(course.id)}
                  onCheckedChange={() => handleCourseToggle(course.id)}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{course.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {course.course_code}
                  </p>
                </div>
              </label>
            ))}
            {store.courses.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">
                No active courses found.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sync settings */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Settings</CardTitle>
          <CardDescription>
            Control how often Nexus syncs with Canvas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Sync Interval</Label>
            <Select
              value={String(store.syncIntervalMinutes)}
              onValueChange={(v) => { if (v) store.setSyncInterval(parseInt(v, 10)); }}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SYNC_INTERVALS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleSyncNow}
              disabled={syncing || !store._syncNow}
            >
              {syncing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Sync Now
            </Button>
            <span className="text-xs text-muted-foreground">
              {store.lastSyncedAt
                ? `Last synced: ${new Date(store.lastSyncedAt).toLocaleString()}`
                : "Never synced"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
