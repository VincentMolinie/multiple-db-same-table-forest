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
const { models } = require('../models');

const DATABASE_NAMES = ['america', 'europe'];
const [DEFAULT_DATABASE] = DATABASE_NAMES;


function getRecordId(id, databaseName) {
  return `${databaseName}-${id}`;
}

class RouteGenerator {
  constructor(router, modelName) {
    this.router = router;
    this.modelName = modelName;

    this.permissionMiddlewareCreator = new PermissionMiddlewareCreator(modelName);
    this.recordSerializer = new RecordSerializer({ name: modelName });
  }

  get capitalizedModelName() {
    return this.modelName.substring(0, 1).toUpperCase() + this.modelName.substring(1);
  }

  getModel(databaseName, capitalizedModelName = this.capitalizedModelName) {
    return models[databaseName][`${databaseName}${capitalizedModelName}`];
  }

  getRightRecordHelper(recordHelperClass, databaseName, model = null) {
    return model
      ? new recordHelperClass(model)
      : new recordHelperClass(this.getModel(databaseName));
  }

  transformRecordBeforeSerialization(model, record, databaseName) {
    const recordTransformed = {
      ...record.toJSON(),
      localisation: databaseName,
      id: getRecordId(record.id, databaseName),
    };

    Object.values(model.associations).forEach(association => {
      if (association.associationType === 'BelongsTo' && recordTransformed[association.as]) {
        recordTransformed[association.as][association.targetKey] = getRecordId(
          recordTransformed[association.as][association.targetKey],
          databaseName,
        );
      }
    });

    return recordTransformed;
  }

  defineAllRoutes() {
    this.generateCreateRoute();
    this.generateUpdateRoute();
    this.generateDeleteRoute();
    this.generateListRoute();
    this.generateGetDetailsRoute();
    this.defineRelationshipsRoutes();
  }

  defineRelationshipsRoutes() {
    const model = this.getModel(DEFAULT_DATABASE);
    Object.keys(model.associations).forEach((associationName) => {
      const association = model.associations[associationName];
      const associationModel = association.target;
      const { associationType } = association;
      if (associationType === 'HasMany') {
        this.generateGetHasMany(associationName, association);
      }
    });
  }

  generateGetHasMany(relationshipName, association) {
    this.router.get(`/${this.modelName}/:recordId/relationships/${relationshipName}`, (request, response, next) => {
      const [databaseName, recordId] = request.params.recordId.split('-');
      const recordsGetter = this.getRightRecordHelper(RecordsGetter, databaseName, association.target);

      const { query } = request;
      query.filters = JSON.stringify({ field: association.foreignKey, operator: 'equal', value: recordId });

      recordsGetter.getAll(query)
        .then(records => records.map(record => this.transformRecordBeforeSerialization(association.target, record, databaseName)))
        .then(records => {
          const recordSerializer = new RecordSerializer({ name: association.target.name });
          return recordSerializer.serialize(records);
        })
        .then(recordSerialized => response.send(recordSerialized))
        .catch(next);
    });
  }

  generateGetDetailsRoute() {
    this.router.get(`/${this.modelName}/:recordId`, this.permissionMiddlewareCreator.details(), (request, response, next) => {
      const [databaseName, recordId] = request.params.recordId.split('-');
      const recordGetter = this.getRightRecordHelper(RecordGetter, databaseName);
      recordGetter.get(recordId)
        .then(record => this.recordSerializer.serialize(this.transformRecordBeforeSerialization(this.getModel(databaseName), record, databaseName)))
        .then(recordSerialized => response.send(recordSerialized))
        .catch(next);
    });
  }

  generateCreateRoute() {
    this.router.post(`/${this.modelName}`, this.permissionMiddlewareCreator.create(), (request, response, next) => {
      const deserializer = new RecordCreator(this.getModel(DEFAULT_DATABASE));
      deserializer.deserialize(request.body)
        .then(recordToCreate => {
          const recordCreator = this.getRightRecordHelper(RecordCreator, recordToCreate.localisation || DEFAULT_DATABASE);
          const model = this.getModel(DEFAULT_DATABASE);
          Object.values(model.associations).forEach(association => {
            if (recordToCreate[association.as]) {
              const [_, foreignKeyId] = recordToCreate[association.as].split('-');
              recordToCreate[association.as] = foreignKeyId;
            }
          });
          return recordCreator.create(recordToCreate)
            .then(record => this.recordSerializer.serialize(this.transformRecordBeforeSerialization(this.getModel(databaseName), record, recordToCreate.localisation)))
            .then(recordSerialized => response.send(recordSerialized));
        })
        .catch(next);
    });
  }

  generateUpdateRoute() {
    this.router.put(`/${this.modelName}/:recordId`, this.permissionMiddlewareCreator.update(), (request, response, next) => {
      // Learn what this route does here: https://docs.forestadmin.com/documentation/v/v5/reference-guide/routes/default-routes#update-a-record
      const [databaseName, recordId] = request.params.recordId.split('-');
      const recordUpdater = this.getRightRecordHelper(RecordUpdater, databaseName);

      recordUpdater.deserialize(request.body)
        .then(recordToUpdate => recordUpdater.update(recordToUpdate, recordId))
        .then(record => this.recordSerializer.serialize(this.transformRecordBeforeSerialization(this.getModel(databaseName), record, databaseName)))
        .then(recordSerialized => response.send(recordSerialized))
        .catch(next);
    });
  }

  generateDeleteRoute() {
    this.router.delete(`/${this.modelName}/:recordId`, this.permissionMiddlewareCreator.delete(), (request, response, next) => {
      // Learn what this route does here: https://docs.forestadmin.com/documentation/v/v5/reference-guide/routes/default-routes#delete-a-record
      const [databaseName, recordId] = request.params.recordId.split('-');
      const recordRemover = this.getRightRecordHelper(RecordRemover, databaseName);
      recordRemover.remove(recordId)
        .then(() => response.status(204).send())
        .catch(next);
    });
  }

  generateListRoute() {
    this.router.get(`/${this.modelName}`, this.permissionMiddlewareCreator.list(), (request, response, next) => {
      // Learn what this route does here: https://docs.forestadmin.com/documentation/v/v5/reference-guide/routes/default-routes#get-a-list-of-records
      const recordsHelpers = DATABASE_NAMES.map(databaseName => {
        const recordsGetter = new RecordsGetter(this.getModel(databaseName));
        const recordsCounter = new RecordsCounter(this.getModel(databaseName));
        return { recordsGetter, recordsCounter, databaseName };
      });

      const promises = recordsHelpers.map((recordHelper) => {
        return Promise.all([
          recordHelper.recordsGetter.getAll(request.query),
          recordHelper.recordsCounter.count(request.query),
        ])
          .then(([records, count]) => {
            return {
              records,
              count,
              databaseName: recordHelper.databaseName,
            };
          });
      });

      return Promise.all(promises)
        .then((results) => {
          let count = 0;
          results.forEach(({ count: recordsCount }) => {
            count += recordsCount;
          });

          const records = [];
          results.forEach(({ records: recordsDb, databaseName }) => {
            recordsDb.forEach(record => {
              records.push(this.transformRecordBeforeSerialization(this.getModel(databaseName), record, databaseName));
            });
          });

          return { records, count };
        })
        .then(({ records, count }) => this.recordSerializer.serialize(records, { count }))
        .then(recordsSerialized => response.send(recordsSerialized))
        .catch(next);
    });
  }
}

module.exports = RouteGenerator;