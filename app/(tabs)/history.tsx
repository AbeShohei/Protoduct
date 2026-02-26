import { useAuth } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Clock, Coins, Calendar, TrendingUp } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { api } from '@/convex/_generated/api';

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

function getDateLabel(timestamp: number): string {
  const date = new Date(timestamp);
  if (isToday(date)) return '今日';
  if (isYesterday(date)) return '昨日';
  return format(date, 'M月d日 (E)', { locale: ja });
}

interface Session {
  _id: string;
  projectName: string;
  startTime: number;
  endTime?: number;
  tokensInput?: number;
  tokensOutput?: number;
  status: string;
}

export default function HistoryScreen() {
  const { userId } = useAuth();
  const sessions = useQuery(api.sessions.list, { userId: userId || '', limit: 100 });

  // Calculate totals
  const completedSessions = sessions?.filter((s) => s.status === 'completed') || [];
  const totalSeconds = completedSessions.reduce((acc, s) => {
    if (s.endTime) return acc + Math.floor((s.endTime - s.startTime) / 1000);
    return acc;
  }, 0);
  const totalInputTokens = completedSessions.reduce((acc, s) => acc + (s.tokensInput || 0), 0);
  const totalOutputTokens = completedSessions.reduce((acc, s) => acc + (s.tokensOutput || 0), 0);
  const totalSessions = completedSessions.length;

  // Group sessions by date
  const groupedSessions: { [key: string]: Session[] } = {};
  completedSessions.forEach((session) => {
    const dateKey = format(session.startTime, 'yyyy-MM-dd');
    if (!groupedSessions[dateKey]) {
      groupedSessions[dateKey] = [];
    }
    groupedSessions[dateKey].push(session);
  });

  // Sort dates in descending order
  const sortedDates = Object.keys(groupedSessions).sort((a, b) => b.localeCompare(a));

  if (!sessions) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>作業履歴</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.empty}>読み込み中...</Text>
        </View>
      </View>
    );
  }

  if (sessions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>作業履歴</Text>
        </View>
        <View style={styles.emptyState}>
          <Calendar size={48} color="#cbd5e1" />
          <Text style={styles.empty}>まだ履歴がありません</Text>
          <Text style={styles.emptySub}>作業を開始すると履歴が表示されます</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>作業履歴</Text>
        <Text style={styles.subtitle}>あなたの開発記録</Text>
      </View>

      {/* STATS */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Clock size={20} color="#22c55e" />
          <Text style={styles.statValue}>{formatDuration(totalSeconds)}</Text>
          <Text style={styles.statLabel}>総作業時間</Text>
        </View>
        <View style={styles.statCard}>
          <TrendingUp size={20} color="#3b82f6" />
          <Text style={styles.statValue}>{totalSessions}</Text>
          <Text style={styles.statLabel}>セッション数</Text>
        </View>
        <View style={styles.statCard}>
          <Coins size={20} color="#f59e0b" />
          <Text style={styles.statValue}>{formatNumber(totalInputTokens + totalOutputTokens)}</Text>
          <Text style={styles.statLabel}>総トークン</Text>
        </View>
      </View>

      {/* SESSIONS BY DATE */}
      {sortedDates.map((dateKey, dateIndex) => {
        const daySessions = groupedSessions[dateKey];
        const dayTotalSeconds = daySessions.reduce((acc, s) => {
          if (s.endTime) return acc + Math.floor((s.endTime - s.startTime) / 1000);
          return acc;
        }, 0);
        const dayTotalTokens = daySessions.reduce(
          (acc, s) => acc + (s.tokensInput || 0) + (s.tokensOutput || 0),
          0,
        );

        return (
          <Animated.View
            key={dateKey}
            entering={FadeInDown.duration(400).delay(dateIndex * 100)}
            style={styles.dateGroup}
          >
            <View style={styles.dateHeader}>
              <Text style={styles.dateLabel}>{getDateLabel(daySessions[0].startTime)}</Text>
              <View style={styles.dateSummary}>
                <Clock size={12} color="#94a3b8" />
                <Text style={styles.dateSummaryText}>{formatDuration(dayTotalSeconds)}</Text>
                <Text style={styles.dateSeparator}>·</Text>
                <Text style={styles.dateSummaryText}>{daySessions.length}件</Text>
              </View>
            </View>

            <View style={styles.sessionList}>
              {daySessions.map((session, sessionIndex) => {
                const duration = session.endTime
                  ? Math.floor((session.endTime - session.startTime) / 1000)
                  : 0;

                return (
                  <View
                    key={session._id}
                    style={[styles.sessionCard, sessionIndex === 0 && styles.sessionCardFirst]}
                  >
                    <View style={styles.sessionHeader}>
                      <View style={styles.projectBadge}>
                        <View style={styles.badgeDot} />
                        <Text style={styles.projectName}>{session.projectName}</Text>
                      </View>
                      <Text style={styles.sessionTime}>
                        {format(session.startTime, 'HH:mm')} -{' '}
                        {session.endTime ? format(session.endTime, 'HH:mm') : '...'}
                      </Text>
                    </View>

                    <View style={styles.sessionDetails}>
                      <View style={styles.detailItem}>
                        <Clock size={14} color="#64748b" />
                        <Text style={styles.detailText}>{formatDuration(duration)}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Coins size={14} color="#f59e0b" />
                        <Text style={styles.detailText}>
                          {formatNumber(session.tokensInput || 0)} /{' '}
                          {formatNumber(session.tokensOutput || 0)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        );
      })}

      {completedSessions.length === 0 && (
        <View style={styles.noCompletedState}>
          <Text style={styles.noCompletedText}>完了したセッションがありません</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '600',
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  dateSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateSummaryText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  dateSeparator: {
    color: '#cbd5e1',
    marginHorizontal: 4,
  },
  sessionList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sessionCardFirst: {
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  projectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  projectName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  sessionTime: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  sessionDetails: {
    flexDirection: 'row',
    gap: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  empty: {
    fontSize: 18,
    color: '#94a3b8',
    fontWeight: '600',
  },
  emptySub: {
    fontSize: 14,
    color: '#cbd5e1',
  },
  noCompletedState: {
    padding: 40,
    alignItems: 'center',
  },
  noCompletedText: {
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '500',
  },
});
