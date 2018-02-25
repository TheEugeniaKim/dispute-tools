/* globals Class, Krypton, Attachment, DisputeTool, DisputeStatus, DisputeRenderer, UserMailer
 Account, User, logger */
/* eslint arrow-body-style: 0 */

const _ = require('lodash');
const Promise = require('bluebird');
const { basePath } = require('../lib/AWS');
const DisputeAttachment = require('./DisputeAttachment');

const Dispute = Class('Dispute')
  .inherits(Krypton.Model)
  .includes(Krypton.Attachment)({
  tableName: 'Disputes',
  validations: {
    userId: ['required'],
    disputeToolId: ['required'],
  },
  attributes: [
    'id',
    'readableId',
    'userId',
    'disputeToolId',
    'data',
    'deactivated',
    'createdAt',
    'updatedAt',
  ],

  defaultIncludes: '[user, statuses]',

  async search(qs) {
    const query = this.query().where({ deactivated: false });

    if (qs.filters) {
      // If we're passed a human readable id just search by that and ignore everything else
      if (qs.filters.readable_id) {
        return query
          .where('readable_id', qs.filters.readable_id)
          .include(Dispute.defaultIncludes)
          .then(records => records.map(r => r.id));
      }

      if (qs.filters.admin_id) {
        const disputeIds = await Dispute.knex()('AdminsDisputes')
          .select('dispute_id')
          .where('admin_id', qs.filters.admin_id);

        query.whereIn('id', disputeIds.map(d => d.dispute_id));
      }

      if (qs.filters.dispute_tool_id) {
        query.andWhere('dispute_tool_id', qs.filters.dispute_tool_id);
      }
    }

    query.include(Dispute.defaultIncludes);

    const records = await query;

    return records.reduce((acc, record) => {
      const nameFound =
        // If no name passed in
        !qs.name || record.user.username.toLowerCase().indexOf(qs.name.toLowerCase()) !== -1;

      const statusFound =
        // If no status passed in
        !qs.status ||
        (record.statuses.length > 0 &&
          // model-relations/Dispute.js already configures the statuses
          // to be pulled in descending order by their created_at date
          // so we know the first one will be the most recent, no need to order
          record.statuses[0].status === qs.status);

      if (nameFound && statusFound) {
        return [...acc, record.id];
      }

      return acc;
    }, []);
  },

  prototype: {
    data: null,
    deactivated: false,

    init(config) {
      Krypton.Model.prototype.init.call(this, config);

      this.data = this.data || {};

      return this;
    },

    // Krypton's default _getAttributes will replace any undefined
    // attributes with null, causing our default valued columns
    // to get null inserted into them (thereby telling Postgres to
    // not use the default...) We can override that to prevent it for
    // any given property (in this case, readableId)

    // @Override
    _getAttributes() {
      const model = this;

      const values = _.clone(model);

      const sanitizedData = {};

      model.constructor.attributes.forEach(attribute => {
        // We skip readableId so that Krypton doesn't try to insert null into the database
        if (_.isUndefined(values[attribute]) && attribute !== 'readableId') {
          sanitizedData[attribute] = null;
        } else {
          sanitizedData[attribute] = values[attribute];
        }
      });

      return sanitizedData;
    },

    setOption(option) {
      this.data.option = option;

      return this;
    },

    setSignature(signature) {
      const dispute = this;

      return new Promise((resolve, reject) => {
        if (!signature) {
          throw new Error('The signature is required');
        }

        dispute.data.signature = signature;

        dispute
          .save()
          .then(resolve)
          .catch(reject);
      });
    },

    markAsCompleted(pendingSubmission) {
      const dispute = this;

      return new Promise((resolve, reject) => {
        const disputeStatus = new DisputeStatus({
          status: 'Completed',
          disputeId: dispute.id,
          pendingSubmission,
        });

        return DisputeTool.query()
          .where({ id: dispute.disputeToolId })
          .then(([tool]) => {
            return DisputeTool.transaction(trx => {
              return dispute
                .transacting(trx)
                .save()
                .then(() => {
                  tool.completed++;
                  return tool.transacting(trx).save();
                })
                .then(() => {
                  return disputeStatus.transacting(trx).save();
                });
            });
          })
          .then(resolve)
          .catch(reject);
      }).then(() => {
        const renderer = new DisputeRenderer({
          disputeId: dispute.id,
        });

        function fail(msg) {
          return err => {
            logger.log(msg, err);
            throw err;
          };
        }

        return renderer
          .save()
          .catch(fail('SAVING'))
          .then(() => {
            return renderer
              .render(dispute)
              .catch(fail('RENDERING'))
              .then(() => {
                return DisputeRenderer.query()
                  .where({ id: renderer.id })
                  .include('attachments')
                  .then(([_disputeRenderer]) => {
                    return renderer.buildZip(_disputeRenderer).catch(fail('BUILDING ZIP'));
                  });
              });
          })
          .then(() => {
            return renderer;
          });
      });
    },

    setForm({ formName, fieldValues, _isDirty }) {
      if (!formName) {
        throw new Error('The formName is required');
      }

      if (!_.isObjectLike(fieldValues)) {
        throw new Error('The form fieldValues are invalid');
      }

      if (_isDirty) {
        this.data._forms = {};
        this.data._forms[formName] = fieldValues;
      } else {
        delete this.data._forms;
        this.data.forms = {};
        this.data.forms[formName] = fieldValues;
      }

      return this;
    },

    setDisputeProcess({ process, processCity }) {
      if (!process) {
        throw new Error('The process type is required');
      }

      this.data.disputeProcess = process;

      if (processCity) {
        this.data.disputeProcessCity = processCity;
      }

      return this;
    },

    setConfirmFollowUp() {
      this.data.disputeConfirmFollowUp = true;
      return this;
    },

    addAttachment(name, filePath) {
      const dispute = this;

      this.data.attachments = this.data.attachments || [];

      const da = new DisputeAttachment({
        type: 'Dispute',
        foreignKey: this.id,
      });

      return da
        .save()
        .then(() => {
          return da.attach('file', filePath);
        })
        .then(() => {
          return da.save();
        })
        .then(() => {
          const path = da.file.url('original');
          const fullPath = basePath + path;
          const attachment = {
            id: da.id,
            name,
            path: da.file.url('original'),
            fullPath,
          };

          if (da.file.exists('thumb')) {
            attachment.thumb = da.file.url('thumb');
          }

          dispute.data.attachments.push(attachment);

          return dispute.save();
        });
    },

    removeAttachment(id) {
      const dispute = this;

      if (!dispute.attachments) {
        throw new Error("Dispute doesn't have any attachments");
      }

      const attachments = dispute.attachments.filter(attachment => attachment.id === id);

      if (attachments.length === 0) {
        throw new Error('Attachment not found');
      }

      return attachments[0].destroy().then(() => {
        const dataAttachment = dispute.data.attachments.filter(
          attachment => attachment.id === id,
        )[0];

        const index = dispute.data.attachments.indexOf(dataAttachment);

        dispute.data.attachments.splice(index, 1);

        return dispute.save();
      });
    },

    /**
     * Update the list of admins assigned to this dispute. Removes all admins
     * who are not present in the array of ids and assigns new ones.
     * @param {string[]} adminIds Array of admin ids
     * @return {Promise<void>}
     */
    updateAdmins(adminIds) {
      const knex = Dispute.knex();

      return Dispute.transaction(trx => {
        knex
          .table('AdminsDisputes')
          .transacting(trx)
          .whereNotIn('admin_id', adminIds)
          .andWhere('dispute_id', this.id)
          .delete()
          .then(() =>
            knex
              .table('AdminsDisputes')
              .transacting(trx)
              .insert(
                adminIds.map(id => ({
                  dispute_id: this.id,
                  admin_id: id,
                })),
              ),
          )
          .then(trx.commit)
          .catch(trx.rollback);
      });
    },

    /**
     * @typedef {{ name: string, id: string }} AdminInfo
     */
    /**
     * Compiles a two lists of the administrators on the platform,
     * those already assigned to the dispute and those unassigned,
     * or "available" to be assigned.
     * @return {Promise<{ assigned: AdminInfo[], available: AdminInfo[] }>}
     */
    getAssignedAndAvailableAdmins() {
      const assigned = this.admins.reduce((acc, a) => {
        acc[a.id] = a;
        return acc;
      }, {});

      return User.query()
        .include('[account]')
        .where('role', 'Admin')
        .then(allAdmin =>
          allAdmin.reduce(
            (acc, { id, account: { fullname: name } }) => {
              if (assigned[id] !== undefined) {
                acc.assigned.push({ id, name });
              } else {
                acc.available.push({ id, name });
              }
              return acc;
            },
            { assigned: [], available: [] },
          ),
        );
    },

    destroy() {
      this.deactivated = true;

      return this.save();
    },
  },
});

module.exports = Dispute;
