export type BrowserImageCandidate = {
  index: string;
  src: string;
  width: number;
  height: number;
  sourceType?: "img" | "background";
  className?: string;
};

export function shouldCollectImage(candidate: BrowserImageCandidate): boolean {
  if (!candidate.src) {
    return false;
  }
  const area = candidate.width * candidate.height;
  const longestSide = Math.max(candidate.width, candidate.height);
  const shortestSide = Math.min(candidate.width, candidate.height);

  return area >= 20_000 && longestSide >= 180 && shortestSide >= 100;
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
