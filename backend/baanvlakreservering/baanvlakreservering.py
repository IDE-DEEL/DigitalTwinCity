import time


auto_1 = "auto_1"
auto_2 = "auto_2"

# start = [
#     [[0],[1],[2],[0]],
#     [[0],[3],[4],[0]],
#     [[0],[5],[6],[0]],
#     [[0],[7],[8],[0]]
# ]
#
# crossroad_roundabout = [
#     [[0],[1],[2],[0]],
#     [[3],[4],[5],[6]],
#     [[7],[8],[9],[10]],
#     [[0],[11],[12],[0]]
# ]
#
# t_junction_up = [
#     [[0],[7],[8],[0]],
#     [[4],[5],[5],[6]],
#     [[1],[2],[2],[3]],
#     [[0],[0],[0],[0]]
# ]
#
# t_junction_right = [
#     [[0],[1],[4],[0]],
#     [[0],[2],[5],[7]],
#     [[0],[2],[5],[8]],
#     [[0],[3],[6],[0]]
# ]
#
# t_junction_down = [
#     [[0],[0],[0],[0]],
#     [[3],[2],[5],[1]],
#     [[6],[5],[5],[4]],
#     [[0],[8],[7],[0]]
# ]
#
# t_junction_left = [
#     [[0],[6],[3],[0]],
#     [[8],[5],[2],[0]],
#     [[7],[5],[2],[0]],
#     [[0],[4],[1],[0]]
# ]
#
# straight_horizontal = [
#     [[0],[0],[0],[0]],
#     [[1],[2],[2],[3]],
#     [[4],[5],[5],[6]],
#     [[0],[0],[0],[0]]
# ]
#
# straight_vertical = [
#     [[0],[4],[1],[0]],
#     [[0],[5],[2],[0]],
#     [[0],[5],[2],[0]],
#     [[0],[6],[3],[0]]
# ]
#
# turn_NE = [
#     [[0],[3],[6],[0]],
#     [[0],[0],[5],[4]],
#     [[0],[2],[0],[1]],
#     [[0],[0],[0],[0]]
# ]
#
# turn_ES = [
#     [[0],[0],[0],[0]],
#     [[0],[2],[0],[3]],
#     [[0],[0],[5],[6]],
#     [[0],[1],[4],[0]]
# ]
#
# turn_SW = [
#     [[0],[0],[0],[0]],
#     [[1],[0],[2],[0]],
#     [[4],[5],[0],[0]],
#     [[0],[6],[3],[0]]
# ]
#
# turn_WN = [
#     [[0],[4],[1],[0]],
#     [[6],[5],[0],[0]],
#     [[3],[0],[2],[0]],
#     [[0],[0],[0],[0]]
# ]
#
#
#
# '''
# bereken alle commandos van te voren gebaseerd op wat de route is vanuit de front end, dan een lijst vullen met de commandos en per rfid tag het volgende commando doorsturen.
#
#
# voor het genereren van de commandos of gewoon een variabele string die je elke keer weer in de lijst append of aan een variable +=
# '''
#
#
#
# # all zeros are for empty space to create a kind of x and y coordinates
# # matrix has 4 rows and 5 columns.
# # each
# matrix = [
#     [[turn_ES],            [t_junction_down],       [straight_horizontal],   [straight_horizontal],  [turn_SW]],
#     [[t_junction_right],   [crossroad_roundabout],  [turn_SW],               [turn_ES],              [t_junction_left]],
#     [[straight_vertical],  [turn_NE],               [crossroad_roundabout],  [t_junction_left],      [straight_vertical]],
#     [[turn_NE],            [straight_horizontal],   [t_junction_up],         [t_junction_up],        [turn_WN]]
# ]


auto_1 = "auto_1"
auto_2 = "auto_2"



# def find_index():

#
# index_current_auto_1 = matrix.index("auto_1")
# index_current_auto_2 = matrix.index("auto_2")
# index_next_auto_1 = matrix.index("auto_1")
# index_next_auto_2 = matrix.index("auto_2")



# this is a list of routes with the commands and tags

route_1 = [["left"], ["forward"], ["right"], ["right"], ["forward"], ["right"], ["right"], ["forward"]]
route_2 = ["left", "forward", "right", "right", "forward", "left", "right", "right", "forward"]
route_3 = ["left", "forward", "right", "right", "forward", "left", "right", "right", "forward"]
route_4 = ["left", "forward", "right", "right", "forward", "left", "right", "right", "forward"]
route_5 = ["left", "forward", "right", "right", "forward", "left", "right", "right", "forward"]
route_6 = ["left", "forward", "right", "right", "forward", "left", "right", "right", "forward"]
route_7 = ["left", "forward", "right", "right", "forward", "left", "right", "right", "forward"]
route_8 = ["left", "forward", "right", "right", "forward", "left", "right", "right", "forward"]
route_9 = ["left", "forward", "right", "right", "forward", "left", "right", "right", "forward"]
route_10 = ["left", "forward", "right", "right", "forward", "left", "right", "right", "forward"]
route_11 = ["left", "forward", "right", "right", "forward", "left", "right", "right", "forward"]
route_12 = ["left", "forward", "right", "right", "forward", "left", "right", "right", "forward"]
route_13 = ["left", "forward", "right", "right", "forward", "left", "right", "right", "forward"]
route = [
    route_1,
    route_2,
    route_3,
    route_4,
    route_5,
    route_6,
    route_7,
    route_8,
    route_9,
    route_10,
    route_11,
    route_12,
    route_13
]




# while True:
#     if matrix[index_current_auto_1] == matrix[index_next_auto_2]:
#         # hold car for a second and follow traffic laws
#         break
#
#     elif matrix[index_current_auto_2] == matrix[index_next_auto_1]:
#         # hold car for a second and follow traffic laws
#         break
#
#     else:
#         # follow the path
#         break

# index for the loop
index = 0

while True:
    if auto_1 or auto_2 == route_1[index][1]:
        # route_1[index][0] send to robot