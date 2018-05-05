import Widget from '../lib/widget';
import Alert from '../components/Alert';
import Modal from '../components/Modal';
import DonationFlow from '../components/DonationFlow'; // rename: DonationFlowForm
import currentUser from '../lib/currentUser';

export default class Common extends Widget {
  constructor(config) {
    super(config);

    currentUser.set(config.currentUser);

    const alertElements = [].slice.call(document.querySelectorAll('.Alert'));

    if (alertElements.length) {
      alertElements.forEach((el, index) => {
        this.appendChild(
          new Alert({
            name: `Alert__${index}`,
            element: el,
          }),
        );
      });
    }

    // DonationFlow modal
    const donationFlowModal = document.querySelector('.DonationFlow');

    if (!donationFlowModal) {
      return;
    }

    this.appendChild(
      new Modal({
        name: 'donationFlowModal',
        element: donationFlowModal,
      }),
    ).appendChild(
      new DonationFlow({
        name: 'donationFlow',
        element: donationFlowModal.querySelector('[data-component-donationform]'),
      }),
    );

    this.donationFlowModal.bind('activate', () => {
      this.donationFlowModal.donationFlow.reset();
    });

    // Activate DonationFlow triggers
    Array.prototype.slice.call(document.querySelectorAll('.js-donate')).forEach(trigger =>
      trigger.addEventListener('click', ev => {
        ev.preventDefault();
        this.donationFlowModal.activate();
      }),
    );
  }
}
