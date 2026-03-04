"use client";

import { useState } from "react";
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
} from "@phosphor-icons/react";

const tabs = [
  { id: "account", label: "Account", icon: User },
  { id: "api", label: "API Keys", icon: Key },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState("account");
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-30 glass-header">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 h-16 flex items-center">
          <div>
            <h1 className="text-lg font-bold text-zinc-950 tracking-tight">Settings</h1>
            <p className="text-xs text-zinc-400">Manage your account and preferences</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 lg:px-10 py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-50 rounded-xl p-1 mb-8 w-fit">
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
                <Icon size={14} weight={activeTab === tab.id ? "fill" : "regular"} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Account Tab */}
        {activeTab === "account" && (
          <div className="space-y-6">
            {/* Profile */}
            <div className="bg-white rounded-2xl border border-zinc-200/50 p-6 card-elevated">
              <h3 className="text-sm font-bold text-zinc-900 mb-4">Profile</h3>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white text-xl font-bold">
                  B
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Brandon Chen</p>
                  <p className="text-xs text-zinc-400">brandon@infiniteugc.com</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-medium text-zinc-500 mb-1.5 block">Full Name</label>
                  <input
                    type="text"
                    defaultValue="Brandon Chen"
                    className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-zinc-500 mb-1.5 block">Email</label>
                  <input
                    type="email"
                    defaultValue="brandon@infiniteugc.com"
                    className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button className="text-xs font-semibold text-white bg-zinc-900 px-5 py-2 rounded-full hover:bg-zinc-800 transition-colors">
                  Save Changes
                </button>
              </div>
            </div>

            {/* Password */}
            <div className="bg-white rounded-2xl border border-zinc-200/50 p-6 card-elevated">
              <h3 className="text-sm font-bold text-zinc-900 mb-4">Password</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-medium text-zinc-500 mb-1.5 block">Current Password</label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-zinc-500 mb-1.5 block">New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button className="text-xs font-semibold text-white bg-zinc-900 px-5 py-2 rounded-full hover:bg-zinc-800 transition-colors">
                  Update Password
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-2xl border border-red-200/50 p-6 card-elevated">
              <h3 className="text-sm font-bold text-red-600 mb-1">Danger Zone</h3>
              <p className="text-xs text-zinc-400 mb-4">Permanently delete your account and all associated data.</p>
              <button className="text-xs font-semibold text-red-600 border border-red-200 px-5 py-2 rounded-full hover:bg-red-50 transition-colors">
                Delete Account
              </button>
            </div>
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === "api" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-zinc-200/50 p-6 card-elevated">
              <h3 className="text-sm font-bold text-zinc-900 mb-1">API Key</h3>
              <p className="text-xs text-zinc-400 mb-4">Use this key to authenticate API requests.</p>
              <div className="flex items-center gap-3 bg-zinc-50 rounded-xl px-4 py-3 border border-zinc-200/60">
                <code className="flex-1 text-xs text-zinc-600 font-mono">
                  {showKey ? "sk-inf-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6" : "sk-inf-••••••••••••••••••••••••••••••"}
                </code>
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showKey ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
                <button
                  onClick={handleCopy}
                  className="text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>
              </div>
              <div className="mt-4 flex items-start gap-2 text-xs text-amber-600 bg-amber-50 rounded-xl p-3">
                <Info size={14} className="mt-0.5 shrink-0" />
                <span>Keep your API key secret. Do not share it or expose it in client-side code.</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200/50 p-6 card-elevated">
              <h3 className="text-sm font-bold text-zinc-900 mb-1">Regenerate Key</h3>
              <p className="text-xs text-zinc-400 mb-4">Generate a new key. This will invalidate your current key immediately.</p>
              <button className="text-xs font-semibold text-white bg-zinc-900 px-5 py-2 rounded-full hover:bg-zinc-800 transition-colors">
                Regenerate API Key
              </button>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === "billing" && (
          <div className="space-y-6">
            {/* Current Plan */}
            <div className="bg-white rounded-2xl border border-zinc-200/50 p-6 card-elevated">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Current Plan</h3>
                  <p className="text-xs text-zinc-400">Manage your subscription</p>
                </div>
                <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-3 py-1 rounded-full uppercase tracking-wider">
                  Pro
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-zinc-50 rounded-xl p-3">
                  <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1">Credits</p>
                  <p className="text-lg font-bold text-zinc-900">2,450</p>
                  <p className="text-[10px] text-zinc-400">of 5,000 remaining</p>
                </div>
                <div className="bg-zinc-50 rounded-xl p-3">
                  <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1">Renewal</p>
                  <p className="text-lg font-bold text-zinc-900">Jul 15</p>
                  <p className="text-[10px] text-zinc-400">2025</p>
                </div>
                <div className="bg-zinc-50 rounded-xl p-3">
                  <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1">Monthly</p>
                  <p className="text-lg font-bold text-zinc-900">$99</p>
                  <p className="text-[10px] text-zinc-400">per month</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="text-xs font-semibold text-white bg-zinc-900 px-5 py-2 rounded-full hover:bg-zinc-800 transition-colors">
                  Upgrade Plan
                </button>
                <button className="text-xs font-semibold text-zinc-600 border border-zinc-200 px-5 py-2 rounded-full hover:bg-zinc-50 transition-colors">
                  Cancel Subscription
                </button>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl border border-zinc-200/50 p-6 card-elevated">
              <h3 className="text-sm font-bold text-zinc-900 mb-4">Payment Method</h3>
              <div className="flex items-center justify-between bg-zinc-50 rounded-xl px-4 py-3 border border-zinc-200/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-7 bg-linear-to-br from-zinc-800 to-zinc-950 rounded-md flex items-center justify-center">
                    <span className="text-[8px] text-white font-bold">VISA</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-900">•••• •••• •••• 4242</p>
                    <p className="text-[10px] text-zinc-400">Expires 12/26</p>
                  </div>
                </div>
                <button className="text-xs font-medium text-sky-600 hover:text-sky-700">Change</button>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-zinc-200/50 p-6 card-elevated">
              <h3 className="text-sm font-bold text-zinc-900 mb-4">Email Notifications</h3>
              <div className="space-y-4">
                {[
                  { label: "Video generation complete", description: "Get notified when your videos finish rendering", defaultOn: true },
                  { label: "Generation failed", description: "Alert when a video generation fails", defaultOn: true },
                  { label: "Weekly usage summary", description: "Receive a weekly summary of your credit usage", defaultOn: false },
                  { label: "Product updates", description: "New features and improvements", defaultOn: true },
                  { label: "Marketing emails", description: "Tips, tutorials, and promotional offers", defaultOn: false },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-xs font-semibold text-zinc-900">{item.label}</p>
                      <p className="text-[11px] text-zinc-400">{item.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={item.defaultOn} className="sr-only peer" />
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
