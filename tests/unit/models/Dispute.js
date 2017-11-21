/* globals User, Account, CONFIG, Collective, Dispute, DisputeTool, Attachment */

const expect = require('chai').expect;
const path = require('path');
const uuid = require('uuid');

const truncate = require(path.join(process.cwd(), 'tests', 'utils', 'truncate'));

describe('Dispute', () => {
  let user;
  let collective;
  let tool;
  let attachmentId;

  before(function before() {
    this.timeout(5000);
    user = new User({
      email: 'user@example.com',
      password: '12345678',
      role: 'Admin',
    });

    const account = new Account({
      fullname: 'Example Account Name',
      bio: '',
      state: 'Texas',
      zip: '73301',
    });

    return DisputeTool.first().then((dt) => {
      tool = dt;
      return Collective.first().then((result) => {
        collective = result;

        return User.transaction((trx) => user.transacting(trx).save().then(() => {
          account.userId = user.id;
          account.collectiveId = collective.id;
          user.account = account;
          return account.transacting(trx).save();
        }));
      });
    });
  });

  after(() => truncate(User, Account));

  it('Should create a valid dispute', () => {
    const dispute = new Dispute({
      userId: user.id,
      disputeToolId: tool.id,
    });

    return dispute.save().then((id) => {
      expect(id[0]).to.be.equal(dispute.id);
    });
  });

  describe('Validations', () => {
    it('Should fail userId validation', () => {
      const dispute = new Dispute({
        disputeToolId: tool.id,
      });

      return dispute.save().catch((err) => {
        expect(err.errors.userId.message).to.be.equal('The userId is required');
      });
    });

    it('Should fail disputeToolId validation', () => {
      const dispute = new Dispute({
        userId: user.id,
      });

      return dispute.save().catch((err) => {
        expect(err.errors.disputeToolId.message).to.be.equal('The disputeToolId is required');
      });
    });
  });

  describe('Instance Methods', () => {
    let dispute;
    beforeEach(() => {
      dispute = new Dispute({
        userId: user.id,
        disputeToolId: tool.id,
      });

      return dispute.save()
        .then(([id]) => Dispute.query()
          .where({ id })
          .then(([d]) => {
            dispute = d;
          }));
    });

    it('Should set an option', () => {
      dispute.setOption('A');

      expect(dispute.data.option).to.be.equal('A');
    });

    it('Should set a dispute process id', () => {
      dispute.setDisputeProcess({ process: 1 });

      expect(dispute.data.disputeProcess).to.be.equal(1);
    });

    it('Should set a signature', () => {
      dispute.setSignature('Example Signature');

      expect(dispute.data.signature).to.be.equal('Example Signature');
    });

    it('Should set a form', () => {
      const fieldValues = {
        name: 'Example Name',
        address1: 'Address 1',
        address2: 'Address 2',
      };

      dispute.setForm({ formName: 'form-name', fieldValues });

      expect(dispute.data.forms['form-name']).to.be.equal(fieldValues);
    });

    describe('attachments', () => {
      let disputeId = '';
      it('should be added', () => {
        disputeId = dispute.id;
        dispute.userId = user.id;
        dispute.disputeToolId = tool.id;

        const filePath = path.join(process.cwd(), 'tests', 'assets', 'hubble.jpg');

        return dispute.save().then(() => dispute.addAttachment('single-uploader', filePath)
          .then(() => {
            expect(dispute.data.attachments.length).to.be.equal(1);
            expect(dispute.data.attachments[0].id).to.exists;

            attachmentId = dispute.data.attachments[0].id;

            expect(dispute.data.attachments[0].path).to.exists;
            expect(dispute.data.attachments[0].thumb).to.exists;
            expect(dispute.data.attachments[0].name).to.be.equal('single-uploader');
          }));
      });

      it('should be removed', () => {
        dispute.userId = user.id;
        dispute.disputeToolId = tool.id;

        return Dispute.query()
          .where('id', disputeId)
          .include('attachments')
          .then((disputes) => {
            dispute = disputes[0];

            return dispute.removeAttachment(attachmentId)
              .then(() => {
                expect(dispute.data.attachments.length).to.be.equal(0);
              });
          });
      });
    });

    describe('search', () => {
      const containsDispute = ids => expect(ids).to.contain(dispute.id);
      it('should search by the user\'s name', () =>
        Dispute.search({ name: user.account.fullname })
          .then(containsDispute));

      it('should search by the dispute human readable id', () =>
        Dispute.search({ filters: { readable_id: dispute.readableId } })
          .then(containsDispute));

      it('should search by the dispute status', () =>
        Dispute.search({ status: dispute.status })
          .then(containsDispute));

      it('should search by the dispute tool', () =>
        Dispute.search({ filters: { dispute_tool_id: dispute.disputeToolId } })
          .then(containsDispute));

      describe('when given a readable id should ignore', () => {
        const withreadableId = q => Object.assign({ filters: { readable_id: dispute.readableId } }, q);
        it('the name', () =>
          Dispute.search(withreadableId({ name: 'bogus bogus' }))
            .then(containsDispute));

        it('the status', () =>
          Dispute.search(withreadableId({ status: 'not a real status beep boop beeeeeeep' }))
            .then(containsDispute));
      });
    });
  });
});
