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
  sameSetFile
} from "./utils";

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

  // Search for the darks and offsets we need to copy.
  const bankFiles = retrievesFitsFromDirectory({
    sourceDirectory: bankDirectory,
    projectDirectory
  });
  logger.info(`Found ${bankFiles.length} files in the bank.`);
  bankFiles.forEach(file => {
    // Check if the file is needed from the bank.
    if (asiAirFiles.find(f => sameSetFile(f, file))) {
      importFileToProject(file);
    } else {
      logger.debug(`Skipping ${file.name} from the bank, not needed.`);
    }
  });

  // Check that there's flat, darks and biases for each sets.
  const files = [...asiAirFiles, ...bankFiles];
  logger.info(
    `🔭 Project size: ${files.length} files. ${
      files.filter(x => x.type === "Light").length
    } lights, ${files.filter(x => x.type === "Flat").length} flats, ${
      files.filter(x => x.type === "Dark").length
    } darks, ${files.filter(x => x.type === "Bias").length} biases.`
  );

  logger.success("Done.");
};

export default dispatch;
