"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Share2, X, Copy, MessageCircle, Check, Globe, Shield } from "lucide-react";

interface Community {
  id: string;
  name: string;
}

interface ShareModalProps {
  opportunityId: string;
  opportunityTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareModal({ opportunityId, opportunityTitle, isOpen, onClose }: ShareModalProps) {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState("");
  const [message, setMessage] = useState("");
  const [sharing, setSharing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [loadingComms, setLoadingComms] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [publishingPublic, setPublishingPublic] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    // Reset state when opening
    setSelectedCommunity("");
    setMessage("");
    setSuccessMsg("");
    setCopied(false);
    setLoadingComms(true);
    setPublishingPublic(false);

    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoadingComms(false); return; }

        // Check if this opportunity is already public
        const { data: opp } = await supabase
          .from("opportunities")
          .select("is_public")
          .eq("id", opportunityId)
          .single();
        if (opp) setIsPublic(opp.is_public || false);

        // Fetch communities user belongs to
        const { data } = await supabase
          .from("community_members")
          .select("community_id, communities(id, name)")
          .eq("user_id", user.id);
        if (data) {
          const comms = data.map((d: Record<string, unknown>) => {
            const c = d.communities as Record<string, unknown>;
            return { id: c.id as string, name: c.name as string };
          });
          setCommunities(comms);
        }
      } catch (err) {
        console.error("Failed to fetch:", err);
      } finally {
        setLoadingComms(false);
      }
    };
    init();
  }, [isOpen, opportunityId]);

  const handleShareToGroup = async () => {
    if (!selectedCommunity) return;
    setSharing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSharing(false); return; }

      const { error } = await supabase.from("community_posts").insert({
        community_id: selectedCommunity,
        opportunity_id: opportunityId,
        shared_by: user.id,
        message: message || null,
      });

      if (error) {
        console.error("Share to group failed:", error);
        alert(`Failed to share: ${error.message}`);
        setSharing(false);
        return;
      }

      setSuccessMsg("Shared to group!");
      setTimeout(() => { setSuccessMsg(""); onClose(); }, 1500);
    } catch (err) {
      console.error("Share error:", err);
    } finally {
      setSharing(false);
    }
  };

  const handleShareToPublicCommunity = async () => {
    setPublishingPublic(true);
    try {
      const { error } = await supabase
        .from("opportunities")
        .update({ is_public: true })
        .eq("id", opportunityId);

      if (error) {
        console.error("Failed to publish:", error);
        alert(`Failed to publish: ${error.message}`);
        setPublishingPublic(false);
        return;
      }

      setIsPublic(true);
      setSuccessMsg("Published to Community Feed!");
      setTimeout(() => { setSuccessMsg(""); onClose(); }, 1500);
    } catch (err) {
      console.error("Publish error:", err);
    } finally {
      setPublishingPublic(false);
    }
  };

  const handleUnpublish = async () => {
    setPublishingPublic(true);
    try {
      await supabase
        .from("opportunities")
        .update({ is_public: false })
        .eq("id", opportunityId);
      setIsPublic(false);
    } finally {
      setPublishingPublic(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/dashboard?opp=${opportunityId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = `Check out this opportunity: ${opportunityTitle}\n${window.location.origin}/dashboard?opp=${opportunityId}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-[#0A0B15] border border-[#12142A] rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-400" /> Share Opportunity
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {successMsg ? (
          <div className="flex flex-col items-center py-8">
            <Check className="w-12 h-12 text-emerald-400 mb-3" />
            <p className="text-emerald-400 font-semibold">{successMsg}</p>
          </div>
        ) : (
          <>
            {/* ═══ SECTION 1: Share to Public Community ═══ */}
            <div className="mb-5">
              <label className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                <Globe className="w-4 h-4 text-emerald-400" /> Share to Public Community
              </label>
              <p className="text-xs text-slate-500 mb-3">
                Make this opportunity visible to all students on the Community Feed.
              </p>

              {isPublic ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-emerald-400 font-medium">Published to Community Feed</span>
                  </div>
                  <button
                    onClick={handleUnpublish}
                    disabled={publishingPublic}
                    className="px-3 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium rounded-lg hover:bg-red-500/20 transition-all disabled:opacity-50"
                  >
                    Unpublish
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleShareToPublicCommunity}
                  disabled={publishingPublic}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Globe className="w-4 h-4" />
                  {publishingPublic ? "Publishing..." : "Publish to Community Feed"}
                </button>
              )}
            </div>

            <div className="border-t border-[#12142A] my-4" />

            {/* ═══ SECTION 2: Share to Private Groups ═══ */}
            <div className="mb-5">
              <label className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                <Shield className="w-4 h-4 text-indigo-400" /> Share to My Groups
              </label>
              <p className="text-xs text-slate-500 mb-3">
                Share privately with your community groups.
              </p>

              {loadingComms ? (
                <div className="flex items-center gap-2 py-2">
                  <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                  <p className="text-xs text-slate-500">Loading groups...</p>
                </div>
              ) : communities.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">Join a group first to share privately. Go to &quot;My Groups&quot; to create or join one.</p>
              ) : (
                <>
                  <select
                    value={selectedCommunity}
                    onChange={(e) => setSelectedCommunity(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white/5 border border-[#12142A] rounded-lg text-sm text-white outline-none focus:border-indigo-500 appearance-none mb-2"
                  >
                    <option value="" className="bg-[#0A0B15]">Select a group</option>
                    {communities.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#0A0B15]">{c.name}</option>
                    ))}
                  </select>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Add a message (optional)"
                    rows={2}
                    className="w-full px-3 py-2 bg-white/5 border border-[#12142A] rounded-lg text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 resize-none mb-2"
                  />
                  <button
                    onClick={handleShareToGroup}
                    disabled={!selectedCommunity || sharing}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    {sharing ? "Sharing..." : "Share to Group"}
                  </button>
                </>
              )}
            </div>

            <div className="border-t border-[#12142A] my-4" />

            {/* ═══ SECTION 3: Share via Link/WhatsApp ═══ */}
            <div>
              <p className="text-sm font-semibold text-white mb-3">Share via Link</p>
              <div className="flex gap-3">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-[#12142A] text-slate-300 text-sm font-medium rounded-lg hover:bg-white/10 transition-all"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy Link"}
                </button>
                <button
                  onClick={handleWhatsAppShare}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 text-sm font-medium rounded-lg hover:bg-emerald-600/30 transition-all"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
