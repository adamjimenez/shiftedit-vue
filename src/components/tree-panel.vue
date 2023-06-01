<template>
    <div style="flex: 1; overflow-y: scroll;">
        <v-progress-linear v-if="loading" indeterminate></v-progress-linear>
        <tree :nodes="nodes" @nodeExpanded="onNodeExpanded" @nodeClick="open" :gap="0"></tree>
    </div>
</template>

<script>
import api from "./../services/api";
import Tree from "vue3-tree";
import "vue3-tree/dist/style.css";
import util from "./../services/util";

export default {
    props: {
        currentSite: null,
    },
    components: {
        Tree,
    },
    data() {
        return {
            nodes: [{
                id: 'root',
                label: this.currentSite ? this.currentSite.dir : 'Root node',
                nodes: [{}]
            }],
            loading: false
        };
    },
    watch: {
        currentSite(currentSite) {
            this.nodes[0].label = currentSite.dir;
        },
    },
    methods: {
        onNodeExpanded: function (node) {
            if (!node.expanded) {
                return;
            }

            this.load(node);
        },
        open: function (node) {
            if (node.type === 'file') {
                this.$emit('open', node.id);
            }
        },
        load: function (node) {
            // default to root node
            if (!node) {
                node = this.nodes[0];
            }

            let params = {
                user: this.currentSite.ftp_user,
                pass: util.sha1(this.currentSite.ftp_pass),
            }

            params.path = node.id != 'root' ? node.id : '';

            let self = this;
            this.loading = true;

            api
                .post(this.currentSite.apiBaseUrl + '&cmd=get', params)
                .then(response => {
                    if (response.data.error) {
                        alert(response.data.error);
                        return;
                    }

                    let nodes = [];
                    response.data.files.forEach(function (node) {
                        nodes.push({
                            id: node.id,
                            label: node.text,
                            nodes: node.type == 'folder' ? [{ label: 'loading..' }] : null,
                            type: node.type,
                        });
                    });

                    function sort(a, b) {
                        if (a.type === 'folder' && b.type === 'file') {
                            return -1;
                        } else if (a.type === 'file' && b.type === 'folder') {
                            return 1;
                        } else if (a.label < b.label) {
                            return -1;
                        } else if (a.label > b.label) {
                            return 1;
                        }
                        return 0;
                    }

                    nodes.sort(sort);

                    node.nodes = nodes;
                    node.expanded = true;
                })
                .catch(error => console.log(error))
                .finally(() => self.loading = false);
        }
    },

    shortcuts: {
    },
    mounted() {
    },
};
</script>