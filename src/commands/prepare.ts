import fs from "fs";
import Enquirer from "enquirer";

import { formatMessage, logger } from "../utils/logger";
import {
  copyFileToProject,
  getFitsFromDirectory,
  matchSetFile,
  getImageSpecFromSetName,
} from "../utils/utils";
import {
  FileImageSpec,
  LayerSet,
  LightsFlatsMatch,
  PotoProject,
} from "../utils/types";
import { POTO_JSON, POTO_VERSION } from "../utils/const";

export type PrepareProps = {
  inputDirectories: string[];
  projectDirectory: string;
};

const enquirer = new Enquirer();

const prepare = async ({
  inputDirectories,
  projectDirectory,
}: PrepareProps) => {
  // TODO. logger.command("prepare"); to introduce the command in the logs.

  await ensureProjectDirectoryExists(projectDirectory);

  logger.step("Reading input directories");

  const inputFiles: FileImageSpec[] = [];
  for (const inputDirectory of inputDirectories) {
    logger.debug(`Reading input directory ${inputDirectory}`);
    const files = await getAllFitsInInputDirectory(
      inputDirectory,
      projectDirectory,
    );
    inputFiles.push(...files);
  }

  const allLights = inputFiles.filter(file => file.type === "Light");
  const allLightsFlats = inputFiles.filter(
    file => file.type === "Light" || file.type === "Flat",
  );
  const allDarksBiases = inputFiles.filter(
    file => file.type === "Dark" || file.type === "Bias",
  );

  logger.info(`Found ${inputFiles.length} .fit files in input directories 🌋.`);
  logger.info(`Including ${allLights.length} lights 🌟.`);

  logger.step("Matching lights and flats (early stage)");

  const allFlatsMatchingLights = getFlatsMatchingLightsNaive(
    allLightsFlats,
    allLights,
  );

  logger.step("Matching lights and flats (final stage)");

  const lightsFlatsMatches = await matchLightsToFlats(
    allFlatsMatchingLights,
    allLights,
  );

  let layerSets: LayerSet[] = initLayerSetsWithLightsnFlats(
    lightsFlatsMatches,
    allLights,
    allFlatsMatchingLights,
  );

  logger.step("Tagging darks and biases");

  logger.info(
    `Found ${allDarksBiases.length} darks+baises files (without temperature filtering).`,
  );

  layerSets = await AssignDarksBiasesToLayerSets(layerSets, allDarksBiases);

  logger.step("Preview before dispatching");

  const { go, metrics } = await previewBeforeDispatching(layerSets);

  if (!go) {
    logger.warning("Aborted.");
    return;
  }
  logger.step("Dispatching");

  const potoProject: PotoProject = {
    generatedAt: new Date(),
    potoVersion: POTO_VERSION,
    metrics,
    layerSets,
  };

  await dispatchProject(potoProject, projectDirectory);

  logger.success("Dispatch complete.");

  // TODO. custom sort if LRGBSHO filter names to ease reading.
};

export default prepare;

/**
 * Ensure that the project directory exists.
 * If it does not exist, ask the user if they want to create it.
 *
 * @param projectDirectory - The directory of the current project.
 */
const ensureProjectDirectoryExists = async (projectDirectory: string) => {
  if (!fs.existsSync(projectDirectory)) {
    const { createProjectDirectory } = (await enquirer.prompt({
      type: "confirm",
      name: "createProjectDirectory",
      message: `Directory ${projectDirectory} does not exist. Do you want to create it?`,
      initial: true,
    })) as { createProjectDirectory: boolean };

    if (createProjectDirectory) {
      fs.mkdirSync(projectDirectory, { recursive: true });
    }
  }
};

export type SelectedInputSubDirectoryChoices =
  | "Use Autorun directory"
  | "Use Plan directory"
  | "Use both directory";
export const selectedInputSubDirectoryChoices: SelectedInputSubDirectoryChoices[] =
  ["Use Autorun directory", "Use Plan directory", "Use both directory"];

