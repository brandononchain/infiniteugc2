import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  OffthreadVideo,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

/**
 * ============================================================================
 * FRAME-DETERMINISTIC CAPTIONED VIDEO COMPONENT
 * ============================================================================
 *
 * This component guarantees 100% frame determinism:
 *
 * 1. Uses OffthreadVideo instead of Video for frame-perfect sync
 * 2. All caption timing is INTEGER FRAME based (no floats)
 * 3. No time-based APIs (Date, performance, currentTime)
 * 4. No state, effects, or async operations
 * 5. Same frame number ALWAYS produces identical React output
 *
 * ============================================================================
 */

/**
 * Caption phrase interface - FRAME BASED
 */
interface CaptionPhrase {
  text: string;
  startTime: number;
  duration: number;
  _startFrame?: number;
  _endFrame?: number;
}

interface CaptionStyle {
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  strokeColor: string;
  strokeWidth: number;
  alignment: 'left' | 'center' | 'right';
  verticalPosition: 'top' | 'middle' | 'bottom';
  yOffset: number;
  maxWordsPerPhrase?: number;
  styleType?: 'clean' | 'pop' | 'native' | 'highlight' | 'white-bg' | 'black-bg' | 'red-bg' | 'outline' | 'plain-white';
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  backgroundColor?: string;
  backgroundPadding?: number;
  boxDecorationBreak?: boolean;
}

interface CaptionPosition {
  x: number;
  y: number;
}

interface TextLayer {
  text_content: string;
  position_x: number;
  position_y: number;
  start_time: number;
  duration: number;
  style_config: CaptionStyle;
  isHook?: boolean;
}

interface ReplyOverlayConfig {
  enabled: boolean;
  avatar_url: string | null;
  person_name: string;
  comment_text: string;
  position_x: number;
  position_y: number;
  start_time: number;
  duration: number;
  scale?: number;
  rotation?: number;
}

export interface CaptionedVideoProps {
  videoUrl?: string;
  captions?: CaptionPhrase[];
  captionStyle?: CaptionStyle | null;
  captionPosition?: CaptionPosition | null;
  textLayers?: TextLayer[];
  replyOverlay?: ReplyOverlayConfig | null;
}

// ============================================================================
// PURE FUNCTIONS - No side effects, deterministic
// ============================================================================

const getFontFamily = (family: string = 'TikTok Sans'): string => {
  return 'TikTok Sans, sans-serif';
};

const getVerticalPosition = (style: CaptionStyle): string => {
  const yOffset = style.yOffset || 0;
  switch (style.verticalPosition) {
    case 'top':
      return `calc(15% + ${yOffset}px)`;
    case 'bottom':
      return `calc(80% + ${yOffset}px)`;
    case 'middle':
    default:
      return `calc(50% + ${yOffset}px)`;
  }
};

// ============================================================================
// TIKTOK-STYLE SVG CURVE GENERATION (matches frontend VideoPreviewCanvas)
// ============================================================================

interface LineBox {
  boxX: number;
  boxY: number;
  boxWidth: number;
  boxHeight: number;
  text: string;
}

/**
 * Shared TikTok layout constants (at 1080p scale = 1).
 * KEEP IN SYNC with infinite-ugc/src/lib/caption-path.ts TIKTOK_LAYOUT
 */
const TIKTOK_LAYOUT = {
  paddingH: 4,
  paddingTop: 5,
  paddingBottom: 10,
  cornerRadius: 25,
  jointRadius: 18,
  consistentPaddingH: { single: 30, multi: 22 },
  extraTopPadding: { single: 10, multi: 4 },
  extraBottomPadding: { single: 10, multi: 5 },
} as const;

/**
 * Build TikTok-style connected SVG path with rounded step joints.
 *
 * At each joint where two lines have different widths, we draw:
 *   vertical → Q curve (round corner) → horizontal → Q curve → vertical
 */
