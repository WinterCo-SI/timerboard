#!/usr/bin/env node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import unzipper from 'unzipper';

const DEFAULT_X_MIN = 120;
const DEFAULT_X_MAX = 920;
const DEFAULT_Y_MIN = 110;
const DEFAULT_Y_MAX = 770;
const SYSTEM_X_MIN = 60;
const SYSTEM_X_MAX = 940;
const SYSTEM_Y_MIN = 70;
const SYSTEM_Y_MAX = 690;
const STATIC_DATA_PAGE = 'https://developers.eveonline.com/static-data';
const STATIC_DATA_LATEST = 'https://developers.eveonline.com/static-data/tranquility/latest.jsonl';
const STATIC_DATA_ARCHIVE_BASE = 'https://developers.eveonline.com/static-data/tranquility';

function projectPointsToBounds(points, xMin, xMax, yMin, yMax) {
  if (!points.length) return [];

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const pt of points) {
    minX = Math.min(minX, pt.x);
    maxX = Math.max(maxX, pt.x);
    minY = Math.min(minY, pt.y);
    maxY = Math.max(maxY, pt.y);
  }

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const xSpan = xMax - xMin;
  const ySpan = yMax - yMin;

  return points.map((pt) => {
    const nx = (pt.x - minX) / width;
    const ny = (pt.y - minY) / height;
    return [Math.round(xMin + nx * xSpan), Math.round(yMin + ny * ySpan)];
  });
}

function projectPoints(points) {
  return projectPointsToBounds(points, DEFAULT_X_MIN, DEFAULT_X_MAX, DEFAULT_Y_MIN, DEFAULT_Y_MAX);
}

function rotate180Point(point, xMin, xMax, yMin, yMax) {
  // Flip vertically only: invert Y within bounds, keep X unchanged.
  return [point[0], yMin + yMax - point[1]];
}

async function fetchStaticDataArchiveUrl() {
  const response = await fetch(STATIC_DATA_LATEST);
  if (!response.ok) {
    throw new Error(`Failed to load static data metadata: ${response.status} ${response.statusText}`);
  }

  const body = await response.text();
  const firstLine = body.split(/\r?\n/, 1)[0]?.trim();
  if (!firstLine) {
    throw new Error('Static data metadata response was empty.');
  }

  const metadata = JSON.parse(firstLine);
  const buildNumber = Number(metadata?.buildNumber);
  if (!Number.isFinite(buildNumber)) {
    throw new Error('Static data metadata did not include a valid buildNumber.');
  }

  return `${STATIC_DATA_ARCHIVE_BASE}/eve-online-static-data-${buildNumber}-jsonl.zip`;
}

