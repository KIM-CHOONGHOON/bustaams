const bucketName = 'bustaams-secure-data';
const rawPath = 'https://storage.googleapis.com/bustaams-secure-data/profiles/00000000000000000024.jpg';

const urlPrefix = `https://storage.googleapis.com/${bucketName}/`;
console.log('urlPrefix:', urlPrefix);
console.log('rawPath starts with prefix?', rawPath.startsWith(urlPrefix));

let gcsFilePath = '';
if (rawPath.startsWith(urlPrefix)) {
    gcsFilePath = rawPath.replace(urlPrefix, '');
}

console.log('gcsFilePath:', gcsFilePath);
