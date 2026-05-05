const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('busTaams.db');

db.all("PRAGMA table_info(TB_BUS_RESERVATION)", [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(JSON.stringify(rows, null, 2));
    db.close();
});
