import { MINERALS } from '../config';
import type { DayReport } from '../types';
import { formatMoney, formatNumber, formatPercent } from './format';
import { itemIconUrl } from './ItemIcon';

function setText(element: HTMLElement, text: string): void {
  element.textContent = text;
}

export interface DaySummaryElements {
  overlay: HTMLElement;
  title: HTMLElement;
  subtitle: HTMLElement;
  lines: HTMLElement;
  carbon: HTMLElement;
  performance: HTMLElement;
  bonus: HTMLElement;
  punctuality: HTMLElement;
  surplus: HTMLElement;
  total: HTMLElement;
  money: HTMLElement;
}

export class DaySummaryView {
  constructor(private readonly elements: DaySummaryElements) {}

  show(report: DayReport): void {
    this.render(report);
    this.elements.overlay.hidden = false;
  }

  hide(): void {
    this.elements.overlay.hidden = true;
  }

  render(report: DayReport): void {
    setText(
      this.elements.title,
      `DÍA ${String(report.day).padStart(2, '0')} COMPLETADO`,
    );
    const success = report.carbon >= report.quota;
    setText(
      this.elements.subtitle,
      success
        ? report.carbon > report.quota
          ? `Cuota superada por ${formatNumber(report.carbon - report.quota)} t. La junta liquida excedente y primas.`
          : 'Cuota cubierta al cierre del turno. La oficina nocturna ya está abierta.'
        : 'La cuota no se ha cubierto. El expediente queda pendiente de revisión.',
    );
    this.elements.lines.replaceChildren();

    const coalLines = report.lines.filter((line) => line.carbon > 0);
    const coalTotal = coalLines.reduce((total, line) => total + line.carbon, 0);
    if (coalTotal > 0) {
      const row = document.createElement('div');
      row.className = 'summary-line is-quota';
      const icon = document.createElement('span');
      icon.className = 'summary-line-icon';
      icon.style.backgroundImage = `url("${itemIconUrl({ kind: 'mineral', mineral: 'coal' })}")`;
      const label = document.createElement('span');
      label.className = 'summary-line-label';
      label.textContent = 'CARBÓN ENTREGADO A CUOTA';
      const amount = document.createElement('strong');
      amount.className = 'summary-line-amount';
      amount.textContent = `${formatNumber(coalTotal)} t`;
      row.append(icon, label, amount);
      this.elements.lines.appendChild(row);
    }

    for (const line of report.lines) {
      if (line.money <= 0) {
        continue;
      }
      const row = document.createElement('div');
      row.className = 'summary-line';
      const icon = document.createElement('span');
      icon.className = 'summary-line-icon';
      icon.style.backgroundImage = `url("${itemIconUrl({ kind: 'mineral', mineral: line.mineral })}")`;
      const label = document.createElement('span');
      label.className = 'summary-line-label';
      label.textContent = `${MINERALS[line.mineral].name.toUpperCase()} ×${formatNumber(line.count)}`;
      const amount = document.createElement('strong');
      amount.className = 'summary-line-amount';
      amount.textContent = formatMoney(line.money);
      row.append(icon, label, amount);
      this.elements.lines.appendChild(row);
    }

    if (report.otherValue > 0) {
      const row = document.createElement('div');
      row.className = 'summary-line is-text-only';
      const label = document.createElement('span');
      label.className = 'summary-line-label';
      label.textContent = 'MINERALES VARIOS';
      const amount = document.createElement('strong');
      amount.className = 'summary-line-amount';
      amount.textContent = formatMoney(report.otherValue);
      row.append(label, amount);
      this.elements.lines.appendChild(row);
    }

    if (report.oreValue <= 0 && report.otherValue <= 0) {
      const empty = document.createElement('p');
      empty.className = 'summary-empty';
      empty.textContent = 'No se vendieron minerales este turno. El carbón ha ido íntegro a la cuota.';
      this.elements.lines.appendChild(empty);
    }

    // Desglose de liquidación: Bonus de rendimiento
    if (report.bonus > 0) {
      const bonusRow = document.createElement('div');
      bonusRow.className = 'summary-line is-bonus is-text-only';
      const bonusLabel = document.createElement('span');
      bonusLabel.className = 'summary-line-label';
      bonusLabel.textContent = `BONUS DE RENDIMIENTO · ${formatPercent(report.performance)}`;
      const bonusAmount = document.createElement('strong');
      bonusAmount.className = 'summary-line-amount';
      bonusAmount.textContent = `+${formatMoney(report.bonus)}`;
      bonusRow.append(bonusLabel, bonusAmount);
      this.elements.lines.appendChild(bonusRow);
    }

    // Prima de puntualidad
    if (report.punctuality > 0) {
      const punctualityRow = document.createElement('div');
      punctualityRow.className = 'summary-line is-bonus is-text-only';
      const label = document.createElement('span');
      label.className = 'summary-line-label';
      const secText = report.securedAt !== null ? ` (cubierta a ${Math.round(report.securedAt)} s)` : '';
      label.textContent = `PRIMA DE PUNTUALIDAD${secText}`;
      const amount = document.createElement('strong');
      amount.className = 'summary-line-amount';
      amount.textContent = `+${formatMoney(report.punctuality)}`;
      punctualityRow.append(label, amount);
      this.elements.lines.appendChild(punctualityRow);
    }

    // Canje de excedente de carbón
    if (report.surplusCapital > 0) {
      const surplusRow = document.createElement('div');
      surplusRow.className = 'summary-line is-bonus is-text-only';
      const label = document.createElement('span');
      label.className = 'summary-line-label';
      label.textContent = `CANJE DE EXCEDENTE (${formatNumber(report.surplusCarbon)} t a 0,20 $/t)`;
      const amount = document.createElement('strong');
      amount.className = 'summary-line-amount';
      amount.textContent = `+${formatMoney(report.surplusCapital)}`;
      surplusRow.append(label, amount);
      this.elements.lines.appendChild(surplusRow);
    }

    const totalRow = document.createElement('div');
    totalRow.className = 'summary-line is-total is-text-only';
    const totalLabel = document.createElement('span');
    totalLabel.className = 'summary-line-label';
    totalLabel.textContent = 'TOTAL LIQUIDADO';
    const totalAmount = document.createElement('strong');
    totalAmount.className = 'summary-line-amount';
    totalAmount.textContent = formatMoney(report.total);
    totalRow.append(totalLabel, totalAmount);
    this.elements.lines.appendChild(totalRow);

    setText(
      this.elements.carbon,
      `${formatNumber(report.carbon)} / ${formatNumber(report.quota)} t`,
    );
    setText(this.elements.performance, formatPercent(report.performance));
    setText(this.elements.bonus, formatMoney(report.bonus));
    setText(this.elements.punctuality, formatMoney(report.punctuality));
    setText(this.elements.surplus, formatMoney(report.surplusCapital));
    setText(this.elements.total, formatMoney(report.total));
    setText(this.elements.money, formatMoney(report.money));
  }
}
