import chalk from "chalk";

const debug = chalk.gray;
const info = chalk.blue;
const success = chalk.bold.green;
const warning = chalk.bold.yellow;
const error = chalk.bold.red;

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
};
