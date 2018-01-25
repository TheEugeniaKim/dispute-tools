/* global CONFIG, Class, Admin, Campaign, RestfulController, KBPost, KBTopic */

const fs = require('fs-extra');

global.Admin = global.Admin || {};
global.Admin.Collectives = global.Admin.Collectives || {};
global.Admin.Collectives.Campaigns = global.Admin.Collectives.Campaigns || {};

const KBPostsController = Class(
  Admin.Collectives.Campaigns,
  'KBPostsController',
).inherits(RestfulController)({
  beforeActions: [
    // campaign
    {
      before(req, res, next) {
        Campaign.query()
          .where('id', req.params.campaign_id)
          .include('collective')
          .then(([campaign]) => {
            req.campaign = campaign;
            res.locals.campaign = campaign;
            next();
          })
          .catch(next);
      },
      actions: ['create', 'new'],
    },
    // load topics
    {
      before(req, res, next) {
        KBTopic.query()
          .then(result => {
            req.topic = result;
            res.locals.topics = result;
            next();
          })
          .catch(next);
      },
      actions: ['create', 'new'],
    },
  ],

  prototype: {
    new(req, res) {
      res.render('admin/campaigns/kbposts/new');
    },

    create(req, res) {
      const kbpost = new KBPost({
        name: req.body.name,
        data: {
          url: req.body.url,
        },
        topicId: req.body.topic_id,
        campaignId: req.params.campaign_id,
      });

      kbpost
        .save()
        .then(() => {
          if (
            req.files &&
            req.files.resource &&
            req.files.resource.length > 0
          ) {
            const resource = req.files.resource[0];

            return kbpost
              .attach('file', resource.path, {
                fileSize: resource.size,
                mimeType: resource.mimetype || resource.mimeType,
              })
              .then(() => {
                fs.unlinkSync(resource.path);

                return kbpost.save();
              });
          }

          return Promise.resolve();
        })
        .then(() => {
          req.flash('success', 'The resource has been created.');
          res.redirect(
            `${CONFIG.router.helpers.Campaigns.show.url(
              req.params.campaign_id,
            )}#resources`,
          );
        })
        .catch(err => {
          res.status(400);

          res.locals.errors = err.errors || err;

          res.render('admin/campaigns/kbposts/new');
        });
    },

    destroy(req, res) {
      KBPost.query()
        .where('id', req.params.id)
        .where('campaign_id', req.params.campaign_id)
        .then(([found]) => found && found.destroy())
        .then(() => {
          req.flash('success', 'The resource was been deleted.');
          res.redirect(
            req.body._backUrl ||
              CONFIG.router.helpers.Campaigns.show.url(req.params.campaign_id),
          );
        });
    },
  },
});

module.exports = new KBPostsController();
