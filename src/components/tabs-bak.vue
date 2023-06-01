<template>
    <div>
      <vue3-tabs-chrome class="theme-dark pa-0" :ref="setTabRef" :tabs="tabs" v-model="tab" @remove="handleRemove">
        <template v-slot:after>
          <button class="btn" style="height: 20px; line-height: 20px; padding: 0 10px; margin-left: 0px;"
            @click="handleAdd">+</button>
        </template>
      </vue3-tabs-chrome>
  
      <v-window v-model="tab">
        <v-window-item v-for="tab in tabs" :key="tab.key" :value="tab.key">
          <v-card flat>
            <v-card-text class="pa-0"> 
              <div class="pa-1 bg-error text-caption" v-if="tab.errors.length > 0" @click="goToLine(tab.errors[0].row)">
                <v-btn size="small" variant="plain" @click="tab.currentError--"
                  :disabled="tab.currentError === 0">&lt;</v-btn>
                <v-btn size="small" variant="plain" @click="tab.currentError++"
                  :disabled="tab.currentError + 1 >= tab.errors.length">&gt;</v-btn>
                {{ tab.errors[tab.currentError].text }} on line
                {{ tab.errors[tab.currentError].row + 1 }}
              </div>
  <!--
              <v-ace-editor v-model:value="tab.content" lang="html" theme="tomorrow_night" :options="{
                useWorker: true
              }" style="height: 300px" @init="editorInit($event, tab)" />
              -->
  
              <div :ref="'firepad_' + tab.key"></div>
  
            </v-card-text>
          </v-card>
        </v-window-item>
      </v-window>
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
    data() {
      return {
        tab: 0,
        tabRef: {},
        firebaseDatabase: {},
        firebaseConnected: false,
        firebaseConnecting: false,
        updateKey: 0,
      };
    },
    methods: {
      editorInit: function (tab) {
        // Get a Vue ref to the Firepad element
  
        // Initialize ACE editor
        const firepadElement = this.$refs['firepad_' + tab.key];
        console.log(firepadElement)
        tab.editor = ace.edit(firepadElement[0]);
  
        let editor = tab.editor;
  
        editor.setTheme("ace/theme/tomorrow_night");
  
        var self = this;
  
        editor.getSession().doc.on('change', async function () {
          //tab.favico = require('./../assets/logo.png')
          tab.class = 'edited';
          tab.label = tab.title + ' *';        
        });
  
        var mode = util.getMode(tab.title);
        editor.getSession().setMode("ace/mode/" + mode);
  
        editor.getSession().on("changeAnnotation", function (someVar, session) {
          tab.errors = session.getAnnotations();
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
            //content = tab.data('original');
          }
          content = content.replace(/\r\n/g, "\n");
          //var edited = tab.data("edited");
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
          var firebaseDatabase = self.firebaseDatabase;
          var firepadRef = firebaseDatabase.refFromURL(firebaseUrl);
          
          //firepadRef = 'public/firepad-test-database'
  
          tab.firepadRef = firebase.database().ref(firepadRef);
  
          // Create Firepad.
          // FIXME usedid
          tab.firepad = Firepad.fromACE(tab.firepadRef, editor, {
            userId: '4044',
            //defaultText: content
          });
        }
  
        tab.editor = editor;
  
        //FIREPAD
        //var firepad = false;
  
        // FIXME get settings
        var settings = {};
        if (tab.site && (settings.shared || true)) {
          //firepad = true;
  
          if (!this.firebaseConnected) {
            this.firebaseConnect(function () {
              addFirepad(tab);
            });
          } else {
            addFirepad(tab);
          }
        }
  
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
  
        this.firebaseDatabase = firebase.database();
  
        // Log me in.
        // FIXME
        //var newAuthToken = util.storageGet('newAuthToken');
        var newAuthToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJmaXJlYmFzZS1hZG1pbnNkay1kZTZmbEBmaXJlYmFzZS1zaGlmdGVkaXQuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLCJzdWIiOiJmaXJlYmFzZS1hZG1pbnNkay1kZTZmbEBmaXJlYmFzZS1zaGlmdGVkaXQuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLCJhdWQiOiJodHRwczovL2lkZW50aXR5dG9vbGtpdC5nb29nbGVhcGlzLmNvbS9nb29nbGUuaWRlbnRpdHkuaWRlbnRpdHl0b29sa2l0LnYxLklkZW50aXR5VG9vbGtpdCIsInVpZCI6IjQwNDQiLCJpYXQiOjE2Nzk3NDY5NzMuNTI3MjcyLCJleHAiOjE2Nzk3NTA1NzMuNTI3MjcyLCJjbGFpbXMiOnsiaWQiOiI0MDQ0Iiwic2l0ZXMiOnsiMSI6dHJ1ZSwiNCI6dHJ1ZSwiNSI6dHJ1ZSwiMTk3Ijp0cnVlLCI1MzQiOnRydWUsIjYxNiI6dHJ1ZSwiNzMxIjp0cnVlLCIyNzQ4Ijp0cnVlLCIxNjIxMCI6dHJ1ZSwiMzMyNTciOnRydWUsIjMzMjU4Ijp0cnVlLCIzMzgyMCI6dHJ1ZSwiMzcxNTkiOnRydWUsIjM3MzAwIjp0cnVlLCI0MDQzMSI6dHJ1ZSwiNDM5ODkiOnRydWUsIjQ1MDA2Ijp0cnVlLCI0NTc0MSI6dHJ1ZSwiNDcwNzgiOnRydWUsIjQ4Mzc5Ijp0cnVlLCI0ODgyMyI6dHJ1ZSwiNDk3MTgiOnRydWUsIjUyNjY0Ijp0cnVlLCI2NTUwNSI6dHJ1ZSwiNzE2MTQiOnRydWUsIjc2MzA0Ijp0cnVlLCI5MDE4MCI6dHJ1ZSwiOTY4OTkiOnRydWUsIjk4NzM2Ijp0cnVlLCIxMDg2MjciOnRydWUsIjEyNTYxMiI6dHJ1ZSwiMTI3ODYwIjp0cnVlLCIxMjk0OTciOnRydWUsIjEzMjM5MiI6dHJ1ZSwiMTM2MzcwIjp0cnVlLCIxMzk1MzgiOnRydWUsIjEzOTk1MiI6dHJ1ZSwiMTM5OTUzIjp0cnVlLCIxNDAzNjAiOnRydWUsIjE0MDYyOCI6dHJ1ZSwiMTQxOTA4Ijp0cnVlLCIxNDI2MDAiOnRydWUsIjE0MzI3MiI6dHJ1ZSwiMTQzNjU4Ijp0cnVlLCIxNDUxOTAiOnRydWUsIjE0NTQzOSI6dHJ1ZSwiMTQ1Nzg2Ijp0cnVlLCIxNDgyMzUiOnRydWUsIjE0ODQ4OCI6dHJ1ZSwiMTUwMjM3Ijp0cnVlLCIxNTI0MzIiOnRydWUsIjE1MjQzNCI6dHJ1ZSwiMTUzMDE3Ijp0cnVlLCIxNTMwMjAiOnRydWUsIjE1Mzg5OCI6dHJ1ZSwiMTU0MzAzIjp0cnVlLCIxNTU2MTUiOnRydWUsIjE1NjI5MSI6dHJ1ZSwiMTY2NDIwIjp0cnVlLCIxNzQ5NDciOnRydWUsIjE3NTMzOSI6dHJ1ZSwiMTc2OTA3Ijp0cnVlLCIxNzk5MzYiOnRydWUsIjE4MDQ4OSI6dHJ1ZSwiMjA3OTE2Ijp0cnVlLCIyMjQxNzQiOnRydWUsIjI0NDg3MyI6dHJ1ZSwiMjYwMzE2Ijp0cnVlLCIyNjA5OTAiOnRydWUsIjI2MzQ3OCI6dHJ1ZSwiMjY3Njk4Ijp0cnVlLCIyNjc5NzYiOnRydWUsIjI2ODE0MCI6dHJ1ZSwiMjY4MzM2Ijp0cnVlLCIyNjk2OTAiOnRydWUsIjI3MDc2NyI6dHJ1ZSwiMjc2MDkzIjp0cnVlLCIyOTQ4MzQiOnRydWUsIjMwNzQ4NiI6dHJ1ZSwiMzE3NjkyIjp0cnVlLCIzMzMzMjgiOnRydWUsIjMzNjQ2MiI6dHJ1ZSwiMzM3NzM4Ijp0cnVlLCIzNDE5NjEiOnRydWUsIjM0NTA3MyI6dHJ1ZSwiMzU2NDM1Ijp0cnVlLCIzNjMyNTMiOnRydWUsIjM3MzIxMCI6dHJ1ZSwiMzc0NjkyIjp0cnVlLCIzOTE1ODkiOnRydWUsIjM5MTYzMyI6dHJ1ZSwiMzk3Mjk1Ijp0cnVlLCIzOTg5MzYiOnRydWUsIjQwNTgxNiI6dHJ1ZSwiNDE0Mjg4Ijp0cnVlLCI0MzA3MDgiOnRydWUsIjQzMTMyNCI6dHJ1ZSwiNDQ3NjAwIjp0cnVlLCI0NDgxNDYiOnRydWUsIjQ0OTEwNSI6dHJ1ZSwiNDQ5MTUwIjp0cnVlLCI0NDk1NjgiOnRydWUsIjQ1NDgxNSI6dHJ1ZSwiNDU5NjIyIjp0cnVlLCI0NjM4MDYiOnRydWUsIjQ3MjAyOCI6dHJ1ZSwiNDcyMzQ1Ijp0cnVlLCI0NzY3MzEiOnRydWUsIjQ3OTMyMiI6dHJ1ZSwiNDgxMTA1Ijp0cnVlLCI0ODcwMTEiOnRydWUsIjQ5MjY0MiI6dHJ1ZSwiNDkzNDg5Ijp0cnVlLCI0OTM4ODIiOnRydWUsIjUwMDQxMCI6dHJ1ZSwiNTAwNDIyIjp0cnVlLCI1MDA1OTciOnRydWUsIjUwMTIzNCI6dHJ1ZSwiNTAxOTM1Ijp0cnVlLCI1MDYzNjQiOnRydWUsIjUwODk4NyI6dHJ1ZSwiNTExNDA5Ijp0cnVlLCI1MTM1ODUiOnRydWUsIjUxNDI4MyI6dHJ1ZSwiNTE0ODY3Ijp0cnVlLCI1MTUwNDkiOnRydWUsIjUyMDcyMSI6dHJ1ZSwiNTIyNzQyIjp0cnVlLCI1MjM0MzkiOnRydWUsIjUyMzQ1MiI6dHJ1ZSwiNTI3MTgyIjp0cnVlLCI1MjgyNTAiOnRydWUsIjUzMDM1MSI6dHJ1ZSwiNTMzMzUwIjp0cnVlLCI1MzM0NzAiOnRydWUsIjUzNzgxMiI6dHJ1ZSwiNTM3ODQzIjp0cnVlLCI1NDI0MDgiOnRydWUsIjU1MDcyMiI6dHJ1ZSwiNTU3OTg3Ijp0cnVlLCI1NjAwOTMiOnRydWUsIjU2ODYzMiI6dHJ1ZSwiNTk1OTgwIjp0cnVlLCI1OTk0OTQiOnRydWUsIjYyMDE3MCI6dHJ1ZSwiNjI2NjkxIjp0cnVlLCI2MjY3OTMiOnRydWUsIjYzNDc5NCI6dHJ1ZSwiNjQ0NjE3Ijp0cnVlLCI2NTY1NTEiOnRydWUsIjY1NjU2MSI6dHJ1ZSwiNjYyNjU1Ijp0cnVlLCI2NjMwNjIiOnRydWUsIjY3MDUxMiI6dHJ1ZSwiNjcxNzA2Ijp0cnVlLCI2ODI2MTUiOnRydWUsIjY4NDgxMiI6dHJ1ZSwiNjk4MzkzIjp0cnVlLCI3MTE5NzMiOnRydWUsIjcxOTMzMiI6dHJ1ZSwiNzIyMDY3Ijp0cnVlLCI3MjQ2MTAiOnRydWUsIjcyNTE1NyI6dHJ1ZSwiNzMwNTI0Ijp0cnVlLCI3MzA1MjUiOnRydWUsIjczMjg5MCI6dHJ1ZSwiNzM4MjU0Ijp0cnVlLCI3NTU4ODgiOnRydWUsIjc1NzcyNyI6dHJ1ZSwiNzU4ODYxIjp0cnVlLCI3NjI3MjgiOnRydWUsIjc5MDA3NiI6dHJ1ZSwiNzk1MTg4Ijp0cnVlLCI4MDA2MDEiOnRydWUsIjgxNTkzNiI6dHJ1ZSwiODIxMDA5Ijp0cnVlLCI4MjEwMTAiOnRydWUsIjgyMTAxMSI6dHJ1ZSwiODI4Nzg5Ijp0cnVlLCI4Mjk5NDMiOnRydWUsIjg0Mzc4MyI6dHJ1ZSwiODUwOTU5Ijp0cnVlLCI4NTA5NjAiOnRydWUsIjg1MDk2NCI6dHJ1ZSwiODUwOTcxIjp0cnVlLCI4NjEzNzYiOnRydWUsIjg3OTE0NCI6dHJ1ZSwiODgxNDEwIjp0cnVlLCI4ODE4NDEiOnRydWUsIjg4MzQxNyI6dHJ1ZSwiODk0MDczIjp0cnVlLCI4OTcyMzciOnRydWUsIjkwMDA1OCI6dHJ1ZSwiOTAxMjcxIjp0cnVlLCI5MDM3MzQiOnRydWUsIjkxMTQ1MSI6dHJ1ZSwiOTE5NjM5Ijp0cnVlLCI5MzkxNTUiOnRydWUsIjkzOTMyMSI6dHJ1ZSwiOTM5NzAzIjp0cnVlLCI5NDI2NzIiOnRydWUsIjk0ODQ0NCI6dHJ1ZSwiOTQ5Nzc2Ijp0cnVlLCI5NDk3NzkiOnRydWUsIjk1NDU4OSI6dHJ1ZSwiOTYwMDQ3Ijp0cnVlLCI5NjMzMjMiOnRydWUsIjk3NjA4OSI6dHJ1ZSwiOTc3OTg0Ijp0cnVlLCI5Nzg5MzQiOnRydWUsIjk3ODk0MSI6dHJ1ZSwiOTgwMTE1Ijp0cnVlLCI5ODAzMzkiOnRydWUsIjk4ODExOCI6dHJ1ZSwiOTkwMjE0Ijp0cnVlLCI5OTIxNDQiOnRydWUsIjk5Nzg0OSI6dHJ1ZSwiOTk5NDMzIjp0cnVlLCIxMDAxMjMyIjp0cnVlLCIxMDA1ODg1Ijp0cnVlLCIxMDA1ODg3Ijp0cnVlLCIxMDA1OTY0Ijp0cnVlLCIxMDA4NTE5Ijp0cnVlLCIxMDIzNTg4Ijp0cnVlLCIxMDIzNjg0Ijp0cnVlLCIxMDI0OTkxIjp0cnVlLCIxMDM3ODUxIjp0cnVlLCIxMDQyMzEwIjp0cnVlLCIxMDczODk1Ijp0cnVlLCIxMDczODk2Ijp0cnVlLCIxMDgzOTUxIjp0cnVlLCIxMDkxMzE0Ijp0cnVlLCIxMDkxNDM1Ijp0cnVlLCIxMTEzMTk3Ijp0cnVlLCIxMTIyMDEzIjp0cnVlLCIxMTUzOTg1Ijp0cnVlLCIxMTU3ODYyIjp0cnVlLCIxMTYyOTEwIjp0cnVlLCIxMTY2NzUxIjp0cnVlLCIxMTcwNDUzIjp0cnVlLCIxMTkwMTk2Ijp0cnVlLCIxMTkwNDA5Ijp0cnVlLCIxMTkxMDk0Ijp0cnVlLCIxMTk3MDUwIjp0cnVlLCIxMTk3MDcwIjp0cnVlLCIxMTk3MDc0Ijp0cnVlLCIxMTk3MDc5Ijp0cnVlLCIxMTk3MDgxIjp0cnVlLCIxMjAwMTQxIjp0cnVlLCIxMjAyMTk1Ijp0cnVlLCIxMjAzOTU0Ijp0cnVlLCIxMjA0MDA1Ijp0cnVlLCIxMjExMjQ0Ijp0cnVlLCIxMjE0OTkyIjp0cnVlfX19.WI7vaW1a7MvutY0wS4XDgA5r4fOfMfBG5V4JboFXap4c1hhkCrhNeGr66vAhsrr0oXF5-k4MGkG8S7jH8wKzy4PHnf1CzaofUmTlp8HqYCNzQfSjfYrmiYUoS7vo2QmxXdouSHr5dk6Mq051DShsdrn-0j_H8fy_6vgAZR7LLwcR_WjEi4rfW6w_zQBe1HTyoQXFzhBCXzOUZf4iIQxtEjGwKZeWSX67cu86DZ9AxhQ6wBDPGKOvDa2Pul2zF9QkhXOy2vsLYrDrr4VNTtJCK2B53gEdWsSGFpTtP7oNB1Xm2PhlRO08hmKQt2czk7xnbqUJPalaVKd_9YGBvnYpRw';
  
        firebase.auth().signInWithCustomToken(newAuthToken)
          .catch(function (error) {
            //var errorCode = error.code;
            //var errorMessage = error.message;
  
            console.log("Firebase login failed", error.message);
  
            //token expired, load a new one
            self.firebaseConnecting = false;
  
            // FIXME reconnect
            //reconnect();
            return false;
          })
          .then(function () {
            console.log("Firebase login succeeded");
            self.firebaseConnected = true;
            self.firebaseConnecting = false;
            //console.log(authData);
  
            // get a new token every day
            setTimeout(function () {
              console.log('get new firebase token');
  
              // get a new token
  
              // FIXME
              /*
              preferences.load()
                .then(function (data) {
                  console.log('reconnect to firebase');
                  connect();
                });
              */
  
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
      setTabRef: function(el) {
        this.tabRef = el
      },
      handleAdd: function() {
        const key = 'tab' + Date.now()
        this.tabRef.addTab(reactive({
          label: ref('untitled.html'),
          title: 'untitled.html',
          key: key,
          content: '',
          editor: null,
          errors: [],
          currentError: 0,
        }))
        this.tab = key
      },
      handleRemove: function (tab) {
        let editor = tab.editor;
        editor.session.$stopWorker();
  
        var firepad = tab.firepad;
        //var firepadUserList = $(tab).data('firepadUserList');
        var firepadRef = tab.firepadRef;
        console.log(firepadRef)
        //remove firepad if last user
        //if (firepadUserList && Object.keys(firepadUserList.users).length == 1) {
        console.log('remove firepad session');
        firepadRef.off('value');
        firepadRef.remove();
        //}
  
        /*
        if (firepadUserList) {
          firepadUserList.dispose();
          $(tab).data('firepadUserList', false);
        }
        */
  
        try {
          firepad.dispose();
        } catch (e) {
          console.log(e);
        }
  
        editor.destroy();
        //editor.container.parentNode.removeChild(editor.container);
  
        this.tabRef.removeTab(tab)
      },
  
    },
    setup() {
      const tabs = reactive([]);
  
      const openFile = async function (newTab) {
        newTab.label = ref(newTab.title);
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
      //this.handleAdd();
    }
  })
  </script>