import chalk from "chalk";
import ansiEscapes from "ansi-escapes";

const debug = chalk.gray;
const info = chalk.blue;
const success = chalk.bold.green;
const warning = chalk.bold.yellow;
const error = chalk.bold.red;

const logCounts: { [key: string]: number } = {};
const lastMessages: { [key: string]: string } = {};

const logNR = (
  type: (message: string) => string,
  message: string,
  ...optionalParams: unknown[]
) => {
  if (logCounts[message]) {
    logCounts[message]++;
    process.stdout.write(
      ansiEscapes.cursorUp(1) +
        ansiEscapes.eraseLine +
        type(`${message} x${logCounts[message]}`) +
        "\n",
    );
  } else {
    logCounts[message] = 1;
    lastMessages[message] = type(message);
    console.log(type(message), ...optionalParams);
  }
};

export const logger = {
  debug: (message: string, ...optionalParams: unknown[]) => {
    console.log(debug(message), ...optionalParams);
  },
  info: (message: string, ...optionalParams: unknown[]) => {
    console.log(info(message), ...optionalParams);
  },
  success: (message: string, ...optionalParams: unknown[]) => {
    console.log(success(message), ...optionalParams);
  },
  warning: (message: string, ...optionalParams: unknown[]) => {
    console.log(warning(message), ...optionalParams);
  },
  error: (message: string, ...optionalParams: unknown[]) => {
    console.log(error(message), ...optionalParams);
  },
  errorThrow: (message: string, ...optionalParams: unknown[]) => {
    console.log(error(message), ...optionalParams);
    throw new Error(message);
  },
  debugNR: (message: string, ...optionalParams: unknown[]) => {
    logNR(debug, message, ...optionalParams);
  },
  infoNR: (message: string, ...optionalParams: unknown[]) => {
    logNR(info, message, ...optionalParams);
  },
  successNR: (message: string, ...optionalParams: unknown[]) => {
    logNR(success, message, ...optionalParams);
  },
  warningNR: (message: string, ...optionalParams: unknown[]) => {
    logNR(warning, message, ...optionalParams);
  },
  errorNR: (message: string, ...optionalParams: unknown[]) => {
    logNR(error, message, ...optionalParams);
  },
};
