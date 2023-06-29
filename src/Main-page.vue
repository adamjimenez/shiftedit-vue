<template>
  <div class="page-container">
    <v-app>
      <v-navigation-drawer :rail="rail" permanent ref="drawer" width="400">
        <v-container class="pb-0 h-100">
          <v-row style="flex-wrap: nowrap; height: 100%;">
            <v-col class="pa-0 iconColumn">
              <v-list density="compact" nav ref="navMenu" style="height: 100%; display: flex; flex-direction: column;">
                <v-list-item prepend-icon="mdi-menu" @click="rail = !rail"></v-list-item>
                <v-list-item prepend-icon="mdi-file" @click.stop="openNav('files', $event)" value="files"
                  :active="nav === 'files'"></v-list-item>
                <v-list-item prepend-icon="mdi-magnify" @click="openNav('find', $event)" value="find"
                  :active="nav === 'find'"></v-list-item>
                <!--<v-list-item prepend-icon="mdi-code-tags" @click="openNav('code', $event)" value="code" :active="nav === 'code'"></v-list-item>-->
                <v-list-item prepend-icon="mdi-lead-pencil" @click.stop="openNav('notes', $event)" value="notes"
                  :active="nav === 'notes'"></v-list-item>
                <!--<v-list-item prepend-icon="mdi-content-cut" @click="openNav('snippets', $event)" value="snippets" :active="nav === 'snippets'"></v-list-item>-->
                <v-list-item prepend-icon="mdi-git" @click="openNav('git', $event)" value="git"
                  :active="nav === 'git'"></v-list-item>
                <v-spacer></v-spacer>
                <v-list-item prepend-icon="mdi-wrench" @click="openNav('prefs', $event)" value="prefs"
                  :active="nav === 'prefs'"></v-list-item>
              </v-list>
            </v-col>
            <v-col v-show="!rail" class="pa-0" style="height: 100%; max-width: calc(100% - 50px);">
              <div v-show="nav === 'files'" style="height: 100%; display: flex; flex-direction: column;">
                <div style="flex: 0;">
                  <v-autocomplete :label="currentSiteId ? null : 'Site'" item-title="name" item-value="id" :items="sites"
                    v-model="currentSiteId" @update:modelValue="loadSite" @mousedown="preventRightClick($event)"
                    @contextmenu="showSiteMenu($event)">
                    <template v-slot:item="{ props, item }">
                      <v-list-item v-bind="props" :title="item.raw.name" :value="item.raw.id"
                        @contextmenu="showSiteMenu($event, item)"></v-list-item>
                    </template>
                  </v-autocomplete>
                </div>
                <tree-panel ref="treePanel" v-show="currentSiteId" :current-site="currentSite" @open="openFile" />
              </div>
              <div v-show="nav === 'find'" style="height: 100%;">
                <find-panel ref="findPanel" :tabs="$refs.mainTabs" />
              </div>
              <notes-panel v-show="nav === 'notes'" style="height: 100%; flex-direction: column;" />
              <git-panel ref="git" :tabs="$refs.mainTabs" v-show="nav === 'git'" :current-site="currentSite"
                class="align-start flex-column" @open="openFile" @load="updateGit" @reload="reloadSite" />
              <div v-show="nav === 'prefs'" style="height: 100%;">
                <prefs-panel ref="prefsPanel" :tabs="$refs.mainTabs" @error="handleError" />
              </div>
            </v-col>
          </v-row>
        </v-container>
      </v-navigation-drawer>

      <v-app-bar density="compact">
        <template v-slot:prepend>
          <v-btn icon @click="saveFile">
            <v-icon>mdi-content-save</v-icon>
          </v-btn>

          <revision-history :site-id="currentSiteId" :current-tab="currentTab"></revision-history>
        </template>

        <template v-for="user in users" :key="user.id">
          <v-avatar v-if="user.id != userId" :color="user.color" size="36px">
            <span class="text-h5 user">{{ user.name }}</span>
          </v-avatar>
        </template>
      </v-app-bar>

      <v-main>
        <v-container fluid class="pa-0" loading="true">
          <tabs-chrome ref="mainTabs" :sites="sites" @find="find" @open="openFile" @updateUsers="updateUsers"
            @save="saveFile" @saveAs="saveAs" @changeCursor="changeCursor" @changeTab="changeTab" @modes="updateModes" />
        </v-container>

        <v-progress-linear v-if="loading" indeterminate></v-progress-linear>
      </v-main>

      <v-footer app>
        <v-autocomplete v-model="branch" :items="branches" item-title="name" item-value="name"
          @update:modelValue="loadBranch"
          density="compact" @mousedown="preventRightClick($event)"
          @contextmenu="showGitMenu($event)"
          :disabled="currentBranch == ''"
          hide-details
          class="flex-grow-0"
          >
            <template v-slot:item="{ props, item }">
              <v-list-item v-bind="props" :title="item.raw.name" :value="item.raw.id"
                @contextmenu="showGitMenu($event, item)"></v-list-item>
            </template>
          </v-autocomplete>
        <v-btn icon="mdi-sync" variant="plain" @click="gitSync" :disabled="currentBranch == ''"></v-btn>

        <v-spacer></v-spacer>

        <v-btn @click="goToLine" variant="plain">
          {{ selection.lead.row + 1 }}:{{ selection.lead.column + 1 }}
          <span v-if="!selection.empty">({{ selection.anchor.row + 1 }}:{{ selection.anchor.column + 1 }})</span>
        </v-btn>
        <v-select v-model="mode" density="compact" :items="modes" item-title="caption" item-value="mode"
          @update:modelValue="changeMode"
          hide-details
          class="flex-grow-0"
          ></v-select>

      </v-footer>

      <notification-alert @update="fetchSites"></notification-alert>

      <v-menu v-model="siteMenu" :style="'left: ' + menuX + 'px; top: ' + menuY + 'px;'">
        <v-btn text block @click="$refs.siteDialog.newSite">New</v-btn>
        <v-btn text block @click="$refs.siteDialog.editSite(selectedSite)">Edit</v-btn>
        <v-btn text block @click="deleteSite">Delete</v-btn>
        <v-btn text block @click="shareSite">Share</v-btn>
        <v-btn text block @click="database"
          :disabled="!currentSiteId || currentSite.db_phpmyadmin === ''">Database</v-btn>
      </v-menu>

      <v-menu v-model="gitMenu" :style="'left: ' + menuX + 'px; top: ' + (menuY - 100) + 'px;'">
        <v-btn text block @click="newBranch">New</v-btn>
        <v-btn text block @click="deleteBranch">Delete</v-btn>
        <v-btn text block @click="mergeBranch">Merge</v-btn>
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

      <v-dialog v-model="shareSiteDialog" width="500">
        <v-card>
          <v-card-title>
            Share site {{ currentSite.name }}
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col style="flex: 20">
                <v-autocomplete v-model="shareEmail" label="Email" :items="contacts" item-title="name"
                  item-value="email"></v-autocomplete>
              </v-col>
              <v-col>
                <v-btn :disabled="shareEmail == ''" :loading="loading">
                  <v-icon @click="addSiteUser">mdi-account-plus</v-icon>
                </v-btn>
              </v-col>
            </v-row>

            <v-list lines="one">
              <v-list-item v-for="item in shared" :key="item.id" :title="item.name" append-icon="mdi-close"
                @click="removeSiteUser(item.id)"></v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-dialog>

      <site-dialog ref="siteDialog" @save="saveSite"></site-dialog>

      <form id="pma_form" method="post" target="_blank" :action="currentSite.db_phpmyadmin">
        <input type="hidden" name="pma_username" :value="currentSite.db_username">
        <input type="hidden" name="pma_password" :value="currentSite.db_password">
      </form>

      <confirm ref="confirm" />
      <alert ref="alert" />
      <prompt ref="prompt" />

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
import prefsPanel from './components/prefs-panel.vue'
import confirm from "./components/confirm-dialog.vue";
import alert from "./components/alert-dialog.vue";
import prompt from "./components/prompt-dialog.vue";
import revisionHistory from "./components/revision-history.vue";
import notificationAlert from "./components/notification-alert.vue";
import siteDialog from "./components/site-dialog.vue";

