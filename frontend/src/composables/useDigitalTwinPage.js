import { onMounted } from 'vue'

export function useDigitalTwinPage(store) {
  onMounted(() => {
    store.connect()
    store.fetchTagPositions()
    store.fetchDepotRoutes()
    store.fetchRoutes()
    store.fetchHouses()
    store.fetchHousesPerScenario()
  })

/* -------------------------
   Timer button handlers
--------------------------*/
function handleTimerStart() {
    if (store.sendData('activation', true)) {
        store.sendData('load_max_packages', store.table_data);
        store.active = true;
    }
}

function handleTimerStop() {
    if (store.sendData('activation', false)) {
        store.active = false;
    }
}

function handleTimerReset() {
    store.fetchHousesPerScenario()
    store.sendData('reset', {});
}

  return { handleTimerStart, handleTimerStop, handleTimerReset }
}
