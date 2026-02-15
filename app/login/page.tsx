"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebaseClient";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resendSent, setResendSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { user, firebaseUser, signIn, sendVerification, resetPassword, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const verifyMessage = searchParams.get("message") === "verify";

  useEffect(() => {
    if (!user || !firebaseUser) return;
    if (firebaseUser.emailVerified) {
      if (user.role === "CITY_ADMIN") router.replace("/admin");
      else router.replace("/dashboard");
    }
  }, [user, firebaseUser, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await signIn(email, password);
      if (auth?.currentUser && !auth.currentUser.emailVerified) {
        setError("Email not verified yet. Check your inbox or resend below.");
        return;
      }
      router.replace("/dashboard");
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "code" in err
        ? (err as { code: string }).code === "auth/invalid-credential"
          ? "Invalid email or password."
          : (err as { message?: string }).message ?? "Sign in failed."
        : "Sign in failed.";
      setError(String(msg));
    }
  }

  async function handleResend() {
    setError("");
    try {
      await sendVerification();
      setResendSent(true);
    } catch {
      setError("Failed to resend verification email.");
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Enter your email above first, then click Forgot password.");
      return;
    }
    try {
      await resetPassword(email.trim());
      setResetSent(true);
    } catch {
      setError("Failed to send password reset email.");
    }
  }

  const showUnverified = firebaseUser && !firebaseUser.emailVerified;

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            CivicThreads
          </Link>
        </div>
        {verifyMessage && (
          <p className="mb-4 text-sm text-center text-emerald-600 dark:text-emerald-400">
            Please verify your email. Check your inbox, then sign in below.
          </p>
        )}
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm"
        >
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Sign in
          </h1>
          {error && (
            <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
              />
            </div>
            <div className="flex justify-end text-sm">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-zinc-600 dark:text-zinc-400 hover:underline"
              >
                Forgot password?
              </button>
            </div>
            {resetSent && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                Password reset email sent. Check your inbox.
              </p>
            )}
          </div>
          {showUnverified && (
            <div className="mt-4 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                Email not verified yet.
              </p>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendSent}
                className="text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline disabled:opacity-70"
              >
                {resendSent ? "Verification email sent" : "Resend verification"}
              </button>
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="mt-6 w-full py-2 px-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors"
          >
            {isLoading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-500">Loading…</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
