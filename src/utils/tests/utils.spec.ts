import { jest } from "@jest/globals"; // Import Jest globals

import fs from "fs";
import { getFileImageSpecFromFilename } from "../utils";

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

    it("should match snapshot (ASIAIR filter named with spaces)", () => {
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
  });
});
