import type { Game } from '../core/Game';
import {
  MAX_BRIGADE_HEADCOUNT,
  brigadeUpgradeCost,
} from '../entities/Brigades';
import { formatMoney, formatNumber } from './format';

export class BrigadeModal {
  private readonly container: HTMLElement | null;
  private readonly sectorsList: HTMLElement | null;
  private readonly rosterList: HTMLElement | null;
  private readonly closeBtn: HTMLElement | null;
  private readonly hireMinerBtn: HTMLElement | null;
  private readonly hireGathererBtn: HTMLElement | null;
  private readonly game: Game;

  constructor(game: Game) {
    this.game = game;
    this.container = document.getElementById('brigades-overlay');
    this.sectorsList = document.getElementById('brigades-sectors-list');
    this.rosterList = document.getElementById('brigades-roster-list');
    this.closeBtn = document.getElementById('brigades-close-btn');
    this.hireMinerBtn = document.getElementById('brigades-hire-miner-btn');
    this.hireGathererBtn = document.getElementById('brigades-hire-gatherer-btn');

    this.bindEvents();
  }

  private bindEvents(): void {
    this.closeBtn?.addEventListener('click', () => this.hide());
    document.getElementById('shop-brigades-btn')?.addEventListener('click', () => this.show());

    this.hireMinerBtn?.addEventListener('click', () => {
      if (this.game.run.money < 450) {
        this.game.ui.notify('CAPITAL INSUFICIENTE · Se requieren $ 450 para contratar una brigada', 'danger');
        return;
      }
      const sectors = this.game.brigades.getSectors();
      const sectorId = sectors.length > 0 ? sectors[0].id : '';
      const b = this.game.brigades.hireBrigade('miners', sectorId, this.game.seed + Date.now());
      if (b) {
        this.game.run.money -= 450;
        this.game.ui.notify(`BRIGADA MINERA CONTRATADA · ${b.name}`, 'positive');
        this.render();
      }
    });

    this.hireGathererBtn?.addEventListener('click', () => {
      if (this.game.run.money < 450) {
        this.game.ui.notify('CAPITAL INSUFICIENTE · Se requieren $ 450 para contratar una brigada', 'danger');
        return;
      }
      const sectors = this.game.brigades.getSectors();
      const sectorId = sectors.length > 0 ? sectors[0].id : '';
      const b = this.game.brigades.hireBrigade('gatherers', sectorId, this.game.seed + Date.now());
      if (b) {
        this.game.run.money -= 450;
        this.game.ui.notify(`BRIGADA DE FLETE CONTRATADA · ${b.name}`, 'positive');
        this.render();
      }
    });
  }

  render(): void {
    if (this.sectorsList) {
      this.sectorsList.replaceChildren();
      const sectors = this.game.brigades.getSectors();
      if (sectors.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-copy';
        empty.textContent = 'Sin sectores delimitados. Coloca una baliza de sector en el pozo.';
        this.sectorsList.appendChild(empty);
      } else {
        for (const s of sectors) {
          const row = document.createElement('div');
          row.className = 'brigade-row';
          row.innerHTML = `
            <strong>${s.name || s.id.toUpperCase()}</strong>
            <span>Capa ${s.layer} · Densidad ${(s.density * 100).toFixed(0)}% · Radio ${s.radius}m</span>
          `;
          this.sectorsList.appendChild(row);
        }
      }
    }

    if (this.rosterList) {
      this.rosterList.replaceChildren();
      const brigades = this.game.brigades.getBrigades();
      if (brigades.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-copy';
        empty.textContent = 'Sin brigadas activas. Contrata brigadas para extracción en sectores.';
        this.rosterList.appendChild(empty);
      } else {
        for (const b of brigades) {
          const scaleCost = brigadeUpgradeCost(b);
          const row = document.createElement('div');
          row.className = 'brigade-row';
          row.innerHTML = `
            <div>
              <strong>${b.name}</strong>
              <div style="font-size: 0.68rem; color: var(--muted);">${formatNumber(b.headcount)} operarios · Rango ${b.rank}/5 · ${b.sectorId ? 'Asignada' : 'En reserva'}</div>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end;">
              <button class="button ghost small" type="button" data-brigade-promote="${b.id}" ${b.rank >= 5 || this.game.run.money < 300 ? 'disabled' : ''}>ASCENDER ($300)</button>
              <button class="button ghost small" type="button" data-brigade-scale="${b.id}" ${b.headcount >= MAX_BRIGADE_HEADCOUNT || this.game.run.money < scaleCost ? 'disabled' : ''}>AMPLIAR ×10 (${formatMoney(scaleCost)})</button>
            </div>
          `;
          row.querySelector(`[data-brigade-promote="${b.id}"]`)?.addEventListener('click', () => {
            if (this.game.run.money >= 300 && this.game.brigades.promoteBrigade(b.id)) {
              this.game.run.money -= 300;
              this.game.ui.notify(`${b.name} ASCENDIDA A RANGO ${b.rank}`, 'positive');
              this.render();
            }
          });
          row.querySelector(`[data-brigade-scale="${b.id}"]`)?.addEventListener('click', () => {
            const cost = brigadeUpgradeCost(b);
            if (this.game.run.money >= cost && this.game.brigades.upgradeBrigade(b.id)) {
              this.game.run.money -= cost;
              this.game.ui.notify(
                `${b.name} AMPLIADA · ${formatNumber(b.headcount)} operarios`,
                'positive',
              );
              this.render();
            }
          });
          this.rosterList.appendChild(row);
        }
      }
    }
  }

  show(): void {
    this.render();
    if (this.container) {
      this.container.removeAttribute('hidden');
      this.container.style.display = 'flex';
    }
  }

  hide(): void {
    if (this.container) {
      this.container.setAttribute('hidden', '');
      this.container.style.display = 'none';
    }
  }
}
