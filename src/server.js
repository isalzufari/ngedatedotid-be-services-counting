require('dotenv').config();

const Hapi = require('@hapi/hapi');
const amqp = require('amqplib');

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require('./services/firebase/serviceAccountKey.json');
const ClientError = require('./exceptions/ClientError');

const loadModel = require('./services/tf/loadModel');
const ConsumerService = require('./services/rabbitmq/ConsumerService');
const inferenceService = require('./services/tf/inferenceService');
const DataService = require('./services/firebase/DataService');

const counting = require('./api');
const CountingHandler = require('./handler');

const init = async () => {
  initializeApp({
    credential: cert(serviceAccount),
    databaseURL: "https://ngedatedotid-development-default-rtdb.firebaseio.com"
  });

  const db = getFirestore();
  const model = await loadModel();

  const dataService = new DataService(db);

  const {
    HOST,
    PORT,
    RABBITMQ_SERVER
  } = process.env;

  console.log(" [*] Waiting 5 seconds for private networking");
  await new Promise(r => setTimeout(r, 5000));
  console.log(`Running amqp, server listening on: ${RABBITMQ_SERVER}`);

  const connection = await amqp.connect(RABBITMQ_SERVER);
  const channel = await connection.createChannel();
  const consumerService = new ConsumerService(channel);
  const countingHandler = new CountingHandler(channel, inferenceService, model, dataService)

  await consumerService.receiveMessage('counting:post', countingHandler.postCountingHandler);

  const server = Hapi.server({
    port: PORT || 8086,
    host: HOST || "0.0.0.0",
    routes: {
      cors: {
        origin: ['*'],
      },
    },
  });

  server.app.model = model;
  server.app.db = db;

  server.route([
    {
      method: 'GET',
      path: '/',
      handler: async (request, h) => {
        return h.response({
          status: 'success',
          message: 'Server running!'
        })
      }
    },
  ]);

  server.ext('onPreResponse', (request, h) => {
    const { response } = request;

    if (response instanceof ClientError) {
      const newResponse = h.response({
        status: 'fail',
        message: response.message,
      });
      newResponse.code(response.statusCode);
      return newResponse;
    }

    return response.continue || response;
  });

  await server.register([
    {
      plugin: counting,
    },
  ]);

  await server.start();
  console.log(`Server berjalan pada ${server.info.uri}`);
}

init();