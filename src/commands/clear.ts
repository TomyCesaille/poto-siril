// Clean ASIAIR thumbnails from the directory tree.

// Files ending with _thn.jpg are considered thumbnails.
// Works recursively from the specified directory or current directory if none is specified.

import fs from "fs-extra";
import path from "path";

import { logger } from "../utils/logger";
import { isAsiAirDirectoryF } from "../utils/utils";

const clear = (dir: string) => {
  if (!isAsiAirDirectoryF(dir).isAsiAirDirectory) {
    logger.errorThrow("Not an ASIAIR directory!");
  }

  dropThumbnails(dir);
  dropEmptyDirectories(dir);
};

export default clear;

const dropThumbnails = (dir: string, isRecursiveCall: boolean = false) => {
  // Default parameter set to current directory
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      dropThumbnails(filePath, true);
    } else {
      if (file.endsWith("_thn.jpg")) {
        fs.unlinkSync(filePath);
        logger.debug("Deleted:", filePath);
      }
    }
  });
  if (!isRecursiveCall)
    logger.info("Asiair dump cleaning - Thumbnails deleted ✅");
};

const dropEmptyDirectories = (dir: string) => {
  const isDirEmpty = (directory: string): boolean => {
    const files = fs.readdirSync(directory);
    if (files.length === 0) {
      return true;
    }
    return files.every(file => {
      const filePath = path.join(directory, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        return isDirEmpty(filePath);
      }
      return false;
    });
  };

  const deleteEmptyDirs = (directory: string) => {
    const files = fs.readdirSync(directory);
    files.forEach(file => {
      const filePath = path.join(directory, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        deleteEmptyDirs(filePath);
      }
    });

    if (isDirEmpty(directory)) {
      fs.rmdirSync(directory);
      logger.info("Deleted:", directory);
    }
  };

  deleteEmptyDirs(dir);
  logger.info("Asiair dump cleaning - Empty dirs deleted ✅");
};
