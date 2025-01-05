import "jest";

declare global {
  namespace jest {
    interface Matchers<R> {
    /**
     * Custom Jest matcher to compare snapshots with mocked path.resolve().
     */
      toMatchSnapshotWithNormalizedPaths(): R;
    }
  }
}