<script setup>
import { useLanguageStore } from '../stores/index.js';

const langStore = useLanguageStore();

const toggleLanguage = () => {
    langStore.switchLanguage();
};
</script>

<template>
	<div class="switch">
	    <input 
            id="language-toggle" 
            class="check-toggle check-toggle-round-flat" 
            type="checkbox" 
            @change="toggleLanguage"
            :checked="langStore.currentLanguage === 'en'"
            >
	    <label for="language-toggle"></label>
	    <span class="on">NL</span>
	    <span class="off">EN</span>
  	</div>
</template>

<style scoped>
/* Example retrieved from: https://codepen.io/TorabRamin/pen/mqrBBj */
.switch {
  position: relative;
  display: inline-block;
  margin: 0 5px;
}

.switch > span {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  font-weight: bold;
  font-size: var(--text-xs);
  text-transform: uppercase;
  text-shadow: 0 1px 0 rgba(0, 0, 0, .06);
  width: 50%;
  text-align: center;
}

input.check-toggle-round-flat:checked ~ .off {
  color: var(--color-primary-blue);
}

input.check-toggle-round-flat:checked ~ .on {
  color: #fff;
}

.switch > span.on {
  left: 0;
  padding-left: 4px;
  color: var(--color-primary-blue);
}

.switch > span.off {
  right: 0;
  padding-right: 4px;
  color: #fff;
}

.check-toggle {
  position: absolute;
  margin-left: -9999px;
  visibility: hidden;
}
.check-toggle + label {
  display: block;
  position: relative;
  cursor: pointer;
  outline: none;
  user-select: none;
}

input.check-toggle-round-flat + label {
  padding: 2px;
  width: 97px;
  height: 35px;
  background-color: var(--color-primary-blue);
  border-radius: 60px;
}
input.check-toggle-round-flat + label:before, input.check-toggle-round-flat + label:after {
  display: block;
  position: absolute;
  content: "";
}

input.check-toggle-round-flat + label:before {
  top: 2px;
  left: 2px;
  bottom: 2px;
  right: 2px;
  background-color: var(--color-primary-blue);
  border-radius: 60px;
}
input.check-toggle-round-flat + label:after {
  top: 4px;
  left: 4px;
  bottom: 4px;
  width: 48px;
  background-color: #fff;
  border-radius: 52px;
  transition: margin 0.2s;
}

input.check-toggle-round-flat:checked + label:after {
  margin-left: 41px;
}
</style>