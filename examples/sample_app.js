const Application = require('../src/');

const sampleParam = new Application.Parameter()
  .param('id')
  .path()
  .string();

const sampleResponse = new Application.Response(200)
  .name('success')
  .prop('message', 'string');

const sampleHandler = new Application.Handler({
  path: '/some_path/:id',
  description: 'Just some sample path',
  params: [sampleParam],
  responses: [sampleResponse],
  handler({ id }, { success }) {
    success({ message: `Found ${id}` })
  }
});

const sampleController = new Application.Controller({
  basePath: '/',
  tag: 'Area',
  description: 'Some area'
})

const sample = new Application({
  controllers: [sampleController]
});

module.exports = sample;

sample.listen(3000);
