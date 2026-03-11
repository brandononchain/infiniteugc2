"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import AutoCaptionsTab from "./tabs/AutoCaptionsTab";
import TextOverlaysTab, { type TextOverlay } from "./tabs/TextOverlaysTab";
import ReplyCommentTab, { type ReplyConfig } from "./tabs/ReplyCommentTab";

const TABS = ["Captions", "Overlays", "Reply"] as const;
type Tab = (typeof TABS)[number];

interface AdvancedPopoverProps {
  captionsEnabled: boolean;
  setCaptionsEnabled: (v: boolean) => void;
  captionStyle: string;
  setCaptionStyle: (v: string) => void;
  textOverlays: TextOverlay[];
  setTextOverlays: React.Dispatch<React.SetStateAction<TextOverlay[]>>;
  replyEnabled: boolean;
  setReplyEnabled: (v: boolean) => void;
  replyConfig: ReplyConfig;
  setReplyConfig: React.Dispatch<React.SetStateAction<ReplyConfig>>;
}

export default function AdvancedPopover(props: AdvancedPopoverProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Captions");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="w-full bg-[#0D0D0D]/90 backdrop-blur-2xl border border-white/[0.07] rounded-2xl mb-3 shadow-[0_8px_48px_rgba(0,0,0,0.5)]"
    >
      {/* Tab bar */}
      <div className="flex items-center border-b border-white/[0.06] px-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative px-4 py-3 text-[12px] font-medium tracking-wide transition-colors duration-200 ${
              activeTab === tab
                ? "text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <motion.div
                layoutId="luma-tab-underline"
                className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#00A3FF] rounded-full"
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content — scrollable */}
      <div className="max-h-[360px] overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            {activeTab === "Captions" && (
              <AutoCaptionsTab
                captionsEnabled={props.captionsEnabled}
                setCaptionsEnabled={props.setCaptionsEnabled}
                captionStyle={props.captionStyle}
                setCaptionStyle={props.setCaptionStyle}
              />
            )}
            {activeTab === "Overlays" && (
              <TextOverlaysTab
                textOverlays={props.textOverlays}
                setTextOverlays={props.setTextOverlays}
              />
            )}
            {activeTab === "Reply" && (
              <ReplyCommentTab
                replyEnabled={props.replyEnabled}
                setReplyEnabled={props.setReplyEnabled}
                replyConfig={props.replyConfig}
                setReplyConfig={props.setReplyConfig}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
