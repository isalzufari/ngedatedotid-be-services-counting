class CountingHandler {
  constructor(channel, service, model, dataService) {
    this._channel = channel;
    this._service = service;
    this._model = model;
    this._dataService = dataService;

    this.postCountingHandler = this.postCountingHandler.bind(this);
  }

  async postCountingHandler(message) {
    console.log('COUNT!')
    const { image, slug } = JSON.parse(message.content.toString());

    const model = this._model;
    const channel = await this._channel;

    const result = await this._service.detectObjects({ image, model });
    await this._dataService.storeData({ slug, result })

    channel.ack(message);
  }
}

module.exports = CountingHandler;
