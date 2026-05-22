<script setup>
import "../assets/NumberInput.css"
import { watch } from 'vue'
import { send_data } from '../store.js'

const model = defineModel({ type: String, default: "" });
const props = defineProps({ name: String, type: String});

watch(model, () => {
  send_data(props.type, model.value)
})
</script>

<template>
    <div>
      <label class="block text-sm font-semibold mb-1">{{ name }}:</label>
      <input class="input-field" type="text" maxLength="8" v-model="model"></input>
    </div>
</template>