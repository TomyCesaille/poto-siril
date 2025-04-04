export type imageType = "Light" | "Dark" | "Bias" | "Flat";

export type ImageSpec = {
  /**
   * `Flat_520.0ms_Bin1_O_gain0` format.
   */
  setName: string;

  /**
   * File type: Light, Dark, Bias, Flat.
   */
  type: imageType;
  /**
   * Bulb duration: 60.0s, 810.0ms, etc...
   */
  bulb: string;
  /**
   * Bulb duration in milliseconds.
   */
  bulbMs: number;
  /**
   * Binning: Bin1, Bin2, Bin 3 & Bin 4.
   */
  bin: string;
  /**
   * Filter: L, R, G, B, H... As Specified in the ASIAIR zwo wheel.
   * Optional, may not be present in the filename if no wheel.
   */
  filter: string | null;
  /**
   * Gain: 0, 100, 360, etc...
   */
  gain: number;
  /**
   * Date and time. `20240707-002348` format.
   */
};

export type FileImageSpec = ImageSpec & {
  /**
   * Name of the time in disk.
   */
  fileName: string;
  /**
   * File extension: `fit`.
   */
  extension: string;

  /**
   * Directory path from the source input directory.
   */
  sourceFileDirectory: string;
  /**
   * File path file from the source input directory.
   */
  sourceFilePath: string;

  /**
   * Path to the project directory.
   */
  projectFileDirectory: string;
  /**
   * File path in the project directory.
   */
  projectFilePath: string;

  /**
   * Recorded time.
   */
  datetime: Date;

  /**
   * Sequence identifier. Is date of the first file of the sequence in format `20240626-010850`.
   */
  sequenceId: string;
  /**
   * Position in the sequence.
   */
  sequencePosition: number;

  // TODO. Change to float Celcius.
  /**
   * Temperature: `-10.0C`, `-9.9C` format.
   */
  temperature: number;
};

/**
 * This represents a set of lights and its calibration frames.
 * Each set has unique filter + exposure + gain + bin combination.
 */
export type LayerSet = {
  /**
   * `Flat_520.0ms_Bin1_O_gain0` format.
   * `Flat_520.0ms_Bin1_O_gain0__20240625-010850` format for advanced light-flats matching.
   */
  layerSetId: string;

  /**
   * Filter: L, R, G, B, H... As Specified in the ASIAIR zwo wheel.
   * Optional.
   */
  filter: string | null;

  lightTotalCount: number;
  lightTotalIntegrationMinutes: number;
  /**
   * Sequences of lights used.
   */
  lightSequences: {
    /**
     * "20240625-010850" format.
     */
    sequenceId: string;
    count: number;
    integrationMinutes: number;
  }[];

  flatSet: string;
  /**
   * "20240625-010850" format.
   */
  flatSequenceId: string;
  flatsCount: number;

  darkSet: string;
  darksCount: number;
  darkTotalIntegrationMinutes: number;

  biasSet: string;
  biasesCount: number;

  lights: FileImageSpec[];
  flats: FileImageSpec[];
  darks: FileImageSpec[];
  biases: FileImageSpec[];
};

export type PotoProject = {
  generatedAt: Date;
  potoVersion: string;
  metrics: {
    cumulatedLightIntegrationMinutes: number;
    cumulatedDarksIntegrationMinutes: number;
    totalLights: number;
    totalFlats: number;
    totalDarks: number;
    totalBiases: number;
  };
  layerSets: LayerSet[];
};

export type LightsFlatsMatch = {
  lightSetName: string;
  lightSequenceId: string;

  flatSetName: string;
  flatSequenceId: string;

  /**
   * True if the light was manually matched because several flats sequences were available.
   */
  isManualMatch: boolean;
};
