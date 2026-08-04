import React from 'react';
import { StyleSheet, View, SafeAreaView, Linking, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const onShouldStartLoadWithRequest = (request) => {
    const { url } = request;

    // 1. 일반 웹 페이지는 로드 허용
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return true;
    }

    // 2. 안드로이드 Intent 스킴 처리
    if (url.startsWith('intent:') || url.startsWith('intent://')) {
      try {
        const intentUrl = url;
        let customUrl = intentUrl;
        
        const schemeMatch = intentUrl.match(/scheme=([^;]+)/);
        if (schemeMatch) {
          const scheme = schemeMatch[1];
          const path = intentUrl.replace(/^intent:\/\//i, '').replace(/^intent:/i, '').split('#')[0];
          customUrl = `${scheme}://${path}`;
        } else {
          // scheme= 파라미터가 없는 경우 (예: intent:hdcardappcardansimclick://...)
          customUrl = intentUrl.replace(/^intent:\/\//i, '').replace(/^intent:/i, '').split('#')[0];
        }

        Linking.openURL(customUrl).catch(() => {
          const packageMatch = intentUrl.match(/package=([^;]+)/);
          const fallbackMatch = intentUrl.match(/S.browser_fallback_url=([^;]+)/);
          
          if (fallbackMatch) {
            Linking.openURL(decodeURIComponent(fallbackMatch[1]));
          } else if (packageMatch) {
            Linking.openURL(`market://details?id=${packageMatch[1]}`);
          } else {
            Alert.alert('알림', '해당 앱을 찾을 수 없습니다. 스토어에서 설치해주세요.');
          }
        });
        return false; // 웹뷰 내 이동 중단
      } catch (e) {
        console.error('Intent parsing error:', e);
        return false;
      }
    }

    // 3. iOS 등 기타 커스텀 스킴 (ispmobile://, kbbank:// 등)
    Linking.openURL(url).catch(() => {
      Alert.alert('알림', '해당 결제 앱이 설치되어 있지 않습니다.');
    });

    return false; // 외부 스킴은 웹뷰에서 로드하지 않음
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <WebView 
          source={{ uri: 'https://bustaams.cafe24.com/app' }} 
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          originWhitelist={['*']}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});
