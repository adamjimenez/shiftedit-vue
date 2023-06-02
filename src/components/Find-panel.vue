<template>
    <v-textarea label="Find" v-model="findVal" ref="find"></v-textarea>
    <p>{{ findIndex }} of {{ findCount }}</p>
    <v-btn-toggle v-model="regExp">
        <v-btn icon title="Regex" value="true">        
            <v-icon>mdi-regex</v-icon>
        </v-btn>
    </v-btn-toggle>
    <v-btn-toggle v-model="caseSensitive">
        <v-btn icon title="Case sensitive" value="true">        
            <v-icon>mdi-case-sensitive-alt</v-icon>
        </v-btn>
    </v-btn-toggle>
    <v-btn-toggle v-model="wholeWord">
        <v-btn icon title="Whole words" value="true">        
            <v-icon>mdi-file-word-box</v-icon>
        </v-btn>
    </v-btn-toggle>

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
            regExp: false,
            caseSensitive: false,
            wholeWord: false,
        }
    },
    watch: {
        findVal(val) {
            let editor = this.tabs.currentTab.editor;
            editor.find(val);
            this.updateIndex();
        },
        regExp() {
            this.updateIndex();
        },
        caseSensitive() {
            this.updateIndex();
        },
        wholeWord() {
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
            var search = this.setSearch();

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
        setSearch() {
            let editor = this.tabs.currentTab.editor;

            var options = {
                skipCurrent: false,
                wrap: true,
                needle: this.findVal,
                caseSensitive: this.caseSensitive,
                wholeWord: this.wholeWord,
                regExp: this.regExp,
            };
            console.log(options)

            return editor.$search.set(options);
        },
        next() {
            let editor = this.tabs.currentTab.editor;
            this.setSearch();
            editor.findNext();
            this.updateIndex();
        },
        prev () {
            let editor = this.tabs.currentTab.editor;
            this.setSearch();
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