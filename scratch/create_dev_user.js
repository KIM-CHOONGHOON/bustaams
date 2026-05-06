const mysql = require('mysql2/promise');

async function main() {
    const config = {
        host: '127.0.0.1',
        port: 3307,
        user: 'master',
        password: '!QAZ2wsx2026@',
        database: 'mysql'
    };

    const connection = await mysql.createConnection(config);

    try {
        console.log('Creating dev user...');
        
        // 기존 사용자가 있으면 삭제 (안전하게 재생성)
        try {
            await connection.execute("DROP USER IF EXISTS 'bustaams_dev'@'%'");
        } catch (e) {}

        await connection.execute("CREATE USER 'bustaams_dev'@'%' IDENTIFIED BY 'BusTaams_CRUD_2026!#'");
        await connection.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON bustaams.* TO 'bustaams_dev'@'%'");
        await connection.execute("FLUSH PRIVILEGES");

        console.log('✅ User bustaams_dev created successfully with CRUD permissions.');
    } catch (err) {
        console.error('❌ Failed to create user:', err);
    } finally {
        await connection.end();
    }
}

main();
