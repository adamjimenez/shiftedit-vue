<template>
    <v-card class="align-start flex-column flex" style="max-height: 100%;">
        <v-tabs v-model="tab">
            <v-tab value="changes">
                <v-icon>mdi-folder</v-icon>
            </v-tab>
            <v-tab value="history">
                <v-icon>mdi-history</v-icon>
            </v-tab>
            <v-tab value="stashes">
                <v-icon>mdi-clipboard</v-icon>
            </v-tab>
        </v-tabs>

        <v-progress-linear v-if="loading" indeterminate></v-progress-linear>

        <v-window v-model="tab" class="d-flex align-start flex-column w-100 h-100" style="overflow: auto;">
            <v-window-item value="changes" class="align-start flex-column h-100 w-100">
                <v-data-table v-model="selected" :headers="[{
                    title: data.changes.length + ' changed file' + (data.changes.length !== 1 ? 's' : ''),
                    key: 'path',
                }]" :items="data.changes" item-value="path" show-select items-per-page="-1">
                    <!-- eslint-disable-next-line -->
                    <template v-slot:item.path="{ item }">
                        <div @contextmenu="showChangeMenu(item, $event)" @click="showDiff(item)">
                            {{ item.value }}
                        </div>
                    </template>
                    <template #bottom></template></v-data-table>

                <v-container fluid class="mt-auto">
                    <v-text-field v-model="subject" placeholder="Summary"></v-text-field>
                    <v-textarea v-model="description" placeholder="Description"></v-textarea>
                    <v-btn @click="commit" :disabled="selected.length === 0 || !subject">Commit to {{ currentBranch +
                        (data.changes.length ? '*' : '') }}</v-btn>
                </v-container>
            </v-window-item>

            <v-window-item value="history">
                <v-list class="w-100" style="overflow: auto;">
                    <v-list-item v-for="item in commits" :key="item.hash" :title="item.subject" :subtitle="item.subtitle"
                        :value="item.hash" @click="showCommit(item)" @contextmenu="showCommitMenu(item, $event)"></v-list-item>
                </v-list>
            </v-window-item>

            <v-window-item value="stashes">
                <v-list class="w-100" style="overflow: auto;">
                    <v-list-item v-for="item in data.stashes" :key="item.index" :title="item.name" :value="item.index"
                        @contextmenu="showStashMenu(item, $event)"></v-list-item>
                </v-list>
            </v-window-item>
        </v-window>

        <v-menu v-model="changeMenu" :style="'left: ' + menuX + 'px; top: ' + menuY + 'px;'">
            <v-btn text block @click="openChange">Open file</v-btn>
            <v-btn text block @click="discardChange">Discard changes</v-btn>
        </v-menu>

        <v-menu v-model="commitMenu" :style="'left: ' + menuX + 'px; top: ' + menuY + 'px;'">
            <v-btn text block @click="copyCommit">Copy</v-btn>
            <v-btn text block @click="revert">Revert</v-btn>
            <v-btn text block @click="resetToCommit">Reset to commit</v-btn>
            <v-btn text block @click="resetToOrigin">Reset to origin/ master</v-btn>
        </v-menu>

        <v-menu v-model="stashMenu" :style="'left: ' + menuX + 'px; top: ' + menuY + 'px;'">
            <v-btn text block @click="applyStash">Apply</v-btn>
            <v-btn text block @click="removeStash">Remove</v-btn>
        </v-menu>

        <v-dialog v-model="prompt" scrollable width="auto">
            <v-card>
                <v-card-title>{{ title }}</v-card-title>
                <v-divider></v-divider>
                <v-card-text>
                    <div v-html="message"></div>
                </v-card-text>
                <v-divider></v-divider>
                <v-card-actions>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-model="diffDialog" width="100%" height="100%">
            <v-card>
                <v-card-title>{{ diffTitle }}</v-card-title>
                <v-divider></v-divider>
                <v-card-text>
                    <div v-html="diffContent"></div>
                </v-card-text>
                <v-divider></v-divider>
                <v-card-actions>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <confirm ref="confirm" />
    </v-card>
</template>

<style>
.v-window-item {
    display: flex;
}

.v-window__container {
    width: 100%;
}

.d2h-file-diff {
    background: #fff;
    color: #000;
}

.flex {
    display: flex;
}
</style>

<script>
import api from "./../services/api";
import util from "./../services/util";
import confirm from "./confirm-dialog.vue";
import * as Diff2Html from 'diff2html';
import 'diff2html/bundles/css/diff2html.min.css';
import linkifyHtml from "linkify-html";

