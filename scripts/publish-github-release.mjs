#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import { readReleaseMetadata } from "./release-metadata.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const [owner, repo] = repository ? repository.split("/") : [];
const refName = process.env.RELEASE_REF_NAME ?? process.env.GITHUB_REF_NAME;
const sha = process.env.RELEASE_SHA ?? process.env.GITHUB_SHA;
const releaseChannel = process.env.RELEASE_CHANNEL ?? "tag";

if (!token) {
  console.log("Skipping GitHub release publish because GITHUB_TOKEN is not set.");
  process.exit(0);
}

if (!owner || !repo || !refName || !sha) {
  throw new Error("Missing repository context. Expected GITHUB_REPOSITORY, GITHUB_REF_NAME, and GITHUB_SHA.");
}

const {
  buildDate,
  packageVersion,
  shortSha,
  isPrerelease,
} = await readReleaseMetadata({ repoRoot, releaseChannel, refName, releaseSha: sha });

const releaseConfig = releaseChannel === "main"
  ? {
      tagName: `main-build-${buildDate}-${shortSha}`,
      releaseName: `Main Build ${buildDate} ${shortSha}`,
      prerelease: true,
      releaseBody: [
        `Automated rolling main-branch build from ${buildDate}.`,
        "",
        `Package version: ${packageVersion}`,
        `Branch: ${refName}`,
        `Commit: ${sha}`,
      ].join("\n"),
    }
  : {
      tagName: refName,
      releaseName: `rex-core ${refName}`,
      prerelease: isPrerelease,
      releaseBody: [
        `Release ${refName}.`,
        "",
        `Package version: ${packageVersion}`,
        `Commit: ${sha}`,
        "",
        `Consumers can reference this release with: \`github:bric-digital/rex-core#${refName}\``,
      ].join("\n"),
    };

async function githubRequest(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API request failed (${response.status} ${response.statusText}): ${body}`);
  }

  return response;
}

async function ensureRelease() {
  const createResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      tag_name: releaseConfig.tagName,
      target_commitish: sha,
      name: releaseConfig.releaseName,
      body: releaseConfig.releaseBody,
      draft: false,
      prerelease: releaseConfig.prerelease,
      generate_release_notes: false,
    }),
  });

  if (createResponse.ok) {
    return createResponse.json();
  }

  if (createResponse.status !== 422) {
    const body = await createResponse.text();
    throw new Error(`Failed to create release (${createResponse.status}): ${body}`);
  }

  const existingResponse = await githubRequest(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${releaseConfig.tagName}`);
  const release = await existingResponse.json();

  await githubRequest(`https://api.github.com/repos/${owner}/${repo}/releases/${release.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target_commitish: sha,
      name: releaseConfig.releaseName,
      body: releaseConfig.releaseBody,
      draft: false,
      prerelease: releaseConfig.prerelease,
      generate_release_notes: false,
    }),
  });

  const refreshedResponse = await githubRequest(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${releaseConfig.tagName}`);
  return refreshedResponse.json();
}

async function ensureTagRef(tagName, targetSha) {
  const refUrl = `https://api.github.com/repos/${owner}/${repo}/git/refs/tags/${tagName}`;
  const refResponse = await fetch(refUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (refResponse.status === 404) {
    await githubRequest(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: `refs/tags/${tagName}`,
        sha: targetSha,
      }),
    });

    return;
  }

  if (!refResponse.ok) {
    const body = await refResponse.text();
    throw new Error(`Failed to read tag ref ${tagName} (${refResponse.status}): ${body}`);
  }

  await githubRequest(refUrl, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sha: targetSha,
      force: true,
    }),
  });
}

if (releaseChannel === "main") {
  await ensureTagRef(releaseConfig.tagName, sha);
}

const release = await ensureRelease();
console.log(`Published release ${releaseConfig.releaseName} (id ${release.id}).`);
