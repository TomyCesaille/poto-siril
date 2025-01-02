import path from "path";
import fs from "fs";
import { logger } from "../utils/logger";

const tmpDir = "tmp";

export const spawnMockedDatasetToFs_dataset_1 = () => {
  logger.dev("Creating ./tmp directory with dataset_1.");
  return spawnMockedDatasetToFs(dataset_1);
};

/**
 * Wipe existing testing folder and spawn a new one with the given dataset.
 */
const spawnMockedDatasetToFs = (
  dataset: string[],
): {
  directory: string;
  asiAirDirectory: string;
  bankDirectory: string;
  projectDirectory: string;
} => {
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true });
  }

  dataset.forEach(file => {
    const filePath = path.join(tmpDir, file);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "mocked content");
  });

  const asiAirDirectory = path.join(tmpDir, "asiair-dump");
  const bankDirectory = path.join(tmpDir, "bank");
  const projectDirectory = path.join(tmpDir, "project");

  return {
    directory: tmpDir,
    asiAirDirectory,
    bankDirectory,
    projectDirectory,
  };
};

/**
 * Dataset 1.
 * Contains a mix of lights, flats, darks, biases, and ASIAIR thumbnails.
 * Multi-bin, multi-gain, multi-filter.
 * Specific flats-lights date matching.
 */
const dataset_1 = [
  // Lights sequence A (60.0s_Bin1_S_gain100).
  "asiair-dump/Autorun/Light/FOV/Light_FOV_60.0s_Bin1_S_gain100_20240624-010840_-10.1C_0001.fit",
  "asiair-dump/Autorun/Light/FOV/Light_FOV_60.0s_Bin1_S_gain100_20240624-010841_-10.1C_0002.fit",
  "asiair-dump/Autorun/Light/FOV/Light_FOV_60.0s_Bin1_S_gain100_20240624-010842_-10.1C_0003.fit",

  // Lights sequence B (60.0s_Bin1_H_gain0).
  "asiair-dump/Autorun/Light/FOV/Light_FOV_60.0s_Bin1_H_gain0_20240625-010850_-10.1C_0001.fit",
  "asiair-dump/Autorun/Light/FOV/Light_FOV_60.0s_Bin1_H_gain0_20240625-010851_-10.1C_0002.fit",
  "asiair-dump/Autorun/Light/FOV/Light_FOV_60.0s_Bin1_H_gain0_20240625-010852_-10.1C_0003.fit",

  // Lights sequence C (120.0s_Bin1_S_gain0).
  "asiair-dump/Autorun/Light/FOV/Light_FOV_120.0s_Bin1_S_gain0_20240626-010853_-10.1C_0001.fit",

  // Lights sequence D (60.0s_Bin1_S_gain100). Exact same as sequence A, but different sequence.
  "asiair-dump/Autorun/Light/FOV/Light_FOV_60.0s_Bin1_S_gain100_20240627-010820_-10.1C_0001.fit",

  // Flats sequence matching light sequence A, C & D.
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_S_gain100_20240624-094304_-10.5C_0001.fit", // Sequence that aims to match the lights set A (collimation of that day).
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_S_gain100_20240624-094305_-10.0C_0002.fit",
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_S_gain100_20240624-094306_-10.5C_0003.fit",
  // Flats sequence matching light sequence A, C & D.
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_S_gain100_20240626-094304_-10.5C_0001.fit", // Another sequence that aims to match the lights set C (collimation of that day).
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_S_gain100_20240626-094305_-10.0C_0002.fit",
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_S_gain100_20240626-094306_-10.5C_0003.fit",

  // Flats matching light sequence B.
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_H_gain100_20240511-094306_-10.5C_0001.fit", // Gain 100, but can still matching with lights gain 0!
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_H_gain100_20240511-094307_-10.5C_0002.fit",
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_H_gain100_20240511-094308_-10.5C_0003.fit",

  // Flats not matching anything.
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin2_S_gain100_20240511-094304_-10.5C_0001.fit", // Another bin.
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_O_gain100_20240511-094305_-10.0C_0002.fit", // Another Filter.

  // Darks matching light sequence A. Not same filter but filter is irrelevant for darks.
  "bank/Darks/Dark_60.0s_Bin1_L_gain100_20240308-155722_-10.0C_0001.fit",
  "bank/Darks/Dark_60.0s_Bin1_L_gain100_20240308-155723_-10.0C_0002.fit",
  "bank/Darks/Dark_60.0s_Bin1_L_gain100_20240308-155724_-10.0C_0003.fit",
  "bank/Darks/Dark_60.0s_Bin1_L_gain100_20240308-155725_-10.0C_0004.fit",

  // Darks matching light sequence B.
  "bank/Darks/Dark_60.0s_Bin1_gain0_20240308-155722_-10.0C_0001.fit",

  // Darks matching light sequence C.
  "bank/Darks/Dark_120.0s_Bin1_L_gain0_20240308-155723_-10.0C_0001.fit",

  // Darks not matching anything.
  "bank/Darks/Dark_300.0s_Bin1_L_gain100_20240308-155724_-10.0C_0001.fit", // Another bulb.
  "bank/Darks/Dark_60.0s_Bin2_L_gain100_20240308-155725_-10.0C_0001.fit", // Another bin.
  "bank/Darks/Dark_60.0s_Bin1_L_gain50_20240308-155726_-10.0C_0001.fit", // Another gain.

  // Biases matching light sequence A & C.
  // Biases matching light sequence B (matching with Flat of gain 100, despite lights being gain 0).
  "bank/Bias/Bias_1.0ms_Bin1_gain100_20230910-101131_-9.8C_0001.fit",
  "bank/Bias/Bias_1.0ms_Bin1_gain100_20230910-101132_-9.8C_0002.fit",
  "bank/Bias/Bias_1.0ms_Bin1_gain100_20230910-101133_-9.8C_0003.fit",

  // Biases not matching anything.
  "bank/Bias/Bias_1.0ms_Bin1_gain0_20230910-101141_-9.8C_0001.fit", // Won't match set B, because flat gain is 100.
  "bank/Bias/Bias_1.0ms_Bin2_gain100_20230910-101142_-9.8C_0002.fit", // Another bin.

  // Thumbnail files from ASIAIR.
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_H_gain100_20240511-094306_-10.5C_0001_thn.jpg",
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_H_gain100_20240511-094307_-10.5C_0002_thn.jpg",
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_H_gain100_20240511-094308_-10.5C_0003_thn.jpg",

  // Unknown files to skip.
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_S_gain100_20240511-094306_-10.5C_0001.fot", // Not a fit file based on extension.

  // 1 file from Plan directory to test the choice selection.
  "asiair-dump/Plan/Flat/Flat_1.0ms_Bin1_H_gain100_20240512-124300_-10.5C_0001.fit",

];
