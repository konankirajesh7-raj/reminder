"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AuthGuard from "@/components/AuthGuard";
import LoadingSpinner from "@/components/LoadingSpinner";
import OpportunityCard from "@/components/OpportunityCard";
import {
  Users,
  ArrowLeft,
  Shield,
  Calendar,
  Lock,
  Settings,
  Trash2,
  Save,
  X,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

interface CommunityPost {
  id: string;
  message: string | null;
  created_at: string;
  shared_by: string;
  opportunity_id: string;
  opportunities: {
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
    required_skills: string | null;
  };
  users: {
    name: string;
    college: string;
  };
}

interface CommunityInfo {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  created_at: string;
  created_by: string;
}

interface Member {
  user_id: string;
  role: string;
  users: { name: string; college: string; branch: string };
}

export default function CommunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const communityId = params.id as string;
  const [community, setCommunity] = useState<CommunityInfo | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMembers, setShowMembers] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Access denied state (not a member)
  const [accessDenied, setAccessDenied] = useState(false);
  const [joinPassword, setJoinPassword] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

  // Admin edit state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!communityId) return;
    checkAccessAndFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId]);

  const checkAccessAndFetch = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    // First check if user is a member
    const { data: membership } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", communityId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      // Not a member — show access denied with join option
      const { data: comm } = await supabase
        .from("communities")
        .select("id, name, description, member_count, created_at, created_by")
        .eq("id", communityId)
        .single();
      if (comm) setCommunity(comm as CommunityInfo);
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    setIsMember(true);
    setIsAdmin(membership.role === "admin");
    await fetchCommunityData();
  };

  const fetchCommunityData = async () => {
    // Fetch community info
    const { data: comm } = await supabase
      .from("communities")
      .select("id, name, description, member_count, created_at, created_by")
      .eq("id", communityId)
      .single();
    if (comm) setCommunity(comm as CommunityInfo);

    // Step 1: Fetch shared posts with opportunities (no user join — FK goes to auth.users)
    const { data: postsData } = await supabase
      .from("community_posts")
      .select("*, opportunities(*)")
      .eq("community_id", communityId)
      .order("created_at", { ascending: false });

    if (postsData && postsData.length > 0) {
      // Step 2: Get unique user IDs from shared_by and fetch their profiles from public.users
      const userIds = Array.from(new Set(postsData.map((p: Record<string, unknown>) => p.shared_by as string)));
      const { data: usersData } = await supabase
        .from("users")
        .select("id, name, college")
        .in("id", userIds);

      const usersMap: Record<string, { name: string; college: string }> = {};
      if (usersData) {
        for (const u of usersData) {
          usersMap[u.id] = { name: u.name, college: u.college };
        }
      }

      // Attach user info to each post
      const enrichedPosts = postsData.map((p: Record<string, unknown>) => ({
        ...p,
        users: usersMap[p.shared_by as string] || { name: "Unknown", college: "" },
      }));
      setPosts(enrichedPosts as unknown as CommunityPost[]);
    } else {
      setPosts([]);
    }

    // Fetch members — community_members.user_id also points to auth.users, so same fix
    const { data: membershipsData } = await supabase
      .from("community_members")
      .select("user_id, role")
      .eq("community_id", communityId);

    if (membershipsData && membershipsData.length > 0) {
      const memberUserIds = membershipsData.map((m: Record<string, unknown>) => m.user_id as string);
      const { data: memberUsersData } = await supabase
        .from("users")
        .select("id, name, college, branch")
        .in("id", memberUserIds);

      const memberUsersMap: Record<string, { name: string; college: string; branch: string }> = {};
      if (memberUsersData) {
        for (const u of memberUsersData) {
          memberUsersMap[u.id] = { name: u.name, college: u.college, branch: u.branch };
        }
      }

      const enrichedMembers = membershipsData.map((m: Record<string, unknown>) => ({
        user_id: m.user_id as string,
        role: m.role as string,
        users: memberUsersMap[m.user_id as string] || { name: "Unknown", college: "", branch: "" },
      }));
      setMembers(enrichedMembers as Member[]);
    } else {
      setMembers([]);
    }

    setLoading(false);
  };

  const handleJoinFromDetail = async () => {
    if (!currentUserId || !joinPassword.trim()) {
      setJoinError("Password is required to join this community");
      return;
    }
    setJoining(true);
    setJoinError("");

    // Verify password
    const { data: comm } = await supabase
      .from("communities")
      .select("id, password, member_count")
      .eq("id", communityId)
      .single();

    if (!comm || comm.password !== joinPassword.trim()) {
      setJoinError("Incorrect password. Ask the admin for the correct password.");
      setJoining(false);
      return;
    }

    // Join as member
    await supabase.from("community_members").insert({
      community_id: communityId,
      user_id: currentUserId,
      role: "member",
    });

    // Update member count
    await supabase
      .from("communities")
      .update({ member_count: (comm.member_count || 1) + 1 })
      .eq("id", communityId);

    setAccessDenied(false);
    setIsMember(true);
    setJoining(false);
    setJoinPassword("");
    await fetchCommunityData();
  };

  const handleEditCommunity = async () => {
    if (!editName.trim()) {
      setEditError("Community name is required");
      return;
    }
    setSaving(true);
    setEditError("");

    const updates: Record<string, unknown> = {
      name: editName.trim(),
      description: editDesc.trim() || null,
    };
    if (editPassword.trim()) {
      updates.password = editPassword.trim();
    }

    const { error } = await supabase
      .from("communities")
      .update(updates)
      .eq("id", communityId);

    if (error) {
      setEditError(error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowEditModal(false);
    await fetchCommunityData();
  };

  const handleDeleteCommunity = async () => {
    // Delete all posts, members, then community
    await supabase.from("community_posts").delete().eq("community_id", communityId);
    await supabase.from("community_members").delete().eq("community_id", communityId);
    await supabase.from("communities").delete().eq("id", communityId);
    router.push("/communities");
  };

  const handleRemoveMember = async (userId: string) => {
    if (userId === currentUserId) return; // Can't remove yourself
    await supabase
      .from("community_members")
      .delete()
      .eq("community_id", communityId)
      .eq("user_id", userId);

    // Update count
    if (community) {
      await supabase
        .from("communities")
        .update({ member_count: Math.max(1, (community.member_count || 1) - 1) })
        .eq("id", communityId);
    }
    setMembers((prev) => prev.filter((m) => m.user_id !== userId));
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-[#07080F] flex items-center justify-center">
          <LoadingSpinner message="Loading community..." />
        </div>
      </AuthGuard>
    );
  }

  // ACCESS DENIED — User is not a member
  if (accessDenied) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-[#07080F] py-8 px-4">
          <div className="max-w-md mx-auto">
            <Link
              href="/communities"
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Communities
            </Link>

            <div className="bg-[#0A0B15] border border-[#12142A] rounded-xl p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                {community?.name || "Private Community"}
              </h2>
              <p className="text-slate-400 text-sm mb-6">
                This is a private community. Enter the password to join and view shared opportunities.
              </p>

              {joinError && (
                <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 mb-4 text-left">
                  {joinError}
                </div>
              )}

              <div className="space-y-3">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={joinPassword}
                    onChange={(e) => setJoinPassword(e.target.value)}
                    placeholder="Community password"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-[#12142A] rounded-lg text-white placeholder-slate-600 focus:border-indigo-500 outline-none transition-all"
                    onKeyDown={(e) => e.key === "Enter" && handleJoinFromDetail()}
                  />
                </div>
                <button
                  onClick={handleJoinFromDetail}
                  disabled={joining}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
                >
                  {joining ? "Joining..." : "Join Community"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#07080F] py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Back */}
          <Link
            href="/communities"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Communities
          </Link>

          {/* Header */}
          <div className="bg-[#0A0B15] border border-[#12142A] rounded-xl p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-black text-white">{community?.name}</h1>
                      {isAdmin && (
                        <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full font-semibold">
                          ADMIN
                        </span>
                      )}
                    </div>
                    {community?.description && (
                      <p className="text-sm text-slate-400">{community.description}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    onClick={() => {
                      setEditName(community?.name || "");
                      setEditDesc(community?.description || "");
                      setEditPassword("");
                      setEditError("");
                      setShowEditModal(true);
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-400 hover:bg-amber-500/20 transition-all"
                    title="Edit community"
                  >
                    <Settings className="w-4 h-4" /> Edit
                  </button>
                )}
                <button
                  onClick={() => setShowMembers(!showMembers)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-[#12142A] rounded-lg text-sm text-slate-300 hover:bg-white/10 transition-all"
                >
                  <Users className="w-4 h-4" />
                  {members.length} Members
                </button>
              </div>
            </div>

            {/* Member count & date */}
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Created {new Date(community?.created_at || "").toLocaleDateString()}
              </span>
              <span>{posts.length} shared opportunities</span>
            </div>
          </div>

          <div className="flex gap-6">
            {/* Posts Feed */}
            <div className="flex-1">
              {posts.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-slate-500">No opportunities shared yet. Share from your dashboard!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div key={post.id}>
                      {/* Shared by header */}
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold">
                          {post.users?.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <span className="text-xs text-slate-400">
                          <span className="text-slate-300 font-medium">{post.users?.name || "Someone"}</span>
                          {post.users?.college && ` · ${post.users.college}`}
                          {" · "}
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {post.message && (
                        <p className="text-sm text-slate-400 px-1 mb-2 italic">&quot;{post.message}&quot;</p>
                      )}
                      <OpportunityCard
                        opportunity={{
                          ...post.opportunities,
                          users: post.users as { name: string; college: string; branch: string },
                        }}
                        showActions={false}
                        showCommunityInfo={false}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Members Sidebar */}
            {showMembers && (
              <div className="hidden md:block w-72">
                <div className="bg-[#0A0B15] border border-[#12142A] rounded-xl p-4 sticky top-24">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-400" /> Members
                  </h3>
                  <div className="space-y-2">
                    {members.map((m) => (
                      <div key={m.user_id} className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center text-white text-[10px] font-bold">
                          {m.users?.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-300 truncate">{m.users?.name || "Unknown"}</p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {m.users?.college || ""} {m.role === "admin" ? "· Admin" : ""}
                          </p>
                        </div>
                        {/* Admin can remove non-admin members */}
                        {isAdmin && m.role !== "admin" && (
                          <button
                            onClick={() => handleRemoveMember(m.user_id)}
                            className="p-1 text-red-400/50 hover:text-red-400 transition-colors"
                            title="Remove member"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-[#0A0B15] border border-[#12142A] rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" /> Edit Community
              </h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 mb-4">
                {editError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Community Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-[#12142A] rounded-lg text-white placeholder-slate-600 focus:border-amber-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Community description"
                  rows={2}
                  className="w-full px-4 py-3 bg-white/5 border border-[#12142A] rounded-lg text-white placeholder-slate-600 focus:border-amber-500 outline-none transition-all resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Change Password (leave blank to keep)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="New password"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-[#12142A] rounded-lg text-white placeholder-slate-600 focus:border-amber-500 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                onClick={handleEditCommunity}
                disabled={saving}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete Community
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-[#0A0B15] border border-red-500/30 rounded-xl p-6 max-w-sm w-full text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-2">Delete Community?</h3>
            <p className="text-sm text-slate-400 mb-5">
              This will permanently delete the community, all posts, and remove all members. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 bg-white/5 border border-[#12142A] text-slate-300 text-sm font-semibold rounded-lg hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCommunity}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-lg transition-all"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