function buildTikTokSvgPath(boxes: LineBox[], cornerRadius: number, jointRadius: number = 20): string {
  if (boxes.length === 0) return '';

  // --- Normalize adjacent boxes: when two neighbouring lines have a width
  //     difference smaller than jointRadius, expand the narrower one to match
  //     the wider one (keeping it centred). This merges near-equal lines into
  //     a single clean rectangle instead of producing tiny dents or steps. ---
  const b: LineBox[] = boxes.map((box) => ({ ...box })); // shallow clone
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < b.length - 1; i++) {
      const a = b[i];
      const n = b[i + 1];
      const aRight = a.boxX + a.boxWidth;
      const nRight = n.boxX + n.boxWidth;
      const diffLeft = Math.abs(a.boxX - n.boxX);
      const diffRight = Math.abs(aRight - nRight);

      if (diffLeft < jointRadius || diffRight < jointRadius) {
        const mergedLeft = Math.min(a.boxX, n.boxX);
        const mergedRight = Math.max(aRight, nRight);
        const mergedWidth = mergedRight - mergedLeft;

        if (a.boxX !== mergedLeft || a.boxWidth !== mergedWidth) {
          a.boxX = mergedLeft;
          a.boxWidth = mergedWidth;
          changed = true;
        }
        if (n.boxX !== mergedLeft || n.boxWidth !== mergedWidth) {
          n.boxX = mergedLeft;
          n.boxWidth = mergedWidth;
          changed = true;
        }
      }
    }
  }

  const r = cornerRadius;
  const first = b[0];
  const last = b[b.length - 1];

  // --- Top edge ---
  let svgPath = `M ${first.boxX + r} ${first.boxY}`;
  svgPath += ` L ${first.boxX + first.boxWidth - r} ${first.boxY}`;
  svgPath += ` Q ${first.boxX + first.boxWidth} ${first.boxY} ${first.boxX + first.boxWidth} ${first.boxY + r}`;

  // --- Right side going down ---
  for (let i = 0; i < b.length; i++) {
    const curr = b[i];
    const next = b[i + 1];

    if (next) {
      const jointY = curr.boxY + curr.boxHeight;
      const currRight = curr.boxX + curr.boxWidth;
      const nextRight = next.boxX + next.boxWidth;
      const widthDiff = Math.abs(currRight - nextRight);
      const cr = Math.min(widthDiff / 2, jointRadius);

      if (widthDiff < 2) {
        // Lines are effectively the same width — straight vertical
        svgPath += ` L ${currRight} ${jointY}`;
      } else if (nextRight > currRight) {
        svgPath += ` L ${currRight} ${jointY - cr}`;
        svgPath += ` Q ${currRight} ${jointY} ${currRight + cr} ${jointY}`;
        svgPath += ` L ${nextRight - cr} ${jointY}`;
        svgPath += ` Q ${nextRight} ${jointY} ${nextRight} ${jointY + cr}`;
      } else {
        svgPath += ` L ${currRight} ${jointY - cr}`;
        svgPath += ` Q ${currRight} ${jointY} ${currRight - cr} ${jointY}`;
        svgPath += ` L ${nextRight + cr} ${jointY}`;
        svgPath += ` Q ${nextRight} ${jointY} ${nextRight} ${jointY + cr}`;
      }
    } else {
      svgPath += ` L ${curr.boxX + curr.boxWidth} ${curr.boxY + curr.boxHeight - r}`;
      svgPath += ` Q ${curr.boxX + curr.boxWidth} ${curr.boxY + curr.boxHeight} ${curr.boxX + curr.boxWidth - r} ${curr.boxY + curr.boxHeight}`;
    }
  }

  // --- Bottom edge ---
  svgPath += ` L ${last.boxX + r} ${last.boxY + last.boxHeight}`;
  svgPath += ` Q ${last.boxX} ${last.boxY + last.boxHeight} ${last.boxX} ${last.boxY + last.boxHeight - r}`;

  // --- Left side going up ---
  for (let i = b.length - 1; i >= 0; i--) {
    const curr = b[i];
    const prev = b[i - 1];

    if (prev) {
      const jointY = curr.boxY;
      const currLeft = curr.boxX;
      const prevLeft = prev.boxX;
      const widthDiff = Math.abs(currLeft - prevLeft);
      const cr = Math.min(widthDiff / 2, jointRadius);

      if (widthDiff < 2) {
        // Lines are effectively the same width — straight vertical
        svgPath += ` L ${currLeft} ${jointY}`;
      } else if (prevLeft < currLeft) {
        svgPath += ` L ${currLeft} ${jointY + cr}`;
        svgPath += ` Q ${currLeft} ${jointY} ${currLeft - cr} ${jointY}`;
        svgPath += ` L ${prevLeft + cr} ${jointY}`;
        svgPath += ` Q ${prevLeft} ${jointY} ${prevLeft} ${jointY - cr}`;
      } else {
        svgPath += ` L ${currLeft} ${jointY + cr}`;
        svgPath += ` Q ${currLeft} ${jointY} ${currLeft + cr} ${jointY}`;
        svgPath += ` L ${prevLeft - cr} ${jointY}`;
        svgPath += ` Q ${prevLeft} ${jointY} ${prevLeft} ${jointY - cr}`;
      }
    } else {
      svgPath += ` L ${curr.boxX} ${curr.boxY + r}`;
      svgPath += ` Q ${curr.boxX} ${curr.boxY} ${curr.boxX + r} ${curr.boxY}`;
    }
  }

  svgPath += ' Z';
  return svgPath;
}

/**
 * Calculate text layout for TikTok-style captions or text layers
 */
interface TextLayoutResult {
  svgPath: string;
  hasBackground: boolean;
  backgroundColor: string;
  textLines: Array<{ text: string; x: number; y: number }>;
  fontSize: number;
  fontColor: string;
  hasStroke: boolean;
  strokeColor: string;
  strokeWidth: number;
}

