from backend.domain.graph import RoadGraph, Node

DIRECTION_MAP = {
    "N": (0, -1, "S"),
    "E": (1, 0, "W"),
    "S": (0, 1, "N"),
    "W": (-1, 0, "E"),
}
CHECK_DIRECTIONS = ["E", "S"]

def build_road_graph(grid_array):
    graph = RoadGraph()
    N = len(grid_array)

    for y in range(N):
        for x in range(N):
            cell = grid_array[y][x]
            
            if not cell.isRoad:
                continue

            for direction in cell.pathConnections:

                if direction in CHECK_DIRECTIONS:
                    
                    dx, dy, opposite_direction = DIRECTION_MAP[direction]
                    neighbor_x, neighbor_y = x + dx, y + dy 
                    
                    if 0 <= neighbor_x < N and 0 <= neighbor_y < N:
                        neighbor_cell = grid_array[neighbor_y][neighbor_x]
                        
                        if neighbor_cell.isRoad and opposite_direction in neighbor_cell.pathConnections:
                            
                            node_a = Node(x, y, direction) 
                            node_b = Node(neighbor_x, neighbor_y, opposite_direction)
                            
                            graph.add_edge(node_a, node_b, length=1) 
                            
    return graph