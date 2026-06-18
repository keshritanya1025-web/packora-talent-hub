import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Auto-logout after 5 minutes of user inactivity.
 * A 30-second warning dialog appears before logout so the user can stay signed in.
 */
const IDLE_MS = 5 * 60 * 1000;      // 5 minutes
const WARN_MS = 30 * 1000;          // last 30s as warning
const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "wheel"];

export function IdleLogout() {
  const navigate = useNavigate();
  const [warn, setWarn] = useState(false);
  const [countdown, setCountdown] = useState(Math.floor(WARN_MS / 1000));
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAll = () => {
    if (warnTimer.current) clearTimeout(warnTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    if (tickTimer.current) clearInterval(tickTimer.current);
  };

  const doLogout = async () => {
    clearAll();
    setWarn(false);
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const startTimers = () => {
    clearAll();
    setWarn(false);
    warnTimer.current = setTimeout(() => {
      setWarn(true);
      setCountdown(Math.floor(WARN_MS / 1000));
      tickTimer.current = setInterval(() => {
        setCountdown((c) => (c > 0 ? c - 1 : 0));
      }, 1000);
      logoutTimer.current = setTimeout(doLogout, WARN_MS);
    }, IDLE_MS - WARN_MS);
  };

  const onActivity = () => {
    if (warn) return; // ignore activity while warning is open; user must click Stay signed in
    startTimers();
  };

  useEffect(() => {
    startTimers();
    EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    return () => {
      clearAll();
      EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AlertDialog open={warn} onOpenChange={(o) => !o && startTimers()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you still there?</AlertDialogTitle>
          <AlertDialogDescription>
            You will be signed out in <span className="font-semibold">{countdown}s</span> due to inactivity.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => startTimers()}>Stay signed in</AlertDialogCancel>
          <AlertDialogAction onClick={doLogout}>Sign out now</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
