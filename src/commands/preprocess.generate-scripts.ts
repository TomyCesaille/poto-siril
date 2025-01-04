import path from "path";
import fs from "fs";
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
  const filterDirectory = path.join(projectDirectory, filter);
  const anyDirectory = path.join(projectDirectory, "any");
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

  logger.debug("directories", {
    anyDirectory,
    filterDirectory,
    processDirectory,
    mastersDirectory,
  });

  // TODO. Move checkers to dispatch-dump.
  const lightsdirs = [...new Set(set.lights.map(x => x.projectDirectory))];
  if (lightsdirs.length === 0) {
    throw new Error("No lights found for filter " + set.layerSetId);
  }
  if (lightsdirs.length > 1) {
    logger.errorThrow("Multiple sets of light for ", lightsdirs);
  }
  const lightsDir = lightsdirs[0];

  const flatsDirs = [...new Set(set.flats.map(x => x.projectDirectory))];
  if (flatsDirs.length === 0) {
    throw new Error("No flats found for filter " + set.layerSetId);
  }
  if (flatsDirs.length > 1) {
    throw new Error("Multiple sets of flat for " + set.layerSetId);
  }
  const flatsDir = flatsDirs[0];

  const darksDirs = [...new Set(set.darks.map(x => x.projectDirectory))];
  if (darksDirs.length === 0) {
    throw new Error("No darks found for filter " + set.layerSetId);
  }
  if (darksDirs.length > 1) {
    throw new Error("Multiple sets of darks for " + set.layerSetId);
  }
  const darksDir = darksDirs[0];

  const biasesDirs = [...new Set(set.biases.map(x => x.projectDirectory))];
  if (biasesDirs.length === 0) {
    throw new Error("No biases found for filter " + set.layerSetId);
  }
  if (biasesDirs.length > 1) {
    throw new Error("Multiple sets of biases for " + set.layerSetId);
  }
  const biasesDir = biasesDirs[0];

  logger.info("dirs", {
    lightDir: lightsDir,
    flatsdir: flatsDir,
    darksdir: darksDir,
    biasesdir: biasesDir,
  });

  const script = scriptTemplate
    .replaceAll("{{biases}}", biasesDir)
    .replaceAll("{{darks}}", darksDir)
    .replaceAll("{{flats}}", flatsDir)
    .replaceAll("{{lights}}", lightsDir)
    .replaceAll("{{process}}", processDirectory)
    .replaceAll("{{masters}}", mastersDirectory);

  const processingScriptPath = path.join(
    processDirectory,
    `${GENERATED_SCRIPT_PREFIX}${scriptName}`,
  );
  fs.writeFileSync(processingScriptPath, script);
  logger.info(`Generated ${processingScriptPath}`, {
    biasesDir,
    darksDir,
    flatsDir,
    lightsDir,
  });
};
