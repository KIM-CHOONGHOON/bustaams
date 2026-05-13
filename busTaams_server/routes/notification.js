const express = require('express');

module.exports = function createNotificationRouter(pool, app) {
    const router = express.Router();

    if (app) {
        app.use('/api/app/notifications', router);
    }

    /**
     * 사용자의 알림 내역 조회
     * GET /api/app/notifications?custId=...
     */
    router.get('/', async (req, res) => {
        const { custId } = req.query;
        if (!custId) {
            return res.status(400).json({ error: 'custId is required' });
        }

        try {
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
    router.post('/read', async (req, res) => {
        const { seq, custId } = req.body;
        if (!seq || !custId) {
            return res.status(400).json({ error: 'seq and custId are required' });
        }

        try {
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
     */
    router.post('/read-all', async (req, res) => {
        const { custId } = req.body;
        if (!custId) {
            return res.status(400).json({ error: 'custId is required' });
        }

        try {
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
     */
    router.delete('/:seq', async (req, res) => {
        const { seq } = req.params;
        const { custId } = req.query;
        if (!seq || !custId) {
            return res.status(400).json({ error: 'seq and custId are required' });
        }

        try {
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
