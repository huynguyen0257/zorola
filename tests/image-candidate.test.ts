import { expect, test } from "vitest";
import {
  extensionFromContentType,
  extractUrlFromCssBackground,
  shouldCollectImage
} from "../src/zalo/image-candidate.js";

test("shouldCollectImage ignores small images that are likely avatars or icons", () => {
  expect(shouldCollectImage({ index: "0", src: "https://example.com/a.jpg", width: 48, height: 48 })).toBe(false);
});

test("shouldCollectImage accepts large remote images", () => {
  expect(shouldCollectImage({ index: "0", src: "https://example.com/a.jpg", width: 500, height: 900 })).toBe(true);
});

test("shouldCollectImage ignores embedded data urls", () => {
  expect(shouldCollectImage({ index: "0", src: "data:image/png;base64,abc", width: 500, height: 900 })).toBe(true);
});

test("extensionFromContentType maps common image content types", () => {
  expect(extensionFromContentType("image/png")).toBe("png");
  expect(extensionFromContentType("image/webp")).toBe("webp");
  expect(extensionFromContentType("image/jpeg")).toBe("jpg");
  expect(extensionFromContentType(null)).toBe("jpg");
});

test("extractUrlFromCssBackground returns the first css background url", () => {
  expect(extractUrlFromCssBackground('url("https://example.com/a.jpg")')).toBe("https://example.com/a.jpg");
});

test("extractUrlFromCssBackground returns null when no url exists", () => {
  expect(extractUrlFromCssBackground("none")).toBeNull();
});
