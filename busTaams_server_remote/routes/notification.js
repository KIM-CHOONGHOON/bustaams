const express = require('express');
const { authenticateToken } = require('../middleware/auth');

module.exports = function createNotificationRouter(pool, app) {
    const router = express.Router();

    if (app) {
        app.use('/api/app/notifications', router);
    }

    // 로그인한 사용자의 고유 CUST_ID를 토큰에서 추출하는 헬퍼 함수 (한글 주석)
    async function resolveTokenCustId(req) {
        if (req.user && req.user.custId) {
            return req.user.custId;
        }
        if (req.user && req.user.userId) {
            const [uRows] = await pool.execute(
                'SELECT CUST_ID FROM TB_USER WHERE USER_ID = ?',
                [req.user.userId]
            );
            if (uRows.length > 0) {
                return uRows[0].CUST_ID;
            }
        }
        return null;
    }

    /**
     * 사용자의 알림 내역 조회
     * GET /api/app/notifications
     * (본인 토큰의 custId만 허용하며, 타인의 custId 요청 시 403 차단)
     */
    router.get('/', authenticateToken, async (req, res) => {
        try {
            const tokenCustId = await resolveTokenCustId(req);
            if (!tokenCustId) {
                return res.status(404).json({ error: 'User not found' });
            }

            // 쿼리에 다른 사용자의 custId가 전달된 경우 권한 오류 반환 (한글 주석)
            if (req.query.custId && String(req.query.custId).trim() !== String(tokenCustId).trim()) {
                return res.status(403).json({ error: '다른 사용자의 알림을 조회할 권한이 없습니다.' });
            }

            const [rows] = await pool.execute(
                `SELECT * FROM TB_NOTIFICATION 
                 WHERE CUST_ID = ? 
                 ORDER BY REG_DT DESC 
                 LIMIT 50`,
                [tokenCustId]
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

        if (!seq) {
            return res.status(400).json({ error: 'seq is required' });
        }

        try {
            const tokenCustId = await resolveTokenCustId(req);
            if (!tokenCustId) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (req.body.custId && String(req.body.custId).trim() !== String(tokenCustId).trim()) {
                return res.status(403).json({ error: '다른 사용자의 알림을 변경할 권한이 없습니다.' });
            }

            // 대상 알림 소유자 확인 (한글 주석)
            const [targetRows] = await pool.execute(
                'SELECT CUST_ID FROM TB_NOTIFICATION WHERE SEQ = ?',
                [seq]
            );
            if (targetRows.length === 0) {
                return res.status(404).json({ error: '알림을 찾을 수 없습니다.' });
            }
            if (String(targetRows[0].CUST_ID).trim() !== String(tokenCustId).trim()) {
                return res.status(403).json({ error: '다른 사용자의 알림을 변경할 권한이 없습니다.' });
            }

            await pool.execute(
                `UPDATE TB_NOTIFICATION SET READ_YN = 'Y' WHERE SEQ = ? AND CUST_ID = ?`,
                [seq, tokenCustId]
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
        try {
            const tokenCustId = await resolveTokenCustId(req);
            if (!tokenCustId) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (req.body.custId && String(req.body.custId).trim() !== String(tokenCustId).trim()) {
                return res.status(403).json({ error: '다른 사용자의 알림을 변경할 권한이 없습니다.' });
            }

            await pool.execute(
                `UPDATE TB_NOTIFICATION SET READ_YN = 'Y' WHERE CUST_ID = ?`,
                [tokenCustId]
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

        if (!seq) {
            return res.status(400).json({ error: 'seq is required' });
        }

        try {
            const tokenCustId = await resolveTokenCustId(req);
            if (!tokenCustId) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (req.query.custId && String(req.query.custId).trim() !== String(tokenCustId).trim()) {
                return res.status(403).json({ error: '다른 사용자의 알림을 삭제할 권한이 없습니다.' });
            }

            // 대상 알림 소유자 확인 (한글 주석)
            const [targetRows] = await pool.execute(
                'SELECT CUST_ID FROM TB_NOTIFICATION WHERE SEQ = ?',
                [seq]
            );
            if (targetRows.length === 0) {
                return res.status(404).json({ error: '알림을 찾을 수 없습니다.' });
            }
            if (String(targetRows[0].CUST_ID).trim() !== String(tokenCustId).trim()) {
                return res.status(403).json({ error: '다른 사용자의 알림을 삭제할 권한이 없습니다.' });
            }

            await pool.execute(
                `DELETE FROM TB_NOTIFICATION WHERE SEQ = ? AND CUST_ID = ?`,
                [seq, tokenCustId]
            );
            res.json({ ok: true });
        } catch (e) {
            console.error('Delete notification error:', e);
            res.status(500).json({ error: 'Failed to delete notification' });
        }
    });

    return router;
};
