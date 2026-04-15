import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { CheckpointStore } from "../src/storage/checkpoint-store.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

test("CheckpointStore starts empty when the file does not exist", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "zorola-checkpoint-"));
  tempDirs.push(dir);
  const store = new CheckpointStore(path.join(dir, "checkpoint.json"));

  const checkpoint = await store.load();

  expect(checkpoint.imageHashes).toEqual([]);
});

test("CheckpointStore persists collected image hashes", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "zorola-checkpoint-"));
  tempDirs.push(dir);
  const checkpointPath = path.join(dir, "checkpoint.json");
  const store = new CheckpointStore(checkpointPath);

  await store.addImageHash("hash-1");
  await store.addImageHash("hash-2");

  await expect(new CheckpointStore(checkpointPath).load()).resolves.toEqual({
    imageHashes: ["hash-1", "hash-2"]
  });
});
