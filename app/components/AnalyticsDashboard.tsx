'use client'

import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import { useEmailTracking } from '@/app/hooks/useEmailTracking'
import ExportToCSV from './ExportToCSV'

const ACCENT  = '#00C4CC'
const COLORS  = ['#00C4CC', '#22c55e', '#3b82f6', '#a855f7']

function StatCard({
  label, value, sub, color,
}: {
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  return (
    <div className="bg-surface border border-[#1e1e2e] rounded-2xl p-5">
      <p className="text-[11px] text-gray-600 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color ?? 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  )
}

export default function AnalyticsDashboard() {
  const {
    total, opened, clicked, replied,
    sendsPerDay,
    getOpenRate, getClickRate, getResponseRate,
    isLoading, exportCSV,
  } = useEmailTracking()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const barData = [
    { name: 'Gönderildi', value: total,   fill: COLORS[0] },
    { name: 'Açıldı',     value: opened,  fill: COLORS[1] },
    { name: 'Tıklandı',   value: clicked, fill: COLORS[2] },
    { name: 'Yanıtlandı', value: replied, fill: COLORS[3] },
  ]

  const pieData = [
    { name: 'Yanıtlandı', value: replied },
    { name: 'Açıldı (yanıt yok)', value: Math.max(opened - replied, 0) },
    { name: 'Açılmadı', value: Math.max(total - opened, 0) },
  ].filter(d => d.value > 0)

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-white text-lg">Email Analitiği</h1>
          <p className="text-xs text-gray-600 mt-0.5">Tüm zamanlar · {total} email</p>
        </div>
        <ExportToCSV onExport={exportCSV} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Toplam Gönderildi" value={total} />
        <StatCard
          label="Açılma Oranı"
          value={`%${getOpenRate()}`}
          sub={`${opened} / ${total} email`}
          color="text-green-400"
        />
        <StatCard
          label="Tıklama Oranı"
          value={`%${getClickRate()}`}
          sub={`${clicked} / ${total} email`}
          color="text-blue-400"
        />
        <StatCard
          label="Yanıt Oranı"
          value={`%${getResponseRate()}`}
          sub={`${replied} / ${total} email`}
          color="text-purple-400"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Line chart — sends over time */}
        <div className="bg-surface border border-[#1e1e2e] rounded-2xl p-5">
          <p className="text-xs font-medium text-white mb-4">Günlük Gönderim</p>
          {sendsPerDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={sendsPerDay} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  tickFormatter={d => d.slice(5)} // MM-DD
                />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#0f0f13', border: '1px solid #2a2a3e', borderRadius: 8 }}
                  labelStyle={{ color: '#9ca3af' }}
                  itemStyle={{ color: ACCENT }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Gönderim"
                  stroke={ACCENT}
                  strokeWidth={2}
                  dot={{ fill: ACCENT, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-700 text-sm">
              Henüz veri yok
            </div>
          )}
        </div>

        {/* Bar chart — funnel */}
        <div className="bg-surface border border-[#1e1e2e] rounded-2xl p-5">
          <p className="text-xs font-medium text-white mb-4">Email Hunisi</p>
          {total > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#0f0f13', border: '1px solid #2a2a3e', borderRadius: 8 }}
                  labelStyle={{ color: '#9ca3af' }}
                  cursor={{ fill: '#1a1a28' }}
                />
                <Bar dataKey="value" name="Sayı" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-700 text-sm">
              Henüz veri yok
            </div>
          )}
        </div>
      </div>

      {/* Pie chart — response breakdown */}
      {total > 0 && (
        <div className="bg-surface border border-[#1e1e2e] rounded-2xl p-5 md:w-1/2">
          <p className="text-xs font-medium text-white mb-4">Yanıt Dağılımı</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="45%"
                outerRadius={75}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name}: %${Math.round((percent ?? 0) * 100)}`
                }
                labelLine={false}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#0f0f13', border: '1px solid #2a2a3e', borderRadius: 8 }}
                itemStyle={{ color: '#e5e7eb' }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: '#6b7280', paddingTop: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Conversion funnel text */}
      {total > 0 && (
        <div className="bg-surface border border-[#1e1e2e] rounded-2xl p-5">
          <p className="text-xs font-medium text-white mb-4">Dönüşüm Hunisi</p>
          <div className="space-y-2.5">
            {[
              { label: 'Gönderilen → Açıldı',    pct: getOpenRate(),      from: total,  to: opened  },
              { label: 'Açıldı → Tıklandı',      pct: opened > 0 ? Math.round((clicked / opened) * 100) : 0, from: opened, to: clicked },
              { label: 'Tıklandı → Yanıtlandı',  pct: clicked > 0 ? Math.round((replied / clicked) * 100) : 0, from: clicked, to: replied },
            ].map(step => (
              <div key={step.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{step.label}</span>
                  <span className="text-white tabular-nums">{step.to} / {step.from} · <span className="text-accent">%{step.pct}</span></span>
                </div>
                <div className="h-1.5 bg-[#1e1e2e] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(step.pct, step.pct > 0 ? 2 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
