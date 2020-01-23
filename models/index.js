const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');

let databases = [{
  name: 'america',
  connectionString: process.env.DATABASE_AMERICA_URL,
}, {
  name: 'europe',
  connectionString: process.env.DATABASE_EUROPE_URL,
}];

if (process.env.DATABASE_SSL && JSON.parse(process.env.DATABASE_SSL.toLowerCase())) {
  databaseOptions.dialectOptions.ssl = true;
}


const sequelize = {};
const models = {};

databases.forEach((database) => {
  models[database.name] = {};

  const databaseOptions = {
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: { maxConnections: 10, minConnections: 1 },
    dialectOptions: {}
  };

  if (process.env.DATABASE_SSL && JSON.parse(process.env.DATABASE_SSL.toLowerCase())) {
    databaseOptions.dialectOptions.ssl = true;
  }

  const connection = new Sequelize(database.connectionString, databaseOptions);
  sequelize[database.name] = connection;

  fs
    .readdirSync(path.join(__dirname, database.name))
    .filter(function (file) {
      return (file.indexOf('.') !== 0) && (file !== 'index.js');
    })
    .forEach(function (file) {
      try {
        var model = connection['import'](path.join(__dirname, database.name, file));
        sequelize[model.name] = model;
        models[database.name][model.name] = model;
      } catch (error) {
        console.error('Model creation error: ' + error);
      }
    });

  Object.keys(models[database.name]).forEach(function(modelName) {
    if ('associate' in models[database.name][modelName]) {
      models[database.name][modelName].associate(sequelize[database.name].models);
    }
  });
});

module.exports = {
  sequelize,
  Sequelize,
  models,
};
