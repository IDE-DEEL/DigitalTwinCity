import random

from backend.digital_sim.domain.package import PackageStatus


class DeliveryManager:
    """Centralized manager for delivery zone detection and package delivery logic."""
    
    @staticmethod
    def process_deliveries(agents):
        """
        Process deliveries for all agents.
        Handles zone detection, timer countdown, and delivery completion.
        
        Args:
            agents: List of CarAgent objects from the model
        """
        dt = 0.1
        
        for agent in agents:
            if agent.current_delivery_house is not None:
                # Currently delivering
                DeliveryManager._process_ongoing_delivery(agent, dt)
            else:
                # Check if entering a delivery zone
                DeliveryManager._check_for_delivery_zone(agent)
    
    @staticmethod
    def _check_for_delivery_zone(agent):
        """Check if the car has entered a delivery zone of any house on its route."""
        if not agent.position or not agent.packages_in_cargo:
            return
        
        current_pos = agent.position
        
        for house in agent.route.houses:
            # Check if we have packages for this house
            packages_for_house = [p for p in agent.packages_in_cargo if p.destination_house_id == house.id]
            
            if not packages_for_house:
                continue
            
            # Check if current position is in the delivery zone
            if DeliveryManager._point_in_polygon(current_pos, house.road_coords):
                # Start delivery
                agent.current_delivery_house = house
                agent.delivery_duration = random.uniform(5.0, 15.0)
                agent.delivery_time_remaining = agent.delivery_duration
                return
    
    @staticmethod
    def _process_ongoing_delivery(agent, dt: float):
        """
        Process the ongoing delivery: count down timer and complete delivery when done.
        
        Args:
            agent: CarAgent object currently delivering
            dt: Time delta for this step
        """
        agent.delivery_time_remaining -= dt
        
        if agent.delivery_time_remaining <= 0:
            DeliveryManager._complete_delivery(agent)
    
    @staticmethod
    def _complete_delivery(agent):
        """Complete the delivery at current house and remove delivered packages from cargo."""
        if not agent.current_delivery_house:
            return
        
        house = agent.current_delivery_house
        
        # Mark all packages for this house as delivered and remove from cargo
        packages_to_remove = [p for p in agent.packages_in_cargo if p.destination_house_id == house.id]
        
        for package in packages_to_remove:
            package.status = PackageStatus.DELIVERED
            agent.packages_in_cargo.remove(package)
        
        # Resume movement
        agent.current_delivery_house = None
        agent.delivery_time_remaining = 0.0
        agent.delivery_duration = 0.0
    
    @staticmethod
    def _point_in_polygon(point: tuple[float, float], polygon: list[tuple[float, float]]) -> bool:
        """
        Check if a point is inside a polygon using the ray casting algorithm.
        
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
        
        p1x, p1y = polygon[0]
        for i in range(1, len(polygon) + 1):
            p2x, p2y = polygon[i % len(polygon)]
            if y > min(p1y, p2y):
                if y <= max(p1y, p2y):
                    if x <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
        
        return inside
