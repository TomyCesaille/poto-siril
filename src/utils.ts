import path from "path";
import fs from "fs";

import { SpecFile } from "./types";
import { logger } from "./logger";

/**
 * Retrieve FITS files from a source directory.
 */
export const retrievesFitsFromDirectory = ({
  sourceDirectory,
  projectDirectory
}: {
  sourceDirectory: string;
  projectDirectory: string;
}) => {
  const files: fs.Dirent[] = fs.readdirSync(sourceDirectory, {
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
    const specs = extractSpecsFromFilename(file, projectDirectory);
    fileSpecs.push(specs);
    //log("🌈", file, JSON.stringify(fileSpecs, null, 2));
  });

  return fileSpecs;
};

/**
 * Retrieve Light / Flat, Bulb duratin, binning, filter, gain, date, time, temperature, frame number.
 * @param filename
 */
export const extractSpecsFromFilename = (
  fileFS: fs.Dirent,
  projectDirectory: string
): SpecFile => {
  // Light_LDN 1093_120.0s_Bin1_H_gain100_20240707-002348_-10.0C_0001.fit
  // Flat_810.0ms_Bin1_H_gain0_20240707-102251_-9.9C_0019.fit
  // Dark_300.0s_Bin1_L_gain360_20230910-101917_-9.8C_0001.fit
  // Bias_1.0ms_Bin1_L_gain100_20240308-154938_-9.9C_0003.fit
  // Note: Filter is not always specified in the filename.

  const regex =
    /^(?<type>[A-Za-z]+)(?:_[^_]+)?_(?<bulb>[^_]+)_(?<bin>Bin\d)_((?<filter>[A-Za-z0-9])_)?gain(?<gain>\d+)_(?<datetime>\d{8}-\d{6})_(?<temperature>-?\d+\.\d+C)_(?<sequence>\d{4})\.(?<extension>fit)$/;
  const match = fileFS.name.match(regex);

  if (match && match.groups) {
    const file = {
      name: fileFS.name,

      sourceDirectory: fileFS.path,
      sourceFilePath: path.join(fileFS.path, fileFS.name),

      projectDirectory,

      type: match.groups.type,
      bulb: match.groups.bulb,
      bin: match.groups.bin,
      filter: match.groups.filter ?? null,
      gain: parseInt(match.groups.gain, 10),
      datetime: match.groups.datetime,
      temperature: match.groups.temperature,
      sequence: parseInt(match.groups.sequence, 10),
      extension: match.groups.extension
    } as SpecFile;

    if (["Light", "Flat"].includes(file.type)) {
      const directory = `${file.type}_${file.bulb}_${file.bin}_${file.filter}_gain${file.gain}`;

      file.projectDirectory = file.filter
        ? path.join(projectDirectory, file.filter, directory)
        : path.join(projectDirectory, directory);
    } else {
      const directory = `${file.type}_${file.bulb}_${file.bin}_gain${file.gain}`;
      file.projectDirectory = path.join(projectDirectory, "any", directory); // We ignore the filter for darks and biases.
    }

    return file;
  } else {
    throw new Error(
      `Filename ${fileFS.name} does not match the expected pattern for Specs extraction.`
    );
  }
};

export const importFileToProject = (file: SpecFile) => {
  if (!fs.existsSync(file.projectDirectory)) {
    fs.mkdirSync(file.projectDirectory, { recursive: true });
  }

  const targetFile = path.join(file.projectDirectory, file.name);
  fs.copyFileSync(file.sourceFilePath, targetFile);

  logger.debug(`Copied ${file.name} to ${targetFile}`);
};

/**
 * Used to match flats/lights with their darks/biases.
 * Return true if same bulb, bin, gain for darks.
 * Return true if same bin and gain for biases.
 * @param lightOrFlat
 * @param DarkOrBias
 */
export const sameSetFile = (
  lightOrFlat: SpecFile,
  DarkOrBias: SpecFile
): boolean => {
  if (DarkOrBias.type === "Dark") {
    return (
      lightOrFlat.bulb === DarkOrBias.bulb &&
      lightOrFlat.bin === DarkOrBias.bin &&
      lightOrFlat.gain === DarkOrBias.gain
    );
  } else if (DarkOrBias.type === "Bias") {
    return (
      lightOrFlat.bin === DarkOrBias.bin && lightOrFlat.gain === DarkOrBias.gain
    );
  } else {
    throw new Error(
      `Expected Dark or Bias file for 'DarkOrBias' input, got ${DarkOrBias.type}.`
    );
  }
};
