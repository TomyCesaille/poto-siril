// Dispatch ASIAIR dump data from ASIAIR tree structure to the SIRIL process structure.

// TODO allow filtering a range of data, for lights and flats. This will ease the process of selecting the frames
// regroup per night session (so split at noon and consider after midnight part of the previon night). this is also easing out the process.
// pre select those that are burned (daylight started to appear), probably by checking the date of the frame and location.

import fs from "fs";
import Enquirer from "enquirer";

import { logger } from "../utils/logger";
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
import { POTO_JSON } from "../utils/const";

export type DispatchOptions = {
  projectDirectory: string;
  asiAirDirectory: string;
  shootingMode: "autorun" | "plan";
  bankDirectory: string;
};

const dispatch = async ({
  projectDirectory,
  asiAirDirectory,
  shootingMode,
  bankDirectory,
}: DispatchOptions) => {
  await ensureProjectDirectoryExists(projectDirectory);

  const inputFiles = getAllFitsInInputDirectories(
    asiAirDirectory,
    shootingMode,
    projectDirectory,
  );

  const allLights = inputFiles.filter(file => file.type === "Light");

  const allFlatsMatchingLights = getFlatsMatchingLightsNaive(
    inputFiles,
    allLights,
  );

  const lightsFlatsMatches = await matchLightsToFlats(
    allFlatsMatchingLights,
    allLights,
  );

  const layerSets: LayerSet[] = [];

  for (const lightsFlatsMatch of lightsFlatsMatches) {
    const lights = allLights.filter(
      light =>
        light.sequenceId === lightsFlatsMatch.lightSequenceId &&
        light.setName === lightsFlatsMatch.lightSetName,
    );
    if (!lights) {
      throw new Error(
        `❓❓❓❗️ Light ${lightsFlatsMatch.lightSetName} ${lightsFlatsMatch.lightSequenceId} not found.`,
      );
    }

    const flats = allFlatsMatchingLights.filter(
      flat =>
        flat.sequenceId === lightsFlatsMatch.flatSequenceId &&
        flat.setName === lightsFlatsMatch.lightSetName,
    );
    if (!flats) {
      throw new Error(
        `❓❓❓❗️ Flat ${lightsFlatsMatch.lightSetName} ${lightsFlatsMatch.flatSequenceId} not found.`,
      );
    }

    const layerSetId = lightsFlatsMatch.isAdvancedMatching
      ? `${lights[0].setName}__sequence-${lights[0].sequenceId}`
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

      lights,
      lightSequences,
      lightTotalCount: lights.length,
      lightTotalIntegrationMinutes: lightTotalIntegrationMs / 1000 / 60,

      flats,
      flatSet: flats[0].setName,
      flatSequenceId: flats[0].sequenceId,
      flatsCount: flats.length,
    } as LayerSet;

    layerSets.push(layerSet);
  }

  // TODO. Add biases and darks to the layerSets.

  return;

  const importedLightsFlatsFiles: FileImageSpec[] = [];
  const importedDarksBiasesFiles: FileImageSpec[] = [];

  // Dispatch the ASIAIR Lights files to the project directory.
  // const lightFiles = inputFiles.filter(file => file.type === "Light");
  // lightFiles.forEach(file => {
  //   copyFileToProject(file);
  //   importedLightsFlatsFiles.push(file);
  // });

  // Dispatch associated flats.
  // inputFiles
  //   .filter(x => x.type === "Flat")
  //   .forEach(file => {
  //     if (lightFiles.find(f => matchSetFile(f, file))) {
  //       copyFileToProject(file);
  //       importedLightsFlatsFiles.push(file);
  //     } else {
  //       logger.info(
  //         `Skipping ${file.fileName} from the ASIAIR, No light matching.`,
  //       );
  //     }
  //   });

  // Search for the darks and biases we need to copy.
  const bankFiles = getFitsFromDirectory({
    directory: bankDirectory,
    projectDirectory,
  });
  logger.info(`Found ${bankFiles.length} files in the bank.`);
  bankFiles.forEach(file => {
    // Check if the file is needed from the bank.
    if (importedLightsFlatsFiles.find(f => matchSetFile(f, file))) {
      copyFileToProject(file);
      importedDarksBiasesFiles.push(file);
    } else {
      logger.debug(`Skipping ${file.fileName} from the bank, not needed.`);
    }
  });

  // TODO. Extract below to a new isolated stats function.

  // Check that there's flat, darks and biases for each sets.
  const files = [...importedLightsFlatsFiles, ...importedDarksBiasesFiles];
  const flatFiles = files.filter(file => file.type === "Flat");
  const darkFiles = files.filter(file => file.type === "Dark");
  const biasFiles = files.filter(file => file.type === "Bias");

  const layerSetsOld = [
    ...new Set(
      files.filter(file => file.type === "Light").map(file => file.setName),
    ),
  ].map(layerSetName => {
    const setSpecs = getImageSpecFromSetName(layerSetName);

    const layerSet = {
      filter: setSpecs.filter,
      lightSet: layerSetName,
      // TODO. Refactor to use the filter function here too. Or store the decision previously made (during the bank selection) to reuse it here.
      // The core issue is that we kinda recompute the same thing twice when importing files + when generating the poto project file.
      lights: lightFiles.filter(file => file.setName === layerSetName),
      darks: darkFiles.filter(
        file =>
          file.bin === setSpecs.bin &&
          file.gain === setSpecs.gain &&
          file.bulb === setSpecs.bulb,
      ),
      flats: flatFiles.filter(
        file => file.bin === setSpecs.bin && file.filter === setSpecs.filter,
      ),
    } as LayerSet;

    const biases = biasFiles.filter(
      file =>
        file.bin === (layerSet.flats[0]?.bin ?? undefined) &&
        file.gain === (layerSet.flats[0]?.gain ?? undefined),
    );

    return {
      filter: layerSet.filter,

      lightSet: layerSet.lightSet,
      flatSet: layerSet.flats[0]?.setName ?? undefined,
      darkSet: layerSet.darks[0]?.setName ?? undefined,
      biasSet: biases[0]?.setName ?? undefined,

      lightsCount: layerSet.lights.length,
      flatsCount: layerSet.flats.length,
      darksCount: layerSet.darks.length,
      biasesCount: biases.length,

      lights: layerSet.lights,
      darks: layerSet.darks,
      flats: layerSet.flats,
      biases,
    } as LayerSet;
  });

  logger.info(
    `🔭 Project size: ${layerSets.reduce(
      (total, layerSet) => total + layerSet.flatsCount,
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

  for (const layerSet of layerSets) {
    const log = `  🌌 Set ${layerSet.lightSet} has ${layerSet.lights.length} lights, ${layerSet.darks.length} darks, ${layerSet.flats.length} flats, ${layerSet.biases.length} biases.`;
    if (
      layerSet.lights.length > 0 &&
      layerSet.flats.length > 0 &&
      layerSet.darks.length > 0 &&
      layerSet.biases.length > 0
    ) {
      logger.info(log);
    } else {
      logger.warning(log);
    }
  }

  const potoProject: PotoProject = {
    generatedAt: new Date(),
    potoVersion: "0.1.0",
    layerSets,
  };

  const potoJsonPath = `${projectDirectory}/${POTO_JSON}`;

  fs.writeFileSync(potoJsonPath, JSON.stringify(potoProject, null, 2));

  logger.success(`Dispatch done ✅. ${POTO_JSON} generated 💃.`);
};

export default dispatch;

/**
 * Ensure that the project directory exists.
 * If it does not exist, ask the user if they want to create it.
 */
const ensureProjectDirectoryExists = async (projectDirectory: string) => {
  if (!fs.existsSync(projectDirectory)) {
    const enquirer = new Enquirer();
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

// TODO. Decouple from ASIAIR. Just warn if files both found in Autorun and Plan, and ask the user to probably review the input files first.
// TODO. Allow multiple directories in input.
const getAllFitsInInputDirectories = (
  asiAirDirectory: string,
  shootingMode: string,
  projectDirectory: string,
) => {
  const files = getFitsFromDirectory({
    directory: `${asiAirDirectory}/${
      shootingMode === "autorun" ? "Autorun" : "Plan"
    }`,
    projectDirectory,
  });
  logger.info(`Found ${files.length} files to dispatch.`);
  return files;
};

/**
 * Naive matching of flats with lights.
 * Sufficient enough to skip the flats that do not have a matching light at all.
 */
const getFlatsMatchingLightsNaive = (
  inputFiles: FileImageSpec[],
  lights: FileImageSpec[],
): FileImageSpec[] => {
  const matchingFlats = inputFiles
    .filter(x => x.type === "Flat")
    .filter(flat => {
      if (lights.find(light => matchSetFile(light, flat))) {
        return flat;
      } else {
        logger.warning(
          `Found ${flat.setName} (seq ${flat.sequenceId}) but light matching. Skipping 🤔.`,
        );
      }
    });

  const sequences = [...new Set(matchingFlats.map(file => file.sequenceId))];
  logger.info(
    `Found ${matchingFlats.length} (${sequences.length} sequences) matching flats.`,
  );

  return matchingFlats;
};

/**
 * Process the light and flat matching.
 * If multiple sequences are found for a flat, ask the user to select the flat sequence to use for each light sequence.
 */
const matchLightsToFlats = async (
  matchingFlats: FileImageSpec[],
  lights: FileImageSpec[],
): Promise<LightsFlatsMatch[]> => {
  const flatSets = [...new Set(matchingFlats.map(file => file.setName))];

  const LightFlatMatches: LightsFlatsMatch[] = [];

  for (const flatSet of flatSets) {
    const flatSequenceIds = [
      ...new Set(
        matchingFlats
          .filter(flat => flat.setName === flatSet)
          .map(flat => flat.sequenceId),
      ),
    ];
    if (flatSequenceIds.length === 0) {
      throw new Error(`❓❓❓❗️ No sequences found for flat ${flatSet}.`);
    }

    if (flatSequenceIds.length === 1) {
      LightFlatMatches.push({
        lightSequenceId: lights[0].sequenceId,
        lightSetName: lights[0].setName,
        flatSequenceId: flatSequenceIds[0],
        isAdvancedMatching: false,
      });
      continue;
    }

    logger.info(
      `Multiple sequences found for flat set ${flatSet}: ${flatSequenceIds.join(
        ", ",
      )}`,
    );
    logger.info(
      "👉 We need to accurately link each light sequence to their respective flat sequence.",
    );

    const lightsConcerned = [
      ...new Set(
        lights
          .filter(light =>
            matchSetFile(light, getImageSpecFromSetName(flatSet)),
          )
          .map(light => ({
            setName: light.setName,
            sequenceId: light.sequenceId,
          })),
      ),
    ].sort((a, b) => {
      // Sort by setName first.
      if (a.setName !== b.setName) {
        return a.setName.localeCompare(b.setName);
      }
      // Then by sequenceId.
      return a.sequenceId.localeCompare(b.sequenceId);
    });

    for (const lightConcerned of lightsConcerned) {
      // Ask the user to select the flat sequence to use.
      const enquirer = new Enquirer();
      const response = (await enquirer.prompt({
        type: "select",
        name: "selectedFlatSequence",
        message: `Select the flat sequence to use for the lights sequence ${lightConcerned.setName} ${lightConcerned.sequenceId}.`,
        choices: flatSequenceIds,
      })) as { selectedFlatSequence: string };
      LightFlatMatches.push({
        lightSetName: lightConcerned.setName,
        lightSequenceId: lightConcerned.sequenceId,
        flatSequenceId: response.selectedFlatSequence,
        isAdvancedMatching: true,
      });
    }
  }

  logger.info("👉 Light -> Flat matching summary:");
  for (const pair of LightFlatMatches) {
    logger.info(
      `   Light set ${pair.lightSetName}, sequence ${pair.lightSequenceId} will use flat sequence ${pair.flatSequenceId}.`,
    );
  }

  return LightFlatMatches;
};