function calculateTikTokTextLayout(
  text: string,
  style: CaptionStyle,
  position: { x: number; y: number },
  canvasWidth: number,
  canvasHeight: number,
  isTextLayer: boolean = false
): TextLayoutResult {
  const fontSize = style.fontSize || 56;
  const hasBackground = !!style.backgroundColor;
  const hasStroke = (style.strokeWidth || 0) > 0;

  // Scale factor based on canvas width (1080p reference)
  // In Remotion, canvasWidth is typically 1080, so scale = 1
  const scale = canvasWidth / 1080;

  // TikTok measurements from shared constants
  const L = TIKTOK_LAYOUT;
  const paddingH = L.paddingH * scale;
  const paddingTop = L.paddingTop * scale;
  const paddingBottom = L.paddingBottom * scale;
  const cornerRadius = L.cornerRadius * scale;

  const maxWidth = canvasWidth * 0.85;
  const lines: { text: string; width: number }[] = [];

  // Use Canvas measureText for accurate font-aware width measurement (Remotion runs in browser)
  // Fallback to charWidthRatio if Canvas is unavailable
  const charWidthRatio = 0.55;
  let measureCtx: CanvasRenderingContext2D | null = null;
  try {
    const measureCanvas = document.createElement('canvas');
    measureCtx = measureCanvas.getContext('2d');
    if (measureCtx) {
      measureCtx.font = `600 ${fontSize}px TikTok Sans, sans-serif`;
    }
  } catch {
    // Not in browser context, fallback to charWidthRatio
  }

  const measureText = (text: string): number => {
    if (measureCtx) {
      return measureCtx.measureText(text).width;
    }
    return text.length * fontSize * charWidthRatio;
  };

  // Balanced word-wrap for a single paragraph that overflows maxWidth
  const balancedWrap = (words: string[]) => {
    // Greedy to find min lines needed
    let greedyCount = 1;
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (measureText(testLine) > maxWidth && currentLine) {
        greedyCount++;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    const numLines = greedyCount;

    // DP: minimize sum-of-squared-widths for balanced distribution
    const lineWidthFor = (from: number, to: number): number => {
      let text = words[from];
      for (let k = from + 1; k <= to; k++) {
        text += ' ' + words[k];
      }
      return measureText(text);
    };

    const n = words.length;
    const INF = 1e18;
    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(numLines + 1).fill(INF));
    const splitPt: number[][] = Array.from({ length: n + 1 }, () => Array(numLines + 1).fill(0));
    dp[0][0] = 0;

    for (let j = 1; j <= numLines; j++) {
      for (let i = j; i <= n; i++) {
        for (let k = j - 1; k < i; k++) {
          const w = lineWidthFor(k, i - 1);
          if (w <= maxWidth) {
            const cost = dp[k][j - 1] + w * w;
            if (cost < dp[i][j]) {
              dp[i][j] = cost;
              splitPt[i][j] = k;
            }
          }
        }
      }
    }

    const balancedLines: string[][] = [];
    let remaining = n;
    let linesLeft = numLines;
    while (linesLeft > 0) {
      const start = splitPt[remaining][linesLeft];
      balancedLines.unshift(words.slice(start, remaining));
      remaining = start;
      linesLeft--;
    }

    for (const lineWords of balancedLines) {
      const text = lineWords.join(' ');
      lines.push({ text, width: measureText(text) });
    }
  };

  if (isTextLayer) {
    // Respect user's manual line breaks — each paragraph = one line
    // Only apply balanced word-wrap if a single paragraph overflows maxWidth
    const paragraphs = text.split(/\r?\n/);
    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) {
        lines.push({ text: '', width: 0 });
        continue;
      }
      const paraWidth = measureText(trimmed);
      if (paraWidth <= maxWidth) {
        lines.push({ text: trimmed, width: paraWidth });
      } else {
        balancedWrap(trimmed.split(/\s+/));
      }
    }
  } else {
    // For captions: process as single block
    const trimmed = text.trim();
    if (!trimmed) {
      lines.push({ text: '', width: 0 });
    } else {
      const paraWidth = measureText(trimmed);
      if (paraWidth <= maxWidth) {
        lines.push({ text: trimmed, width: paraWidth });
      } else {
        balancedWrap(trimmed.split(/\s+/));
      }
    }
  }

  // Extra padding for first/last lines (from shared constants)
  const isSingleLine = lines.length === 1;
  const extraTopPadding = (isSingleLine ? L.extraTopPadding.single : L.extraTopPadding.multi) * scale;
  const extraBottomPadding = (isSingleLine ? L.extraBottomPadding.single : L.extraBottomPadding.multi) * scale;

  // Line box height - fontSize is already at 1080p scale
  const lineBoxHeight = fontSize + paddingTop + paddingBottom;

  // Total height includes extra padding for first/last lines
  const totalHeight = lines.length * lineBoxHeight + extraTopPadding + extraBottomPadding;

  // Position
  const baseX = position.x * canvasWidth;
  const baseY = position.y * canvasHeight;
  const startY = baseY - totalHeight / 2;

  // Consistent horizontal padding (from shared constants)
  const consistentPaddingH = (isSingleLine ? L.consistentPaddingH.single : L.consistentPaddingH.multi) * scale;

  const boxes: LineBox[] = lines.map((line, index) => {
    const isFirst = index === 0;
    const isLast = index === lines.length - 1;
    const boxWidth = line.width + (consistentPaddingH * 2);
    const boxX = baseX - boxWidth / 2;
    const extraTop = isFirst ? extraTopPadding : 0;
    const extraBottom = isLast ? extraBottomPadding : 0;
    const boxY = startY + index * lineBoxHeight - (isFirst ? extraTopPadding : 0);
    const boxHeight = lineBoxHeight + extraTop + extraBottom;
    return { boxX, boxY, boxWidth, boxHeight, text: line.text };
  });

  // Build SVG path
  let svgPath = '';
  if (hasBackground && boxes.length > 0) {
    svgPath = buildTikTokSvgPath(boxes, cornerRadius, L.jointRadius);
  }

  // Text positions - account for extra padding on first line (matching frontend)
  const textLines = boxes.map((box, index) => ({
    text: box.text,
    x: baseX,
    y: box.boxY + (index === 0 ? extraTopPadding : 0) + paddingTop + fontSize * 0.85,
  }));

  return {
    svgPath,
    hasBackground,
    backgroundColor: style.backgroundColor || '',
    textLines,
    fontSize,
    fontColor: style.fontColor || '#FFFFFF',
    hasStroke,
    strokeColor: style.strokeColor || '#000000',
    strokeWidth: style.strokeWidth || 0,
  };
}

