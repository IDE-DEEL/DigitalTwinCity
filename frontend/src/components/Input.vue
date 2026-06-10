<script setup>
import "../assets/NumberInput.css"

const model = defineModel({ type: String, default: "" });

defineProps({
  name: String,
  type: String,
})

</script>

<template>
    <div>
      <label class="block text-sm font-semibold mb-1">{{ name }}:</label>
      <input class="input-field" type="text" maxLength="8" v-model="model"></input>
    </div>
</template>