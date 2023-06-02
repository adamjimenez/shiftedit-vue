<template>
  <div class="page-container">
    <v-app>
      <v-navigation-drawer :rail="rail" permanent ref="drawer" width="400">
        <v-container class="pb-0" style="height: 100%;">
          <v-row style="flex-wrap: nowrap; height: 100%;">
            <v-col class="pa-0 iconColumn">
              <v-list density="compact" nav>
                <v-list-item prepend-icon="mdi-menu" @click.stop="rail = !rail"></v-list-item>
                <v-list-item prepend-icon="mdi-file" @click.stop="openNav('files')"></v-list-item>
                <v-list-item prepend-icon="mdi-magnify" @click.stop="openNav('find')"></v-list-item>
                <!--<v-list-item prepend-icon="mdi-code-tags" @click.stop="openNav('code')"></v-list-item>-->
                <v-list-item prepend-icon="mdi-lead-pencil" @click.stop="openNav('notes')"></v-list-item>
                <!--<v-list-item prepend-icon="mdi-content-cut" @click.stop="openNav('snippets')"></v-list-item>-->
                <!--<v-list-item prepend-icon="mdi-git" @click.stop="openNav('git')"></v-list-item>-->
              </v-list>
            </v-col>
            <v-col v-show="!rail" class="pa-0" style="height: 100%; max-width: calc(100% - 50px);">
              <div v-show="nav === 'files'" style="height: 100%; display: flex; flex-direction: column;">
                <div style="flex: 0;">
                  <v-autocomplete :label="currentSiteId ? null : 'Site'" item-title="name" item-value="id" :items="sites"
                    v-model="currentSiteId" @update:modelValue="loadSite"></v-autocomplete>
                </div>
                <tree-panel 
                  ref="treePanel" 
                  v-show="currentSiteId" 
                  :current-site="currentSite"
                  @open="openFile"
                />
              </div>
              <div v-show="nav === 'find'" style="height: 100%;">
                <find-panel ref="findPanel" :tabs="$refs.mainTabs" />
              </div>
              <notes-panel v-show="nav === 'notes'" style="height: 100%; flex-direction: column;" />
            </v-col>
          </v-row>
        </v-container>
      </v-navigation-drawer>

      <v-app-bar density="compact">
        <template v-slot:prepend>
          <v-btn icon @click="saveFile">
            <v-icon>mdi-content-save</v-icon>
          </v-btn>
        </template>

        <template
          v-for="user in users"
          :key="user.id"
        >
        <v-avatar
          v-if="user.id != userId"
          :color="user.color"
          size="36px"
        >
          <span class="text-h5 user">{{ user.name }}</span>
        </v-avatar>
      </template>
      </v-app-bar>

      <v-main>
        <v-container fluid class="pa-0" loading="true">
          <tabs-chrome ref="mainTabs" 
            @find="find"
            @open="openFile"
            @updateUsers="updateUsers"
            @save="saveFile"
            @saveAs="saveAs"
          />
        </v-container>

        <v-progress-linear v-if="loading" indeterminate></v-progress-linear>
      </v-main>

      <v-dialog
        v-model="saveAsDialog"
        width="500"
      >
        <v-card>
          <v-card-text>
            <v-text-field v-model="saveAsValue" label="Save as" ref="saveAsValue"></v-text-field>
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" @click="saveAsDialog = false; currentTab.id = saveAsValue; saveFile();">Save</v-btn>
            <v-btn @click="saveAsDialog = false;">Cancel</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-footer app></v-footer>
    </v-app>
  </div>
</template>
  
<style scoped>
.iconColumn {
  max-width: 50px;
}
.user {
	background: transparent !important;
	text-shadow: 0 0 4px black, 0 0 4px black, 0 0 4px black, 0 0 4px black, 0 0 4px black;
	-webkit-font-smoothing: antialiased
}
</style>

<script>
import api from "./services/api";
import util from "./services/util";
import tabsChrome from './components/Tabs-chrome.vue'
import findPanel from './components/Find-panel.vue'
import treePanel from './components/tree-panel.vue'
import notesPanel from './components/notes-panel.vue'

