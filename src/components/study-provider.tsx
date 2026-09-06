"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BrowserRepository, STORAGE_KEY } from "@/lib/storage/browser";
import { RemoteRepository } from "@/lib/storage/remote";
import type { StudyAction, StudyState } from "@/lib/study/types";

interface StudyContextValue {
  state: StudyState | null;
  now: Date;
  error: string | null;
  busy: boolean;
  mode: "browser" | "database";
  dispatch: (action: StudyAction) => Promise<StudyState | null>;
  reload: () => Promise<void>;
}
const StudyContext = createContext<StudyContextValue | null>(null);

export function StudyProvider({
  children,
  mode,
}: {
  children: ReactNode;
  mode: "browser" | "database";
}) {
  const repository = useMemo(
    () =>
      mode === "database" ? new RemoteRepository() : new BrowserRepository(),
    [mode],
  );
  const [state, setState] = useState<StudyState | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const reload = useCallback(async () => {
    try {
      setState(await repository.load());
      setError(null);
      setNow(new Date());
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Couldn’t load your progress.",
      );
    }
  }, [repository]);

  useEffect(() => {
    if (window.location.pathname === "/guest") return;
    let active = true;
    repository.load().then(
      (next) => {
        if (active) {
          setState(next);
          setError(null);
          setNow(new Date());
        }
      },
      (error: unknown) => {
        if (active)
          setError(
            error instanceof Error
              ? error.message
              : "Couldn’t load your progress.",
          );
      },
    );
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) void reload();
    };
    const onFocus = () => {
      if (!inFlight.current) void reload();
    };
    const timer = setInterval(() => setNow(new Date()), 60_000);
    window.addEventListener("storage", sync);
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", onFocus);
      clearInterval(timer);
    };
  }, [reload, repository]);

  const dispatch = useCallback(
    async (action: StudyAction) => {
      if (inFlight.current) return null;
      inFlight.current = true;
      setBusy(true);
      setError(null);
      try {
        const next = await repository.dispatch(action);
        setState(next);
        setNow(new Date());
        return next;
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Your change couldn’t be saved. Please try again.",
        );
        return null;
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [repository],
  );

  return (
    <StudyContext.Provider
      value={{ state, now, error, busy, mode, dispatch, reload }}
    >
      {children}
    </StudyContext.Provider>
  );
}

export function useStudy() {
  const value = useContext(StudyContext);
  if (!value) throw new Error("useStudy must be used inside StudyProvider.");
  return value;
}
