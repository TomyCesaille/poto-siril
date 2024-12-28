import { logger, formatMessage } from "../logger";
import chalk from "chalk";

describe("logger", () => {
  const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

  afterEach(() => {
    consoleLogSpy.mockClear();
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
  });

  it("should log debug messages", () => {
    logger.debug("Debug message");
    expect(consoleLogSpy).toHaveBeenCalledWith(
      chalk.gray.italic("Debug message"),
    );
  });

  it("should log info messages", () => {
    logger.info("Info message");
    expect(consoleLogSpy).toHaveBeenCalledWith(chalk.blue("Info message"));
  });

  it("should log success messages", () => {
    logger.success("Success message");
    expect(consoleLogSpy).toHaveBeenCalledWith(
      chalk.bold.green("Success message"),
    );
  });

  it("should log warning messages", () => {
    logger.warning("Warning message");
    expect(consoleLogSpy).toHaveBeenCalledWith(
      chalk.bold.yellow("Warning message"),
    );
  });

  it("should log error messages", () => {
    logger.error("Error message");
    expect(consoleLogSpy).toHaveBeenCalledWith(chalk.bold.red("Error message"));
  });

  it("should throw an error with errorThrow", () => {
    expect(() => logger.errorThrow("Error message")).toThrow("Error message");
    expect(consoleLogSpy).toHaveBeenCalledWith(chalk.bold.red("Error message"));
  });

  it("should log dev messages", () => {
    logger.dev("Dev message");
    expect(consoleLogSpy).toHaveBeenCalledWith(
      chalk.gray.italic("DEV: Dev message"),
    );
  });

  it("should log step messages", () => {
    logger.step("Step message");
    expect(consoleLogSpy).toHaveBeenCalledWith(
      chalk.blue(`\n${"=".repeat(80)}\n📌 Step message\n${"=".repeat(80)}\n`),
    );
  });

  it("should log a space", () => {
    logger.space();
    expect(consoleLogSpy).toHaveBeenCalledWith();
  });

  it("should format and log messages with optional parameters", () => {
    logger.info("Info message with params", { param1: "value1" });
    expect(consoleLogSpy).toHaveBeenCalledWith(
      chalk.blue("Info message with params"),
      { param1: "value1" },
    );
  });

  it("should handle empty messages", () => {
    logger.info("");
    expect(consoleLogSpy).toHaveBeenCalledWith(chalk.blue(""));
  });

  it("should handle undefined messages", () => {
    logger.info(undefined);
    expect(consoleLogSpy).toHaveBeenCalledWith(chalk.blue("undefined"));
  });
});

describe("formatMessage", () => {
  it("should format messages correctly", () => {
    const message = "Light_1234 gain10 Bin2 20220101-120000_thn.jpg";
    const formattedMessage = formatMessage(message);
    expect(formattedMessage).toContain(chalk.hex("#001f3f")("Light_"));
    expect(formattedMessage).toContain(chalk.hex("#a05195")("gain10"));
    expect(formattedMessage).toContain(chalk.hex("#2f4b7c")("Bin2"));
    expect(formattedMessage).toContain(
      `${chalk.hex("#d45087")("2022")}${chalk.hex("#f95d6a")("01")}${chalk.hex(
        "#ff7c43",
      )("01")}-${chalk.hex("#ffa600")("12")}${chalk.hex("#ffb000")(
        "00",
      )}${chalk.hex("#ffc000")("00")}`,
    );
    expect(formattedMessage).toContain(chalk.bgHex("#ff0000")("_thn.jpg"));
  });

  it("should handle empty messages", () => {
    const message = "";
    const formattedMessage = formatMessage(message);
    expect(formattedMessage).toBe("");
  });

  it("should handle undefined messages", () => {
    const message = undefined;
    const formattedMessage = formatMessage(message);
    expect(formattedMessage).toBe("undefined");
  });
});
