/**
 * run the lambda locally with your very own permissions,
 *
 * file will be written to out.png / out.jpg (whatever your file type is)
 *
 */
const handler = require('../index');
const fs = require('fs');

describe("INVOKE", () => {
  process.env.SOURCE_BUCKETS = "master-images-053041861227-eu-west-1";
  jest.setTimeout(70_000)
  const run = async (event) => {
    const result = await handler.handler(event);

    const buff = Buffer.from(result.body, 'base64');
    console.log(result);
    const ext = result.headers['Content-Type'].replace("image/", "");

    const target = "out." + ext;
    fs.writeFile(target, buff, () => {
      console.log("wrote file to %s", target);
    });
    return result;
  };

  // used for local testing within the IDE
  // it("invokes", async () => {
  //   const data = fs.readFileSync('test/sample_event.json', 'utf-8');
  //   const event = JSON.parse(data);
  //   const result = await run(event);
  //   expect(result.statusCode).toEqual(200);
  // });

  it("dummy", () => {
    expect(true).toEqual(true);
  })

});