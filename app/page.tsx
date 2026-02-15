"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      if (user.role === "CITY_ADMIN") router.replace("/admin");
      else router.replace("/dashboard");
    } else {
      router.replace("/onboarding");
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-zinc-500">Redirecting…</p>
    </div>
  );
}
