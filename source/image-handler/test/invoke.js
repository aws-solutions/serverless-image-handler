/**
 * run the lambda locally with your very own permissions,
 *
 * file will be written to out.png / out.jpg (whatever your file type is)
 *
 */
const handler = require('../index');
const fs = require('fs');

process.env.SOURCE_BUCKETS = "master-images-053041861227-eu-west-1"

const run = async (event) => {
  const result = await handler.handler(event);

  const buff = Buffer.from(result.body, 'base64');
  console.log(result)
  const ext = result.headers['Content-Type'].replace("image/", "")

  const target = "out." + ext;
  fs.writeFile(target, buff, () => {
    console.log("wrote file to %s", target);
  })
}

fs.readFile('sample_event.json', (err, data) => {
  if (err) throw err;
  let event = JSON.parse(data);
  run(event);
});