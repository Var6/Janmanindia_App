"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEMO_ACCOUNTS } from "@/data/janman";

type SessionProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string;
  password: string;
  about: string;
  assignedLawyer?: string;
  assignedParalegal?: string;
  nextCourtDate?: string;
  nextAction?: string;
};

type SessionContextType = {
  user: SessionProfile | null;
  login: (identifier: string, password: string) => boolean;
  logout: () => void;
  updateProfile: (updates: Partial<SessionProfile>) => void;
};

const SessionContext = createContext<SessionContextType>({
  user: null,
  login: () => false,
  logout: () => {},
  updateProfile: () => {},
});

export function useSession() {
  return useContext(SessionContext);
}

const SESSION_KEY = "janman-session";

function createProfile(account: (typeof DEMO_ACCOUNTS)[number]): SessionProfile {
  return {
    id: account.id,
    name: account.name,
    email: account.id,
    role: account.role,
    password: account.password,
    about: "A committed member of the Janman platform.",
    avatarUrl: `https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=240&q=80`,
    assignedLawyer: account.role === "Public / Citizen" ? "Advocate Rajesh Kumar" : undefined,
    assignedParalegal: account.role === "Public / Citizen" ? "Paralegal Sunita Devi" : undefined,
    nextCourtDate: account.role === "Public / Citizen" ? "2025-04-24" : undefined,
    nextAction: account.role === "Public / Citizen" ? "Upload affidavit draft" : undefined,
  };
}

export default function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionProfile | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(SESSION_KEY);
    if (!stored) return;
    try {
      setUser(JSON.parse(stored));
    } catch {
      window.localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (user) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(SESSION_KEY);
    }
  }, [user]);

  function login(identifier: string, password: string) {
    const trimmedId = identifier.trim().toLowerCase();
    const account = DEMO_ACCOUNTS.find(
      (item) => item.id === trimmedId && item.password === password,
    );

    if (!account) {
      return false;
    }

    setUser(createProfile(account));
    return true;
  }

  function logout() {
    setUser(null);
  }

  function updateProfile(updates: Partial<SessionProfile>) {
    setUser((current) => {
      if (!current) return current;
      return { ...current, ...updates };
    });
  }

  const value = useMemo(
    () => ({ user, login, logout, updateProfile }),
    [user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