export default {
  components: {
    tabsChrome,
    findPanel,
    treePanel,
    notesPanel,
    gitPanel,
    prefsPanel,
    confirm,
    alert,
    prompt,
    revisionHistory,
    notificationAlert,
    siteDialog,
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
          text: ''
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
      gitMenu: false,
      menuX: 0,
      menuY: 0,
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
      selectedSite: {},
      selectedBranch: {},
      mode: '',
      modes: [],
      mounted: false,
      shareSiteDialog: false,
      shareEmail: '',
      shared: [],
      contacts: [],
      paused: false,
    };
  },
  computed: {
    currentSite() {
      var site = {};
      var self = this;
      this.sites?.forEach(function (item) {
        if (item.id === self.currentSiteId) {
          site = item;
        }
      })

      site.apiBaseUrl = site.turbo > 0 ? site.web_url + '/shiftedit-proxy.php?ModPagespeed=off' : '';

      site.apiUrl = site.apiBaseUrl;
      if (site.turbo <= 0) {
        site.apiUrl += 'files?site=' + site.id;
      }

      return site;
    },
    currentTab() {
      return this.mounted ? this.$refs.mainTabs?.currentTab : {};
    },
    currentBranch() {
      return this.mounted ? this.$refs.git?.currentBranch : {};
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

    handleError: function (error) {
      this.$refs.alert.open(
        'Error',
        error
      );
    },

    saveSite: async function (siteId) {
      await this.fetchSites();
      this.currentSiteId = siteId;
      this.loadSite();
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

      var prefsPanel = this.$refs.prefsPanel;
      var useMasterPassword = prefsPanel.useMasterPassword;

      if (useMasterPassword) {

        var masterPassword = util.storageGet('masterPassword');
        
        if (!prefsPanel.isValidMasterPassword(masterPassword)) {
          var newPassword = await this.$refs.prompt.open(
            'Master password',
            "Password",
            {
              type: 'password',
              validate: function (value) {
                return prefsPanel.isValidMasterPassword(util.createHash(value))
              }
            }
          )

          if (!newPassword) {
            return;
          }

          // save password
          util.storageSet('masterPassword', util.createHash(newPassword));
        }
      }

      await api.post('sites?site=' + this.currentSiteId, {
        masterPassword: util.storageGet('masterPassword')
      });

      await this.$refs.treePanel.load();
      await this.$refs.git.load();
    },
    reloadSite: async function () {
      await this.$refs.treePanel.load();
      await this.$refs.git.load();
    },
    openFile: async function (file, siteId, options) {
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

      if (siteId != this.currentSiteId) {
        this.currentSiteId = siteId;
        await this.loadSite();
      }

      let params = {
        file: file
      };

      this.loading = true;
      var response = await api.post(this.currentSite.apiUrl + '&cmd=open&file=' + encodeURIComponent(file), params);
      this.loading = false;

      if (response.data.error) {
        this.error = response.data.error;
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
    },

    saveFile: async function (close) {
      let tab = this.currentTab;
      let editor = tab.editor;

      if (!editor) {
        return false;
      }

      let params = {
        file: tab.id,
        content: editor.getValue()
      };

      this.loading = true;

      try {
        let response = await api.post(this.currentSite.apiUrl + '&cmd=save&file=' + encodeURIComponent(tab.id), params);
        console.log(response);
        if (response.data.error) {
          alert(response.data.error);
          return;
        }

        this.$refs.mainTabs.setSaved(tab.key);

        //save revision for turbo mode or AJAX
        if (this.currentSite.turbo > 0) {
          await api.post('revisions?cmd=save&site=' + this.currentSite.id, params);
        }

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

    showSiteMenu(event, site) {
      this.selectedSite = site ? site : this.currentSite;
      event.preventDefault();
      this.siteMenu = true;
      this.menuX = event.clientX;
      this.menuY = event.clientY;
      return false // stop propagation
    },

    deleteSite: async function () {
      if (
        await this.$refs.confirm.open(
          "Delete site " + this.selectedSite.name,
          "Are you sure?"
        )
      ) {
        let response = await api.post('sites?cmd=delete&site=' + this.selectedSite.id, {});

        if (response.data.error) {
          alert(response.data.error);
          return;
        }

        this.fetchSites();
      }
    },

    shareSite() {
      this.shareSiteDialog = true;

      this.loadSiteUsers(this.currentSiteId);
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

      let tab = this.currentTab;
      let editor = tab?.editor;

      if (editor) {
        this.mode = editor.session.$modeId;
      }
    },

    updateGit(data) {
      this.branches = data.branches;
      this.branch = this.$refs.git.currentBranch;
    },

    showGitMenu(event, branch) {
      this.selectedBranch = branch ? branch : this.currentBranch;
      event.preventDefault();
      this.gitMenu = true;
      this.menuX = event.clientX;
      this.menuY = event.clientY;
      return false // stop propagation
    },

    newBranch() {
      this.$refs.git.newBranch(this.selectedBranch.value);
    },

    deleteBranch() {
      this.$refs.git.deleteBranch(this.selectedBranch.value);
    },

    mergeBranch() {
      this.$refs.git.mergeBranch(this.selectedBranch.value);
    },

    loadBranch: async function() {
      await this.$refs.git.checkout(this.branch);
    },

    goToLine() {
      let tab = this.currentTab;
      let editor = tab.editor;

      if (editor) {
        editor.commands.exec('gotoline', editor);
      }
    },

    updateModes(modes) {
      this.modes = modes;
    },

    changeMode() {
      let tab = this.currentTab;
      let editor = tab.editor;

      if (editor) {
        editor.getSession().setMode(this.mode);
      }
    },

    gitSync: async function () {
      this.loading = true;
      await this.$refs.git.sync();
      this.loading = false;

      await this.$refs.treePanel.load();
      this.$refs.mainTabs.reloadActive();
    },

    loadSiteUsers: async function (siteId) {
      let response = await api.post('share?cmd=list&site=' + siteId);

      if (response.data.error) {
        alert(response.data.error);
        return;
      }

      this.shared = response.data.shared;
      this.contacts = response.data.contacts;

      var shared = response.data.shared.length ? true : false;

      if (this.currentSite.shared != shared) {
        console.log('toggle shared');

        // toggle firepad from open files
        var addFirepad = shared ? true : false;

        var self = this;
        this.$refs.mainTabs.tabs.forEach(function (item) {
          if (item.site == siteId) {
            if (addFirepad) {
              self.$refs.mainTabs.addFirepad(item);
            } else {
              self.$refs.mainTabs.removeFirepad(item);
            }
          }
        });

        await this.fetchSites();
      }
    },

    addSiteUser: async function () {
      var siteId = this.currentSiteId;
      this.loading = true;
      let response = await api.post('share?cmd=save&site=' + siteId + '&email=' + this.shareEmail);
      this.loading = false;
      this.shareEmail = '';

      if (response.data.error) {
        alert(response.data.error);
        return;
      }

      this.loadSiteUsers(siteId);
    },

    removeSiteUser: async function (shareId) {
      var siteId = this.currentSiteId;
      let response = await api.post('share?cmd=delete&site=' + siteId + '&contact=' + shareId);

      if (response.data.error) {
        alert(response.data.error);
        return;
      }

      this.loadSiteUsers(siteId);
    },
  },
  created: async function () {
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
  mounted: async function () {
    await this.$refs.prefsPanel.fetchPreferences();
    await this.fetchSites();

    this.userId = util.storageGet('user');


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

    this.mounted = true;

    window.addEventListener('blur', function () {
      self.paused = true;
    });
    window.addEventListener('focus', function () {
      self.paused = false;
    });
  },
};
</script>