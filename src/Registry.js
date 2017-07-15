class Registry {
  constructor(input) {
    if (input) this.load(input);
  }
  load(input) {
    if (!(input instanceof Array)) input = [input];
    input.forEach((model) => {
      this[model.name] = this;
      model.registry = this;
    });
  }
}

module.exports = Registry;
