<template>
    <div>

        <v-dialog v-model="dialog" width="100%">
            <v-card :loading="loading">
                <v-card-title>{{ site.name ? site.name : 'New site' }}</v-card-title>
                <v-card-text>
                    <v-alert v-if="error" closable color="error" class="mb-3">
                        <div v-html="error"></div>
                    </v-alert>

                    <v-tabs v-model="site.server_type">
                        <v-tab value="ftp">
                            FTP
                        </v-tab>
                        <v-tab value="sftp">
                            SFTP
                        </v-tab>
                        <v-tab value="dropbox">
                            Dropbox
                        </v-tab>
                        <v-tab value="gdrive">
                            GDrive
                        </v-tab>
                        <v-tab value="s3">
                            Amazon S3
                        </v-tab>
                        <v-tab value="webdav">
                            WebDAV
                        </v-tab>
                    </v-tabs>

                    <v-text-field v-model="site.name" label="Name" density="compact" @change="updateName"></v-text-field>

                    <v-btn @click="connect">Connect</v-btn>

                    <v-text-field v-model="site.domain" label="Host" density="compact"
                        v-if="['ftp', 'sftp', 'webdav'].indexOf(site.server_type) !== -1"></v-text-field>

                    <v-btn-toggle v-model="site.logon_type" v-if="site.server_type === 'sftp'">
                        <v-btn value="">
                            Password
                        </v-btn>
                        <v-btn value="key">
                            Public Key
                        </v-btn>
                    </v-btn-toggle>

                    <v-text-field v-model="site.ftp_user" label="Username" density="compact"></v-text-field>
                    
                    <password-field label="Password" v-model="password" density="compact"
                        v-if="site.server_type !== 'sftp' || site.logon_type !== 'key'"
                    ></password-field>

                    <v-text-field v-model="sshKey" label="SSH key" density="compact"
                        v-if="site.server_type === 'sftp' && site.logon_type === 'key'" readonly
                        append-icon="mdi-content-copy" @click:append="copy(sshKey)"></v-text-field>
                    <v-text-field v-model="site.dir" label="Path" density="compact"></v-text-field>
                    <v-text-field v-model="site.web_url" label="Website URL" density="compact"></v-text-field>

                    <v-btn-toggle v-model="site.turbo" :disabled="site.web_url === ''"
                        v-if="['ftp', 'sftp'].indexOf(site.server_type) !== -1">
                        <v-btn value="1">
                            Turbo mode
                        </v-btn>
                    </v-btn-toggle>

                    <v-expansion-panels>
                        <v-expansion-panel title="Advanced">
                            <v-expansion-panel-text>
                                <v-text-field v-model="site.db_phpmyadmin" label="PHPMyAdmin URL"
                                    density="compact"></v-text-field>
                                <v-text-field v-model="site.db_username" label="DB Username"
                                    density="compact"></v-text-field>
                                <password-field label="DB Password" v-model="dbPassword" density="compact"></password-field>

                                <v-text-field v-model="site.timeout" label="Timeout" density="compact"></v-text-field>
                                <v-select v-model="site.encoding" label="Encoding" density="compact"
                                    :items="charsets"></v-select>
                            </v-expansion-panel-text>
                        </v-expansion-panel>
                    </v-expansion-panels>
                </v-card-text>
                <v-card-actions>
                    <v-btn size="large" @click="save">Save</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

    </div>
</template>

<script>
import api from "./../services/api";
import util from "./../services/util";
import passwordField from "./password-field";

