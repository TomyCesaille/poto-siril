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
import path from "path";

import { SpecFile } from "./types";
import { logger } from "./logger";
import { extractSpecsFromFilename, sameSpecFile } from "./utils";

export type DispatchOptions = {
  projectDirectory: string;
  asiAirDirectory: string;
  shootingMode: "autorun" | "plan";
  bankDirectory: string;
};

const dispatch = ({
  projectDirectory,
  asiAirDirectory,
  shootingMode,
  bankDirectory
}: DispatchOptions) => {
  if (!fs.existsSync(projectDirectory)) {
    throw new Error(`Project directory ${projectDirectory} does not exist.`);
  }

  // Enumerate the list of files of the ASIAIR directory.
  const asiAirFiles = retrievesFitsListToDispatch(
    `${asiAirDirectory}/${shootingMode}`
  );
  logger.info(`Found ${asiAirFiles.length} files to dispatch.`);

  // Dispatch the ASIAIR files to the project directory.
  asiAirFiles.forEach(file => {
    const directory = `${file.type}_${file.bulb}_${file.bin}_${file.filter}_gain${file.gain}`;
    const targetDirectory = file.filter
      ? path.join(projectDirectory, file.filter, directory)
      : path.join(projectDirectory, directory);

    if (!fs.existsSync(targetDirectory)) {
      fs.mkdirSync(targetDirectory, { recursive: true });
    }

    const targetFile = path.join(targetDirectory, file.name);
    fs.copyFileSync(file.fullPath, targetFile);
    logger.debug(`Copied ${file.name} to ${targetFile}`);
  });

  // Search for the darks and offsets we need to copy.
  const bankFiles = retrievesFitsListToDispatch(bankDirectory);
  logger.info(`Found ${bankFiles.length} files in the bank.`);
  bankFiles.forEach(file => {
    const directory = `${file.type}_${file.bulb}_${file.bin}_gain${file.gain}`;
    const targetDirectory = path.join(projectDirectory, "any", directory); // We ignore the filter for darks and biases.

    // Check if the file is needed from the bank.
    if (
      asiAirFiles.find(f =>
        sameSpecFile(
          f,
          file,
          file.name.toLowerCase().startsWith("dark") ? "dark" : "bias"
        )
      )
    ) {
      if (!fs.existsSync(targetDirectory)) {
        fs.mkdirSync(targetDirectory, { recursive: true });
      }

      const targetFile = path.join(targetDirectory, file.name);
      fs.copyFileSync(file.fullPath, targetFile);
      logger.debug(`Copied ${file.name} to ${targetFile}`);
    } else {
      logger.debug(`Skipping ${file.name} from the bank, not needed.`);
    }
  });

  logger.success("Done.");
};

const retrievesFitsListToDispatch = (directory: string) => {
  const files: fs.Dirent[] = fs.readdirSync(directory, {
    recursive: true,
    withFileTypes: true,
    encoding: "utf8"
  });

  const fileSpecs: SpecFile[] = [];

  // Process the list of files.
  files.forEach(file => {
    if (
      !(file.isFile() || file.isSymbolicLink()) ||
      !file.name.endsWith(".fit")
    ) {
      logger.debug("Skipping ", file);
      return;
    }

    // If the file is a FITS file, process it.
    const specs = extractSpecsFromFilename(file);
    fileSpecs.push(specs);
    //log("🌈", file, JSON.stringify(fileSpecs, null, 2));
  });

  return fileSpecs;
};

export default dispatch;