// ============================================================================
// FRAME-ALIGNED CAPTION SYSTEM
// ============================================================================

interface FrameAlignedCaption {
  text: string;
  startFrame: number;
  endFrame: number;
}

/**
 * Convert time-based captions to STRICTLY frame-aligned captions
 *
 * GUARANTEES:
 * 1. First caption starts at frame 0
 * 2. No gaps between captions
 * 3. No overlapping frames
 * 4. Every frame from 0 to totalFrames has exactly ONE owner
 */
function convertToFrameAligned(
  captions: CaptionPhrase[],
  fps: number,
  totalFrames: number
): FrameAlignedCaption[] {
  if (captions.length === 0) return [];

  const result: FrameAlignedCaption[] = [];

  for (let i = 0; i < captions.length; i++) {
    const caption = captions[i];
    const isFirst = i === 0;
    const isLast = i === captions.length - 1;

    let startFrame: number;
    let endFrame: number;

    // Use pre-computed frame data if available
    if (caption._startFrame !== undefined && caption._endFrame !== undefined) {
      startFrame = caption._startFrame;
      endFrame = caption._endFrame;
    } else {
      // Convert from time to frames using floor (never ceil or round)
      startFrame = Math.floor(caption.startTime * fps);
      endFrame = Math.floor((caption.startTime + caption.duration) * fps) - 1;
    }

    // RULE 1: First caption MUST start at frame 0
    if (isFirst) {
      startFrame = 0;
    } else {
      // RULE 2: Each caption starts exactly 1 frame after previous ends
      const prevEnd = result[i - 1].endFrame;
      startFrame = prevEnd + 1;
    }

    // RULE 3: Last caption extends to totalFrames - 1
    if (isLast) {
      endFrame = Math.max(endFrame, totalFrames - 1);
    } else {
      // Ensure minimum 1 frame duration
      if (endFrame < startFrame) {
        endFrame = startFrame;
      }
    }

    result.push({
      text: caption.text,
      startFrame,
      endFrame,
    });
  }

  // VALIDATION: Ensure complete frame coverage with no gaps
  for (let i = 0; i < result.length - 1; i++) {
    const current = result[i];
    const next = result[i + 1];

    // Close any gaps
    if (next.startFrame !== current.endFrame + 1) {
      result[i].endFrame = next.startFrame - 1;
    }
  }

  return result;
}

/**
 * DETERMINISTIC binary search for caption at frame
 * O(log n) lookup, returns exactly one caption
 */
function findCaptionAtFrame(
  captions: FrameAlignedCaption[],
  frame: number
): FrameAlignedCaption | null {
  if (captions.length === 0) return null;

  // Early frames fallback
  if (frame < captions[0].startFrame) {
    return captions[0];
  }

  // Late frames fallback
  const lastCaption = captions[captions.length - 1];
  if (frame > lastCaption.endFrame) {
    return lastCaption;
  }

  // Binary search for O(log n) performance
  let left = 0;
  let right = captions.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const caption = captions[mid];

    if (frame >= caption.startFrame && frame <= caption.endFrame) {
      return caption;
    }

    if (frame < caption.startFrame) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  // Should never reach here with proper frame coverage
  return captions[0];
}

// ============================================================================
// PURE RENDER COMPONENTS - No state, no effects
// ============================================================================

/**
 * TikTok-style caption container with SVG background curves
 * Matches the frontend VideoPreviewCanvas rendering exactly
 */
