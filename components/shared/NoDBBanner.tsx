export default function NoDBBanner() {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-yellow-400/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-300">
      <span className="mt-0.5 shrink-0 text-base">⚠</span>
      <div>
        <p className="font-semibold">Database not connected — showing empty state</p>
        <p className="mt-0.5 text-xs opacity-80">
          Add <code className="rounded bg-yellow-100 px-1 dark:bg-yellow-900">MONGODB_URI</code> to{" "}
          <code className="rounded bg-yellow-100 px-1 dark:bg-yellow-900">.env.local</code> and restart to see live data.
          Visit <a href="/dev" className="underline">/dev</a> to seed test users once connected.
        </p>
      </div>
    </div>
  );
}
