import {
  PROFESSION_ORDER,
  WEAPONS,
  professionAllowsJetpack,
  professionDefinition,
  professionMoveSpeedMultiplier,
  professionStartingWeapon,
  professionWeaponPool,
  weaponFamily,
} from '../config';
import { DIFFICULTY_MODIFIERS, GAME_MODES } from '../data/modes';
import { MAPS } from '../data/maps';
import type { DifficultyModifier, GameMode, ProfessionId, WeaponId } from '../types';
import { itemIconUrl } from './ItemIcon';
import { cssHex } from './MineralIcon';
import { loadSetupPreferences, saveSetupPreferences } from '../save/SaveManager';

export interface ExpeditionConfig {
  mode: GameMode;
  map: string;
  profession: ProfessionId;
  modifiers: DifficultyModifier[];
}

export interface ExpeditionSetupActions {
  onConfirm: (config: ExpeditionConfig) => void;
}

type Intent = 'solo' | 'host';

const CLASS_ROLES: Record<string, string> = {
  internship: 'EQUILIBRADO',
  shaman: 'ELEMENTAL',
  gunslinger: 'ARMAS DE FUEGO',
  shotgunner: 'MONO-ARMA',
  wizard: 'MAGIA',
  barbarian: 'MELEE',
  martialArtist: 'DUAL',
  loneRanger: 'SOLITARIO',
  demolitionist: 'DEMOLICIÓN',
  waterbender: 'AGUA',
  maverick: 'AÉREO',
  lumberjack: 'MELEE PESADO',
  destructor: 'DESTRUCCIÓN',
  mule: 'LOGÍSTICA',
  generalist: 'VERSÁTIL',
};

function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function required<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`No se encontró ${selector} en la configuración de expedición`);
  return element as T;
}

export class ExpeditionSetupView {
  private readonly overlay: HTMLElement;
  private readonly classGrid: HTMLElement;
  private readonly heroIcon: HTMLElement;
  private readonly heroShort: HTMLElement;
  private readonly heroName: HTMLElement;
  private readonly heroMotto: HTMLElement;
  private readonly heroMeta: HTMLElement;
  private readonly description: HTMLElement;
  private readonly perks: HTMLElement;
  private readonly prohibitions: HTMLElement;
  private readonly arsenal: HTMLElement;
  private readonly starting: HTMLElement;
  private readonly modes: HTMLElement;
  private readonly mapSelect: HTMLSelectElement;
  private readonly mapDescription: HTMLElement;
  private readonly clauses: HTMLElement;
  private readonly summary: HTMLElement;
  private readonly confirm: HTMLButtonElement;
  private readonly title: HTMLElement;
  private readonly kicker: HTMLElement;
  private readonly actions: ExpeditionSetupActions;
  private readonly cards = new Map<string, HTMLButtonElement>();
  private readonly modeButtons = new Map<GameMode, HTMLButtonElement>();
  private readonly clauseButtons = new Map<DifficultyModifier, HTMLButtonElement>();
  private selectedProfession: ProfessionId = 'internship';
  private mode: GameMode = 'normal';
  private map = 'standard';
  private readonly modifiers = new Set<DifficultyModifier>();