const TikTokCaptionContainer: React.FC<{
  text: string;
  visible: boolean;
  style: CaptionStyle;
  position: CaptionPosition;
  canvasWidth: number;
  canvasHeight: number;
}> = React.memo(({ text, visible, style, position, canvasWidth, canvasHeight }) => {
  // Calculate layout with TikTok-style curves
  const layout = useMemo(
    () => calculateTikTokTextLayout(text, style, position, canvasWidth, canvasHeight),
    [text, style, position, canvasWidth, canvasHeight]
  );

  if (!visible) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 100,
      }}
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Background with curved joints */}
      {layout.hasBackground && layout.svgPath && (
        <path
          d={layout.svgPath}
          fill={layout.backgroundColor}
        />
      )}
      {/* Text lines */}
      {layout.textLines.map((line, index) => (
        <text
          key={index}
          x={line.x}
          y={line.y}
          textAnchor="middle"
          dominantBaseline="alphabetic"
          fontWeight="600"
          fontSize={layout.fontSize}
          fontFamily="TikTok Sans, sans-serif"
          fill={layout.fontColor}
          {...(layout.hasStroke && {
            stroke: layout.strokeColor,
            strokeWidth: layout.strokeWidth,
            paintOrder: 'stroke fill',
            strokeLinejoin: 'round' as const,
            strokeLinecap: 'round' as const,
          })}
        >
          {line.text}
        </text>
      ))}
    </svg>
  );
});

/**
 * Legacy caption container (fallback for non-TikTok styles)
 */
const CaptionContainer: React.FC<{
  text: string;
  visible: boolean;
  style: CaptionStyle;
}> = React.memo(({ text, visible, style }) => {
  const styleType = style.styleType || 'pop';

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    top: getVerticalPosition(style),
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    minHeight: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: style.alignment === 'left' ? 'flex-start' :
                    style.alignment === 'right' ? 'flex-end' : 'center',
    textAlign: style.alignment || 'center',
    zIndex: 100,
    visibility: visible ? 'visible' : 'hidden',
    opacity: visible ? 1 : 0,
    contain: 'layout style paint',
    pointerEvents: 'none',
  };

  const baseTextStyle: React.CSSProperties = {
    fontFamily: getFontFamily(style.fontFamily),
    fontSize: style.fontSize || 72,
    fontWeight: 600,
    lineHeight: 1.2,
    textTransform: 'uppercase',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    maxWidth: '100%',
  };

  let textElement: React.ReactNode;

  switch (styleType) {
    case 'clean':
      textElement = (
        <span style={{
          ...baseTextStyle,
          color: style.fontColor || '#FFFFFF',
          textShadow: `${style.shadowOffsetX || 2}px ${style.shadowOffsetY || 2}px ${style.shadowBlur || 8}px ${style.shadowColor || 'rgba(0,0,0,0.5)'}`,
        }}>
          {text}
        </span>
      );
      break;

    case 'native':
      textElement = (
        <span style={{
          ...baseTextStyle,
          color: style.fontColor || '#000000',
          WebkitTextStroke: `${style.strokeWidth || 5}px ${style.strokeColor || '#FFFFFF'}`,
          paintOrder: 'stroke fill',
        }}>
          {text}
        </span>
      );
      break;

    case 'highlight':
      textElement = (
        <span style={{
          ...baseTextStyle,
          color: style.fontColor || '#FFFFFF',
          backgroundColor: style.backgroundColor || '#FF0050',
          padding: `${style.backgroundPadding || 8}px ${(style.backgroundPadding || 8) * 2}px`,
          boxDecorationBreak: 'clone',
          WebkitBoxDecorationBreak: 'clone',
          boxShadow: `0 4px 8px ${style.shadowColor || 'rgba(0,0,0,0.3)'}`,
        }}>
          {text}
        </span>
      );
      break;

    case 'pop':
    default:
      textElement = (
        <span style={{
          ...baseTextStyle,
          color: style.fontColor || '#FFFFFF',
          WebkitTextStroke: `${style.strokeWidth || 8}px ${style.strokeColor || '#000000'}`,
          paintOrder: 'stroke fill',
          textShadow: `0 ${style.shadowOffsetY || 4}px ${style.shadowBlur || 4}px ${style.shadowColor || 'rgba(0,0,0,0.3)'}`,
          letterSpacing: '-0.02em',
        }}>
          {text}
        </span>
      );
  }

  return <div style={containerStyle}>{textElement}</div>;
});

/**
 * TikTok-style text overlay layer with SVG background curves
 * Matches the frontend VideoPreviewCanvas rendering exactly
 */
const TikTokTextOverlayLayer: React.FC<{
  layer: TextLayer;
  visible: boolean;
  canvasWidth: number;
  canvasHeight: number;
}> = React.memo(({ layer, visible, canvasWidth, canvasHeight }) => {
  const style = layer.style_config || ({} as CaptionStyle);
  const position = { x: layer.position_x || 0.5, y: layer.position_y || 0.5 };

  // Calculate layout with TikTok-style curves (isTextLayer=true for text overlays)
  const layout = useMemo(
    () => calculateTikTokTextLayout(layer.text_content, style, position, canvasWidth, canvasHeight, true),
    [layer.text_content, style, position, canvasWidth, canvasHeight]
  );

  if (!visible) return null;

  return (
    <g>
      {/* Background with curved joints */}
      {layout.hasBackground && layout.svgPath && (
        <path
          d={layout.svgPath}
          fill={layout.backgroundColor}
        />
      )}
      {/* Text lines */}
      {layout.textLines.map((line, index) => (
        <text
          key={index}
          x={line.x}
          y={line.y}
          textAnchor="middle"
          dominantBaseline="alphabetic"
          fontWeight="600"
          fontSize={layout.fontSize}
          fontFamily="TikTok Sans, sans-serif"
          fill={layout.fontColor}
          {...(layout.hasStroke && {
            stroke: layout.strokeColor,
            strokeWidth: layout.strokeWidth,
            paintOrder: 'stroke fill',
            strokeLinejoin: 'round' as const,
            strokeLinecap: 'round' as const,
          })}
        >
          {line.text}
        </text>
      ))}
    </g>
  );
});

