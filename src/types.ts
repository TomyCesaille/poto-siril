export type SpecFile = {
  name: string;
  path: string;
  fullPath: string;

  /**
   * File type: light, dark, bias, flat
   */
  type: string;
  /**
   * Bulb duration: 60.0s, 810.0ms
   */
  bulb: string;
  /**
   * Binning: Bin1, Bin2
   */
  bin: string;
  /**
   * Filter: L, R, G, B, H
   */
  filter: string;
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
