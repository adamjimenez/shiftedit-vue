<template>
    <div>
        <v-checkbox v-model="wordWrap" label="Word-wrap" @change="updateWordWrap"></v-checkbox>
        <v-select v-model="codeTheme" :items="codeThemes" item-title="label" item-value="name" label="Code theme" @update:modelValue="updateCodeTheme"></v-select>
    </div>
</template>

<script>
import util from "./../services/util";

export default {
    props: {
        tabs: null,
    },
    data() {
        return {
            wordWrap: false,
            codeTheme: '',
            codeThemes: [
  {
    "name": "ambiance",
    "label": "Ambiance"
  },
  {
    "name": "chaos",
    "label": "Chaos"
  },
  {
    "name": "chrome",
    "label": "Chrome"
  },
  {
    "name": "clouds",
    "label": "Clouds"
  },
  {
    "name": "clouds_midnight",
    "label": "Clouds Midnight"
  },
  {
    "name": "cobalt",
    "label": "Cobalt"
  },
  {
    "name": "crimson_editor",
    "label": "Crimson Editor"
  },
  {
    "name": "dawn",
    "label": "Dawn"
  },
  {
    "name": "dracula",
    "label": "Dracula"
  },
  {
    "name": "dreamweaver",
    "label": "Dreamweaver"
  },
  {
    "name": "eclipse",
    "label": "Eclipse"
  },
  {
    "name": "github",
    "label": "Github"
  },
  {
    "name": "gruvbox",
    "label": "Gruvbox"
  },
  {
    "name": "kuroir",
    "label": "Kuroir"
  },
  {
    "name": "monokai",
    "label": "Monokai"
  },
  {
    "name": "pastel_on_dark",
    "label": "Pastel on Dark"
  },
  {
    "name": "solarized_dark",
    "label": "Solarized Dark"
  },
  {
    "name": "tomorrow",
    "label": "Tomorrow"
  },
  {
    "name": "tomorrow_night",
    "label": "Tomorrow Night"
  },
  {
    "name": "tomorrow_night_blue",
    "label": "Tomorrow Night Blue"
  },
  {
    "name": "tomorrow_night_bright",
    "label": "Tomorrow Night Bright"
  },
  {
    "name": "tomorrow_night_eighties",
    "label": "Tomorrow Night Eighties"
  },
  {
    "name": "twilight",
    "label": "Twilight"
  },
]
        }
    },
    watch: {
    },
    methods: {
        updateWordWrap: async function () {
            util.storageSet('wordWrap', this.wordWrap);
            this.applyPrefs();
        },

        updateCodeTheme: async function () {
            util.storageSet('codeTheme', this.codeTheme);
            this.applyPrefs();
        },

        applyPrefs: function () {
            var self = this;
            this.tabs.tabs.forEach(function (tab) {
                self.tabs.applyPrefs(tab);
            });
        }
    },

    mounted() {
        this.wordWrap = util.storageGet('wordWrap');
        this.codeTheme = util.storageGet('codeTheme');
    },
};
</script>