<template>
  <div>
    <vue3-tabs-chrome class="theme-dark pa-0" :ref="setTabRef" :tabs="tabs" v-model="tab" @remove="handleRemove"
      :onClose="onClose" @contextmenu="handleRightClick">
      <template v-slot:after>
        <button class="btn" style="height: 20px; line-height: 20px; padding: 0 10px; margin-left: 0px;"
          @click="handleAdd()">+</button>
      </template>
    </vue3-tabs-chrome>

    <v-window v-model="tab">
      <v-window-item v-for="tab in tabs" :key="tab.key" :value="tab.key" ref="tabpanel">
        <v-card flat>
          <v-card-text class="pa-0">

            <div class="pa-1 bg-error text-caption" @click="goToLine(tab.errors[tab.currentError].row + 1)" :key="updateKey"
              v-show="tab.errors.length > 0">
              <v-btn size="small" variant="plain" @click="tab.currentError--"
                :disabled="tab.currentError === 0">&lt;</v-btn>
              <v-btn size="small" variant="plain" @click="tab.currentError++"
                :disabled="tab.currentError + 1 >= tab.errors.length">&gt;</v-btn>
              <span v-if="tab.errors[tab.currentError]">
                {{ tab.errors[tab.currentError].text }} on line
                {{ tab.errors[tab.currentError].row + 1 }}
              </span>
            </div>

            <!-- DO NOT REMOVE THIS COMMENT -->

            <div :ref="'firepad_' + tab.key"></div>

          </v-card-text>
        </v-card>
      </v-window-item>
    </v-window>

    <v-menu v-model="showMenu" :style="'left: ' + menuX + 'px; top: ' + menuY + 'px;'">
      <v-btn text block @click="reload">Reload</v-btn>
      <v-btn text block @click="saveAs">Save as..</v-btn>
    </v-menu>

    <v-dialog v-model="promptUnsaved" width="auto">
      <v-card>
        <v-card-text>
          Save changes to {{ currentTab.label }}
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" @click="promptUnsaved = false; saveFile(true);">Yes</v-btn>
          <v-btn @click="promptUnsaved = false; currentTab.unsaved = false; closeFile">No</v-btn>
          <v-btn @click="promptUnsaved = false;">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style>
/*prevent animation when changing tabs*/
.v-window-item {
  transition: none;
}

