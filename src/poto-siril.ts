import { Command } from "commander";
import dispatch from "./commands/dispatch-dump";
import {
  cleanThumbnails,
  removeEmptyDirectories,
} from "./commands/asiair-dump-cleaning";
import { generateScripts } from "./commands/generate-scripts";
import { runScripts } from "./commands/run-scripts";
import { POTO_VERSION } from "./utils/const";

const program = new Command();

program
  .name("poto-siril")
  .description("CLI to some ASIAIR import and SIRIL processing")
  .version(POTO_VERSION);

// const parseMode = (value: string, previous: string) => {
//   if (value != "autorun" && value != "plan") {
//     throw new InvalidArgumentError("Unknown mode. Use `autorun` or `plan`.");
//   }
//   return value;
// };

program
  .command("clean")
  .description(
    "prepare the ASIAIR dump directory for import by dropping thumbnails and empty directories",
  )
  .option("-a, --asiair <path>", "ASIAIR directory")
  .allowExcessArguments(false)
  .action(option => {
    cleanThumbnails(option.asiair);
    removeEmptyDirectories(option.asiair);
  });

program
  .command("dispatch")
  .description("Dispatch ASIAIR files and bank data to a project directory")
  //   .argument("[path]", "project directory", ".")
  .option("-p, --project <path>", "project directory")
  .option("-a, --asiair <path>", "ASIAIR directory")
  .option("-m, --mode <mode>", "`autorun` or `plan` mode", "autorun")
  .option("-b, --bank <path>", "Biases & Darks bank directory")
  .action(options => {
    dispatch({
      projectDirectory: options.project,
      asiAirDirectory: options.asiair,
      shootingMode: options.mode as "autorun" | "plan",
      bankDirectory: options.bank,
    });
  });

program
  .command("preprocess")
  .description("Preprocess the project directory")
  .option("-p, --project <path>", "project directory")
  .option(
    "-s, --script <path>",
    "ssl script path",
    "./process/mono_processing_process/1_preprocessing.ssf",
  )
  .allowExcessArguments(false)
  .action(options => {
    generateScripts(options.project, options.script).then(() => {
      runScripts(options.project, options.script);
    });
  });

program.parse();
