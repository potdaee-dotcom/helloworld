"use client";

import { useEffect, useRef } from "react";
import type { LadderConfig, PathStep } from "@/lib/ladder";

interface Props {
  config: LadderConfig;
  rows: number;
  activePaths: PathStep[][];
  activeParticipants: Set<number>;
  revealedResults: Set<number>;
}

const COLORS = [
  "#6366f1", "#f43f5e", "#10b981", "#f59e0b",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
];

export default function LadderCanvas({
  config,
  rows,
  activePaths,
  activeParticipants,
  revealedResults,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const progressRef = useRef<number[]>([]);
  const prevActivePathsRef = useRef<PathStep[][]>([]);

  const PADDING_X = 40;
  const PADDING_Y = 60;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const n = config.participants.length;
    const colW = (W - PADDING_X * 2) / (n - 1 || 1);
    const rowH = (H - PADDING_Y * 2) / rows;

    const colX = (c: number) => PADDING_X + c * colW;
    const rowY = (r: number) => PADDING_Y + r * rowH;

    // Only reset animation progress when the paths reference actually changes
    const pathsChanged = activePaths !== prevActivePathsRef.current;
    if (pathsChanged) {
      prevActivePathsRef.current = activePaths;
      progressRef.current = activePaths.map(() => 0);
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, W, H);

      // Vertical lines
      for (let c = 0; c < n; c++) {
        ctx.beginPath();
        ctx.strokeStyle = activeParticipants.has(c) ? COLORS[c % COLORS.length] : "#d1d5db";
        ctx.lineWidth = activeParticipants.has(c) ? 3 : 2;
        ctx.moveTo(colX(c), rowY(0));
        ctx.lineTo(colX(c), rowY(rows));
        ctx.stroke();
      }

      // Horizontal rungs
      config.rungs.forEach((rung) => {
        ctx.beginPath();
        ctx.strokeStyle = "#9ca3af";
        ctx.lineWidth = 2;
        ctx.moveTo(colX(rung.col), rowY(rung.row));
        ctx.lineTo(colX(rung.col + 1), rowY(rung.row));
        ctx.stroke();
      });

      // Animated paths
      activePaths.forEach((path, pathIdx) => {
        if (path.length === 0) return;
        const progress = progressRef.current[pathIdx] ?? 0;
        const color = COLORS[pathIdx % COLORS.length];

        const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];
        for (let i = 0; i < path.length - 1; i++) {
          const from = path[i];
          const to = path[i + 1];
          segments.push({
            x1: colX(from.col),
            y1: rowY(from.row),
            x2: colX(to.col),
            y2: rowY(to.row),
          });
        }

        const totalSegments = segments.length;
        const fullSegments = Math.floor(Math.min(progress, totalSegments));
        const partial = Math.min(progress, totalSegments) - fullSegments;

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (let s = 0; s < fullSegments; s++) {
          const seg = segments[s];
          if (s === 0) ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
        }

        if (fullSegments < totalSegments && partial > 0) {
          const seg = segments[fullSegments];
          const mx = seg.x1 + (seg.x2 - seg.x1) * partial;
          const my = seg.y1 + (seg.y2 - seg.y1) * partial;
          if (fullSegments === 0) ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(mx, my);
        }
        ctx.stroke();

        // Dot at current tip
        let dotX: number, dotY: number;
        if (fullSegments >= totalSegments) {
          const last = segments[totalSegments - 1];
          dotX = last.x2; dotY = last.y2;
        } else {
          const seg = segments[fullSegments];
          dotX = seg.x1 + (seg.x2 - seg.x1) * partial;
          dotY = seg.y1 + (seg.y2 - seg.y1) * partial;
        }
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
        ctx.fill();
      });

      // Participant labels (top)
      config.participants.forEach((name, c) => {
        ctx.font = "bold 13px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = activeParticipants.has(c) ? COLORS[c % COLORS.length] : "#374151";
        ctx.fillText(name.length > 5 ? name.slice(0, 5) + "…" : name, colX(c), rowY(0) - 6);
      });

      // Result labels (bottom) — revealed or "?"
      config.results.forEach((res, c) => {
        const isRevealed = revealedResults.has(c);
        const pathIdx = activePaths.findIndex(
          (p) => p.length > 0 && p[p.length - 1].col === c
        );
        ctx.font = isRevealed ? "bold 13px Arial" : "13px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = isRevealed && pathIdx >= 0
          ? COLORS[pathIdx % COLORS.length]
          : isRevealed ? "#10b981"
          : "#9ca3af";
        const label = isRevealed ? (res.length > 6 ? res.slice(0, 6) + "…" : res) : "?";
        ctx.fillText(label, colX(c), rowY(rows) + 6);
      });
    }

    function animate() {
      let allDone = true;
      activePaths.forEach((path, i) => {
        if (progressRef.current[i] === undefined) progressRef.current[i] = 0;
        const maxProgress = path.length - 1;
        if (progressRef.current[i] < maxProgress) {
          progressRef.current[i] = Math.min(progressRef.current[i] + 0.2, maxProgress);
          allDone = false;
        }
      });

      draw();

      if (!allDone) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    }

    cancelAnimationFrame(animFrameRef.current);

    if (activePaths.length > 0) {
      animate();
    } else {
      draw();
    }

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [config, rows, activePaths, activeParticipants, revealedResults]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={500}
      className="w-full max-w-2xl mx-auto block"
    />
  );
}
