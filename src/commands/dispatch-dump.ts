// Dispatch ASIAIR dump data from ASIAIR tree structure to the SIRIL process structure.

// TODO allow filtering a range of data, for lights and flats. This will ease the process of selecting the frames
// regroup per night session (so split at noon and consider after midnight part of the previon night). this is also easing out the process.
// pre select those that are burned (daylight started to appear), probably by checking the date of the frame and location.

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

export type DispatchOptions = {
  projectDirectory: string;
  asiAirDirectory: string;
  shootingMode: "autorun" | "plan";
  bankDirectory: string;
};

const enquirer = new Enquirer();

const dispatch = async ({
  projectDirectory,
  asiAirDirectory,
  shootingMode,
  bankDirectory,
}: DispatchOptions) => {
  await ensureProjectDirectoryExists(projectDirectory);

  logger.step("Reading input directories");

  const inputFiles = getAllFitsInInputDirectories(
    asiAirDirectory,
    shootingMode,
    projectDirectory,
  );

  const allLights = inputFiles.filter(file => file.type === "Light");

  logger.step("Matching lights and flats (early stage)");

  const allFlatsMatchingLights = getFlatsMatchingLightsNaive(
    inputFiles,
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

  const bankFiles = getAllFitsInBankDirectories(
    bankDirectory,
    projectDirectory,
  );

  layerSets = AssignDarksBiasesToLayerSets(layerSets, bankFiles);

  logger.step("Preview before dispatching");

  const go = await previewBeforeDispatching(layerSets);

  if (!go) {
    logger.warning("Aborted.");
    return;
  }
  logger.step("Dispatching");

  const potoProject: PotoProject = {
    generatedAt: new Date(),
    potoVersion: POTO_VERSION,
    layerSets,
  };

  await dispatchProject(potoProject, projectDirectory);

  logger.success("Dispatch complete.");

  // TODO. custom sort if LRGBSHO filter names to ease reading.
};

export default dispatch;

/**
 * Ensure that the project directory exists.
 * If it does not exist, ask the user if they want to create it.
 *
 * @param projectDirectory - The directory of the current project.
 */
const ensureProjectDirectoryExists = async (projectDirectory: string) => {
  if (!fs.existsSync(projectDirectory)) {
    const response = (await enquirer.prompt({
      type: "confirm",
      name: "createProjectDirectory",
      message: `Directory ${projectDirectory} does not exist. Do you want to create it?`,
    })) as { createProjectDirectory: boolean };

    if (response.createProjectDirectory) {
      fs.mkdirSync(projectDirectory, { recursive: true });
    }
  }
};

/**
 * Retrieve all FITS files from the input directories.
 *
 * @param asiAirDirectory - The directory where ASIAIR files are stored.
 * @param shootingMode - The shooting mode, either "autorun" or "plan".
 * @param projectDirectory - The directory of the current project.
 * @returns An array of FileImageSpec objects representing the FITS files.
 */
const getAllFitsInInputDirectories = (
  asiAirDirectory: string,
  shootingMode: string,
  projectDirectory: string,
): FileImageSpec[] => {
  // TODO. Allow multiple directories in input.
  // TODO. Decouple from ASIAIR. Just warn if files both found in Autorun and Plan, and ask the user to probably review the input files first.
  const files = getFitsFromDirectory({
    directory: `${asiAirDirectory}/${
      shootingMode === "autorun" ? "Autorun" : "Plan"
    }`,
    projectDirectory,
  });
  logger.info(`Found ${files.length} files in input dir(s) to dispatch.`);

  return files;
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
  logger.info(
    `Found ${matchingFlats.length} matching flats (${sequences.length} sequences).`,
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

  for (const flatSet of flatSets) {
    const flatSetNameSequenceIds = [
      ...new Set(
        matchingFlats
          .filter(flat => flat.setName === flatSet)
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
        matchSetFile(light, getImageSpecFromSetName(flatSet)),
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

    logger.info(`🤚 Several sequences found for flat set ${flatSet}:`);
    logger.info(
      `${flatSetNameSequenceIds.map(x => `- ${x.split("__")[1]}`).join("\n")}`,
    );
    logger.debug(
      "We assume that multiple sequences of the same flat set indicate multiple night sessions where the flats had to be re-shot in between (e.g., a significant date gap between shooting sessions and the lights were not collected with the same collimation and/or same dust in the optical train).",
    );
    logger.info(
      "We will ask you to tag each concerned light sequence to the right flat sequence.",
    );

    // TODO. Provide a smart way to match the sequences.
    // E.G Flats always before / after lights.
    // Propose the choice manual / auto (light before flats) / auto (flats before lights).
    // show the summary for auto, and ask if needs to be reviewed in manual mode.

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
      const lightConcernedSetName = lightConcerned.split("__")[0];
      const lightConcernedSequenceId = lightConcerned.split("__")[1];

      const response = (await enquirer.prompt({
        type: "select",
        name: "selectedFlatSequence",
        message: formatMessage(
          `${lightConcernedSetName} ${lightConcernedSequenceId} will use`,
        ),
        choices: flatSetNameSequenceIds.map(x => ({
          name: x,
          message: formatMessage(x.replace("__", " ")),
        })),
      })) as { selectedFlatSequence: string };

      LightFlatMatches.push({
        lightSetName: lightConcernedSetName,
        lightSequenceId: lightConcernedSequenceId,

        flatSetName: response.selectedFlatSequence.split("__")[0],
        flatSequenceId: response.selectedFlatSequence.split("__")[1],

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
 * Retrieve all FITS files from the input directories.
 *
 * @param bankDirectory - The directory where ASIAIR files are stored.
 * @param projectDirectory - The directory of the current project.
 * @returns An array of FileImageSpec objects representing the FITS files.
 */
const getAllFitsInBankDirectories = (
  bankDirectory: string,
  projectDirectory: string,
): FileImageSpec[] => {
  // TODO. Allow multiple directories in input.
  const files = getFitsFromDirectory({
    directory: bankDirectory,
    projectDirectory,
  });
  logger.info(`Found ${files.length} files in the bank.`);
  return files;
};

/**
 * Assign darks and biases to the layer sets.
 * We darks are assigned to lights, and biases are assigned to flats.
 *
 * @param layerSets - The layer sets with lights and flats filled in.
 * @param bankFiles - The bank files available.
 */
const AssignDarksBiasesToLayerSets = (
  layerSets: LayerSet[],
  bankFiles: FileImageSpec[],
): LayerSet[] => {
  for (const layerSet of layerSets) {
    const darks = bankFiles.filter(
      dark => dark.type === "Dark" && matchSetFile(layerSet.lights[0], dark),
    );

    if (darks.length === 0) {
      logger.error(`No darks found for ${layerSet.lights[0].setName}.`);
    } else {
      layerSet.darkSet = darks[0].setName;
      layerSet.darksCount = darks.length;
      layerSet.darks = darks;
    }

    const biases = bankFiles.filter(
      bias => bias.type === "Bias" && matchSetFile(layerSet.flats[0], bias),
    );

    if (biases.length === 0) {
      logger.error(`No biases found for ${layerSet.flats[0].setName}.`);
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
        "Gathering them all for the master dark. Make sure that's what you want.",
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
        "Gathering them all for the master flat. Make sure that's what you want.",
      );
    }
  }

  return layerSets;
};

/**
 * Preview the project composition before dispatching.
 *
 * @param layerSets - The layer sets to preview.
 */
const previewBeforeDispatching = async (layerSets: LayerSet[]) => {
  logger.info(
    `🔭 Cumulated light integration: ${layerSets.reduce(
      (total, layerSet) => total + layerSet.lightTotalIntegrationMinutes,
      0,
    )} minutes.`,
  );
  logger.info(
    `📦 Project size: ${layerSets.reduce(
      (total, layerSet) => total + layerSet.lightTotalCount,
      0,
    )} lights, ${layerSets.reduce(
      (total, layerSet) => total + layerSet.darksCount,
      0,
    )} darks, ${layerSets.reduce(
      (total, layerSet) => total + layerSet.flatsCount,
      0,
    )} flats, ${layerSets.reduce(
      (total, layerSet) => total + layerSet.biasesCount,
      0,
    )} biases.`,
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

  const response = (await enquirer.prompt({
    type: "confirm",
    name: "go",
    message: "Do you want to proceed with the dispatch?",
  })) as { go: boolean };

  return response.go;
};

/**
 * Dispatch the project json and the files to the poto project directory.
 *
 * @param potoProject - The POTO project to dispatch.
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

// TODO. Enrich dataset 1 for a layerset with a missing dark.
// TODO. Create a dataset 1 Light D (exact same as Light A, but another sequence, to be matched with another flat sequence).
// TODO. Enrich dataset 1 for a layerset with a missing flat.
// TODO. Enrich dataset 1 for a layerset with multiple dark sequences
// or in separated dataset TBD.
