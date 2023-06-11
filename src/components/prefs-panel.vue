<template>
    <div>
        <v-checkbox v-model="wordWrap" label="Word-wrap" @change="updateWordWrap"></v-checkbox>
        <v-select v-model="codeTheme" label="Code theme"></v-select>
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
        }
    },
    watch: {
    },
    methods: {
        updateWordWrap: async function () {
            util.storageSet('wordWrap', this.wordWrap);
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
    },
};
</script>