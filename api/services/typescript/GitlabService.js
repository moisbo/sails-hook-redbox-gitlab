"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx_1 = require("rxjs/Rx");
const services = require("../../core/typescript/services/CoreService");
const requestPromise = require("request-promise");
var Services;
(function (Services) {
    class GitlabService extends services.Services.Core.Service {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'token',
                'user',
                'project',
                'projects',
                'readFileFromRepo',
                'revokeToken',
                'create',
                'fork',
                'project',
                'updateProject',
                'groups',
                'templates',
                'addWorkspaceInfo'
            ];
        }
        token(config, username, password) {
            const post = requestPromise({
                uri: config.host + '/oauth/token',
                method: 'POST',
                body: {
                    grant_type: 'password', username: username, password: password
                },
                json: true
            });
            return Rx_1.Observable.fromPromise(post);
        }
        user(config, token) {
            const get = requestPromise({
                uri: config.host + `/api/v4/user?access_token=${token}`,
                json: true
            });
            return Rx_1.Observable.fromPromise(get);
        }
        project({ config, token, pathWithNamespace }) {
            pathWithNamespace = encodeURIComponent(pathWithNamespace);
            const get = requestPromise({
                uri: config.host + `/api/v4/projects/${pathWithNamespace}?access_token=${token}`,
                json: true
            });
            return Rx_1.Observable.fromPromise(get);
        }
        projects({ config, token, page, perPage }) {
            const url = `/api/v4/projects?membership=true&access_token=${token}&order_by=created_at&page=${page}&per_page=${perPage}&simple=false&sort=desc`;
            const get = requestPromise({
                uri: config.host + url,
                json: true,
                resolveWithFullResponse: true
            });
            return Rx_1.Observable.fromPromise(get);
        }
        fork(config, token, creation) {
            const origin = creation.template.id;
            let body = {};
            if (!creation.group.isUser) {
                body = { namespace: creation.group.id };
            }
            const post = requestPromise({
                uri: config.host + `/api/v4/projects/${origin}/fork?access_token=${token}`,
                method: 'POST',
                body: body,
                json: true
            });
            return Rx_1.Observable.fromPromise(post);
        }
        deleteForkRel(config, token, namespace, project) {
            const projectNameSpace = encodeURIComponent(namespace + '/' + project);
            const deleteRequest = requestPromise({
                uri: config.host + `/api/v4/projects/${projectNameSpace}/fork?access_token=${token}`,
                method: 'DELETE',
                json: true
            });
            return Rx_1.Observable.fromPromise(deleteRequest);
        }
        addWorkspaceInfo({ config, token, branch, pathWithNamespace, project, workspaceLink, filePath }) {
            const projectNameSpace = encodeURIComponent(pathWithNamespace);
            const post = requestPromise({
                uri: config.host + `/api/v4/projects/${projectNameSpace}/repository/files/${filePath}?access_token=${token}`,
                method: 'POST',
                body: {
                    branch: branch,
                    content: workspaceLink,
                    author_name: 'Stash',
                    commit_message: 'provisioner bot'
                },
                json: true
            });
            return Rx_1.Observable.fromPromise(post);
        }
        readFileFromRepo(config, token, branch, projectNameSpace, filePath) {
            const encodeProjectNameSpace = encodeURIComponent(projectNameSpace);
            const get = requestPromise({
                uri: config.host + `/api/v4/projects/${encodeProjectNameSpace}/repository/files/${filePath}?ref=${branch}&access_token=${token}&namespace=${encodeProjectNameSpace}`,
                json: true,
                method: 'GET',
                resolveWithFullResponse: true
            });
            return Rx_1.Observable.fromPromise(get).catch(error => {
                if (error.statusCode === 404 || error.statusCode === 403) {
                    return Rx_1.Observable.of({ path: projectNameSpace, content: {} });
                }
                else {
                    return Rx_1.Observable.throw(error);
                }
            });
        }
        create(config, token, creation, group) {
            const body = {
                name: creation.name,
                description: creation.description
            };
            if (!group.isUser && group.id) {
                body.namespace_id = group.id;
            }
            const post = requestPromise({
                uri: config.host + `/api/v4/projects?access_token=${token}`,
                method: 'POST',
                body: body,
                json: true
            });
            return Rx_1.Observable.fromPromise(post);
        }
        updateProject(config, token, pathWithNamespace, project) {
            pathWithNamespace = encodeURIComponent(pathWithNamespace);
            const body = {};
            project.attributes.map(p => { body[p.name] = p.newValue; });
            const put = requestPromise({
                uri: config.host + `/api/v4/projects/${pathWithNamespace}?access_token=${token}`,
                method: 'PUT',
                body: body,
                json: true
            });
            return Rx_1.Observable.fromPromise(put);
        }
        groups(config, token) {
            const get = requestPromise({
                uri: config.host + `/api/v4/groups?access_token=${token}&owned=true&min_access_level=50`,
                json: true
            });
            return Rx_1.Observable.fromPromise(get);
        }
        templates(config, token, templateTag) {
            const get = requestPromise({
                uri: config.host + `/api/v4/projects?access_token=${token}&min_access_level=20`,
                json: true
            });
            return get
                .then(response => {
                const templates = response.filter(o => o.tag_list.find(t => t === templateTag));
                return Rx_1.Observable.of(templates);
            }).catch(error => {
                return Rx_1.Observable.throw(error);
            });
        }
    }
    Services.GitlabService = GitlabService;
    class Config {
    }
})(Services = exports.Services || (exports.Services = {}));
module.exports = new Services.GitlabService().exports();
