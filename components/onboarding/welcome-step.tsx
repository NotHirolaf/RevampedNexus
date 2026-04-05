"use client";

import { useEffect, useState } from "react";
import { GraduationCap, CheckSquare, CalendarDays, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { Logo } from "@/components/layout/logo";
import { isFirebaseEnabled } from "@/lib/firebase";
import { useAuthStore } from "@/stores/useAuthStore";

interface WelcomeStepProps {
  onNext: () => void;
}

const FEATURES = [
  { icon: GraduationCap, label: "Track Grades",  desc: "GPA & course tracking" },
  { icon: CheckSquare,   label: "Manage Tasks",   desc: "To-dos & priorities" },
  { icon: CalendarDays,  label: "Plan Schedule",  desc: "Timetables & events" },
] as const;

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  const [signingIn, setSigningIn] = useState(false);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const user = useAuthStore((s) => s.user);
  const error = useAuthStore((s) => s.error);

  // Advance to the next step as soon as sign-in succeeds.
  useEffect(() => {
    if (user) {
      onNext();
    }
  }, [user, onNext]);

  async function handleGoogleSignIn() {
    setSigningIn(true);
    await signInWithGoogle();
    setSigningIn(false); // Only reaches here if sign-in failed/cancelled.
  }

  return (
    <div className="flex flex-col items-center text-center gap-6">
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <Logo variant="mark" className="!size-20" />
      </motion.div>

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Welcome to Nexus</h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Your university life, organized. Sign in to sync your data across devices.
        </p>
      </motion.div>

      {/* Google sign-in button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.35 }}
        className="w-full max-w-xs space-y-3"
      >
        <button
          type="button"
          onClick={isFirebaseEnabled ? handleGoogleSignIn : undefined}
          disabled={!isFirebaseEnabled || signingIn}
          className="w-full flex items-center justify-center gap-3 h-11 rounded-full border border-border bg-white dark:bg-white/10 text-sm font-medium text-foreground shadow-sm hover:shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-60"
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

        {/* Error feedback */}
        {error && !signingIn && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        {!isFirebaseEnabled && (
          <p className="text-[11px] text-muted-foreground">Sign-in not available in this build</p>
        )}
      </motion.div>

      {/* Divider */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="flex items-center gap-4 w-full max-w-xs"
      >
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="flex-1 h-px bg-border" />
      </motion.div>

      {/* Continue without account */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.35 }}
        className="w-full max-w-xs"
      >
        <Button
          size="lg"
          onClick={onNext}
          className="w-full rounded-full h-11 text-sm font-medium shadow-sm"
        >
          Continue without account
        </Button>
      </motion.div>

      {/* Features row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex gap-4 w-full pt-2"
      >
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 + i * 0.08, duration: 0.3 }}
            className="flex flex-col items-center gap-1.5 flex-1"
          >
            <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 dark:bg-primary/20">
              <f.icon className="size-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-foreground">{f.label}</span>
            <span className="text-[10px] text-muted-foreground leading-tight">{f.desc}</span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
