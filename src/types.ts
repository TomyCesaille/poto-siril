export type SpecFile = {
  name: string;

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
   * File type: light, dark, bias, flat
   */
  type: "Light" | "Dark" | "Bias" | "Flat";
  /**
   * Bulb duration: 60.0s, 810.0ms
   */
  bulb: string;
  /**
   * Binning: Bin1, Bin2
   */
  bin: string;
  /**
   * Filter: L, R, G, B, H... As Specified in the ASIAIR zwo wheel.
   * Optional, may not be present in the filename if no wheel.
   */
  filter: string | null;
  /**
   * Gain: 0, 100, 200, 300
   */
  gain: number;
  /**
   * Date and time: 20240707-002348
   */
  datetime: string;
  /**
   * Temperature: -10.0C, -9.9C
   */
  temperature: string;
  /**
   * Sequence number: 1, 60
   */
  sequence: number;
  /**
   * File extension: fit
   */
  extension: string;
};
