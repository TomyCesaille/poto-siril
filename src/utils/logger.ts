import chalk from "chalk";
import ansiEscapes from "ansi-escapes";

const debug = chalk.gray.italic;
const info = chalk.blue;
const success = chalk.bold.green;
const warning = chalk.bold.yellow;
const error = chalk.bold.red;

const logCounts: { [key: string]: number } = {};
const lastMessages: { [key: string]: string } = {};

const log = (
  type: (message: string) => string,
  message: string,
  ...optionalParams: unknown[]
) => {
  console.log(type(message), ...optionalParams);
};

const logNR = (
  type: (message: string) => string,
  message: string,
  ...optionalParams: unknown[]
) => {
  // if (logCounts[message]) {
  //   logCounts[message]++;
  //   const count = chalk.bold.yellow(`(x${logCounts[message]})`);
  //   process.stdout.write(
  //     ansiEscapes.cursorUp(1) +
  //       ansiEscapes.eraseLine +
  //       type(`${message} ${count}`) +
  //       "\n",
  //   );
  // } else {
  logCounts[message] = 1;
  lastMessages[message] = type(message);
  console.log(type(message), ...optionalParams);
  // }
};

export const formatMessage = (message: string) => {
  return message
    .replace(/(Light|Flat|Dark|Bias)_/g, chalk.hex("#001f3f")("$1_")) // Color image type.
    .replace(/(\d+\.\d(ms|s))/g, chalk.hex("#003f5c")("$1")) // Color bulb.
    .replace(/(Bin\d)/g, chalk.hex("#2f4b7c")("$1")) // Color binning.
    .replace(/(_[A-Za-z]_)/g, chalk.hex("#665191")("$1")) // Color filter.
    .replace(/(gain\d+)/g, chalk.hex("#a05195")("$1")) // Color gain.
    .replace(
      /(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/g,
      (_, y, m, d, h, min, s) =>
        `${chalk.hex("#d45087")(y)}${chalk.hex("#f95d6a")(m)}${chalk.hex(
          "#ff7c43",
        )(d)}-${chalk.hex("#ffa600")(h)}${chalk.hex("#ffb000")(min)}${chalk.hex(
          "#ffc000",
        )(s)}`,
    ) // Adjusted colors for date and time.
    .replace(/_thn.jpg/g, chalk.bgHex("#ff0000")("_thn.jpg")); // Color thumbnail.
};

export const logger = {
  debug: (message: string, ...optionalParams: unknown[]) => {
    logNR(debug, formatMessage(message), ...optionalParams);
  },
  info: (message: string, ...optionalParams: unknown[]) => {
    logNR(info, formatMessage(message), ...optionalParams);
  },
  success: (message: string, ...optionalParams: unknown[]) => {
    logNR(success, formatMessage(message), ...optionalParams);
  },
  warning: (message: string, ...optionalParams: unknown[]) => {
    logNR(warning, formatMessage(message), ...optionalParams);
  },
  error: (message: string, ...optionalParams: unknown[]) => {
    logNR(error, formatMessage(message), ...optionalParams);
  },
  errorThrow: (message: string, ...optionalParams: unknown[]) => {
    logNR(error, formatMessage(message), ...optionalParams);
    throw new Error(message);
  },
  dev: (message: string, ...optionalParams: unknown[]) => {
    log(debug, `DEV: ${message}`, ...optionalParams);
  },
  step: (message: string, ...optionalParams: unknown[]) => {
    log(
      info,
      `\n${"=".repeat(80)}\n📌 ${message}\n${"=".repeat(80)}\n`,
      ...optionalParams,
    );
  },
  space: () => {
    console.log();
  },
};
