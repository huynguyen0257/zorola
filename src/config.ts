import { readFile } from "node:fs/promises";

export type AppConfig = {
  zalo: {
    url: string;
    groupName: string;
    browserChannel?: string;
    headless?: boolean;
    profileDir: string;
    maxImages: number;
    scrollRounds: number;
    scrollPauseMs: number;
  };
  storage: {
    imageDir: string;
    checkpointPath: string;
  };
};

export async function loadConfig(configPath = "config/app.local.json"): Promise<AppConfig> {
  const raw = await readFile(configPath, "utf8");
  return JSON.parse(raw) as AppConfig;
}
