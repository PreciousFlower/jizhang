import type { RecordItem, CustomCategory, CategoryStat, MonthlyStats, RecordType } from '../types'

const STORAGE_KEY = 'heimajizhang_records'
const CUSTOM_CAT_KEY = 'heimajizhang_custom_categories'

function readAll(): RecordItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeAll(data: RecordItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function getNextId(data: RecordItem[]): number {
  if (data.length === 0) return 1
  return Math.max(...data.map((e) => e.id || 0)) + 1
}

// 获取所有记录（支持年/月筛选）
export function getAllRecords(year?: string, month?: string): RecordItem[] {
  const all = readAll()
  let filtered = all

  if (year) {
    filtered = filtered.filter((r) => r.date.startsWith(year))
  }
  if (month) {
    filtered = filtered.filter((r) => r.date.startsWith(month))
  }

  return filtered.sort((a, b) => b.date.localeCompare(a.date) || b.id! - a.id!)
}

// 新增记录
export function addRecord(params: {
  type: RecordType
  amount: number
  category_l1: string
  category_l2: string
  date: string
  note?: string
}): { success: boolean; id?: number } {
  try {
    const all = readAll()
    const id = getNextId(all)
    const newRecord: RecordItem = {
      id,
      type: params.type,
      amount: params.amount,
      category_l1: params.category_l1,
      category_l2: params.category_l2,
      date: params.date,
      note: params.note || '',
      created_at: new Date().toLocaleString('zh-CN'),
    }
    all.push(newRecord)
    writeAll(all)
    return { success: true, id }
  } catch {
    return { success: false }
  }
}

// 更新记录
export function updateRecord(params: {
  id: number
  type: RecordType
  amount: number
  category_l1: string
  category_l2: string
  date: string
  note?: string
}): { success: boolean } {
  try {
    const all = readAll()
    const idx = all.findIndex((r) => r.id === params.id)
    if (idx === -1) return { success: false }
    all[idx] = {
      ...all[idx],
      type: params.type,
      amount: params.amount,
      category_l1: params.category_l1,
      category_l2: params.category_l2,
      date: params.date,
      note: params.note || '',
    }
    writeAll(all)
    return { success: true }
  } catch {
    return { success: false }
  }
}

// 删除记录
export function deleteRecord(id: number): { success: boolean } {
  try {
    const all = readAll()
    writeAll(all.filter((r) => r.id !== id))
    return { success: true }
  } catch {
    return { success: false }
  }
}

// 获取统计数据（支持年/月筛选）
export function getStats(year?: string, month?: string): MonthlyStats | null {
  try {
    const all = readAll()
    let records = all

    if (year) {
      records = records.filter((r) => r.date.startsWith(year))
    }
    if (month) {
      records = records.filter((r) => r.date.startsWith(month))
    }

    if (records.length === 0) return null

    const expenses = records.filter((r) => r.type === 'expense')
    const incomes = records.filter((r) => r.type === 'income')

    // 按分类统计
    function calcByCategory(items: RecordItem[]): CategoryStat[] {
      const map = new Map<string, { total: number; count: number }>()
      items.forEach((r) => {
        const existing = map.get(r.category_l1) || { total: 0, count: 0 }
        existing.total += r.amount
        existing.count += 1
        map.set(r.category_l1, existing)
      })
      const result: CategoryStat[] = []
      map.forEach((v, k) => {
        result.push({ category: k, total: Math.round(v.total * 100) / 100, count: v.count, percentage: 0 })
      })
      result.sort((a, b) => b.total - a.total)
      return result
    }

    const byExpenseCategory = calcByCategory(expenses)
    const byIncomeCategory = calcByCategory(incomes)

    const totalExpense = byExpenseCategory.reduce((s, c) => s + c.total, 0)
    const totalIncome = byIncomeCategory.reduce((s, c) => s + c.total, 0)

    // 计算百分比
    function addPercent(list: CategoryStat[], total: number) {
      list.forEach((c) => {
        c.percentage = total > 0 ? Math.round((c.total / total) * 10000) / 100 : 0
      })
    }
    addPercent(byExpenseCategory, totalExpense)
    addPercent(byIncomeCategory, totalIncome)

    return {
      month,
      year,
      totalExpense: Math.round(totalExpense * 100) / 100,
      totalIncome: Math.round(totalIncome * 100) / 100,
      expenseCount: expenses.length,
      incomeCount: incomes.length,
      byExpenseCategory,
      byIncomeCategory,
    }
  } catch {
    return null
  }
}

// ==================== 自定义分类 CRUD ====================

export function getCustomCategories(): CustomCategory[] {
  try {
    const raw = localStorage.getItem(CUSTOM_CAT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveCustomCategories(data: CustomCategory[]): void {
  localStorage.setItem(CUSTOM_CAT_KEY, JSON.stringify(data))
}

export function addCustomCategory(cat: Omit<CustomCategory, 'id'>): { success: boolean; id?: string; error?: string } {
  try {
    const all = getCustomCategories()
    // 检查同类型下是否重名
    if (all.some((c) => c.type === cat.type && c.name === cat.name)) {
      return { success: false, error: '该分类名已存在' }
    }
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const newCat: CustomCategory = { id, ...cat }
    all.push(newCat)
    saveCustomCategories(all)
    return { success: true, id }
  } catch {
    return { success: false, error: '保存失败' }
  }
}

export function updateCustomCategory(id: string, cat: Omit<CustomCategory, 'id'>): { success: boolean; error?: string } {
  try {
    const all = getCustomCategories()
    const idx = all.findIndex((c) => c.id === id)
    if (idx === -1) return { success: false, error: '分类不存在' }
    // 检查同类型下是否与其他分类重名
    if (all.some((c) => c.id !== id && c.type === cat.type && c.name === cat.name)) {
      return { success: false, error: '该分类名已存在' }
    }
    all[idx] = { id, ...cat }
    saveCustomCategories(all)
    return { success: true }
  } catch {
    return { success: false, error: '保存失败' }
  }
}

export function deleteCustomCategory(id: string): { success: boolean } {
  try {
    const all = getCustomCategories()
    saveCustomCategories(all.filter((c) => c.id !== id))
    return { success: true }
  } catch {
    return { success: false }
  }
}

// 获取可用年份列表
export function getAvailableYears(): string[] {
  const all = readAll()
  const years = new Set<string>()
  all.forEach((r) => {
    const y = r.date.substring(0, 4)
    years.add(y)
  })
  // 确保包含今年
  const thisYear = new Date().getFullYear().toString()
  years.add(thisYear)
  return Array.from(years).sort().reverse()
}
