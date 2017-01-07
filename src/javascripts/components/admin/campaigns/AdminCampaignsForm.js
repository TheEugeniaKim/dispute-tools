import Checkit from 'checkit';
import Widget from '../../../lib/widget';
import Button from '../../../components/Button';

export default class AdminCampaignsForm extends Widget {
  static get constraints() {
    return {
      collectiveId: ['required'],
      title: ['required'],
    };
  }

  constructor(config) {
    super(config);

    this.ui = {};
    Object.keys(this.constructor.constraints).forEach(key => {
      const query = `[name="${key}"]`;
      this.ui[key] = this.element.querySelector(query);
    });
    this._checkit = new Checkit(this.constructor.constraints);

    this.appendChild(new Button({
      name: 'Button',
      element: this.element.querySelector('button[type="submit"]'),
    }));

    this._bindEvents();
  }

  _bindEvents() {
    this._handleFormSubmitRef = this._handleFormSubmit.bind(this);
    this.element.addEventListener('submit', this._handleFormSubmitRef);
  }

  _handleFormSubmit(ev) {
    this.Button.disable();
    this._clearFieldErrors();

    const [err] = this._checkit.validateSync(this._getFieldsData());

    if (err) {
      ev.preventDefault();
      this.Button.enable();
      return this._displayFieldErrors(err.errors);
    }

    this.Button.updateText();

    return null;
  }

  _displayFieldErrors(errors) {
    Object.keys(errors).forEach(key => {
      const parent = this.ui[key].parentNode;
      let errorLabel = parent.querySelector('.-on-error');

      parent.classList.add('error');

      if (errorLabel) {
        errorLabel.innerText = `▲ ${errors[key].message}`;
        return;
      }

      errorLabel = parent.nextSibling;
      if (errorLabel && errorLabel.classList.contains('-on-error')) {
        errorLabel.innerText = `▲ ${errors[key].message}`;
      }
    });
  }

  _clearFieldErrors() {
    Object.keys(this.constructor.constraints).forEach(key => {
      this.ui[key].parentNode.classList.remove('error');
    });
  }

  _getFieldsData() {
    const data = {};
    Object.keys(this.constructor.constraints).forEach(key => {
      data[key] = this.ui[key].value;
    });
    return data;
  }
}