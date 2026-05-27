import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Mood = 'Focus' | 'Confidence' | 'Discipline' | 'Peace' | 'Ambition' | 'Creativity';

type DailyEntry = {
  id: string;
  mood: Mood;
  title: string;
  quote: string;
  reflection: string;
  action: string;
  accent: string;
  soft: string;
};

const dailyEntries: DailyEntry[] = [
  {
    id: 'focus-one-thing',
    mood: 'Focus',
    title: 'One Thing',
    quote: 'Win the next hour. Let the day build from there.',
    reflection: 'Choose one task that would make the rest of today lighter.',
    action: 'Start one focused block',
    accent: '#56d6ff',
    soft: '#e6f8ff',
  },
  {
    id: 'confidence-proof',
    mood: 'Confidence',
    title: 'Proof',
    quote: 'Your confidence grows every time you keep a promise to yourself.',
    reflection: 'Name one small promise you can finish before tonight.',
    action: 'Keep the promise',
    accent: '#50d890',
    soft: '#e7f8ee',
  },
  {
    id: 'discipline-respect',
    mood: 'Discipline',
    title: 'Self Respect',
    quote: 'Discipline is self-respect in motion.',
    reflection: 'Do the thing that proves you are on your own side.',
    action: 'Move without bargaining',
    accent: '#e94c3d',
    soft: '#ffe9e6',
  },
  {
    id: 'peace-steady',
    mood: 'Peace',
    title: 'Steady',
    quote: 'A calm mind can still move with power.',
    reflection: 'Take one breath before you answer, decide, or react.',
    action: 'Slow the first move',
    accent: '#86a6ff',
    soft: '#edf1ff',
  },
  {
    id: 'ambition-energy',
    mood: 'Ambition',
    title: 'Energy',
    quote: 'Your future needs your attention more than your excuses.',
    reflection: 'Put ten honest minutes into the version of you that is waiting.',
    action: 'Invest ten minutes',
    accent: '#f3b233',
    soft: '#fff4d6',
  },
  {
    id: 'creativity-space',
    mood: 'Creativity',
    title: 'Make Space',
    quote: 'Creativity shows up when you make room for it.',
    reflection: 'Collect one image, line, color, or idea before it disappears.',
    action: 'Capture one spark',
    accent: '#c870ff',
    soft: '#f6e9ff',
  },
];

const moodOrder: Mood[] = [
  'Focus',
  'Confidence',
  'Discipline',
  'Peace',
  'Ambition',
  'Creativity',
];

function getTodayEntry() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86_400_000);

  return dailyEntries[dayOfYear % dailyEntries.length];
}

