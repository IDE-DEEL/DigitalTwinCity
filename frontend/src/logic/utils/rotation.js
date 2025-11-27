/**
 * Valid rotation angles in degrees.
 */
export const VALID_ROTATIONS = [0, 90, 180, 270];

/**
 * Converts rotation degrees to CSS transform value.
 * Only supports 0, 90, 180, and 270 degree rotations.
 * @param {number} degrees - Rotation in degrees (0, 90, 180, 270)
 * @returns {string} CSS transform rotate value
 */
export function getRotationStyle(degrees) {
  const normalizedDegrees = ((degrees % 360) + 360) % 360;
  
  if (!VALID_ROTATIONS.includes(normalizedDegrees)) {
    console.warn(`Invalid rotation: ${degrees}. Using 0 degrees.`);
    return 'rotate(0deg)';
  }
  
  return `rotate(${normalizedDegrees}deg)`;
}

/**
 * Validates if a rotation value is valid (0, 90, 180, 270).
 * @param {number} degrees - Rotation in degrees
 * @returns {boolean} True if valid rotation
 */
export function isValidRotation(degrees) {
  const normalizedDegrees = ((degrees % 360) + 360) % 360;
  return VALID_ROTATIONS.includes(normalizedDegrees);
}
