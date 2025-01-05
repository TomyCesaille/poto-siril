import { jest } from "@jest/globals"; // Import Jest globals
import path from "path";
import fs from "fs";
import Enquirer from "enquirer";

import prepare, {
  SelectedInputSubDirectoryChoices,
} from "../../commands/prepare";
import { POTO_JSON } from "../../utils/const";
import {
  dropThumbnails,
  dropEmptyDirectories,
} from "../../commands/clear";
import { generateScripts } from "../../commands/preprocess.generate-scripts";
import { spawnMockedDatasetToFs_dataset_1 } from "../fixtures";
import { logger } from "../../utils/logger";

describe("E2E", () => {
  let asiAirDirectory: string = "";
  let bankDirectory: string = "";
  let projectDirectory: string = "";
  let logMessages: string[] = [];

  const promptMock = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2024, 9, 15)));

    ({ asiAirDirectory, bankDirectory, projectDirectory } =
      spawnMockedDatasetToFs_dataset_1());

    // Spy on logger and Enquirer to capture logs and prompts.
    logMessages = [];
    const logMethods = [
      "info",
      "warning",
      "debug",
      "error",
      "success",
      "step",
      "space",
    ] as const;
    type LogMethod = (typeof logMethods)[number];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    const originalMethods: Record<LogMethod, Function> = logMethods.reduce(
      (acc, method) => {
        acc[method] = logger[method];
        return acc;
      },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      {} as Record<LogMethod, Function>,
    );

    logMethods.forEach(method => {
      jest
        .spyOn(logger, method)
        .mockImplementation(
          (...args: Parameters<(typeof logger)[LogMethod]>) => {
            const message = `${method}: ${args.join(" ")}`;
            logMessages.push(message);
            originalMethods[method].apply(logger, args);
          },
        );
    });

    jest
      .spyOn(Enquirer.prototype, "prompt")
      .mockImplementation(async function (...args) {
        logMessages.push(`prompt: ${JSON.stringify(args, null, 2)}`);
        return promptMock(...args);
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should be neat", async () => {
    promptMock
      .mockResolvedValueOnce({
        createProjectDirectory: true,
      } as never)
      .mockResolvedValueOnce({
        selectedInputSubDirectory:
          "Use Autorun directory" as SelectedInputSubDirectoryChoices,
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

    dropThumbnails(asiAirDirectory);

    files = fs.readdirSync(asiAirDirectory, {
      recursive: true,
      withFileTypes: false,
      encoding: "utf8",
    });
    expect(files.filter(f => f.endsWith("_thn.jpg"))).toHaveLength(0);

    // Make an empty directory to test `removeEmptyDirectories`.
    fs.mkdirSync(path.join(asiAirDirectory, "empty", "empty"), {
      recursive: true,
    });

    expect(fs.existsSync(path.join(asiAirDirectory, "empty", "empty"))).toBe(
      true,
    );

    dropEmptyDirectories(asiAirDirectory);

    expect(fs.existsSync(path.join(asiAirDirectory, "empty", "empty"))).toBe(
      false,
    );
    expect(fs.existsSync(path.join(asiAirDirectory, "empty"))).toBe(false);

    await prepare({
      projectDirectory,
      inputDirectories: [asiAirDirectory, bankDirectory],
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
  "_poto_siril.json",
  "any",
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
  "any/Dark_60.0s_Bin1_gain100/Dark_60.0s_Bin1_L_gain100_20240308-155725_-10.0C_0004.fit",
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

      expect(scriptContent).toMatchSnapshotWithNormalizedPaths();
    }

    expect(logMessages).toMatchSnapshotWithNormalizedPaths();
  });

  describe("returns all fits in the input directories", () => {
    it("should warn if no files", async () => {
      const autorunDirectory = `${asiAirDirectory}/Autorun`;
      if (fs.existsSync(autorunDirectory)) {
        fs.rmSync(autorunDirectory, { recursive: true });
      }
      const planDirectory = `${asiAirDirectory}/Plan`;
      if (fs.existsSync(planDirectory)) {
        fs.rmSync(planDirectory, { recursive: true });
      }

      promptMock.mockResolvedValueOnce({
        createProjectDirectory: true,
      } as never);

      await expect(
        prepare({
          projectDirectory,
          inputDirectories: [asiAirDirectory, bankDirectory],
        }),
      ).rejects.toThrow(`No FITS files found in ${asiAirDirectory}`);
    });

    it("should warn if no files (ASIAIR version)", async () => {
      const autorunDirectory = `${asiAirDirectory}/Autorun`;
      if (fs.existsSync(autorunDirectory)) {
        fs.rmSync(autorunDirectory, { recursive: true });
      }
      const planDirectory = `${asiAirDirectory}/Plan`;
      if (fs.existsSync(planDirectory)) {
        fs.rmSync(planDirectory, { recursive: true });
      }
      fs.mkdirSync(planDirectory);

      promptMock.mockResolvedValueOnce({
        createProjectDirectory: true,
      } as never);

      await expect(
        prepare({
          projectDirectory,
          inputDirectories: [asiAirDirectory, bankDirectory],
        }),
      ).rejects.toThrow("No FITS files found in Autorun nor Plan folders.");
    });

    it("should auto pick Autorun files", async () => {
      const planDirectory = `${asiAirDirectory}/Plan`;
      if (fs.existsSync(planDirectory)) {
        fs.rmSync(planDirectory, { recursive: true });
      }

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

      await prepare({
        projectDirectory,
        inputDirectories: [asiAirDirectory, bankDirectory],
      });

      const files = fs.readdirSync(projectDirectory, {
        recursive: true,
        withFileTypes: false,
        encoding: "utf8",
      });

      expect(files).toContain(
        "H/Light_60.0s_Bin1_H_gain0/Light_FOV_60.0s_Bin1_H_gain0_20240625-010850_-10.1C_0001.fit",
      );
    });

    it("should auto pick Plan files", async () => {
      const autorunDirectory = `${asiAirDirectory}/Autorun`;
      if (fs.existsSync(autorunDirectory)) {
        fs.rmSync(autorunDirectory, { recursive: true });
      }

      promptMock
        .mockResolvedValueOnce({
          createProjectDirectory: true,
        } as never)
        .mockResolvedValueOnce({
          go: true,
        } as never);

      await prepare({
        projectDirectory,
        inputDirectories: [asiAirDirectory, bankDirectory],
      });

      expect(logMessages).toContain(
        "info: 🔭 Cumulated light integration: 0 minutes.",
      );

      const files = fs.readdirSync(projectDirectory, {
        recursive: true,
        withFileTypes: false,
        encoding: "utf8",
      });

      expect(files.length).toBe(1);
    });

    it("should pick both directories", async () => {
      promptMock
        .mockResolvedValueOnce({
          createProjectDirectory: true,
        } as never)
        .mockResolvedValueOnce({
          selectedInputSubDirectory:
            "Use both directory" as SelectedInputSubDirectoryChoices,
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

      await prepare({
        projectDirectory,
        inputDirectories: [asiAirDirectory, bankDirectory],
      });

      expect(logMessages).toContain(
        "info: Found 20 files in input dir(s) to dispatch.",
      );
    });

    it("should pick plan directorie", async () => {
      promptMock
        .mockResolvedValueOnce({
          createProjectDirectory: true,
        } as never)
        .mockResolvedValueOnce({
          selectedInputSubDirectory:
            "Use Plan directory" as SelectedInputSubDirectoryChoices,
        } as never)
        .mockResolvedValueOnce({
          go: true,
        } as never);

      await prepare({
        projectDirectory,
        inputDirectories: [asiAirDirectory, bankDirectory],
      });

      expect(logMessages).toContain(
        "info: Found 1 files in input dir(s) to dispatch.",
      );
    });
  });
});
