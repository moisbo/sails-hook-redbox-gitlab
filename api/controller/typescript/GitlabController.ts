declare var module;
declare var sails, Model;
import {Observable} from 'rxjs/Rx';
import 'rxjs/add/operator/map';

import  * as url from  'url';
// const url = require('url');
import local from '../../../config/local';

declare var GitlabService, BrandingService, WorkspaceService, _;
/**
 * Package that contains all Controllers.
 */

import controller = require('../../core/typescript/controllers/CoreController');//'../../../../../typescript/controllers/CoreController.js');

export module Controllers {

  /**
   * Workspace related features....
   *
   *
   */
  export class GitlabController extends controller.Controllers.Core.Controller {
    /**
     * Exported methods, accessible from internet.
     */
    protected _exportedMethods: any = [
      'token',
      'user',
      'projectsRelatedRecord',
      'groups',
      'templates',
      'link',
      'checkRepo',
      'revokeToken',
      'create',
      'createWithTemplate',
      'project',
      'updateProject'
    ]
    protected config: any;

    constructor() {
      super();
      this.config = new Config();
    }

    public token(req, res) {
      sails.log.debug('get token:');
      this.config.set();
      //TODO: do we need another form of security?
      const username = req.param('username');
      const password = req.param('password');

      let accessToken:any = {};
      let user:any = {};
      if (!req.isAuthenticated()) {
        this.ajaxFail(req, res, `User not authenticated`);
      } else {
        const userId = req.user.id;
        return WorkspaceService.infoFormUserId(userId)
          .flatMap(response => {
            sails.log.debug('infoFormUserId');
            sails.log.debug(response);
            user = response;
            return GitlabService.token(this.config, username, password);
          })
          .flatMap(response => {
            sails.log.debug('token');
            accessToken = response;
            sails.log.debug(accessToken);
            return GitlabService.user(this.config, accessToken.access_token);
          }).flatMap(response => {
            sails.log.debug('gitlab user');
            sails.log.debug(response);
            const gitlabUser = {
              username: response.username,
              id: response.id
            };
            return WorkspaceService.createWorkspaceInfo(userId, this.config.appName, {
              user: gitlabUser,
              accessToken: accessToken
            });
          })
          .subscribe(response => {
            sails.log.debug('createWorkspaceInfo');
            sails.log.debug(response);
            this.ajaxOk(req, res, null, {status: true});
          }, error => {
            sails.log.error(error);
            const errorMessage = `Failed to get token for user: ${username}`;
            sails.log.error(errorMessage);
            this.ajaxFail(req, res, errorMessage, error);
          });
      }
    }

    public revokeToken(req, res) {
      this.config.set();
      const userId = req.user.id;
      WorkspaceService.workspaceAppFromUserId(userId, this.config.appName)
        .flatMap(response => {
          sails.log.debug('workspaceAppFromUserId');
          if (response.id && response.user) {
            return WorkspaceService.removeAppFromUserId(response.user, response.id);
          } else {
            //TODO: return maybe observable throw?
            return Observable.of('');
          }
        }).subscribe(response => {
        sails.log.debug('revokeToken');
        sails.log.debug(response);
        this.ajaxOk(req, res, null, {status: true});
      }, error => {
        sails.log.error(error);
        const errorMessage = `Failed to revokeToken for user: ${userId}`;
        sails.log.error(errorMessage);
        this.ajaxFail(req, res, errorMessage, error);
      });
    }

    public user(req, res) {
      sails.log.debug('get user:');
      this.config.set();
      let gitlab:any = {};
      if (!req.isAuthenticated()) {
        this.ajaxFail(req, res, `User not authenticated`);
      } else {
        const userId = req.user.id;
        return WorkspaceService.workspaceAppFromUserId(userId, this.config.appName)
          .flatMap(response => {
            if (!response) {
              return Observable.throw('no workspace app found');
            }
            gitlab = response.info;
            return GitlabService.user(this.config, gitlab.accessToken.access_token)
          }).subscribe(response => {
            response.status = true;
            this.ajaxOk(req, res, null, {status: true, user: gitlab.user});
          }, error => {
            sails.log.error(error);
            const errorMessage = `Failed to get user workspace info of userId: ${userId}`;
            sails.log.error(errorMessage);
            this.ajaxFail(req, res, null, error);
          });
      }
    }

