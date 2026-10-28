/**
 * LootSpatialHash.ts — Índice espacial con celdas de 2 m para consultas O(1) de loot.
 * Evita recorridos lineales de 1.500 o 6.000 entradas para recolectores y fusiones.
 */

export class LootSpatialHash {
  readonly cellSize: number;
  private readonly invCellSize: number;
  /** Mapa de clave de celda a array de índices de pellets */
  private readonly cells = new Map<number, number[]>();
  /** Pool de arrays para evitar allocs en reinserciones */
  private readonly arrayPool: number[][] = [];

  constructor(cellSize = 2.0) {
    this.cellSize = cellSize;
    this.invCellSize = 1.0 / cellSize;
  }

  clear(): void {
    for (const arr of this.cells.values()) {
      arr.length = 0;
      if (this.arrayPool.length < 512) {
        this.arrayPool.push(arr);
      }
    }
    this.cells.clear();
  }

  private cellKey(cx: number, cy: number, cz: number): number {
    // Offset para garantizar enteros positivos dentro de los límites del pozo
    // (-24..24 m en X/Z y -240..5 m en Y; celdas de 2 m).
    const ox = (cx + 32) & 0x7f;
    const oz = (cz + 32) & 0x7f;
    const oy = (cy + 128) & 0xff;
    return ox | (oz << 7) | (oy << 14);
  }

  insert(index: number, x: number, y: number, z: number): void {
    const cx = Math.floor(x * this.invCellSize);
    const cy = Math.floor(y * this.invCellSize);
    const cz = Math.floor(z * this.invCellSize);
    const key = this.cellKey(cx, cy, cz);

    let cell = this.cells.get(key);
    if (!cell) {
      cell = this.arrayPool.pop() || [];
      this.cells.set(key, cell);
    }
    cell.push(index);
  }

  /**
   * Consulta todos los índices de pellets dentro de una caja contenedora de radio r.
   * Llama al callback con cada índice. Si el callback devuelve false, detiene la consulta.
   */
  queryRadius(
    x: number,
    y: number,
    z: number,
    radius: number,
    callback: (pelletIndex: number) => boolean | void,
  ): void {
    const minCX = Math.floor((x - radius) * this.invCellSize);
    const maxCX = Math.floor((x + radius) * this.invCellSize);
    const minCY = Math.floor((y - radius) * this.invCellSize);
    const maxCY = Math.floor((y + radius) * this.invCellSize);
    const minCZ = Math.floor((z - radius) * this.invCellSize);
    const maxCZ = Math.floor((z + radius) * this.invCellSize);

    for (let cy = minCY; cy <= maxCY; cy += 1) {
      for (let cz = minCZ; cz <= maxCZ; cz += 1) {
        for (let cx = minCX; cx <= maxCX; cx += 1) {
          const key = this.cellKey(cx, cy, cz);
          const cell = this.cells.get(key);
          if (!cell || cell.length === 0) continue;

          for (let i = 0; i < cell.length; i += 1) {
            const stop = callback(cell[i]);
            if (stop === false) return;
          }
        }
      }
    }
  }

  /**
   * Obtiene los índices vecinos en la misma celda o adyacentes para fusión rápida.
   */
  queryNeighbors(x: number, y: number, z: number, callback: (pelletIndex: number) => void): void {
    this.queryRadius(x, y, z, this.cellSize * 1.05, callback);
  }
}
