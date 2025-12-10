/**
 * Bepaalt de dichtstbijzijnde hoek uit de set {0, 90, 180, 270} ten opzichte van de input.
 * Wordt gebruikt om de map componenten visueel consistent te maken door ze op een 90 graden te plaatsen.
 * @param {number} inputAngle: De invoerhoek in graden.
 * @returns {number} De afgeronde hoek (0, 90, 180 of 270).
 */

export function normalizeDegree(inputAngle) {
    const base = ((inputAngle % 360) + 360) % 360; // normaliseer naar [0, 360] (ook negatieve waarden)
    const allowedAngles = [0, 90, 180, 270];

    return allowedAngles.reduce ((previous, current) => 
        Math.abs(current - base) < Math.abs(previous - base) ? current : previous // kiest dichtsbijzijnde hoek uit de array
    );
}

// TODO: rotate functie voor het draaien van componenten op de map