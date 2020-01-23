const { collection } = require('forest-express-sequelize');

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
    }],
    actions: [],
    segments: [],
});
