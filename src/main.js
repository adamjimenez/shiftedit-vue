import '@fortawesome/fontawesome-free/css/all.css' 
import { createApp } from 'vue'
import App from './App.vue'
//import './registerServiceWorker'
import 'vuetify/dist/vuetify.min.css' // Ensure you are using css-loader
//import vueFilterPrettyBytes from 'vue-filter-pretty-bytes'
//import EventHub from 'vue-event-hub'
import { createRouter, createWebHistory } from 'vue-router'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import '@mdi/font/css/materialdesignicons.css'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'dark'
  }
})

//Vue.use(vueFilterPrettyBytes)
//Vue.config.productionTip = false
//Vue.use(EventHub);

const router = createRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('./Main-page.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('./views/404-page.vue'),
    }
  ]
})

import VueKeybindings from 'vue-keybindings'

createApp(App)
.use(vuetify)
.use(router)
.use(VueKeybindings)
.mount('#app')
