export type BrowserImageCandidate = {
  index: number;
  src: string;
  width: number;
  height: number;
};

export function shouldCollectImage(candidate: BrowserImageCandidate): boolean {
  if (!candidate.src) {
    return false;
  }
  if (candidate.src.startsWith("data:")) {
    return false;
  }
  return candidate.width >= 180 && candidate.height >= 120;
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
