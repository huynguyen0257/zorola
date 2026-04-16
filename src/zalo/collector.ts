import type { BrowserContext, Page } from "playwright";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { saveImageBytes, type SavedImage } from "../storage/image-store.js";
import { CheckpointStore } from "../storage/checkpoint-store.js";
import type { AppConfig } from "../config.js";
import { getBrowserLaunchProblem } from "./browser-env.js";
import { writeCollectionReport, type FailedCollection } from "../reporting/collection-report.js";
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
  messageTime?: string | null;
};

type CapturedCandidatePayload = {
  candidate: BrowserImageCandidate;
  bytes?: number[];
  contentType?: string | null;
  error?: string;
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
    await scrollChatHistoryOnce(page, pauseMs);
  }
}

export async function scrollChatHistoryOnce(page: Page, pauseMs: number): Promise<void> {
  await page.mouse.move(720, 500);
  await page.mouse.wheel(0, -2500);
  await page.waitForTimeout(pauseMs);
}

export async function collectImagesAcrossScroll(config: AppConfig, page: Page): Promise<CollectedImage[]> {
  const collected: CollectedImage[] = [];

  collected.push(...(await collectImagesFromCurrentPage(config, page)));
  for (let round = 0; round < config.zalo.scrollRounds; round += 1) {
    console.log(`Dang cuon nguoc vong ${round + 1}/${config.zalo.scrollRounds} va quet anh...`);
    await scrollChatHistoryOnce(page, config.zalo.scrollPauseMs);
    collected.push(...(await collectImagesFromCurrentPage(config, page)));
  }

  return collected;
}

