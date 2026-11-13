/**
 * SmartCar demo video recorder.
 * Walks through every page and feature of the app while recording a video.
 *
 * Usage:  node record-demo.mjs
 * Output: ../smartcar-demo.webm
 */
import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = "http://localhost:5173";
const OUT_DIR = path.join(__dirname, "demo-video");
const OUT_FILE = path.join(__dirname, "..", "smartcar-demo.webm");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function scrollSlowly(page, step = 600, delay = 900) {
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += step) {
    await page.mouse.wheel(0, step);
    await wait(delay);
  }
  await wait(400);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await wait(600);
}

const run = async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
  });
  // Force dark theme from the very first frame (same key the app persists).
  await context.addInitScript(() => {
    window.localStorage.setItem("smartcar-theme", "dark");
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  console.log("1/9  Dashboard…");
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await wait(3500);
  await scrollSlowly(page, 500, 1000);

  console.log("2/9  Predict Price page…");
  await page.getByRole("link", { name: "Predict Price" }).click();
  await page.waitForURL("**/predict");
  await wait(2000);
  await scrollSlowly(page, 500, 900);

  console.log("3/9  Loading sample data…");
  await page.getByRole("button", { name: /load sample data/i }).click();
  await wait(1500);

  console.log("4/9  Submitting prediction…");
  await page.getByRole("button", { name: "Predict Car Price" }).click();
  await page.getByText(/Estimated resale value/i).waitFor();
  await wait(3500);

  console.log("5/9  Prediction History…");
  await page.getByRole("link", { name: "View Prediction History" }).click();
  await page.waitForURL("**/history");
  await page.getByText("Prediction ID").first().waitFor();
  await wait(2500);

  console.log("6/9  History: search + sort…");
  await page.getByLabel(/search/i).first().fill("swift");
  await wait(2000);
  await page.getByLabel(/search/i).first().fill("");
  await wait(1500);
  await page.getByRole("button", { name: "Car Name" }).click();
  await wait(1800);

  console.log("7/9  History: detail dialog…");
  await page.getByRole("button", { name: /view details for/i }).first().click();
  await page.getByText("Prediction details").waitFor();
  await wait(3000);
  await page.keyboard.press("Escape");
  await wait(1200);

  console.log("8/9  Analytics…");
  await page.getByRole("link", { name: "Analytics" }).click();
  await page.waitForURL("**/analytics");
  await wait(2000);
  await scrollSlowly(page, 500, 1000);

  console.log("8b/9 About & Model…");
  await page.getByRole("link", { name: "About & Model" }).click();
  await page.waitForURL("**/about");
  await wait(2000);
  await scrollSlowly(page, 500, 900);

  console.log("9/9  Theme toggle + finish…");
  await page.getByRole("button", { name: /switch to light mode/i }).click();
  await wait(2200);
  await page.getByRole("button", { name: /switch to dark mode/i }).click();
  await wait(1500);

  await page.getByRole("link", { name: "Dashboard" }).click();
  await page.waitForURL(BASE + "/");
  await wait(2500);

  const video = page.video();
  await context.close();
  await browser.close();

  if (video) {
    const tmp = await video.path();
    fs.copyFileSync(tmp, OUT_FILE);
    fs.rmSync(OUT_DIR, { recursive: true, force: true });
    console.log("Video saved:", OUT_FILE);
  }
};

run().catch((err) => {
  console.error("Recording failed:", err);
  process.exit(1);
});