export default {
  components: {
    tabsChrome,
    findPanel,
    treePanel,
    notesPanel,
  },
  data() {
    return {
      props: null,
      drawer: true,
      rail: true,
      selectedTab: null,
      currentSiteId: null,
      newTabId: 1,
      tabs: [
        {
          id: 1,
          title: 'New tab',
          text: 'yo'
        },
      ],
      nav: 'files',
      sites: [],
      open: ['Files'],
      loading: false,
      users: [],
      saveAsDialog: false,
      saveAsValue: '',
      userId: '',
    };
  },
  computed: {
    currentSite() {
      var site = {};
      var self = this;
      this.sites.forEach(function (item) {
        if (item.id === self.currentSiteId) {
          site = item;
        }
      })

      site.apiBaseUrl = site.turbo > 0 ? site.web_url + '/shiftedit-proxy.php?ModPagespeed=off' : '';

      return site;
    },
    currentTab() {
      return this.$refs.mainTabs.currentTab
    }
  },
  methods: {
    addTab() {
      this.tabCount++;
      let newTabIndex = this.tabs.length;
      let title = "Tab " + newTabIndex;
      this.newTabId++;
      this.tabs.push({
        id: this.newTabId,
        title: title,
        text: 'yoo'
      });
      this.$nextTick(() => {
        this.selectedTab = newTabIndex;
      });
    },
    removeTab(index) {
      this.tabs.splice(index, 1);
      if (!this.tabs.length) this.addTab();
    },
    openNav(nav) {
      // reload files
      if (this.rail === false && this.nav === 'files' && nav === 'files') {
        this.loadSite();
      }

      this.rail = false;
      this.nav = nav;
    },

    fetchSites() {
      var self = this;
      this.error = "";
      this.loading = true;

      api
        .get("sites")
        .then(response => {
          //console.log(response);
          self.sites = response.data.sites;
        })
        .catch(error => console.log(error))
        .finally(() => self.loading = false);
    },
    loadSite: async function () {
      if (!this.currentSiteId) {
        return false;
      }
      await this.$nextTick();

      this.$refs.treePanel.load();
    },
    openFile(file, siteId, options) {
      let self = this;

      if (!siteId) {
        siteId = self.currentSite.id;
      }

      if (!options) {
        options = {};
      }

      // check if file is already open
      var fileTabs = self.$refs.mainTabs;

      if (!options.reload) {        
        var found = false;
        fileTabs.tabs.forEach(function (item) {
          if (item.id === file && item.site === self.currentSite.id) {
            found = true;
            fileTabs.tab = item.key;
          }
        });

        if (found)
          return;
      }

      let params = {
        file: file
      };

      this.loading = true;

      api
        .post(this.currentSite.apiBaseUrl + '&cmd=open&file=' + encodeURIComponent(file), params)
        .then(response => {
          console.log(response);
          if (response.data.error) {
            alert(response.data.error);
            return;
          }

          fileTabs.openFile({
            id: file,
            site: self.currentSite.id,
            title: util.baseName(file),
            key: file,
            content: response.data.content,
            errors: [],
            currentError: 0,
          })
        })
        .catch(error => console.log(error))
        .finally(() => self.loading = false);
    },

    saveFile: async function(close) {
      let tab = this.currentTab;
      let editor = tab.editor;

      let params = {
        file: tab.id,
        content: editor.getValue()
      };

      this.loading = true;

      try {
        let response = await api.post(this.currentSite.apiBaseUrl + '&cmd=save&file=' + encodeURIComponent(tab.id), params);
        console.log(response);
        if (response.data.error) {
          alert(response.data.error);
          return;
        }

        this.$refs.mainTabs.setSaved(tab.key);

        if (close) {
          var fileTabs = this.$refs.mainTabs;
          fileTabs.closeFile();
        }
      } catch (error) {
        this.error = error;
      }

      this.loading = false;
    },

    saveAs() {
      this.saveAsValue = this.currentTab.id;
      this.saveAsDialog = true;

      this.$nextTick(() => {
        setTimeout(() => {
          console.log(this.$refs.saveAsValue)
          this.$refs.saveAsValue.focus()
        })
      })
    },

    find(val) {
      this.rail = false;
      this.nav = 'find';
      this.$refs.findPanel.find(val)
    },

    updateUsers(users) {
      this.users = users;
    }
  },
  created: async function () {
    await util.fetchPreferences();
    await this.fetchSites();

    this.userId = util.storageGet('user');
  },

  shortcuts: {
    find: function (event) {
      event.preventDefault();
      this.find();
      return false // stop propagation
    },
    saveFile: function (event) {
      event.preventDefault();
      this.saveFile();
      return false // stop propagation
    },
  },
  mounted() {
    this.$shortcut.add('find', 'ctrl+f')
    this.$shortcut.add('saveFile', 'ctrl+s')

    var self = this;
    window.onbeforeunload = function () {       
      var unsaved = false;
      self.$refs.mainTabs.tabs.forEach(function (item) {
        if (item.unsaved) {
          unsaved = true;
        }
      });

      if (unsaved)
        return true;
    };
  },
};
</script>
  
 