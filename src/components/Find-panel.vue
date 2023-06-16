<template>
    <v-btn-toggle v-model="findIn">
        <v-btn icon title="Find in Current Document" value="current">
            <v-icon>mdi-file</v-icon>
        </v-btn>
        <v-btn icon title="Find in Open Documents" value="open">
            <v-icon>mdi-file-multiple</v-icon>
        </v-btn>
    </v-btn-toggle>
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
            findIn: 'current',
        }
    },
    watch: {
        findIn() {
            this.updateIndex();
        },
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
            let tabs = this.findIn === 'current' ? [this.tabs.currentTab] : this.tabs.tabs;
            let findIndex = 0;
            let found = false;
            let self = this;
            let findCount = 0;

            tabs.forEach(function (tab) {
                let editor = tab.editor;
                let search = self.setSearch(editor);

                let results = search.findAll(editor.getSession());
                findCount += results.length;

                let range = editor.getSelectionRange();
                for (let i = 0; i < results.length; i++) {
                    if (!found) {
                        findIndex++;
                    }

                    if (
                        self.tabs.currentTab.key == tab.key &&
                        results[i].start.row == range.start.row &&
                        results[i].start.column == range.start.column &&
                        results[i].end.row == range.end.row &&
                        results[i].end.column == range.end.column
                    ) {
                        found = true;
                        break;
                    }
                }
            });

            this.findCount = findCount;
            this.findIndex = found ? findIndex : 0;
        },
        setSearch(editor) {
            var options = {
                skipCurrent: false,
                wrap: this.findIn === 'current',
                needle: this.needle,
                caseSensitive: this.caseSensitive,
                wholeWord: this.wholeWord,
                regExp: this.regExp,
            };

            return editor.$search.set(options);
        },
        next: async function () {
            // save history
            if (this.needle !== this.history[this.historyIndex]) {
                this.history.push(this.needle);
                this.historyIndex = this.history.length - 1;
            }

            let editor = this.tabs.currentTab.editor;
            this.setSearch(editor);
            editor.findNext();
            this.updateIndex();

            if (this.findCount && this.findIndex === 0) {
                // next file
                this.tabs.nextTab();
                await this.$nextTick();

                let editor = this.tabs.currentTab.editor;
                editor.commands.exec('gotostart', editor);

                this.next();
            }
        },
        prev: async function () {
            let editor = this.tabs.currentTab.editor;
            this.setSearch(editor);
            editor.findPrevious();
            this.updateIndex();

            if (this.findCount && this.findIndex === 0) {
                // prev file
                this.tabs.prevTab();
                await this.$nextTick();

                let editor = this.tabs.currentTab.editor;
                editor.commands.exec('gotoend', editor);

                this.prev();
            }
        },
        replace() {
            let editor = this.tabs.currentTab.editor;
            this.next();
            editor.replace(this.replaceVal);
            editor.find(this.needle);
            this.updateIndex();
        },
        replaceAll() {
            let tabs = this.findIn === 'current' ? [this.tabs.currentTab] : this.tabs.tabs;

            let self = this;
            tabs.forEach(function (tab) {
                let editor = tab.editor;
                editor.replaceAll(self.replaceVal);

            });
            
            this.updateIndex();
        },
        keyDown(e) {
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
        keyPress(e) {
            if (e.keyCode === 10) { // ctrl enter
                this.insertNewLine();
            } else if (e.keyCode === 13) { // search on enter
                e.preventDefault();
                this.next();
            }
        },
        insertNewLine() {
            let textarea = this.$refs.find.$el.getElementsByTagName('textarea')[0];

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