export default {
    components: {
        passwordField
    },
    props: {
        tabs: null,
    },
    data() {
        return {
            error: '',
            sshKey: '',
            dialog: false,
            defaultSite: {
                server_type: 'ftp',
                encoding: 'UTF-8',
            },
            loading: false,
            charsets: [{ "title": "Unicode UTF-8", "value": "UTF-8" }, { "title": "Western ISO-8859-1", "value": "ISO-8859-1" }, { "title": "Western Windows-1252", "value": "Windows-1252" }, { "title": "Unicode UTF-16LE", "value": "UTF-16LE" }, { "title": "Arabic Windows-1256", "value": "Windows-1256" }, { "title": "Arabic ISO-8859-6", "value": "ISO-8859-6" }, { "title": "Baltic ISO-8859-4", "value": "ISO-8859-4" }, { "title": "Baltic ISO-8859-13", "value": "ISO-8859-13" }, { "title": "Baltic Windows-1257", "value": "Windows-1257" }, { "title": "Celtic ISO-8859-14", "value": "ISO-8859-14" }, { "title": "Central European ISO-8859-2", "value": "ISO-8859-2" }, { "title": "Central European Windows-1250", "value": "Windows-1250" }, { "title": "Chinese Simplified GBK", "value": "GBK" }, { "title": "Chinese Traditional Big5", "value": "Big5" }, { "title": "Chinese Traditional Big5-HKSCS", "value": "Big5-HKSCS" }, { "title": "Cyrillic ISO-8859-5", "value": "ISO-8859-5" }, { "title": "Cyrillic Windows-1251", "value": "Windows-1251" }, { "title": "Cyrillic KOI8-R", "value": "KOI8-R" }, { "title": "Cyrillic KOI8-U", "value": "KOI8-U" }, { "title": "Greek ISO-8859-7", "value": "ISO-8859-7" }, { "title": "Greek Windows-1253", "value": "Windows-1253" }, { "title": "Hebrew Windows-1255", "value": "Windows-1255" }, { "title": "Hebrew ISO-8859-8-1", "value": "ISO-8859-8-1" }, { "title": "Hebrew ISO-8859-8", "value": "ISO-8859-8" }, { "title": "Japanese Shift_JIS", "value": "Shift_JIS" }, { "title": "Japanese EUC-JP", "value": "EUC-JP" }, { "title": "Japanese ISO-2022-JP", "value": "ISO-2022-JP" }, { "title": "Korean", "value": "Korean" }, { "title": "Nordic ISO-8859-10", "value": "ISO-8859-10" }, { "title": "Romanian ISO-8859-16", "value": "ISO-8859-16" }, { "title": "South European ISO-8859-3", "value": "ISO-8859-3" }, { "title": "Thai", "value": "Thai" }, { "title": "Turkish ISO-8859-9", "value": "ISO-8859-9" }, { "title": "Vietnamese Windows-1258", "value": "Windows-1258" }, { "title": "Western ISO-8859-15", "value": "ISO-8859-15" }, { "title": "Western Macintosh", "value": "Macintosh" }],
            password: '',
            dbPassword: '',
            useMasterPassword: false,
        }
    },
    watch: {
    },
    methods: {
        copy: function (text) {
            util.copy(text);
        },
        newSite: function () {
            this.site = this.defaultSite;
            this.dialog = true;
        },
        editSite: function (site) {
            this.site = site;

            this.useMasterPassword = util.storageGet('prefs').prefs.useMasterPassword;
            this.password = this.useMasterPassword ? util.decrypt(site.ftp_pass) : site.ftp_pass;
            this.dbPassword = this.useMasterPassword ? util.decrypt(site.db_password) : site.db_password;

            this.dialog = true;
        },
        save: async function () {
            let params = Object.assign({}, this.site);
            params.ftp_pass = this.useMasterPassword ? util.encrypt(this.password) : this.password;
            params.db_password = this.useMasterPassword ? util.encrypt(this.dbPassword) : this.dbPassword;

            this.loading = true;
            let response = await api.post('sites?cmd=save&site=' + (this.site.id ? this.site.id : ''), params);
            this.loading = false;

            if (response.data.error) {
                this.error = response.data.error;
                return;
            }

            this.dialog = false;
            this.$emit('save', response.data.site);
        },
        updateName: function () {
            if (!this.site.name) {
                return;
            }

            if (!this.site.domain) {
                this.site.domain = this.site.name;
            }

            if (!this.site.ftp_user) {
                this.site.ftp_user = this.site.name;
            }
        },
        findPath: async function () {
            var self = this;

            if (!this.site.domain || !this.site.ftp_user || !this.password || this.site.dir) {
                return;
            }

            let params = Object.assign({}, this.site);
            params.ftp_pass = this.useMasterPassword ? util.encrypt(params.ftp_pass) : params.ftp_pass;
            params.db_password = this.useMasterPassword ? util.encrypt(params.db_password) : params.db_password;

            this.error = '';
            this.loading = true;
            let response = await api.post('files?site=&cmd=get', params);
            this.loading = false;
            if (response.data.error) {
                this.error = response.data.error;
                return;
            }

            response.data.files.forEach(function (item) {
                if (item.text.match(/^public|public_html|httpdocs$/)) {
                    self.site.dir = item.text;
                    return false;
                }
            });
        },
        connect: function () {
            switch (this.site.server_type) {
                case 'dropbox':
                    window.open('/popups/dropbox');
                    break;
                case 'gdrive':
                    window.open('/popups/google_drive?server_type=GDrive');
                    break;
            }
        },
        setSiteValues: function (params) {
            this.site.ftp_user = params.ftp_user;
            this.password = params.ftp_pass;
        }
    },

    mounted() {
        this.sshKey = util.storageGet('public_key');

        window.shiftedit = {
            setSiteValues: this.setSiteValues
        };
    },
};
</script>