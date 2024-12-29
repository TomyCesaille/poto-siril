import { jest } from "@jest/globals"; // Import Jest globals
import path from "path";
import fs from "fs";
import Enquirer from "enquirer";

import dispatch from "../../commands/dispatch-dump";
import { POTO_JSON } from "../../utils/const";
import { cleanThumbnails } from "../../commands/asiair-dump-cleaning";
import { generateScripts } from "../../commands/generate-scripts";
import { spawnMockedDatasetToFs_dataset_1 } from "../fixtures";

jest.mock("enquirer");

describe("E2E", () => {
  let asiAirDirectory: string = "";
  let bankDirectory: string = "";
  let projectDirectory: string = "";

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 9, 15)));

    ({ asiAirDirectory, bankDirectory, projectDirectory } =
      spawnMockedDatasetToFs_dataset_1());
  });

  test("should be neat", async () => {
    const promptMock = jest.fn();
    (Enquirer.prototype.prompt as jest.Mock) = promptMock;

    promptMock
      .mockResolvedValueOnce({
        createProjectDirectory: true,
      } as never)
      .mockResolvedValueOnce({
        selectedFlatSequence: "Flat_1.0ms_Bin1_S_gain100__20240624-094304",
      } as never)
      .mockResolvedValueOnce({
        selectedFlatSequence: "Flat_1.0ms_Bin1_S_gain100__20240626-094304",
      } as never)
      .mockResolvedValueOnce({
        selectedFlatSequence: "Flat_1.0ms_Bin1_S_gain100__20240626-094304",
      } as never)
      .mockResolvedValueOnce({
        go: true,
      } as never);

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
  "H/Flat_1.0ms_Bin1_H_gain100/Flat_1.0ms_Bin1_H_gain100_20240511-094307_-10.5C_0002.fit",
  "H/Flat_1.0ms_Bin1_H_gain100/Flat_1.0ms_Bin1_H_gain100_20240511-094308_-10.5C_0003.fit",
  "H/Light_60.0s_Bin1_H_gain0/Light_FOV_60.0s_Bin1_H_gain0_20240625-010850_-10.1C_0001.fit",
  "H/Light_60.0s_Bin1_H_gain0/Light_FOV_60.0s_Bin1_H_gain0_20240625-010851_-10.1C_0002.fit",
  "H/Light_60.0s_Bin1_H_gain0/Light_FOV_60.0s_Bin1_H_gain0_20240625-010852_-10.1C_0003.fit",
  "S/Flat_1.0ms_Bin1_S_gain100/Flat_1.0ms_Bin1_S_gain100_20240624-094304_-10.5C_0001.fit",
  "S/Flat_1.0ms_Bin1_S_gain100/Flat_1.0ms_Bin1_S_gain100_20240624-094305_-10.0C_0002.fit",
  "S/Flat_1.0ms_Bin1_S_gain100/Flat_1.0ms_Bin1_S_gain100_20240624-094306_-10.5C_0003.fit",
  "S/Flat_1.0ms_Bin1_S_gain100/Flat_1.0ms_Bin1_S_gain100_20240626-094304_-10.5C_0001.fit",
  "S/Flat_1.0ms_Bin1_S_gain100/Flat_1.0ms_Bin1_S_gain100_20240626-094305_-10.0C_0002.fit",
  "S/Flat_1.0ms_Bin1_S_gain100/Flat_1.0ms_Bin1_S_gain100_20240626-094306_-10.5C_0003.fit",
  "S/Light_120.0s_Bin1_S_gain0/Light_FOV_120.0s_Bin1_S_gain0_20240626-010853_-10.1C_0001.fit",
  "S/Light_60.0s_Bin1_S_gain100/Light_FOV_60.0s_Bin1_S_gain100_20240624-010840_-10.1C_0001.fit",
  "S/Light_60.0s_Bin1_S_gain100/Light_FOV_60.0s_Bin1_S_gain100_20240624-010841_-10.1C_0002.fit",
  "S/Light_60.0s_Bin1_S_gain100/Light_FOV_60.0s_Bin1_S_gain100_20240624-010842_-10.1C_0003.fit",
  "S/Light_60.0s_Bin1_S_gain100/Light_FOV_60.0s_Bin1_S_gain100_20240627-010820_-10.1C_0001.fit",
  "any/Bias_1.0ms_Bin1_gain100/Bias_1.0ms_Bin1_gain100_20230910-101131_-9.8C_0001.fit",
  "any/Bias_1.0ms_Bin1_gain100/Bias_1.0ms_Bin1_gain100_20230910-101132_-9.8C_0002.fit",
  "any/Bias_1.0ms_Bin1_gain100/Bias_1.0ms_Bin1_gain100_20230910-101133_-9.8C_0003.fit",
  "any/Dark_120.0s_Bin1_gain0/Dark_120.0s_Bin1_L_gain0_20240308-155723_-10.0C_0001.fit",
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
    expect(scripts).toHaveLength(4);
    expect(scripts).toMatchInlineSnapshot(`
[
  "H/Light_60.0s_Bin1_H_gain0_process/poto_1_preprocessing.ssf",
  "S/Light_120.0s_Bin1_S_gain0__20240626-010853_process/poto_1_preprocessing.ssf",
  "S/Light_60.0s_Bin1_S_gain100__20240624-010840_process/poto_1_preprocessing.ssf",
  "S/Light_60.0s_Bin1_S_gain100__20240627-010820_process/poto_1_preprocessing.ssf",
]
`);

    for (const script of scripts) {
      const scriptContent = fs.readFileSync(
        path.join(projectDirectory, script),
        {
          encoding: "utf8",
        },
      );
      expect(scriptContent).toMatchSnapshot();
    }
  });
});