export async function markImageCandidates(page: Page): Promise<BrowserImageCandidate[]> {
  const candidates = await page.evaluate(() => {
    const imageCandidates = Array.from(document.images).map((image, index) => {
      const candidateIndex = `img-${index}`;
      image.setAttribute("data-zorola-candidate-index", candidateIndex);
      const rect = image.getBoundingClientRect();
      return {
        index: candidateIndex,
        src: image.currentSrc || image.src,
        width: Math.round(rect.width || image.naturalWidth),
        height: Math.round(rect.height || image.naturalHeight),
        sourceType: "img" as const,
        className: String(image.className ?? "")
      };
    });

    const backgroundCandidates = Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .map((element, index) => {
        const style = window.getComputedStyle(element);
        const backgroundImage = style.backgroundImage;
        const match = backgroundImage.match(/url\((?:"([^"]+)"|'([^']+)'|([^)]*))\)/);
        const src = match?.[1] ?? match?.[2] ?? match?.[3]?.trim() ?? "";
        const rect = element.getBoundingClientRect();
        const candidateIndex = `bg-${index}`;
        element.setAttribute("data-zorola-candidate-index", candidateIndex);
        return {
          index: candidateIndex,
          src,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          sourceType: "background" as const,
          className: String(element.className ?? "")
        };
      })
      .filter((candidate) => candidate.src);

    return [...imageCandidates, ...backgroundCandidates];
  });

  return candidates.filter(shouldCollectImage);
}

export async function collectImagesFromCurrentPage(config: AppConfig, page: Page): Promise<CollectedImage[]> {
  const checkpointStore = new CheckpointStore(config.storage.checkpointPath);
  const checkpoint = await checkpointStore.load();
  const knownHashes = new Set(checkpoint.imageHashes);
  const maxImages = Math.min(config.zalo.maxImages, 30);
  const payloads = await captureImageCandidates(page, maxImages);
  const candidates = payloads.map((payload) => payload.candidate);
  const collected: CollectedImage[] = [];
  const failed: FailedCollection[] = payloads
    .filter((payload) => payload.error)
    .map((payload) => ({
      candidate: payload.candidate,
      error: payload.error ?? "Unknown capture error"
    }));

  if (candidates.length === 0) {
    await writeDebugArtifacts(page);
  }

  for (const payload of payloads) {
    if (!payload.bytes) {
      continue;
    }

    const { candidate } = payload;
    try {
      const saved = await saveImageBytes({
        bytes: Buffer.from(payload.bytes),
        outputDir: config.storage.imageDir,
        extension: extensionFromContentType(payload.contentType ?? null)
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
        skipped,
        messageTime: candidate.messageTime
      });
    } catch (error) {
      failed.push({
        candidate,
        error: error instanceof Error ? error.message : String(error)
      });
      console.warn(`Khong tai duoc candidate ${candidate.index}: ${failed.at(-1)?.error}`);
    }
  }

  const reportPath = await writeCollectionReport({
    outputRoot: path.join("data", "runs"),
    candidates,
    collected,
    failed
  });
  console.log(`Da ghi collection report: ${reportPath}`);

  return collected;
}

async function captureImageCandidates(page: Page, maxImages: number): Promise<CapturedCandidatePayload[]> {
  return page.evaluate(async (max) => {
    const shouldCollectImageInPage = (candidate: {
      src: string;
      width: number;
      height: number;
    }): boolean => {
      if (!candidate.src) {
        return false;
      }
      const area = candidate.width * candidate.height;
      const longestSide = Math.max(candidate.width, candidate.height);
      const shortestSide = Math.min(candidate.width, candidate.height);

      return area >= 20_000 && longestSide >= 180 && shortestSide >= 100;
    };

    const extractMessageTimeInPage = (text: string): string | null => {
      const match = text.match(/\b\d{1,2}:\d{2}\b/);
      return match?.[0] ?? null;
    };

    const findMessageTimeForElement = (element: Element): string | null => {
      const selectors = [
        ".card-send-time__sendTime",
        ".message-time",
        ".send-time",
        ".preview-time"
      ];

      for (let level = 0, current: Element | null = element; level < 8 && current; level += 1, current = current.parentElement) {
        for (const selector of selectors) {
          const timeElement = current.querySelector(selector);
          const timeText = timeElement?.textContent?.trim();
          if (timeText) {
            const parsed = extractMessageTimeInPage(timeText);
            if (parsed) {
              return parsed;
            }
          }
        }

        const combinedText = `${current.textContent ?? ""} ${current.getAttribute("aria-label") ?? ""}`.trim();
        const parsed = extractMessageTimeInPage(combinedText);
        if (parsed) {
          return parsed;
        }
      }

      return null;
    };

    const metadata = [
      ...Array.from(document.images).map((image, index) => {
        const candidateIndex = `img-${index}`;
        image.setAttribute("data-zorola-candidate-index", candidateIndex);
        const rect = image.getBoundingClientRect();
        return {
          index: candidateIndex,
          src: image.currentSrc || image.src,
          width: Math.round(rect.width || image.naturalWidth),
          height: Math.round(rect.height || image.naturalHeight),
          sourceType: "img" as const,
          className: String(image.className ?? ""),
          messageTime: findMessageTimeForElement(image),
          element: image
        };
      }),
      ...Array.from(document.querySelectorAll<HTMLElement>("body *"))
        .map((element, index) => {
          const style = window.getComputedStyle(element);
          const backgroundImage = style.backgroundImage;
          const match = backgroundImage.match(/url\((?:"([^"]+)"|'([^']+)'|([^)]*))\)/);
          const src = match?.[1] ?? match?.[2] ?? match?.[3]?.trim() ?? "";
          const rect = element.getBoundingClientRect();
          const candidateIndex = `bg-${index}`;
          element.setAttribute("data-zorola-candidate-index", candidateIndex);
          return {
            index: candidateIndex,
            src,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            sourceType: "background" as const,
            className: String(element.className ?? ""),
            messageTime: findMessageTimeForElement(element),
            element
          };
        })
        .filter((candidate) => candidate.src)
    ]
      .filter((candidate) =>
        shouldCollectImageInPage({
          src: candidate.src,
          width: candidate.width,
          height: candidate.height
        })
      )
      .slice(-max);

    const captureByCanvas = async (image: HTMLImageElement): Promise<{ bytes: number[]; contentType: string | null } | null> => {
      try {
        if (!image.naturalWidth || !image.naturalHeight) {
          return null;
        }

        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");
        if (!context) {
          return null;
        }

        context.drawImage(image, 0, 0);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        if (!blob) {
          return null;
        }

        return {
          bytes: Array.from(new Uint8Array(await blob.arrayBuffer())),
          contentType: blob.type || "image/png"
        };
      } catch {
        return null;
      }
    };

    const captured = await Promise.all(
      metadata.map(async (item) => {
        const candidate = {
          index: item.index,
          src: item.src,
          width: item.width,
          height: item.height,
          sourceType: item.sourceType,
          className: item.className,
          messageTime: item.messageTime
        };

        try {
          const response = await fetch(item.src);
          if (response.ok) {
            return {
              candidate,
              bytes: Array.from(new Uint8Array(await response.arrayBuffer())),
              contentType: response.headers.get("content-type")
            };
          }
        } catch {
          // Ignore and fall back below.
        }

        if (item.element instanceof HTMLImageElement) {
          const canvasResult = await captureByCanvas(item.element);
          if (canvasResult) {
            return {
              candidate,
              bytes: canvasResult.bytes,
              contentType: canvasResult.contentType
            };
          }
        }

        return {
          candidate,
          error: `Unable to capture bytes immediately for ${candidate.index}${candidate.messageTime ? ` at ${candidate.messageTime}` : ""}`
        };
      })
    );

    return captured;
  }, maxImages);
}

async function writeDebugArtifacts(page: Page): Promise<void> {
  const debugDir = path.join("data", "debug", new Date().toISOString().replace(/[:.]/g, "-"));
  await mkdir(debugDir, { recursive: true });

  const report = await page.evaluate(() => {
    const images = Array.from(document.images).map((image, index) => {
      const rect = image.getBoundingClientRect();
      return {
        index,
        src: image.currentSrc || image.src,
        className: image.className,
        alt: image.alt,
        width: Math.round(rect.width || image.naturalWidth),
        height: Math.round(rect.height || image.naturalHeight)
      };
    });

    const backgrounds = Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .map((element, index) => {
        const style = window.getComputedStyle(element);
        const backgroundUrl = style.backgroundImage;
        const rect = element.getBoundingClientRect();
        return {
          index,
          tagName: element.tagName,
          className: element.className,
          role: element.getAttribute("role"),
          ariaLabel: element.getAttribute("aria-label"),
          backgroundImage: backgroundUrl,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          text: element.textContent?.trim().slice(0, 120) ?? ""
        };
      })
      .filter((item) => item.backgroundImage && item.backgroundImage !== "none")
      .slice(0, 200);

    return {
      url: location.href,
      title: document.title,
      imageCount: images.length,
      backgroundImageCount: backgrounds.length,
      bodyTextSample: document.body.innerText.slice(0, 1000),
      images: images.slice(0, 200),
      backgrounds
    };
  });

  await page.screenshot({ path: path.join(debugDir, "page.png"), fullPage: true });
  await writeFile(path.join(debugDir, "report.json"), JSON.stringify(report, null, 2));
  await writeFile(path.join(debugDir, "page.html"), await page.content());
  console.log(`Khong thay image candidate. Da ghi debug vao: ${debugDir}`);
}
