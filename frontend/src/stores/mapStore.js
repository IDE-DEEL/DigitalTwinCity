import { ref } from "vue";
import { defineStore } from "pinia";

export const useMapStore = defineStore("map", () => {
    const mapData = ref([]);

    function setMapData(loadedMapData) {
        mapData.value = loadedMapData;
    }

    return {
        mapData,
        setMapData,
    };
});
