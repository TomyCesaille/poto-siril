import { jest } from "@jest/globals"; // Import Jest globals

import fs from "fs";
import {
  getFileImageSpecFromFilename,
  getFitsFromDirectory,
  copyFileToProject,
  matchSetFile,
  getImageSpecFromSetName,
} from "../utils";
import { FileImageSpec, ImageSpec } from "../types";

describe("utils", () => {
  describe("getFileImageSpecFromFilename", () => {
    it("should match snapshot (ASIAIR plan target format)", () => {
      const file = new fs.Dirent();
      file.name =
        "Light_LDN 1093_120.0s_Bin1_H_gain100_20240707-002348_-10.0C_0001.fit";
      file.path = "input/bar";
      const projectDirectory = "project/bar";
      const previousFile = null;

      expect(
        getFileImageSpecFromFilename(file, projectDirectory, previousFile),
      ).toMatchSnapshot();
    });

    it("should match snapshot (filter named with spaces)", () => {
      const file = new fs.Dirent();
      file.name =
        "Light_LDN 1093_120.0s_Bin1_filter h_gain100_20240707-002348_-10.0C_0001.fit";
      file.path = "input/bar";
      const projectDirectory = "project/bar";
      const previousFile = null;

      const specs = getFileImageSpecFromFilename(
        file,
        projectDirectory,
        previousFile,
      );
      expect(specs).toMatchSnapshot();
      expect(specs.filter).toBe("filterh");
    });

    it("should match snapshot (no filter)", () => {
      const file = new fs.Dirent();
      file.name =
        "Light_LDN 1093_120.0s_Bin1_gain100_20240707-002348_-10.0C_0001.fit";
      file.path = "input/bar";
      const projectDirectory = "project/bar";
      const previousFile = null;

      const specs = getFileImageSpecFromFilename(
        file,
        projectDirectory,
        previousFile,
      );
      expect(specs).toMatchSnapshot();
      expect(specs.filter).toBeNull();
    });
  });

  it.each([
    { bulb: "120.0s", expected: 120000 },
    { bulb: "810.0ms", expected: 810 },
  ])("should parse bulb in ms (%s)", data => {
    const file = new fs.Dirent();
    file.name = `Light_LDN 1093_${data.bulb}_Bin1_gain100_20240707-002348_-10.0C_0001.fit`;
    file.path = "input/bar";
    const projectDirectory = "project/bar";
    const previousFile = null;

    const specs = getFileImageSpecFromFilename(
      file,
      projectDirectory,
      previousFile,
    );
    expect(specs.bulbMs).toBe(data.expected);
  });

  describe("getFitsFromDirectory", () => {
    it("should retrieve FITS files from a directory", () => {
      jest.spyOn(fs, "readdirSync").mockReturnValue([
        Object.assign(new fs.Dirent(), {
          name: "Light_LDN 1093_120.0s_Bin1_H_gain100_20240707-002348_-10.0C_0001.fit",
          isFile: () => true,
          path: "input/dir",
        }),
        Object.assign(new fs.Dirent(), {
          name: "Light_LDN 1093_120.0s_Bin1_H_gain100_20240707-002349_-10.0C_0002.fit",
          isFile: () => true,
          path: "input/dir",
        }),
        Object.assign(new fs.Dirent(), {
          name: "Light_LDN 1093_120.0s_Bin1_H_gain100_20240707-002348_-10.0C_0001_thn.jpg",
          isFile: () => true,
          path: "input/dir",
        }),
      ]);

      const result = getFitsFromDirectory({
        directory: "input/dir",
        projectDirectory: "project/dir",
      });

      expect(result).toHaveLength(2);
      expect(result[0].fileName).toBe(
        "Light_LDN 1093_120.0s_Bin1_H_gain100_20240707-002348_-10.0C_0001.fit",
      );
      expect(result[1].fileName).toBe(
        "Light_LDN 1093_120.0s_Bin1_H_gain100_20240707-002349_-10.0C_0002.fit",
      );
    });
  });

  describe("copyFileToProject", () => {
    it("should copy a file to the project directory", () => {
      const file = {
        projectDirectory: "project/dir",
        fileName: "file1.fit",
        sourceFilePath: "input/dir/file1.fit",
      } as FileImageSpec;

      jest.spyOn(fs, "existsSync").mockReturnValue(false);
      jest.spyOn(fs, "mkdirSync").mockImplementation(_ => "");
      jest.spyOn(fs, "copyFileSync").mockImplementation(() => {});

      copyFileToProject(file);

      expect(fs.existsSync).toHaveBeenCalledWith("project/dir");
      expect(fs.mkdirSync).toHaveBeenCalledWith("project/dir", {
        recursive: true,
      });
      expect(fs.copyFileSync).toHaveBeenCalledWith(
        "input/dir/file1.fit",
        "project/dir/file1.fit",
      );
    });
  });

  describe("matchSetFile", () => {
    it("should match Light with Dark", () => {
      const A = {
        type: "Light",
        bulb: "120.0s",
        bin: "Bin1",
        gain: 100,
      } as ImageSpec;
      const B = {
        type: "Dark",
        bulb: "120.0s",
        bin: "Bin1",
        gain: 100,
      } as ImageSpec;
      expect(matchSetFile(A, B)).toBe(true);
    });

    it("should match Light with Flat", () => {
      const A = { type: "Light", bin: "Bin1", filter: "H" } as ImageSpec;
      const B = { type: "Flat", bin: "Bin1", filter: "H" } as ImageSpec;
      expect(matchSetFile(A, B)).toBe(true);
    });

    it("should match Flat with Bias", () => {
      const A = { type: "Flat", bin: "Bin1", gain: 100 } as ImageSpec;
      const B = {
        type: "Bias",
        bin: "Bin1",
        gain: 100,
      } as ImageSpec;
      expect(matchSetFile(A, B)).toBe(true);
    });

    it("should not match Light with Bias", () => {
      const A = { type: "Light" } as ImageSpec;
      const B = { type: "Bias" } as ImageSpec;
      expect(matchSetFile(A, B)).toBe(false);
    });
  });

  describe("getImageSpecFromSetName", () => {
    it("should return the correct ImageSpec with filter", () => {
      const setName = "Flat_520.0ms_Bin1_H_gain0";
      const result = getImageSpecFromSetName(setName);
      expect(result).toEqual({
        setName,
        type: "Flat",
        bulb: "520.0ms",
        bin: "Bin1",
        filter: "H",
        gain: 0,
      });
    });

    it("should return the correct ImageSpec without filter", () => {
      const setName = "Flat_520.0ms_Bin1_gain0";
      const result = getImageSpecFromSetName(setName);
      expect(result).toEqual({
        setName,
        type: "Flat",
        bulb: "520.0ms",
        bin: "Bin1",
        filter: null,
        gain: 0,
      });
    });
  });
});
