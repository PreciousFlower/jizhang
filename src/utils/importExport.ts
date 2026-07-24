import * as XLSX from 'xlsx'
import { addRecord, getAllRecords, getCustomCategories } from '../database'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/categories'
import type { RecordItem } from '../types'

// ==================== 常量 ====================

const HEADERS = ['类型', '金额', '一级分类', '二级分类', '日期', '备注']

// 构建合法分类映射（预设 + 自定义）
function buildValidCategories(): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  // 支出预设分类
  EXPENSE_CATEGORIES.forEach((cat) => {
    map.set(cat.name, new Set(cat.children.map((c) => c.name)))
  })
  // 收入预设分类
  INCOME_CATEGORIES.forEach((cat) => {
    if (map.has(cat.name)) {
      const existing = map.get(cat.name)!
      cat.children.forEach((c) => existing.add(c.name))
    } else {
      map.set(cat.name, new Set(cat.children.map((c) => c.name)))
    }
  })
  // 自定义分类
  getCustomCategories().forEach((cat) => {
    if (map.has(cat.name)) {
      const existing = map.get(cat.name)!
      cat.children.forEach((c) => existing.add(c.name))
    } else {
      map.set(cat.name, new Set(cat.children.map((c) => c.name)))
    }
  })
  return map
}

// 构建类型→一级分类映射（预设 + 自定义）
function buildTypeToCategories(): Map<string, Set<string>> {
  const expenseL1 = new Set(EXPENSE_CATEGORIES.map((c) => c.name))
  const incomeL1 = new Set(INCOME_CATEGORIES.map((c) => c.name))
  // 自定义分类
  getCustomCategories().forEach((cat) => {
    if (cat.type === 'expense') {
      expenseL1.add(cat.name)
    } else {
      incomeL1.add(cat.name)
    }
  })
  const map = new Map<string, Set<string>>()
  map.set('支出', expenseL1)
  map.set('收入', incomeL1)
  return map
}

// 获取所有分类参考行（预设 + 自定义，用于导出模板）
function buildCategoryRefRows(): { 类型: string; 一级分类: string; 二级分类: string }[] {
  const rows: { 类型: string; 一级分类: string; 二级分类: string }[] = []
  EXPENSE_CATEGORIES.forEach((cat) => {
    cat.children.forEach((sub) => {
      rows.push({ 类型: '支出', 一级分类: cat.name, 二级分类: sub.name })
    })
  })
  INCOME_CATEGORIES.forEach((cat) => {
    cat.children.forEach((sub) => {
      rows.push({ 类型: '收入', 一级分类: cat.name, 二级分类: sub.name })
    })
  })
  getCustomCategories().forEach((cat) => {
    cat.children.forEach((sub) => {
      rows.push({ 类型: cat.type === 'income' ? '收入' : '支出', 一级分类: cat.name, 二级分类: sub.name })
    })
  })
  return rows
}

// ==================== 导出功能 ====================

/**
 * 将记录数组导出为 Excel 文件并触发下载
 */
export function exportToExcel(records: RecordItem[], fileName?: string) {
  // 数据工作表
  const dataRows = records.map((r) => ({
    '类型': r.type === 'expense' ? '支出' : '收入',
    '金额': r.amount,
    '一级分类': r.category_l1,
    '二级分类': r.category_l2,
    '日期': r.date,
    '备注': r.note || '',
  }))

  const dataSheet = XLSX.utils.json_to_sheet(dataRows)

  // 分类参考工作表
  const catRows = buildCategoryRefRows()
  const catSheet = XLSX.utils.json_to_sheet(catRows)

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, dataSheet, '数据')
  XLSX.utils.book_append_sheet(wb, catSheet, '分类参考')

  // 设置列宽
  dataSheet['!cols'] = [
    { wch: 6 },  // 类型
    { wch: 10 }, // 金额
    { wch: 10 }, // 一级分类
    { wch: 10 }, // 二级分类
    { wch: 12 }, // 日期
    { wch: 20 }, // 备注
  ]
  catSheet['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 12 },
  ]

  XLSX.writeFile(wb, fileName || `黑马记账_导出_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

/**
 * 将记录数组导出为 CSV 文件并触发下载（UTF-8 BOM 保证中文不乱码）
 */
export function exportToCSV(records: RecordItem[], fileName?: string) {
  const rows = records.map((r) => [
    r.type === 'expense' ? '支出' : '收入',
    r.amount,
    r.category_l1,
    r.category_l2,
    r.date,
    r.note || '',
  ])

  // 构建 CSV 内容
  const headerLine = HEADERS.join(',')
  const dataLines = rows.map((row) =>
    row.map((cell) => {
      // 如果单元格包含逗号、引号或换行，需要用引号包裹
      const str = String(cell)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',')
  )

  // UTF-8 BOM 保证 Excel 打开时中文不乱码
  const BOM = '﻿'
  const csv = BOM + [headerLine, ...dataLines].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName || `黑马记账_导出_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 获取当前筛选条件下的导出数据
 */
export function getExportRecords(year?: string, month?: string): RecordItem[] {
  return getAllRecords(year, month)
}

// ==================== 导入功能 ====================

export interface RawRow {
  type: string
  amount: string
  category_l1: string
  category_l2: string
  date: string
  note: string
}

export interface ImportError {
  row: number
  field: string
  message: string
}

export interface ValidateResult {
  successCount: number
  failCount: number
  errors: ImportError[]
}

/**
 * 生成导入模板 Excel 并触发下载
 */
export function generateTemplate() {
  // 示例数据行
  const demoRows = [
    { '类型': '支出', '金额': 35.50, '一级分类': '餐饮', '二级分类': '午餐', '日期': '2026-07-24', '备注': '和同事吃饭' },
    { '类型': '支出', '金额': 15.00, '一级分类': '交通', '二级分类': '公交地铁', '日期': '2026-07-24', '备注': '' },
    { '类型': '收入', '金额': 10000.00, '一级分类': '职业收入', '二级分类': '工资', '日期': '2026-07-15', '备注': '7月工资' },
  ]

  const dataSheet = XLSX.utils.json_to_sheet(demoRows)

  // 分类参考工作表
  const catRows = buildCategoryRefRows()
  const catSheet = XLSX.utils.json_to_sheet(catRows)

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, dataSheet, '数据')
  XLSX.utils.book_append_sheet(wb, catSheet, '分类参考')

  // 设置列宽
  dataSheet['!cols'] = [
    { wch: 6 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 20 },
  ]
  catSheet['!cols'] = [
    { wch: 6 }, { wch: 12 }, { wch: 12 },
  ]

  XLSX.writeFile(wb, '黑马记账_导入模板.xlsx')
}

