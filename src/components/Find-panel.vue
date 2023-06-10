<template>
    <v-textarea label="Find" v-model="needle" ref="find" @keydown="keyDown" @keypress="keyPress"></v-textarea>
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
            needle: '',
            findCount: 0,
            findIndex: 0,
            replaceVal: '',
            regExp: false,
            caseSensitive: false,
            wholeWord: false,
            history: [],
            historyIndex: 0,
        }
    },
    watch: {
        needle(val) {
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
                this.needle = val;
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
                needle: this.needle,
                caseSensitive: this.caseSensitive,
                wholeWord: this.wholeWord,
                regExp: this.regExp,
            };

            return editor.$search.set(options);
        },
        next() {
            // save history
            if (this.needle !== this.history[this.historyIndex]) {
                this.history.push(this.needle);
                this.historyIndex = this.history.length - 1;
            }

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
            editor.find(this.needle);
            this.updateIndex();
        },
        replaceAll () {
            let editor = this.tabs.currentTab.editor;
            editor.replaceAll(this.replaceVal);
            this.updateIndex();
        },
        keyDown (e) {
            // cycle through search history
            if (['ArrowUp', 'ArrowDown'].indexOf(e.key) != -1) {
                if (e.key === 'ArrowUp' && this.history.length && this.historyIndex > 0) {
                    this.historyIndex--;
                } else if (e.key === 'ArrowDown' && this.history.length && this.historyIndex < this.history.length) {
                    this.historyIndex++;
                }
                
                this.needle = this.history[this.historyIndex];
                e.preventDefault();
            }
        },
        keyPress (e) {
            if (e.keyCode === 10) { // ctrl enter
                this.insertNewLine();
            } else if (e.keyCode === 13) { // search on enter
                e.preventDefault();
                this.next();
			}
        },
        insertNewLine() {
            let textarea = this.$refs.find.$el.getElementsByTagName('textarea')[0];
            console.log(textarea)

            // Get the current cursor position
            let cursorPosition = textarea.selectionStart;

            // Insert a newline character at the cursor position
            textarea.value = textarea.value.slice(0, cursorPosition) + "\n" + textarea.value.slice(cursorPosition);

            // Move the cursor to the next line
            textarea.selectionStart = cursorPosition + 1;
            textarea.selectionEnd = cursorPosition + 1;
        }
    },

    shortcuts: {
    },
    mounted() {
    },
};
</script>