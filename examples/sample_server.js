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
