import path from "path";
import fs from "fs";
import { logger } from "./logger";
import { readSetsFromDirectory } from "./utils";

export const generateMonoProcessingScripts = async (
  projectDirectory: string
) => {
  const rawScriptPath = path.join(__dirname, "raw-siril-scripts");
  //const mono_preprocessing = `siril -s ${rawScriptPath}/mono_preprocessing.ssf`;
  const mono_proprocessingPath = path.join(
    rawScriptPath,
    "Mono_Preprocessing.ssf"
  );
  const mono_processing = fs.readFileSync(mono_proprocessingPath, {
    encoding: "utf8"
  });

  // Read top level directory in the project directory.
  const filters = fs
    .readdirSync(projectDirectory)
    .filter(file =>
      fs.statSync(path.join(projectDirectory, file)).isDirectory()
    )
    .filter(file => !["process", "any"].includes(file));

  logger.info("dd", {
    mono_proprocessingPath,
    filters,
    mono_processing: mono_processing.slice(0, 100)
  });

  filters.forEach(filter => {
    generateScriptForFilter(projectDirectory, filter, mono_processing);
  });
};

const generateScriptForFilter = (
  projectDirectory: string,
  filter: string,
  mono_processing: string
) => {
  const filterDirectory = path.join(projectDirectory, filter);
  const anyDirectory = path.join(projectDirectory, "any");
  const processDirectory = path.join(filterDirectory, "process");
  if (!fs.existsSync(processDirectory)) {
    fs.mkdirSync(processDirectory, { recursive: false });
  }

  logger.debug("directories", {
    anyDirectory,
    filterDirectory,
    processDirectory
  });

  const sets = readSetsFromDirectory(projectDirectory);

  logger.debug("sets", {
    sets
  });

  const lightsdir = sets.filter(file => file.includes("Light_"))[0];
  const flatsdir = sets.filter(file => file.includes("Flat_"))[0];

  logger.debug("dirs", { lightsdir, flatsdir });

  const darksDir = fs
    .readdirSync(anyDirectory)
    .filter(file => fs.statSync(path.join(anyDirectory, file)).isDirectory())
    .filter(
      file =>
        file.split("_")[0] === "Dark" &&
        file.split("_")[1] === lightsdir.split("_")[1] &&
        file.split("_")[2] === lightsdir.split("_")[2] &&
        file.split("_")[3] === lightsdir.split("_")[3]
    )[0];

  const biasesDir = fs
    .readdirSync(anyDirectory)
    .filter(file => fs.statSync(path.join(anyDirectory, file)).isDirectory())
    .filter(
      file =>
        file.split("_")[0] === "Bias" &&
        file.split("_")[2] === flatsdir.split("_")[2] &&
        file.split("_")[3] === flatsdir.split("_")[3]
    )[0];

  const processingScript = mono_processing
    .replaceAll("{{lights}}", lightsdir)
    .replaceAll("{{flats}}", flatsdir)
    .replaceAll("{{darks}}", darksDir)
    .replaceAll("{{biases}}", biasesDir);

  const processingScriptPath = path.join(
    processDirectory,
    `poto_${filter}_Mono_Preprocessing.ssf`
  );
  fs.writeFileSync(processingScriptPath, processingScript);
  logger.info(`Generated ${processingScriptPath}`, {
    lightsdir,
    flatsdir,
    darksDir,
    biasesDir
  });
};
