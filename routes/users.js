const express = require('express');
const {
  PermissionMiddlewareCreator,
  RecordsGetter,
  RecordGetter,
  RecordUpdater,
  RecordCreator,
  RecordRemover,
  RecordsCounter,
  RecordSerializer,
} = require('forest-express-sequelize');
const models = require('../models').models;
const { america, europe } = models;

const router = express.Router();
const permissionMiddlewareCreator = new PermissionMiddlewareCreator('users');
const usersSerializer = new RecordSerializer({ name: 'users' });

function getRightRecordHelper(recordHelperClass, databaseName) {
  return new recordHelperClass(models[databaseName][`${databaseName}Users`]);
}

function getRecordId(id, databaseName) {
  return `${databaseName}-${id}`;
}

// This file contains the logic of every route in Forest Admin for the collection users:
// - Native routes are already generated but can be extended/overriden - Learn how to extend a route here: https://docs.forestadmin.com/documentation/v/v5/reference-guide/routes/extend-a-route
// - Smart action routes will need to be added as you create new Smart Actions - Learn how to create a Smart Action here: https://docs.forestadmin.com/documentation/v/v5/reference-guide/actions/create-and-manage-smart-actions

// Create a User
router.post('/users', permissionMiddlewareCreator.create(), (request, response, next) => {
  const deserializer = new RecordCreator(america.americaUsers);
  deserializer.deserialize(request.body)
    .then(recordToCreate => {
      const recordCreator = getRightRecordHelper(RecordCreator, recordToCreate.localisation || 'america');
      return recordCreator.create(recordToCreate)
        .then(record => recordCreator.serialize({ ...record, id: getRecordId(record.id, recordToCreate.localisation) }))
        .then(recordSerialized => response.send(recordSerialized));
    })
    .catch(next);
});

// Update a User
router.put('/users/:recordId', permissionMiddlewareCreator.update(), (request, response, next) => {
  // Learn what this route does here: https://docs.forestadmin.com/documentation/v/v5/reference-guide/routes/default-routes#update-a-record
  const [databaseName, recordId] = request.params.recordId.split('-');
  const recordUpdater = getRightRecordHelper(RecordUpdater, databaseName);

  recordUpdater.deserialize(request.body)
    .then(recordToUpdate => recordUpdater.update(recordToUpdate, recordId))
    .then(record => recordUpdater.serialize(record))
    .then(recordSerialized => response.send(recordSerialized))
    .catch(next);
});

// Delete a User
router.delete('/users/:recordId', permissionMiddlewareCreator.delete(), (request, response, next) => {
  // Learn what this route does here: https://docs.forestadmin.com/documentation/v/v5/reference-guide/routes/default-routes#delete-a-record
  const [databaseName, recordId] = request.params.recordId.split('-');
  const recordRemover = getRightRecordHelper(RecordRemover, databaseName);
  recordRemover.remove(recordId)
    .then(() => response.status(204).send())
    .catch(next);
});

// Get a list of Users
router.get('/users', permissionMiddlewareCreator.list(), (request, response, next) => {
  // Learn what this route does here: https://docs.forestadmin.com/documentation/v/v5/reference-guide/routes/default-routes#get-a-list-of-records
  // next();
  const americaRecordsGetter = new RecordsGetter(america.americaUsers);
  const europeRecordsGetter = new RecordsGetter(europe.europeUsers);

  const americaRecordsCounter = new RecordsCounter(america.americaUsers);
  const europeRecordsCounter = new RecordsCounter(europe.europeUsers);

  return Promise.all([
    americaRecordsGetter.getAll(request.query),
    europeRecordsGetter.getAll(request.query),
    americaRecordsCounter.count(request.query),
    europeRecordsCounter.count(request.query),
  ])
    .then(([americaUsers, europeUsers, americaCount, europeCount]) => {
      const count = americaCount + europeCount;
      const records = [];

      americaUsers.forEach(americaUser => {
        records.push({
          ...americaUser.toJSON(),
          id: getRecordId(americaUser.id, 'america'),
        });
      });
      europeUsers.forEach(europeUser => {
        records.push({
          ...europeUser.toJSON(),
          id: getRecordId(europeUser.id, 'europe'),
        });
      });

      return { records, count };
    })
    .then(({ records, count }) => usersSerializer.serialize(records, { count }))
    .then(recordsSerialized => response.send(recordsSerialized))
    .catch(next);
});

// Get a number of Users
router.get('/users/count', permissionMiddlewareCreator.list(), (request, response, next) => {
  // Learn what this route does here: https://docs.forestadmin.com/documentation/v/v5/reference-guide/routes/default-routes#get-a-number-of-records

  const americaRecordsCounter = new RecordsCounter(america.americaUsers);
  const europeRecordsCounter = new RecordsCounter(europe.europeUsers);

  return Promise.all([
    americaRecordsCounter.count(request.query),
    europeRecordsCounter.count(request.query),
  ])
    .then(([americaUsersCount, europeUsersCount]) => americaUsersCount + europeUsersCount)
    .then(count => response.send({ count }))
    .catch(next);
});

// Get a User
router.get('/users/:recordId', permissionMiddlewareCreator.details(), (request, response, next) => {
  const [databaseName, recordId] = request.params.recordId.split('-');
  const recordGetter = getRightRecordHelper(RecordGetter, databaseName);
  recordGetter.get(recordId)
    .then(record => recordGetter.serialize(record))
    .then(recordSerialized => response.send(recordSerialized))
    .catch(next);
});

// Export a list of Users
router.get('/users.csv', permissionMiddlewareCreator.export(), (request, response, next) => {
  // Learn what this route does here: https://docs.forestadmin.com/documentation/v/v5/reference-guide/routes/default-routes#export-a-list-of-records
  next();
});

module.exports = router;
