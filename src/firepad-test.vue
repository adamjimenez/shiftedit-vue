<template>
    <div>
      <div ref="firepad" style="height: 1000px;"></div>
    </div>
  </template>
  
  <script>
  import firebase from 'firebase/app';
  import 'firebase/database';
  import ace from 'ace-builds/src-noconflict/ace';
  import 'ace-builds/src-noconflict/mode-text';
  import 'ace-builds/src-noconflict/theme-monokai';
  import Firepad from 'firepad';
    
  export default {
    mounted() {
      // Initialize Firebase with your Firebase project credentials
      firebase.initializeApp({
        apiKey: "AIzaSyCZScKs0pAv97SAOM9SQvHx49niOJKA8K4",
          authDomain: "shiftedit.firebaseapp.com",
          databaseURL: "https://shiftedit.firebaseio.com",
          projectId: "firebase-shiftedit",
          storageBucket: "firebase-shiftedit.appspot.com",
          messagingSenderId: "899582558962"
      });
  
      // Get a Firebase database reference for Firepad
      const firepadRef = firebase.database().ref('public/firepad-test-database');
  
      // Get a Vue ref to the Firepad element
      const firepadElement = this.$refs.firepad;
  
      // Initialize ACE editor
      const editor = ace.edit(firepadElement);
  
  
      Firepad.fromACE(firepadRef, editor);
    },
  };
  </script>
   
  
  
  