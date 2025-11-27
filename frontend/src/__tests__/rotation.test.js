import { describe, it, expect } from 'vitest';
import { getRotationStyle, isValidRotation } from '../logic/utils/rotation.js';

describe('rotation utilities', () => {
  describe('getRotationStyle', () => {
    it('should return rotate(0deg) for 0 degrees', () => {
      expect(getRotationStyle(0)).toBe('rotate(0deg)');
    });

    it('should return rotate(90deg) for 90 degrees', () => {
      expect(getRotationStyle(90)).toBe('rotate(90deg)');
    });

    it('should return rotate(180deg) for 180 degrees', () => {
      expect(getRotationStyle(180)).toBe('rotate(180deg)');
    });

    it('should return rotate(270deg) for 270 degrees', () => {
      expect(getRotationStyle(270)).toBe('rotate(270deg)');
    });

    it('should normalize negative rotations', () => {
      expect(getRotationStyle(-90)).toBe('rotate(270deg)');
      expect(getRotationStyle(-180)).toBe('rotate(180deg)');
      expect(getRotationStyle(-270)).toBe('rotate(90deg)');
    });

    it('should normalize rotations above 360', () => {
      expect(getRotationStyle(360)).toBe('rotate(0deg)');
      expect(getRotationStyle(450)).toBe('rotate(90deg)');
      expect(getRotationStyle(720)).toBe('rotate(0deg)');
    });

    it('should return rotate(0deg) for invalid rotations', () => {
      expect(getRotationStyle(45)).toBe('rotate(0deg)');
      expect(getRotationStyle(135)).toBe('rotate(0deg)');
    });
  });

  describe('isValidRotation', () => {
    it('should return true for valid rotations', () => {
      expect(isValidRotation(0)).toBe(true);
      expect(isValidRotation(90)).toBe(true);
      expect(isValidRotation(180)).toBe(true);
      expect(isValidRotation(270)).toBe(true);
    });

    it('should return true for equivalent rotations', () => {
      expect(isValidRotation(360)).toBe(true);
      expect(isValidRotation(-90)).toBe(true);
      expect(isValidRotation(450)).toBe(true);
    });

    it('should return false for invalid rotations', () => {
      expect(isValidRotation(45)).toBe(false);
      expect(isValidRotation(135)).toBe(false);
      expect(isValidRotation(225)).toBe(false);
    });
  });
});
