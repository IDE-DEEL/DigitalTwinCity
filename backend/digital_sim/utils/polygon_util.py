def point_in_polygon(point: tuple[float, float], polygon: list[tuple[float, float]]) -> bool:
    """Ray-casting (PNPOLY) point-in-polygon test.

    Casts a ray from `point` to the right and counts how many polygon
    edges it crosses. An odd number of crossings means the point is
    inside the polygon.

    Args:
        point: (x, y) tuple
        polygon: List of (x, y) tuples forming the polygon

    Returns:
        True if point is inside polygon, False otherwise
    """
    if len(polygon) < 3:
        return False

    x, y = point
    inside = False
    num_vertices = len(polygon)
    p1x, p1y = polygon[0]

    for i in range(1, num_vertices + 1):
        p2x, p2y = polygon[i % num_vertices]

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