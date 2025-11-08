import path from "path";
import fs from "fs-extra";

import { ImageSpec, FileImageSpec } from "./types";
import { logger } from "./logger";

/**
 * Retrieve FITS files from a source directory.
 */
export const getFitsFromDirectory = ({
  directory: directory,
  projectDirectory,
}: {
  directory: string;
  projectDirectory: string;
}) => {
  const files: fs.Dirent[] = fs.readdirSync(directory, {
    recursive: true,
    withFileTypes: true,
    encoding: "utf8",
  });

  const fileImageSpecs: FileImageSpec[] = [];

  let previousFile: FileImageSpec | null = null;
  // Process the list of files.
  files.forEach(file => {
    if (file.isDirectory()) {
      return;
    }
    if (file.name.endsWith("_thn.jpg")) {
      logger.debug(`Skipping thumbnail file (${file.name})`);
      return;
    }
    if (!(file.isFile() || file.isSymbolicLink())) {
      logger.debug(`Skipping not-file or symlink (${file.name})`);
      return;
    }
    // Ignore macOS files.
    if (
      file.name === ".DS_Store" ||
      file.name.startsWith("._") ||
      file.parentPath.includes("._")
    ) {
      return;
    }
    // Ignore Windows files.
    if (file.name === "Thumbs.db") {
      return;
    }
    if (!file.name.endsWith(".fit")) {
      logger.debug(`Skipping unknown file (${file.name})`);
      return;
    }

    // If the file is a FITS file, process it.
    const specs = getFileImageSpecFromFilename(
      file,
      projectDirectory,
      previousFile,
    );

    previousFile = specs;

    fileImageSpecs.push(specs);
  });

  return fileImageSpecs;
};

/**
 * Retrieve Light / Flat, Bulb duratin, binning, filter, gain, date, time, temperature, frame number in the sequence, sequence unique identifier.
 * @param filename
 */
export const getFileImageSpecFromFilename = (
  fileFS: fs.Dirent,
  projectDirectory: string,
  previousFile: FileImageSpec | null,
): FileImageSpec => {
  // Light_LDN 1093_120.0s_Bin1_H_gain100_20240707-002348_-10.0C_0001.fit
  // Flat_810.0ms_Bin1_H_gain0_20240707-102251_-9.9C_0019.fit
  // Dark_300.0s_Bin1_L_gain360_20230910-101917_-9.8C_0001.fit
  // Bias_1.0ms_Bin1_L_gain100_20240308-154938_-9.9C_0003.fit
  // Note: Filter is not always specified in the filename.

  const regex =
    /^(?<type>[A-Za-z]+)(?:_[^_]+)?_(?<bulb>[^_]+)_(?<bin>Bin\d)_((?<filter>[A-Za-z0-9 ]+)_)?gain(?<gain>\d+)_(?<datetime>\d{8}-\d{6})_(?<temperature>-?\d+\.\d+C)_(?<sequence>\d{4})\.(?<extension>fit)$/;
  const match = fileFS.name.match(regex);

  if (match && match.groups) {
    const sequencePosition = parseInt(match.groups.sequence, 10);
    const datetime = parseDate(match.groups.datetime);
    const temperature = parseFloat(match.groups.temperature);

    const file = {
      setName: "",

      type: match.groups.type,
      bulb: match.groups.bulb,
      bulbMs: parseBulbString(match.groups.bulb),
      bin: match.groups.bin,
      filter: match.groups.filter?.replaceAll(" ", "").trim() ?? null,
      gain: parseInt(match.groups.gain, 10),

      sequenceId: "", // To be determined later. Referenced here early to have serialization printing fields in this order.
      sequencePosition,
      datetime,
      temperature,

      fileName: fileFS.name,
      extension: match.groups.extension,

      // Source paths are absolute (they point to external resources)
      sourceFileDirectory: path.resolve(fileFS.parentPath),
      sourceFilePath: path.resolve(fileFS.parentPath, fileFS.name),
    } as FileImageSpec;

    file.setName = getSetName(file);

    if (!previousFile) {
      file.sequenceId = unParseDate(datetime);
    } else {
      // Is considered part of the same sequence if the previous file is of the same type and the sequence position is bigger (not only by 1 to allow sequences with holes in it.).
      file.sequenceId =
        previousFile.setName === file.setName &&
        previousFile.sequencePosition < sequencePosition
          ? previousFile.sequenceId
          : unParseDate(datetime);
    }

    if (file.type === "Light") {
      file.projectFileDirectory = undefined; // To be determined later from layerSetId. Referenced here early to have serialization printing fields in this order.
    } else if (file.type === "Flat") {
      const directory = file.setName;

      // Store relative path (relative to project root)
      file.projectFileDirectory = file.filter
        ? path.join(file.filter, directory)
        : directory;
    } else {
      const directory = `${file.type}_${file.bulb}_${file.bin}_gain${file.gain}`;
      // Store relative path (relative to project root)
      file.projectFileDirectory = path.join("any", directory); // We ignore the filter for darks and biases.
    }

    if (file.type === "Light") {
      file.projectFilePath = undefined; // To be determined later from layerSetId. Referenced here early to have serialization printing fields in this order.
    } else {
      file.projectFilePath = path.join(
        file.projectFileDirectory,
        file.fileName,
      );
    }
    return file;
  } else {
    throw new Error(
      `Filename ${fileFS.name} does not match the expected pattern for Specs extraction.`,
    );
  }
};

