<template>
  <div>
    <v-checkbox v-model="wordWrap" label="Word-wrap" @change="updateWordWrap"></v-checkbox>
    <v-select v-model="codeTheme" :items="codeThemes" item-title="label" item-value="name" label="Code theme"
      @update:modelValue="updateCodeTheme"></v-select>

    <v-btn @click="showMasterPasswordDialog">
      <v-icon v-if="useMasterPassword">mdi-checkbox-marked</v-icon>
      <v-icon v-else>mdi-checkbox-blank</v-icon>
      &nbsp;Master Password
    </v-btn>
  </div>

  <v-dialog v-model="masterPasswordDialog" width="500">
    <v-card>
      <v-card-title>Master password</v-card-title>
      <v-card-text>
        <password-field label="Password" v-model="masterPassword" :disabled="forceRemovePassword"></password-field>

        <div v-if="useMasterPassword">
          <v-checkbox v-model="forceRemovePassword"
            label="Force remove password (this will wipe all stored passwords)"></v-checkbox>
        </div>

        <div v-else>
          <p>
            Be sure to remember your Master Password. if you forget it, you will have to re-enter your other passwords.
          </p>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-btn color="primary" @click="saveMasterPassword" :disabled="!isValid">
          <span v-if="useMasterPassword">Remove</span>
          <span v-else>Set</span>
          &nbsp;Master Password
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import api from "./../services/api";
import util from "./../services/util";
import passwordField from "./password-field";

export default {
  components: {
    passwordField
  },
  props: {
    tabs: null,
  },
  emits :{
      error: String
  },
  data() {
    return {
      prefs: {},
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
      ],
      useMasterPassword: false,
      masterPasswordDialog: false,
      masterPassword: '',
      forceRemovePassword: false,
    }
  },
  computed: {
    isValid: function () {
      return this.useMasterPassword ? this.forceRemovePassword || this.isValidMasterPassword(util.createHash(this.masterPassword)) : this.masterPassword.length > 0;
    },
  },
  methods: {
    isValidMasterPassword: function (password) {
      return util.createHash(password) === this.prefs.masterPasswordHash;
    },

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
    },

    showMasterPasswordDialog: function () {
      this.masterPassword = '';
      this.forceRemovePassword = false;
      this.masterPasswordDialog = true;
    },

    saveMasterPassword: async function () {
      if (this.useMasterPassword) {
        //create hash
        let params = {};
        
        params.masterPassword = util.createHash(this.masterPassword);
        params.forceRemovePassword = this.forceRemovePassword;
        
        await api.post('prefs?cmd=save_master_password', params);
        util.storageSet('masterPassword', '');
        this.useMasterPassword = false;
        this.masterPasswordDialog = false;
      } else {
        //create hash
        let params = {};
        
        params.useMasterPassword = true;
        params.newMasterPassword = util.createHash(this.masterPassword);
        
        await api.post('prefs?cmd=save_master_password', params);
        util.storageSet('masterPassword', this.masterPassword);
        this.useMasterPassword = true;
        this.masterPasswordDialog = false;
      }

      await util.fetchPreferences();
    },

    fetchPreferences: async function () {
      var response = await api.get("prefs");

      if (!response.data.success) {
        this.$emit('error', response.data.error);
        return;
      }

      var data = response.data;
      var prefs = JSON.parse(JSON.stringify(data));

      for (var i in prefs) {
        if (Object.prototype.hasOwnProperty.call(prefs, i)) {
          try {
            prefs[i] = JSON.parse(prefs[i]);
          } catch (e) {
            // do nothing
          }
        }
      }

      util.storageSet('prefs', prefs);
      util.storageSet('username', data.username);
      util.storageSet('user', data.user);
      util.storageSet('hash', data.hash);
      util.storageSet('salt', data.salt);
      util.storageSet('masterPassword', data.masterPassword);
      util.storageSet('premier', data.premier);
      util.storageSet('edition', data.edition);
      util.storageSet('subscr_end', data.subscr_end);
      util.storageSet('trial_end', data.trial_end);
      util.storageSet('channel', data.channel);
      util.storageSet('authToken', data.authToken);
      util.storageSet('newAuthToken', data.newAuthToken);
      util.storageSet('avatar', data.avatar);
      util.storageSet('public_key', data.public_key);

      this.prefs = prefs.prefs;

      this.wordWrap = this.prefs.wordWrap;
      this.codeTheme = this.prefs.codeTheme;
      this.useMasterPassword = this.prefs.useMasterPassword;
    }
  },

  mounted() {
  },
};
</script>