"use client";

import { useCallback, useEffect, useState } from "react";

/** Fetch JSON from an Insights route; throws with the server's error text. */
export async function api<T = unknown>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? (init?.body !== undefined ? "POST" : "GET"),
    headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

/** Small data-loading hook: { data, error, loading, reload }. Keeps the
 *  previous data on screen while a reload is in flight. */
export function useApi<T>(url: string | null, body?: unknown) {
  const [tick, setTick] = useState(0);
  const bodyKey = body === undefined ? "" : JSON.stringify(body);
  const key = url ? `${url}\u0000${bodyKey}\u0000${tick}` : null;
  const [state, setState] = useState<{ key: string | null; data: T | null; error: string | null }>({ key: null, data: null, error: null });

  useEffect(() => {
    if (!key || !url) return;
    let cancelled = false;
    api<T>(url, bodyKey ? { body: JSON.parse(bodyKey) } : undefined)
      .then((d) => { if (!cancelled) setState({ key, data: d, error: null }); })
      .catch((e: Error) => { if (!cancelled) setState((s) => ({ key, data: s.data, error: e.message })); });
    return () => { cancelled = true; };
  }, [key, url, bodyKey]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data: state.data, error: state.error, loading: !!key && state.key !== key, reload };
}

export type PublicField = {
  key: string; label: string; type: "string" | "number" | "date" | "boolean";
  dimension: boolean; measurable: boolean; lookup?: "user" | "project"; multi: boolean; values?: string[];
};
export type PublicDataset = {
  key: string; label: string; description: string; unit: string; defaultDate: string; fields: PublicField[];
};
