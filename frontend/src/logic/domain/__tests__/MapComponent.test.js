import { describe, it, expect } from 'vitest';
import { MapComponent } from '../MapComponent.js';

describe('MapComponent', () => {
    it('maakt een mapcomponent aan met de juiste eigenschappen', () => {
        const component = new MapComponent({
            id: 'road-straight',
            label: 'Straight Road',
            imagePath: '/images/road-straight.png'
        });

        expect(component).toBeInstanceOf(MapComponent);
        expect(component.id).toBe('road-straight');
        expect(component.label).toBe('Straight Road');
        expect(component.imagePath).toBe('/images/road-straight.png');
    });
});