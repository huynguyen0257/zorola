import { expect, test } from "vitest";
import {
  extensionFromContentType,
  extractMessageTime,
  extractUrlFromCssBackground,
  shouldCollectImage
} from "../src/zalo/image-candidate.js";

test("shouldCollectImage ignores small images that are likely avatars or icons", () => {
  expect(shouldCollectImage({ index: "0", src: "https://example.com/a.jpg", width: 48, height: 48 })).toBe(false);
});

test("shouldCollectImage accepts large remote images", () => {
  expect(shouldCollectImage({ index: "0", src: "https://example.com/a.jpg", width: 500, height: 900 })).toBe(true);
});

test("shouldCollectImage accepts narrow portrait screenshots rendered by Zalo", () => {
  expect(
    shouldCollectImage({
      index: "0",
      src: "blob:https://chat.zalo.me/example",
      width: 148,
      height: 319,
      sourceType: "img"
    })
  ).toBe(true);
});

test("shouldCollectImage ignores small reaction icons even when one side is nonzero", () => {
  expect(
    shouldCollectImage({
      index: "0",
      src: "https://res-zalo.zadn.vn/upload/media/iconlike.png",
      width: 26,
      height: 30,
      sourceType: "img"
    })
  ).toBe(false);
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

test("extractMessageTime returns the first hh:mm token from nearby text", () => {
  expect(extractMessageTime("22:09 Hom qua Dai Gui Nhan")).toBe("22:09");
});

test("extractMessageTime returns null when there is no hh:mm token", () => {
  expect(extractMessageTime("Khong co gio trong chuoi nay")).toBeNull();
});
