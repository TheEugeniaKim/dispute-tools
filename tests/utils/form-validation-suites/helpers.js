const { expect } = require('chai');

const settings = {
  baseFormData: {},
  // Set this to true when there will be absolutely no errors
  expectNoErrors: false,
};

const expectRule = ruleName => (fieldName, caught, not = false) => {
  if (not && caught && caught.errors) {
    if (caught.errors[fieldName]) {
      const { errors } = caught.errors[fieldName];
      const targetError = errors.find(e => e.rule === ruleName);

      expect(targetError).exist;
    } else {
      // There were no errors, that's good!
    }
  } else if (settings.expectNoErrors) {
    expect(caught.errors[fieldName]).not.exist;
  } else {
    expect(caught).exist;
    expect(caught.errors[fieldName]).exist;

    const { errors } = caught.errors[fieldName];
    const targetError = errors.find(e => e.rule === ruleName);

    expect(targetError).exist;
  }
};

exports.expectRule = expectRule;

exports.expectRequired = expectRule('required');

exports.expectNumber = expectRule('number');

exports.expectMin = expectRule('min');

exports.setBaseFormData = baseFormData => (settings.baseFormData = baseFormData);
exports.setExpectNoErrors = bool => (settings.expectNoErrors = bool);

exports.performTest = (getDispute, fieldName, fieldValue, expectation, not = false) => async () => {
  let caught;
  try {
    await getDispute().validateForm({ ...settings.baseFormData, [fieldName]: fieldValue });
  } catch (e) {
    caught = e;
  }

  expectation(fieldName, caught, not);
};
