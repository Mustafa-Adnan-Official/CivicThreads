"use client";

import Link from "next/link";

const roles = [
  {
    title: "Resident",
    desc: "Submit issues, upvote, and track civic threads in your ward.",
    signIn: "/login",
    signUp: "/signup",
  },
  {
    title: "City Admin",
    desc: "Manage wards, assign ward representatives, and oversee your city.",
    signIn: "/admin-login",
    signUp: "/admin-signup",
  },
  {
    title: "Ward Representative",
    desc: "Post official announcements and respond to your ward's issues.",
    signIn: "/admin-login",
    signUp: "/rep-signup",
  },
];

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          CivicThreads
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 max-w-md">
          Ward-based civic issue platform. Choose your role to get started.
        </p>
      </div>

      <div className="grid gap-6 w-full max-w-3xl sm:grid-cols-3">
        {roles.map((r) => (
          <div
            key={r.title}
            className="flex flex-col rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
              {r.title}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 flex-1">
              {r.desc}
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href={r.signIn}
                className="w-full text-center py-2 px-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors text-sm"
              >
                Sign in
              </Link>
              <Link
                href={r.signUp}
                className="w-full text-center py-2 px-4 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 font-medium rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm"
              >
                Sign up
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
