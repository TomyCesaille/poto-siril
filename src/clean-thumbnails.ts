// Clean ASIAIR thumbnails from the directory tree.

// Files ending with _thn.jpg are considered thumbnails.
// Works recursively from the specified directory or current directory if none is specified.

import fs from "fs";
import path from "path";

import { logger } from "./logger";

const cleanThumbnails = (dir: string) => {
  // Default parameter set to current directory
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      cleanThumbnails(filePath);
    } else {
      if (file.endsWith("_thn.jpg")) {
        fs.unlinkSync(filePath);
        logger.debug("Deleted:", filePath);
      }
    }
  });
  logger.info("Thumbnails deleted.");
};

export default cleanThumbnails;