export default {
    components: {
        confirm,
    },
    props: {
        tabs: null,
        currentSite: null,
    },
    data() {
        return {
            tab: 0,
            selected: [],
            subject: '',
            description: '',
            data: {
                branches: [],
                changes: [],
                commits: [],
                stashes: [],
                config: {},
            },
            menuX: 0,
            menuY: 0,
            commitMenu: false,
            changeMenu: false,
            stashMenu: false,
            selectedCommit: {},
            selectedChange: {},
            selectedStash: {},
            prompt: false,
            title: '',
            message: '',
            loading: false,
            diffDialog: false,
            diffTitle: '',
            diffContent: '',
        }
    },
    methods: {
        load: async function () {
            let params = {
                user: this.currentSite.ftp_user,
                pass: util.sha1(this.currentSite.ftp_pass),
            }

            this.loading = true;
            let response = await api.post(this.currentSite.apiBaseUrl + '&cmd=git_info', params);
            this.loading = false;

            if (response.data.error) {
                alert(response.data.error);
                return;
            }

            this.data = response.data;
            
            this.$emit('load', this.data);
        },
        commit: async function () {
            var params = {
                subject: this.subject,
                description: this.description,
                paths: this.selected
            };

            this.loading = true;
            let response = await api.post(this.currentSite.apiBaseUrl + '&cmd=commit', params);
            this.loading = false;

            if (response.data.error) {
                alert(response.data.error);
                return;
            }

            console.log(response)

            this.title = 'Notice';
            this.message = response.data.result.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br>$2')
            this.prompt = true;

            this.subject = '';
            this.description = '';
            this.selected = [];

            this.load();
        },
        showCommitMenu(commit, event) {
            this.selectedCommit = commit;
            event.preventDefault();
            this.commitMenu = true;
            this.menuX = event.clientX;
            this.menuY = event.clientY;
            return false // stop propagation
        },
        showDiff: async function(change) {
            var params = {};

            this.loading = true;
            let response = await api.post(this.currentSite.apiBaseUrl + '&cmd=diff&path=' + change.value, params);
            this.loading = false;

            if (response.data.error) {
                alert(response.data.error);
                return;
            }

            this.openDiff(change.value, response.data.result)
        },
        showCommit: async function(commit) {
            var params = {};

            this.loading = true;
            let response = await api.post(this.currentSite.apiBaseUrl + '&cmd=show&commit=' + commit.hash, params);
            this.loading = false;

            if (response.data.error) {
                alert(response.data.error);
                return;
            }

            this.openDiff(commit.subject, response.data.result);
        },
        openDiff(title, diff) {
            var prettyHtml = Diff2Html.html(diff, {
                drawFileList: true,
                matching: 'lines',
            });

            this.diffDialog = true;
            this.diffTitle = title;
            this.diffContent = prettyHtml;
        },
        copyCommit() {
            util.copy(this.selectedCommit.hash)
        },
        revert: async function() {
            if (
                await this.$refs.confirm.open(
                    "Confirm",
                    "Are you sure you want to revert this commit?"
                )
            ) {
                var params = {};
                let response = await api.post(this.currentSite.apiBaseUrl + '&cmd=revert&hash=' + this.selectedCommit.hash, params);

                if (response.data.error) {
                    alert(response.data.error);
                    return;
                }

                this.load();
            }
        },
        resetToCommit: async function () {
            if (
                await this.$refs.confirm.open(
                    "Confirm",
                    "Are you sure you want to reset to this commit?"
                )
            ) {
                var params = {};
                let response = await api.post(this.currentSite.apiBaseUrl + '&cmd=reset&hash=' + this.selectedCommit.hash, params);

                if (response.data.error) {
                    alert(response.data.error);
                    return;
                }

                this.load();
            }
        },
        resetToOrigin: async function() {
            if (
                await this.$refs.confirm.open(
                    "Confirm",
                    "Are you sure you want to reset to origin/master?"
                )
            ) {
                var params = {};
                let response = await api.post(this.currentSite.apiBaseUrl + '&cmd=reset_origin', params);

                if (response.data.error) {
                    alert(response.data.error);
                    return;
                }

                this.load();
            }
        },
        showChangeMenu(change, event) {
            this.selectedChange = change;
            event.preventDefault();
            this.changeMenu = true;
            this.menuX = event.clientX;
            this.menuY = event.clientY;
            return false // stop propagation
        },
        openChange() {
            this.$emit('open', this.selectedChange.value);
        },
        discardChange: async function () {
            var params = {};
            let response = await api.post(this.currentSite.apiBaseUrl + '&cmd=discard&path=' + this.selectedChange.value, params);

            if (response.data.error) {
                alert(response.data.error);
                return;
            }

            this.load();
        },
        showStashMenu(stash, event) {
            this.selectedStash = stash;
            event.preventDefault();
            this.stashMenu = true;
            this.menuX = event.clientX;
            this.menuY = event.clientY;
            return false // stop propagation
        },
        applyStash: async function () {
            var params = {};
            let response = await api.post(this.currentSite.apiBaseUrl + '&cmd=stash_apply&index=' + this.selectedStash.value, params);

            if (response.data.error) {
                alert(response.data.error);
                return;
            }

            this.title = 'Success';
            this.message = 'Git stash applied';
            this.prompt = true;

            // todo add confirm

            this.load();
        },
        removeStash: async function () {
            if (
                await this.$refs.confirm.open(
                    "Confirm",
                    "Are you sure you want to remove this stash?"
                )
            ) {
                var params = {};
                let response = await api.post(this.currentSite.apiBaseUrl + '&cmd=stash_drop&index=' + this.selectedStash.value, params);

                if (response.data.error) {
                    alert(response.data.error);
                    return;
                }

                this.load();
            }
        },
        sync: async function () {
            var params = {};
            let response = await api.post(this.currentSite.apiBaseUrl + '&cmd=sync', params);

            if (response.data.error) {
                alert(response.data.error);
                return;
            }

            this.title = 'Success';
            var html = response.data.result.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br>$2');
            html = linkifyHtml(html, {target: '_blank'});

            this.message = html;
            this.prompt = true;
        }
    },

    computed: {
        currentBranch: function () {
            let currentBranch = 'master';

            this.data.branches.forEach(function (branch) {
                if (branch.selected) {
                    currentBranch = branch.name;
                }
            })

            return currentBranch;
        },
        commits: function () {
            var commits = [];

            this.data.commits.forEach(function (commit) {
                commit.subtitle = commit.date + ' by ' + commit.author;
                commits.push(commit);
            })

            return commits;
        }
    },

    shortcuts: {
    },
    mounted() {
    },
};
</script>