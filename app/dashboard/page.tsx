"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Heatmap, HEATMAP_ZOOM } from "@/components/Heatmap";
import { SubmitIssueBar } from "@/components/SubmitIssueBar";
import { getThreads, getWards, getCities, submitIssue } from "@/lib/data-service";
import { DEFAULT_CITY_ID, DEFAULT_WARD_ID } from "@/lib/constants";
import type { Thread } from "@/lib/types";

export default function DashboardPage() {
  const { user, firebaseUser, signOut, isLoading } = useAuth();
  const router = useRouter();

  const [cities, setCities] = useState<{ cityId: string; cityName: string }[]>([]);
  const [selectedCityId, setSelectedCityId] = useState(DEFAULT_CITY_ID);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [wards, setWards] = useState<{ wardId: string; wardName: string }[]>([]);
  const [selectedWardId, setSelectedWardId] = useState<string>(DEFAULT_WARD_ID);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [heatmapZoom, setHeatmapZoom] = useState(1);

  // Auth guard
  useEffect(() => {
    if (isLoading) return;
    if (!firebaseUser) { router.replace("/login"); return; }
    if (!firebaseUser.emailVerified) { router.replace("/login?message=verify"); return; }
  }, [isLoading, firebaseUser, router]);

  // Load cities
  useEffect(() => {
    if (isLoading || !firebaseUser?.emailVerified || !user) return;
    getCities().then(setCities).catch(() => setCities([{ cityId: DEFAULT_CITY_ID, cityName: "Markham" }]));
  }, [isLoading, firebaseUser, user]);

  // Load wards when city changes
  const loadWards = useCallback(async (cId: string) => {
    try {
      const w = await getWards(cId);
      const mapped = w.map((ward) => ({ wardId: ward.wardId, wardName: ward.wardName }));
      setWards(mapped);
      if (mapped.length > 0 && !mapped.some((x) => x.wardId === selectedWardId)) {
        setSelectedWardId(mapped[0].wardId);
      }
    } catch { /* keep existing */ }
  }, [selectedWardId]);

  useEffect(() => {
    if (isLoading || !firebaseUser?.emailVerified || !user) return;
    loadWards(selectedCityId);
  }, [isLoading, firebaseUser, user, selectedCityId, loadWards]);

  // Load threads when ward changes
  useEffect(() => {
    if (isLoading || !firebaseUser?.emailVerified || !user || !selectedWardId) return;
    getThreads(selectedWardId, selectedCityId).then(setThreads);
  }, [isLoading, firebaseUser, user, selectedWardId, selectedCityId]);

  function handleCityChange(cId: string) {
    setSelectedCityId(cId);
    setThreads([]);
    setWards([]);
  }

  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    const q = searchQuery.toLowerCase();
    return threads.filter((t) => t.title.toLowerCase().includes(q) || t.aiSummary.toLowerCase().includes(q));
  }, [threads, searchQuery]);

  const maxUpvotes = Math.max(1, ...filteredThreads.map((t) => t.upvoteCount));
  const maxIssueCount = Math.max(1, ...filteredThreads.map((t) => t.issueCount));

  const [submitMessage, setSubmitMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function handleSubmitIssue(text: string, publicMode: "ANON" | "PUBLIC") {
    if (!user) return;
    setIsSubmitting(true);
    setSubmitMessage(null);
    try {
      const result = await submitIssue({
        wardId: selectedWardId,
        cityId: selectedCityId,
        text,
        authorUid: user.uid,
        publicIdentityMode: publicMode,
        publicDisplayName: publicMode === "PUBLIC" ? user.accountName : "Anonymous Samaritan",
      });
      const updated = await getThreads(selectedWardId, selectedCityId);
      setThreads(updated);

      const threadCount = result.threadIds.length;
      if (result.action === "CREATE") {
        const extra = threadCount > 1 ? ` and linked to ${threadCount - 1} existing thread${threadCount > 2 ? "s" : ""}` : "";
        setSubmitMessage({ text: `Issue submitted — a new thread was created${extra}.`, type: "success" });
      } else {
        setSubmitMessage({ text: `Issue submitted — matched to ${threadCount} existing thread${threadCount > 1 ? "s" : ""}.`, type: "success" });
      }
      setTimeout(() => setSubmitMessage(null), 5000);
    } catch (err) {
      setSubmitMessage({ text: err instanceof Error ? err.message : "Submit failed", type: "error" });
      setTimeout(() => setSubmitMessage(null), 5000);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><p className="text-zinc-500">Loading…</p></div>;
  if (!firebaseUser) return null;
  if (!firebaseUser.emailVerified) return null;
  if (!user) return <div className="min-h-screen flex items-center justify-center"><p className="text-zinc-500">Loading your dashboard…</p></div>;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header
        searchPlaceholder="Search Threads"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        cityOptions={cities}
        selectedCityId={selectedCityId}
        onCityChange={handleCityChange}
        wardOptions={wards}
        selectedWardId={selectedWardId}
        onWardChange={setSelectedWardId}
        showWardSelector={true}
        user={user}
        onSignOut={() => { signOut(); router.replace("/login"); }}
        transparent={true}
        showZoomControls={true}
        zoom={heatmapZoom}
        onZoomIn={() => setHeatmapZoom((z) => Math.min(HEATMAP_ZOOM.MAX, z + HEATMAP_ZOOM.STEP))}
        onZoomOut={() => setHeatmapZoom((z) => Math.max(HEATMAP_ZOOM.MIN, z - HEATMAP_ZOOM.STEP))}
      />
      <main className="flex-1 min-h-0 w-full overflow-hidden -mt-14">
        <Heatmap
          threads={filteredThreads}
          wardId={selectedWardId}
          maxUpvotes={maxUpvotes}
          maxIssueCount={maxIssueCount}
          zoom={heatmapZoom}
          onZoomChange={setHeatmapZoom}
        />
      </main>
      {/* Submit feedback toast */}
      {submitMessage && (
        <div
          className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium transition-all animate-in fade-in slide-in-from-bottom-2 ${
            submitMessage.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {submitMessage.text}
        </div>
      )}
      <SubmitIssueBar onSubmit={handleSubmitIssue} isSubmitting={isSubmitting} />
    </div>
  );
}
