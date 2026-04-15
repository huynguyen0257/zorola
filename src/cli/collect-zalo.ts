import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { existsSync } from "node:fs";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../config.js";
import { collectImagesFromCurrentPage, openZaloBrowser, scrollChatHistory } from "../zalo/collector.js";

async function main(): Promise<void> {
  await ensureLocalConfig();
  const config = await loadConfig();
  const { context, page } = await openZaloBrowser(config);
  const rl = createInterface({ input, output });

  try {
    console.log("Chrome/Zalo Web da mo.");
    console.log(`Hay login Zalo Web va mo group: ${config.zalo.groupName}`);
    await rl.question("Khi group da mo dung man hinh chat, nhan Enter de bat dau quet anh...");

    console.log(`Dang cuon nguoc ${config.zalo.scrollRounds} vong de load lich su anh...`);
    await scrollChatHistory(page, config.zalo.scrollRounds, config.zalo.scrollPauseMs);

    console.log("Dang tim va tai anh dang load tren man hinh...");
    const collected = await collectImagesFromCurrentPage(config, page);
    const newImages = collected.filter((item) => !item.skipped);
    const skipped = collected.filter((item) => item.skipped);

    console.log(`Tong candidate: ${collected.length}`);
    console.log(`Anh moi da luu: ${newImages.length}`);
    console.log(`Anh da co trong checkpoint, bo qua: ${skipped.length}`);
    for (const image of newImages) {
      console.log(`- ${image.path}`);
    }
  } finally {
    rl.close();
    await context.close();
  }
}

async function ensureLocalConfig(): Promise<void> {
  const localPath = "config/app.local.json";
  if (existsSync(localPath)) {
    return;
  }

  await mkdir(path.dirname(localPath), { recursive: true });
  await copyFile("config/app.example.json", localPath);
  console.log("Da tao config/app.local.json tu config mau. Hay sua groupName neu can.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