/**
 * Retrieve all FITS files from the input directory.
 *
 * @param inputDirectory - The directory to scan.
 * @param projectDirectory - The directory of the current project.
 * @returns An array of FileImageSpec objects representing the FITS files.
 */
const getAllFitsInInputDirectory = async (
  inputDirectory: string,
  projectDirectory: string,
): Promise<FileImageSpec[]> => {
  // if ASIAIR used, may stores the lights+flats files in either the Autorun or Plan directories.

  const autorunDirectory = `${inputDirectory}/Autorun`;
  const planDirectory = `${inputDirectory}/Plan`;

  const isAsiAirDump =
    fs.existsSync(autorunDirectory) || fs.existsSync(planDirectory);

  const logFiles = (files: unknown[]) => {
    logger.info(`Found ${files.length} FITS in input dir ${inputDirectory}.`);
  };

  if (!isAsiAirDump) {
    const allFiles = getFitsFromDirectory({
      directory: inputDirectory,
      projectDirectory,
    });
    if (allFiles.length === 0) {
      logger.errorThrow(`No FITS files found in input dir ${inputDirectory}.`);
    }

    logFiles(allFiles);
    return allFiles;
  }

  logger.debug(`ASIAIR dump detected in input dir ${inputDirectory}.`);

  const autorunFiles = fs.existsSync(autorunDirectory)
    ? getFitsFromDirectory({
        directory: autorunDirectory,
        projectDirectory,
      })
    : [];

  const planFiles = fs.existsSync(planDirectory)
    ? getFitsFromDirectory({
        directory: planDirectory,
        projectDirectory,
      })
    : [];

  if (autorunFiles.length === 0 && planFiles.length === 0) {
    logger.errorThrow("No FITS files found in Autorun nor Plan folders.");
  }

  if (autorunFiles.length > 0 && planFiles.length === 0) {
    logFiles(autorunFiles);
    return autorunFiles;
  }

  if (autorunFiles.length === 0 && planFiles.length > 0) {
    logFiles(planFiles);
    return planFiles;
  }

  if (autorunFiles.length > 0 && planFiles.length > 0) {
    const { selectedInputSubDirectory } = (await enquirer.prompt({
      type: "select",
      name: "selectedInputSubDirectory",
      message:
        "Files found in both Autorun and Plan directories. How do we proceed?",
      choices: selectedInputSubDirectoryChoices,
    })) as { selectedInputSubDirectory: SelectedInputSubDirectoryChoices };

    switch (selectedInputSubDirectory) {
      case "Use Autorun directory":
        logFiles(autorunFiles);
        return autorunFiles;
      case "Use Plan directory":
        logFiles(planFiles);
        return planFiles;
      case "Use both directory":
        logFiles([...autorunFiles, ...planFiles]);
        return [...autorunFiles, ...planFiles];
    }
  }
};

/**
 * Naive matching of flats with lights.
 * Sufficient enough to skip the flats that do not have a matching light at all.
 *
 * @param inputFiles - The input files to process. Searching for the flats in this list.
 * @param lights - The lights to match with the flats.
 */
const getFlatsMatchingLightsNaive = (
  inputFiles: FileImageSpec[],
  lights: FileImageSpec[],
): FileImageSpec[] => {
  const notMatchedFlats: string[] = [];
  const matchingFlats = inputFiles
    .filter(x => x.type === "Flat")
    .filter(flat => {
      if (lights.find(light => matchSetFile(light, flat))) {
        return flat;
      } else {
        notMatchedFlats.push(
          `No matching light for ${flat.setName} (seq ${flat.sequenceId}). Skipping.`,
        );
      }
    });

  const sequences = [...new Set(matchingFlats.map(file => file.sequenceId))];
  for (const skip of [...new Set(notMatchedFlats)]) {
    logger.warning(skip);
  }

  const sequencesLightsCount = [
    ...new Set(matchingFlats.map(file => file.sequenceId)),
  ].length;

  logger.info(
    `Pre-selected ${matchingFlats.length} flats (${sequences.length} sequences) that matches with ${lights.length} lights (${sequencesLightsCount} sequences).`,
  );

  return matchingFlats;
};

