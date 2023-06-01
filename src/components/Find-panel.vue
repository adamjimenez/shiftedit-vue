<template>
    <v-textarea label="Find" v-model="findVal" ref="find"></v-textarea>
    <p>{{ findIndex }} of {{ findCount }}</p>
    <v-btn @click="prev">&lt;</v-btn>
    <v-btn @click="next">&gt;</v-btn>
    <v-textarea label="Replace" v-model="replaceVal" ref="replace"></v-textarea>
    <v-btn @click="replace">Replace</v-btn>
    <v-btn @click="replaceAll">Replace all</v-btn>
</template>

<script>
export default {
    props: {
        tabs: null,
    },
    data() {
        return {
            findVal: '',
            findCount: 0,
            findIndex: 0,
            replaceVal: '',
        }
    },
    watch: {
        findVal(val) {
            let editor = this.tabs.currentTab.editor;
            editor.find(val);
            this.updateIndex();
        },
    },
    methods: {
        find(val) {
            if (val && val.length) {
                this.findVal = val;
            }

            var self = this;
            this.$nextTick(() => {
                setTimeout(() => {
                    self.$refs.find.$el.getElementsByTagName('textarea')[0].focus()
                })
            })
        },
        updateIndex() {
            let editor = this.tabs.currentTab.editor;

            var options = {
                skipCurrent: false,
                wrao: false,
                needle: this.findVal,
            }
            var search = editor.$search.set(options);
            let results = search.findAll(editor.getSession());
            this.findCount = results.length;

            let range = editor.getSelectionRange();
            let findIndex = 0;

            let found = false;
            for (let i = 0; i < results.length; i++) {
                findIndex++;

                if (
                    results[i].start.row == range.start.row &&
                    results[i].start.column == range.start.column &&
                    results[i].end.row == range.end.row &&
                    results[i].end.column == range.end.column
                ) {
                    found = true;
                    break;
                }
            }

            this.findIndex = found ? findIndex : 0;
        },
        next() {
            let editor = this.tabs.currentTab.editor;

            var options = {
                skipCurrent: false,
                wrap: true,
                needle: this.findVal,
            }
            editor.$search.set(options);
            console.log(editor.$search);
            editor.findNext();
            this.updateIndex();
        },
        prev () {
            let editor = this.tabs.currentTab.editor;

            var options = {
                skipCurrent: false,
                wrap: false,
                needle: this.findVal,
            }

            editor.$search.set(options);
            editor.findPrevious();
            this.updateIndex();
        },
        replace () {
            let editor = this.tabs.currentTab.editor;
            this.next();
            editor.replace(this.replaceVal);
            editor.find(this.findVal);
            this.updateIndex();
        },
        replaceAll () {
            let editor = this.tabs.currentTab.editor;
            editor.replaceAll(this.replaceVal);
            this.updateIndex();
        }
    },

    shortcuts: {
    },
    mounted() {
    },
};
</script>