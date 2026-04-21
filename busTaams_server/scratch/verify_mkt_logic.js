const isY = (val) => val === true || val === 'Y' || val === 'true' || val === 1 || val === '1' || val === 'yes' || val === 'on';

function testMapping(body, mktChannelYN, term) {
    const findFlag = (key) => {
        const candidates = [
            mktChannelYN ? mktChannelYN[key] : null,
            mktChannelYN ? mktChannelYN[`mkt_${key}_yn`] : null,
            mktChannelYN ? mktChannelYN[`mkt${key.charAt(0).toUpperCase() + key.slice(1)}`] : null,
            body[key],
            body[`mkt_${key}_yn`],
            body[`mkt${key.charAt(0).toUpperCase() + key.slice(1)}`],
            term[key],
            term[`mkt_${key}_yn`],
            term[`mkt${key.charAt(0).toUpperCase() + key.slice(1)}`]
        ];
        return candidates.some(isY);
    };

    const channels = Array.isArray(term.channels) ? term.channels.map(c => String(c).toLowerCase()) : [];
    
    return {
        sms: (findFlag('sms') || channels.includes('sms')) ? 'Y' : 'N',
        push: (findFlag('push') || channels.includes('push')) ? 'Y' : 'N',
        email: (findFlag('email') || channels.includes('email')) ? 'Y' : 'N',
        tel: (findFlag('tel') || findFlag('phone') || channels.includes('tel') || channels.includes('phone')) ? 'Y' : 'N'
    };
}

// Scenario 1: Root mktChannelYN (Common)
console.log('Scenario 1 (Root Object):', testMapping({}, { sms: 'Y', push: 'Y', email: 'Y', tel: 'Y' }, {}));

// Scenario 2: req.body direct fields
console.log('Scenario 2 (Root Body):', testMapping({ mktSms: 'Y', mktPush: 'Y', mktEmail: 'Y', mktTel: 'Y' }, null, {}));

// Scenario 3: termsData channels array
console.log('Scenario 3 (Channels Array):', testMapping({}, null, { channels: ['sms', 'push', 'email', 'tel'] }));

// Scenario 4: Snake case
console.log('Scenario 4 (Snake Case):', testMapping({ mkt_sms_yn: 'Y' }, null, {}));

// Scenario 5: Boolean true
console.log('Scenario 5 (Boolean):', testMapping({}, { sms: true }, {}));

// Scenario 6: String true
console.log('Scenario 6 (String true):', testMapping({}, { sms: 'true' }, {}));
