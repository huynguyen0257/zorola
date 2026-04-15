import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { writeCollectionReport } from "../src/reporting/collection-report.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

test("writeCollectionReport persists candidate and collection details", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "zorola-report-"));
  tempDirs.push(dir);

  const reportPath = await writeCollectionReport({
    outputRoot: dir,
    candidates: [
      {
        index: "img-1",
        src: "blob:https://chat.zalo.me/a",
        width: 148,
        height: 319,
        sourceType: "img",
        className: "zimg-el"
      }
    ],
    collected: [
      {
        hash: "hash-1",
        path: "/tmp/hash-1.jpg",
        src: "blob:https://chat.zalo.me/a",
        width: 148,
        height: 319,
        skipped: false
      }
    ],
    failed: [
      {
        candidate: {
          index: "img-2",
          src: "blob:https://chat.zalo.me/b",
          width: 110,
          height: 238,
          sourceType: "img",
          className: "zimg-el"
        },
        error: "locator disappeared"
      }
    ]
  });

  const report = JSON.parse(await readFile(reportPath, "utf8"));
  expect(report.candidateCount).toBe(1);
  expect(report.collectedCount).toBe(1);
  expect(report.newImageCount).toBe(1);
  expect(report.skippedCount).toBe(0);
  expect(report.failedCount).toBe(1);
  expect(report.candidates[0].className).toBe("zimg-el");
  expect(report.collected[0].hash).toBe("hash-1");
  expect(report.failed[0].error).toBe("locator disappeared");
});
