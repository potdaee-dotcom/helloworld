"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { buildLadder, getResultForParticipant } from "@/lib/ladder";
import type { LadderConfig, PathStep } from "@/lib/ladder";
import { useConfetti } from "@/hooks/useConfetti";

const LadderCanvas = dynamic(() => import("@/components/LadderCanvas"), { ssr: false });

const ROWS = 12;

type GamePhase = "setup" | "ready" | "playing" | "done";

const COLORS = [
  "#6366f1", "#f43f5e", "#10b981", "#f59e0b",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
];

export default function Home() {
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [participantInput, setParticipantInput] = useState("철수\n영희\n민준\n지수");
  const [resultInput, setResultInput] = useState("당첨!\n꽝\n꽝\n꽝");
  const [config, setConfig] = useState<LadderConfig | null>(null);
  const [activePaths, setActivePaths] = useState<PathStep[][]>([]);
  const [activeParticipants, setActiveParticipants] = useState<Set<number>>(new Set());
  const [revealedResults, setRevealedResults] = useState<Set<number>>(new Set());
  const [results, setResults] = useState<{ participant: string; result: string; color: string }[]>([]);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { fire: fireConfetti } = useConfetti();

  const parseLines = (s: string) =>
    s.split("\n").map((l) => l.trim()).filter(Boolean);

  const handleStart = useCallback(() => {
    const parts = parseLines(participantInput);
    const ress = parseLines(resultInput);
    if (parts.length < 2) return;
    const padded = [...ress];
    while (padded.length < parts.length) padded.push("꽝");
    const trimmed = padded.slice(0, parts.length);
    const cfg = buildLadder(parts, trimmed);
    setConfig(cfg);
    setActivePaths([]);
    setActiveParticipants(new Set());
    setRevealedResults(new Set());
    setResults([]);
    setPhase("ready");
  }, [participantInput, resultInput]);

  const handleReset = useCallback(() => {
    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    setPhase("setup");
    setConfig(null);
    setActivePaths([]);
    setActiveParticipants(new Set());
    setRevealedResults(new Set());
    setResults([]);
  }, []);

  const runParticipant = useCallback((idx: number) => {
    if (!config || phase !== "ready") return;
    setPhase("playing");

    const { resultIndex, path } = getResultForParticipant(idx, config, ROWS);
    setActivePaths([path]);
    setActiveParticipants(new Set([idx]));

    const animMs = Math.max(1800, (path.length / 0.18) * (1000 / 60));

    animTimerRef.current = setTimeout(() => {
      setRevealedResults((prev) => new Set([...prev, resultIndex]));
      const participant = config.participants[idx];
      const result = config.results[resultIndex];
      const color = COLORS[idx % COLORS.length];
      setResults((prev) => [...prev, { participant, result, color }]);

      const isWin = ["당첨", "🎉", "1등", "winner", "축하", "1위"].some((w) =>
        result.includes(w)
      );
      if (isWin) fireConfetti();

      setPhase("ready");
    }, animMs);
  }, [config, phase, fireConfetti]);

  const runAll = useCallback(() => {
    if (!config || phase !== "ready") return;
    setPhase("playing");

    const allPaths: PathStep[][] = [];
    const allResultIndices: number[] = [];

    for (let i = 0; i < config.participants.length; i++) {
      const { resultIndex, path } = getResultForParticipant(i, config, ROWS);
      allPaths.push(path);
      allResultIndices.push(resultIndex);
    }

    setActivePaths(allPaths);
    setActiveParticipants(new Set(config.participants.map((_, i) => i)));

    const maxLen = Math.max(...allPaths.map((p) => p.length));
    const animMs = Math.max(2000, (maxLen / 0.18) * (1000 / 60));

    animTimerRef.current = setTimeout(() => {
      setRevealedResults(new Set(allResultIndices));
      const newResults = config.participants.map((p, i) => ({
        participant: p,
        result: config.results[allResultIndices[i]],
        color: COLORS[i % COLORS.length],
      }));
      setResults(newResults);
      setPhase("done");
      fireConfetti();
    }, animMs);
  }, [config, phase, fireConfetti]);

  const doneNames = new Set(results.map((r) => r.participant));

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50 dark:from-slate-950 dark:via-slate-900 dark:to-violet-950 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-pink-500 mb-2">
            🪜 사다리 타기
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">참가자와 결과를 입력하고 사다리를 타세요!</p>
        </div>

        {/* Setup Phase */}
        {phase === "setup" && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-100 dark:border-slate-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  👥 참가자 <span className="font-normal text-slate-400">(한 줄에 한 명)</span>
                </label>
                <textarea
                  value={participantInput}
                  onChange={(e) => setParticipantInput(e.target.value)}
                  rows={6}
                  placeholder={"철수\n영희\n민준\n지수"}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none text-slate-800 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  🎁 결과 <span className="font-normal text-slate-400">(한 줄에 하나)</span>
                </label>
                <textarea
                  value={resultInput}
                  onChange={(e) => setResultInput(e.target.value)}
                  rows={6}
                  placeholder={"당첨!\n꽝\n꽝\n꽝"}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 text-center">
              참가자 수와 결과 수가 다르면 자동으로 맞춰집니다
            </p>
            <div className="mt-5 text-center">
              <button
                onClick={handleStart}
                disabled={parseLines(participantInput).length < 2}
                className="bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 disabled:opacity-40 text-white font-bold px-10 py-3 rounded-xl text-lg shadow-md transition-all active:scale-95"
              >
                🎲 사다리 생성!
              </button>
            </div>
          </div>
        )}

        {/* Game Phase */}
        {(phase === "ready" || phase === "playing" || phase === "done") && config && (
          <div className="space-y-5">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4 border border-slate-100 dark:border-slate-700">
              <LadderCanvas
                config={config}
                rows={ROWS}
                activePaths={activePaths}
                activeParticipants={activeParticipants}
                revealedResults={revealedResults}
              />
            </div>

            {phase === "ready" && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-5 border border-slate-100 dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3 text-center">
                  누구부터 탈까요?
                </p>
                <div className="flex flex-wrap gap-2 justify-center mb-4">
                  {config.participants.map((name, i) => {
                    const done = doneNames.has(name);
                    return (
                      <button
                        key={i}
                        onClick={() => runParticipant(i)}
                        disabled={done}
                        style={{
                          borderColor: COLORS[i % COLORS.length],
                          color: done ? undefined : COLORS[i % COLORS.length],
                        }}
                        className="px-4 py-2 rounded-xl border-2 font-bold text-sm transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80"
                      >
                        {done ? "✓ " : ""}{name}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-3 justify-center flex-wrap">
                  <button
                    onClick={runAll}
                    disabled={doneNames.size === config.participants.length}
                    className="bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 disabled:opacity-40 text-white font-bold px-6 py-2 rounded-xl text-sm shadow transition-all active:scale-95"
                  >
                    ⚡ 전체 공개!
                  </button>
                  <button
                    onClick={handleReset}
                    className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold px-6 py-2 rounded-xl text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-all active:scale-95"
                  >
                    🔄 다시 설정
                  </button>
                </div>
              </div>
            )}

            {phase === "playing" && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-5 border border-slate-100 dark:border-slate-700 text-center">
                <p className="text-lg font-bold text-slate-700 dark:text-slate-200 animate-pulse">
                  🪜 사다리 타는 중...
                </p>
              </div>
            )}

            {phase === "done" && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-5 border border-slate-100 dark:border-slate-700 text-center space-y-3">
                <p className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-pink-500">
                  🎊 모든 결과 공개!
                </p>
                <button
                  onClick={handleReset}
                  className="bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold px-8 py-2 rounded-xl text-sm shadow hover:from-violet-600 hover:to-pink-600 transition-all active:scale-95"
                >
                  🔄 다시 하기
                </button>
              </div>
            )}

            {results.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-5 border border-slate-100 dark:border-slate-700">
                <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-3 uppercase tracking-widest">결과</h2>
                <div className="space-y-2">
                  {results.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                      style={{ backgroundColor: r.color + "18", borderLeft: `4px solid ${r.color}` }}
                    >
                      <span className="font-bold text-slate-800 dark:text-slate-200">{r.participant}</span>
                      <span className="font-black text-base" style={{ color: r.color }}>
                        {r.result}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
