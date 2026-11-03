import { computed } from 'vue'

export function useDigitalTwinRoutes(store) {
/* -------------------------
   ROUTES & TAGS
--------------------------*/
function get_route_tags(route_name) {
  let tags = []

  for (let i = 0; i < store.routes.length; i++) {
    if (route_name === store.routes[i].route) {
      tags = store.routes[i].tags
      break
    }
  }

  return tags
}

function get_suffix_depot_route_tags(car_id) {
  let tags = []
  
  for (let i = 0; i < store.car_depot_routes.length; i++) {
    if (car_id === store.car_depot_routes[i].auto_id) {
      tags = store.car_depot_routes[i].tags_suffix
      break
    }
  }

  return tags
}

function get_prefix_depot_route_tags(car_id) {
  let tags = []
  
  for (let i = 0; i < store.car_depot_routes.length; i++) {
    if (car_id === store.car_depot_routes[i].auto_id) {
      tags = store.car_depot_routes[i].tags_prefix
      break
    }
  }

  return tags
}

const tagMap = computed(() => {
  const map = {}
  for (const t of store.tag_positions) {
    map[t.tag_id] = {
      x: t.tag_pos.x,
      y: t.tag_pos.y
    }
  }
  return map
})

function getRouteTags(car_id, route_name) {
  if (route_name === 'inactive') return []
  let route_tags = get_route_tags(route_name)
  let depot_prefix_tags = get_prefix_depot_route_tags(car_id)
  let depot_suffix_tags = get_suffix_depot_route_tags(car_id)
  let tags = [...depot_suffix_tags, ...route_tags, ...depot_prefix_tags]
  
  return tags
}

/* Code to generate route lines */
const generatePath = ((car_id, route_name) => {
  if (route_name === 'inactive') return ''
  let route_tags = get_route_tags(route_name)
  let depot_prefix_tags = get_prefix_depot_route_tags(car_id)
  let depot_suffix_tags = get_suffix_depot_route_tags(car_id)
  let tags = [...depot_suffix_tags, ...route_tags, ...depot_prefix_tags]
  let positions = []

   // Collect and scale all tag positions
  for (let i = 0; i < tags.length; i++) {
    for (let j = 0; j < store.tag_positions.length; j++) {
        if (tags[i] === store.tag_positions[j].tag_id) {
          positions.push({
            x: store.tag_positions[j].tag_pos.x * store.factor_x,
            y: store.tag_positions[j].tag_pos.y * store.factor_y
          })
          break;
        }
      }
  }

  if (positions.length === 0) return ''
  if (positions.length === 1) return `M ${positions[0].x.toFixed(2)} ${positions[0].y.toFixed(2)}`

  let path = `M ${positions[0].x.toFixed(2)} ${positions[0].y.toFixed(2)}`
  const k = 0.2; 

  for (let i = 0; i < positions.length - 1; i++) {
    const p1 = positions[i];
    const p2 = positions[i + 1];

    // Controleer of de punten exact verticaal of horizontaal op één lijn liggen
    // We gebruiken een kleine marge (0.5 pixel) voor het geval dat er afrondingsverschillen zijn
    const isStraightHorizontal = Math.abs(p1.y - p2.y) < 0.5;
    const isStraightVertical = Math.abs(p1.x - p2.x) < 0.5;

    if (isStraightHorizontal || isStraightVertical) {
      // Als het een recht stuk is, dwingen we een KAARSRECHTE lijn af!
      path += ` L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    } else {
      // Alleen als de lijn écht de hoek om moet, berekenen we een vloeiende bocht
      let cp1x, cp1y, cp2x, cp2y;

      // Stuurpunt 1
      if (i === 0) {
        cp1x = p1.x + (p2.x - p1.x) * k;
        cp1y = p1.y + (p2.y - p1.y) * k;
      } else {
        const p0 = positions[i - 1];
        cp1x = p1.x + (p2.x - p0.x) * k;
        cp1y = p1.y + (p2.y - p0.y) * k;
      }

      // Stuurpunt 2
      if (i === positions.length - 2) {
        cp2x = p2.x - (p2.x - p1.x) * k;
        cp2y = p2.y - (p2.y - p1.y) * k;
      } else {
        const p3 = positions[i + 2];
        cp2x = p2.x - (p3.x - p1.x) * k;
        cp2y = p2.y - (p3.y - p1.y) * k;
      }

      path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
  }

  return path + "Z";
})


  return { tagMap, getRouteTags, generatePath }
}
