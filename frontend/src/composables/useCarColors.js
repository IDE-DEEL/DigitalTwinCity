import { CAR_ROUTE_COLORS } from "../constants/constants";

export const useCarColors = () => {
    const getColorForCarAndRoute = (carId) => {
        return CAR_ROUTE_COLORS[carId] ?? 'blue';
    };

    return {
        getColorForCarAndRoute,
    };
};