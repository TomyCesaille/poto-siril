// Clean ASIAIR thumbnails from the directory tree.

// Files ending with _thn.jpg are considered thumbnails.
// Works recursively from the specified directory or current directory if none is specified.

const fs = require("fs");
const path = require("path");

const cleanThumbnails = dir => {
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
        console.log("Deleted:", filePath);
      }
    }
  });
};

// Process a specific directory passed as a command-line argument, or the current directory if none is provided.
const rootDirectory = process.argv[2] || ".";
cleanThumbnails(rootDirectory);
