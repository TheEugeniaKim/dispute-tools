const DisputeTool = require('../../models/DisputeTool');

const { createUser, createDispute } = require('../utils');
const {
  // currency,
  text,
  email,
  phone,
  required,
  usStates,
  zip,
  date,
  ssn,
  oneOf,
} = require('../utils/form-validation-suites/field-validation-suites');

describe('credit report dispute form validation', () => {
  let dispute;
  const getDispute = () => dispute;

  before(async () => {
    dispute = await createDispute(
      await createUser(),
      await DisputeTool.findById('11111111-1111-4444-1111-111111111111'),
    );
    dispute.data.option = 'none';
  });

  describe('address', () => {
    text('address', getDispute, true);
  });

  describe('agencies', () => {
    required('agencies', getDispute, true);
    oneOf('agencies', getDispute, ['Experian', 'Equifax', 'TransUnion']);
  });

  describe('city', () => {
    text('city', getDispute, true);
  });

  // current creditor

  // debts

  describe('dob', () => {
    date('dob', getDispute, true);
  });

  describe('email', () => {
    email('email', getDispute, true);
  });

  describe('name', () => {
    text('name', getDispute, true);
  });

  // original creditor

  describe('phone', () => {
    phone('phone', getDispute, true);
  });

  describe('ssn', () => {
    ssn('ssn', getDispute, true);
  });

  describe('state', () => {
    usStates('state', getDispute, true);
  });

  describe('zip-code', () => {
    zip('zip-code', getDispute, true);
  });

  // This are not part of the form constraints
  // describe('debt-type', () => {
  //   text('debt-type', getDispute, true);
  // });

  // describe('debt-amount', () => {
  //   currency('debt-amount', getDispute, true);
  // });
});
