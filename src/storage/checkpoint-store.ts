import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type Checkpoint = {
  imageHashes: string[];
};

export class CheckpointStore {
  constructor(private readonly checkpointPath: string) {}

  async load(): Promise<Checkpoint> {
    try {
      const raw = await readFile(this.checkpointPath, "utf8");
      const parsed = JSON.parse(raw) as Partial<Checkpoint>;
      return {
        imageHashes: Array.isArray(parsed.imageHashes) ? parsed.imageHashes : []
      };
    } catch (error) {
      if (isMissingFile(error)) {
        return { imageHashes: [] };
      }
      throw error;
    }
  }

  async addImageHash(hash: string): Promise<void> {
    const checkpoint = await this.load();
    const imageHashes = Array.from(new Set([...checkpoint.imageHashes, hash]));
    await mkdir(path.dirname(this.checkpointPath), { recursive: true });
    await writeFile(this.checkpointPath, JSON.stringify({ imageHashes }, null, 2));
  }
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
