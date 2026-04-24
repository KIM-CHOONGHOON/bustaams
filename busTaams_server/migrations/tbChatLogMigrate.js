/**
 * TB_CHAT_LOG 레거시 스키마 보강 (부트스트랩 + 채팅 API 재시도용)
 * - Linux에서 TB_CHAT_LOG / tb_chat_log 공존 시 LIMIT 1 로 한쪽만 고치는 문제 방지: 매칭되는 BASE TABLE 전부 순회
 */

function quoteIdent(name) {
    return '`' + String(name).replace(/`/g, '``') + '`';
}

async function migrateOneChatLogTable(connection, tbl) {
    const t = quoteIdent(tbl);

    let rows;
    try {
        const [r] = await connection.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
            [tbl]
        );
        rows = r;
    } catch (e) {
        if (e.code === 'ER_NO_SUCH_TABLE') return;
        throw e;
    }
    if (!rows || rows.length === 0) return;

    const colSet = new Set(rows.map((row) => String(row.COLUMN_NAME).toUpperCase()));

    /** 신규 3분할 모델(방 마스터 `CHAT_SEQ` 또는 이전 `CHAT_ID`) — 레거시 ALTER 생략 */
    if (colSet.has('CHAT_SEQ') || colSet.has('CHAT_ID')) {
        return;
    }

    const tryAlter = async (sql) => {
        try {
            await connection.execute(sql);
        } catch (e) {
            if (e.errno !== 1060 && e.code !== 'ER_DUP_FIELDNAME') {
                console.warn('TB_CHAT_LOG migrate:', tbl, e.message);
            }
        }
    };

    if (!colSet.has('CHAT_LOG_UUID')) {
        await tryAlter(
            `ALTER TABLE ${t} ADD COLUMN CHAT_LOG_UUID BINARY(16) NULL COMMENT '채팅 로그 PK' FIRST`
        );
        await tryAlter(
            `ALTER TABLE ${t} ADD COLUMN CHAT_LOG_UUID BINARY(16) NULL COMMENT '채팅 로그 PK'`
        );
    }
    if (!colSet.has('REQ_UUID')) {
        await tryAlter(
            `ALTER TABLE ${t} ADD COLUMN REQ_UUID BINARY(16) NULL COMMENT 'TB_AUCTION_REQ.REQ_UUID'`
        );
    }
    if (!colSet.has('RES_UUID')) {
        await tryAlter(
            `ALTER TABLE ${t} ADD COLUMN RES_UUID BINARY(16) NULL COMMENT 'TB_BUS_RESERVATION.RES_UUID'`
        );
    }
    if (!colSet.has('TRAVELER_UUID')) {
        await tryAlter(
            `ALTER TABLE ${t} ADD COLUMN TRAVELER_UUID BINARY(16) NULL COMMENT '여행자 USER_UUID'`
        );
    }
    if (!colSet.has('DRIVER_UUID')) {
        await tryAlter(
            `ALTER TABLE ${t} ADD COLUMN DRIVER_UUID BINARY(16) NULL COMMENT '기사 USER_UUID'`
        );
    }
    if (!colSet.has('SENDER_UUID')) {
        await tryAlter(
            `ALTER TABLE ${t} ADD COLUMN SENDER_UUID BINARY(16) NULL COMMENT '발신자 USER_UUID'`
        );
    }
    if (!colSet.has('SENDER_ROLE')) {
        await tryAlter(
            `ALTER TABLE ${t} ADD COLUMN SENDER_ROLE ENUM('TRAVELER','DRIVER','SYSTEM') NULL`
        );
    }
    if (!colSet.has('MSG_KIND')) {
        await tryAlter(
            `ALTER TABLE ${t} ADD COLUMN MSG_KIND VARCHAR(20) NOT NULL DEFAULT 'TEXT'`
        );
    }
    if (!colSet.has('MSG_BODY')) {
        await tryAlter(`ALTER TABLE ${t} ADD COLUMN MSG_BODY TEXT NULL`);
    }
    if (!colSet.has('FILE_UUID')) {
        await tryAlter(
            `ALTER TABLE ${t} ADD COLUMN FILE_UUID BINARY(16) NULL COMMENT '첨부 시 TB_FILE_MASTER'`
        );
    }
    if (!colSet.has('REG_DT')) {
        await tryAlter(
            `ALTER TABLE ${t} ADD COLUMN REG_DT DATETIME DEFAULT CURRENT_TIMESTAMP`
        );
    }
    /* 레거시 스키마: MSG_BODY 대신 MSG_CONTENT NOT NULL 만 있는 경우 INSERT 실패 방지 */
    if (colSet.has('MSG_CONTENT')) {
        await tryAlter(`ALTER TABLE ${t} MODIFY COLUMN MSG_CONTENT TEXT NULL`);
    }
    if (colSet.has('MSG_CONTENT') && colSet.has('MSG_BODY')) {
        try {
            await connection.execute(
                `UPDATE ${t} SET MSG_BODY = MSG_CONTENT WHERE MSG_BODY IS NULL AND MSG_CONTENT IS NOT NULL`
            );
        } catch (e) {
            /* ignore */
        }
    }

    try {
        await connection.execute(
            `UPDATE ${t} SET CHAT_LOG_UUID = UUID_TO_BIN(UUID()) WHERE CHAT_LOG_UUID IS NULL`
        );
    } catch (e) {
        console.warn('TB_CHAT_LOG backfill CHAT_LOG_UUID:', tbl, e.message);
    }

    try {
        await connection.execute(
            `ALTER TABLE ${t} MODIFY COLUMN CHAT_LOG_UUID BINARY(16) NOT NULL COMMENT '채팅 로그 PK'`
        );
    } catch (e) {
        /* 기존 PK/제약과 충돌 시 무시 */
    }

    const idxStatements = [
        `ALTER TABLE ${t} ADD KEY IDX_CHAT_LOG_REQ_REG (REQ_UUID, REG_DT)`,
        `ALTER TABLE ${t} ADD KEY IDX_CHAT_LOG_DRIVER (DRIVER_UUID, REG_DT)`,
        `ALTER TABLE ${t} ADD KEY IDX_CHAT_LOG_THREAD (REQ_UUID, DRIVER_UUID, TRAVELER_UUID)`,
    ];
    for (const sql of idxStatements) {
        try {
            await connection.execute(sql);
        } catch (e) {
            if (e.errno !== 1061 && e.code !== 'ER_DUP_KEYNAME') {
                /* ignore */
            }
        }
    }
}

async function migrateTbChatLogColumns(connection) {
    let tables;
    try {
        const [rows] = await connection.execute(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
              WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_TYPE = 'BASE TABLE'
                AND LOWER(TABLE_NAME) = 'tb_chat_log'
             ORDER BY TABLE_NAME`
        );
        tables = rows;
    } catch (e) {
        throw e;
    }
    if (!tables || tables.length === 0) return;

    for (const row of tables) {
        await migrateOneChatLogTable(connection, row.TABLE_NAME);
    }
}

module.exports = {
    migrateTbChatLogColumns,
};
