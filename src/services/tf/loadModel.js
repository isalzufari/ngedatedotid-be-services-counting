const tf = require('@tensorflow/tfjs-node');

async function loadModel() {
  const modelUrl = "file://src/models/model.json";
  return tf.loadGraphModel(modelUrl, {
    onProgress: (fractions) => {
      console.log(fractions)
    }
  });
}

module.exports = loadModel;