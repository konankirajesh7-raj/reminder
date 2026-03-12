"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Share2, X, Users, Copy, MessageCircle, Check } from "lucide-react";

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
  const [shared, setShared] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loadingComms, setLoadingComms] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    // Reset state when opening
    setSelectedCommunity("");
    setMessage("");
    setShared(false);
    setCopied(false);
    setLoadingComms(true);

    const fetchCommunities = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoadingComms(false); return; }
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
        console.error("Failed to fetch communities:", err);
      } finally {
        setLoadingComms(false);
      }
    };
    fetchCommunities();
  }, [isOpen]);

  const handleShareToCommunity = async () => {
    if (!selectedCommunity) return;
    setSharing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSharing(false); return; }

      const { data, error } = await supabase.from("community_posts").insert({
        community_id: selectedCommunity,
        opportunity_id: opportunityId,
        shared_by: user.id,
        message: message || null,
      }).select();

      if (error) {
        console.error("Share to community failed:", error);
        alert(`Failed to share: ${error.message}`);
        setSharing(false);
        return;
      }

      console.log("Successfully shared to community:", data);
      setShared(true);
      setTimeout(() => { setShared(false); onClose(); }, 1500);
    } catch (err) {
      console.error("Share error:", err);
    } finally {
      setSharing(false);
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
      <div className="bg-[#0A0B15] border border-[#12142A] rounded-xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-400" /> Share Opportunity
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {shared ? (
          <div className="flex flex-col items-center py-8">
            <Check className="w-12 h-12 text-emerald-400 mb-3" />
            <p className="text-emerald-400 font-semibold">Shared to community!</p>
          </div>
        ) : (
          <>
            {/* Share to Community */}
            <div className="mb-5">
              <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                <Users className="w-4 h-4" /> Share to Community
              </label>
              {loadingComms ? (
                <p className="text-xs text-slate-500">Loading communities...</p>
              ) : communities.length === 0 ? (
                <p className="text-xs text-slate-500">Join a community first to share opportunities</p>
              ) : (
                <>
                  <select
                    value={selectedCommunity}
                    onChange={(e) => setSelectedCommunity(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white/5 border border-[#12142A] rounded-lg text-sm text-white outline-none focus:border-indigo-500 appearance-none mb-2"
                  >
                    <option value="" className="bg-[#0A0B15]">Select community</option>
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
                    onClick={handleShareToCommunity}
                    disabled={!selectedCommunity || sharing}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50"
                  >
                    {sharing ? "Sharing..." : "Share to Community"}
                  </button>
                </>
              )}
            </div>

            <div className="border-t border-[#12142A] pt-4">
              <p className="text-sm text-slate-400 mb-3">Or share via</p>
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
