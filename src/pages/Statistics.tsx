import { useState, useEffect, useCallback } from 'react'
import { Card, Segmented, Spin, Empty, Select } from 'antd'
import * as echarts from 'echarts'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { getCategoryIcon } from '../constants/categories'
import { getStats, getAvailableYears } from '../database'
import type { MonthlyStats, RecordType } from '../types'

interface Props {
  refreshKey: number
}

export default function Statistics({ refreshKey }: Props) {
  const [stats, setStats] = useState<MonthlyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statType, setStatType] = useState<RecordType>('expense')
  const [selectedYear, setSelectedYear] = useState(dayjs().format('YYYY'))
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

  const years = getAvailableYears()
  if (!years.includes(dayjs().format('YYYY'))) {
    years.unshift(dayjs().format('YYYY'))
  }

  // 月份选项
  const monthOptions = [
    { label: '全年', value: '' },
    ...Array.from({ length: 12 }, (_, i) => ({
      label: `${i + 1}月`,
      value: `${selectedYear}-${String(i + 1).padStart(2, '0')}`,
    })),
  ]

  const loadStats = useCallback(() => {
    setLoading(true)
    const data = getStats(selectedYear, selectedMonth || undefined)
    setStats(data)
    setLoading(false)
  }, [selectedYear, selectedMonth])

  useEffect(() => {
    loadStats()
  }, [loadStats, refreshKey])

  useEffect(() => {
    setSelectedMonth(null)
  }, [selectedYear])

  const isExpense = statType === 'expense'
  const categoryData = isExpense ? stats?.byExpenseCategory : stats?.byIncomeCategory
  const totalAmount = isExpense ? stats?.totalExpense : stats?.totalIncome
  const totalCount = isExpense ? stats?.expenseCount : stats?.incomeCount

  // 饼图
  const pieOption = {
    tooltip: { trigger: 'item' as const, formatter: '{b}: ¥{c} ({d}%)' },
    legend: { bottom: 0, type: 'scroll' as const },
    series: [{
      name: isExpense ? '支出分类' : '收入分类',
      type: 'pie',
      radius: ['45%', '75%'],
      center: ['50%', '45%'],
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{d}%' },
      data: (categoryData || []).map((c) => ({ name: c.category, value: c.total })),
      emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
    }],
  }

  // 柱状图
  const barOption = {
    tooltip: { trigger: 'axis' as const, formatter: '{b}: ¥{c}' },
    xAxis: {
      type: 'category' as const,
      data: (categoryData || []).map((c) => c.category),
      axisLabel: { rotate: 30, fontSize: 11 },
    },
    yAxis: { type: 'value' as const, name: '元' },
    series: [{
      name: '金额',
      type: 'bar',
      data: (categoryData || []).map((c) => ({
        value: c.total,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: isExpense ? '#ff7875' : '#73d13d' },
            { offset: 1, color: isExpense ? '#ff4d4f' : '#52c41a' },
          ]),
          borderRadius: [6, 6, 0, 0],
        },
      })),
      barWidth: '50%',
    }],
    grid: { bottom: '15%', top: '5%' },
  }

  const hasData = stats && ((isExpense ? stats.totalExpense : stats.totalIncome) > 0)

  return (
    <div>
      {/* 筛选栏 */}
      <Card className="page-card" styles={{ body: { padding: '12px 16px' } }}>
        {/* 年份 */}
        <div style={{ marginBottom: 12 }}>
          <Select
            style={{ width: '100%' }}
            size="large"
            value={selectedYear}
            onChange={(val) => setSelectedYear(val)}
            options={years.map((y) => ({ value: y, label: `${y}年` }))}
          />
        </div>

        {/* 月份 */}
        <div style={{ overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: 4, marginBottom: 12 }}>
          <Segmented
            size="large"
            value={selectedMonth || ''}
            onChange={(val) => setSelectedMonth(val as string || null)}
            options={monthOptions}
          />
        </div>

        {/* 收支切换 */}
        <Segmented
          block
          size="large"
          value={statType}
          onChange={(val) => setStatType(val as RecordType)}
          options={[
            { label: '📊 支出分析', value: 'expense' },
            { label: '💰 收入分析', value: 'income' },
          ]}
        />
      </Card>

      <Spin spinning={loading}>
        {!hasData ? (
          <Card className="page-card">
            <Empty description={isExpense ? '暂无支出数据' : '暂无收入数据'} />
          </Card>
        ) : (
          <>
            {/* 概览 */}
            <Card className="page-card">
              <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: '#666' }}>{isExpense ? '总支出' : '总收入'}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: isExpense ? '#ff4d4f' : '#52c41a' }}>
                    ¥{totalAmount!.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#666' }}>笔数</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#1677ff' }}>
                    {totalCount}笔
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#666' }}>占比</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#faad14' }}>
                    {stats && (stats.totalExpense + stats.totalIncome) > 0
                      ? Math.round(totalAmount! / (stats.totalExpense + stats.totalIncome) * 100)
                      : 0}%
                  </div>
                </div>
              </div>
              {/* 收支对比条 */}
              {stats && (stats.totalExpense + stats.totalIncome) > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#999', marginBottom: 4 }}>
                    <span>支出 ¥{stats.totalExpense.toFixed(2)}</span>
                    <span>收入 ¥{stats.totalIncome.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: '#f0f0f0' }}>
                    <div style={{
                      width: `${(stats.totalExpense + stats.totalIncome) > 0 ? (stats.totalExpense / (stats.totalExpense + stats.totalIncome)) * 100 : 0}%`,
                      background: '#ff4d4f', transition: 'width 0.3s',
                    }} />
                    <div style={{
                      width: `${(stats.totalExpense + stats.totalIncome) > 0 ? (stats.totalIncome / (stats.totalExpense + stats.totalIncome)) * 100 : 0}%`,
                      background: '#52c41a', transition: 'width 0.3s',
                    }} />
                  </div>
                </div>
              )}
            </Card>

            {/* 饼图 */}
            <Card className="page-card" title={isExpense ? '📊 支出分布' : '💰 收入分布'}>
              <ReactECharts option={pieOption} style={{ height: 300 }} />
            </Card>

            {/* 柱状图 */}
            <Card className="page-card" title="📈 分类排行">
              <ReactECharts option={barOption} style={{ height: 280 }} />
            </Card>

            {/* 分类明细 */}
            <Card className="page-card" title="📋 分类明细">
              {(categoryData || []).map((c) => (
                <div key={c.category} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid #f0f0f0',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{getCategoryIcon(c.category, statType)}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{c.category}</div>
                      <div style={{ fontSize: 12, color: '#999' }}>{c.count} 笔</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>¥{c.total.toFixed(2)}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>{c.percentage}%</div>
                  </div>
                </div>
              ))}
            </Card>
          </>
        )}
      </Spin>
    </div>
  )
}
