// 记录类型：支出或收入
export type RecordType = 'expense' | 'income'

// 收支记录
export interface RecordItem {
  id?: number
  type: RecordType
  amount: number
  category_l1: string
  category_l2: string
  date: string
  note?: string
  created_at?: string
}

// 统计数据
export interface CategoryStat {
  category: string
  total: number
  count: number
  percentage: number
}

export interface MonthlyStats {
  month?: string
  year?: string
  totalExpense: number
  totalIncome: number
  expenseCount: number
  incomeCount: number
  byExpenseCategory: CategoryStat[]
  byIncomeCategory: CategoryStat[]
}

// 页面 Tab
export type TabKey = 'add' | 'list' | 'stats'

// 旧类型别名（向后兼容）
export type Expense = RecordItem

// 用户自定义分类
export interface CustomCategory {
  id: string
  type: RecordType
  icon: string
  name: string
  children: { name: string }[]
}
