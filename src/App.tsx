import { useState } from 'react'
import { ConfigProvider, theme } from 'antd'
import { EditOutlined, UnorderedListOutlined, PieChartOutlined, SettingOutlined } from '@ant-design/icons'
import type { TabKey } from './types'
import AddExpense from './pages/AddExpense'
import ExpenseList from './pages/ExpenseList'
import Statistics from './pages/Statistics'
import CategoryDrawer from './pages/CategoryDrawer'
import zhCN from 'antd/locale/zh_CN'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('add')
  const [refreshKey, setRefreshKey] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const triggerRefresh = () => setRefreshKey((k) => k + 1)

  const tabs = [
    { key: 'add' as TabKey, label: '记一笔', icon: <EditOutlined /> },
    { key: 'list' as TabKey, label: '明细', icon: <UnorderedListOutlined /> },
    { key: 'stats' as TabKey, label: '统计', icon: <PieChartOutlined /> },
  ]

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
        },
      }}
    >
      <div className="app-container">
        {/* 顶部标题栏 */}
        <header className="app-header">
          <h1 className="app-title">🐴 黑马记账</h1>
          <SettingOutlined className="header-gear" onClick={() => setDrawerOpen(true)} />
        </header>

        {/* 页面内容 */}
        <main className="app-content">
          {activeTab === 'add' && <AddExpense onSuccess={triggerRefresh} />}
          {activeTab === 'list' && <ExpenseList refreshKey={refreshKey} />}
          {activeTab === 'stats' && <Statistics refreshKey={refreshKey} />}
        </main>

        {/* 底部导航栏 */}
        <nav className="app-tabbar">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`tabbar-item ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="tabbar-icon">{tab.icon}</span>
              <span className="tabbar-label">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* 分类管理抽屉 */}
        <CategoryDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onChanged={triggerRefresh}
        />
      </div>
    </ConfigProvider>
  )
}

export default App