async function extractStaticDataArchive(tempDir) {
  const archiveUrl = await fetchStaticDataArchiveUrl();
  const response = await fetch(archiveUrl);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download static data archive: ${response.status} ${response.statusText}`);
  }

  await pipeline(Readable.fromWeb(response.body), unzipper.Extract({ path: tempDir }));
  return archiveUrl;
}

async function readArchiveText(rootDir, fileName) {
  const directPath = path.join(rootDir, fileName);
  try {
    const stat = await fs.stat(directPath);
    if (stat.isFile()) return fs.readFile(directPath, 'utf8');
  } catch {
    // Fall through to recursive search.
  }

  const stack = [rootDir];
  while (stack.length) {
    const current = stack.pop();
    if (!current) continue;

    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && entry.name === fileName) {
        return fs.readFile(full, 'utf8');
      }
    }
  }

  throw new Error(`Could not find ${fileName} in extracted static data archive.`);
}

async function readArchiveJsonl(rootDir, fileName) {
  const text = await readArchiveText(rootDir, fileName);
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function englishName(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    if (typeof value.en === 'string' && value.en.trim()) return value.en.trim();
    const firstText = Object.values(value).find((item) => typeof item === 'string' && item.trim());
    if (typeof firstText === 'string') return firstText.trim();
  }
  return null;
}

function pointFrom(value) {
  if (!value || typeof value !== 'object') return null;
  const { x, y, z } = value;
  if ([x, y, z].every((entry) => typeof entry === 'number' && Number.isFinite(entry))) {
    return { x, y, z };
  }
  return null;
}

function pointFrom2D(value) {
  if (!value || typeof value !== 'object') return null;
  const { x, y } = value;
  if ([x, y].every((entry) => typeof entry === 'number' && Number.isFinite(entry))) {
    return { x, y };
  }
  return null;
}

function destinationGateId(stargateDoc) {
  const d = stargateDoc?.destination;
  if (typeof d === 'number') return d;
  if (d && typeof d === 'object') {
    if (typeof d.stargateID === 'number') return d.stargateID;
    if (typeof d.stargateId === 'number') return d.stargateId;
  }
  return null;
}

function pairKey(a, b) {
  return a < b ? `${a}__${b}` : `${b}__${a}`;
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('Generate map data from the official EVE static-data JSONL download.');
    console.log('');
    console.log('Usage:');
    console.log('  npm run generate:map-data');
    console.log('');
    console.log(`Metadata: ${STATIC_DATA_LATEST}`);
    console.log(`Page:     ${STATIC_DATA_PAGE}`);
    process.exit(0);
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'timers-map-data-'));
  let archiveUrl = '';

  try {
    archiveUrl = await extractStaticDataArchive(tempDir);
    const regionRows = await readArchiveJsonl(tempDir, 'mapRegions.jsonl');
    const systemRows = await readArchiveJsonl(tempDir, 'mapSolarSystems.jsonl');
    const stargateRows = await readArchiveJsonl(tempDir, 'mapStargates.jsonl');

    const regionNameById = new Map();
    const regionCenters = new Map();
    const regionSystems = new Map();
    const systemNameById = new Map();
    const systemCenters2D = new Map();
    const systemRegionById = new Map();
    const stargateToSystem = new Map();

    for (const doc of regionRows) {
      const regionId = Number(doc?._key);
      if (!Number.isFinite(regionId)) continue;

      const regionName = englishName(doc?.name) ?? String(regionId);
      regionNameById.set(regionId, regionName);

      const center3D = pointFrom(doc?.position);
      if (center3D) {
        regionCenters.set(regionId, { x: center3D.x, y: center3D.z });
      }

      if (!regionSystems.has(regionId)) regionSystems.set(regionId, new Set());
    }

    for (const doc of systemRows) {
      const systemId = Number(doc?._key);
      if (!Number.isFinite(systemId)) continue;

      const systemName = englishName(doc?.name) ?? String(systemId);
      const regionId = Number(doc?.regionID);
      if (!Number.isFinite(regionId)) continue;

      systemNameById.set(systemId, systemName);
      systemRegionById.set(systemId, regionId);

      // mapSolarSystems includes authoritative 2D coordinates for map layout parity.
      const center2D = pointFrom2D(doc?.position2D);
      if (center2D) systemCenters2D.set(String(systemId), center2D);

      if (!regionSystems.has(regionId)) regionSystems.set(regionId, new Set());
      regionSystems.get(regionId).add(String(systemId));

      const stargates = Array.isArray(doc?.stargateIDs) ? doc.stargateIDs : [];
      for (const gateId of stargates) {
        const gateNum = Number(gateId);
        if (Number.isFinite(gateNum)) {
          stargateToSystem.set(gateNum, systemId);
        }
      }
    }

    const edgeSets = new Map();
    const regionConnectionPairs = new Set();

    for (const doc of stargateRows) {
      const sourceGateId = Number(doc?._key);
      if (!Number.isFinite(sourceGateId)) continue;

      const sourceSystem = Number(doc?.solarSystemID);
      if (!Number.isFinite(sourceSystem)) continue;

      const destGateId = destinationGateId(doc);
      if (!destGateId) continue;

      const directDestSystem = Number(doc?.destination?.solarSystemID);
      const destSystem = Number.isFinite(directDestSystem) ? directDestSystem : stargateToSystem.get(destGateId);
      if (!Number.isFinite(destSystem)) continue;

      const srcRegion = systemRegionById.get(sourceSystem);
      const dstRegion = systemRegionById.get(destSystem);
      if (!Number.isFinite(srcRegion) || !Number.isFinite(dstRegion)) continue;

      if (srcRegion === dstRegion) {
        const regionKey = String(srcRegion);
        if (!edgeSets.has(regionKey)) edgeSets.set(regionKey, new Set());
        edgeSets.get(regionKey).add(pairKey(String(sourceSystem), String(destSystem)));
      } else {
        regionConnectionPairs.add(pairKey(String(srcRegion), String(dstRegion)));
      }
    }

    const regionIds = Array.from(regionSystems.keys())
      .sort((a, b) => Number(a) - Number(b))
      .map(Number)
      .filter((id) => id < 10001000 && id !== 10000017 && id !== 10000004 && id !== 10000019);

    const regionPoints = regionIds
      .map((regionId) => {
        const regionName = regionNameById.get(regionId) ?? regionId.toString();

        const systems = Array.from(regionSystems.get(regionId) ?? []);
        const coords = systems
          .map((sys) => systemCenters2D.get(sys))
          .filter(Boolean);
        if (!coords.length) {
          const c = regionCenters.get(regionId);
          if (c) return { ...c, name: regionName };
          return { x: 0, y: 0, name: regionName };
        }

        const avg = coords.reduce(
          (acc, cur) => ({ x: acc.x + cur.x, y: acc.y + cur.y }),
          { x: 0, y: 0 },
        );
        return {
          x: avg.x / coords.length,
          y: avg.y / coords.length,
          name: regionName,
        };
      });

    const projectedRegions = projectPoints(regionPoints).map((point) =>
      rotate180Point(point, DEFAULT_X_MIN, DEFAULT_X_MAX, DEFAULT_Y_MIN, DEFAULT_Y_MAX),
    );

    const REGION_POSITIONS = {};
    for (let i = 0; i < regionPoints.length; i += 1) {
      REGION_POSITIONS[regionPoints[i].name] = projectedRegions[i];
    }

    // if (!REGION_POSITIONS.Unknown) {
    //   REGION_POSITIONS.Unknown = [500, 350];
    // }

    const REGION_SYSTEMS = {};
    const REGION_SYSTEM_POSITIONS = {};
    for (const regionId of regionIds) {
      const regionName = regionNameById.get(regionId) ?? regionId.toString();
      const regionSystemIds = Array.from(regionSystems.get(regionId) ?? []);
      REGION_SYSTEMS[regionName] = regionSystemIds
        .map((systemId) => systemNameById.get(Number(systemId)) ?? systemId)
        .sort((a, b) => a.localeCompare(b));

      const systemPoints = regionSystemIds
        .map((systemId) => {
          const center = systemCenters2D.get(systemId);
          const systemName = systemNameById.get(Number(systemId)) ?? systemId;
          if (!center) return null;
          return { x: center.x, y: center.y, name: systemName };
        })
        .filter(Boolean);

      const projectedSystems = projectPointsToBounds(systemPoints, SYSTEM_X_MIN, SYSTEM_X_MAX, SYSTEM_Y_MIN, SYSTEM_Y_MAX);
      const positions = {};
      for (let i = 0; i < systemPoints.length; i += 1) {
        positions[systemPoints[i].name] = projectedSystems[i];
      }
      REGION_SYSTEM_POSITIONS[regionName] = positions;
    }

    // if (!REGION_SYSTEMS.Unknown) {
    //   REGION_SYSTEMS.Unknown = [];
    // }

    const REGION_EDGES = {};
    for (const regionId of regionIds) {
      const regionName = regionNameById.get(regionId) ?? regionId.toString();
      const pairs = Array.from(edgeSets.get(String(regionId)) ?? []);
      REGION_EDGES[regionName] = pairs
        .map((k) => k.split('__'))
        .filter((v) => v.length === 2)
        .map(([sourceSystemId, destSystemId]) => [
          systemNameById.get(Number(sourceSystemId)) ?? sourceSystemId,
          systemNameById.get(Number(destSystemId)) ?? destSystemId,
        ])
        .sort((a, b) => {
          const sa = `${a[0]}-${a[1]}`;
          const sb = `${b[0]}-${b[1]}`;
          return sa.localeCompare(sb);
        });
    }

    const allowedRegionIds = new Set(regionIds);
    const REGION_CONNECTIONS = Array.from(regionConnectionPairs)
      .map((key) => key.split('__'))
      .filter((parts) => parts.length === 2)
      .map(([sourceRegionId, destRegionId]) => [Number(sourceRegionId), Number(destRegionId)])
      .filter(([sourceRegionId, destRegionId]) => allowedRegionIds.has(sourceRegionId) && allowedRegionIds.has(destRegionId))
      .map(([sourceRegionId, destRegionId]) => [
        regionNameById.get(sourceRegionId) ?? String(sourceRegionId),
        regionNameById.get(destRegionId) ?? String(destRegionId),
      ])
      .sort((a, b) => {
        const sa = `${a[0]}-${a[1]}`;
        const sb = `${b[0]}-${b[1]}`;
        return sa.localeCompare(sb);
      });

    // if (!REGION_EDGES.Unknown) {
    //   REGION_EDGES.Unknown = [];
    // }

    const outputPath = path.resolve('src/data/map.generated.ts');
    const output = `// Auto-generated by scripts/generate-map-data.mjs\n// Source: ${archiveUrl || STATIC_DATA_PAGE}\n\nexport const REGION_POSITIONS: Record<string, [number, number]> = ${JSON.stringify(REGION_POSITIONS, null, 2)};\n\nexport const REGION_SYSTEMS: Record<string, string[]> = ${JSON.stringify(REGION_SYSTEMS, null, 2)};\n\nexport const REGION_SYSTEM_POSITIONS: Record<string, Record<string, [number, number]>> = ${JSON.stringify(REGION_SYSTEM_POSITIONS, null, 2)};\n\nexport const REGION_EDGES: Record<string, Array<[string, string]>> = ${JSON.stringify(REGION_EDGES, null, 2)};\n\nexport const REGION_CONNECTIONS: Array<[string, string]> = ${JSON.stringify(REGION_CONNECTIONS, null, 2)};\n`;

    await fs.writeFile(outputPath, output, 'utf8');

    console.log(`Generated map data:`);
    console.log(`  Source:  ${archiveUrl}`);
    console.log(`  Regions: ${regionIds.length}`);
    console.log(`  Systems: ${Object.values(REGION_SYSTEMS).reduce((a, b) => a + b.length, 0)}`);
    console.log(`  Output:  ${outputPath}`);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
