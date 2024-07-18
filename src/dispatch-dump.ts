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

import fs, { Dirent } from "fs";
import path from "path";

const dispatchTree = (
  sourceDirectory: string,
  projectDirectory: string,
  shootingMode: string
) => {
  // Enumerate the list of files in the source directory.
  const files: Dirent[] = fs.readdirSync(`${sourceDirectory}/${shootingMode}`, {
    recursive: true,
    withFileTypes: true,
    encoding: "utf8"
  });
  console.log(`Found ${files.length} files to dispatch.`);

  // Process the list of files.
  files.forEach(file => {
    if (
      !(file.isFile() || file.isSymbolicLink()) ||
      !file.name.endsWith(".fit")
    ) {
      console.log("Skipping ", file);
      return;
    }

    // If the file is a FITS file, process it.
    const fileSpecs = extractSpecsFromFilename(file);
    console.log("🌈", file, JSON.stringify(fileSpecs, null, 2));
  });
};

/**
 * Retrieve Light / Flat, Bulb duratin, binning, filter, gain, date, time, temperature, frame number.
 * @param filename
 */
const extractSpecsFromFilename = (file: fs.Dirent) => {
  // Light_LDN 1093_120.0s_Bin1_H_gain100_20240707-002348_-10.0C_0001.fit
  // Flat_810.0ms_Bin1_H_gain0_20240707-102251_-9.9C_0019.fit

  const regex =
    /^(?<type>[A-Za-z]+)(?:_[^_]+)?_(?<bulb>[^_]+)_(?<bin>Bin\d)_(?<filter>[A-Za-z])_gain(?<gain>\d+)_(?<datetime>\d{8}-\d{6})_(?<temperature>-?\d+\.\d+C)_(?<sequence>\d{4})\.(?<extension>fit)$/;
  const match = file.name.match(regex);

  if (match && match.groups) {
    return {
      fileName: file.name,
      filePath: file.path,
      fileFullPath: path.join(file.path, file.name),

      type: match.groups.type,
      bulb: match.groups.bulb,
      bin: match.groups.bin,
      filter: match.groups.filter,
      gain: parseInt(match.groups.gain, 10),
      datetime: match.groups.datetime,
      temperature: match.groups.temperature,
      sequence: parseInt(match.groups.sequence, 10),
      extension: match.groups.extension
    };
  } else {
    throw new Error(
      `Filename ${file.name} does not match the expected pattern for Specs extraction.`
    );
  }
};

const sourceDirectory = process.argv[2];
if (!sourceDirectory) {
  console.error("No source directory provided.");
  process.exit(1);
}
const projectDirectory = process.argv[3] || ".";
const shootingMode = process.argv[4] || "Autorun";

dispatchTree(sourceDirectory, projectDirectory, shootingMode);
