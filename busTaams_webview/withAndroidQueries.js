const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAndroidQueries(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;

    // <queries> 태그가 없으면 생성
    if (!androidManifest.queries) {
      androidManifest.queries = [];
    }

    // 인텐트 스킴들 추가 (한국 주요 카드사 및 은행)
    const schemes = [
      'kftc-bankpay', 'ispmobile', 'itms-apps', 'hdcardappcardansimclick', 'smhyundaiansimclick',
      'shinhan-sr-ansimclick', 'smshinhanansimclick', 'kb-acp', 'mpocket.online.pay', 'ansimclickscard',
      'ansimclickipcollect', 'vguardstart', 'samsungpay', 'scardcertiapp', 'lottesmartpay', 'lotteappcard',
      'cloudpay', 'nhappcardansimclick', 'nonghyupcardansimclick', 'citispay', 'citicardappkr',
      'citimobileapp', 'kakaotalk', 'payco', 'lpayapp', 'hanamopmoasign', 'wooripay', 'nhallonepayansimclick',
      'hanawalletmembers', 'chaipayment', 'kb-auth', 'hyundaicardappcardid', 'com.wooricard.wcard',
      'lmslpay', 'lguthepay-xpay', 'liivbank', 'supertoss', 'newsmartpib'
    ];

    // 기존 queries에 intent가 없다면 배열 추가
    if (!androidManifest.queries[0]) {
      androidManifest.queries[0] = { intent: [] };
    } else if (!androidManifest.queries[0].intent) {
      androidManifest.queries[0].intent = [];
    }

    const existingSchemes = new Set(
      androidManifest.queries[0].intent
        .map(i => i?.action?.[0]?.['$']?.['android:name'] === 'android.intent.action.VIEW' && i?.data?.[0]?.['$']?.['android:scheme'])
        .filter(Boolean)
    );

    schemes.forEach(scheme => {
      if (!existingSchemes.has(scheme)) {
        androidManifest.queries[0].intent.push({
          action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
          data: [{ $: { 'android:scheme': scheme } }]
        });
      }
    });

    return config;
  });
};
