def get_steps_multiplier(simulation_speed: int) -> int:
    """
    Convert simulation speed value to steps multiplier.
    
    Args:
        simulation_speed: Numeric value from frontend (1, 2, 3, or 4)
        
    Returns:
        Number of steps to execute per update cycle
    """
    speed_to_multiplier = {
        1: 1,      # 1x speed: 1 step per update
        2: 5,      # 5x speed: 5 steps per update
        3: 10,     # 10x speed: 10 steps per update
        4: 200,    # Max speed: many steps per update
    }
    return speed_to_multiplier.get(simulation_speed, 1)