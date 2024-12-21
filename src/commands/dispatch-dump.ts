// Dispatch ASIAIR dump data from ASIAIR tree structure to the SIRIL process structure.

// TODO allow filtering a range of data, for lights and flats. This will ease the process of selecting the frames
// regroup per night session (so split at noon and consider after midnight part of the previon night). this is also easing out the process.
// pre select those that are burned (daylight started to appear), probably by checking the date of the frame and location.

import fs from "fs";
import Enquirer from "enquirer";

import { logger } from "../utils/logger";
import {
  copyFileToProject,
  getFitsFromDirectory,
  matchSetFile,
  getImageSpecFromSetName,
} from "../utils/utils";
import { FileImageSpec, LayerSet, PotoProject } from "../utils/types";
import { POTO_JSON } from "../utils/const";

export type DispatchOptions = {
  projectDirectory: string;
  asiAirDirectory: string;
  shootingMode: "autorun" | "plan";
  bankDirectory: string;
};

const dispatch = async ({
  projectDirectory,
  asiAirDirectory,
  shootingMode,
  bankDirectory,
}: DispatchOptions) => {
  await ensureProjectDirectoryExists(projectDirectory);

  const inputFiles = getAllFitsInInputDirectories(
    asiAirDirectory,
    shootingMode,
    projectDirectory,
  );

  const lights = inputFiles.filter(file => file.type === "Light");

  const matchingFlats = inputFiles
    .filter(x => x.type === "Flat")
    .filter(flat => {
      if (lights.find(light => matchSetFile(light, flat))) {
        return flat;
      } else {
        logger.infoNR(
          `Skippingg ${flat.setName} seq ${flat.sequenceId} from the ASIAIR, No light matching.`,
        );
      }
    });

  logger.info(`Found ${matchingFlats.length} matching flats.`, matchingFlats);

  return;

  const importedLightsFlatsFiles: FileImageSpec[] = [];
  const importedDarksBiasesFiles: FileImageSpec[] = [];

  // Dispatch the ASIAIR Lights files to the project directory.
  const lightFiles = inputFiles.filter(file => file.type === "Light");
  lightFiles.forEach(file => {
    copyFileToProject(file);
    importedLightsFlatsFiles.push(file);
  });

  // Dispatch associated flats.

  // Search for the darks and biases we need to copy.
  const bankFiles = getFitsFromDirectory({
    directory: bankDirectory,
    projectDirectory,
  });
  logger.info(`Found ${bankFiles.length} files in the bank.`);
  bankFiles.forEach(file => {
    // Check if the file is needed from the bank.
    if (importedLightsFlatsFiles.find(f => matchSetFile(f, file))) {
      copyFileToProject(file);
      importedDarksBiasesFiles.push(file);
    } else {
      logger.debug(`Skipping ${file.fileName} from the bank, not needed.`);
    }
  });

  // TODO. Extract below to a new isolated stats function.

  // Check that there's flat, darks and biases for each sets.
  const files = [...importedLightsFlatsFiles, ...importedDarksBiasesFiles];
  const flatFiles = files.filter(file => file.type === "Flat");
  const darkFiles = files.filter(file => file.type === "Dark");
  const biasFiles = files.filter(file => file.type === "Bias");

  const layerSets = [
    ...new Set(
      files.filter(file => file.type === "Light").map(file => file.setName),
    ),
  ].map(layerSetName => {
    const setSpecs = getImageSpecFromSetName(layerSetName);

    const layerSet = {
      filter: setSpecs.filter,
      lightSet: layerSetName,
      // TODO. Refactor to use the filter function here too. Or store the decision previously made (during the bank selection) to reuse it here.
      // The core issue is that we kinda recompute the same thing twice when importing files + when generating the poto project file.
      lights: lightFiles.filter(file => file.setName === layerSetName),
      darks: darkFiles.filter(
        file =>
          file.bin === setSpecs.bin &&
          file.gain === setSpecs.gain &&
          file.bulb === setSpecs.bulb,
      ),
      flats: flatFiles.filter(
        file => file.bin === setSpecs.bin && file.filter === setSpecs.filter,
      ),
    } as LayerSet;

    const biases = biasFiles.filter(
      file =>
        file.bin === (layerSet.flats[0]?.bin ?? undefined) &&
        file.gain === (layerSet.flats[0]?.gain ?? undefined),
    );

    return {
      filter: layerSet.filter,

      lightSet: layerSet.lightSet,
      flatSet: layerSet.flats[0]?.setName ?? undefined,
      darkSet: layerSet.darks[0]?.setName ?? undefined,
      biasSet: biases[0]?.setName ?? undefined,

      lightsCount: layerSet.lights.length,
      flatsCount: layerSet.flats.length,
      darksCount: layerSet.darks.length,
      biasesCount: biases.length,

      lights: layerSet.lights,
      darks: layerSet.darks,
      flats: layerSet.flats,
      biases,
    } as LayerSet;
  });

  logger.info(
    `🔭 Project size: ${layerSets.reduce(
      (total, layerSet) => total + layerSet.flatsCount,
      0,
    )} lights, ${layerSets.reduce(
      (total, layerSet) => total + layerSet.darksCount,
      0,
    )} darks, ${layerSets.reduce(
      (total, layerSet) => total + layerSet.flatsCount,
      0,
    )} flats, ${layerSets.reduce(
      (total, layerSet) => total + layerSet.biasesCount,
      0,
    )} biases.`,
  );

  for (const layerSet of layerSets) {
    const log = `  🌌 Set ${layerSet.lightSet} has ${layerSet.lights.length} lights, ${layerSet.darks.length} darks, ${layerSet.flats.length} flats, ${layerSet.biases.length} biases.`;
    if (
      layerSet.lights.length > 0 &&
      layerSet.flats.length > 0 &&
      layerSet.darks.length > 0 &&
      layerSet.biases.length > 0
    ) {
      logger.info(log);
    } else {
      logger.warning(log);
    }
  }

  const potoProject: PotoProject = {
    generatedAt: new Date(),
    potoVersion: "0.1.0",
    layerSets,
  };

  const potoJsonPath = `${projectDirectory}/${POTO_JSON}`;

  fs.writeFileSync(potoJsonPath, JSON.stringify(potoProject, null, 2));

  logger.success(`Dispatch done ✅. ${POTO_JSON} generated 💃.`);
};

export default dispatch;

/**
 * Ensure that the project directory exists.
 * If it does not exist, ask the user if they want to create it.
 */
const ensureProjectDirectoryExists = async (projectDirectory: string) => {
  if (!fs.existsSync(projectDirectory)) {
    const enquirer = new Enquirer();
    const response = (await enquirer.prompt({
      type: "confirm",
      name: "createProjectDirectory",
      message: `Directory ${projectDirectory} does not exist. Do you want to create it?`,
    })) as { createProjectDirectory: boolean };

    if (response.createProjectDirectory) {
      fs.mkdirSync(projectDirectory, { recursive: true });
    }
  }
};

// TODO. Decouple from ASIAIR. Just warn if files both found in Autorun and Plan, and ask the user to probably review the input files first.
// TODO. Allow multiple directories in input.
const getAllFitsInInputDirectories = (
  asiAirDirectory: string,
  shootingMode: string,
  projectDirectory: string,
) => {
  const files = getFitsFromDirectory({
    directory: `${asiAirDirectory}/${
      shootingMode === "autorun" ? "Autorun" : "Plan"
    }`,
    projectDirectory,
  });
  logger.info(`Found ${files.length} files to dispatch.`);
  return files;
};
