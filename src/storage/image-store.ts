import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type SavedImage = {
  hash: string;
  path: string;
};

export async function saveImageBytes(input: {
  bytes: Buffer;
  outputDir: string;
  extension: string;
}): Promise<SavedImage> {
  await mkdir(input.outputDir, { recursive: true });
  const hash = createHash("sha256").update(input.bytes).digest("hex");
  const extension = normalizeExtension(input.extension);
  const outputPath = path.join(input.outputDir, `${hash}.${extension}`);
  await writeFile(outputPath, input.bytes);

  return { hash, path: outputPath };
}

function normalizeExtension(extension: string): string {
  return extension.replace(/^\./, "").toLowerCase() || "jpg";
}
