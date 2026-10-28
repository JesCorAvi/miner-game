import {
  CLAUSES,
  DOCTRINES,
} from '../core/Progression';
import type { ClauseId, DoctrineId, RunSnapshot } from '../types';

export class DoctrineModal {
  private readonly container: HTMLElement | null;
  private readonly cardsContainer: HTMLElement | null;
  private readonly clausesContainer: HTMLElement | null;
  private readonly reserveStatus: HTMLElement | null;
  private readonly closeBtn: HTMLElement | null;
  private currentRun: RunSnapshot | null = null;
  private isHost = true;
  private onUpdateCallback: (() => void) | null = null;

  constructor() {
    this.container = document.getElementById('doctrine-overlay');
    this.cardsContainer = document.getElementById('doctrine-cards');
    this.clausesContainer = document.getElementById('doctrine-clauses-grid');
    this.reserveStatus = document.getElementById('doctrine-reserve-status');
    this.closeBtn = document.getElementById('doctrine-close-btn');

    this.closeBtn?.addEventListener('click', () => this.hide());
  }

  show(run: RunSnapshot, isHost = true, onUpdate?: () => void): void {
    this.currentRun = run;
    this.isHost = isHost;
    this.onUpdateCallback = onUpdate ?? null;
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

  private render(): void {
    if (!this.currentRun) return;
    const loadout = this.currentRun.loadout;
    const currentDoctrine = loadout.doctrine ?? null;
    const currentClauses = loadout.clauses ?? [];

    if (this.cardsContainer) {
      this.cardsContainer.replaceChildren();

      // Opción estándar sin doctrina
      const defaultCard = document.createElement('article');
      defaultCard.className = `doctrine-card${currentDoctrine === null ? ' is-active' : ''}`;
      defaultCard.innerHTML = `
        <div class="doctrine-card-title">
          <span>OPERACIÓN ESTÁNDAR</span>
          <span class="doctrine-badge">${currentDoctrine === null ? 'ACTIVA' : 'ELEGIR'}</span>
        </div>
        <div class="doctrine-motto">Procedimientos operativos estándar sin restricciones.</div>
        <ul class="doctrine-list doctrine-perks">
          <li>Sin penalizaciones en tienda ni cuota.</li>
          <li>Acceso a todas las herramientas estándar.</li>
        </ul>
      `;
      if (this.isHost) {
        defaultCard.addEventListener('click', () => {
          loadout.doctrine = null;
          this.render();
          this.onUpdateCallback?.();
        });
      }
      this.cardsContainer.appendChild(defaultCard);

      for (const [id, def] of Object.entries(DOCTRINES)) {
        const docId = id as DoctrineId;
        const isActive = currentDoctrine === docId;
        const card = document.createElement('article');
        card.className = `doctrine-card${isActive ? ' is-active' : ''}`;

        const perksHtml = def.perks.map((p) => `<li>+ ${p}</li>`).join('');
        const prohibitionsHtml = def.prohibitions.map((p) => `<li>- ${p}</li>`).join('');

        card.innerHTML = `
          <div class="doctrine-card-title">
            <span>${def.name}</span>
            <span class="doctrine-badge">${isActive ? 'ACTIVA' : 'RATIFICAR'}</span>
          </div>
          <div class="doctrine-motto">"${def.motto}"</div>
          <ul class="doctrine-list doctrine-perks">${perksHtml}</ul>
          <ul class="doctrine-list doctrine-prohibitions">${prohibitionsHtml}</ul>
        `;

        if (this.isHost) {
          card.addEventListener('click', () => {
            loadout.doctrine = docId;
            this.render();
            this.onUpdateCallback?.();
          });
        }
        this.cardsContainer.appendChild(card);
      }
    }

    if (this.clausesContainer) {
      this.clausesContainer.replaceChildren();
      for (const [id, def] of Object.entries(CLAUSES)) {
        const clauseId = id as ClauseId;
        const isActive = currentClauses.includes(clauseId);
        const card = document.createElement('div');
        card.className = `clause-card${isActive ? ' is-active' : ''}`;
        card.innerHTML = `
          <div class="clause-head">
            <strong>${def.name}</strong>
            <span class="doctrine-badge">${isActive ? 'RATIFICADA' : 'INACTIVA'}</span>
          </div>
          <div class="clause-desc">${def.description}</div>
        `;

        if (this.isHost) {
          card.addEventListener('click', () => {
            if (isActive) {
              loadout.clauses = (loadout.clauses ?? []).filter((c) => c !== clauseId);
            } else {
              loadout.clauses = [...(loadout.clauses ?? []), clauseId];
            }
            this.render();
            this.onUpdateCallback?.();
          });
        }
        this.clausesContainer.appendChild(card);
      }
    }

    if (this.reserveStatus) {
      const reserve = loadout.reserveCarbon ?? 0;
      const nextQuota = this.currentRun.quota;
      const maxAmortize = Math.floor(nextQuota * 0.2);
      const willAmortize = Math.min(reserve, maxAmortize);
      this.reserveStatus.textContent = `RESERVA ACUMULADA: ${reserve} t · Amortizará ${willAmortize} t de la próxima cuota (${nextQuota} t)`;
    }
  }
}
