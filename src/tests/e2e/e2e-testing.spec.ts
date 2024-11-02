import path from "path";
import fs from "fs";
import dispatch from "../../commands/dispatch-dump";
import { POTO_JSON } from "../../utils/const";
import { cleanThumbnails } from "../../commands/asiair-dump-cleaning";
import { generateScripts } from "../../commands/generate-scripts";

describe("E2E", () => {
  const tmpDir = "tmp";

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 9, 15)));

    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  test("should be neat", async () => {
    const dataset = [
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
      "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_S_gain100_20240511-094304_-10.5C_0001.fot", // Not a fit.

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

      // thumbnails.
      "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_H_gain100_20240511-094306_-10.5C_0001_thn.jpg",
      "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_H_gain100_20240511-094306_-10.5C_0002_thn.jpg",
      "asiair-dump/Autorun/Flat/Flat_1.0ms_Bin1_H_gain100_20240511-094306_-10.5C_0003_thn.jpg",
    ];

    dataset.forEach(file => {
      const filePath = path.join(tmpDir, file);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, "mocked content");
    });

    const asiAirDirectory = path.join(tmpDir, "asiair-dump");
    const projectDirectory = path.join(tmpDir, "project");

    let files = fs.readdirSync(asiAirDirectory, {
      recursive: true,
      withFileTypes: false,
      encoding: "utf8",
    });
    expect(files.filter(f => f.endsWith("_thn.jpg"))).toHaveLength(3);

    cleanThumbnails(asiAirDirectory);

    files = fs.readdirSync(asiAirDirectory, {
      recursive: true,
      withFileTypes: false,
      encoding: "utf8",
    });
    expect(files.filter(f => f.endsWith("_thn.jpg"))).toHaveLength(0);

    fs.mkdirSync(projectDirectory, { recursive: true });
    await dispatch({
      projectDirectory,
      asiAirDirectory,
      shootingMode: "autorun",
      bankDirectory: path.join(tmpDir, "bank"),
    });

    files = fs.readdirSync(projectDirectory, {
      recursive: true,
      withFileTypes: false,
      encoding: "utf8",
    });

    expect(files).toMatchInlineSnapshot(`
[
  "H",
  "S",
  "any",
  "poto.json",
  "H/Flat_1.0ms_Bin1_H_gain100",
  "H/Light_60.0s_Bin1_H_gain0",
  "S/Flat_1.0ms_Bin1_S_gain100",
  "S/Light_120.0s_Bin1_S_gain0",
  "S/Light_60.0s_Bin1_S_gain100",
  "any/Bias_1.0ms_Bin1_gain100",
  "any/Dark_120.0s_Bin1_gain0",
  "any/Dark_60.0s_Bin1_gain0",
  "any/Dark_60.0s_Bin1_gain100",
  "H/Flat_1.0ms_Bin1_H_gain100/Flat_1.0ms_Bin1_H_gain100_20240511-094306_-10.5C_0001.fit",
  "H/Flat_1.0ms_Bin1_H_gain100/Flat_1.0ms_Bin1_H_gain100_20240511-094306_-10.5C_0002.fit",
  "H/Flat_1.0ms_Bin1_H_gain100/Flat_1.0ms_Bin1_H_gain100_20240511-094306_-10.5C_0003.fit",
  "H/Light_60.0s_Bin1_H_gain0/Light_FOV_60.0s_Bin1_H_gain0_20240625-010850_-10.1C_0001.fit",
  "H/Light_60.0s_Bin1_H_gain0/Light_FOV_60.0s_Bin1_H_gain0_20240625-010851_-10.1C_0002.fit",
  "H/Light_60.0s_Bin1_H_gain0/Light_FOV_60.0s_Bin1_H_gain0_20240625-010852_-10.1C_0003.fit",
  "S/Flat_1.0ms_Bin1_S_gain100/Flat_1.0ms_Bin1_S_gain100_20240624-094304_-10.5C_0001.fit",
  "S/Flat_1.0ms_Bin1_S_gain100/Flat_1.0ms_Bin1_S_gain100_20240624-094305_-10.0C_0002.fit",
  "S/Flat_1.0ms_Bin1_S_gain100/Flat_1.0ms_Bin1_S_gain100_20240624-094306_-10.5C_0003.fit",
  "S/Flat_1.0ms_Bin1_S_gain100/Flat_1.0ms_Bin1_S_gain100_20240626-094304_-10.5C_0001.fit",
  "S/Flat_1.0ms_Bin1_S_gain100/Flat_1.0ms_Bin1_S_gain100_20240626-094305_-10.0C_0002.fit",
  "S/Flat_1.0ms_Bin1_S_gain100/Flat_1.0ms_Bin1_S_gain100_20240626-094306_-10.5C_0003.fit",
  "S/Light_120.0s_Bin1_S_gain0/Light_FOV_120.0s_Bin1_S_gain0_20240626-010850_-10.1C_0001.fit",
  "S/Light_60.0s_Bin1_S_gain100/Light_FOV_60.0s_Bin1_S_gain100_20240624-010850_-10.1C_0001.fit",
  "S/Light_60.0s_Bin1_S_gain100/Light_FOV_60.0s_Bin1_S_gain100_20240624-010851_-10.1C_0002.fit",
  "S/Light_60.0s_Bin1_S_gain100/Light_FOV_60.0s_Bin1_S_gain100_20240624-010852_-10.1C_0003.fit",
  "any/Bias_1.0ms_Bin1_gain100/Bias_1.0ms_Bin1_gain100_20230910-101133_-9.8C_0001.fit",
  "any/Bias_1.0ms_Bin1_gain100/Bias_1.0ms_Bin1_gain100_20230910-101133_-9.8C_0002.fit",
  "any/Bias_1.0ms_Bin1_gain100/Bias_1.0ms_Bin1_gain100_20230910-101133_-9.8C_0003.fit",
  "any/Dark_120.0s_Bin1_gain0/Dark_120.0s_Bin1_L_gain0_20240308-155722_-10.0C_0001.fit",
  "any/Dark_60.0s_Bin1_gain0/Dark_60.0s_Bin1_gain0_20240308-155722_-10.0C_0001.fit",
  "any/Dark_60.0s_Bin1_gain100/Dark_60.0s_Bin1_L_gain100_20240308-155722_-10.0C_0001.fit",
  "any/Dark_60.0s_Bin1_gain100/Dark_60.0s_Bin1_L_gain100_20240308-155723_-10.0C_0002.fit",
  "any/Dark_60.0s_Bin1_gain100/Dark_60.0s_Bin1_L_gain100_20240308-155724_-10.0C_0003.fit",
]
`);

    const potoJson = fs.readFileSync(path.join(projectDirectory, POTO_JSON), {
      encoding: "utf8",
    });

    expect(potoJson).toMatchSnapshot();

    await generateScripts(
      projectDirectory,
      "src/process/mono_processing_process/1_preprocessing.ssf",
    );

    files = fs.readdirSync(projectDirectory, {
      recursive: true,
      withFileTypes: false,
      encoding: "utf8",
    });

    const scripts = files.filter(f => f.endsWith(".ssf"));
    expect(scripts).toHaveLength(3);
    expect(scripts).toMatchInlineSnapshot(`
[
  "H/Light_60.0s_Bin1_H_gain0_process/poto_1_preprocessing.ssf",
  "S/Light_120.0s_Bin1_S_gain0_process/poto_1_preprocessing.ssf",
  "S/Light_60.0s_Bin1_S_gain100_process/poto_1_preprocessing.ssf",
]
`);

    const script1 = fs.readFileSync(path.join(projectDirectory, scripts[0]), {
      encoding: "utf8",
    });
    expect(script1).toMatchSnapshot();

    const script2 = fs.readFileSync(path.join(projectDirectory, scripts[1]), {
      encoding: "utf8",
    });
    expect(script2).toMatchSnapshot();

    const script3 = fs.readFileSync(path.join(projectDirectory, scripts[2]), {
      encoding: "utf8",
    });
    expect(script3).toMatchSnapshot();
  });
});
