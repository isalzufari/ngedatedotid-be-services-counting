const { loadImage, createCanvas } = require('canvas');

async function preProcessImage({ tf, image, modelWidth, modelHeight }) {
  return new Promise(async (resolve) => {
    const imgSrc = await loadImage(image);
    const canvas = createCanvas(modelWidth, modelHeight);
    // console.log(modelWidth, img.width)
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgSrc, 0, 0, modelWidth, modelHeight);

    let xRatio, yRatio; // ratios for boxes
    const input = tf.tidy(() => {
      const img = tf.browser.fromPixels(canvas);

      const [h, w] = img.shape.slice(0, 2);
      const maxSize = Math.max(w, h);
      const imgPadded = img.pad([
        [0, maxSize - h], // padding y [bottom only]
        [0, maxSize - w], // padding x [right only]
        [0, 0],
      ]);

      xRatio = maxSize / w; // update xRatio
      yRatio = maxSize / h; // update yRatio

      return tf.image
        .resizeBilinear(imgPadded, [modelWidth, modelHeight])
        .div(255.0)
        .expandDims(0)
    });

    resolve([input, xRatio, yRatio, canvas, ctx]);
  });
}

module.exports = preProcessImage;