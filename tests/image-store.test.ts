import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test, afterEach } from "vitest";
import { saveImageBytes } from "../src/storage/image-store.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

test("saveImageBytes writes bytes using a sha256 filename", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "zorola-images-"));
  tempDirs.push(dir);
  const bytes = Buffer.from("fake image bytes");

  const saved = await saveImageBytes({ bytes, outputDir: dir, extension: "jpg" });

  expect(saved.hash).toHaveLength(64);
  expect(saved.path).toBe(path.join(dir, `${saved.hash}.jpg`));
  await expect(readFile(saved.path)).resolves.toEqual(bytes);
});

test("saveImageBytes normalizes extension before building the file path", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "zorola-images-"));
  tempDirs.push(dir);

  const saved = await saveImageBytes({
    bytes: Buffer.from("another image"),
    outputDir: dir,
    extension: ".png"
  });

  expect(saved.path.endsWith(".png")).toBe(true);
});
