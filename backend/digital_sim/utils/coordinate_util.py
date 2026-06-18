def convert_waypoints_array_from_svg_to_math(waypoints, map_rows):
    """
    Convert waypoints from SVG coordinates (frontend) to mathematical coordinates (backend)
    Used when receiving waypoints from frontend to backend for simulation
    
    Args:
        waypoints: List of waypoint dicts with 'x' and 'y' keys
        map_rows: The height of the map in rows (used for coordinate conversion)
    
    Returns:
        List of converted waypoint dicts in mathematical coordinate system
    """
    return [
        {
            'x': point['x'],
            'y': map_rows - point['y']
        }
        for point in waypoints
    ]


def convert_waypoint_from_svg_to_math(waypoint, map_rows):
    """
    Convert a single waypoint from SVG coordinates (frontend) to mathematical coordinates (backend)
    Used when receiving waypoints from frontend to backend for simulation
    
    Args:
        waypoint: Waypoint dict with 'x' and 'y' keys
        map_rows: The height of the map in rows (used for coordinate conversion)
    
    Returns:
        Converted waypoint dict in mathematical coordinate system
    """
    return {
        'x': waypoint['x'],
        'y': map_rows - waypoint['y']
    }


def convert_position_math_to_svg(position, map_rows):
    """
    Convert position from mathematical coordinates (backend) to SVG coordinates (frontend)
    Used when sending agent positions from backend to frontend for display
    Positions are rounded to 2 decimal places for the frontend and CSV export
    
    Args:
        position: Position [x, y] in mathematical coordinates (list or tuple)
        map_rows: The height of the map in rows (used for coordinate conversion)
    
    Returns:
        Position [x, y] in SVG coordinates as a dict
    """
    return {
        'x': round(position['x'], 2),
        'y': round(map_rows - position['y'], 2)
    }
