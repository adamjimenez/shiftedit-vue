<template>
    <v-alert type="info" :title="message" v-model="show" closable style="
                    position: fixed;
                    right: 20px;
                    bottom: 20px;
                    margin: 0 auto;
                    z-index: 9999;
                    "></v-alert>
</template>

<script>
import api from "./../services/api";

export default {
    data() {
        return {
            timer: null,
            show: false,
            loading: false,
            message: '',
        }
    },
    methods: {
        check: async function () {
            if (this.paused || this.loading) {
                return;
            }

            this.loading = true;
            
            let response;

            try {
                response = await api.get('notifications');
            } catch (error) {
                console.log(error);
            }

            this.loading = false;

            if (response.data.message) {
                this.showNotification = true;
                this.notification = response.data.message;
            }

            if (response.data.subject == 'site') {
                this.$emit('update');
            }
        }
    },

    mounted() {    
        this.timer = setInterval(this.check, 5000);
    },
};
</script>