/**
 * Process the light and flat matching.
 * If multiple sequences are found for a flat, ask the user to select the flat sequence to use for each light sequence.
 * NOTE. We expect that all flats have a matching light at this point, thanks to the `getFlatsMatchingLightsNaive` function.
 *
 * @param matchingFlats - The flats that have a matching light.
 * @param lights - The lights to match with the flats.
 */
const matchLightsToFlats = async (
  matchingFlats: FileImageSpec[],
  lights: FileImageSpec[],
): Promise<LightsFlatsMatch[]> => {
  const flatSets = [...new Set(matchingFlats.map(file => file.setName))];

  const LightFlatMatches: LightsFlatsMatch[] = [];

  let introManualMatchingDisplayed = false;

  // TODO. Review the archi overall. We should walk light by light instead of flat by flat. This will be easier to discover and setup the project.
  for (const flatSet of flatSets) {
    const flatSetSpecs = getImageSpecFromSetName(flatSet);

    // Search for sequences that are similar.
    const flatSetNameSequenceIds = [
      ...new Set(
        matchingFlats
          .filter(
            flat =>
              // https://pixinsight.com/forum/index.php?threads/can-flats-be-different-iso-than-lights.23686/
              flat.bin === flatSetSpecs.bin &&
              flat.filter === flatSetSpecs.filter,
          )
          .map(flat => `${flat.setName}__${flat.sequenceId}`),
      ),
    ];
    if (flatSetNameSequenceIds.length === 0) {
      throw new Error(`❓❓❓❗️ No sequences found for flat ${flatSet}.`);
    }

    if (flatSetNameSequenceIds.length === 1) {
      // Auto match the flat to the light. Nothing to ask from the user.
      const flatSetNameSequenceId = flatSetNameSequenceIds[0];
      const matchingLights = lights.filter(light =>
        matchSetFile(light, flatSetSpecs),
      );
      const matchingLightSetNameSequenceIds = [
        ...new Set(
          matchingLights.map(light => `${light.setName}__${light.sequenceId}`),
        ),
      ];

      for (const lightSetSequence of matchingLightSetNameSequenceIds) {
        LightFlatMatches.push({
          lightSetName: lightSetSequence.split("__")[0],
          lightSequenceId: lightSetSequence.split("__")[1],

          flatSetName: flatSetNameSequenceId.split("__")[0],
          flatSequenceId: flatSetNameSequenceId.split("__")[1],

          isManualMatch: false,
        });
      }
      continue;
    }

    if (introManualMatchingDisplayed) {
      logger.space();
    }

    logger.info(
      `🤚 Several sequences of flats are compatible with ${
        flatSetSpecs.filter
          ? `${flatSetSpecs.bin} Filter ${flatSetSpecs.filter}`
          : flatSetSpecs.bin
      }:`,
    );
    if (!introManualMatchingDisplayed) {
      logger.info(`${flatSetNameSequenceIds.map(x => `- ${x}`).join("\n")}`);

      logger.debug(
        "We assume that multiple sequences of the same flat kind indicate multiple night sessions where the flats had to be re-shot in between (e.g., a significant date gap between shooting sessions and the lights were not collected with the same collimation and/or same dust in the optical train).",
      );
      logger.debug(
        "We will ask you to tag each concerned light sequence to the right flat sequence (this disclaimer won't be displayed again 🤓).",
      );
      introManualMatchingDisplayed = true;
    }

    const lightsConcerned = [
      ...new Set(
        lights
          .filter(light =>
            matchSetFile(light, getImageSpecFromSetName(flatSet)),
          )
          .map(light => ({
            setName: light.setName,
            sequenceId: light.sequenceId,
          }))
          .sort((a, b) => {
            return a.sequenceId.localeCompare(b.sequenceId);
          })
          .map(light => `${light.setName}__${light.sequenceId}`),
      ),
    ];

    for (const lightConcerned of lightsConcerned) {
      if (
        LightFlatMatches.map(
          x => `${x.lightSetName}__${x.lightSequenceId}`,
        ).includes(lightConcerned)
      ) {
        // Skip if the light sequence has already been matched to a flat sequence.
        continue;
      }

      logger.space();

      const lightConcernedSetName = lightConcerned.split("__")[0];
      const lightConcernedSequenceId = lightConcerned.split("__")[1];

      const { selectedFlatSequence } = (await enquirer.prompt({
        type: "select",
        name: "selectedFlatSequence",
        message: formatMessage(
          `${lightConcernedSetName} ${lightConcernedSequenceId} will use`,
        ),
        choices: flatSetNameSequenceIds.map(x => ({
          name: x,
          message: formatMessage(x.replace("__", " ")), // TODO. Print sequence length.
        })),
      })) as { selectedFlatSequence: string };

      if (!selectedFlatSequence) {
        logger.errorThrow("No flat sequence selected.", {
          lightConcernedSetName,
          lightConcernedSequenceId,
          choices: flatSetNameSequenceIds,
        });
      }

      LightFlatMatches.push({
        lightSetName: lightConcernedSetName,
        lightSequenceId: lightConcernedSequenceId,

        flatSetName: selectedFlatSequence.split("__")[0],
        flatSequenceId: selectedFlatSequence.split("__")[1],

        isManualMatch: true,
      });
    }
  }

  logger.space();
  logger.info("👉 Light - Flat matching summary:");
  for (const pair of LightFlatMatches) {
    logger.debug(
      `- ${pair.lightSetName} ${pair.lightSequenceId} 🏹 ${pair.flatSetName} ${pair.flatSequenceId}`,
    );
  }

  return LightFlatMatches;
};

