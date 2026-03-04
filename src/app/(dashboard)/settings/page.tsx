"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabaseQueries } from "@/lib/api";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  User,
  Key,
  CreditCard,
  Bell,
  Copy,
  Eye,
  EyeSlash,
  Check,
  Info,
  CircleNotch,
  SignOut,
  X,
} from "@phosphor-icons/react";

const tabs = [
  { id: "account", label: "Account", icon: User },
  { id: "api", label: "API Keys", icon: Key },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
];

export default function Settings() {
  const { user, profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("account");
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  // Account form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
    if (user?.email) setEmail(user.email);
  }, [profile, user]);

  const handleCopy = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const success = await supabaseQueries.updateProfile({ full_name: fullName });
      if (success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError("Failed to update profile");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setUpdatingPassword(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: pwError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (pwError) {
        setError(pwError.message);
      } else {
        setNewPassword("");
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch {
      setError("Failed to update password");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    )
      return;
    // Sign out — actual account deletion would need a backend admin endpoint
    await signOut();
  };

  const initials = (profile?.full_name || user?.email || "U")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const credits = profile?.credits ?? 0;

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-30 brutal-header">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 h-16 flex items-center">
          <div>
            <h1 className="text-lg font-bold text-zinc-950 tracking-tight">
              Settings
            </h1>
            <p className="text-xs text-zinc-500">
              Manage your account and preferences
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 lg:px-10 py-8">
        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2">
            {error}
            <button onClick={() => setError(null)} className="ml-auto">
              <X size={12} />
            </button>
          </div>
        )}

        {saveSuccess && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2">
            <Check size={12} weight="bold" />
            Changes saved successfully
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-50 border border-zinc-200 rounded-xl p-1 mb-8 w-fit shadow-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                <Icon
                  size={14}
                  weight={activeTab === tab.id ? "fill" : "regular"}
                />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Account Tab */}
        {activeTab === "account" && (
          <div className="space-y-6">
            {/* Profile */}
            <div className="bg-white rounded-xl p-6 brutal-card">
              <h3 className="text-sm font-bold text-zinc-900 mb-4">Profile</h3>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white text-xl font-bold">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {profile?.full_name || "User"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {user?.email || "—"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-medium text-zinc-500 mb-1.5 block">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full brutal-input bg-white px-3 py-2 text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-zinc-500 mb-1.5 block">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full brutal-input bg-zinc-50 px-3 py-2 text-sm transition-all text-zinc-500 cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="text-xs font-semibold text-white btn-brutal px-5 py-2 rounded-full disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && (
                    <CircleNotch size={12} className="animate-spin" />
                  )}
                  Save Changes
                </button>
              </div>
            </div>

            {/* Password */}
            <div className="bg-white rounded-xl p-6 brutal-card">
              <h3 className="text-sm font-bold text-zinc-900 mb-4">
                Password
              </h3>
              <div className="max-w-xs">
                <label className="text-[11px] font-medium text-zinc-500 mb-1.5 block">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full brutal-input bg-white px-3 py-2 text-sm transition-all"
                />
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleUpdatePassword}
                  disabled={updatingPassword || !newPassword}
                  className="text-xs font-semibold text-white btn-brutal px-5 py-2 rounded-full disabled:opacity-50 flex items-center gap-2"
                >
                  {updatingPassword && (
                    <CircleNotch size={12} className="animate-spin" />
                  )}
                  Update Password
                </button>
              </div>
            </div>

            {/* Sign Out */}
            <div className="bg-white rounded-xl p-6 brutal-card">
              <h3 className="text-sm font-bold text-zinc-900 mb-1">Session</h3>
              <p className="text-xs text-zinc-500 mb-4">
                Sign out of your current session.
              </p>
              <button
                onClick={signOut}
                className="flex items-center gap-2 text-xs font-semibold text-zinc-600 border border-zinc-200 px-5 py-2 rounded-full shadow-sm hover:shadow-md hover:-translate-y-px transition-all"
              >
                <SignOut size={14} weight="bold" />
                Sign Out
              </button>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-xl border border-red-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-red-600 mb-1">
                Danger Zone
              </h3>
              <p className="text-xs text-zinc-500 mb-4">
                Permanently delete your account and all associated data.
              </p>
              <button
                onClick={handleDeleteAccount}
                className="text-xs font-semibold text-red-600 border border-red-200 px-5 py-2 rounded-full shadow-sm hover:shadow-md hover:-translate-y-px transition-all hover:bg-red-50"
              >
                Delete Account
              </button>
            </div>
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === "api" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 brutal-card">
              <h3 className="text-sm font-bold text-zinc-900 mb-1">
                User ID
              </h3>
              <p className="text-xs text-zinc-500 mb-4">
                Your unique user identifier (use as API key for authenticated
                requests).
              </p>
              <div className="flex items-center gap-3 bg-zinc-50 rounded-xl px-4 py-3 border border-zinc-200 shadow-sm">
                <code className="flex-1 text-xs text-zinc-600 font-mono">
                  {showKey ? user?.id || "—" : "••••••••-••••-••••-••••-••••••••••••"}
                </code>
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="text-zinc-500 hover:text-zinc-700 transition-colors"
                >
                  {showKey ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
                <button
                  onClick={handleCopy}
                  className="text-zinc-500 hover:text-zinc-700 transition-colors"
                >
                  {copied ? (
                    <Check size={16} className="text-emerald-500" />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>
              <div className="mt-4 brutal-info flex items-start gap-2 text-xs text-amber-700 p-3">
                <Info size={14} className="mt-0.5 shrink-0" />
                <span>
                  Authentication is handled via Supabase tokens. Your user ID is
                  shown here for reference.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === "billing" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 brutal-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">
                    Credits Balance
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Your available generation credits
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200 shadow-sm">
                  <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
                    Available Credits
                  </p>
                  <p className="text-2xl font-bold text-zinc-900">
                    {credits.toLocaleString()}
                  </p>
                </div>
                <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200 shadow-sm">
                  <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
                    Account Created
                  </p>
                  <p className="text-sm font-bold text-zinc-900 mt-2">
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="brutal-info flex items-start gap-2 text-xs text-sky-700 p-3">
                <Info size={14} className="mt-0.5 shrink-0" />
                <span>
                  Credits are consumed when generating videos, hooks, or images.
                  Standard videos cost based on word count, hooks cost 15
                  credits, and premium videos have provider-specific pricing.
                </span>
              </div>
            </div>

            {/* Credit costs reference */}
            <div className="bg-white rounded-xl p-6 brutal-card">
              <h3 className="text-sm font-bold text-zinc-900 mb-4">
                Credit Costs
              </h3>
              <div className="space-y-3">
                {[
                  {
                    label: "Standard Video",
                    cost: "~1 credit per word",
                    note: "Multiplied by provider (1x-3x)",
                  },
                  {
                    label: "Premium — VEO3",
                    cost: "50 credits/chunk",
                    note: "",
                  },
                  {
                    label: "Premium — Sora 2 Pro",
                    cost: "75 credits/chunk",
                    note: "",
                  },
                  {
                    label: "Premium — OmniHuman",
                    cost: "40 credits/chunk",
                    note: "",
                  },
                  { label: "Hooks", cost: "15 credits", note: "" },
                  {
                    label: "Captions",
                    cost: "+25 credits",
                    note: "Added to video cost",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0"
                  >
                    <div>
                      <p className="text-xs font-semibold text-zinc-800">
                        {item.label}
                      </p>
                      {item.note && (
                        <p className="text-[10px] text-zinc-400">
                          {item.note}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-bold text-zinc-600">
                      {item.cost}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 brutal-card">
              <h3 className="text-sm font-bold text-zinc-900 mb-4">
                Email Notifications
              </h3>
              <div className="space-y-4">
                {[
                  {
                    label: "Video generation complete",
                    description:
                      "Get notified when your videos finish rendering",
                    defaultOn: true,
                  },
                  {
                    label: "Generation failed",
                    description: "Alert when a video generation fails",
                    defaultOn: true,
                  },
                  {
                    label: "Weekly usage summary",
                    description:
                      "Receive a weekly summary of your credit usage",
                    defaultOn: false,
                  },
                  {
                    label: "Product updates",
                    description: "New features and improvements",
                    defaultOn: true,
                  },
                  {
                    label: "Marketing emails",
                    description: "Tips, tutorials, and promotional offers",
                    defaultOn: false,
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-xs font-semibold text-zinc-900">
                        {item.label}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {item.description}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked={item.defaultOn}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:inset-s-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
