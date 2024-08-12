import { Command } from "commander";
import dispatch from "./dispatch-dump";
import {
  cleanThumbnails,
  removeEmptyDirectories
} from "./asiair-dump-cleaning";
import { generateMonoProcessingScripts } from "./generate-scripts";

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
  .description("Dispatch ASI AIR files and bank data to a project directory")
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

program
  .command("clean")
  .description(
    "prepare the ASI AIR dump directory for import by dropping thumbnails and empty directories"
  )
  .argument("[directory]", "directory to clean", ".")
  .allowExcessArguments(false)
  .action(directory => {
    cleanThumbnails(directory);
    removeEmptyDirectories(directory);
  });

program
  .command("preprocess")
  .description("Preprocess the project directory")
  .argument("[directory]", "directory to preprocess", ".")
  .allowExcessArguments(false)
  .action(directory => {
    generateMonoProcessingScripts(directory);
  });

program.parse();
