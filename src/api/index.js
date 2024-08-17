const CountingHandler = require('./handler');
const routes = require('./routes');

module.exports = {
  name: 'counting',
  version: '1.0.0',
  register: async (server, { service }) => {
    const countingHandler = new CountingHandler(service);
    server.route(routes(countingHandler));
  }
}