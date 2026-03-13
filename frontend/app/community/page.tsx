"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import AuthGuard from "@/components/AuthGuard";
import OpportunityCard from "@/components/OpportunityCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import {
  Globe,
  TrendingUp,
  Users,
  Zap,
  Filter,
  Search,
} from "lucide-react";

interface CommunityOpportunity {
  id: string;
  company: string;
  role: string;
  type: string;
  branch_eligible: string;
  cgpa_required: number | null;
  deadline: string | null;
  location: string;
  stipend: string;
  apply_link: string | null;
  days_left: number | null;
  urgency: string;
  is_applied: boolean;
  is_public: boolean;
  upvotes: number;
  created_at: string;
  users?: {
    name: string;
    college: string;
    branch: string;
  };
}

export default function CommunityPage() {
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [opportunities, setOpportunities] = useState<CommunityOpportunity[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Most Upvoted");
  const [searchQuery, setSearchQuery] = useState("");
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const init = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser as unknown as Record<string, unknown>);
        // Fetch user's existing upvotes
        const { data: existingVotes } = await supabase
          .from("upvotes")
          .select("opportunity_id")
          .eq("user_id", authUser.id);
        if (existingVotes) {
          setVotedIds(new Set(existingVotes.map((v: { opportunity_id: string }) => v.opportunity_id)));
        }
      }
      await fetchCommunity();
    };
    init();
  }, []);

  const fetchCommunity = async () => {
    try {
      // Step 1: Fetch public opportunities without user join (FK goes to auth.users, not public.users)
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .eq("is_public", true)
        .order("upvotes", { ascending: false });
      if (error) throw error;

      if (data && data.length > 0) {
        // Step 2: Look up user profiles from public.users table
        const userIds = Array.from(new Set(data.map((o: Record<string, unknown>) => o.user_id as string).filter(Boolean)));
        
        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from("users")
            .select("id, name, college, branch")
            .in("id", userIds);

          const usersMap: Record<string, { name: string; college: string; branch: string }> = {};
          if (usersData) {
            for (const u of usersData) {
              usersMap[u.id] = { name: u.name, college: u.college, branch: u.branch };
            }
          }

          // Attach user info to each opportunity
          const enriched = data.map((o: Record<string, unknown>) => ({
            ...o,
            users: usersMap[o.user_id as string] || { name: "Anonymous", college: "", branch: "" },
          }));
          setOpportunities(enriched as CommunityOpportunity[]);
        } else {
          setOpportunities(data as CommunityOpportunity[]);
        }
      } else {
        setOpportunities([]);
      }
    } catch (err) {
      console.error("Failed to fetch community:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async (id: string) => {
    if (!user) return;
    if (votedIds.has(id)) return;

    try {
      // Insert upvote record
      await supabase.from("upvotes").insert({
        opportunity_id: id,
        user_id: user.id,
      });

      // Increment upvote count
      const opp = opportunities.find((o) => o.id === id);
      const newCount = ((opp?.upvotes) || 0) + 1;
      await supabase.from("opportunities").update({ upvotes: newCount }).eq("id", id);

      setVotedIds((prev) => new Set([...Array.from(prev), id]));
      setOpportunities((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, upvotes: newCount } : o
        )
      );
    } catch {
      // Already upvoted or error
    }
  };

  const filtered = opportunities
    .filter((o) => filter === "All" || o.type === filter)
    .filter(
      (o) =>
        !searchQuery ||
        o.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.role.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "Most Upvoted")
        return (b.upvotes || 0) - (a.upvotes || 0);
      if (sortBy === "Newest")
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      if (sortBy === "Deadline") {
        const aDate = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const bDate = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return aDate - bDate;
      }
      return 0;
    });

  const totalUpvotes = opportunities.reduce(
    (sum, o) => sum + (o.upvotes || 0),
    0
  );

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#07080F] py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4">
              <Globe className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-indigo-400">
                Discover Opportunities
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">
              Community Feed 🌐
            </h1>
            <p className="text-slate-400 max-w-lg mx-auto">
              Opportunities shared by students across India. Upvote the best
              ones to help others.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
            {[
              {
                icon: <Zap className="w-5 h-5 text-indigo-400" />,
                value: opportunities.length,
                label: "Opportunities",
              },
              {
                icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
                value: totalUpvotes,
                label: "Total Upvotes",
              },
              {
                icon: <Users className="w-5 h-5 text-amber-400" />,
                value: new Set(opportunities.map((o) => o.users?.name)).size,
                label: "Contributors",
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-[#0A0B15] border border-[#12142A] rounded-xl p-4 text-center card-hover"
              >
                <div className="flex justify-center mb-2">{stat.icon}</div>
                <p className="text-2xl font-black text-white">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-slate-500" />
              {["All", "Internship", "Job", "Hackathon", "Scholarship"].map(
                (f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      filter === f
                        ? "bg-indigo-600 text-white"
                        : "bg-white/5 text-slate-400 hover:bg-white/10 border border-[#12142A]"
                    }`}
                  >
                    {f}
                  </button>
                )
              )}
            </div>

            <div className="flex items-center gap-3 sm:ml-auto w-full sm:w-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-[#12142A] rounded-lg text-sm text-slate-300 outline-none focus:border-indigo-500 appearance-none"
              >
                <option value="Most Upvoted" className="bg-[#0A0B15]">
                  Most Upvoted
                </option>
                <option value="Newest" className="bg-[#0A0B15]">
                  Newest
                </option>
                <option value="Deadline" className="bg-[#0A0B15]">
                  Deadline
                </option>
              </select>

              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-48 pl-9 pr-4 py-2 bg-white/5 border border-[#12142A] rounded-lg text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <LoadingSpinner message="Loading community opportunities..." />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No community opportunities yet"
              description="Be the first to share! Go to your dashboard and toggle 'Share' on any opportunity."
              actionText="Go to Dashboard →"
              actionHref="/dashboard"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((opp) => (
                <OpportunityCard
                  key={opp.id}
                  opportunity={opp}
                  onUpvote={handleUpvote}
                  showActions={false}
                  showCommunityInfo={true}
                  hasUpvoted={votedIds.has(opp.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
