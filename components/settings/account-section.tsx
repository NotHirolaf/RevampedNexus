"use client";

import { useState } from "react";
import { Cloud, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useMounted } from "@/hooks/use-hydration";
import { isFirebaseEnabled, getFirebaseServices } from "@/lib/firebase";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatSyncTime(date: Date | null): string {
  if (!date) return "Never";
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export function AccountSection() {
  const mounted = useMounted();
  const user = useAuthStore((s) => s.user);
  const syncEnabled = useAuthStore((s) => s.syncEnabled);
  const lastSyncedAt = useAuthStore((s) => s.lastSyncedAt);
  const _syncNow = useAuthStore((s) => s._syncNow);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const toggleSync = useAuthStore((s) => s.toggleSync);

  const [deletingCloud, setDeletingCloud] = useState(false);

  // Guard against hydration mismatch.
  if (!mounted) return null;

  // ── Firebase not configured ──────────────────────────────────────────────
  if (!isFirebaseEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account &amp; Sync</CardTitle>
          <CardDescription>
            Cloud sync is not configured for this deployment.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // ── Not signed in ─────────────────────────────────────────────────────────
  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account &amp; Sync</CardTitle>
          <CardDescription>
            Sign in to sync your data across devices. Nexus works fully offline
            without an account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={signInWithGoogle} className="gap-2">
            <Cloud className="size-4" />
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Signed in ─────────────────────────────────────────────────────────────
  async function handleDeleteCloudData() {
    if (!user) return;
    setDeletingCloud(true);
    try {
      const { db } = await getFirebaseServices();
      if (!db) throw new Error("Firestore not available");

      const { collection, getDocs, deleteDoc } = await import(
        "firebase/firestore"
      );
      const dataCol = collection(db, "users", user.uid, "data");
      const snaps = await getDocs(dataCol);
      await Promise.all(snaps.docs.map((d) => deleteDoc(d.ref)));
      toast.success("Cloud data deleted");
    } catch {
      toast.error("Failed to delete cloud data");
    } finally {
      setDeletingCloud(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Account card ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Account &amp; Sync</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Profile row */}
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              {user.photoURL && (
                <AvatarImage
                  src={user.photoURL}
                  alt={user.displayName ?? "Profile photo"}
                />
              )}
              <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium truncate">
                {user.displayName ?? "Google User"}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </div>

          <Separator />

          {/* Sync toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Cloud Sync</p>
              <p className="text-xs text-muted-foreground">
                Last synced: {formatSyncTime(lastSyncedAt)}
              </p>
            </div>
            <Switch
              checked={syncEnabled}
              onCheckedChange={toggleSync}
              aria-label="Toggle cloud sync"
            />
          </div>

          {/* Sync now */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2 w-full sm:w-auto"
            onClick={() => _syncNow?.()}
            disabled={!syncEnabled || !_syncNow}
          >
            <RefreshCw className="size-4" />
            Sync Now
          </Button>
        </CardContent>
      </Card>

      {/* ── Cloud data / danger zone ──────────────────────────────────────── */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Cloud Data</CardTitle>
          <CardDescription>
            Permanently delete all data stored in the cloud. Your local data is
            unaffected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="destructive" disabled={deletingCloud} className="gap-2" />
              }
            >
              <Trash2 className="size-4" />
              Delete Cloud Data
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete cloud data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes your synced data from the cloud. Your
                  local data stays intact but will not be backed up until you
                  sync again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleDeleteCloudData}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