    public projectsRelatedRecord(req, res) {
      sails.log.debug('get related projects');
      this.config.set();
      let currentProjects = [];
      let projectsWithInfo:any = [];
      let gitlab = {};
      const page = req.query['page'] || 1;
      const perPage = req.query['perPage'] || 10;
      let projectHeaders = {};
      if (!req.isAuthenticated()) {
        this.ajaxFail(req, res, `User not authenticated`);
      } else {
        const userId = req.user.id;
        const branch = req.param('branch') || 'master';
        return WorkspaceService.workspaceAppFromUserId(userId, this.config.appName)
          .flatMap(response => {
            gitlab = response.info;
            return GitlabService.projects({
              config: this.config,
              token: gitlab['accessToken'].access_token,
              page: page,
              perPage: perPage
            })
          })
          .flatMap(response => {
            projectHeaders = response.headers;
            const data = response.body;
            let obs = [];
            currentProjects = data.slice(0);
            for (let r of currentProjects) {
              obs.push(GitlabService.readFileFromRepo(this.config, gitlab['accessToken'].access_token, branch, r.path_with_namespace, 'stash.workspace'));
            }
            return Observable.merge(...obs);
          })
          .subscribe(response => {
            const parsedResponse = this.parseResponseFromRepo(response);
            projectsWithInfo.push({
              path: parsedResponse.path,
              info: parsedResponse.content ? this.workspaceInfoFromRepo(parsedResponse.content) : {}
            });
          }, error => {
            const errorMessage = `Failed to get projectsRelatedRecord for token: ${gitlab['accessToken'].access_token}`;
            sails.log.debug(errorMessage);
            this.ajaxFail(req, res, errorMessage, error);
          }, () => {
            currentProjects.map(p => {
              p.rdmp = projectsWithInfo.find(pwi => pwi.path === p.path_with_namespace);
            });
            this.ajaxOk(req, res, null, {
              projects: currentProjects,
              meta: {
                previousPage: projectHeaders['x-prev-page'],
                totalPages: projectHeaders['x-total-pages'],
                total: projectHeaders['x-total'],
                nextPage: projectHeaders['x-next-page'],
                page: projectHeaders['x-page'],
                perPage: projectHeaders['x-per-page']
              }
            });
          });
      }
    }

