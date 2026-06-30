from backend.digital_sim.constants import X_COORD_KEY, Y_COORD_KEY


def point_in_polygon(point: dict[str, float], polygon: list[dict[str, float]]) -> bool:
    """Ray-casting (PNPOLY) point-in-polygon test.

    Casts a ray from `point` to the right and counts how many polygon
    edges it crosses. An odd number of crossings means the point is
    inside the polygon.

    Args:
        point: {"x": ..., "y": ...} dict
        polygon: List of {"x": ..., "y": ...} dicts forming the polygon

    Returns:
        True if point is inside polygon, False otherwise
    """
    if len(polygon) < 3:
        return False

    x, y = point[X_COORD_KEY], point[Y_COORD_KEY]
    inside = False
    num_vertices = len(polygon)
    p1x, p1y = polygon[0][X_COORD_KEY], polygon[0][Y_COORD_KEY]

    for i in range(1, num_vertices + 1):
        p2x, p2y = polygon[i % num_vertices][X_COORD_KEY], polygon[i % num_vertices][Y_COORD_KEY]

        # An edge can only cross the rightward ray if it spans the ray's
        # height; horizontal edges (p1y == p2y) never do, which is what
        # guarantees p1y != p2y below (no separate check needed for that).
        edge_spans_ray_height = min(p1y, p2y) < y <= max(p1y, p2y)

        if edge_spans_ray_height and x <= max(p1x, p2x):
            x_intersection = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
            if p1x == p2x or x <= x_intersection:
                inside = not inside
                
        p1x, p1y = p2x, p2y

    return inside