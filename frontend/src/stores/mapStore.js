import { ref } from "vue";

const mapData = ref([]);

function setMapData(loadedMapData) {
    mapData.value = loadedMapData;
}

export function useMapStore() {
    return {
        mapData,
        setMapData,
    };
}