    public link(req, res) {
      sails.log.debug('get link');
      sails.log.debug('createWorkspaceRecord');
      this.config.set();
      if (!req.isAuthenticated()) {
        this.ajaxFail(req, res, `User not authenticated`);
      } else {
        this.config.brandingAndPortalUrl = BrandingService.getFullPath(req);
        const project = req.param('project');
        const pathWithNamespace = req.param('pathWithNamespace');
        const rdmpId = req.param('rdmpId');
        const recordMap = req.param('recordMap');
        const branch = req.param('branch') || 'master';
        let workspaceId = null;
        let gitlab = {};
        let recordMetadata = null;
        let rdmpTitle = '';
        const userId = req.user.id;

        return WorkspaceService.workspaceAppFromUserId(userId, this.config.appName)
          .flatMap(response => {
            gitlab = response.info;
            return WorkspaceService.getRecordMeta(this.config, rdmpId);
          }).flatMap(response => {
            sails.log.debug('recordMetadata');
            recordMetadata = response;
            let record = WorkspaceService.mapToRecord(project, recordMap);
            record = _.merge(record, {type: this.config.recordType});
            record.rdmpOid = rdmpId;
            record.rdmpTitle = recordMetadata.title;
            rdmpTitle = recordMetadata.title;
            const username = req.user.username;
            return WorkspaceService.createWorkspaceRecord(this.config, username, record, this.config.recordType, this.config.workflowStage);
          }).flatMap(response => {
            workspaceId = response.oid;
            sails.log.debug('addWorkspaceInfo');
            return GitlabService.addWorkspaceInfo({
              config: this.config, token: gitlab['accessToken'].access_token,
              branch: branch, pathWithNamespace: pathWithNamespace,
              project: project, workspaceLink: rdmpId + '.' + workspaceId,
              filePath: 'stash.workspace'
            });
          }).flatMap(() => {
            sails.log.debug('addWorkspaceInfo:Pretty');
            return GitlabService.addWorkspaceInfo({
              config: this.config, token: gitlab['accessToken'].access_token,
              branch: branch, pathWithNamespace: pathWithNamespace,
              project: project,
              workspaceLink: `Workspace linked to [${rdmpTitle}](${this.config.brandingAndPortalUrl}/record/view/${rdmpId}) in Stash`,
              filePath: 'stash.md'
            });
          }).flatMap(() => {
            sails.log.debug('addParentRecordLink');
            if (recordMetadata.workspaces) {
              const wss = recordMetadata.workspaces.find(id => workspaceId === id);
              if (!wss) {
                recordMetadata.workspaces.push({id: workspaceId});
              }
            }
            return WorkspaceService.updateRecordMeta(this.config, recordMetadata, rdmpId);
          })
          .subscribe(response => {
            sails.log.debug('updateRecordMeta');
            sails.log.debug(response);
            response.status = true;
            this.ajaxOk(req, res, null, response);
          }, error => {
            sails.log.error(error);
            const errorMessage = `Failed to link workspace with ID: ${project.id}`;
            sails.log.error(errorMessage);
            this.ajaxFail(req, res, errorMessage, error);
          });
      }
    }

    public checkRepo(req, res) {
      sails.log.debug('check link');
      this.config.set();
      if (!req.isAuthenticated()) {
        this.ajaxFail(req, res, `User not authenticated`);
      } else {
        const fieldToCheck = req.param('fieldToCheck');
        const branch = req.param('branch') || 'master';
        let gitlab = {};
        const userId = req.user.id;
        return WorkspaceService.workspaceAppFromUserId(userId, this.config.appName)
          .flatMap(response => {
            const gitlab = response.info;
            return GitlabService.readFileFromRepo(this.config, gitlab.accessToken.access_token, branch, fieldToCheck, 'stash.workspace');
          }).subscribe(response => {
            sails.log.debug('checkLink:getRecordMeta');
            const parsedResponse = this.parseResponseFromRepo(response);
            const wI = parsedResponse.content ? this.workspaceInfoFromRepo(parsedResponse.content) : {
              rdmp: null,
              workspace: null
            };
            sails.log.debug(wI);
            this.ajaxOk(req, res, null, wI);
          }, error => {
            sails.log.error(error);
            const errorMessage = `Failed check link workspace project: ${fieldToCheck}`;
            sails.log.error(errorMessage);
            this.ajaxFail(req, res, errorMessage, error);
          });
      }
    }

    public compareLink(req, res) {
      this.config.set();
      const rdmpId = req.param('rdmpId');
      const projectNameSpace = req.param('projectNameSpace');
      const workspaceId = req.param('workspaceId');

      this.config.brandingAndPortalUrl = BrandingService.getFullPath(req);

      return WorkspaceService.provisionerUser(this.config.provisionerUser)
        .flatMap(response => {
          this.config.redboxHeaders['Authorization'] = 'Bearer ' + response.token;
          return WorkspaceService.getRecordMeta(this.config, rdmpId);
        })
        .subscribe(recordMetadata => {
          sails.log.debug('recordMetadata');
          if (recordMetadata && recordMetadata.workspaces) {
            const wss = recordMetadata.workspaces.find(id => workspaceId === id);
            let message = 'workspace match';
            if (!wss) {
              message = 'workspace not found';
            }
            this.ajaxOk(req, res, null, {workspace: wss, message: message});
          } else {
            const errorMessage = `Failed compare link workspace project: ${projectNameSpace}`;
            this.ajaxFail(req, res, null, errorMessage);
          }
        }, error => {
          const errorMessage = `Failed compare link workspace project: ${projectNameSpace}`;
          sails.log.error(errorMessage);
          this.ajaxFail(req, res, errorMessage, error);
        });
    }

