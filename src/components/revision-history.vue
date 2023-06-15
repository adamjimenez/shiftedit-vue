<template>
    <v-btn icon @click="revisionHistory">
        <v-icon>mdi-history</v-icon>
    </v-btn>

    <v-dialog v-model="revisionDialog" width="100%" height="100%">
        <v-card>
            <v-card-title>Revision history</v-card-title>
            <v-card-text>
                <v-row>
                    <v-col style="flex: 10;">
                        <v-select v-model="revisionFile" label="File" :items="data.files" @update:modelValue="load"></v-select>
                    </v-col>
                    <v-col>
                        <v-btn :disabled="revisionId == ''" @click="restore">Restore</v-btn>
                    </v-col>
                </v-row>
                <v-row class="mb-6" no-gutters>
                    <v-col cols="3">
                        <v-sheet class="pa-2 ma-2">
                            <v-list lines="one">
                                <v-list-item v-for="item in data.revisions" :key="item.title" :title="item.date"
                                    :subtitle="item.author" @click="showRevision(item.id)"></v-list-item>
                            </v-list>
                        </v-sheet>
                    </v-col>

                    <v-col cols="9">
                        <v-sheet class="pa-2 ma-2">
                            <div v-html="diffContent"></div>
                        </v-sheet>
                    </v-col>
                </v-row>
            </v-card-text>
            <v-card-actions>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script>
import api from "./../services/api";
import * as Diff2Html from 'diff2html';
import 'diff2html/bundles/css/diff2html.min.css';
import * as Diff from "diff";

export default {
    props: {
        tabs: null,
        siteId: null,
        currentTab: null,
    },
    data() {
        return {
            revisionDialog: false,
            items: [
                {
                    title: 'title',
                    subtitle: 'subtitle',
                }
            ],
            revisionFile: '',
            revisionId: '',
            files: [],
            data: {
                files: [],
                revisions: [],
                content: '',
            },
            diffContent: '',
        }
    },
    watch: {
    },
    methods: {
        revisionHistory: async function () {
            this.revisionFile = this.file;
            this.revisionDialog = true;
            this.revisionId = '';
            this.load();
        },
        showRevision: function(revisionId) {
            this.revisionId = revisionId;
            this.load();
        },
        load: async function () {
            var result = await api.get('revisions?site=' + this.siteId + '&file=' + this.revisionFile + '&revision=' + this.revisionId + '&no_content=1');

            if (result.data.content) {
                var editor = this.currentTab?.editor;

                var editorContent = editor ? editor.getValue() : '';
                var diff = Diff.createPatch(this.revisionFile, editorContent, result.data.content);

                var prettyHtml = Diff2Html.html(diff, {
                    inputFormat: 'diff',
                    drawFileList: true,
                    matching: 'lines',
                });

                this.diffContent = prettyHtml;
                this.data.content = result.data.content;
            } else {                
                this.data = result.data;
            }
        },
        restore: function () {
            var editor = this.currentTab?.editor;

            if (editor) {
                editor.setValue(this.data.content);
            }

            this.revisionDialog = false;
        }
    },

    mounted() {
    },
};
</script>