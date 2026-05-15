const express = require('express');
const { authenticateToken } = require('../middleware/auth');

module.exports = function createNotificationRouter(pool, app) {
    const router = express.Router();

    if (app) {
        app.use('/api/app/notifications', router);
    }

    /**
     * 사용자의 알림 내역 조회
     * GET /api/app/notifications
     * (이제 custId를 쿼리로 보내지 않아도 토큰에서 자동으로 추출합니다)
     */
    router.get('/', authenticateToken, async (req, res) => {
        try {
            let custId = req.query.custId;
            
            // 쿼리에 custId가 없으면 토큰 정보를 바탕으로 DB에서 조회
            if (!custId) {
                const [uRows] = await pool.execute(
                    'SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?',
                    [req.user.userId]
                );
                if (uRows.length === 0) {
                    return res.status(404).json({ error: 'User not found' });
                }
                custId = uRows[0].CUST_ID;
            }

            const [rows] = await pool.execute(
                `SELECT * FROM TB_NOTIFICATION 
                 WHERE CUST_ID = ? 
                 ORDER BY REG_DT DESC 
                 LIMIT 50`,
                [custId]
            );
            res.json(rows);
        } catch (e) {
            console.error('Fetch notifications error:', e);
            res.status(500).json({ error: 'Failed to fetch notifications' });
        }
    });

    /**
     * 알림 읽음 처리
     * POST /api/app/notifications/read
     */
    router.post('/read', authenticateToken, async (req, res) => {
        const { seq } = req.body;
        let custId = req.body.custId;

        if (!seq) {
            return res.status(400).json({ error: 'seq is required' });
        }

        try {
            if (!custId) {
                const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [req.user.userId]);
                if (uRows.length === 0) return res.status(404).json({ error: 'User not found' });
                custId = uRows[0].CUST_ID;
            }

            await pool.execute(
                `UPDATE TB_NOTIFICATION SET READ_YN = 'Y' WHERE SEQ = ? AND CUST_ID = ?`,
                [seq, custId]
            );
            res.json({ ok: true });
        } catch (e) {
            console.error('Mark as read error:', e);
            res.status(500).json({ error: 'Failed to mark as read' });
        }
    });

    /**
     * 전체 읽음 처리
     * POST /api/app/notifications/read-all
     */
    router.post('/read-all', authenticateToken, async (req, res) => {
        let custId = req.body.custId;

        try {
            if (!custId) {
                const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [req.user.userId]);
                if (uRows.length === 0) return res.status(404).json({ error: 'User not found' });
                custId = uRows[0].CUST_ID;
            }

            await pool.execute(
                `UPDATE TB_NOTIFICATION SET READ_YN = 'Y' WHERE CUST_ID = ?`,
                [custId]
            );
            res.json({ ok: true });
        } catch (e) {
            console.error('Mark all as read error:', e);
            res.status(500).json({ error: 'Failed to mark all as read' });
        }
    });

    /**
     * 알림 삭제
     * DELETE /api/app/notifications/:seq
     */
    router.delete('/:seq', authenticateToken, async (req, res) => {
        const { seq } = req.params;
        let custId = req.query.custId;

        if (!seq) {
            return res.status(400).json({ error: 'seq is required' });
        }

        try {
            if (!custId) {
                const [uRows] = await pool.execute('SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?', [req.user.userId]);
                if (uRows.length === 0) return res.status(404).json({ error: 'User not found' });
                custId = uRows[0].CUST_ID;
            }

            await pool.execute(
                `DELETE FROM TB_NOTIFICATION WHERE SEQ = ? AND CUST_ID = ?`,
                [seq, custId]
            );
            res.json({ ok: true });
        } catch (e) {
            console.error('Delete notification error:', e);
            res.status(500).json({ error: 'Failed to delete notification' });
        }
    });

    return router;
};
