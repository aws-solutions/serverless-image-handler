const fs = require('fs');
const archiver = require('archiver');
const AWS = require('aws-sdk');
const yargs = require('yargs');
const { execSync } = require('child_process');
const path = require('path');

const argv = yargs
    .option('directoryPath', {
        alias: 'd',
        description: 'The path to the directory containing the Lambda function',
        type: 'string',
        demandOption: true
    })
    .option('bucketName', {
        alias: 'b',
        description: 'The S3 bucket name',
        type: 'string',
        demandOption: true
    })
    .help()
    .alias('help', 'h')
    .argv;

// Check for unstaged changes and get current commit SHA
function getCurrentCommitSHA() {
    if (execSync('git diff --exit-code').length !== 0) {
        throw new Error('Unstaged changes detected. Please commit or stash them before running this script.');
    }
    return execSync('git rev-parse HEAD').toString().trim();
}

const commitSHA = getCurrentCommitSHA();

// Ensure AWS_REGION and AWS_PROFILE are set via environment variables
const s3 = new AWS.S3();

/**
 * Zips a directory.
 * 
 * @param {string} source - Path to the directory to be zipped.
 * @param {string} out - Path for the output zip file.
 */
function zipDirectory(source, out) {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const output = fs.createWriteStream(out);

    return new Promise((resolve, reject) => {
        output.on('close', () => {
            console.log(`Zipped ${source} to ${out} (${archive.pointer()} total bytes)`);
            resolve();
        });

        archive.on('warning', function (err) {
            console.warn(`Warning zipping ${source} to ${out} directory: `, err);
        });
        archive
            .directory(source, false)
            .on('error', err => {
                console.error(`Error zipping ${source} to ${out}: ${err}`);
                reject(err)
            })
            .pipe(output);

        archive.finalize();
    });
}


// Function to upload the zip file to S3
async function uploadToS3(bucketName, filePath) {
    const fileContent = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    const params = {
        Bucket: bucketName,
        Key: `serverless-image-handler/${commitSHA}.zip`,
        Body: fileContent
    };

    try {
        const data = await s3.upload(params).promise();
        console.log(`File uploaded successfully at ${data.Location}`);
    } catch (err) {
        console.error("Error uploading file: ", err);
    }
}

const { directoryPath, bucketName } = argv;

const zipFilePath = path.join(__dirname, 'lambda.zip');

// Perform the zipping and uploading
zipDirectory(directoryPath, zipFilePath)
    .then(() => uploadToS3(bucketName, zipFilePath))
    .catch(err => console.error(err));
