<template>
    <v-dialog v-model="dialog" :max-width="options.width" :style="{ zIndex: options.zIndex }" @keydown.esc="cancel" persistent>
        <v-card>
            <v-toolbar dark :color="options.color" dense flat>
                <v-toolbar-title class="text-body-2 font-weight-bold grey--text">
                    {{ title }}
                </v-toolbar-title>
            </v-toolbar>
            <v-text-field v-model="value" :label="message" :type="options.type"></v-text-field>
            <v-card-actions class="pt-3">
                <v-spacer></v-spacer>
                <v-btn v-if="!options.noconfirm" color="grey" text class="body-2 font-weight-bold"
                    @click="cancel">Cancel</v-btn>
                <v-btn color="primary" class="body-2 font-weight-bold" outlined @click="agree" :disabled="!options.validate(value)">OK</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script>
export default {
    data: function () {
        return {
            dialog: false,
            resolve: null,
            reject: null,
            message: null,
            title: null,
            options: {
                color: "grey lighten-3",
                width: 400,
                zIndex: 1008,
                noconfirm: false,
                type: 'text',
                validate: function () {
                    return true;
                }
            },
            value: '',
        };
    },
    methods: {
        open(title, message, options) {
            this.value = '';
            this.dialog = true;
            this.title = title;
            this.message = message;
            this.options = Object.assign(this.options, options);
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        },
        agree() {
            this.resolve(this.value);
            this.dialog = false;
        },
        cancel() {
            this.resolve(false);
            this.dialog = false;
        }
    }
};
</script>