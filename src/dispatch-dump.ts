// Dispatch ASIAIR dump data from ASIAIR tree structure to the SIRIL process structure.

// The ASIAIR directory structure is as follows:
// The dump directory (being the root directory of the ASIAIR storage).
// ├── Autorun
// │   ├── Flat
// |      ├── Flat_1.0ms_Bin1_B_gain100_20240511-094304_-10.5C_0001.fit
// │   ├── Light
// |      ├── {target}
// |         ├── Light_91 Piscium_10.0s_Bin1_L_gain360_20240320-203324_-10.0C_0001

// This structure will be broke down into the following directory structure:
// project root directory
// ├── S                                                    <- Directory for each filter.
// │   ├── Light_91 Piscium_10.0s_Bin1_S_gain100            <- Sub directory for each BIN-GAIN-BULB combination.
// |      ├── Light_91 Piscium_10.0s_Bin1_S_gain100_20240320-203324_-10.0C_0001.fit
// │      ├── ...
// │   ├── Light_91 Piscium_10.0s_Bin1_S_gain360
// |      ├── Light_91 Piscium_10.0s_Bin1_S_gain360_20240320-203324_-10.0C_0001.fit
// |      ├── Light_91 Piscium_10.0s_Bin1_S_gain360_20240320-203324_-10.0C_0002.fit
// │      ├── ...
// ├── H
// ├── O
// ├── ...

// We are cherry picking the darks and offsets needed from the bank directory, and adding them to the project root directory.
// root
// ├── Bias_1.0ms_Bin1_gain100_-9.9C_*
// │   ├── Bias_1.0ms_Bin1_L_gain100_20240308-154935_-10.0C_0001.fit
// │   ├── ...
// ├── Darks_300.0s_Bin1_gain100_-10C_*
// │   ├── Dark_300.0s_Bin1_L_gain100_20240308-155722_-10.0C_0001.fit
// │   ├── ...

// TODO allow filtering a range of data, for lights and flats. This will ease the process of selecting the frames
// regroup per night session (so split at noon and consider after midnight part of the previon night). this is also easing out the process.
// pre select those that are burned (daylight started to appear), probably by checking the date of the frame and location.

import fs from "fs";
import Enquirer from "enquirer";

import { logger } from "./logger";
import {
  importFileToProject,
  retrievesFitsFromDirectory,
  matchSetFile,
  getSpecsFromSetName
} from "./utils";
import { SetProject, Spec, SpecFile } from "./types";
import { POTO_JSON } from "./const";

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
  bankDirectory
}: DispatchOptions) => {
  if (!fs.existsSync(projectDirectory)) {
    const enquirer = new Enquirer();
    const response = (await enquirer.prompt({
      type: "confirm",
      name: "createProjectDirectory",
      message: `Directory ${projectDirectory} does not exist. Do you want to create it?`
    })) as { createProjectDirectory: boolean };

    if (response.createProjectDirectory) {
      fs.mkdirSync(projectDirectory, { recursive: true });
    }
  }

  // Enumerate the list of files of the ASIAIR directory.
  const asiAirFiles = retrievesFitsFromDirectory({
    sourceDirectory: `${asiAirDirectory}/${shootingMode}`,
    projectDirectory
  });
  logger.info(`Found ${asiAirFiles.length} files to dispatch.`);

  // Dispatch the ASIAIR files to the project directory.
  asiAirFiles.forEach(file => {
    importFileToProject(file);
  });

  // Search for the darks and biases we need to copy.
  const bankFiles = retrievesFitsFromDirectory({
    sourceDirectory: bankDirectory,
    projectDirectory
  });
  logger.info(`Found ${bankFiles.length} files in the bank.`);
  bankFiles.forEach(file => {
    // Check if the file is needed from the bank.
    if (asiAirFiles.find(f => matchSetFile(f, file))) {
      importFileToProject(file);
    } else {
      logger.debug(`Skipping ${file.fileName} from the bank, not needed.`);
    }
  });

  // TODO. Extract below to a new isolated stats function.

  // Check that there's flat, darks and biases for each sets.
  const files = [...asiAirFiles, ...bankFiles];
  const lightFiles = files.filter(file => file.type === "Light");
  const flatFiles = files.filter(file => file.type === "Flat");
  const darkFiles = files.filter(file => file.type === "Dark");
  const biasFiles = files.filter(file => file.type === "Bias");

  const sets = [
    ...new Set(
      files.filter(file => file.type === "Light").map(file => file.setName)
    )
  ].map(set => {
    const setSpecs = getSpecsFromSetName(set);

    const projectSet = {
      lightSet: set,
      // TODO. Refactor to use the filter function here too. Or store the decision previously made (during the bank selection) to reuse it here.
      lights: lightFiles.filter(file => file.setName === set),
      flats: flatFiles.filter(
        file => file.bin === setSpecs.bin && file.filter === setSpecs.filter
      ),
      darks: darkFiles.filter(
        file =>
          file.bin === setSpecs.bin &&
          file.gain === setSpecs.gain &&
          file.bulb === setSpecs.bulb
      ),
      biases: biasFiles.filter(
        file => file.bin === setSpecs.bin && file.gain === setSpecs.gain
      )
    } as SetProject;

    return {
      filter: projectSet.filter,

      lightSet: projectSet.lightSet,
      flatSet: projectSet.flats[0].setName,
      darkSet: projectSet.darks[0].setName,
      biasSet: projectSet.biases[0].setName,

      lightsCount: projectSet.lights.length,
      flatsCount: projectSet.flats.length,
      darksCount: projectSet.darks.length,
      biasesCount: projectSet.biases.length,

      lights: projectSet.lights,
      darks: projectSet.darks,
      flats: projectSet.flats,
      biases: projectSet.biases
    } as SetProject;
  });

  logger.info(
    `🔭 Project size: ${sets.reduce(
      (total, set) => total + set.flatsCount,
      0
    )} lights, ${sets.reduce(
      (total, set) => total + set.darksCount,
      0
    )} darks, ${sets.reduce(
      (total, set) => total + set.flatsCount,
      0
    )} flats, ${sets.reduce(
      (total, set) => total + set.biasesCount,
      0
    )} biases.`
  );

  for (const set of sets) {
    const log = `  🌌 Set ${set.lightSet} has ${set.lights.length} lights, ${set.darks.length} darks, ${set.flats.length} flats, ${set.biases.length} biases.`;
    if (
      set.lights.length > 0 &&
      set.flats.length > 0 &&
      set.darks.length > 0 &&
      set.biases.length > 0
    ) {
      logger.info(log);
    } else {
      logger.warning(log);
    }
  }

  fs.writeFileSync(
    `${projectDirectory}/${POTO_JSON}`,
    JSON.stringify(sets, null, 2)
  );

  logger.success("Done.");
};

export default dispatch;
