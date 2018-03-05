/* globals CONFIG, DisputeTool, User, Account */

const { createUser, testGetPage, testUnauthenticated, testAllowed } = require('../../utils');

const urls = CONFIG.router.helpers;

describe('DisputeToolsController', () => {
  let user;
  let admin;
  let moderator;

  before(async () => {
    user = await createUser();
    admin = await createUser({ admin: true });
    moderator = await createUser({ moderator: true });
  });

  describe('index', () => {
    describe('authorization', () => {
      const index = urls.DisputeTools.url();
      describe('when unauthenticated', () => {
        it('should allow', () => testAllowed(testGetPage(index)));
      });

      describe('when unprivileged', () => {
        it('should allow', () => testAllowed(testGetPage(index, user)));
      });

      describe('when admin', () => {
        it('should allow', () => testAllowed(testGetPage(index, admin)));
      });

      describe('when moderator', () => {
        it('should allow', () => testAllowed(testGetPage(index, moderator)));
      });
    });

    describe('tool page', () => {
      let url;

      before(async () => {
        const tool = await DisputeTool.first();
        url = urls.DisputeTools.show.url(tool.id);
      });

      describe('authorization', () => {
        describe('when unauthenticated', () => {
          it('should redirect to sso', () => testUnauthenticated(testGetPage(url)));
        });

        describe('when unprivileged', () => {
          it('should allow', () => testAllowed(testGetPage(url, user)));
        });

        describe('when admin', () => {
          it('should allow', () => testAllowed(testGetPage(url, admin)));
        });

        describe('when moderator', () => {
          it('should allow', () => testAllowed(testGetPage(url, moderator)));
        });
      });
    });
  });
});
