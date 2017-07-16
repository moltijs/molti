[![NPM Downloads][downloads-image]][downloads-url]
[![Coverage Status](https://coveralls.io/repos/github/SaaJoh0783/molti/badge.svg?branch=master)](https://coveralls.io/github/SaaJoh0783/molti?branch=master)
[![npm version](https://badge.fury.io/js/molti.svg)](https://badge.fury.io/js/molti)
[![Build Status](https://travis-ci.org/SaaJoh0783/molti.svg?branch=master)](https://travis-ci.org/SaaJoh0783/molti)

# Molti

A self documenting extensible framework powered by `express` and `knex`

## Installation

```bash
$ npm install molti
```

## Basic Usage

#### As a server

```js
const { Parameter, Response, Application, Handler, Controller } = require('../src/'); // replace with require('molti');

const sampleParam = new Parameter('id').path().string();
const sampleResponse = new Response(200).name('success').prop('message', 'string');

const sampleController = new Controller({
  basePath: '/',
  tag: 'Area',
  description: 'Some area'
});

sampleController.get(new Handler({
  path: '/some_path/:id',
  description: 'Just some sample path',
  params: [sampleParam],
  responses: [sampleResponse],
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
const { Schema, ModelFactory, Registry } = require('../src/');

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

const registry = new Registry([
  Child,
  Parent
]);

registry.Parent.findById(1, {
  withRelated: ['children']
}).then(parent => {
  console.log(parent.feedChildren());
});
```
