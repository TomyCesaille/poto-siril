// Disable chalk colors since GitHub Actions doesn't support them (would conflict with e2e snapshots).

process.env.FORCE_COLOR = "0";

import path from "path";
import process from "process";
import { expect } from "@jest/globals"; // Import Jest globals
import { toMatchSnapshot } from "jest-snapshot"; // Import Jest snapshot matcher

// TODO. Find some courage some day to refactor this properly to jest snapshotSerializers. If jest+ESM+typescript is less a burden by then.

expect.extend({
  toMatchSnapshotWithNormalizedPaths(received) {
    return toMatchSnapshot.call(
      this,
      normalizeReceived(received),
      "",
    );
  },
});

const normalizeReceived = (received: string | string[]) => {
  let normalized: string | string[] = received;
  if (typeof received === "string") {
    normalized = received.replaceAll(
      new RegExp(path.resolve(process.cwd()), "gm"),
      "<ROOT>",
    );
  } else if (
    Array.isArray(received) &&
    received.every(item => typeof item === "string")
  ) {
    normalized = received.map(item =>
      item.replaceAll(
        new RegExp(path.resolve(process.cwd()), "gm"),
        "<ROOT>",
      ),
    );
  }

  return normalized;
};
