#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const rawVersion = process.argv[2];

function deriveNextVersion(version) {
  const rcMatch = version.match(/^(\d+)\.(\d+)\.(\d+)-rc\.(\d+)$/);
  if (rcMatch) {
    const [, major, minor, patch, rc] = rcMatch;
    return `${major}.${minor}.${patch}-rc.${Number.parseInt(rc, 10) + 1}`;
  }

  const stableMatch = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (stableMatch) {
    const [, major, minor, patch] = stableMatch;
    return `${major}.${minor}.${Number.parseInt(patch, 10) + 1}`;
  }

  throw new Error(`Cannot derive next version from ${version}.`);
}

if (!rawVersion) {
  throw new Error("Usage: npm run release:tag -- <version>");
}

const version = rawVersion.startsWith("v") ? rawVersion.slice(1) : rawVersion;

if (!/^\d+\.\d+\.\d+(?:-rc\.\d+)?$/.test(version)) {
  throw new Error(`Invalid version: ${rawVersion}. Expected X.Y.Z or X.Y.Z-rc.N`);
}

const tagName = `v${version}`;
const packageJsonPath = path.join(repoRoot, "package.json");
const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
const currentVersion = packageJson.version;

if (currentVersion !== version) {
  throw new Error(
    `package.json version is ${currentVersion}, but release:tag expects ${version}. ` +
    "Update package.json before running release:tag."
  );
}

const statusOutput = execFileSync("git", ["status", "--porcelain"], {
  cwd: repoRoot,
  encoding: "utf8",
}).trim();

if (statusOutput.length > 0) {
  throw new Error("Release tagging requires a clean git working tree.");
}

try {
  execFileSync("git", ["rev-parse", "--verify", "--quiet", tagName], {
    cwd: repoRoot,
    stdio: "ignore",
  });
  throw new Error(`Git tag ${tagName} already exists.`);
} catch (error) {
  if (error.message === `Git tag ${tagName} already exists.`) {
    throw error;
  }
}

const branchName = execFileSync("git", ["branch", "--show-current"], {
  cwd: repoRoot,
  encoding: "utf8",
}).trim();

execFileSync("git", ["tag", "-a", tagName, "-m", `Release ${tagName}`], {
  cwd: repoRoot,
  stdio: "inherit",
});

const nextVersion = deriveNextVersion(version);
packageJson.version = nextVersion;
await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 4)}\n`);

execFileSync("git", ["add", "package.json"], {
  cwd: repoRoot,
  stdio: "inherit",
});

execFileSync("git", ["commit", "-m", `Start v${nextVersion} development`], {
  cwd: repoRoot,
  stdio: "inherit",
});

console.log(`Created tag ${tagName}.`);
console.log(`Bumped package.json to ${nextVersion} in a follow-up commit.`);
if (branchName) {
  console.log(`Push with: git push origin ${branchName} --follow-tags`);
} else {
  console.log("Push your branch and tags when you're ready.");
}
