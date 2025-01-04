import { Command } from "commander";
import prepare from "./commands/prepare";
import {
  dropThumbnails,
  dropEmptyDirectories,
} from "./commands/clear";
import { generateScripts } from "./commands/preprocess.generate-scripts";
import { runScripts } from "./commands/preprocess.exec-scripts";
import { POTO_VERSION } from "./utils/const";

const program = new Command();

program
  .name("poto-siril")
  .description("CLI tool to automate the pre-processing of astrophotography images on top of Siril.")
  .version(POTO_VERSION, "-v, --version", "output the current version");

program
  .command("clear")
  .description(
    "Drop thumbnails and empty directories from an ASIAIR dump.",
  )
  .argument("<path>", "directory to clear")
  .allowExcessArguments(false)
  .action(directory => {
    dropThumbnails(directory);
    dropEmptyDirectories(directory);
  });

program
  .command("prepare")
  .description("Prepare a poto project importing the light frames, and the calibration frames more or less picked automatically.")
  .option("-i, --input <path>", "directory(ies) to pick from. Will take all lights files. Flats, darks, and biases based on lights.")
  .option("<path>", "poto project directory destination")
  .action(options => {
    prepare({
      projectDirectory: options.project,
      asiAirDirectory: options.asiair,
      bankDirectory: options.bank,
    });
  });

program
  .command("preprocess")
  .description("Preprocess using a Siril script (Poto-Siril's Siril script template).")
  .option(
    "-t, --template <path>",
  )
  .option("<path>", "poto project directory")
  .allowExcessArguments(false)
  .action(options => {
    generateScripts(options.path, options.template).then(() => {
      runScripts(options.path, options.template);
    });
  });

program.parse();
