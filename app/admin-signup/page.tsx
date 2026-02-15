"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminSignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountName, setAccountName] = useState("");
  const [cityName, setCityName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const name = cityName.trim();
    if (!name) { setError("City name is required."); return; }
    setLoading(true);
    try {
      // Derive a slug from the city name
      const cityId = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      if (!cityId) { setError("Invalid city name."); return; }

      await signUp({
        email: email.trim(),
        password,
        accountName: accountName.trim() || email.split("@")[0] || "Admin",
        role: "CITY_ADMIN",
        cityId,
        cityName: name,
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
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">City Admin Sign Up</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Create a city administrator account</p>
          {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="space-y-4">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">City name</label>
              <input id="city" type="text" value={cityName} onChange={(e) => setCityName(e.target.value)} required
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400" placeholder="e.g. Markham" />
              <p className="mt-1 text-xs text-zinc-400">If this city already exists you will be added as an admin. Otherwise a new city will be created.</p>
            </div>
            <div>
              <label htmlFor="accountName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Display name</label>
              <input id="accountName" type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400" placeholder="Admin Name" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400" placeholder="admin@city.gov" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400" placeholder="At least 6 characters" />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="mt-6 w-full py-2 px-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors">
            {loading ? "Creating account…" : "Sign up as City Admin"}
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