/**
 * Initialize the layer sets with lights and flats matches.
 *
 * @param lightsFlatsMatches - The lights and flats matches.
 * @param allLights - All the lights.
 * @param allFlatsMatchingLights - All the flats matching lights.
 */
const initLayerSetsWithLightsnFlats = (
  lightsFlatsMatches: LightsFlatsMatch[],
  allLights: FileImageSpec[],
  allFlatsMatchingLights: FileImageSpec[],
): LayerSet[] => {
  const layerSets: LayerSet[] = [];

  for (const lightsFlatsMatch of lightsFlatsMatches) {
    const lights = lightsFlatsMatch.isManualMatch
      ? allLights.filter(
          light =>
            light.sequenceId === lightsFlatsMatch.lightSequenceId &&
            light.setName === lightsFlatsMatch.lightSetName,
        )
      : allLights.filter(
          light => light.setName === lightsFlatsMatch.lightSetName,
        );
    if (!lights) {
      throw new Error(
        `❓❓❓❗️ Light ${lightsFlatsMatch.lightSetName} ${lightsFlatsMatch.lightSequenceId} not found.`,
      );
    }

    const flats = allFlatsMatchingLights.filter(
      flat => flat.sequenceId === lightsFlatsMatch.flatSequenceId,
    );
    if (!flats) {
      throw new Error(
        `❓❓❓❗️ Flat ${lightsFlatsMatch.lightSetName} ${lightsFlatsMatch.flatSequenceId} not found.`,
      );
    }

    const layerSetId = lightsFlatsMatch.isManualMatch
      ? `${lights[0].setName}__${lights[0].sequenceId}`
      : lights[0].setName;

    const lightSequenceIds = new Set(
      [...lights].map(light => light.sequenceId),
    );
    const lightSequences: LayerSet["lightSequences"] = [];
    for (const lightSequenceId of lightSequenceIds) {
      const lightsOfSequence = lights.filter(
        light => light.sequenceId === lightSequenceId,
      );

      const count = lightsOfSequence.length;
      const integrationMs = lightsOfSequence.reduce(
        (total, light) => total + light.bulbMs,
        0,
      );
      lightSequences.push({
        sequenceId: lightSequenceId,
        count,
        integrationMinutes: integrationMs / 1000 / 60,
      });
    }

    const lightTotalIntegrationMs = lights.reduce(
      (total, light) => total + light.bulbMs,
      0,
    );

    const layerSet = {
      layerSetId,
      filter: lights[0].filter,

      lightSequences,
      lightTotalCount: lights.length,
      lightTotalIntegrationMinutes: lightTotalIntegrationMs / 1000 / 60,
      lights,

      flatSet: flats[0].setName,
      flatSequenceId: flats[0].sequenceId,
      flatsCount: flats.length,
      flats,
    } as LayerSet;

    layerSets.push(layerSet);
  }
  return layerSets;
};

