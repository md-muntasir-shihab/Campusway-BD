import fs from 'fs';
import path from 'path';
import type { Page } from '@playwright/test';

function buildTimestamp() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');
}

export const COMM_QA_STAMP = process.env.COMM_QA_STAMP || buildTimestamp();
export const COMM_QA_SCREENSHOT_DIR = path.join(
  'd:/CampusWay/CampusWay/output/playwright/communication-hub-full-qa',
  COMM_QA_STAMP,
);

export function ensureCommunicationHubQaDir() {
  fs.mkdirSync(COMM_QA_SCREENSHOT_DIR, { recursive: true });
}

export async function communicationHubShot(page: Page, name: string) {
  ensureCommunicationHubQaDir();
  await page.screenshot({
    path: path.join(COMM_QA_SCREENSHOT_DIR, `${name}.png`),
    fullPage: true,
  });
}

export function writeCommunicationHubArtifact(name: string, value: unknown) {
  ensureCommunicationHubQaDir();
  fs.writeFileSync(path.join(COMM_QA_SCREENSHOT_DIR, name), typeof value === 'string' ? value : JSON.stringify(value, null, 2));
}
