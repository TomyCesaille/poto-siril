import fs from "fs-extra";
import { logger } from "../utils/logger";
import { execa } from "execa";
import path from "path";
import { GENERATED_SCRIPT_PREFIX } from "../utils/const";

export const runScripts = async (
  projectDirectory: string,
  scriptTemplatePath: string,
) => {
  const scripts = fs
    .readdirSync(projectDirectory, {
      recursive: true,
      withFileTypes: false,
      encoding: "utf8",
    })
    .filter(
      f =>
        path.basename(f) ===
        `${GENERATED_SCRIPT_PREFIX}${path.basename(scriptTemplatePath)}`,
    )
    .map(f => path.join(projectDirectory, f)).map(s => path.resolve(s));

  logger.debug(`${scripts.length} scripts found to run.`);

  const cwd = path.resolve(projectDirectory);
  logger.debug("Siril CWD:", cwd);

  for (const script of scripts) {
    logger.info(`Running script ${script}`);

    const child = execa("siril", ["-s", script], {
      cwd,
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

  logger.success("Scripts have been run ✅.");
};
