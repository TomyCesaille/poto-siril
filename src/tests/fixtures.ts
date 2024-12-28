import path from "path";
import fs from "fs";

const tmpDir = "tmp";

export const spawnMockedDatasetToFs_dataset_1 = () => {
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

  console.log("Creating ./tmp directory");

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
  // Lights set A (60.0s_Bin1_S_gain100).
  "asiair-dump/Autorun/Light/FOV/Light_FOV_60.0s_Bin1_S_gain100_20240624-010850_-10.1C_0001.fit",
  "asiair-dump/Autorun/Light/FOV/Light_FOV_60.0s_Bin1_S_gain100_20240624-010851_-10.1C_0002.fit",
  "asiair-dump/Autorun/Light/FOV/Light_FOV_60.0s_Bin1_S_gain100_20240624-010852_-10.1C_0003.fit",

  // Lights set B (60.0s_Bin1_H_gain0).
  "asiair-dump/Autorun/Light/FOV/Light_FOV_60.0s_Bin1_H_gain0_20240625-010850_-10.1C_0001.fit",
  "asiair-dump/Autorun/Light/FOV/Light_FOV_60.0s_Bin1_H_gain0_20240625-010851_-10.1C_0002.fit",
  "asiair-dump/Autorun/Light/FOV/Light_FOV_60.0s_Bin1_H_gain0_20240625-010852_-10.1C_0003.fit",

  // Lights set C (120.0s_Bin1_S_gain0).
  "asiair-dump/Autorun/Light/FOV/Light_FOV_120.0s_Bin1_S_gain0_20240626-010850_-10.1C_0001.fit",

  // Flats matching set A. Flats matching set C.
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_S_gain100_20240624-094304_-10.5C_0001.fit", // Sequence that aims to match the lights set A (collimation of that day).
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_S_gain100_20240624-094305_-10.0C_0002.fit",
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_S_gain100_20240624-094306_-10.5C_0003.fit",
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_S_gain100_20240626-094304_-10.5C_0001.fit", // Another sequence that aims to match the lights set C (collimation of that day).
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_S_gain100_20240626-094305_-10.0C_0002.fit",
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_S_gain100_20240626-094306_-10.5C_0003.fit",

  // Flats matching set B.
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_H_gain100_20240511-094306_-10.5C_0001.fit", // Gain 100, but can still matching with lights gain 0!
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_H_gain100_20240511-094306_-10.5C_0002.fit",
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_H_gain100_20240511-094306_-10.5C_0003.fit",

  // Flats not matching any sets.
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin2_S_gain100_20240511-094304_-10.5C_0001.fit", // Another bin.
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_O_gain100_20240511-094305_-10.0C_0002.fit", // Another Filter.
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_S_gain100_20240511-094304_-10.5C_0001.fot", // Not a fit file based on extension.

  // Darks matching set A.
  "bank/Darks/Dark_60.0s_Bin1_L_gain100_20240308-155722_-10.0C_0001.fit",
  "bank/Darks/Dark_60.0s_Bin1_L_gain100_20240308-155723_-10.0C_0002.fit",
  "bank/Darks/Dark_60.0s_Bin1_L_gain100_20240308-155724_-10.0C_0003.fit",

  // Darks matching set B.
  "bank/Darks/Dark_60.0s_Bin1_gain0_20240308-155722_-10.0C_0001.fit",

  // Darks matching set C.
  "bank/Darks/Dark_120.0s_Bin1_L_gain0_20240308-155722_-10.0C_0001.fit",

  // Darks not matching any sets.
  "bank/Darks/Dark_300.0s_Bin1_L_gain100_20240308-155722_-10.0C_0001.fit", // Another bulb.
  "bank/Darks/Dark_60.0s_Bin2_L_gain100_20240308-155722_-10.0C_0001.fit", // Another bin.
  "bank/Darks/Dark_60.0s_Bin1_L_gain50_20240308-155722_-10.0C_0001.fit", // Another gain.

  // Biases matching set A. Biases matching set C.
  // Biases matching set B. Matching with Flat of gain 100, despite lights being gain 0.
  "bank/Bias/Bias_1.0ms_Bin1_gain100_20230910-101133_-9.8C_0001.fit",
  "bank/Bias/Bias_1.0ms_Bin1_gain100_20230910-101133_-9.8C_0002.fit",
  "bank/Bias/Bias_1.0ms_Bin1_gain100_20230910-101133_-9.8C_0003.fit",

  // Biases not matching any sets.
  "bank/Bias/Bias_1.0ms_Bin1_gain0_20230910-101133_-9.8C_0001.fit", // Won't match set B, because flat gain is 100.
  "bank/Bias/Bias_1.0ms_Bin2_gain100_20230910-101133_-9.8C_0002.fit", // Another bin.

  // Thumbnails from ASIAIR.
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_H_gain100_20240511-094306_-10.5C_0001_thn.jpg",
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_H_gain100_20240511-094306_-10.5C_0002_thn.jpg",
  "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_H_gain100_20240511-094306_-10.5C_0003_thn.jpg",
];
