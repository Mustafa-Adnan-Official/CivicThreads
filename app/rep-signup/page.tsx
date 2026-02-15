"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function RepSignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountName, setAccountName] = useState("");
  const [cityId, setCityId] = useState("");
  const [wardId, setWardId] = useState("");
  const [cities, setCities] = useState<{ cityId: string; cityName: string }[]>([]);
  const [wards, setWards] = useState<{ wardId: string; wardName: string }[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [loadingWards, setLoadingWards] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  // Load cities via public API (no auth needed)
  useEffect(() => {
    setLoadingCities(true);
    fetch("/api/public-cities")
      .then((r) => r.json())
      .then((d) => setCities((d as { cities: { cityId: string; cityName: string }[] }).cities ?? []))
      .catch(() => {})
      .finally(() => setLoadingCities(false));
  }, []);

  // When city changes, load its wards via public API
  useEffect(() => {
    setWards([]);
    setWardId("");
    if (!cityId) return;
    setLoadingWards(true);
    fetch(`/api/public-wards?cityId=${encodeURIComponent(cityId)}`)
      .then((r) => r.json())
      .then((d) => setWards((d as { wards: { wardId: string; wardName: string }[] }).wards ?? []))
      .catch(() => {})
      .finally(() => setLoadingWards(false));
  }, [cityId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!cityId) { setError("Please select a city."); return; }
    if (!wardId) { setError("Please select a ward."); return; }
    setLoading(true);
    try {
      await signUp({
        email: email.trim(),
        password,
        accountName: accountName.trim() || email.split("@")[0] || "Rep",
        role: "WARD_REP",
        cityId,
        wardId,
      });
      router.replace("/admin-login?message=verify");
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? (err as { message: string }).message : "Sign up failed.";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/onboarding" className="inline-block text-xl font-semibold text-zinc-900 dark:text-zinc-50">CivicThreads</Link>
        </div>
        <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">Ward Rep Sign Up</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            Your email must match the one saved by the city admin for your ward.
          </p>
          {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="space-y-4">
            {/* City dropdown — from Firestore */}
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">City</label>
              {loadingCities ? (
                <p className="text-sm text-zinc-400 py-2">Loading cities…</p>
              ) : cities.length === 0 ? (
                <p className="text-sm text-zinc-400 py-2">No cities available. A city admin must create one first.</p>
              ) : (
                <select id="city" value={cityId} onChange={(e) => setCityId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400">
                  <option value="">Select a city…</option>
                  {cities.map((c) => <option key={c.cityId} value={c.cityId}>{c.cityName}</option>)}
                </select>
              )}
            </div>

            {/* Ward dropdown — from Firestore, blank until city is selected */}
            <div>
              <label htmlFor="ward" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Ward</label>
              {!cityId ? (
                <p className="text-sm text-zinc-400 py-2">Select a city first</p>
              ) : loadingWards ? (
                <p className="text-sm text-zinc-400 py-2">Loading wards…</p>
              ) : wards.length === 0 ? (
                <p className="text-sm text-zinc-400 py-2">No wards in this city yet.</p>
              ) : (
                <select id="ward" value={wardId} onChange={(e) => setWardId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400">
                  <option value="">Select a ward…</option>
                  {wards.map((w) => <option key={w.wardId} value={w.wardId}>{w.wardName}</option>)}
                </select>
              )}
            </div>

            <div>
              <label htmlFor="accountName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Display name</label>
              <input id="accountName" type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400" placeholder="Rep Name" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400" placeholder="you@ward.gov" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400" placeholder="At least 6 characters" />
            </div>
          </div>
          <button type="submit" disabled={loading || !cityId || !wardId}
            className="mt-6 w-full py-2 px-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors">
            {loading ? "Creating account…" : "Sign up as Ward Rep"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account? <Link href="/admin-login" className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline">Sign in</Link>
        </p>
        <p className="mt-2 text-center text-sm text-zinc-500">
          <Link href="/onboarding" className="hover:underline">Back to role selection</Link>
        </p>
      </div>
    </div>
  );
}
