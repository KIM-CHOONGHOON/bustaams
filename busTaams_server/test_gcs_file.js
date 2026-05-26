const { Storage } = require('@google-cloud/storage');
const storage = new Storage();
const bucket = storage.bucket('bustaams-secure-data');

async function run() {
    try {
        const file = bucket.file('uploads/documents/00000000000000000005.png');
        console.log('Testing file exists...');
        const [exists] = await file.exists();
        console.log('File exists:', exists);
        if (exists) {
            const [metadata] = await file.getMetadata();
            console.log('Metadata:', metadata.contentType, metadata.size);
        }
    } catch (err) {
        console.error('GCS Error:', err);
    } finally {
        process.exit();
    }
}
run();