export default function App() {
  const todayEntry = useMemo(() => getTodayEntry(), []);
  const [selectedMood, setSelectedMood] = useState<Mood>(todayEntry.mood);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const activeEntry =
    dailyEntries.find((entry) => entry.mood === selectedMood) ?? todayEntry;
  const savedEntries = dailyEntries.filter((entry) => savedIds.includes(entry.id));
  const isTodaySaved = savedIds.includes(todayEntry.id);

  function toggleSaved(entryId: string) {
    setSavedIds((currentIds) =>
      currentIds.includes(entryId)
        ? currentIds.filter((id) => id !== entryId)
        : [...currentIds, entryId],
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>ARMOZE</Text>
            <Text style={styles.caption}>Daily motivation through art</Text>
          </View>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>A</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.kicker}>Today</Text>
          <Text style={styles.heroTitle}>Motivation you can carry.</Text>
          <Text style={styles.heroText}>
            Open Armoze for one quote, one reflection, and one visual reminder
            for the person you are becoming.
          </Text>
        </View>

        <View style={[styles.dailyCard, { borderLeftColor: todayEntry.accent }]}>
          <View style={styles.cardTopline}>
            <Text style={[styles.moodText, { color: todayEntry.accent }]}>
              {todayEntry.mood}
            </Text>
            <Text style={styles.dateText}>
              {new Intl.DateTimeFormat('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              }).format(new Date())}
            </Text>
          </View>
          <Text style={styles.quote}>{todayEntry.quote}</Text>
          <Text style={styles.reflection}>{todayEntry.reflection}</Text>
          <View style={styles.actionRow}>
            <Pressable
              style={[
                styles.primaryButton,
                { backgroundColor: isTodaySaved ? '#17613b' : '#101113' },
              ]}
              onPress={() => toggleSaved(todayEntry.id)}
            >
              <Text style={styles.primaryButtonText}>
                {isTodaySaved ? 'Saved' : 'Save'}
              </Text>
            </Pressable>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Wallpaper</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.phonePreview}>
          <View style={styles.phoneStatus}>
            <View style={styles.phoneSpeaker} />
            <View style={[styles.phoneDot, { backgroundColor: todayEntry.accent }]} />
          </View>
          <Text style={[styles.phoneMood, { color: todayEntry.accent }]}>
            {todayEntry.mood}
          </Text>
          <Text style={styles.phoneQuote}>{todayEntry.quote}</Text>
          <View style={[styles.phoneArt, { backgroundColor: todayEntry.accent }]}>
            <Text style={styles.phoneArtText}>ARMOZE</Text>
          </View>
          <Text style={[styles.phoneAction, { color: todayEntry.accent }]}>
            {todayEntry.action}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Moods</Text>
          <Text style={styles.sectionTitle}>Pick what you need.</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.moodRail}
          >
            {moodOrder.map((mood) => {
              const entry = dailyEntries.find((candidate) => candidate.mood === mood);
              const isSelected = selectedMood === mood;

              return (
                <Pressable
                  key={mood}
                  style={[
                    styles.moodPill,
                    isSelected && styles.moodPillActive,
                  ]}
                  onPress={() => setSelectedMood(mood)}
                >
                  <View
                    style={[
                      styles.moodDot,
                      { backgroundColor: entry?.accent ?? '#101113' },
                    ]}
                  />
                  <Text
                    style={[
                      styles.moodPillText,
                      isSelected && styles.moodPillTextActive,
                    ]}
                  >
                    {mood}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={[styles.moodCard, { backgroundColor: activeEntry.soft }]}>
          <Text style={[styles.moodText, { color: activeEntry.accent }]}>
            {activeEntry.title}
          </Text>
          <Text style={styles.moodQuote}>{activeEntry.quote}</Text>
          <Text style={styles.reflection}>{activeEntry.reflection}</Text>
          <Pressable
            style={styles.saveSmallButton}
            onPress={() => toggleSaved(activeEntry.id)}
          >
            <Text style={styles.saveSmallButtonText}>
              {savedIds.includes(activeEntry.id) ? 'Remove' : 'Save this'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Saved</Text>
          <Text style={styles.sectionTitle}>Your library.</Text>
          {savedEntries.length ? (
            savedEntries.map((entry) => (
              <View key={entry.id} style={styles.savedCard}>
                <View style={[styles.savedBar, { backgroundColor: entry.accent }]} />
                <View style={styles.savedCopy}>
                  <Text style={styles.savedMood}>{entry.mood}</Text>
                  <Text style={styles.savedQuote}>{entry.quote}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptySaved}>
              <Text style={styles.emptySavedText}>
                Save a quote and it will show up here.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.shopPreview}>
          <Text style={styles.sectionLabel}>Artwork later</Text>
          <Text style={styles.shopTitle}>Turn the best reminders into prints.</Text>
          <Text style={styles.shopText}>
            The first app should make people return daily. After that, the shop
            becomes natural: wallpapers, prints, originals, and limited drops.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f5ed',
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 34,
  },
  brand: {
    color: '#101113',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
  },
  caption: {
    color: '#66707a',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: '#101113',
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  brandMarkText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
  },
  hero: {
    marginBottom: 20,
  },
  kicker: {
    color: '#c89524',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#101113',
    fontSize: 52,
    fontWeight: '900',
    lineHeight: 50,
    textTransform: 'uppercase',
  },
  heroText: {
    color: '#5f6670',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    marginTop: 16,
  },
  dailyCard: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(16, 17, 19, 0.12)',
    borderLeftWidth: 6,
    borderRadius: 8,
    borderWidth: 1,
    padding: 20,
  },
  cardTopline: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  moodText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  dateText: {
    color: '#777f88',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  quote: {
    color: '#101113',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 31,
    textTransform: 'uppercase',
  },
  reflection: {
    color: '#66707a',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 23,
    marginTop: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#101113',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryButtonText: {
    color: '#101113',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  phonePreview: {
    alignSelf: 'center',
    aspectRatio: 9 / 16,
    backgroundColor: '#101113',
    borderColor: '#101113',
    borderRadius: 36,
    borderWidth: 8,
    justifyContent: 'space-between',
    marginTop: 22,
    padding: 22,
    width: '82%',
  },
  phoneStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  phoneSpeaker: {
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
    borderRadius: 99,
    height: 6,
    width: 54,
  },
  phoneDot: {
    borderRadius: 99,
    height: 9,
    width: 9,
  },
  phoneMood: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  phoneQuote: {
    color: '#ffffff',
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 26,
    textTransform: 'uppercase',
  },
  phoneArt: {
    alignItems: 'center',
    aspectRatio: 1,
    justifyContent: 'center',
  },
  phoneArtText: {
    color: '#101113',
    fontSize: 18,
    fontWeight: '900',
  },
  phoneAction: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  section: {
    marginTop: 30,
  },
  sectionLabel: {
    color: '#c89524',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: '#101113',
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 35,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  moodRail: {
    gap: 8,
    paddingRight: 20,
  },
  moodPill: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: 'rgba(16, 17, 19, 0.13)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 14,
  },
  moodPillActive: {
    backgroundColor: '#101113',
    borderColor: '#101113',
  },
  moodDot: {
    borderRadius: 99,
    height: 10,
    width: 10,
  },
  moodPillText: {
    color: '#101113',
    fontSize: 13,
    fontWeight: '900',
  },
  moodPillTextActive: {
    color: '#ffffff',
  },
  moodCard: {
    borderRadius: 8,
    marginTop: 18,
    padding: 20,
  },
  moodQuote: {
    color: '#101113',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 29,
    marginTop: 12,
    textTransform: 'uppercase',
  },
  saveSmallButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#101113',
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 42,
    paddingHorizontal: 16,
  },
  saveSmallButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  savedCard: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(16, 17, 19, 0.12)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    overflow: 'hidden',
  },
  savedBar: {
    width: 6,
  },
  savedCopy: {
    flex: 1,
    padding: 16,
  },
  savedMood: {
    color: '#66707a',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  savedQuote: {
    color: '#101113',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21,
  },
  emptySaved: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(16, 17, 19, 0.12)',
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
  },
  emptySavedText: {
    color: '#66707a',
    fontSize: 15,
    fontWeight: '700',
  },
  shopPreview: {
    backgroundColor: '#101113',
    borderRadius: 8,
    marginTop: 30,
    padding: 22,
  },
  shopTitle: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 31,
    textTransform: 'uppercase',
  },
  shopText: {
    color: '#c9c0b1',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 23,
    marginTop: 12,
  },
});