    public create(req, res) {
      this.config.set();
      const creation = req.param('creation');

      let workspaceId = '';
      const group = creation.group;
      const namespace = group.path + '/' + creation.name;
      if (!req.isAuthenticated()) {
        this.ajaxFail(req, res, `User not authenticated`);
      } else {
        const userId = req.user.id;
        return WorkspaceService.workspaceAppFromUserId(userId, this.config.appName)
          .flatMap(response => {
            const gitlab = response.info;
            return GitlabService.create(this.config, gitlab.accessToken.access_token, creation, group);
          }).subscribe(response => {
            sails.log.debug('updateRecordMeta');
            response.status = true;
            this.ajaxOk(req, res, null, response);
          }, error => {
            sails.log.error(error);
            const errorMessage = `Failed to create workspace with: ${namespace}`;
            sails.log.error(errorMessage);
            const data = {status: false, message: {description: errorMessage, error: error}}
            this.ajaxFail(req, res, null, data);
          });
      }
    }

    public createWithTemplate(req, res) {
      //Needs to fork project
      this.config.set();
      if (!req.isAuthenticated()) {
        this.ajaxFail(req, res, `User not authenticated`);
      } else {
        const creation = req.param('creation');
        const userId = req.user.id;
        return WorkspaceService.workspaceAppFromUserId(userId, this.config.appName)
          .flatMap(response => {
            const gitlab = response.info;
            return GitlabService.fork(this.config, gitlab.accessToken.access_token, creation);
          }).subscribe(response => {
            sails.log.debug('fork');
            response.status = true;
            this.ajaxOk(req, res, null, response);
          }, error => {
            sails.log.error(error);
            const errorMessage = `Failed to fork project with Id: ${creation.template.id}`;
            sails.log.error(errorMessage);
            const data = {status: false, message: {description: errorMessage, error: error}}
            this.ajaxFail(req, res, null, data);
          });
      }
    }

    public updateProject(req, res) {
      //TODO: In this case only name can be updated for FORK, should it have more?
      //Remove fork relationship?
      //change name
      this.config.set();
      if (!req.isAuthenticated()) {
        this.ajaxFail(req, res, `User not authenticated`);
      } else {
        const creation = req.param('creation');
        //TODO: make some validations on each case of the update
        const project = {};
        const projectId = creation.group.path + '/' + creation.template.name; //Can also be the id
        project['name'] = creation.template.name;
        project['group'] = creation.group;
        project['attributes'] = [{name: 'name', newValue: creation.name}, {name: 'path', newValue: creation.name}];
        const userId = req.user.id;
        return WorkspaceService.workspaceAppFromUserId(userId, this.config.appName)
          .flatMap(response => {
            const gitlab = response.info;
            return GitlabService.updateProject(this.config, gitlab.accessToken.access_token, projectId, project);
          }).subscribe(response => {
            sails.log.debug('updateProject');
            response.status = true;
            this.ajaxOk(req, res, null, response);
          }, error => {
            sails.log.error(error);
            const errorMessage = `Failed to update project with: ${creation}`;
            sails.log.error(errorMessage);
            const data = {status: false, message: {description: errorMessage, error: error}}
            this.ajaxFail(req, res, null, data);
          });
      }
    }

