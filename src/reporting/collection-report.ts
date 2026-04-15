import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CollectedImage } from "../zalo/collector.js";
import type { BrowserImageCandidate } from "../zalo/image-candidate.js";

export async function writeCollectionReport(input: {
  outputRoot: string;
  candidates: BrowserImageCandidate[];
  collected: CollectedImage[];
}): Promise<string> {
  const reportDir = path.join(input.outputRoot, new Date().toISOString().replace(/[:.]/g, "-"));
  await mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, "collect-report.json");
  const report = {
    createdAt: new Date().toISOString(),
    candidateCount: input.candidates.length,
    collectedCount: input.collected.length,
    newImageCount: input.collected.filter((image) => !image.skipped).length,
    skippedCount: input.collected.filter((image) => image.skipped).length,
    candidates: input.candidates,
    collected: input.collected
  };

  await writeFile(reportPath, JSON.stringify(report, null, 2));
  return reportPath;
}
