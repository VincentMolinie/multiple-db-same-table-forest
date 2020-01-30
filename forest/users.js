const { collection } = require('forest-express-sequelize');
const models = require('../models');

// This file allows you to add to your Forest UI:
// - Smart actions: https://docs.forestadmin.com/documentation/reference-guide/actions/create-and-manage-smart-actions
// - Smart fields: https://docs.forestadmin.com/documentation/reference-guide/fields/create-and-manage-smart-fields
// - Smart relationships: https://docs.forestadmin.com/documentation/reference-guide/relationships/create-a-smart-relationship
// - Smart segments: https://docs.forestadmin.com/documentation/reference-guide/segments/smart-segments
collection('users', {
    isSearchable: true,
    fields: [{
        field: 'id',
        type: 'String',
    }, {
        field: 'firstname',
        type: 'String',
    }, {
        field: 'lastname',
        type: 'String',
    }, {
        field: 'email',
        type: 'String',
    }, {
      field: 'localisation', // NOTICE: Only used for creation
      type: 'Enum',
      enums: ['europe', 'america'],
      isRequired: true,
      validate: {}
    }, {
      field: 'company',
      type: 'String',
      reference: 'companies.id',
      get(user) {
        if (!user.company) {
          return null;
        }
        return {
          ...user.company,
          localisation: user.localisation,
          id: `${user.localisation}-${user.company.id}`,
        };
      },
    }],
    actions: [],
    segments: [],
});
