import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, font } from '../theme';

// Placeholder boot screen; real routes arrive with T3-02 (auth) and T3-03 (home).
export default function Boot() {
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ color: '#fff', fontFamily: font.bold, fontSize: 32 }}>{t('app.name')}</Text>
      <Text style={{ color: colors.orange, fontFamily: font.regular, fontSize: 16, marginTop: 8 }}>{t('app.tagline')}</Text>
    </View>
  );
}
