
export const CARDINALS = ['N', 'E', 'S', 'W'];

/**
 * Bepaalt de dichtstbijzijnde hoek uit de set {0, 90, 180, 270} ten opzichte van de input. (Ook negatieve hoeken mogelijk).
 * Wordt gebruikt om de map componenten visueel consistent te maken door ze op een 90 graden te plaatsen.
 * @param {number} inputAngle: De invoerhoek in graden.
 * @returns {number} De afgeronde hoek (0, 90, 180 of 270).
 */

export function normalizeDegree(inputAngle) {
    const base = ((inputAngle % 360) + 360) % 360; // normaliseer naar [0, 360] (ook negatieve waarden)
    const allowedAngles = [0, 90, 180, 270];

    return allowedAngles.reduce ((previous, current) => 
        Math.abs(current - base) < Math.abs(previous - base) ? current : previous 
    );
}

/**
 * Roteert een punt p (x,y) rond een willekeurig middelpunt (center.x, center.y)
 * met een hoek in graden (alleen 0/90/180/270 na snapping).
 *
 * Wordt gebruikt voor alle algemene rotaties in de simulatie.
 */

export function rotatePointAroundCenter(p, center, rotationDegree) {
    const r = normalizeDegree(rotationDegree)

    if (r === 0) return p;

    const dx = p.x - center.x;
    const dy = p.y - center.y;
    const rad = (r * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    return {
        x: center.x + (dx * cos - dy * sin),
        y: center.y + (dx * sin + dy * cos),
    }
}

/**
 * Roteert een lokaal tile-punt (0..1) rond het midden van de tile (0.5, 0.5).
 *
 * Dit is de versie die we gebruiken voor lanes,
 * omdat elke lane gedefinieerd is binnen een tile van 1x1.
 */

export function rotatePointNormalized(p, rotationDeg) {
  return rotatePointAroundCenter(p, { x: 0.5, y: 0.5 }, rotationDeg)
}

/**
 * Roteert een richting (N/E/S/W) met 0/90/180/270 graden.
 * Wordt gebruikt om de from/to richting van een lane mee te laten draaien.
 */

export function rotateCardinalDirection(direction, rotationDegree) {
  if (!CARDINALS.includes(direction)) return direction

  const r = normalizeDegree(rotationDegree)
  const steps = (r / 90) % 4
  const index = CARDINALS.indexOf(direction)
  return CARDINALS[(index + steps + 4) % 4]
}