/**
 * Legacy text overlay layer (fallback)
 */
const TextOverlayLayer: React.FC<{
  layer: TextLayer;
  visible: boolean;
}> = React.memo(({ layer, visible }) => {
  const style = layer.style_config || ({} as CaptionStyle);
  const isHighlight = style.styleType === 'highlight';

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${(layer.position_x || 0.5) * 100}%`,
    top: `${(layer.position_y || 0.5) * 100}%`,
    transform: 'translate(-50%, -50%)',
    fontFamily: getFontFamily(style.fontFamily),
    fontSize: style.fontSize || 64,
    fontWeight: 600,
    color: style.fontColor || '#FFFFFF',
    lineHeight: 1.3,
    zIndex: layer.isHook ? 150 : 50,
    textTransform: 'uppercase',
    textAlign: 'center',
    maxWidth: '85%',
    visibility: visible ? 'visible' : 'hidden',
    opacity: visible ? 1 : 0,
    contain: 'layout style paint',
    pointerEvents: 'none',
    whiteSpace: 'pre-line',
  };

  if (isHighlight && style.backgroundColor) {
    return (
      <div style={{ ...containerStyle, backgroundColor: 'transparent' }}>
        <span style={{
          backgroundColor: style.backgroundColor,
          padding: `${style.backgroundPadding || 8}px ${(style.backgroundPadding || 8) * 2}px`,
          boxDecorationBreak: 'clone',
          WebkitBoxDecorationBreak: 'clone',
          boxShadow: `0 4px 8px ${style.shadowColor || 'rgba(0,0,0,0.3)'}`,
        }}>
          {layer.text_content}
        </span>
      </div>
    );
  }

  return (
    <div style={{
      ...containerStyle,
      WebkitTextStroke: (style.strokeWidth || 4) > 0
        ? `${style.strokeWidth || 4}px ${style.strokeColor || '#000000'}`
        : undefined,
      paintOrder: 'stroke fill',
      textShadow: style.shadowBlur
        ? `${style.shadowOffsetX || 2}px ${style.shadowOffsetY || 2}px ${style.shadowBlur}px ${style.shadowColor || 'rgba(0,0,0,0.5)'}`
        : '2px 2px 4px rgba(0,0,0,0.5)',
    }}>
      {layer.text_content}
    </div>
  );
});

// ============================================================================
// REPLY OVERLAY COMPONENT - TikTok-style comment bubble
// ============================================================================

/**
 * Wrap text into lines that fit within maxWidth (character-based approximation)
 */
function wrapReplyText(text: string, fontSize: number, maxWidth: number): string[] {
  const charWidth = fontSize * 0.52;
  const maxCharsPerLine = Math.max(10, Math.floor(maxWidth / charWidth));
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    // Force-break words longer than maxCharsPerLine
    if (word.length > maxCharsPerLine) {
      if (currentLine) { lines.push(currentLine); currentLine = ''; }
      for (let i = 0; i < word.length; i += maxCharsPerLine) {
        lines.push(word.slice(i, i + maxCharsPerLine));
      }
      continue;
    }
    const test = currentLine ? `${currentLine} ${word}` : word;
    if (test.length > maxCharsPerLine && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = test;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

const ReplyOverlayLayer: React.FC<{
  config: ReplyOverlayConfig;
  visible: boolean;
  canvasWidth: number;
  canvasHeight: number;
}> = React.memo(({ config, visible, canvasWidth, canvasHeight }) => {
  if (!visible) return null;

  const bubbleWidth = canvasWidth * 0.5;
  const s = bubbleWidth / (320 * 0.5);
  const avatarSize = 20 * s;
  const paddingH = 5 * s;
  const paddingV = 8 * s;
  const headerFontSize = 8 * s;
  const commentFontSize = 11 * s;
  const cornerRadius = 6 * s;
  const headerCommentGap = 0;

  const paddingRight = 3 * s;
  const maxRightColWidth = bubbleWidth - avatarSize - paddingH * 2 - paddingRight;
  const fullHeader = `Reply to ${config.person_name}'s comment`;
  const headerLines = wrapReplyText(fullHeader, headerFontSize, maxRightColWidth);
  const commentLines = wrapReplyText(config.comment_text, commentFontSize, maxRightColWidth);

  const headerLineHeight = headerFontSize * 1.3;
  const headerHeight = headerLines.length * headerLineHeight;
  const commentBlockHeight = commentLines.length * commentFontSize * 1.35;
  const rightColHeight = headerHeight + headerCommentGap + commentBlockHeight;
  const contentHeight = Math.max(avatarSize, rightColHeight);
  const bubbleHeight = contentHeight + paddingV * 2;

  const bubbleX = config.position_x * canvasWidth - bubbleWidth / 2;
  const bubbleY = config.position_y * canvasHeight - bubbleHeight / 2;
  const cx = config.position_x * canvasWidth;
  const cy = config.position_y * canvasHeight;
  const bScale = config.scale ?? 1;
  const bRotation = config.rotation ?? 0;

  const textX = bubbleX + paddingH + avatarSize + paddingH;
  const headerStartY = bubbleY + paddingV + headerFontSize * 0.85;
  const commentBaseY = bubbleY + paddingV + headerHeight + headerCommentGap;
  const avatarX = bubbleX + paddingH;
  const avatarY = bubbleY + paddingV + 4 * s;
  const avatarCx = avatarX + avatarSize / 2;
  const avatarCy = avatarY + avatarSize / 2;

  const tailH = 7 * s;
  const tipR = 3 * s;
  const tailStartX = 6 * s;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 200 }}>
      <svg
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <g transform={`translate(${cx} ${cy}) rotate(${bRotation}) scale(${bScale}) translate(${-cx} ${-cy})`}>
        {/* Single path: rounded rect + slim tail at bottom-left */}
        <path
          d={`M ${bubbleX + cornerRadius} ${bubbleY}
              L ${bubbleX + bubbleWidth - cornerRadius} ${bubbleY}
              Q ${bubbleX + bubbleWidth} ${bubbleY} ${bubbleX + bubbleWidth} ${bubbleY + cornerRadius}
              L ${bubbleX + bubbleWidth} ${bubbleY + bubbleHeight - cornerRadius}
              Q ${bubbleX + bubbleWidth} ${bubbleY + bubbleHeight} ${bubbleX + bubbleWidth - cornerRadius} ${bubbleY + bubbleHeight}
              L ${bubbleX + tailStartX} ${bubbleY + bubbleHeight}
              L ${bubbleX + tipR} ${bubbleY + bubbleHeight + tailH - tipR}
              Q ${bubbleX} ${bubbleY + bubbleHeight + tailH} ${bubbleX} ${bubbleY + bubbleHeight + tailH - tipR}
              L ${bubbleX} ${bubbleY + cornerRadius}
              Q ${bubbleX} ${bubbleY} ${bubbleX + cornerRadius} ${bubbleY}
              Z`}
          fill="#FFFFFF"
        />
        {/* "Reply to [name]'s comment" header — right column, above comment */}
        {headerLines.map((line, i) => (
          <text
            key={`header-${i}`}
            x={textX}
            y={headerStartY + i * headerLineHeight}
            fontWeight="500"
            fontSize={headerFontSize}
            fontFamily="TikTok Sans, -apple-system, sans-serif"
            fill="#999999"
          >
            {line}
          </text>
        ))}
        {/* Avatar — left column, aligned to comment text row */}
        <defs>
          <clipPath id="reply-avatar-clip">
            <circle cx={avatarCx} cy={avatarCy} r={avatarSize / 2} />
          </clipPath>
        </defs>
        {config.avatar_url ? (
          <image
            href={config.avatar_url}
            x={avatarX}
            y={avatarY}
            width={avatarSize}
            height={avatarSize}
            clipPath="url(#reply-avatar-clip)"
            preserveAspectRatio="xMidYMid slice"
          />
        ) : (
          <g>
            <circle cx={avatarCx} cy={avatarCy} r={avatarSize / 2} fill="#E0E0E0" />
            <circle cx={avatarCx} cy={avatarCy - avatarSize * 0.1} r={avatarSize * 0.18} fill="#BDBDBD" />
            <defs>
              <clipPath id="reply-avatar-body-clip">
                <circle cx={avatarCx} cy={avatarCy} r={avatarSize / 2} />
              </clipPath>
            </defs>
            <ellipse cx={avatarCx} cy={avatarCy + avatarSize * 0.32} rx={avatarSize * 0.28} ry={avatarSize * 0.18} fill="#BDBDBD" clipPath="url(#reply-avatar-body-clip)" />
          </g>
        )}
        {/* Comment text (bold) */}
        {commentLines.map((line, i) => (
          <text
            key={i}
            x={textX}
            y={commentBaseY + (i + 0.78) * commentFontSize * 1.3}
            fontWeight="600"
            fontSize={commentFontSize}
            fontFamily="TikTok Sans, -apple-system, sans-serif"
            fill="#161823"
          >
            {line}
          </text>
        ))}
        </g>
      </svg>
    </AbsoluteFill>
  );
});

