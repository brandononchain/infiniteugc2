export function calculateVideoCost(scriptContent: string, videoProvider?: string): number {
  const trimmed = scriptContent.trim();
  if (!trimmed) return 0;

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount === 0) return 0;

  const baseCost = Math.max(1, Math.ceil((wordCount / 150) * 10));

  if (videoProvider === "sora2" || videoProvider === "sora2_openai") {
    return baseCost * 3;
  }

  if (videoProvider === "veo3") {
    return baseCost * 3;
  }

  if (videoProvider === "sora2pro" || videoProvider === "sora2pro_openai") {
    return baseCost * 3;
  }

  // Seedance 1.5 Pro costs slightly more than standard providers
  if (videoProvider === "seedance") {
    return baseCost * 2;
  }

  // Hedra Avatar costs 2x (7 credits/sec on Hedra side)
  if (videoProvider === "hedra_avatar") {
    return baseCost * 2;
  }

  // Hedra Omnia costs 3x (15 credits/sec on Hedra side, premium cinematic)
  if (videoProvider === "hedra_omnia") {
    return baseCost * 3;
  }

  return baseCost;
}

export function getWordCount(scriptContent: string): number {
  const trimmed = scriptContent.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function estimateVideoDuration(scriptContent: string): number {
  const wordCount = getWordCount(scriptContent);
  if (wordCount === 0) return 0;
  return Math.round(wordCount * 0.4);
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function calculatePremiumVideoCost(wordCount: number): number {
  if (wordCount === 0) return 0;
  const chunksNeeded = Math.ceil(wordCount / 15);
  const costPerChunk = 50;
  return chunksNeeded * costPerChunk;
}

export function calculatePremiumChunks(wordCount: number): number {
  if (wordCount === 0) return 0;
  return Math.ceil(wordCount / 15);
}
