'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface PlatformData {
  platform:  string
  followers: number
  color:     string
}

export default function FollowersPieChart() {
  const [data, setData] = useState<PlatformData[]>([])

  useEffect(() => {
    fetch('/api/followers').then(r => r.json()).then(setData)
  }, [])

  if (!data.length) return <p className="text-xs text-muted">Loading...</p>

  const total = data.reduce((s, d) => s + d.followers, 0)

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="followers"
            nameKey="platform"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
          >
            {data.map((entry) => (
              <Cell key={entry.platform} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [Number(value).toLocaleString(), 'Followers']}
            contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6 }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend
            formatter={(value) => <span style={{ color: '#aaa', fontSize: 12 }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-center text-xs text-muted mt-1">{total.toLocaleString()} total followers</p>
    </div>
  )
}
