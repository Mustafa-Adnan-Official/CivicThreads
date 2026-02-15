"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_CITY_ID } from "@/lib/constants";
import { auth as fbAuth, db as fbDb } from "@/lib/firebaseClient";

interface WardRow {
  wardId: string;
  wardName: string;
  wardRepEmail?: string | null;
  repUid?: string | null;
}

export default function AdminPage() {
  const { user, firebaseUser, signOut, isLoading } = useAuth();
  const router = useRouter();

  // Read cityId from user doc (set during admin signup)
  const cityId = user?.cityId ?? DEFAULT_CITY_ID;
  const [cityName, setCityName] = useState(cityId);

  const [wards, setWards] = useState<WardRow[]>([]);
  const [loadingWards, setLoadingWards] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // New ward form
  const [newWardId, setNewWardId] = useState("");
  const [newWardName, setNewWardName] = useState("");
  const [newRepEmail, setNewRepEmail] = useState("");

  // Load city display name
  useEffect(() => {
    const d = fbDb;
    if (!d || !cityId) return;
    import("firebase/firestore").then(({ doc: docRef, getDoc: getDocSnap }) => {
      getDocSnap(docRef(d, "cities", cityId)).then((snap) => {
        if (snap.exists() && snap.data().cityName) setCityName(snap.data().cityName as string);
      }).catch(() => {});
    });
  }, [cityId]);

  // Auth guard
  useEffect(() => {
    if (isLoading) return;
    if (!firebaseUser || !firebaseUser.emailVerified) { router.replace("/admin-login"); return; }
    if (!user) return; // wait for profile
    if (user.role !== "CITY_ADMIN") { router.replace("/dashboard"); return; }
  }, [isLoading, firebaseUser, user, router]);

  const fetchWards = useCallback(async () => {
    if (!fbAuth?.currentUser) return;
    setLoadingWards(true);
    try {
      const token = await fbAuth.currentUser.getIdToken();
      const res = await fetch(`/api/admin-wards?cityId=${cityId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load wards");
      const data = await res.json();
      setWards(
        (data.wards as WardRow[]).sort((a, b) => a.wardName.localeCompare(b.wardName))
      );
    } catch (e) {
      setError("Failed to load wards.");
      console.error(e);
    } finally {
      setLoadingWards(false);
    }
  }, [cityId]);

  useEffect(() => {
    if (!user || user.role !== "CITY_ADMIN") return;
    fetchWards();
  }, [user, fetchWards]);

  async function handleAddWard(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!newWardId.trim() || !newWardName.trim()) { setError("Ward ID and name required."); return; }
    setSaving(true);
    try {
      const token = await fbAuth!.currentUser!.getIdToken();
      const res = await fetch("/api/admin-wards", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          cityId,
          wardId: newWardId.trim().toLowerCase().replace(/\s+/g, "-"),
          wardName: newWardName.trim(),
          wardRepEmail: newRepEmail.trim() || null,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as {error?:string}).error ?? "Failed"); }
      setNewWardId(""); setNewWardName(""); setNewRepEmail("");
      setSuccess("Ward saved!");
      await fetchWards();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateRepEmail(wardId: string, email: string) {
    setError(""); setSuccess("");
    setSaving(true);
    try {
      const ward = wards.find((w) => w.wardId === wardId);
      const token = await fbAuth!.currentUser!.getIdToken();
      const res = await fetch("/api/admin-wards", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          cityId,
          wardId,
          wardName: ward?.wardName ?? wardId,
          wardRepEmail: email.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setSuccess("Rep email updated!");
      await fetchWards();
    } catch {
      setError("Failed to update rep email.");
    } finally {
      setSaving(false);
    }
  }

  // Loading states
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><p className="text-zinc-500">Loading…</p></div>;
  if (!firebaseUser || !firebaseUser.emailVerified) return null;
  if (!user) return <div className="min-h-screen flex items-center justify-center"><p className="text-zinc-500">Loading profile…</p></div>;
  if (user.role !== "CITY_ADMIN") return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Simple header */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-6 py-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm shadow-sm border-b border-zinc-200 dark:border-zinc-800">
        <Link href="/admin" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">CivicThreads Admin</Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-500">{user.accountName}</span>
          <button onClick={() => { signOut(); router.replace("/admin-login"); }}
            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">Sign out</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* City info (immutable) */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">City: {cityName}</h1>
          <p className="text-sm text-zinc-500">ID: {cityId} &middot; You are a City Admin.</p>
        </div>

        {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md px-3 py-2">{error}</p>}
        {success && <p className="mb-4 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-md px-3 py-2">{success}</p>}

        {/* Wards table */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Wards</h2>
          {loadingWards ? (
            <p className="text-zinc-500">Loading wards…</p>
          ) : wards.length === 0 ? (
            <p className="text-zinc-500">No wards yet. Add your first ward below.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    <th className="text-left px-4 py-2 font-medium">Ward ID</th>
                    <th className="text-left px-4 py-2 font-medium">Ward Name</th>
                    <th className="text-left px-4 py-2 font-medium">Rep Email</th>
                    <th className="text-left px-4 py-2 font-medium">Rep Linked</th>
                    <th className="text-left px-4 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {wards.map((w) => (
                    <WardTableRow key={w.wardId} ward={w} saving={saving} onUpdateEmail={handleUpdateRepEmail} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add ward form */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Add New Ward</h2>
          <form onSubmit={handleAddWard} className="grid sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Ward ID (slug)</label>
              <input value={newWardId} onChange={(e) => setNewWardId(e.target.value)} required
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                placeholder="ward-9" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Ward Name</label>
              <input value={newWardName} onChange={(e) => setNewWardName(e.target.value)} required
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                placeholder="Ward 9" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Rep Email (optional)</label>
              <input type="email" value={newRepEmail} onChange={(e) => setNewRepEmail(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                placeholder="rep@ward.gov" />
            </div>
            <button type="submit" disabled={saving}
              className="py-2 px-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 text-sm transition-colors">
              {saving ? "Saving…" : "Add Ward"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

function WardTableRow({ ward, saving, onUpdateEmail }: { ward: WardRow; saving: boolean; onUpdateEmail: (wardId: string, email: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(ward.wardRepEmail ?? "");

  function handleSave() {
    onUpdateEmail(ward.wardId, email);
    setEditing(false);
  }

  return (
    <tr className="border-t border-zinc-200 dark:border-zinc-800">
      <td className="px-4 py-2 text-zinc-900 dark:text-zinc-100 font-mono text-xs">{ward.wardId}</td>
      <td className="px-4 py-2 text-zinc-900 dark:text-zinc-100">{ward.wardName}</td>
      <td className="px-4 py-2">
        {editing ? (
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-2 py-1 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400" />
        ) : (
          <span className="text-zinc-600 dark:text-zinc-400">{ward.wardRepEmail || "—"}</span>
        )}
      </td>
      <td className="px-4 py-2">
        {ward.repUid ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">Linked</span>
        ) : (
          <span className="text-xs text-zinc-400">Not yet</span>
        )}
      </td>
      <td className="px-4 py-2">
        {editing ? (
          <div className="flex gap-1">
            <button onClick={handleSave} disabled={saving}
              className="text-xs text-emerald-600 hover:underline disabled:opacity-50">Save</button>
            <button onClick={() => { setEditing(false); setEmail(ward.wardRepEmail ?? ""); }}
              className="text-xs text-zinc-400 hover:underline">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="text-xs text-zinc-600 dark:text-zinc-400 hover:underline">Edit email</button>
        )}
      </td>
    </tr>
  );
}
