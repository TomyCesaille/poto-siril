import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import(pathToFileURL(path.resolve(__dirname, "../src/tests/fixtures")).href).then(m => m.spawnMockedDatasetToFs_dataset_1());
