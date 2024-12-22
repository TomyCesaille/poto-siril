type imageType = "Light" | "Dark" | "Bias" | "Flat";

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
  bulbMs: number; // TODO. Compute this.
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
   * Path to the ASIAIR dump directory.
   */
  sourceDirectory: string;
  /**
   * Path to the file in the ASIAIR dump directory.
   */
  sourceFilePath: string;

  /**
   * Path to the project directory.
   */
  projectDirectory: string;

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
  temperature: string;
};

/**
 * This represents a set of lights and its calibration frames.
 * Each set has unique filter + exposure + gain + bin combination.
 */
export type LayerSet = {
  /**
   * `Flat_520.0ms_Bin1_O_gain0` format.
   * `Flat_520.0ms_Bin1_O_gain0__sequence-01` format for advanced light-flats matching.
   */
  layerSetId: string;

  /**
   * Filter: L, R, G, B, H... As Specified in the ASIAIR zwo wheel.
   * Optional.
   */
  filter: string | null;

  /**
   * Sequences of lights used.
   */
  lightSequences: {
    sequenceId: string;
    count: number;
    integrationMinutes: number;
  }[];
  lightTotalCount: number;
  lightTotalIntegrationMinutes: number;

  flatSet: string;
  flatSequenceId: string;
  flatsCount: number;

  darkSet: string;
  darksCount: number;

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
  layerSets: LayerSet[];
};

export type LightsFlatsMatch = {
  lightSetName: string;
  lightSequenceId: string;
  flatSequenceId: string;
  /**
   * True if the light was manually matched because several flats sequences were available.
   */
  isAdvancedMatching: boolean;
};
