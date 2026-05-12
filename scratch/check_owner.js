const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../busTaams_server/.env') });

async function check() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3307,
    });

    try {
        const reqId = '0000000005';
        console.log(`Checking REQ_ID: ${reqId}`);
        
        const [reqRows] = await pool.execute('SELECT * FROM TB_AUCTION_REQ WHERE REQ_ID = ?', [reqId]);
        if (reqRows.length === 0) {
            console.log('No record found in TB_AUCTION_REQ');
        } else {
            const req = reqRows[0];
            console.log('REQ Record:', {
                REQ_ID: req.REQ_ID,
                TRAVELER_ID: req.TRAVELER_ID,
                DATA_STAT: req.DATA_STAT
            });

            const [userRows] = await pool.execute('SELECT * FROM TB_USER WHERE CUST_ID = ?', [req.TRAVELER_ID]);
            if (userRows.length > 0) {
                console.log('Owner Info:', {
                    CUST_ID: userRows[0].CUST_ID,
                    USER_ID: userRows[0].USER_ID,
                    USER_NM: userRows[0].USER_NM
                });
            } else {
                console.log('Owner user not found for CUST_ID:', req.TRAVELER_ID);
                // Maybe USER_ID is stored instead of CUST_ID?
                const [userRows2] = await pool.execute('SELECT * FROM TB_USER WHERE USER_ID = ?', [req.TRAVELER_ID]);
                if (userRows2.length > 0) {
                    console.log('Owner Info (found by USER_ID):', {
                        CUST_ID: userRows2[0].CUST_ID,
                        USER_ID: userRows2[0].USER_ID,
                        USER_NM: userRows2[0].USER_NM
                    });
                }
            }
        }

        // Also check if there's a reservation record
        const [resRows] = await pool.execute('SELECT * FROM TB_BUS_RESERVATION WHERE REQ_ID = ?', [reqId]);
        console.log(`Found ${resRows.length} records in TB_BUS_RESERVATION`);
        resRows.forEach(r => {
            console.log('Res Record:', {
                RES_ID: r.RES_ID,
                DATA_STAT: r.DATA_STAT
            });
        });

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
