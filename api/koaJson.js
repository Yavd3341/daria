//
// Koa JSON body parser
// Illia Yavdoshchuk (c) 2023
//
// Based on StackOverflow answer: https://stackoverflow.com/a/67462841/8284672
//

module.exports = async (ctx, next) => {
  try {
    ctx.json = await new Promise((resolve, reject) => {
      let data = "";
      ctx.req.on('data', chunk => data += chunk);
      ctx.req.on('error', reject);
      ctx.req.on('end', () => resolve(data));
    });

    if (ctx.json.length > 0)
      ctx.json = JSON.parse(ctx.json);
    else
      ctx.json = {};

    return next();
  } catch (e) {
    console.warn("Malformed JSON recieved");
    ctx.status = 400;
  }
}