  constructor(actions: ExpeditionSetupActions) {
    this.actions = actions;
    this.overlay = node('section', 'overlay modal-overlay setup-overlay');
    this.overlay.id = 'expedition-setup-overlay';
    this.overlay.hidden = true;
    this.overlay.setAttribute('aria-label', 'Configuración de expedición');
    this.overlay.innerHTML = `
      <div class="pixel-shell setup-shell">
        <div class="panel-corners" aria-hidden="true"></div>
        <header class="shell-head setup-head">
          <div>
            <span id="setup-kicker" class="eyebrow">DIRECTIVA DE OPERACIONES</span>
            <h2 id="setup-title">CONFIGURAR EXPEDICIÓN</h2>
          </div>
          <div class="setup-head-actions">
            <span class="setup-step">PASO ÚNICO</span>
            <button id="setup-cancel" class="button ghost small" type="button">CANCELAR</button>
          </div>
        </header>
        <div class="setup-body">
          <aside class="setup-class-panel">
            <div class="setup-panel-head">
              <span class="section-label">PROFESIÓN</span>
              <span id="setup-class-count" class="setup-count">15</span>
            </div>
            <div id="setup-class-grid" class="setup-class-grid"></div>
          </aside>
          <section class="setup-detail-panel">
            <div class="setup-hero">
              <div id="setup-hero-icon" class="setup-hero-icon"></div>
              <div class="setup-hero-copy">
                <span id="setup-hero-short" class="setup-hero-short"></span>
                <h3 id="setup-hero-name"></h3>
                <p id="setup-hero-motto"></p>
              </div>
              <div id="setup-hero-meta" class="setup-meta"></div>
            </div>
            <p id="setup-description" class="setup-description"></p>
            <div class="setup-lists">
              <div>
                <span class="section-label">VENTAJAS</span>
                <ul id="setup-perks" class="setup-list setup-list-positive"></ul>
              </div>
              <div>
                <span class="section-label">RESTRICCIONES</span>
                <ul id="setup-prohibitions" class="setup-list setup-list-negative"></ul>
              </div>
            </div>
            <div class="setup-arsenal-block">
              <span class="section-label">ARSENAL COMPRABLE</span>
              <div id="setup-arsenal" class="setup-arsenal"></div>
              <p id="setup-starting" class="setup-starting"></p>
            </div>
          </section>
        </div>
        <section class="setup-config">
          <div class="setup-config-group setup-mode-group">
            <span class="section-label">MODO DE JORNADA</span>
            <div id="setup-modes" class="setup-mode-row"></div>
          </div>
          <div class="setup-config-group setup-map-group">
            <label for="setup-map" class="section-label">TOPOLOGÍA</label>
            <select id="setup-map" class="field setup-map-select"></select>
            <p id="setup-map-desc" class="setup-microcopy"></p>
          </div>
          <div class="setup-config-group setup-clause-group">
            <span class="section-label">CLÁUSULAS DE DIFICULTAD</span>
            <div id="setup-clauses" class="setup-clause-row"></div>
          </div>
        </section>
        <footer class="shell-foot setup-foot">
          <div id="setup-summary" class="setup-summary"></div>
          <button id="setup-confirm" class="button primary large setup-confirm" type="button">
            INICIAR EXPEDICIÓN
          </button>
        </footer>
      </div>
    `;
    document.body.appendChild(this.overlay);
    this.classGrid = required(this.overlay, '#setup-class-grid');
    this.heroIcon = required(this.overlay, '#setup-hero-icon');
    this.heroShort = required(this.overlay, '#setup-hero-short');
    this.heroName = required(this.overlay, '#setup-hero-name');
    this.heroMotto = required(this.overlay, '#setup-hero-motto');
    this.heroMeta = required(this.overlay, '#setup-hero-meta');
    this.description = required(this.overlay, '#setup-description');
    this.perks = required(this.overlay, '#setup-perks');
    this.prohibitions = required(this.overlay, '#setup-prohibitions');
    this.arsenal = required(this.overlay, '#setup-arsenal');
    this.starting = required(this.overlay, '#setup-starting');
    this.modes = required(this.overlay, '#setup-modes');
    this.mapSelect = required(this.overlay, '#setup-map');
    this.mapDescription = required(this.overlay, '#setup-map-desc');
    this.clauses = required(this.overlay, '#setup-clauses');
    this.summary = required(this.overlay, '#setup-summary');
    this.confirm = required(this.overlay, '#setup-confirm');
    this.title = required(this.overlay, '#setup-title');
    this.kicker = required(this.overlay, '#setup-kicker');
    required<HTMLElement>(this.overlay, '#setup-class-count').textContent =
      String(PROFESSION_ORDER.length);
    this.buildClasses();
    this.buildModes();
    this.buildMapOptions();
    this.buildClauses();
    this.bind();
    this.restore();
    this.render();
  }

  open(intent: Intent): void {
    this.title.textContent =
      intent === 'host' ? 'CONFIGURAR SALA' : 'CONFIGURAR EXPEDICIÓN';
    this.kicker.textContent =
      intent === 'host'
        ? 'COOPERATIVO // EL ANFITRIÓN FIJA LAS REGLAS'
        : 'NUEVO EXPEDIENTE // DIRECTIVA INICIAL';
    this.confirm.textContent =
      intent === 'host' ? 'CREAR SALA' : 'INICIAR EXPEDICIÓN';
    this.overlay.hidden = false;
    this.overlay.classList.add('is-open');
    this.selectProfession(this.selectedProfession);
    this.updateSummary();
    window.setTimeout(() => {
      this.overlay.scrollTop = 0;
      this.confirm.focus();
    }, 0);
  }

  hide(): void {
    this.overlay.hidden = true;
    this.overlay.classList.remove('is-open');
  }

  getConfig(): ExpeditionConfig {
    return {
      mode: this.mode,
      map: this.map,
      profession: this.selectedProfession,
      modifiers: [...this.modifiers],
    };
  }

