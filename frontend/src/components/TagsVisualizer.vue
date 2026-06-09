<script setup>
import '../assets/TagsVisualizer.css';
import { store } from '../store'

function show_tags() {
    store.show_tags = !store.show_tags
}
</script>

<template>
    <h2 class="title">RFID-Tags:</h2>
    <button class="visualize_tag" @click="show_tags()">{{ store.show_tags ? 'Verberg' : 'Toon' }}</button>
    <div class="tags-container">
        <table class="vertical-table">
            <tbody>
                <tr>
                    <th>ID</th>
                    <td>{{ store.chosen_tag.tag_id }}</td>
                </tr>
                <tr>
                    <th>Posities</th>
                    <td>X: {{ store.chosen_tag.tag_pos.x }}, Y: {{ store.chosen_tag.tag_pos.y }}</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>