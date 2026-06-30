<script setup>
import '../assets/TagsVisualizer.css';
import { useDigitalTwinStore } from '../stores/digital-twin.js'
import { useLanguageStore } from '../stores/index.js';
import { BaseButton } from './CustomComponents.js';

const store = useDigitalTwinStore();
const langStore = useLanguageStore();

function show_tags() {
    store.show_tags = !store.show_tags
}
</script>

<template>
    <div class="tags">
        <h2 class="title">{{ langStore.getLabel('rfidTags.title') }}:</h2>
        <BaseButton variant="tags" @click="show_tags()">{{ store.show_tags ? langStore.getLabel('rfidTags.hideTags') : langStore.getLabel('rfidTags.showTags') }}</BaseButton>
    </div>
    <div class="tags-container">
        <table class="vertical-table">
            <tbody>
                <tr>
                    <th>{{ langStore.getLabel('rfidTags.id') }}</th>
                    <td>{{ store.chosen_tag.tag_id }}</td>
                </tr>
                <tr>
                    <th>{{ langStore.getLabel('rfidTags.positions') }}</th>
                    <td>X: {{ store.chosen_tag.tag_pos.x }}, Y: {{ store.chosen_tag.tag_pos.y }}</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>