    public project(req, res) {
      this.config.set();
      const pathWithNamespace = req.param('pathWithNamespace');

      if (!req.isAuthenticated()) {
        this.ajaxFail(req, res, `User not authenticated`);
      } else {
        const userId = req.user.id;
        return WorkspaceService.workspaceAppFromUserId(userId, this.config.appName)
          .flatMap(response => {
            const gitlab = response.info;
            return GitlabService.project({
              config: this.config,
              token: gitlab.accessToken.access_token,
              pathWithNamespace: pathWithNamespace
            });
          })
          .subscribe(response => {
            sails.log.debug('project');
            response.status = true;
            this.ajaxOk(req, res, null, response);
          }, error => {
            sails.log.error(error);
            const errorMessage = `Failed to check project with: ${pathWithNamespace}`;
            sails.log.error(errorMessage);
            this.ajaxFail(req, res, errorMessage, error);
          });
      }
    }

    public templates(req, res) {
      this.config.set();
      if (!req.isAuthenticated()) {
        this.ajaxFail(req, res, `User not authenticated`);
      } else {
        const userId = req.user.id;
        return WorkspaceService.workspaceAppFromUserId(userId, this.config.appName)
          .flatMap(response => {
            const gitlab = response.info;
            return GitlabService.templates(this.config, gitlab.accessToken.access_token, 'provisioner_template');
          }).subscribe(response => {
            let simple = [];
            if (response.value) {
              simple = response.value.map(p => {
                return {id: p.id, pathWithNamespace: p.path_with_namespace, name: p.path, namespace: p.namespace.path}
              });
            }
            this.ajaxOk(req, res, null, simple);
          }, error => {
            sails.log.error(error);
            const errorMessage = `Failed to check templates`;
            sails.log.error(errorMessage);
            this.ajaxFail(req, res, errorMessage, error);
          });
      }
    }

    public groups(req, res) {
      this.config.set();
      if (!req.isAuthenticated()) {
        this.ajaxFail(req, res, `User not authenticated`);
      } else {
        const userId = req.user.id;
        return WorkspaceService.workspaceAppFromUserId(userId, this.config.appName)
          .flatMap(response => {
            const gitlab = response.info;
            return GitlabService.groups(this.config, gitlab.accessToken.access_token)
          }).subscribe(response => {
            sails.log.debug('groups');
            this.ajaxOk(req, res, null, response);
          }, error => {
            sails.log.error(error);
            const errorMessage = `Failed to get groups`;
            sails.log.error(errorMessage);
            this.ajaxFail(req, res, errorMessage, error);
          });
      }
    }

    workspaceInfoFromRepo(content: string) {
      const workspaceLink = Buffer.from(content, 'base64').toString('ascii');
      if (workspaceLink) {
        const workspaceInfo = workspaceLink.split('.');
        return {rdmp: _.first(workspaceInfo), workspace: _.last(workspaceInfo)};
      } else {
        return {rdmp: null, workspace: null};
      }
    }

    parseResponseFromRepo(response) {
      const result = {content: null, path: ''};
      if (response.body && response.body.content) {
        result.content = response.body.content;
        var url_parts = url.parse(response.request.uri.href, true);
        var query = url_parts.query;
        result.path = query.namespace[0];
      } else {
        result.content = null;
        result.path = response.path;
      }
      return result;
    }


  }

  class Config {
    host: string;
    recordType: string;
    formName: string;
    workflowStage: string;
    appName: string;
    parentRecord: string;
    provisionerUser: string;
    brandingAndPortalUrl: string;
    redboxHeaders: any;

    set() {
      const workspaceConfig = sails.config.workspaces;
      const gitlabConfig = workspaceConfig.gitlab;

      this.host = gitlabConfig.host;
      this.recordType = gitlabConfig.recordType;
      this.workflowStage = gitlabConfig.workflowStage;
      this.formName = gitlabConfig.formName;
      this.appName = gitlabConfig.appName;
      this.parentRecord = workspaceConfig.parentRecord;
      this.provisionerUser = workspaceConfig.provisionerUser;
      this.brandingAndPortalUrl = '';
      this.redboxHeaders = {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
        'Authorization': workspaceConfig.portal.authorization,
      };

    }
  }
}

module.exports = new Controllers.GitlabController().exports();
