/**
 * Custom Hooks
 * ────────────
 * Reusable hooks for data fetching, debouncing, and UI patterns.
 * These hooks are designed to work with the API client layer.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { ApiResponse } from "../types/api";
import { apiClient } from "./api-client";
import { setNotifications } from "./store";
import { toast } from "sonner";

// ── useAsync: Generic async operation hook ──

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useAsync<T>(
  asyncFn: () => Promise<ApiResponse<T>>,
  deps: any[] = [],
  immediate = true
) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const execute = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const result = await asyncFn();
      if (result.success) {
        setState({ data: result.data, loading: false, error: null });
      } else {
        setState({ data: null, loading: false, error: result.message || "Request failed" });
      }
    } catch (err) {
      setState({ data: null, loading: false, error: (err as Error).message });
    }
  }, deps);

  useEffect(() => {
    if (immediate) execute();
  }, [execute, immediate]);

  return { ...state, refetch: execute };
}

// ── useDebounce: Debounce a value (for search inputs) ──

export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

// ── useLocalStorage: In-memory state helper ──

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  return [value, setValue];
}

// ── useMediaQuery: Responsive breakpoint hook ──

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

export const useIsMobile = () => useMediaQuery("(max-width: 767px)");
export const useIsTablet = () => useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");

// ── useClickOutside: Close dropdowns/modals on outside click ──

export function useClickOutside(ref: React.RefObject<HTMLElement | null>, callback: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        callback();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, callback]);
}

// ── usePagination: Client-side pagination ──

interface PaginationOptions {
  pageSize?: number;
}

export function usePagination<T>(items: T[], options: PaginationOptions = {}) {
  const { pageSize = 10 } = options;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Reset to page 1 when items change
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [items.length, totalPages]);

  const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);

  return {
    items: paginatedItems,
    page,
    totalPages,
    total: items.length,
    setPage,
    nextPage: () => setPage((p) => Math.min(p + 1, totalPages)),
    prevPage: () => setPage((p) => Math.max(p - 1, 1)),
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

// ── useToastAction: Execute async action with toast feedback ──

import { toast } from "sonner";

export function useToastAction() {
  const [loading, setLoading] = useState(false);

  const execute = useCallback(
    async <T>(
      action: () => Promise<ApiResponse<T>>,
      options?: { successMessage?: string; errorMessage?: string }
    ): Promise<ApiResponse<T> | null> => {
      setLoading(true);
      try {
        const result = await action();
        if (result.success) {
          toast.success(options?.successMessage || result.message || "Action completed");
        } else {
          toast.error(options?.errorMessage || result.message || "Action failed");
        }
        return result;
      } catch (err) {
        toast.error(options?.errorMessage || (err as Error).message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { execute, loading };
}

// ── usePolling: Background interval that pauses when tab is hidden ──

export function usePolling(
  callback: () => void | Promise<void>,
  intervalMs: number,
  enabled = true
) {
  const callbackRef = useRef(callback);
  useEffect(() => { callbackRef.current = callback; }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    // Run immediately on mount
    callbackRef.current();

    const tick = () => {
      if (document.visibilityState === "visible") {
        callbackRef.current();
      }
    };

    const id = setInterval(tick, intervalMs);

    // When the tab becomes visible again, fire immediately instead of waiting
    const onVisible = () => {
      if (document.visibilityState === "visible") callbackRef.current();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs, enabled]);
}

// ── useNotifications: Poll API → sync store → fire toasts for new items ──

export function useNotifications(enabled = true) {
  const seenIdsRef = useRef<Set<string>>(new Set());
  const isFirstFetchRef = useRef(true);

  const fetchAndSync = useCallback(async () => {
    try {
      const res = await apiClient.getNotifications();
      if (!res.success || !Array.isArray(res.data)) return;

      const incoming = res.data as any[];
      const normalised = incoming.map((n: any) => ({
        id: String(n.id),
        type: n.type ?? "system",
        title: n.title ?? n.subject ?? "Notification",
        message: n.message ?? n.body ?? "",
        read: Boolean(n.read ?? n.is_read),
        timestamp: n.timestamp ?? n.created_at ?? new Date().toISOString(),
      }));

      // Detect genuinely new (not-yet-seen) unread notifications
      const newUnread = normalised.filter(
        (n) => !n.read && !seenIdsRef.current.has(n.id)
      );

      // Update the store (this triggers badge + panel reactivity)
      setNotifications(normalised);

      // Fire toast for each new unread item — but skip on first load
      if (!isFirstFetchRef.current && newUnread.length > 0) {
        newUnread.slice(0, 3).forEach((n) => {
          const toastFn = n.type === "escalation" ? toast.error : toast;
          toastFn(n.title, {
            description: n.message,
            duration: 5000,
          });
        });
        if (newUnread.length > 3) {
          toast(`+${newUnread.length - 3} more notifications`, { duration: 4000 });
        }
      }

      // Mark all current IDs as seen
      seenIdsRef.current = new Set(normalised.map((n) => n.id));
      isFirstFetchRef.current = false;
    } catch {
      // Silent failure — stale data is shown, app continues working
    }
  }, []);

  usePolling(fetchAndSync, 30_000, enabled);

  return {
    refetch: fetchAndSync,
  };
}
