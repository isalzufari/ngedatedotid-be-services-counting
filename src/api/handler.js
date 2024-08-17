
const { detectObjects } = require('../services/tf/inferenceService')

class CountingHandler {
  constructor() {
    this.postCountingHandler = this.postCountingHandler.bind(this);
  }

  async postCountingHandler(request, h) {
    const { image } = request.payload;
    const { model } = request.server.app;
    const { db } = request.server.app;

    const newModel = {
      net: model,
      inputShape: model.inputs[0].shape,
    }

    const data = await detectObjects(image, newModel);

    return ({
      status: 'success',
      data
    });
  }
}

module.exports = CountingHandler;
