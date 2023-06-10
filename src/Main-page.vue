<template>
  <div class="page-container">
    <v-app>
      <v-navigation-drawer :rail="rail" permanent ref="drawer" width="400">
        <v-container class="pb-0 h-100">
          <v-row style="flex-wrap: nowrap; height: 100%;">
            <v-col class="pa-0 iconColumn">
              <v-list density="compact" nav ref="navMenu">
                <v-list-item prepend-icon="mdi-menu" @click="rail = !rail"></v-list-item>
                <v-list-item prepend-icon="mdi-file" @click.stop="openNav('files', $event)" value="files"
                  :active="nav === 'files'"></v-list-item>
                <v-list-item prepend-icon="mdi-magnify" @click="openNav('find', $event)" value="find"
                  :active="nav === 'find'"></v-list-item>
                <!--<v-list-item prepend-icon="mdi-code-tags" @click="openNav('code', $event)" value="code" :active="nav === 'code'"></v-list-item>-->
                <v-list-item prepend-icon="mdi-lead-pencil" @click.stop="openNav('notes', $event)" value="notes"
                  :active="nav === 'notes'"></v-list-item>
                <!--<v-list-item prepend-icon="mdi-content-cut" @click="openNav('snippets', $event)" value="snippets" :active="nav === 'snippets'"></v-list-item>-->
                <v-list-item prepend-icon="mdi-git" @click="openNav('git', $event)" value="git" :active="nav === 'git'"></v-list-item>
              </v-list>
            </v-col>
            <v-col v-show="!rail" class="pa-0" style="height: 100%; max-width: calc(100% - 50px);">
              <div v-show="nav === 'files'" style="height: 100%; display: flex; flex-direction: column;">
                <div style="flex: 0;">
                  <v-autocomplete :label="currentSiteId ? null : 'Site'" item-title="name" item-value="id" :items="sites"
                    v-model="currentSiteId" @update:modelValue="loadSite" @mousedown="preventRightClick($event)"
                    @contextmenu="showSiteMenu($event)"></v-autocomplete>
                </div>
                <tree-panel ref="treePanel" v-show="currentSiteId" :current-site="currentSite" @open="openFile" />
              </div>
              <div v-show="nav === 'find'" style="height: 100%;">
                <find-panel ref="findPanel" :tabs="$refs.mainTabs" />
              </div>
              <notes-panel v-show="nav === 'notes'" style="height: 100%; flex-direction: column;" />
              <git-panel ref="git" :tabs="$refs.mainTabs" v-show="nav === 'git'" :current-site="currentSite" class="align-start flex-column" @open="openFile" @load="updateGit" />
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

        <template v-for="user in users" :key="user.id">
          <v-avatar v-if="user.id != userId" :color="user.color" size="36px">
            <span class="text-h5 user">{{ user.name }}</span>
          </v-avatar>
        </template>
      </v-app-bar>

      <v-main>
        <v-container fluid class="pa-0" loading="true">
          <tabs-chrome 
            ref="mainTabs" 
            @find="find" 
            @open="openFile" 
            @updateUsers="updateUsers" 
            @save="saveFile"
            @saveAs="saveAs" 
            @changeCursor="changeCursor"
            @changeTab="changeTab" 
            />
        </v-container>

        <v-progress-linear v-if="loading" indeterminate></v-progress-linear>
      </v-main>

      <v-footer app>
        <v-autocomplete v-model="branch" :items="branches" item-title="name" item-value="name" density="compact"></v-autocomplete>
        <v-btn icon>
          <v-icon>mdi-sync</v-icon>
        </v-btn>

        <v-btn @click="goToLine">
          {{ selection.lead.row+1 }}:{{ selection.lead.column+1 }}
          <span v-if="!selection.empty">({{ selection.anchor.row+1 }}:{{ selection.anchor.column+1 }})</span>
        </v-btn>
        <v-select density="compact"></v-select>

      </v-footer>

      <v-menu v-model="siteMenu" :style="'left: ' + siteMenuX + 'px; top: ' + siteMenuY + 'px;'">
        <v-btn text block @click="database"
          :disabled="!currentSiteId || currentSite.db_phpmyadmin === ''">Database</v-btn>
      </v-menu>

      <v-dialog v-model="saveAsDialog" width="500">
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

      <form id="pma_form" method="post" target="_blank" :action="currentSite.db_phpmyadmin">
        <input type="hidden" name="pma_username" :value="currentSite.db_username">
        <input type="hidden" name="pma_password" :value="currentSite.db_password">
      </form>
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
import gitPanel from './components/git-panel.vue'

export default {
  components: {
    tabsChrome,
    findPanel,
    treePanel,
    notesPanel,
    gitPanel,
  },
  data() {
    return {
      props: null,
      drawer: true,
      nav: 'files',
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
      sites: [],
      open: ['Files'],
      loading: false,
      users: [],
      saveAsDialog: false,
      saveAsValue: '',
      userId: '',
      siteMenu: false,
      siteMenuX: 0,
      siteMenuY: 0,
      row: 0,
      col: 0,
      selection: {
        lead: {
          row: 0,
          column: 0
        },
        anchor: {
          row: 0,
          column: 0
        },
        empty: true,
      },
      branch: 'master',
      branches: [],
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
    },
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

      await this.$refs.treePanel.load();

      await this.$refs.git.load();
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

    saveFile: async function (close) {
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
    },

    preventRightClick(event) {
      if (event.button === 2) {
        event.preventDefault();
        event.stopPropagation();
        return false // stop propagation
      }
    },

    showSiteMenu(event) {
      event.preventDefault();
      this.siteMenu = true;
      this.siteMenuX = event.clientX;
      this.siteMenuY = event.clientY;
      return false // stop propagation
    },

    database() {
      document.getElementById('pma_form').submit();
    },

    changeCursor() {
      var tab = this.currentTab;

      if (!tab) {
        return;
      }

      var editor = tab.editor;

      if (!editor) {
        return;
      }

      var selection = editor.session.getSelection();

      this.selection.lead.row = selection.lead.row;
      this.selection.lead.column = selection.lead.column;
      this.selection.anchor.row = selection.anchor.row;
      this.selection.anchor.column = selection.anchor.column;
      this.selection.empty = selection.isEmpty();
    },

    changeTab() {
      this.changeCursor();
    },

    updateGit(data) {
      console.log(data)
      this.branches = data.branches;
      this.branch = this.$refs.git.currentBranch;
    },

    goToLine() {
      let tab = this.currentTab;
      let editor = tab.editor;
      
      if (editor) {
        editor.commands.exec('gotoline', editor);
      }
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