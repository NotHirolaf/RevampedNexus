"use client";

import { useState } from "react";
import { RefreshCw, Trash2, Loader2, LogOut } from "lucide-react";
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
import { useRouter } from "next/navigation";
import { useMounted } from "@/hooks/use-hydration";
import { isFirebaseEnabled, getFirebaseServices } from "@/lib/firebase";
import { useAuthStore } from "@/stores/useAuthStore";
import { useOnboardingStore } from "@/stores/onboarding-store";
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
  const router = useRouter();
  const mounted = useMounted();
  const user = useAuthStore((s) => s.user);
  const syncEnabled = useAuthStore((s) => s.syncEnabled);
  const lastSyncedAt = useAuthStore((s) => s.lastSyncedAt);
  const _syncNow = useAuthStore((s) => s._syncNow);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signOut = useAuthStore((s) => s.signOut);
  const toggleSync = useAuthStore((s) => s.toggleSync);
  const resetOnboarding = useOnboardingStore((s) => s.resetOnboarding);

  const [deletingCloud, setDeletingCloud] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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
          <button
            type="button"
            disabled={signingIn}
            onClick={async () => {
              setSigningIn(true);
              await signInWithGoogle();
              setSigningIn(false);
            }}
            className="flex items-center justify-center gap-3 h-11 px-6 rounded-full border border-border bg-white dark:bg-white/10 text-sm font-medium text-foreground shadow-sm hover:shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-60"
          >
            {signingIn ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : (
              <svg className="size-5 shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            {signingIn ? "Signing in…" : "Sign in with Google"}
          </button>
        </CardContent>
      </Card>
    );
  }

  // ── Signed in ─────────────────────────────────────────────────────────────
  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    resetOnboarding();
    router.replace("/onboarding");
  }

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

          <Separator />

          {/* Sign out */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2 w-full sm:w-auto text-destructive hover:text-destructive border-destructive/40 hover:border-destructive/60 hover:bg-destructive/5"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
            {signingOut ? "Signing out…" : "Sign Out"}
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
