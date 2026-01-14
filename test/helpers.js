import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export function runCommand(command, cwd = process.cwd()) {
  try {
    return execSync(command, {
      cwd,
      stdio: "pipe",
      env: {
        ...process.env,
        NO_COLOR: "1",
        NODE_DISABLE_COLORS: "1",
        FORCE_COLOR: "0",
      },
    }).toString();
  } catch (e) {
    throw new Error(e.stderr ? e.stderr.toString() : e.message);
  }
}

export function cleanup(dir = "test_build") {
  const target = path.join(process.cwd(), dir);
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}
