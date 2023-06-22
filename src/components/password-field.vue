<template>
    <v-text-field :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
        :type="showPassword ? 'text' : 'password'" @click:append="showPassword = !showPassword"></v-text-field>
</template>

<script>
export default {
    prop: ['value'],
    data() {
        return {
            showPassword: false,
        }
    },
};
</script>