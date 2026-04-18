import { ROUTES_TILES } from '../domain/routes.js';
import { buildWaypointRouteFromTilePath } from './routeBuilder.js';

export function getWaypointRouteByName(routeName, mapData) {
  const tilePath = ROUTES_TILES[routeName];

  if (!tilePath) {
    throw new Error(`Unknown route "${routeName}".`);
  }

  return buildWaypointRouteFromTilePath(tilePath, mapData);
}