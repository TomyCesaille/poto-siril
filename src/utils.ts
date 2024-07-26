import path from "path";
import fs from "fs";

import { SpecFile } from "./types";

/**
 * Retrieve Light / Flat, Bulb duratin, binning, filter, gain, date, time, temperature, frame number.
 * @param filename
 */
export const extractSpecsFromFilename = (file: fs.Dirent): SpecFile => {
  // Light_LDN 1093_120.0s_Bin1_H_gain100_20240707-002348_-10.0C_0001.fit
  // Flat_810.0ms_Bin1_H_gain0_20240707-102251_-9.9C_0019.fit
  // Dark_300.0s_Bin1_L_gain360_20230910-101917_-9.8C_0001.fit
  // Bias_1.0ms_Bin1_L_gain100_20240308-154938_-9.9C_0003.fit
  // Note: Filter is not always specified in the filename.

  const regex =
    /^(?<type>[A-Za-z]+)(?:_[^_]+)?_(?<bulb>[^_]+)_(?<bin>Bin\d)_((?<filter>[A-Za-z0-9])_)?gain(?<gain>\d+)_(?<datetime>\d{8}-\d{6})_(?<temperature>-?\d+\.\d+C)_(?<sequence>\d{4})\.(?<extension>fit)$/;
  const match = file.name.match(regex);

  if (match && match.groups) {
    return {
      name: file.name,
      path: file.path,
      fullPath: path.join(file.path, file.name),

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
  } else {
    throw new Error(
      `Filename ${file.name} does not match the expected pattern for Specs extraction.`
    );
  }
};

/**
 * Used to match flats/lights with their darks/biases.
 * Return true if same bulb, bin, gain for darks.
 * Return true if same bin and gain for biases.
 * @param a
 * @param b
 */
export const sameSpecFile = (
  a: SpecFile,
  b: SpecFile,
  type: "dark" | "bias"
): boolean => {
  if (type === "dark") {
    return a.bulb === b.bulb && a.bin === b.bin && a.gain === b.gain;
  }

  return a.bin === b.bin && a.gain === b.gain;
};
