"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { extractOpportunity } from "@/lib/api";
import AuthGuard from "@/components/AuthGuard";
import LoadingSpinner from "@/components/LoadingSpinner";
import UrgencyBadge from "@/components/UrgencyBadge";
import EligibilityCard from "@/components/EligibilityCard";
import {
  Zap,
  Save,
  RotateCcw,
  Building2,
  Briefcase,
  GraduationCap,
  MapPin,
  Banknote,
  Calendar,
  ExternalLink,
  ClipboardPaste,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Copy,
  ShieldAlert,
  Wrench,
} from "lucide-react";

const SAMPLES = [
  {
    label: "TCS Internship",
    emoji: "🏢",
    text: `🎉 Opportunity Alert! TCS NextStep Internship 2025
Company: Tata Consultancy Services
Role: Software Developer Intern
Eligible: CSE, IT, ECE - 2025 & 2026 batch
CGPA: 7.5 and above
Location: Hyderabad, Bangalore, Chennai
Stipend: Rs 15,000/month
Last Date: March 28, 2025
Apply: https://nextstep.tcs.com
Forward to all students!`,
  },
  {
    label: "Infosys",
    emoji: "💼",
    text: `Fwd: Fwd: URGENT Infosys Campus Connect!!
infosys internship open for CSE ECE students
2025 passout 6 cgpa minimum
stipend 12000 per month pune location
last date 15 march 2025
link: careers.infosys.com/internship
apply fast seats limited`,
  },
  {
    label: "Hackathon",
    emoji: "🏆",
    text: `SMART INDIA HACKATHON 2025 IS OPEN!
Registration Deadline: April 5, 2025
Team Size: 2-6 members
All branches eligible, No CGPA bar
Prize Pool: Rs 1 Crore+
Themes: Agriculture, Healthcare, Education
Register NOW: sih.gov.in
Share with everyone!`,
  },
];