// ============================================================================
// MAIN COMPONENT - 100% FRAME DETERMINISTIC
// ============================================================================

/**
 * Check if caption style is TikTok-style (has backgroundColor or specific styleType)
 */
function isTikTokStyle(style: CaptionStyle | null | undefined): boolean {
  if (!style) return false;
  const tiktokStyleTypes = ['white-bg', 'black-bg', 'red-bg', 'outline', 'plain-white'];
  return !!style.backgroundColor || tiktokStyleTypes.includes(style.styleType || '');
}

export const CaptionedVideo: React.FC<CaptionedVideoProps> = ({
  videoUrl,
  captions = [],
  captionStyle,
  captionPosition,
  textLayers = [],
  replyOverlay,
}) => {
  // ONLY frame-based values - no time calculations during render
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  // Determine if we should use TikTok-style rendering
  const useTikTokCaptions = isTikTokStyle(captionStyle);

  // Default position if not provided (center of screen)
  const effectiveCaptionPosition = captionPosition || { x: 0.5, y: 0.5 };

  // MEMOIZE: Convert captions to frame-aligned ONCE per composition
  const frameAlignedCaptions = useMemo(
    () => convertToFrameAligned(captions, fps, durationInFrames),
    [captions, fps, durationInFrames]
  );

  // MEMOIZE: Pre-compute text layer frame ranges ONCE
  const textLayerFrameData = useMemo(() => {
    return textLayers.map((layer, index) => {
      const startFrame = Math.floor((layer.start_time || 0) * fps);
      const endFrame = Math.floor(((layer.start_time || 0) + (layer.duration || 5)) * fps) - 1;
      return { layer, startFrame, endFrame, index };
    });
  }, [textLayers, fps]);

  // MEMOIZE: Pre-compute reply overlay frame range
  const replyFrameData = useMemo(() => {
    if (!replyOverlay?.enabled) return null;
    const startFrame = Math.floor(replyOverlay.start_time * fps);
    const endFrame = Math.floor((replyOverlay.start_time + replyOverlay.duration) * fps) - 1;
    return { startFrame, endFrame };
  }, [replyOverlay, fps]);

  // DETERMINISTIC: Find caption for this exact frame
  const activeCaption = findCaptionAtFrame(frameAlignedCaptions, frame);

  // DETERMINISTIC: Compute all visibilities based on frame
  const layerVisibilities = textLayerFrameData.map(
    (data) => frame >= data.startFrame && frame <= data.endFrame
  );

  // Check if any text layers have TikTok-style backgrounds
  const hasAnyTikTokTextLayers = textLayers.some(
    (layer) => isTikTokStyle(layer.style_config)
  );

  // DETERMINISTIC: Reply overlay visibility based on frame
  const isReplyVisible = replyFrameData
    ? frame >= replyFrameData.startFrame && frame <= replyFrameData.endFrame
    : false;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/*
        CRITICAL: Use OffthreadVideo for frame-perfect rendering

        OffthreadVideo extracts frames in a separate thread and
        guarantees the correct frame is displayed for each render.
        This eliminates video playback drift that causes lag.
      */}
      {videoUrl && (
        <OffthreadVideo
          src={videoUrl}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      )}

      {/* SVG container for TikTok-style text layers and captions */}
      {(hasAnyTikTokTextLayers || useTikTokCaptions) && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 50,
          }}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid slice"
        >
          {/* TikTok-style text layers (rendered first, below captions) */}
          {textLayerFrameData.map((data, idx) => {
            const isTikTok = isTikTokStyle(data.layer.style_config);
            if (!isTikTok) return null;
            return (
              <TikTokTextOverlayLayer
                key={`tiktok-layer-${data.index}`}
                layer={data.layer}
                visible={layerVisibilities[idx]}
                canvasWidth={width}
                canvasHeight={height}
              />
            );
          })}
        </svg>
      )}

      {/* TikTok-style caption (rendered via separate SVG on top) */}
      {captionStyle && useTikTokCaptions && (
        <TikTokCaptionContainer
          key="tiktok-caption"
          text={activeCaption?.text || ''}
          visible={activeCaption !== null}
          style={captionStyle}
          position={effectiveCaptionPosition}
          canvasWidth={width}
          canvasHeight={height}
        />
      )}

      {/* Legacy caption layer for non-TikTok styles */}
      {captionStyle && !useTikTokCaptions && (
        <CaptionContainer
          key="caption"
          text={activeCaption?.text || ''}
          visible={activeCaption !== null}
          style={captionStyle}
        />
      )}

      {/* Legacy text overlay layers for non-TikTok styles */}
      {textLayerFrameData.map((data, idx) => {
        const isTikTok = isTikTokStyle(data.layer.style_config);
        if (isTikTok) return null; // Already rendered in SVG
        return (
          <TextOverlayLayer
            key={`layer-${data.index}`}
            layer={data.layer}
            visible={layerVisibilities[idx]}
          />
        );
      })}

      {/* Reply overlay bubble (rendered on top of everything) */}
      {replyOverlay?.enabled && (
        <ReplyOverlayLayer
          config={replyOverlay}
          visible={isReplyVisible}
          canvasWidth={width}
          canvasHeight={height}
        />
      )}
    </AbsoluteFill>
  );
};
