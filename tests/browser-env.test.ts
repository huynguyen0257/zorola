import { expect, test } from "vitest";
import { getBrowserLaunchProblem } from "../src/zalo/browser-env.js";

test("getBrowserLaunchProblem returns null for headed browser when DISPLAY exists", () => {
  expect(getBrowserLaunchProblem({ headless: false, display: ":0", platform: "linux" })).toBeNull();
});

test("getBrowserLaunchProblem returns null for headless browser without DISPLAY", () => {
  expect(getBrowserLaunchProblem({ headless: true, display: undefined, platform: "linux" })).toBeNull();
});

test("getBrowserLaunchProblem explains missing DISPLAY for headed linux browser", () => {
  expect(getBrowserLaunchProblem({ headless: false, display: undefined, platform: "linux" })).toContain(
    "khong co DISPLAY"
  );
});
