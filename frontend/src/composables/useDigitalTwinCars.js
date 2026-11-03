import { reactive, watch, onBeforeUnmount } from 'vue'

export function useDigitalTwinCars(store, tagMap, getRouteTags) {
  const carState = reactive({ positions: {} })

// Initialize default depot cars once tag positions have finished loading.
// Keep the original car and package data from the store.
watch(
  [() => store.tag_positions, () => store.car_data, () => store.table_data],
  () => {
    const tagPosMap = Object.fromEntries(
      store.tag_positions.map(t => [t.tag_id, t.tag_pos])
    );
    const carTagMap = Object.fromEntries(
      store.car_data.map(c => [c.auto_id, c.tag_id])
    );

    for (const car of store.table_data) {
      if (carState.positions[car.auto_id] || !car.status) continue;

      const pos = tagPosMap[carTagMap[car.auto_id]];
      if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) continue;

      carState.positions[car.auto_id] = {
        id: car.auto_id,
        x: pos.x,
        y: pos.y,
        routeIndex: 0,
        initialized: false,
        rotation: 90,
        lastTagId: null,
        targetTagId: null,
        arrived: false
      };
    }
  },
  { immediate: true }
);

function getNextTag(tags, currentIndex) {
  return tags[(currentIndex + 1) % tags.length]
}

function calculateRotation(from, to) {
  if (!from || !to) return 0

  const dx = to.x - from.x
  const dy = to.y - from.y

  return Math.atan2(dy, dx) * (180 / Math.PI) + 90
}

function moveCars() {
  const speed = store.speed / 200

  for (const car of store.table_data) {
    if (!car.status) continue

    const state = carState.positions[car.auto_id]
    if (!state) continue

    const tags = getRouteTags(car.auto_id, car.route)
    if (!tags.length) continue

    const carInfo = store.car_data.find(
      c => c.auto_id === car.auto_id
    )
    
    if (!carInfo) continue
    const currentTagId = carInfo.tag_id
    const tagMapLocal = tagMap.value

    /* -------------------------
       INIT
    ------------------------- */
    if (!state.initialized) {
      const startPos = tagMapLocal[currentTagId]
      if (!startPos) continue

      state.x = startPos.x
      state.y = startPos.y

      state.routeIndex = tags.findIndex(t => t === currentTagId)
      if (state.routeIndex < 0) state.routeIndex = 0

      state.lastTagId = currentTagId
      state.targetTagId = null
      state.arrived = false
      state.initialized = true
      continue
    }

    /* -------------------------
       STOP STATE
    ------------------------- */
    if (state.arrived && currentTagId === state.lastTagId) {
      continue
    }

    /* -------------------------
       GEEN SCAN → STOP
    ------------------------- */
    if (!currentTagId) continue

    /* -------------------------
       TARGET SETTEN
    ------------------------- */
    if (!state.targetTagId) {
      state.targetTagId = currentTagId
    }

    if (!state.targetTagId) continue

    const targetIndex = tags.indexOf(state.targetTagId)
    if (targetIndex === -1) {
      state.targetTagId = null
      continue
    }

    const currentIndex = state.routeIndex
    const diff = (targetIndex - currentIndex + tags.length) % tags.length
    const fromTagId = tags[currentIndex]
    const toTagId = state.targetTagId
    const from = tagMapLocal[fromTagId]
    const to = tagMapLocal[toTagId]

    if (!to || !from) {
      state.targetTagId = null
      continue
    }

    /* -------------------------
       JUMP (meer dan 1 stap)
    ------------------------- */
    if (diff > 1) {
      state.x = to.x
      state.y = to.y

      state.rotation = calculateRotation(from, to)

      state.routeIndex = targetIndex
      state.lastTagId = toTagId
      state.targetTagId = null
      state.arrived = true

      continue
    }

    /* -------------------------
       MOVE (normaal)
    ------------------------- */
    const dx = to.x - state.x
    const dy = to.y - state.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    state.rotation = calculateRotation(from, to)

    if (dist <= speed) {
      state.x = to.x
      state.y = to.y

      state.routeIndex = targetIndex
      state.lastTagId = toTagId
      state.targetTagId = null
      state.arrived = true

      continue
    }

    state.x += (dx / dist) * speed
    state.y += (dy / dist) * speed
  }
}

let rafId = null

function loop() {
  if (store.active) {
    moveCars()
  }

  rafId = requestAnimationFrame(loop)
}

watch(
  () => store.active,
  (active) => {
    if (active && !rafId) {
      rafId = requestAnimationFrame(loop)
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
})


  return { carState }
}
