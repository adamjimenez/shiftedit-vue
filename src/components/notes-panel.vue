<template>
    <div style="overflow-y: scroll;">
        <v-textarea
            v-model="notes"
            auto-grow
            flat
            density="compact"
            @change="save"
        ></v-textarea>
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
            notes: '',
        }
    },
    watch: {
    },
    methods: {
        save: function () {
            util.storageSet('notes', this.notes);
        }
    },

    shortcuts: {
    },
    mounted() {
        this.notes = util.storageGet('notes');
    },
};
</script>