/**
 * Assign darks and biases to the layer sets.
 * We darks are assigned to lights, and biases are assigned to flats.
 *
 * @param layerSets - The layer sets with lights and flats filled in.
 * @param bankFiles - The bank files available.
 */
const AssignDarksBiasesToLayerSets = async (
  layerSets: LayerSet[],
  bankFiles: FileImageSpec[],
): Promise<LayerSet[]> => {
  const { darkTemperatureTolerance } = (await enquirer.prompt({
    type: "input",
    name: "darkTemperatureTolerance",
    message:
      "Select the temperature tolerance for lights-darks matching (+/-0.5°C to +/-10°C).",
    initial: 3,
    validate: (value: string) => {
      const number = parseFloat(value);
      return number >= 0.2 ? true : "Please enter something >=0.2";
    },
  })) as { darkTemperatureTolerance: number };

  for (const layerSet of layerSets) {
    const darksAllTemperature = bankFiles.filter(
      dark => dark.type === "Dark" && matchSetFile(layerSet.lights[0], dark),
    );

    const darks = darksAllTemperature.filter(dark => {
      const temperatureDiff = Math.abs(
        dark.temperature - layerSet.lights[0].temperature,
      );
      return temperatureDiff <= darkTemperatureTolerance;
    });

    if (darks.length === 0) {
      logger.error(
        `No darks found for ${layerSet.lights[0].setName} with temperature window +-${darkTemperatureTolerance}.`,
      );
      logger.info(
        `Found ${darksAllTemperature.length} darks for ${layerSet.lights[0].setName} if we ignore temperature.`,
      );
      layerSet.darkSet = "No darks matched";
      layerSet.darksCount = 0;
      layerSet.darkTotalIntegrationMinutes = 0;
      layerSet.darks = [];
    } else {
      layerSet.darkSet = darks[0].setName;
      layerSet.darksCount = darks.length;

      const darkTotalIntegrationMs = darks.reduce(
        (total, dark) => total + dark.bulbMs,
        0,
      );

      layerSet.darkTotalIntegrationMinutes = darkTotalIntegrationMs / 1000 / 60;
      layerSet.darks = darks;
    }

    const biases = bankFiles.filter(
      bias => bias.type === "Bias" && matchSetFile(layerSet.flats[0], bias),
    );

    if (biases.length === 0) {
      logger.error(`No biases found for ${layerSet.flats[0].setName}.`);

      layerSet.biasSet = "No biases matched";
      layerSet.biasesCount = 0;
      layerSet.biases = [];
    } else {
      layerSet.biasSet = biases[0].setName;
      layerSet.biasesCount = biases.length;
      layerSet.biases = biases;
    }

    // Warn if there are multiple sequences for the same layer set
    const darkSequences = new Set(darks.map(dark => dark.sequenceId));
    if (darkSequences.size > 1) {
      logger.warning(
        `Multiple dark sequences found for ${layerSet.lights[0].setName}: ${[
          ...darkSequences,
        ].join(", ")}`,
      );
      logger.warning(
        "Gathering them all for the master dark. Make sure that's what you wanted.",
      );
    }

    const biasSequences = new Set(biases.map(bias => bias.sequenceId));
    if (biasSequences.size > 1) {
      logger.warning(
        `Multiple bias sequences found for ${layerSet.flats[0].setName}: ${[
          ...biasSequences,
        ].join(", ")}`,
      );
      logger.warning(
        "Gathering them all for the master bias. Make sure that's what you wanted.",
      );
    }
  }

  logger.space();
  logger.info("👉 Light - Dark matching summary:");
  for (const layerSet of layerSets) {
    for (const lightSequence of layerSet.lightSequences) {
      if (layerSet.layerSetId.includes("__20")) {
        logger.debug(
          `- ${layerSet.layerSetId} 🏹 ${layerSet.darkSet} (${layerSet.darksCount} files / ${layerSet.darkTotalIntegrationMinutes} minutes)`,
        );
      } else {
        logger.debug(
          `- ${layerSet.layerSetId} ${lightSequence.sequenceId} 🏹 ${layerSet.darkSet} (${layerSet.darksCount} files / ${layerSet.darkTotalIntegrationMinutes} minutes)`,
        );
      }
    }
  }

  logger.info("👉 Flat - Bias matching summary:");
  for (const layerSet of layerSets) {
    logger.debug(
      `- ${layerSet.flatSet} ${layerSet.flatSequenceId} 🏹 ${layerSet.biasSet} (${layerSet.biasesCount} files)`,
    );
  }

  return layerSets;
};

