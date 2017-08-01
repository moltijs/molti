const express = require('express');
const { join } = require('path');
const { extend } = require('lodash');

module.exports = (app) => {
  const DocsRouter = express.Router();

  DocsRouter.use('/', express.static(join(__dirname, 'docs')));
  /* istanbul ignore next */
  DocsRouter.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'docs', 'index.html'));
  });
  DocsRouter.get('/swagger.json', (req, res) => {
    let swag = {
      swagger: "2.0",
      info: {
        title: app._name,
        description: app._description,
        version: app._version
      },
      host: app._host,
      schemes: app._schemes,
      scheme: app._scheme,
      produces: app._produces,
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
