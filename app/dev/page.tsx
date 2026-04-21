"use client";

import { useState } from "react";

type Role = "user" | "socialworker" | "litigation" | "hr" | "finance" | "admin" | "superadmin";

const ROLES: { role: Role; label: string; home: string; color: string; credentials: string }[] = [
  { role: "user",        label: "Citizen / User",    home: "/user",        color: "bg-blue-500",   credentials: "user@dev.janmanindia.in / Dev@1234" },
  { role: "socialworker",label: "Social Worker",     home: "/socialworker",color: "bg-green-500",  credentials: "sw@dev.janmanindia.in / Dev@1234" },
  { role: "litigation",  label: "Litigation Member", home: "/litigation",  color: "bg-purple-500", credentials: "litigation@dev.janmanindia.in / Dev@1234" },
  { role: "hr",          label: "HR",                home: "/hr",          color: "bg-yellow-500", credentials: "hr@dev.janmanindia.in / Dev@1234" },
  { role: "finance",     label: "Finance",           home: "/finance",     color: "bg-orange-500", credentials: "finance@dev.janmanindia.in / Dev@1234" },
  { role: "admin",       label: "Admin",             home: "/admin",       color: "bg-red-500",    credentials: "admin@dev.janmanindia.in / Dev@1234" },
  { role: "superadmin",  label: "Super Admin",       home: "/superadmin",  color: "bg-gray-800",   credentials: "superadmin@dev.janmanindia.in / Dev@1234" },
];

export default function DevPage() {
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [switching, setSwitching] = useState<Role | null>(null);

  async function seed() {
    setSeeding(true);
    setSeedMsg(null);
    try {
      const res = await fetch("/api/dev/seed", { method: "POST" });
      const data = await res.json();
      setSeedMsg(res.ok ? `✓ ${data.message}` : `✗ ${data.error}`);
    } catch {
      setSeedMsg("✗ Network error");
    } finally {
      setSeeding(false);
    }
  }

  async function switchRole(role: Role, home: string) {
    setSwitching(role);
    try {
      const res = await fetch("/api/dev/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        window.location.href = home;
      } else {
        const d = await res.json();
        alert(d.error ?? "Failed to switch role");
      }
    } catch {
      alert("Network error");
    } finally {
      setSwitching(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-medium mb-4">
            DEV BYPASS — do not use in production
          </div>
          <h1 className="text-3xl font-bold">JanmanIndia Dev Panel</h1>
          <p className="text-gray-400 mt-2 text-sm">
            Instantly switch roles or log in with test credentials. Requires{" "}
            <code className="bg-gray-800 px-1 rounded text-yellow-300">DEV_BYPASS=true</code> in{" "}
            <code className="bg-gray-800 px-1 rounded text-yellow-300">.env.local</code>.
          </p>
        </div>

        {/* Seed DB */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="font-semibold text-lg mb-2">Step 1 — Seed Test Users</h2>
          <p className="text-gray-400 text-sm mb-4">
            Creates one user per role in your MongoDB. Safe to run multiple times (uses upsert).
          </p>
          <button
            onClick={seed}
            disabled={seeding}
            className="px-5 py-2.5 rounded-lg bg-yellow-500 text-black font-semibold text-sm hover:bg-yellow-400 disabled:opacity-50 transition-colors"
          >
            {seeding ? "Seeding…" : "Seed All Test Users"}
          </button>
          {seedMsg && (
            <p className={`mt-3 text-sm font-medium ${seedMsg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>
              {seedMsg}
            </p>
          )}
        </div>

        {/* Role Switcher */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="font-semibold text-lg mb-2">Step 2 — Enter as Role</h2>
          <p className="text-gray-400 text-sm mb-5">
            Sets a <code className="bg-gray-800 px-1 rounded text-yellow-300">dev_role</code> cookie. Proxy mints a real JWT on the next request.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ROLES.map(({ role, label, home, color, credentials }) => (
              <button
                key={role}
                onClick={() => switchRole(role, home)}
                disabled={switching === role}
                className="flex items-center gap-3 p-4 rounded-xl border border-gray-700 hover:border-gray-500 bg-gray-800 hover:bg-gray-750 transition-all text-left group"
              >
                <span className={`w-3 h-3 rounded-full shrink-0 ${color}`} />
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-xs text-gray-500 truncate">{credentials}</p>
                </div>
                <span className="ml-auto text-gray-500 group-hover:text-white text-lg">→</span>
              </button>
            ))}
          </div>
        </div>

        {/* Credentials table */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="font-semibold text-lg mb-4">All Test Credentials (manual login)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800">
                  <th className="text-left pb-2 font-medium">Role</th>
                  <th className="text-left pb-2 font-medium">Email</th>
                  <th className="text-left pb-2 font-medium">Password</th>
                  <th className="text-left pb-2 font-medium">Dashboard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {ROLES.map(({ role, label, home, credentials }) => {
                  const [email, password] = credentials.split(" / ");
                  return (
                    <tr key={role}>
                      <td className="py-2.5 capitalize text-gray-300">{label}</td>
                      <td className="py-2.5 font-mono text-yellow-300 text-xs">{email}</td>
                      <td className="py-2.5 font-mono text-green-300 text-xs">{password}</td>
                      <td className="py-2.5">
                        <a href={home} className="text-blue-400 hover:underline text-xs">{home}</a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600">
          This page is only served when <code>DEV_BYPASS=true</code>. Remove it before shipping to production.
        </p>
      </div>
    </div>
  );
}
