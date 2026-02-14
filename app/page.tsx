"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Heatmap, HEATMAP_ZOOM } from "@/components/Heatmap";
import { IssueSubmissionBar } from "@/components/IssueSubmissionBar";
import { getThreads, getWards, submitIssue } from "@/lib/data-service";
import type { Thread } from "@/lib/types";

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [wards, setWards] = useState<{ wardId: string; wardName: string }[]>([]);
  const [selectedWardId, setSelectedWardId] = useState<string>("ward-7");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [heatmapZoom, setHeatmapZoom] = useState(1);

  useEffect(() => {
    if (!user) {
      router.replace("/signin");
      return;
    }
    getWards().then((w) => {
      setWards(w.map((ward) => ({ wardId: ward.wardId, wardName: ward.wardName })));
      if (w.length > 0 && !selectedWardId) setSelectedWardId(w[0].wardId);
    });
  }, [user, router, selectedWardId]);

  useEffect(() => {
    if (!selectedWardId) return;
    getThreads(selectedWardId).then(setThreads);
  }, [selectedWardId]);

  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    const q = searchQuery.toLowerCase();
    return threads.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.aiSummary.toLowerCase().includes(q)
    );
  }, [threads, searchQuery]);

  const maxUpvotes = Math.max(1, ...filteredThreads.map((t) => t.upvoteCount));
  const maxIssueCount = Math.max(1, ...filteredThreads.map((t) => t.issueCount));

  async function handleSubmitIssue(text: string, publicMode: "ANON" | "PUBLIC") {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await submitIssue({
        wardId: selectedWardId,
        text,
        authorUid: user.uid,
        publicIdentityMode: publicMode,
        publicDisplayName:
          publicMode === "PUBLIC" ? user.accountName : "Anonymous Samaritan",
      });
      const updated = await getThreads(selectedWardId);
      setThreads(updated);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!user) return null;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header
        searchPlaceholder="Search Threads"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        wardOptions={wards}
        selectedWardId={selectedWardId}
        onWardChange={setSelectedWardId}
        showWardSelector={true}
        user={user}
        onSignOut={signOut}
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
      <IssueSubmissionBar
        onSubmit={handleSubmitIssue}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
