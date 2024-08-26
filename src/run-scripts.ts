import fs from "fs";
import { logger } from "./logger";

export const runScripts = (projectDirectory: string) => {
  const scripts = fs
    .readdirSync(projectDirectory, {
      recursive: true,
      withFileTypes: false,
      encoding: "utf8",
    })
    .filter(f => f.endsWith(".ssf"));

  scripts.forEach(script => {
    logger.debug(`Running script ${script}`);
  });

  logger.success("Scripts were run ✅.");
};
