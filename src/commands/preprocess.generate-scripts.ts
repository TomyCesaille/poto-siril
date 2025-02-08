import path from "path";
import fs from "fs-extra";
import { logger } from "../utils/logger";
import { LayerSet, PotoProject } from "../utils/types";
import {
  GENERATED_SCRIPT_PREFIX,
  POTO_JSON,
  POTO_VERSION,
} from "../utils/const";

export const generateScripts = async (
  projectDirectory: string,
  scriptTemplatePath: string,
) => {
  const scriptTemplate = fs.readFileSync(scriptTemplatePath, {
    encoding: "utf8",
  });

  const potoProject: PotoProject = JSON.parse(
    fs.readFileSync(path.join(projectDirectory, POTO_JSON), {
      encoding: "utf8",
    }),
  );
  if (POTO_VERSION !== potoProject.potoVersion) {
    logger.errorThrow(
      `Project version mismatch. Expected ${POTO_VERSION}, got ${potoProject.potoVersion}. Please regenerate the project using the dispatch command.`,
    );
  }

  potoProject.layerSets.forEach(set => {
    generateScriptForLightSet(
      projectDirectory,
      set,
      path.basename(scriptTemplatePath),
      scriptTemplate,
    );
  });

  logger.success("Scripts were generated ✅.");
};

const generateScriptForLightSet = (
  projectDirectory: string,
  set: LayerSet,
  scriptName: string,
  scriptTemplate: string,
) => {
  const filter = set.filter;
  const filterDirectory = path.join(projectDirectory, filter ?? "any");
  const processDirectory = path.join(
    filterDirectory,
    `${set.layerSetId}_process`,
  );
  if (!fs.existsSync(processDirectory)) {
    fs.mkdirSync(processDirectory, { recursive: false });
  }
  const mastersDirectory = path.join(
    filterDirectory,
    `${set.layerSetId}_masters`,
  );
  if (!fs.existsSync(mastersDirectory)) {
    fs.mkdirSync(mastersDirectory, { recursive: false });
  }

  const lightsdirs = [...new Set(set.lights.map(x => x.projectFileDirectory))];
  if (lightsdirs.length === 0) {
    throw new Error("No lights found for filter " + set.layerSetId);
  }
  if (lightsdirs.length > 1) {
    logger.errorThrow("Multiple sets of light for ", lightsdirs);
  }
  const lightsDir = path.resolve(lightsdirs[0]);

  const flatsDirs = [...new Set(set.flats.map(x => x.projectFileDirectory))];
  if (flatsDirs.length === 0) {
    throw new Error("No flats found for filter " + set.layerSetId);
  }
  if (flatsDirs.length > 1) {
    throw new Error("Multiple sets of flat for " + set.layerSetId);
  }
  const flatsDir = path.resolve(flatsDirs[0]);

  const darksDirs = [...new Set(set.darks.map(x => x.projectFileDirectory))];
  if (darksDirs.length === 0) {
    throw new Error("No darks found for filter " + set.layerSetId);
  }
  if (darksDirs.length > 1) {
    throw new Error("Multiple sets of darks for " + set.layerSetId);
  }
  const darksDir = path.resolve(darksDirs[0]);

  const biasesDirs = [...new Set(set.biases.map(x => x.projectFileDirectory))];
  if (biasesDirs.length === 0) {
    throw new Error("No biases found for filter " + set.layerSetId);
  }
  if (biasesDirs.length > 1) {
    throw new Error("Multiple sets of biases for " + set.layerSetId);
  }
  const biasesDir = path.resolve(biasesDirs[0]);

  const projectDirectoryAbs = path.resolve(projectDirectory);
  const processDirAbs = path.resolve(processDirectory);
  const masterDirAbs = path.resolve(mastersDirectory);

  // TODO. Check that the script has the variables, warn if none.

  const script = scriptTemplate
    .replaceAll("{{poto-dir}}", projectDirectoryAbs)
    .replaceAll("{{biases}}", biasesDir)
    .replaceAll("{{darks}}", darksDir)
    .replaceAll("{{flats}}", flatsDir)
    .replaceAll("{{lights}}", lightsDir)
    .replaceAll("{{process}}", processDirAbs)
    .replaceAll("{{masters}}", masterDirAbs);

  const processingScriptPath = path.join(
    processDirectory,
    `${GENERATED_SCRIPT_PREFIX}${scriptName}`,
  );
  fs.writeFileSync(processingScriptPath, script);
  logger.info(`Generated ${processingScriptPath}`);
  logger.debug(`- {{poto-dir}} 👉 ${projectDirectoryAbs}`);
  logger.debug(`- {{lights}} 👉 ${lightsDir}`);
  logger.debug(`- {{flats}} 👉 ${flatsDir}`);
  logger.debug(`- {{darks}} 👉 ${darksDir}`);
  logger.debug(`- {{biases}} 👉 ${biasesDir}`);
  logger.debug(`- {{process}} 👉 ${processDirAbs}`);
  logger.debug(`- {{masters}} 👉 ${masterDirAbs}`);
};
