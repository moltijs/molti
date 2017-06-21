const express = require('express');
const { join } = require('path');
const { extend } = require('lodash');

module.exports = (app) => {
  const DocsRouter = express.Router();

  DocsRouter.use('/', express.static(join(__dirname, 'docs')));

  DocsRouter.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'docs', 'index.html'));
  });

  DocsRouter.get('/swagger.json', (req, res) => {
    let swag = {
      swagger: "2.0",
      info: {
        title: app._name || 'No name',
        description: app._description || 'No description',
        version: app._version || '0.0.0'
      },
      host: app._host || 'localhost',
      schemes: app._schemes || [
        'https',
        'http'
      ],
      scheme: app._scheme || 'https',
      produces: app._produces || [
        'application/json'
      ],
      paths: app._paths,
      definitions: app._definitions
    };
    let swaggerPaths = app.controllers.reduce((swag, ctrl) => {
      swag.paths = extend(swag.paths, ctrl.paths());
      return swag;
    }, swag);
    res.send(swaggerPaths);
  });
  return DocsRouter;
};
