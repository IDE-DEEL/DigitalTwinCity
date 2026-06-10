def convert_waypoint_dicts_to_tuples(waypoints):
    """Convert list of waypoints from dict format to list of (x, y) tuples.
    Example input: [{"x": 1.0, "y": 2.0}, {"x": 3.0, "y": 4.0}]
    Output: [(1.0, 2.0), (3.0, 4.0)]
    
    Used for both car route waypoints and house detection zone coordinates.

    Args:
        waypoints: List of dictionaries with 'x' and 'y' keys
    Returns:
        List of (x, y) tuples
    """
    return [(point['x'], point['y']) for point in waypoints]