import type { BrowserContext, Page } from "playwright";
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { saveImageBytes, type SavedImage } from "../storage/image-store.js";
import { CheckpointStore } from "../storage/checkpoint-store.js";
import type { AppConfig } from "../config.js";
import { getBrowserLaunchProblem } from "./browser-env.js";
import {
  extensionFromContentType,
  shouldCollectImage,
  type BrowserImageCandidate
} from "./image-candidate.js";

export type CollectedImage = SavedImage & {
  src: string;
  width: number;
  height: number;
  skipped: boolean;
};

export async function openZaloBrowser(config: AppConfig): Promise<{ context: BrowserContext; page: Page }> {
  await mkdir(config.zalo.profileDir, { recursive: true });
  const browserChannel = "browserChannel" in config.zalo ? String(config.zalo.browserChannel) : undefined;
  const headless = config.zalo.headless ?? false;
  const launchProblem = getBrowserLaunchProblem({
    headless,
    display: process.env.DISPLAY,
    platform: process.platform
  });

  if (launchProblem) {
    throw new Error(launchProblem);
  }

  const context = await chromium.launchPersistentContext(config.zalo.profileDir, {
    channel: browserChannel || undefined,
    headless,
    viewport: { width: 1440, height: 1000 }
  });
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(config.zalo.url, { waitUntil: "domcontentloaded" });
  return { context, page };
}

export async function scrollChatHistory(page: Page, rounds: number, pauseMs: number): Promise<void> {
  for (let round = 0; round < rounds; round += 1) {
    await page.mouse.move(720, 500);
    await page.mouse.wheel(0, -2500);
    await page.waitForTimeout(pauseMs);
  }
}

export async function markImageCandidates(page: Page): Promise<BrowserImageCandidate[]> {
  const candidates = await page.evaluate(() => {
    return Array.from(document.images).map((image, index) => {
      image.setAttribute("data-zorola-candidate-index", String(index));
      const rect = image.getBoundingClientRect();
      return {
        index,
        src: image.currentSrc || image.src,
        width: Math.round(rect.width || image.naturalWidth),
        height: Math.round(rect.height || image.naturalHeight)
      };
    });
  });

  return candidates.filter(shouldCollectImage);
}

export async function collectImagesFromCurrentPage(config: AppConfig, page: Page): Promise<CollectedImage[]> {
  const checkpointStore = new CheckpointStore(config.storage.checkpointPath);
  const checkpoint = await checkpointStore.load();
  const knownHashes = new Set(checkpoint.imageHashes);
  const candidates = (await markImageCandidates(page)).slice(-config.zalo.maxImages);
  const collected: CollectedImage[] = [];

  for (const candidate of candidates) {
    const image = await readImageBytes(page, candidate);
    const saved = await saveImageBytes({
      bytes: image.bytes,
      outputDir: config.storage.imageDir,
      extension: image.extension
    });
    const skipped = knownHashes.has(saved.hash);

    if (!skipped) {
      await checkpointStore.addImageHash(saved.hash);
      knownHashes.add(saved.hash);
    }

    collected.push({
      ...saved,
      src: candidate.src,
      width: candidate.width,
      height: candidate.height,
      skipped
    });
  }

  return collected;
}

async function readImageBytes(
  page: Page,
  candidate: BrowserImageCandidate
): Promise<{ bytes: Buffer; extension: string }> {
  const fetched = await tryFetchRenderedImage(page, candidate.src);
  if (fetched) {
    return fetched;
  }

  const locator = page.locator(`[data-zorola-candidate-index="${candidate.index}"]`).first();
  return {
    bytes: await locator.screenshot({ timeout: 5000 }),
    extension: "png"
  };
}

async function tryFetchRenderedImage(
  page: Page,
  src: string
): Promise<{ bytes: Buffer; extension: string } | null> {
  try {
    const result = await page.evaluate(async (imageSrc) => {
      const response = await fetch(imageSrc);
      if (!response.ok) {
        return null;
      }
      const contentType = response.headers.get("content-type");
      const bytes = Array.from(new Uint8Array(await response.arrayBuffer()));
      return { bytes, contentType };
    }, src);

    if (!result) {
      return null;
    }

    return {
      bytes: Buffer.from(result.bytes),
      extension: extensionFromContentType(result.contentType)
    };
  } catch {
    return null;
  }
}
