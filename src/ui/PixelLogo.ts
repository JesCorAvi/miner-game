const PIXEL_FONT: Record<string, readonly string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '11001', '10101', '10011', '10011', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
};

function wordWidth(text: string, scale: number, spacing: number): number {
  const letterCount = text.length;
  return (letterCount * 5 + Math.max(0, letterCount - 1) * spacing) * scale;
}

function drawWord(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  scale: number,
  color: string,
  shadow: string,
  spacing = 1,
): number {
  const drawLayer = (offsetX: number, offsetY: number, fill: string): void => {
    context.fillStyle = fill;
    let cursor = x + offsetX;
    for (const character of text) {
      const glyph = PIXEL_FONT[character];
      if (glyph) {
        for (let row = 0; row < 7; row += 1) {
          const line = glyph[row];
          for (let column = 0; column < 5; column += 1) {
            if (line[column] === '1') {
              context.fillRect(
                Math.round(cursor + column * scale),
                Math.round(y + offsetY + row * scale),
                scale,
                scale,
              );
            }
          }
        }
      }
      cursor += (5 + spacing) * scale;
    }
  };
  drawLayer(scale * 0.16, scale * 0.22, shadow);
  drawLayer(0, 0, color);
  return wordWidth(text, scale, spacing);
}

export function renderPixelLogo(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }
  canvas.width = 700;
  canvas.height = 218;
  context.clearRect(0, 0, canvas.width, canvas.height);

  const cream = '#f4e9d4';
  const amber = '#ffc66f';
  const deepShadow = '#261708';
  const charcoal = '#0b0e0f';

  drawWord(context, 'CARBON', 22, 8, 13, cream, charcoal, 1);
  drawWord(context, 'MAGNATE', 174, 112, 12, amber, deepShadow, 1);

  context.fillStyle = 'rgba(255, 198, 111, 0.35)';
  for (let x = 24; x < 474; x += 8) {
    context.fillRect(x, 104, 4, 2);
  }

  context.fillStyle = 'rgba(111, 220, 211, 0.4)';
  context.fillRect(23, 18, 3, 70);
  context.fillStyle = 'rgba(255, 198, 111, 0.55)';
  context.fillRect(31, 18, 2, 36);
}
