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