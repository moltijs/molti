[![NPM Version](https://img.shields.io/npm/v/molti.svg)](https://www.npmjs.com/package/molti)
[![NPM Downloads](https://img.shields.io/npm/dm/molti.svg)](https://www.npmjs.com/package/molti)
[![Gemnasium](https://img.shields.io/gemnasium/moltijs/molti.svg)](https://gemnasium.com/github.com/moltijs/molti)

[![Coveralls branch](https://img.shields.io/coveralls/moltijs/molti/master.svg)](https://coveralls.io/github/moltijs/molti)[![Travis branch](https://img.shields.io/travis/moltijs/molti/master.svg?label=linux)](https://travis-ci.org/moltijs/molti)
[![AppVeyor branch](https://img.shields.io/appveyor/ci/SaaJoh0783/molti/master.svg?label=windows)](https://ci.appveyor.com/project/moltijs/molti)

# Molti

A self documenting extensible framework powered by `express` and `knex`

### More documentation coming!

## Installation

```bash
$ npm install molti
```

## Basic Usage

#### As a server

```js
const { Parameter, Response, Application, Handler, Controller, Generics } = require('molti');

const sampleController = new Controller({
  basePath: '/'
});

sampleController.get(new Handler({
  path: '/some_path/:id',
  params: [Generics.params.idParam],
  responses: [Generics.responses.success],
  handler({ id }, { success }) {
    return success({ message: `Found ${id}` });
  }
}));

const sample = new Application({
  controllers: [sampleController]
});

sample.listen(3000);
```

#### As an ORM

```js
const { Schema, ModelFactory, Registry } = require('molti');

const parentSchema = new Schema({
  name: {
    type: Schema.Types.String
  },
  children: {
    type: Schema.Types.Models
  }
});

class Parent extends ModelFactory(parentSchema) {
  feedChildren() {
    return this.children.map(child => child.eat());
  }
}

const childSchema = new Schema({
  name: {
    type: Schema.Types.String
  },
  parent: {
    type: Schema.Types.Model
  }
});

class Child extends ModelFactory(childSchema) {
  eat() {
    return `I, ${this.name}, ate ${this.parent.name}'s food`;
  }
}

const registry = new Registry({
  client: 'sqlite',
  connection: {
    filename: ':memory:'
  }
}, [
  Child,
  Parent
]);

Parent.findById(1, { withRelated: ['children'] })
  .then(parent => console.log(parent.feedChildren()));
```