/**
 * @param datetimeString `20240707-002348` format.
 */
const parseDate = (datetimeString: string): Date => {
  const datetimeRegex = /(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/;
  const matchResult = datetimeString.match(datetimeRegex);

  if (matchResult) {
    const [_, year, month, day, hour, minute, second] = matchResult;
    const parsedDate = new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1, // Month is zero-based in JavaScript Date.
      parseInt(day, 10),
      parseInt(hour, 10),
      parseInt(minute, 10),
      parseInt(second, 10),
    );
    return parsedDate;
  } else {
    throw new Error(`Invalid datetime string: ${datetimeString}`);
  }
};

/**
 * Inverse function of `parseDate`.
 * @returns `20240707-002348` format.
 */
const unParseDate = (datetime: Date): string => {
  const pad = (num: number) => num.toString().padStart(2, "0");
  return `${datetime.getFullYear()}${pad(datetime.getMonth() + 1)}${pad(
    datetime.getDate(),
  )}-${pad(datetime.getHours())}${pad(datetime.getMinutes())}${pad(
    datetime.getSeconds(),
  )}`;
};

/**
 *
 * @param bulbString `120.0s` or `810.0ms`.
 * @returns 120000 or 810 (in ms).
 */
const parseBulbString = (bulbString: string): number => {
  const bulbRegex = /(\d+\.\d+)(ms|s)/;
  const matchResult = bulbString.match(bulbRegex);

  if (matchResult) {
    const [_, bulb, unit] = matchResult;
    return unit === "s" ? parseFloat(bulb) * 1000 : parseFloat(bulb);
  } else {
    throw new Error(`Invalid bulb string: ${bulbString}`);
  }
};

export const copyFileToProject = (
  file: FileImageSpec,
  alreadyImported: FileImageSpec[],
  projectDirectory: string,
): FileImageSpec[] => {
  // Resolve relative paths to absolute (relative to project directory)
  const absoluteProjectFileDirectory = path.resolve(projectDirectory, file.projectFileDirectory);
  const absoluteProjectFilePath = path.resolve(projectDirectory, file.projectFilePath);

  if (!fs.existsSync(absoluteProjectFileDirectory)) {
    fs.mkdirSync(absoluteProjectFileDirectory, { recursive: true });
  }

  if (alreadyImported.find(f => f.fileName === file.fileName)) {
    logger.debug(`- ${file.fileName} already imported.`);
  } else {
    fs.copyFileSync(file.sourceFilePath, absoluteProjectFilePath);
    alreadyImported.push(file);

    logger.debug(`- ${file.fileName} imported.`);
  }

  return alreadyImported;
};

/**
 * Used to match flats with biases, lights with darks.
 * Allow these couples:
 * - [A] with [B]
 * - Light with Dark.
 * - Light with Flat (allowing for different gain).
 * - Flat with Bias.
 */
export const matchSetFile = (A: ImageSpec, B: ImageSpec): boolean => {
  if (A.type === "Light" && B.type === "Dark") {
    return A.bulb === B.bulb && A.bin === B.bin && A.gain === B.gain;
  } else if (A.type === "Light" && B.type === "Flat") {
    return A.bin === B.bin && A.filter === B.filter;
  } else if (A.type === "Flat" && B.type === "Bias") {
    return A.bin === B.bin && A.gain === B.gain;
  } else {
    return false;
  }
};

/**
 * @returns `Flat_520.0ms_Bin1_H_gain0`, `Flat_520.0ms_Bin1_gain0` format.
 */
const getSetName = (file: FileImageSpec): string => {
  return file.filter
    ? `${file.type}_${file.bulb}_${file.bin}_${file.filter}_gain${file.gain}`
    : `${file.type}_${file.bulb}_${file.bin}_gain${file.gain}`;
};

/**
 * Utils for map.
 */
export const getImageSpecFromSetName = (setName: string): ImageSpec => {
  return setName.split("_").length === 5
    ? ({
        setName,
        type: setName.split("_")[0],
        bulb: setName.split("_")[1],
        bin: setName.split("_")[2],
        filter: setName.split("_")[3],
        gain: Number(setName.split("_")[4].replace("gain", "")),
      } as ImageSpec)
    : ({
        setName,
        type: setName.split("_")[0],
        bulb: setName.split("_")[1],
        bin: setName.split("_")[2],
        filter: null,
        gain: Number(setName.split("_")[3].replace("gain", "")),
      } as ImageSpec);
};

/**
 * Detect if ASIAIR directory structure is present.
 */
export const isAsiAirDirectoryF = (
  directory: string,
): {
  isAsiAirDirectory: boolean;
  autorunDirectory: string;
  planDirectory: string;
} => {
  const autorunDirectory = `${directory}/Autorun`;
  const planDirectory = `${directory}/Plan`;

  return {
    isAsiAirDirectory:
      fs.existsSync(autorunDirectory) || fs.existsSync(planDirectory),
    autorunDirectory,
    planDirectory,
  };
};
