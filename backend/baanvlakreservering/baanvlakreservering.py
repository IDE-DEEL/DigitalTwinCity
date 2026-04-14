start = [
    [[0],[1],[2],[0]],
    [[0],[3],[4],[0]],
    [[0],[5],[6],[0]],
    [[0],[7],[8],[0]]
]

crossroad_roundabout = [
    [[0],[1],[2],[0]],
    [[3],[4],[5],[6]],
    [[7],[8],[9],[10]],
    [[0],[11],[12],[0]]
]

t_junction_up = [
    [[0],[7],[8],[0]],
    [[4],[5],[5],[6]],
    [[1],[2],[2],[3]],
    [[0],[0],[0],[0]]
]

t_junction_right = [
    [[0],[1],[4],[0]],
    [[0],[2],[5],[7]],
    [[0],[2],[5],[8]],
    [[0],[3],[6],[0]]
]

t_junction_down = [
    [[0],[0],[0],[0]],
    [[3],[2],[5],[1]],
    [[6],[5],[5],[4]],
    [[0],[8],[7],[0]]
]

t_junction_left = [
    [[0],[6],[3],[0]],
    [[8],[5],[2],[0]],
    [[7],[5],[2],[0]],
    [[0],[4],[1],[0]]
]

straight_horizontal = [
    [[0],[0],[0],[0]],
    [[1],[2],[2],[3]],
    [[4],[5],[5],[6]],
    [[0],[0],[0],[0]]
]

straight_vertical = [
    [[0],[4],[1],[0]],
    [[0],[5],[2],[0]],
    [[0],[5],[2],[0]],
    [[0],[6],[3],[0]]
]

turn_NE = [
    [[0],[3],[6],[0]],
    [[0],[0],[5],[4]],
    [[0],[2],[0],[1]],
    [[0],[0],[0],[0]]
]

turn_ES = [
    [[0],[0],[0],[0]],
    [[0],[2],[0],[3]],
    [[0],[0],[5],[6]],
    [[0],[1],[4],[0]]
]

turn_SW = [
    [[0],[0],[0],[0]],
    [[1],[0],[2],[0]],
    [[4],[5],[0],[0]],
    [[0],[6],[3],[0]]
]

turn_WN = [
    [[0],[4],[1],[0]],
    [[6],[5],[0],[0]],
    [[3],[0],[2],[0]],
    [[0],[0],[0],[0]]
]

# all zeros are for empty space to create a kind of x and y coordinates
# matrix has 4 rows and 5 columns.
# each
matrix = [
    [[turn_ES],            [t_junction_down],       [straight_horizontal],   [straight_horizontal],  [turn_SW]],
    [[t_junction_right],   [crossroad_roundabout],  [turn_SW],               [turn_ES],              [t_junction_left]],
    [[straight_vertical],  [turn_NE],               [crossroad_roundabout],  [t_junction_left],      [straight_vertical]],
    [[turn_NE],            [straight_horizontal],   [t_junction_up],         [t_junction_up],        [turn_WN]]
]



