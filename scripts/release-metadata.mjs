#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

export async function readReleaseMetadata({
  repoRoot,
  releaseChannel = process.env.RELEASE_CHANNEL ?? "tag",
  refName = process.env.RELEASE_REF_NAME ?? process.env.GITHUB_REF_NAME,
  releaseSha = process.env.RELEASE_SHA ?? process.env.GITHUB_SHA ?? "local",
} = {}) {
  const packageJsonPath = path.join(repoRoot, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const packageVersion = packageJson.version;
  const tagVersion = refName?.startsWith("v") ? refName.slice(1) : null;
  const shortSha = releaseSha.slice(0, 7);
  const buildDate = new Date().toISOString().slice(0, 10);

  if (releaseChannel !== "main" && tagVersion && tagVersion !== packageVersion) {
    throw new Error(
      `Tag ${refName} does not match package.json version ${packageVersion}. ` +
      "Update package.json before publishing this release."
    );
  }

  const isPrerelease = packageVersion.includes("-");

  return {
    buildDate,
    packageVersion,
    refName,
    releaseChannel,
    releaseSha,
    shortSha,
    isPrerelease,
  };
}
