import { Command, InvalidArgumentError } from "commander";
import dispatch from "./dispatch-dump";

const program = new Command();

program
  .name("poto-siril")
  .description("CLI to some ASI AIR import and SIRIL processing")
  .version("0.1.0");

// const parseMode = (value: string, previous: string) => {
//   if (value != "autorun" && value != "plan") {
//     throw new InvalidArgumentError("Unknown mode. Use `autorun` or `plan`.");
//   }
//   return value;
// };

program
  .command("dispatch")
  .description("dispatch ASI AIR files and bank data to a project directory")
  //   .argument("[path]", "project directory", ".")
  .option("-p, --project <path>", "project directory")
  .option("-a, --asiair <path>", "ASI AIR directory")
  .option("-m, --mode <mode>", "`autorun` or `plan` mode", "autorun")
  .option("-b, --bank <path>", "Biases & Darks bank directory")
  .action(options => {
    dispatch({
      projectDirectory: options.project,
      asiAirDirectory: options.asiair,
      shootingMode: options.mode as "autorun" | "plan",
      bankDirectory: options.bank
    });
  });

program.parse();