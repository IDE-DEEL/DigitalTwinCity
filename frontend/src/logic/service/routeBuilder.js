import { TILE_LANES } from '../domain/laneCoords.js';
import { normalizeDegree, rotateCardinalDirection, rotatePointNormalized } from '../utils/rotation.js';

const OPPOSITE_DIRECTION = {
  N: 'S',
  E: 'W',
  S: 'N',
  W: 'E',
};

function getDirectionBetweenTiles(tileA, tileB) {
  const dx = tileB.x - tileA.x;
  const dy = tileB.y - tileA.y;

  if (dx === 0 && dy === -1) return 'N';
  if (dx === 1 && dy === 0) return 'E';
  if (dx === 0 && dy === 1) return 'S';
  if (dx === -1 && dy === 0) return 'W';

  throw new Error(
    `Tiles (${tileA.x},${tileA.y}) and (${tileB.x},${tileB.y}) are not cardinal neighbors.`
  );
}

function getMapTile(mapData, x, y) {
  const tile = mapData.find((item) => item.x === x && item.y === y);

  if (!tile) {
    throw new Error(`No tile found at (${x}, ${y}).`);
  }

  return tile;
}

function getRotatedLanesForTile(tile) {
  const laneDefinition = TILE_LANES[tile.type];

  if (!laneDefinition) {
    throw new Error(`No lane definition found for tile type "${tile.type}".`);
  }

  const rotation = normalizeDegree(tile.rotation || 0);

  return laneDefinition.lanes.map((lane, index) => ({
    id: `${tile.x}-${tile.y}-${index}`,
    tileX: tile.x,
    tileY: tile.y,
    tileType: tile.type,
    from: rotateCardinalDirection(lane.from, rotation),
    to: rotateCardinalDirection(lane.to, rotation),
    points: lane.points.map((point) => {
      const rotatedPoint = rotatePointNormalized(point, rotation);

      return {
        x: tile.x + rotatedPoint.x,
        y: tile.y + rotatedPoint.y,
      };
    }),
  }));
}

function findDepotStartLane(rotatedLanes, nextDirection) {
  const lane = rotatedLanes.find(
    (candidate) => candidate.from === 'E' && candidate.to === nextDirection
  );

  if (!lane) {
    throw new Error(
      `No depot start lane found for leaving depot towards "${nextDirection}".`
    );
  }

  return lane;
}

function findDepotEndLane(rotatedLanes, incomingDirection) {
  const lane = rotatedLanes.find(
    (candidate) => candidate.from === incomingDirection && candidate.to === 'E'
  );

  if (!lane) {
    throw new Error(
      `No depot end lane found for entering depot from "${incomingDirection}".`
    );
  }

  return lane;
}

function findConnectingLane(rotatedLanes, incomingDirection, outgoingDirection) {
  const lane = rotatedLanes.find(
    (candidate) =>
      candidate.from === incomingDirection && candidate.to === outgoingDirection
  );

  if (!lane) {
    throw new Error(
      `No connecting lane found for from="${incomingDirection}" to="${outgoingDirection}".`
    );
  }

  return lane;
}

export function buildLaneSequenceFromTilePath(tilePath, mapData) {
  if (!Array.isArray(tilePath) || tilePath.length < 2) {
    throw new Error('tilePath must contain at least 2 tiles.');
  }

  const laneSequence = [];

  for (let index = 0; index < tilePath.length; index++) {
    const currentPathTile = tilePath[index];
    const currentMapTile = getMapTile(mapData, currentPathTile.x, currentPathTile.y);
    const rotatedLanes = getRotatedLanesForTile(currentMapTile);

    const isFirst = index === 0;
    const isLast = index === tilePath.length - 1;

    if (isFirst) {
      const nextTile = tilePath[index + 1];
      const nextDirection = getDirectionBetweenTiles(currentPathTile, nextTile);

      if (currentMapTile.type !== 'depot') {
        throw new Error('First tile in route must be the depot tile.');
      }

      laneSequence.push(findDepotStartLane(rotatedLanes, nextDirection));
      continue;
    }

    if (isLast) {
      const previousTile = tilePath[index - 1];
      const incomingDirection = OPPOSITE_DIRECTION[
        getDirectionBetweenTiles(previousTile, currentPathTile)
      ];

      if (currentMapTile.type !== 'depot') {
        throw new Error('Last tile in route must be the depot tile.');
      }

      laneSequence.push(findDepotEndLane(rotatedLanes, incomingDirection));
      continue;
    }

    const previousTile = tilePath[index - 1];
    const nextTile = tilePath[index + 1];

    const incomingDirection = OPPOSITE_DIRECTION[
      getDirectionBetweenTiles(previousTile, currentPathTile)
    ];
    const outgoingDirection = getDirectionBetweenTiles(currentPathTile, nextTile);

    laneSequence.push(
      findConnectingLane(rotatedLanes, incomingDirection, outgoingDirection)
    );
  }
  console.log('Chosen lane sequence:', laneSequence);
  return laneSequence;
}

export function buildWaypointRouteFromTilePath(tilePath, mapData) {
  const laneSequence = buildLaneSequenceFromTilePath(tilePath, mapData);
  const waypoints = [];

  laneSequence.forEach((lane, laneIndex) => {
    lane.points.forEach((point, pointIndex) => {
      const isFirstPointOfLane = pointIndex === 0;
      const previousPoint = waypoints[waypoints.length - 1];

      waypoints.push(point);
    });
  });

  return waypoints;
}