  private bind(): void {
    required<HTMLButtonElement>(this.overlay, '#setup-cancel').addEventListener('click', () => {
      this.hide();
    });
    this.confirm.addEventListener('click', () => {
      this.persist();
      this.hide();
      this.actions.onConfirm(this.getConfig());
    });
    this.overlay.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.hide();
      }
    });
  }

  private buildClasses(): void {
    for (const id of PROFESSION_ORDER) {
      const definition = professionDefinition(id);
      const startingWeapon = professionStartingWeapon(id) as WeaponId;
      const accent = cssHex(weaponFamily(startingWeapon).color);
      const card = node('button', 'setup-class-card') as HTMLButtonElement;
      card.type = 'button';
      card.id = `setup-class-${id}`;
      card.dataset.profession = id;
      card.style.setProperty('--class-accent', accent);
      card.title = `${definition.name}: ${definition.motto}`;
      const icon = node('img', 'setup-class-icon');
      icon.src = itemIconUrl({ kind: 'tool', weapon: startingWeapon });
      icon.alt = '';
      const copy = node('span', 'setup-class-copy');
      copy.append(
        node('strong', 'setup-class-name', definition.shortName),
        node('span', 'setup-class-role', CLASS_ROLES[id] ?? 'OPERACIONES'),
      );
      card.append(icon, copy);
      card.addEventListener('click', () => this.selectProfession(id));
      this.classGrid.appendChild(card);
      this.cards.set(id, card);
    }
  }

  private buildModes(): void {
    for (const mode of GAME_MODES) {
      const button = node('button', 'setup-mode-button') as HTMLButtonElement;
      button.type = 'button';
      button.dataset.mode = mode.id;
      button.title = mode.description;
      button.append(
        node('strong', 'setup-mode-name', mode.name),
        node('span', 'setup-mode-desc', mode.description),
      );
      button.addEventListener('click', () => {
        this.mode = mode.id;
        this.renderModes();
        this.updateSummary();
      });
      this.modes.appendChild(button);
      this.modeButtons.set(mode.id, button);
    }
  }

  private buildMapOptions(): void {
    for (const map of MAPS) {
      const option = document.createElement('option');
      option.value = map.id;
      option.textContent = map.name;
      this.mapSelect.appendChild(option);
    }
    this.mapSelect.addEventListener('change', () => {
      this.map = this.mapSelect.value;
      this.renderMapDescription();
      this.updateSummary();
    });
  }

  private buildClauses(): void {
    for (const clause of DIFFICULTY_MODIFIERS) {
      const button = node('button', 'setup-clause-button') as HTMLButtonElement;
      button.type = 'button';
      button.dataset.modifier = clause.id;
      button.textContent = clause.name;
      button.title = clause.description;
      button.addEventListener('click', () => {
        if (this.modifiers.has(clause.id)) {
          this.modifiers.delete(clause.id);
        } else {
          this.modifiers.add(clause.id);
        }
        this.renderClauses();
        this.updateSummary();
      });
      this.clauses.appendChild(button);
      this.clauseButtons.set(clause.id, button);
    }
  }

  private selectProfession(id: ProfessionId): void {
    this.selectedProfession = id;
    for (const [profession, card] of this.cards) {
      const selected = profession === id;
      card.classList.toggle('is-selected', selected);
      card.setAttribute('aria-pressed', selected ? 'true' : 'false');
    }
    this.cards.get(id)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    this.renderDetail();
    this.updateSummary();
  }

  private renderDetail(): void {
    const definition = professionDefinition(this.selectedProfession);
    const startingWeapon = professionStartingWeapon(this.selectedProfession) as WeaponId;
    const pool = professionWeaponPool(this.selectedProfession);
    const accent = cssHex(weaponFamily(startingWeapon).color);
    const heroIcon = node('img', 'setup-hero-icon-image');
    heroIcon.src = itemIconUrl({ kind: 'tool', weapon: startingWeapon });
    heroIcon.alt = '';
    this.heroIcon.replaceChildren(heroIcon);
    this.heroIcon.style.setProperty('--class-accent', accent);
    this.heroShort.textContent = definition.shortName;
    this.heroShort.style.color = accent;
    this.heroName.textContent = definition.name;
    this.heroMotto.textContent = definition.motto;
    this.description.textContent = definition.description;
    this.heroMeta.replaceChildren();
    const meta = [
      `INICIAL: ${WEAPONS[startingWeapon]?.shortName ?? '—'} T1`,
      professionAllowsJetpack(this.selectedProfession) ? 'JETPACK' : 'SIN JETPACK',
      professionMoveSpeedMultiplier(this.selectedProfession) === 1
        ? 'VELOCIDAD ×1'
        : `VELOCIDAD ×${professionMoveSpeedMultiplier(this.selectedProfession).toFixed(2)}`,
    ];
    if (!pool.includes('pickaxe')) meta.push('SIN PICO');
    if (definition.hireForbidden.includes('miner')) meta.push('SIN PLANTILLA');
    else if (definition.hireForbidden.includes('collector')) meta.push('SIN RECOLECTORES');
    for (const text of meta) {
      const chip = node('span', 'setup-chip', text);
      if (text.startsWith('SIN ')) chip.classList.add('is-warning');
      this.heroMeta.appendChild(chip);
    }
    this.perks.replaceChildren();
    for (const perk of definition.perks) {
      this.perks.appendChild(node('li', '', perk));
    }
    this.prohibitions.replaceChildren();
    for (const prohibition of definition.prohibitions.length > 0 ? definition.prohibitions : ['Sin restricciones adicionales']) {
      this.prohibitions.appendChild(node('li', '', prohibition));
    }
    this.arsenal.replaceChildren();
    for (const weaponId of pool) {
      const family = weaponFamily(weaponId);
      const chip = node('span', 'setup-weapon-chip');
      chip.style.setProperty('--class-accent', cssHex(family.color));
      const icon = node('img', 'setup-weapon-icon');
      icon.src = itemIconUrl({ kind: 'tool', weapon: weaponId as WeaponId });
      icon.alt = '';
      const tierLabel =
        family.tierCount > 1 ? `T1–T${family.tierCount}` : 'T1';
      chip.append(
        icon,
        node('span', '', `${WEAPONS[weaponId]?.shortName ?? weaponId} · ${tierLabel}`),
      );
      chip.title = `${family.name} · ${family.tierCount} tiers`;
      this.arsenal.appendChild(chip);
    }
    const hasPickaxe = pool.includes('pickaxe');
    this.starting.textContent = hasPickaxe
      ? startingWeapon === 'pickaxe'
        ? 'El pico es tu arma inicial y tu herramienta de minado.'
        : 'El pico también puede comprarse en la oficina.'
      : 'Sin pico de serie: tu arma inicial también excava.';
    this.renderModes();
    this.renderClauses();
    this.mapSelect.value = this.map;
    this.renderMapDescription();
  }

  private renderModes(): void {
    for (const [id, button] of this.modeButtons) {
      button.classList.toggle('is-selected', id === this.mode);
      button.setAttribute('aria-pressed', id === this.mode ? 'true' : 'false');
    }
  }

  private renderClauses(): void {
    for (const [id, button] of this.clauseButtons) {
      button.classList.toggle('is-selected', this.modifiers.has(id));
      button.setAttribute('aria-pressed', this.modifiers.has(id) ? 'true' : 'false');
    }
  }

  private renderMapDescription(): void {
    const map = MAPS.find((entry) => entry.id === this.map) ?? MAPS[0];
    this.mapDescription.textContent = map.description;
  }

  private updateSummary(): void {
    const definition = professionDefinition(this.selectedProfession);
    const mode = GAME_MODES.find((entry) => entry.id === this.mode)?.name ?? this.mode;
    const map = MAPS.find((entry) => entry.id === this.map)?.shortName ?? this.map;
    this.summary.textContent = `${definition.shortName} · ${mode} · ${map} · CLÁUSULAS ${this.modifiers.size}/6`;
  }

  private persist(): void {
    saveSetupPreferences(this.getConfig());
  }

  private restore(): void {
    const stored = loadSetupPreferences();
    if (!stored || typeof stored !== 'object') return;
    const parsed = stored as Partial<ExpeditionConfig>;
    if (parsed.profession && PROFESSION_ORDER.includes(parsed.profession)) {
      this.selectedProfession = parsed.profession;
    }
    if (parsed.mode && GAME_MODES.some((entry) => entry.id === parsed.mode)) {
      this.mode = parsed.mode;
    }
    if (parsed.map && MAPS.some((entry) => entry.id === parsed.map)) {
      this.map = parsed.map;
    }
    if (Array.isArray(parsed.modifiers)) {
      const valid = new Set(DIFFICULTY_MODIFIERS.map((entry) => entry.id));
      for (const modifier of parsed.modifiers) {
        if (valid.has(modifier)) this.modifiers.add(modifier);
      }
    }
  }

  private render(): void {
    this.selectProfession(this.selectedProfession);
    this.renderModes();
    this.renderClauses();
    this.mapSelect.value = this.map;
    this.renderMapDescription();
    this.updateSummary();
  }
}
