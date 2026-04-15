export type BrowserImageCandidate = {
  index: string;
  src: string;
  width: number;
  height: number;
  sourceType?: "img" | "background";
};

export function shouldCollectImage(candidate: BrowserImageCandidate): boolean {
  if (!candidate.src) {
    return false;
  }
  return candidate.width >= 180 && candidate.height >= 120;
}

export function extractUrlFromCssBackground(backgroundImage: string): string | null {
  const match = backgroundImage.match(/url\((?:"([^"]+)"|'([^']+)'|([^)]*))\)/);
  return match?.[1] ?? match?.[2] ?? match?.[3]?.trim() ?? null;
}

export function extensionFromContentType(contentType: string | null): string {
  if (!contentType) {
    return "jpg";
  }
  if (contentType.includes("png")) {
    return "png";
  }
  if (contentType.includes("webp")) {
    return "webp";
  }
  if (contentType.includes("jpeg") || contentType.includes("jpg")) {
    return "jpg";
  }
  return "jpg";
}
