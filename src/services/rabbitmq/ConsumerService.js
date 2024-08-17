class ConsumerService {
  constructor(channel) {
    this._channel = channel;
  }

  async receiveMessage(queue, handler) {
    await this._channel.assertQueue(queue, { durable: true });
    await this._channel.prefetch(1);
    console.log(`Connected to RabbitMQ and consuming messages from queue: ${queue}`);
    await this._channel.consume(queue, handler, { noAck: false });
  }
}

module.exports = ConsumerService;