export default function ExtractPage() {
  const router = useRouter();
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [userProfile, setUserProfile] = useState<{ branch: string; cgpa: number | null; age: number | null } | null>(null);
  const [inputText, setInputText] = useState("");
  interface ExtractedData {
    company?: string;
    role?: string;
    type?: string;
    branch_eligible?: string;
    cgpa_required?: number | null;
    deadline?: string | null;
    location?: string;
    stipend?: string;
    apply_link?: string | null;
    raw_text?: string;
    days_left: number | null;
    urgency: string;
    required_skills?: string | null;
    isDuplicate?: boolean;
    isSpam?: boolean;
    spamReasons?: string[];
    is_applied?: boolean;
  }

  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser as unknown as Record<string, unknown>);
        // Fetch profile for eligibility check
        const { data: profile } = await supabase
          .from("users")
          .select("branch, cgpa, age")
          .eq("id", authUser.id)
          .single();
        if (profile) setUserProfile(profile as { branch: string; cgpa: number | null; age: number | null });
      }
    };
    getUser();
  }, []);

  const handleExtract = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError("");
    setExtractedData(null);
    setSaved(false);

    try {
      const result = await extractOpportunity(inputText, user?.id as string);
      setExtractedData(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Extraction failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!extractedData || !user) return;
    setSaving(true);

    try {
      const { error: saveError } = await supabase
        .from("opportunities")
        .insert({
          user_id: (user as Record<string, unknown>).id,
          company: extractedData.company || "Unknown",
          role: extractedData.role || "Unknown",
          type: extractedData.type || "Internship",
          branch_eligible: extractedData.branch_eligible || "All",
          cgpa_required: extractedData.cgpa_required || null,
          deadline: extractedData.deadline || null,
          location: extractedData.location || "Remote",
          stipend: extractedData.stipend || "Not mentioned",
          apply_link: extractedData.apply_link || null,
          raw_text: extractedData.raw_text || inputText,
          days_left: extractedData.days_left || 99,
          urgency: extractedData.urgency || "green",
          required_skills: extractedData.required_skills || null,
        });

      if (saveError) throw saveError;
      setSaved(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (_err) {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setInputText("");
    setExtractedData(null);
    setError("");
    setSaved(false);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#07080F] py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4">
              <Zap className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-indigo-400">
                AI-Powered Extraction
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">
              Extract <span className="gradient-text">Opportunity</span>
            </h1>
            <p className="text-slate-400 max-w-lg mx-auto">
              Paste any WhatsApp forward, messy group message, or opportunity
              text. Our AI will extract everything.
            </p>
          </div>

          {/* Input Section */}
          <div className="bg-[#0A0B15] border border-[#12142A] rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-bold text-white">
                  Paste Message
                </h2>
              </div>
              {inputText && (
                <span className="text-xs text-slate-500 font-mono">
                  {inputText.length} chars
                </span>
              )}
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste your WhatsApp opportunity message here...&#10;&#10;Examples: internship openings, job postings, hackathon announcements, scholarship notices — any format works!"
              className="w-full h-48 p-4 bg-white/5 border border-[#12142A] rounded-lg text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none font-mono text-sm leading-relaxed"
            />

            {/* Sample buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="text-xs text-slate-500 self-center mr-1">
                Try a sample:
              </span>
              {SAMPLES.map((sample, i) => (
                <button
                  key={i}
                  onClick={() => setInputText(sample.text)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-indigo-500/10 border border-[#12142A] hover:border-indigo-500/30 rounded-lg text-xs font-medium text-slate-400 hover:text-indigo-400 transition-all"
                >
                  {sample.emoji} {sample.label}
                </button>
              ))}
            </div>

            {/* Extract button */}
            <button
              onClick={handleExtract}
              disabled={loading || !inputText.trim()}
              className="w-full mt-4 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 text-lg hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/20"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Zap className="w-5 h-5" /> Extract with AI
                </>
              )}
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="bg-[#0A0B15] border border-[#12142A] rounded-xl p-8 mb-6">
              <LoadingSpinner message="AI is reading your message... Extracting opportunity details..." />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">⚠️</span>
              </div>
              <div>
                <p className="text-red-400 font-medium text-sm">{error}</p>
                <p className="text-red-400/60 text-xs mt-1">
                  Make sure the backend API is running and configured correctly.
                </p>
              </div>
            </div>
          )}

          {/* Result */}
          {extractedData && !loading && (
            <div className="bg-[#0A0B15] border border-indigo-500/30 rounded-xl p-6 mb-6 glow">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-lg font-bold text-white">
                    Extracted Details
                  </h2>
                </div>
                <UrgencyBadge
                  daysLeft={extractedData.days_left as number}
                  urgency={extractedData.urgency as string}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Company */}
                <div className="bg-white/5 border border-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                      Company
                    </span>
                  </div>
                  <p className="text-white font-bold text-lg">
                    {extractedData.company as string}
                  </p>
                </div>

                {/* Role */}
                <div className="bg-white/5 border border-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Briefcase className="w-4 h-4 text-purple-400" />
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                      Role
                    </span>
                  </div>
                  <p className="text-white font-bold text-lg">
                    {extractedData.role as string}
                  </p>
                </div>

                {/* Type */}
                <div className="bg-white/5 border border-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                      Type
                    </span>
                  </div>
                  <span className="inline-flex px-3 py-1 rounded-full text-sm font-mono font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {extractedData.type as string}
                  </span>
                </div>

                {/* Branch */}
                <div className="bg-white/5 border border-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <GraduationCap className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                      Eligible Branches
                    </span>
                  </div>
                  <p className="text-white font-semibold">
                    {extractedData.branch_eligible as string}
                  </p>
                </div>

                {/* CGPA */}
                <div className="bg-white/5 border border-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                      CGPA Required
                    </span>
                  </div>
                  <p className="text-white font-semibold font-mono">
                    {extractedData.cgpa_required
                      ? `≥ ${String(extractedData.cgpa_required)}`
                      : "No minimum"}
                  </p>
                </div>

                {/* Deadline */}
                <div className="bg-white/5 border border-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                      Deadline
                    </span>
                  </div>
                  <p className="text-white font-semibold">
                    {(extractedData.deadline as string) || "Not specified"}
                  </p>
                </div>

                {/* Location */}
                <div className="bg-white/5 border border-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                      Location
                    </span>
                  </div>
                  <p className="text-white font-semibold">
                    {extractedData.location as string}
                  </p>
                </div>

                {/* Stipend */}
                <div className="bg-white/5 border border-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Banknote className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                      Stipend
                    </span>
                  </div>
                  <p className="text-white font-semibold">
                    {extractedData.stipend as string}
                  </p>
                </div>
              </div>

              {/* Apply Link */}
              {Boolean(extractedData.apply_link) && (
                <div className="mb-6 bg-white/5 border border-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <ExternalLink className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                      Apply Link
                    </span>
                  </div>
                  <a
                    href={String(extractedData.apply_link)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-2 break-all"
                  >
                    {String(extractedData.apply_link)}
                  </a>
                </div>
              )}

              {/* Required Skills */}
              {extractedData.required_skills && (
                <div className="mb-4 bg-white/5 border border-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                      Required Skills
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {String(extractedData.required_skills).split(",").map((skill, i) => (
                      <span key={i} className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium rounded-full">
                        {skill.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Duplicate Warning */}
              {extractedData.isDuplicate && (
                <div className="mb-4 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                  <Copy className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-amber-400 font-semibold text-sm">⚠️ Duplicate Detected</p>
                    <p className="text-amber-400/70 text-xs mt-1">
                      You already have a similar opportunity saved in your dashboard. Saving again will create a duplicate.
                    </p>
                  </div>
                </div>
              )}

              {/* Spam Warning */}
              {extractedData.isSpam && (
                <div className="mb-4 bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-red-400 font-semibold text-sm">🚨 Possible Spam Detected</p>
                      <ul className="mt-2 space-y-1">
                        {(extractedData.spamReasons as string[])?.map((reason, i) => (
                          <li key={i} className="text-red-400/70 text-xs flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {reason}
                          </li>
                        ))}
                      </ul>
                      <p className="text-red-400/50 text-xs mt-2">You can still save it if you believe it&apos;s genuine.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Eligibility Check */}
              {userProfile && (
                <div className="mb-6">
                  <EligibilityCard
                    profile={userProfile}
                    opportunity={{
                      branch_eligible: extractedData.branch_eligible as string,
                      cgpa_required: extractedData.cgpa_required as number | null,
                      required_skills: extractedData.required_skills as string | null,
                    }}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                {saved ? (
                  <div className="flex-1 py-3.5 bg-emerald-600/20 text-emerald-400 font-bold rounded-lg flex items-center justify-center gap-2 border border-emerald-500/30">
                    <CheckCircle className="w-5 h-5" />
                    Saved! Redirecting to dashboard...
                  </div>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
                  >
                    {saving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-5 h-5" /> {extractedData.isDuplicate ? "Save Anyway" : extractedData.isSpam ? "Save Anyway (Manual Override)" : "Save to Dashboard"}
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="py-3.5 px-6 bg-white/5 hover:bg-white/10 border border-[#12142A] text-slate-300 font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Extract Another
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
