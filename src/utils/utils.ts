import path from "path";
import fs from "fs";

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
    if (
      !(file.isFile() || file.isSymbolicLink()) ||
      !file.name.endsWith(".fit")
    ) {
      logger.debugNR("Skipping ", file.name);
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
    /^(?<type>[A-Za-z]+)(?:_[^_]+)?_(?<bulb>[^_]+)_(?<bin>Bin\d)_((?<filter>[A-Za-z0-9])_)?gain(?<gain>\d+)_(?<datetime>\d{8}-\d{6})_(?<temperature>-?\d+\.\d+C)_(?<sequence>\d{4})\.(?<extension>fit)$/;
  const match = fileFS.name.match(regex);

  // TODO. Check if well sorted!

  if (match && match.groups) {
    const sequencePosition = parseInt(match.groups.sequence, 10);
    const datetime = parseDate(match.groups.datetime);

    let sequenceId = "";
    if (!previousFile) {
      sequenceId = unParseDate(datetime);
    } else {
      sequenceId =
        sequencePosition === 1
          ? unParseDate(datetime)
          : previousFile.sequenceId;
    }

    const file = {
      setName: "",

      type: match.groups.type,
      bulb: match.groups.bulb,
      bin: match.groups.bin,
      filter: match.groups.filter ?? null,
      gain: parseInt(match.groups.gain, 10),

      sequenceId,
      sequencePosition,
      datetime,
      temperature: match.groups.temperature,

      fileName: fileFS.name,
      extension: match.groups.extension,

      sourceDirectory: fileFS.path,
      sourceFilePath: path.join(fileFS.path, fileFS.name),

      projectDirectory,
    } as FileImageSpec;

    file.setName = getSetName(file);

    if (["Light", "Flat"].includes(file.type)) {
      const directory = file.setName;

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
      parseInt(month, 10) - 1, // Month is zero-based in JavaScript Date
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

export const copyFileToProject = (file: FileImageSpec) => {
  if (!fs.existsSync(file.projectDirectory)) {
    fs.mkdirSync(file.projectDirectory, { recursive: true });
  }

  const targetFile = path.join(file.projectDirectory, file.fileName);
  fs.copyFileSync(file.sourceFilePath, targetFile);

  logger.debug(`Copied ${file.fileName} to ${targetFile}`);
};

/**
 * Used to match flats with biases, lights with darks.
 * Allow these couples:
 * - [A] with [B]
 * - Light with Dark.
 * - Light with Flat (allowing for different gain).
 * - Flat with Bias.
 */
export const matchSetFile = (A: FileImageSpec, B: FileImageSpec): boolean => {
  if (A.type === "Light" && B.type === "Dark") {
    return (
      // TODO. Filter based on the temperature.
      A.bulb === B.bulb && A.bin === B.bin && A.gain === B.gain
    );
  } else if (A.type === "Light" && B.type === "Flat") {
    return A.bin === B.bin && A.filter === B.filter;
  } else if (A.type === "Flat" && B.type === "Bias") {
    if (B.bin === "Bin2" && A.bin === B.bin && A.gain === B.gain) {
      logger.errorThrow("ooo", A, B);
    }
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
