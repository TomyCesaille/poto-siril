import path from "path";
import fs from "fs";
import { logger } from "./logger";
import { LayerSet, PotoProject } from "./types";
import { POTO_JSON, POTO_VERSION } from "./const";

export const generateMonoProcessingScripts = async (
  projectDirectory: string,
) => {
  const rawScriptPath = path.join(__dirname, "raw-siril-scripts");
  //const mono_preprocessing = `siril -s ${rawScriptPath}/mono_preprocessing.ssf`;
  const mono_proprocessingPath = path.join(
    rawScriptPath,
    "Mono_Preprocessing.ssf",
  );
  const mono_processing = fs.readFileSync(mono_proprocessingPath, {
    encoding: "utf8",
  });

  const potoProject: PotoProject = JSON.parse(
    fs.readFileSync(path.join(projectDirectory, POTO_JSON), {
      encoding: "utf8",
    }),
  );
  if (POTO_VERSION !== potoProject.potoVersion) {
    logger.errorThrow(
      `Project version mismatch. Expected ${POTO_VERSION}, got ${potoProject.potoVersion}. Please regenerate the project.`,
    );
  }

  logger.info("dd", {
    layersToPreprocess: potoProject.layerSets.map(set => set.lightSet),
    mono_proprocessingPath,
    mono_processing: mono_processing.slice(0, 100),
  });

  potoProject.layerSets.forEach(set => {
    generateScriptForFilter(projectDirectory, set, mono_processing);
  });
};

const generateScriptForFilter = (
  projectDirectory: string,
  set: LayerSet,
  raw_script: string,
) => {
  const filter = set.filter;
  const filterDirectory = path.join(projectDirectory, filter);
  const anyDirectory = path.join(projectDirectory, "any");
  const processDirectory = path.join(filterDirectory, "process");
  if (!fs.existsSync(processDirectory)) {
    fs.mkdirSync(processDirectory, { recursive: false });
  }

  logger.debug("directories", {
    anyDirectory,
    filterDirectory,
    processDirectory,
  });

  // TODO. Move checkers to dispatch-dump.
  const lightsdirs = [...new Set(set.lights.map(x => x.projectDirectory))];
  if (lightsdirs.length === 0) {
    throw new Error("No lights found for filter " + set.lightSet);
  }
  if (lightsdirs.length > 1) {
    logger.errorThrow("Multiple sets of light for ", lightsdirs);
  }
  const lightsDir = lightsdirs[0];

  const flatsDirs = [...new Set(set.flats.map(x => x.projectDirectory))];
  if (flatsDirs.length === 0) {
    throw new Error("No flats found for filter " + set.lightSet);
  }
  if (flatsDirs.length > 1) {
    throw new Error("Multiple sets of flat for " + set.lightSet);
  }
  const flatsDir = flatsDirs[0];

  const darksDirs = [...new Set(set.darks.map(x => x.projectDirectory))];
  if (darksDirs.length === 0) {
    throw new Error("No darks found for filter " + set.lightSet);
  }
  if (darksDirs.length > 1) {
    throw new Error("Multiple sets of darks for " + set.lightSet);
  }
  const darksDir = darksDirs[0];

  const biasesDirs = [...new Set(set.biases.map(x => x.projectDirectory))];
  if (biasesDirs.length === 0) {
    throw new Error("No biases found for filter " + set.lightSet);
  }
  if (biasesDirs.length > 1) {
    throw new Error("Multiple sets of biases for " + set.lightSet);
  }
  const biasesDir = biasesDirs[0];

  logger.info("dirs", {
    lightDir: lightsDir,
    flatsdir: flatsDir,
    darksdir: darksDir,
    biasesdir: biasesDir,
  });

  const script = raw_script
    .replaceAll("{{biases}}", biasesDir)
    .replaceAll("{{darks}}", darksDir)
    .replaceAll("{{flats}}", flatsDir)
    .replaceAll("{{lights}}", lightsDir);

  const processingScriptPath = path.join(
    processDirectory,
    `poto_${filter}_Mono_Preprocessing.ssf`,
  );
  fs.writeFileSync(processingScriptPath, script);
  logger.info(`Generated ${processingScriptPath}`, {
    biasesDir,
    darksDir,
    flatsDir,
    lightsDir,
  });
};
