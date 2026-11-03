export function useDigitalTwinVisuals(store) {
/* -------------------------
   UI HELPERS
--------------------------*/
function getStyle(car) {
  return {
    left: `${car.x * store.factor_x}px`,
    top: `${car.y * store.factor_y}px`,
  }
}

function getRotation(car) {
  return {
    transform: `rotate(${car.rotation}deg)`
  }
}

const getCarColor = (carId) => {
  const carData = store.table_data.find(c => c.auto_id === carId);
  return carData?.color || '#808080';
};

const darkenColor = (hex, percent = 20) => {
  const num = parseInt(hex.replace('#', ''), 16);

  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;

  r = Math.max(0, Math.floor(r * (100 - percent) / 100));
  g = Math.max(0, Math.floor(g * (100 - percent) / 100));
  b = Math.max(0, Math.floor(b * (100 - percent) / 100));

  return `rgb(${r}, ${g}, ${b})`;
};

const selectTag = ((tag) => {
  store.chosen_tag = tag
})

const getPackages = ((id) => {
  for (let i = 0; i < store.table_data.length; i++) {
    const car = store.table_data[i]
    
    if (car.auto_id === id) {
      return car.pakketje
    }
  }

  return 0;
})

/* -------------------------
   Show house packages
--------------------------*/
function createHousePackagesList() {
  const scenario = store.scenario_houses.find(
    s => s.Scenario === store.chosen_scenario
  );

  if (!scenario) return [];

  return scenario.tags.map(tag => {
    const house = store.houses.find(
      h => h.tag_id === tag.tag_id
    );

    return {
      tag_id: tag.tag_id,
      pos: house.pos,
      undeliverd_packages: tag.undeliverd_packages
    };
  });
}


  return { getStyle, getRotation, getCarColor, darkenColor, selectTag, getPackages, createHousePackagesList }
}
