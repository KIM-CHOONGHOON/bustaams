try {
    const auth = require('../routes/appAuth');
    console.log('AppAuth loaded successfully');
} catch (err) {
    console.error('Error loading AppAuth:', err);
}
