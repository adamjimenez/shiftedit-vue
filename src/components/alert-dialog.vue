<template>
    <v-dialog v-model="dialog" :max-width="options.width" :style="{ zIndex: options.zIndex }" @keydown.esc="dialog = false" persistent>
        <v-card>
            <v-toolbar dark :color="options.color" dense flat>
                <v-toolbar-title class="text-body-2 font-weight-bold grey--text">
                    {{ title }}
                </v-toolbar-title>
            </v-toolbar>
            <v-card-text v-show="!!message" class="pa-4 black--text" v-html="message"></v-card-text>
            <v-card-actions class="pt-3">
                <v-spacer></v-spacer>
                <v-btn color="primary" class="body-2 font-weight-bold" outlined @click="dialog = false">OK</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script>
export default {
    data: function () {
        return {
            dialog: false,
            message: null,
            title: null,
            options: {
                color: "grey lighten-3",
                width: 400,
                zIndex: 1008,
            }
        };
    },
    methods: {
        open(title, message) {
            this.dialog = true;
            this.title = title;
            this.message = message;
        },
    }
};
</script>