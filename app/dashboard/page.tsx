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

  async function handleSubmitIssue(text: string, publicMode: "ANON" | "PUBLIC") {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await submitIssue({
        wardId: selectedWardId,
        cityId: selectedCityId,
        text,
        authorUid: user.uid,
        publicIdentityMode: publicMode,
        publicDisplayName: publicMode === "PUBLIC" ? user.accountName : "Anonymous Samaritan",
      });
      const updated = await getThreads(selectedWardId, selectedCityId);
      setThreads(updated);
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
      <SubmitIssueBar onSubmit={handleSubmitIssue} isSubmitting={isSubmitting} />
    </div>
  );
}
