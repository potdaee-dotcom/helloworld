export interface LadderRung {
  row: number;
  col: number; // connects col to col+1
}

export interface LadderConfig {
  participants: string[];
  results: string[];
  rungs: LadderRung[];
}

export interface PathStep {
  col: number;
  row: number;
  direction: "down" | "right" | "left";
}

export function generateRungs(count: number, rows: number): LadderRung[] {
  const rungs: LadderRung[] = [];
  for (let row = 1; row < rows; row++) {
    const usedCols = new Set<number>();
    for (let col = 0; col < count - 1; col++) {
      if (!usedCols.has(col) && !usedCols.has(col - 1)) {
        if (Math.random() > 0.55) {
          rungs.push({ row, col });
          usedCols.add(col);
          usedCols.add(col + 1);
        }
      }
    }
  }
  return rungs;
}

export function tracePath(
  startCol: number,
  config: LadderConfig,
  rows: number
): PathStep[] {
  const path: PathStep[] = [{ col: startCol, row: 0, direction: "down" }];
  let col = startCol;

  for (let row = 0; row < rows; row++) {
    // Check for rungs at this row
    const rightRung = config.rungs.find((r) => r.row === row && r.col === col);
    const leftRung = config.rungs.find((r) => r.row === row && r.col === col - 1);

    if (rightRung) {
      path.push({ col, row, direction: "right" });
      col = col + 1;
      path.push({ col, row, direction: "down" });
    } else if (leftRung) {
      path.push({ col, row, direction: "left" });
      col = col - 1;
      path.push({ col, row, direction: "down" });
    }
  }

  path.push({ col, row: rows, direction: "down" });
  return path;
}

export function buildLadder(participants: string[], results: string[]): LadderConfig {
  const count = participants.length;
  const rows = Math.max(8, count * 2 + 2);
  const rungs = generateRungs(count, rows);
  return { participants, results, rungs };
}

export function getResultForParticipant(
  participantIndex: number,
  config: LadderConfig,
  rows: number
): { resultIndex: number; path: PathStep[] } {
  const path = tracePath(participantIndex, config, rows);
  const finalCol = path[path.length - 1].col;
  return { resultIndex: finalCol, path };
}
