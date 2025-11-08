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

const normalizeReceived = (received: any): any => {
  const rootPath = path.resolve(process.cwd());
  const rootPathRegex = new RegExp(rootPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "gm");

  const normalize = (value: any): any => {
    if (typeof value === "string") {
      return value.replaceAll(rootPathRegex, "<ROOT>");
    } else if (value instanceof Date) {
      // Preserve Date objects as-is
      return value;
    } else if (Array.isArray(value)) {
      return value.map(item => normalize(item));
    } else if (value && typeof value === "object") {
      const normalized: any = {};
      for (const key in value) {
        if (value.hasOwnProperty(key)) {
          normalized[key] = normalize(value[key]);
        }
      }
      return normalized;
    }
    return value;
  };

  return normalize(received);
};
