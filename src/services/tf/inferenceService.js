const tf = require('@tensorflow/tfjs-node');

const labels = ["head-people"]
const numClass = labels.length;

const preProcessImage = require('./preProcessImage');
const renderBoxes = require('./renderBoxes');
// const saveData = require('./extractFrame');

const detectObjects = async ({ image, model }) => {
  return new Promise(async (resolve) => {
    const newModel = {
      net: model,
      inputShape: model.inputs[0].shape,
    };

    const [modelWidth, modelHeight] = newModel.inputShape.slice(1, 3);

    tf.engine().startScope();
    const [input, xRatio, yRatio, canvas, ctx] = await preProcessImage({
      tf, image, modelWidth, modelHeight
    });
    const res = await newModel.net.execute(input);
    const transRes = res.transpose([0, 2, 1]); // transpose result [b, det, n] => [b, n, det]

    const boxes = tf.tidy(() => {
      const w = transRes.slice([0, 0, 2], [-1, -1, 1]); // get width
      const h = transRes.slice([0, 0, 3], [-1, -1, 1]); // get height
      const x1 = tf.sub(transRes.slice([0, 0, 0], [-1, -1, 1]), tf.div(w, 2)); // x1
      const y1 = tf.sub(transRes.slice([0, 0, 1], [-1, -1, 1]), tf.div(h, 2)); // y1
      return tf
        .concat(
          [
            y1,
            x1,
            tf.add(y1, h), //y2
            tf.add(x1, w), //x2
          ],
          2
        )
        .squeeze();
    });

    const [scores, classes] = tf.tidy(() => {
      // class scores
      const rawScores = transRes.slice([0, 0, 4], [-1, -1, numClass]).squeeze(0); // #6 only squeeze axis 0 to handle only 1 class models
      return [rawScores.max(1), rawScores.argMax(1)];
    }); // get max scores and classes index

    const nms = await tf.image.nonMaxSuppressionAsync(boxes, scores, 500, 0.45, 0.2);

    const boxes_data = boxes.gather(nms, 0).dataSync(); // indexing boxes by nms index
    const scores_data = scores.gather(nms, 0).dataSync(); // indexing scores by nms index
    const classes_data = classes.gather(nms, 0).dataSync(); // indexing classes by nms index

    renderBoxes(ctx, boxes_data, scores_data, classes_data, [xRatio, yRatio], labels);
    const base64Image = canvas.toDataURL('image/jpeg', 0.8);

    tf.dispose([res, transRes, boxes, scores, classes, nms])
    tf.engine().endScope();

    const date = new Date;
    const timestamp = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
    let confidence = []
    scores_data.forEach(val => {
      confidence.push((val * 100).toFixed(1));
    });
    // saveData({ count: scores_data.length, base64Image });
    resolve({
      image: base64Image,
      counting: scores_data.length,
      confidence,
      timestamp,
    });
  });
};

module.exports = { detectObjects };