/**
 * Preview the project composition before dispatching.
 *
 * @param layerSets - The layer sets to preview.
 */
const previewBeforeDispatching = async (
  layerSets: LayerSet[],
): Promise<{
  go: boolean;
  metrics: PotoProject["metrics"];
}> => {
  const metrics: PotoProject["metrics"] = {
    cumulatedLightIntegrationMinutes: layerSets.reduce(
      (total, layerSet) => total + layerSet.lightTotalIntegrationMinutes,
      0,
    ),
    cumulatedDarksIntegrationMinutes: layerSets.reduce(
      (total, layerSet) => total + layerSet.darkTotalIntegrationMinutes,
      0,
    ),
    totalLights: layerSets.reduce(
      (total, layerSet) => total + layerSet.lightTotalCount,
      0,
    ),
    totalDarks: layerSets.reduce(
      (total, layerSet) => total + layerSet.darksCount,
      0,
    ),
    totalFlats: layerSets.reduce(
      (total, layerSet) => total + layerSet.flatsCount,
      0,
    ),
    totalBiases: layerSets.reduce(
      (total, layerSet) => total + layerSet.biasesCount,
      0,
    ),
  };

  logger.info(
    `🔭 Cumulated light integration: ${metrics.cumulatedLightIntegrationMinutes} minutes.`,
  );
  logger.info(
    `📦 Project size: ${metrics.totalLights} lights, ${metrics.totalDarks} darks, ${metrics.totalFlats} flats, ${metrics.totalBiases} biases.`,
  );

  logger.space();

  logger.info("🌌 Layer sets:");
  for (const layerSet of layerSets) {
    const log = `- ${layerSet.layerSetId} has ${layerSet.lights.length} lights, ${layerSet.darks.length} darks, ${layerSet.flats.length} flats, ${layerSet.biases.length} biases.`;
    if (
      layerSet.lights.length > 0 &&
      layerSet.flats.length > 0 &&
      layerSet.darks.length > 0 &&
      layerSet.biases.length > 0
    ) {
      logger.debug(log);
    } else {
      logger.warning(log);
    }
  }

  logger.space();

  const { go } = (await enquirer.prompt({
    type: "confirm",
    name: "go",
    message: "Do you want to proceed with the dispatch?",
    initial: true,
  })) as { go: boolean };

  return { go, metrics };
};

/**
 * Dispatch the project json and the files to the poto project directory.
 *
 * @param potoProject - The POTO project to prepare.
 * @param projectDirectory - The project directory.
 */
const dispatchProject = (
  potoProject: PotoProject,
  projectDirectory: string,
): void => {
  const potoJsonPath = `${projectDirectory}/${POTO_JSON}`;

  fs.writeFileSync(potoJsonPath, JSON.stringify(potoProject, null, 2));

  for (const layerSet of potoProject.layerSets) {
    for (const file of [
      ...layerSet.lights,
      ...layerSet.darks,
      ...layerSet.flats,
      ...layerSet.biases,
    ]) {
      copyFileToProject(file);
    }
  }
};

