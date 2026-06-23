const { Storage } = require('@google-cloud/storage');
const storage = new Storage();
const bucket = storage.bucket('bustaams-secure-data');

async function run() {
    try {
        console.log('Testing GCS bucket exists...');
        const [exists] = await bucket.exists();
        console.log('Bucket exists:', exists);
    } catch (err) {
        console.error('GCS Error:', err);
    }
}
run();
