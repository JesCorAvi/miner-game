import * as THREE from 'three';
import { triTable } from 'three/addons/objects/MarchingCubes.js';

export interface DensityGrid {
  data: Float32Array;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  originX: number;
  originY: number;
  originZ: number;
  cellSize: number;
}

export interface ChunkGeometryData {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  triangleCount: number;
}

export type VertexColorFn = (x: number, y: number, z: number, out: THREE.Color) => void;

const CORNERS: readonly (readonly [number, number, number])[] = [
  [0, 0, 0],
  [1, 0, 0],
  [1, 1, 0],
  [0, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [1, 1, 1],
  [0, 1, 1],
] as const;

const EDGES: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
] as const;

const ISO_LEVEL = 0.5;

export function buildChunkGeometry(
  grid: DensityGrid,
  startIX: number,
  startIY: number,
  startIZ: number,
  cellsX: number,
  cellsY: number,
  cellsZ: number,
  colorAt: VertexColorFn,
): ChunkGeometryData | null {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const color = new THREE.Color();
  const strideY = grid.sizeX * grid.sizeZ;
  const values = new Float32Array(8);
  const xCoords = new Float32Array(8);
  const yCoords = new Float32Array(8);
  const zCoords = new Float32Array(8);
  const edgeVertices = new Float32Array(12 * 3);

  const maxX = Math.min(grid.sizeX - 1, startIX + cellsX);
  const maxY = Math.min(grid.sizeY - 1, startIY + cellsY);
  const maxZ = Math.min(grid.sizeZ - 1, startIZ + cellsZ);

  for (let iz = startIZ; iz < maxZ; iz += 1) {
    for (let iy = startIY; iy < maxY; iy += 1) {
      for (let ix = startIX; ix < maxX; ix += 1) {
        let cubeIndex = 0;
        for (let corner = 0; corner < 8; corner += 1) {
          const [cx, cy, cz] = CORNERS[corner];
          const index = ix + cx + (iz + cz) * grid.sizeX + (iy + cy) * strideY;
          const value = grid.data[index];
          values[corner] = value;
          xCoords[corner] = (ix + cx) * grid.cellSize + grid.originX;
          yCoords[corner] = (iy + cy) * grid.cellSize + grid.originY;
          zCoords[corner] = (iz + cz) * grid.cellSize + grid.originZ;
          if (value > ISO_LEVEL) {
            cubeIndex |= 1 << corner;
          }
        }
        if (cubeIndex === 0 || cubeIndex === 255) {
          continue;
        }

        // Gradient points towards denser material; the visible normal points towards the air.
        const gradientX =
          (values[1] + values[2] + values[5] + values[6]) / 4 -
          (values[0] + values[3] + values[4] + values[7]) / 4;
        const gradientY =
          (values[2] + values[3] + values[6] + values[7]) / 4 -
          (values[0] + values[1] + values[4] + values[5]) / 4;
        const gradientZ =
          (values[4] + values[5] + values[6] + values[7]) / 4 -
          (values[0] + values[1] + values[2] + values[3]) / 4;
        let outwardX = -gradientX;
        let outwardY = -gradientY;
        let outwardZ = -gradientZ;
        const outwardLength = Math.hypot(outwardX, outwardY, outwardZ);
        if (outwardLength < 1e-5) {
          outwardX = 0;
          outwardY = 1;
          outwardZ = 0;
        } else {
          outwardX /= outwardLength;
          outwardY /= outwardLength;
          outwardZ /= outwardLength;
        }

        for (let edge = 0; edge < 12; edge += 1) {
          const [a, b] = EDGES[edge];
          const valueA = values[a];
          const valueB = values[b];
          if ((valueA > ISO_LEVEL) === (valueB > ISO_LEVEL)) {
            continue;
          }
          const denominator = valueB - valueA;
          const t = Math.abs(denominator) < 1e-6 ? 0.5 : (ISO_LEVEL - valueA) / denominator;
          edgeVertices[edge * 3] = xCoords[a] + (xCoords[b] - xCoords[a]) * t;
          edgeVertices[edge * 3 + 1] = yCoords[a] + (yCoords[b] - yCoords[a]) * t;
          edgeVertices[edge * 3 + 2] = zCoords[a] + (zCoords[b] - zCoords[a]) * t;
        }

        const tableOffset = cubeIndex * 16;
        for (let index = 0; index < 16 && triTable[tableOffset + index] !== -1; index += 3) {
          const e0 = triTable[tableOffset + index];
          const e1 = triTable[tableOffset + index + 1];
          const e2 = triTable[tableOffset + index + 2];
          const ax = edgeVertices[e0 * 3];
          const ay = edgeVertices[e0 * 3 + 1];
          const az = edgeVertices[e0 * 3 + 2];
          let bx = edgeVertices[e1 * 3];
          let by = edgeVertices[e1 * 3 + 1];
          let bz = edgeVertices[e1 * 3 + 2];
          let cx = edgeVertices[e2 * 3];
          let cy = edgeVertices[e2 * 3 + 1];
          let cz = edgeVertices[e2 * 3 + 2];

          let nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
          let ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
          let nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
          if (nx * outwardX + ny * outwardY + nz * outwardZ < 0) {
            const tempX = bx;
            const tempY = by;
            const tempZ = bz;
            bx = cx;
            by = cy;
            bz = cz;
            cx = tempX;
            cy = tempY;
            cz = tempZ;
            nx = -nx;
            ny = -ny;
            nz = -nz;
          }
          const normalLength = Math.hypot(nx, ny, nz);
          if (normalLength < 1e-6) {
            continue;
          }
          nx /= normalLength;
          ny /= normalLength;
          nz /= normalLength;

          positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
          normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
          colorAt((ax + bx + cx) / 3, (ay + by + cy) / 3, (az + bz + cz) / 3, color);
          colors.push(color.r, color.g, color.b, color.r, color.g, color.b, color.r, color.g, color.b);
        }
      }
    }
  }

  if (positions.length === 0) {
    return null;
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    colors: new Float32Array(colors),
    triangleCount: positions.length / 9,
  };
}

export function createTerrainMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.94,
    metalness: 0.02,
    emissive: 0x010202,
    emissiveIntensity: 0.1,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vPixelRockWorld;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vPixelRockWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vPixelRockWorld;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 pixelCell = floor(vPixelRockWorld * 1.7);
        float pixelHash = fract(sin(dot(pixelCell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        float surface = 1.0 - smoothstep(1.5, 6.0, abs(vPixelRockWorld.y));
        float grit = mix(0.86 + pixelHash * 0.26, 0.95 + pixelHash * 0.1, surface);
        diffuseColor.rgb *= grit;
        vec3 pixelGrid = abs(fract(vPixelRockWorld * 1.0) - 0.5);
        float pixelSeam = smoothstep(0.455, 0.5, max(pixelGrid.x, max(pixelGrid.y, pixelGrid.z)));
        diffuseColor.rgb *= 1.0 - pixelSeam * mix(0.055, 0.025, surface);`,
      );
  };
  material.customProgramCacheKey = () => 'carbon-terrain-pixel-2';
  return material;
}

export function geometryFromChunk(data: ChunkGeometryData): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  return geometry;
}
