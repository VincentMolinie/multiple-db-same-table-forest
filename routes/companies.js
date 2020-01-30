const express = require('express');
const RouteGenerator = require('../helpers/route-generator');

const router = express.Router();
const routeGenerator = new RouteGenerator(router, 'companies');

routeGenerator.defineAllRoutes();

module.exports = router;