/**
 * 解析上传的 Excel/CSV 文件
 */
export function parseFile(file: File): Promise<RawRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const sheetName = wb.SheetNames[0]
        const sheet = wb.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

        if (jsonData.length === 0) {
          reject(new Error('文件中没有数据，请检查文件内容'))
          return
        }

        const rows: RawRow[] = jsonData.map((row) => ({
          type: String(row['类型'] || '').trim(),
          amount: String(row['金额'] || '').trim(),
          category_l1: String(row['一级分类'] || '').trim(),
          category_l2: String(row['二级分类'] || '').trim(),
          date: String(row['日期'] || '').trim(),
          note: String(row['备注'] || '').trim(),
        }))

        resolve(rows)
      } catch (err) {
        reject(new Error(`文件解析失败：${err instanceof Error ? err.message : '未知错误'}`))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败，请重试'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * 校验并批量导入数据
 */
export function validateAndImport(rawRows: RawRow[]): ValidateResult {
  const errors: ImportError[] = []
  const validRows: RawRow[] = []

  // 每次校验时重新构建分类映射，确保包含最新自定义分类
  const validCategories = buildValidCategories()
  const typeToL1 = buildTypeToCategories()

  rawRows.forEach((row, index) => {
    const rowNum = index + 2 // Excel 行号（第1行是表头）

    // 校验类型
    if (!row.type) {
      errors.push({ row: rowNum, field: '类型', message: '不能为空' })
    } else if (!['支出', '收入'].includes(row.type)) {
      errors.push({ row: rowNum, field: '类型', message: `"${row.type}" 不是有效类型，只能填"支出"或"收入"` })
    }

    // 校验金额
    if (!row.amount) {
      errors.push({ row: rowNum, field: '金额', message: '不能为空' })
    } else {
      const num = parseFloat(row.amount)
      if (isNaN(num) || num <= 0) {
        errors.push({ row: rowNum, field: '金额', message: `"${row.amount}" 不是有效金额，请输入正数` })
      } else if (!/^\d+(\.\d{1,2})?$/.test(row.amount)) {
        // 允许整数或最多两位小数
        errors.push({ row: rowNum, field: '金额', message: `"${row.amount}" 格式错误，最多支持两位小数` })
      }
    }

    // 校验日期
    if (!row.date) {
      errors.push({ row: rowNum, field: '日期', message: '不能为空' })
    } else {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(row.date)) {
        errors.push({ row: rowNum, field: '日期', message: `"${row.date}" 格式错误，应为 YYYY-MM-DD（如 2026-07-24）` })
      } else {
        const d = new Date(row.date)
        if (isNaN(d.getTime())) {
          errors.push({ row: rowNum, field: '日期', message: `"${row.date}" 不是合法日期` })
        }
      }
    }

    // 校验一级分类
    const validL1ForType = row.type ? typeToL1.get(row.type) : null
    if (!row.category_l1) {
      errors.push({ row: rowNum, field: '一级分类', message: '不能为空' })
    } else if (validL1ForType && !validL1ForType.has(row.category_l1)) {
      const options = validL1ForType ? Array.from(validL1ForType).join('、') : ''
      errors.push({ row: rowNum, field: '一级分类', message: `"${row.category_l1}" 不是${row.type || '收支'}的有效分类（可选：${options}）` })
    }

    // 校验二级分类
    if (!row.category_l2) {
      errors.push({ row: rowNum, field: '二级分类', message: '不能为空' })
    } else if (row.category_l1 && validCategories.has(row.category_l1)) {
      const validL2 = validCategories.get(row.category_l1)!
      if (!validL2.has(row.category_l2)) {
        const options = Array.from(validL2).join('、')
        errors.push({ row: rowNum, field: '二级分类', message: `"${row.category_l2}" 不属于"${row.category_l1}"（可选：${options}）` })
      }
    }

    // 备注长度校验
    if (row.note && row.note.length > 100) {
      errors.push({ row: rowNum, field: '备注', message: `备注过长（${row.note.length}字），最多100字` })
    }

    // 如果该行没有错误，加入有效列表
    const rowHasError = errors.some((e) => e.row === rowNum)
    if (!rowHasError) {
      validRows.push(row)
    }
  })

  // 批量导入有效行
  let successCount = 0
  validRows.forEach((row) => {
    const result = addRecord({
      type: row.type === '收入' ? 'income' : 'expense',
      amount: parseFloat(row.amount),
      category_l1: row.category_l1,
      category_l2: row.category_l2,
      date: row.date,
      note: row.note || '',
    })
    if (result.success) {
      successCount++
    }
  })

  return {
    successCount,
    failCount: errors.length,
    errors,
  }
}
