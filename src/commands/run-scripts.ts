import fs from "fs";
import { logger } from "../utils/logger";
import execa = require("execa");
import path = require("path");

export const runScripts = async (projectDirectory: string) => {
  const scripts = fs
    .readdirSync(projectDirectory, {
      recursive: true,
      withFileTypes: false,
      encoding: "utf8",
    })
    .filter(f => f.endsWith(".ssf"))
    .map(f => path.join(projectDirectory, f));

  logger.debug(`${scripts.length} scripts found to run.`);

  for (const script of scripts) {
    logger.info(`Running script ${script}`);

    const child = execa("siril", ["-s", script], {
      cwd: path.dirname(script),
    });

    child.stdout?.pipe(process.stdout);
    child.stderr?.pipe(process.stdout);

    await new Promise(resolve => {
      child.on("exit", code => {
        if (code !== 0) {
          logger.errorThrow("❌ script execution failed", code);
        } else {
          resolve(null);
        }
      });
    });
  }

  logger.success("Scripts were run ✅.");
};