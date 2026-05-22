/**
 * POST /api/bus-driver-credit-card-registration — `BusDriverCreditCardRegistration`
 * 서버 기동 직후(express.json 다음)에 마운트하여 라우트 누락을 방지합니다.
 */
const { BILLING_SUBSCRIPTION_ID } = require('../lib/billingSubscriptionId');
const { BUS_DRIVER_CREDIT_CARD_REGISTRATION_ID } = require('../lib/busDriverCreditCardRegistrationId');
const { registerBusDriverPaymentCard } = require('../lib/busDriverCreditCardRegistration');
const { buildBillingSubscriptionPayload } = require('../lib/billingSubscriptionPayload');

/**
 * @param {import('express').Application} app
 * @param {import('mysql2/promise').Pool} pool
 */
module.exports = function mountBusDriverCreditCardRegistrationRoute(app, pool) {
    app.post('/api/bus-driver-credit-card-registration', async (req, res) => {
        const driverId = req.body?.driverId != null ? String(req.body.driverId).trim() : '';
        const cardNumber = req.body?.cardNumber != null ? String(req.body.cardNumber) : '';
        const expMonth = req.body?.expMonth != null ? String(req.body.expMonth) : '';
        const expYear = req.body?.expYear != null ? String(req.body.expYear) : '';
        const cardNickname =
            req.body?.CARD_NICKNAME != null ? String(req.body.CARD_NICKNAME) : '';
        const setAsDefault = Boolean(req.body?.setAsDefault);
        const cvvRaw = req.body?.cvv != null ? String(req.body.cvv).replace(/\D/g, '') : '';
        if (cvvRaw && cvvRaw.length !== 3 && cvvRaw.length !== 4) {
            return res.status(400).json({ error: 'CVV(3~4자리)를 확인하세요.' });
        }
        if (!driverId) {
            return res.status(400).json({ error: 'driverId가 필요합니다.' });
        }
        try {
            const reg = await registerBusDriverPaymentCard(pool, {
                rawDriverId: driverId,
                panDigits: cardNumber,
                expMonth,
                expYearYY: expYear,
                cardNickname,
                setAsDefault,
                screenId: BUS_DRIVER_CREDIT_CARD_REGISTRATION_ID,
            });
            const billing = await buildBillingSubscriptionPayload(pool, driverId, BILLING_SUBSCRIPTION_ID);
            res.status(200).json({
                BusDriverCreditCardRegistration: {
                    screenId: BUS_DRIVER_CREDIT_CARD_REGISTRATION_ID,
                    success: true,
                    custId: reg.custId,
                    cardSeq: reg.cardSeq,
                },
                BillingSubscription: billing,
            });
        } catch (error) {
            console.error('bus-driver-credit-card-registration:', error);
            if (error.code === 'ER_NO_SUCH_TABLE') {
                return res.status(503).json({ error: 'TB_PAYMENT_CARD 테이블이 없습니다.' });
            }
            const code = error.statusCode;
            if (code === 400 || code === 404 || code === 409) {
                return res.status(code).json({ error: error.message });
            }
            res.status(500).json({ error: error.message });
        }
    });

    console.log('✅ [routes] POST /api/bus-driver-credit-card-registration 등록됨');
};
