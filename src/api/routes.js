const routes = (handler) => [
  {
    method: 'POST',
    path: '/predicts',
    handler: handler.postCountingHandler,
  },
];

module.exports = routes;