/*fill viewport for ace editor*/
.v-main,
.v-main .v-container,
.v-main .v-container>div,
.v-main .v-container>div>div.v-window,
.v-main .v-container>div>div.v-window>div.v-window__container,
.v-main .v-container>div>div.v-window>div.v-window__container>div.v-window-item,
.v-main .v-container>div>div.v-window>div.v-window__container>div.v-window-item>div.v-card,
.v-main .v-container>div>div.v-window>div.v-window__container>div.v-window-item>div.v-card>div.v-card-text,
.v-main .v-container>div>div.v-window>div.v-window__container>div.v-window-item>div.v-card>div.v-card-text>div.ace_editor,
.v-main .v-container>div>div.v-window>div.v-window__container>div.v-window-item>div.v-card>div.v-card-text>div.firepad,
.v-main .v-container>div>div.v-window>div.v-window__container>div.v-window-item>div.v-card>div.v-card-text>div.firepad>div.ace_editor {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.ace_selected-word {
  border: 1px solid #3297FD !important;
}

.ace_selection {
  background: #3297FD !important;
}

.other_cursor {
  position: relative;
  font-size: 10px;
  padding: 2px 4px;
  color: #fff;
  text-shadow: 0 0 1px black, 0 0 1px black, 0 0 1px black, 0 0 1px black, 0 0 1px black;
  -webkit-font-smoothing: antialiased;
  z-index: 1;
  width: fit-content;
}
</style>
  
<script>
import Vue3TabsChrome from 'vue3-tabs-chrome'
import 'vue3-tabs-chrome/dist/vue3-tabs-chrome.css'
import { defineComponent, reactive, ref } from 'vue'

//import { VAceEditor } from 'vue3-ace-editor';
import '../ace-config.js';
import util from "./../services/util";

//import * as firebase from 'firebase';

import firebase from '@firebase/app';
import '@firebase/database';
import '@firebase/auth';
import Firepad from 'firepad';

import FirepadUserList from './../services/firepad-userlist'

import ace from 'ace-builds/src-noconflict/ace';

//const langs = ['json', 'javascript', 'html', 'yaml'];
//const themes = ['github', 'chrome', 'monokai', 'tomorrow_night'];

export default defineComponent({
  components: {
    Vue3TabsChrome,
    //VAceEditor,
  },
  computed: {
    currentTab() {
      let self = this;
      let currentTab = {};
      this.tabs.forEach(function (item) {
        if (item.key === self.tab) {
          currentTab = item;
        }
      })

      return currentTab;
    }
  },
  watch: {
    tabs: {
      handler() {
        this.$emit('updateUsers', this.currentTab.users);
      },
      deep: true,
    },
    currentTab() {
      var title = this.currentTab.key ? this.currentTab.key : 'ShiftEdit';
      document.title = title;
      this.$emit('changeTab');
    }
  },
  data() {
    return {
      tab: 0,
      tabRef: {},
      //firebaseDatabase: {},
      firebaseConnected: false,
      firebaseConnecting: false,
      updateKey: 0,
      showMenu: false,
      menuX: 0,
      menuY: 0,
      menuTab: null,
      promptUnsaved: false,
    };
  },
  methods: {
    editorInit: function (tab) {
      // Get a Vue ref to the Firepad element

      // Initialize ACE editor
      const firepadElement = this.$refs['firepad_' + tab.key];
      tab.editor = ace.edit(firepadElement[0]);

      let editor = tab.editor;

      editor.setTheme("ace/theme/tomorrow_night");

      var self = this;

      editor.getSession().doc.on('change', async function () {
        //tab.favico = require('./../assets/logo.png')
        tab.class = 'edited';
        tab.unsaved = true;
        tab.label = tab.title + ' *';

        if (self.tabRef) {
          self.tabRef.$forceUpdate();
        }
      });

      var mode = util.getMode(tab.title);
      editor.getSession().setMode("ace/mode/" + mode);

      editor.getSession().on("changeAnnotation", function (someVar, session) {
        // add merge conflicts

        var errors = session.getAnnotations();

        // find merge conflicts
        //var Search = require("ace/search").Search;
        var search = editor.$search.set({
          needle: '<<<<<<<'
        });

        var results = search.findAll(session);
        results.reverse();

        results.forEach(function (item) {
          errors.unshift({
            row: item.start.row,
            column: 0,
            text: 'Merge conflict',
            type: 'Error'
          });
        });

        tab.errors = errors
        self.updateKey++;
      });

      editor.getSession().selection.on('changeCursor', function () {
        self.$emit('changeCursor');
      });

      editor.commands.addCommands([{
        name: "findPanel",
        bindKey: {
          win: 'ctrl-f',
          sender: "editor"
        },
        exec: function (editor) {
          self.$emit('find', editor.getSelectedText());
        }
      }]);

      var addFirepad = function (tab) {
        var content = '';
        var editor = tab.editor;

        if (editor.getValue()) {
          content = editor.getValue();
        } else {
          // FIXME
          content = tab.content;
        }
        content = content.replace(/\r\n/g, "\n");
        editor.setValue('');

        var options = {};
        if (typeof content === 'string') {
          options.content = content;
        }

        var siteId = tab.site;
        var file = tab.key;
        var doc_name = siteId + '/' + file;
        // firebase doesn't allow ".", "#", "$", "[", or "]"
        doc_name = doc_name.split('.').join('_');
        doc_name = doc_name.split('[').join('(');
        doc_name = doc_name.split(']').join(')');

        var url = "https://shiftedit.firebaseio.com/sites/";

        //$(tab).trigger('firebaseon');

        var firebaseUrl = url + doc_name;
        var firebaseDatabase = window.firebaseDatabase;
        var firepadRef = firebaseDatabase.refFromURL(firebaseUrl);

        //firepadRef = 'public/firepad-test-database'

        window.firepadRefs[tab.key] = firebase.database().ref(firepadRef);

        console.log('add firepad for ' + firepadRef);

        // Create Firepad.
        window.firepads[tab.key] = Firepad.fromACE(window.firepadRefs[tab.key], editor, {
          userId: util.storageGet('user'),
          defaultText: content
        });

        // close tab on dispose FIXME
        firepadRef.on('value', function (snapshot) {
          // you could just check "snapshot.val() == null" here, but it's much cheaper to check for children so do that first.
          if (!snapshot.hasChildren() && snapshot.val() === null) {
            console.log('firebase was removed');
            //tabs.setEdited(tab, false);
            //tabs.close(tab);
          }
        }, function () {
          console.log('firepad permission denied');
          //removeFirepad();
          //editor.getSession().setValue(content);
          //editor.moveCursorToPosition({column:0, row:0});
          //loadmask.hide();
        });

        // Create FirepadUserList (with our desired userId)
        window.firepadUserLists[tab.key] = FirepadUserList.fromDiv(firepadRef.child('users'), util.storageGet('user'), util.storageGet('username'), tab);

        var firepad = window.firepads[tab.key]
        firepad.on('ready', function () {
          // set initial edited state
          if (firepad.isHistoryEmpty()) {
            console.log('new firepad session');
            //firepad.setText(content);
            //editor.getSession().getUndoManager().reset();
            //tabs.setEdited(tab, edited);
            /*
          }else if( typeof content === 'string' && editor.getValue() !== options.content ){
            console.log('firepad session has changes');
            //tabs.setEdited(tab, true);
          }else if(editor.getValue() === options.content){
            console.log('firepad session is the same');
            //tabs.setEdited(tab, false);
            */
          }

          var saveRef = firepadRef.child('save');
          saveRef.on('value', function () {
            if (!firepad) {
              return;
            }

            var revision = firepad.firebaseAdapter_.revision_;
            console.log('current revision: ' + revision);
            self.setSaved(tab.key);
          });

          self.$emit('changeTab');
        })

      }

      tab.editor = editor;

      //FIREPAD
      //var firepad = false;

      this.applyPrefs(tab);

      // FIXME get settings
      var settings = {};
      if (tab.site && settings.shared) {
        //firepad = true;

        if (!this.firebaseConnected) {
          this.firebaseConnect(function () {
            addFirepad(tab);
          });
        } else {
          addFirepad(tab);
        }
      } else {
        this.setContent(tab, tab.content);
        this.$emit('changeTab');
      }

    },
    reload: function () {
      var tab = this.menuTab;
      this.$emit('open', tab.id, tab.site, { reload: true });
    },
    saveAs: function () {
      this.$emit('saveAs');
    },
    setSaved: function (tabKey) {
      const tab = this.tabs.find(element => element.key === tabKey);
      tab.title = util.baseName(tab.id);
      tab.label = tab.title;
      tab.unsaved = false;
    },
    goToLine: function (line) {
      this.currentTab.editor.gotoLine(line, 0);
      this.currentTab.editor.focus();
    },
    firebaseConnect: function (callback) {
      var self = this;

      var callbacks = [];

      if (callback) {
        callbacks.push(callback);
      }

      if (this.firebaseConnected || this.firebaseConnecting) {
        return;
      }

      this.firebaseConnecting = true;

      //firebase login - put this someplace else
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp({
            apiKey: "AIzaSyCZScKs0pAv97SAOM9SQvHx49niOJKA8K4",
            authDomain: "shiftedit.firebaseapp.com",
            databaseURL: "https://shiftedit.firebaseio.com",
            projectId: "firebase-shiftedit",
            storageBucket: "firebase-shiftedit.appspot.com",
            messagingSenderId: "899582558962"
          });
        }
      } catch (error) {
        console.log("Firebase init failed", error.message);

        //token expired, load a new one
        //reconnect();
        this.firebaseConnecting = false;
        return false;
      }

      window.firebaseDatabase = firebase.database();

      // Log me in.
      var newAuthToken = util.storageGet('newAuthToken');

      firebase.auth().signInWithCustomToken(newAuthToken)
        .catch(function (error) {
          //var errorCode = error.code;
          //var errorMessage = error.message;

          //token expired, load a new one
          self.firebaseConnecting = false;

          // FIXME reconnect
          //this.firebaseConnect();
          return Promise.reject(error.message);
        })
        .then(function () {
          console.log("Firebase login succeeded");
          self.firebaseConnected = true;
          self.firebaseConnecting = false;
          //console.log(authData);

          // get a new token every day
          setTimeout(async function () {
            console.log('get new firebase token');

            // get a new token
            await util.fetchPreferences();

            console.log('reconnect to firebase');
            self.firebaseConnect();
          }, 3600 * 1000);

          // process callbacks
          if (callbacks.length) {
            while (callbacks.length) {
              var func = callbacks.shift();
              func();
            }
          }
        });
    },
    setTabRef: function (el) {
      this.tabRef = el
    },
    handleAdd: async function (tab) {
      if (!tab) {
        tab = {
          title: 'untitled.html',
          content: '',
        };
      }

      tab.label = tab.title;
      tab.key = 'tab' + Date.now();
      tab.editor = null
      tab.errors = []
      tab.currentError = 0;

      this.tabRef.addTab(tab);
      this.tab = tab.key;
      await this.$nextTick();
      this.editorInit(tab)
    },
    handleRemove: function () {
    },
    handleRightClick: function (e, tab, index) {
      console.info('contextmenu', e, tab, index);
      this.menuX = e.x;
      this.menuY = e.y;
      this.showMenu = true
      this.menuTab = tab;
      e.preventDefault();
    },
    setContent(tab, content) {
      tab.editor.setValue(content);
      tab.unsaved = false;
      tab.label = tab.title;
      tab.editor.moveCursorToPosition({
        column: 0, row: 0
      });
    },
    saveFile(close) {
      this.$emit('save', close);
    },
    closeFile() {
      this.tabRef.removeTab(this.currentTab.key)
    },
    onClose(tab, key, index) {
      console.log(tab, key, index)

      // TODO confirm close if edited
      if (tab.unsaved) {
        // show save changes prompt
        this.promptUnsaved = true;
        return false;
      }

      let editor = tab.editor;

      var firepad = window.firepads[tab.key];
      //var firepadUserList = $(tab).data('firepadUserList');
      //var firepadRef = tab.firepadRef;
      //remove firepad if last user
      //if (firepadUserList && Object.keys(firepadUserList.users).length == 1) {
      //console.log('remove firepad session');
      //firepadRef.off('value');
      //firepadRef.remove();
      //}

      /*
      if (firepadUserList) {
        firepadUserList.dispose();
        $(tab).data('firepadUserList', false);
      }
      */

      try {
        if (firepad) {
          console.log('remove firepad');
          firepad.dispose();
        }

        console.log('remove ace');
        editor.session.$stopWorker();
        editor.destroy();
        editor.container.parentNode.removeChild(editor.container);
      } catch (e) {
        console.log(e);
      }

      return true;
    },

    reloadActive: async function () {
      this.tabs.forEach(function (item) {
        if (item.unsaved) {
          this.$emit('open', item.id, item.site, { reload: true });
        }
      });
    },

    applyPrefs: function(tab) {
      let editor = tab.editor;
      if (editor) {        
          let wordWrap = util.storageGet('wordWrap');
          editor.getSession().setUseWrapMode(Boolean(wordWrap));
          
          let codeTheme = util.storageGet('codeTheme');

          if (codeTheme) {
            editor.setTheme("ace/theme/" + codeTheme);
          }
      }
    }

  },
  setup() {
    const tabs = reactive([]);

    const openFile = async function (newTab) {

      // reload file content if it's already open
      var found = false;
      var tab = null;
      this.tabs.forEach(function (item) {
        if (item.id === newTab.id && item.site === newTab.site) {
          found = true;
          tab = item;
        }
      });

      if (found) {
        this.tab = tab.key;
        this.setContent(tab, tab.content);
        return;
      }

      newTab.label = ref(newTab.title);
      newTab.errors = reactive([]);
      newTab.users = reactive([]);

      this.tabRef.addTab(reactive(newTab))
      this.tab = newTab.key;

      await this.$nextTick();

      this.editorInit(newTab);
    }

    return {
      tabs,
      openFile
    }
  },
  mounted() {
    window.firepads = {};
    window.firepadRefs = {};
    window.firepadUserLists = {};

    var modelist = ace.require("ace/ext/modelist")

    // modes list
    this.$emit('modes', modelist.modes);

    // drag drop open
    var self = this;
    window.addEventListener("dragover", function (e) {
      e.preventDefault();
    }, false);
    window.addEventListener("drop", function (e) {
      e.preventDefault();
      var files = e.dataTransfer.files;
      var reader = {};
      for (var i = 0; i < files.length; i++) {
        var file = files[i];

        reader[i] = new FileReader();
        reader[i].onloadend = (function (file, i) {
          return function () {
            self.handleAdd({
              title: file.name,
              content: reader[i].result
            });
          };
        }(file, i));

        reader[i].readAsText(file);
      }
    }, false);

  }
})
</script>