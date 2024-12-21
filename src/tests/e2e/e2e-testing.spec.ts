import path from "path";
import fs from "fs";
import dispatch from "../../commands/dispatch-dump";
import { POTO_JSON } from "../../utils/const";
import { cleanThumbnails } from "../../commands/asiair-dump-cleaning";
import { generateScripts } from "../../commands/generate-scripts";
import { spawnMockedDatasetToFs, dataset_1 } from "../fixtures";

describe("E2E", () => {
  let asiAirDirectory: string = "";
  let bankDirectory: string = "";
  let projectDirectory: string = "";

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 9, 15)));

    ({ asiAirDirectory, bankDirectory, projectDirectory } =
      spawnMockedDatasetToFs(dataset_1));
  });

  test("should be neat", async () => {
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
      bankDirectory,
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
