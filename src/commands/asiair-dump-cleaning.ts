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

export const removeEmptyDirectories = (
  dir: string,
  isRecursive: boolean = false,
) => {
  const files = fs.readdirSync(dir);
  if (files.length === 0) {
    fs.rmdirSync(dir);
    logger.info("Deleted:", dir);
    return;
  }
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      removeEmptyDirectories(filePath, true);
    }
  });
  if (!isRecursive) logger.info("Asiair dump cleaning - Empty dirs deleted ✅");
};
