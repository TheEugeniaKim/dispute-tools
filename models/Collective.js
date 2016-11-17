/* globals Class, Krypton, Collective */

const Collective = Class('Collective').inherits(Krypton.Model)({
  tableName: 'Collectives',
  validations: {
    name: ['required'],
  },
  attributes: [
    'id',
    'name',
    'description',
    'manifest',
    'goalTitle',
    'goal',
    'userCount',
    'createdAt',
    'updatedAt',
  ],

  prototype: {
    userCount: 0,
  },
});

module.exports = Collective;
