// Clean ASIAIR thumbnails from the directory tree.

// Files ending with _thn.jpg are considered thumbnails.
// Works recursively from the specified directory or current directory if none is specified.

import fs from "fs";
import path from "path";

import { logger } from "../utils/logger";

export const cleanThumbnails = (dir: string, isRecursive: boolean = false) => {
  // Default parameter set to current directory
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      cleanThumbnails(filePath, true);
    } else {
      if (file.endsWith("_thn.jpg")) {
        fs.unlinkSync(filePath);
        logger.debug("Deleted:", filePath);
      }
    }
  });
  if (!isRecursive) logger.info("Asiair dump cleaning - Thumbnails deleted ✅");
};

export const removeEmptyDirectories = (dir: string) => {
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
