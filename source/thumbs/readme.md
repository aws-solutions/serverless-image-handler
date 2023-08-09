# Thumbhash

## What is it?

Implementation of [thumbhash](https://evanw.github.io/thumbhash/) as a Rust AWS Lambda function URL.

## How to use it?

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install)

### Build

```bash
cargo lambda build --arm64 --release --output-format zip --lambda-dir target/lambda/arm64
cargo lambda build --x86-64 --release --output-format zip --lambda-dir target/lambda/x86_64
```

```shell
OPENSSL_DIR=/usr/local/opt/openssl@1.1 
```

### Test / Invoke

See [cargo lambda](https://www.cargo-lambda.info/guide/getting-started.html)

```bash
# Terminal 1
cargo lambda watch
# Terminal 2
cargo lambda invoke --data-file apigw-request.json
```