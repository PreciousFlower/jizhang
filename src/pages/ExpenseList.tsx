import { useState, useEffect, useCallback } from 'react'
import { Card, Segmented, List, Tag, Empty, Popconfirm, message, Spin, Select, Modal, InputNumber, DatePicker, Input, Button, Upload, Dropdown, Alert } from 'antd'
import { DeleteOutlined, EditOutlined, UploadOutlined, DownloadOutlined, ExportOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload/interface'
import dayjs from 'dayjs'
import { getCategories, getSubCategories, getCategoryIcon } from '../constants/categories'
import { getAllRecords, deleteRecord, updateRecord, getAvailableYears } from '../database'
import { generateTemplate, parseFile, validateAndImport, exportToExcel, exportToCSV, getExportRecords } from '../utils/importExport'
import type { RecordItem, RecordType } from '../types'
import type { ValidateResult } from '../utils/importExport'

const { TextArea } = Input

interface Props {
  refreshKey: number
}

export default function ExpenseList({ refreshKey }: Props) {
  const [records, setRecords] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(dayjs().format('YYYY'))
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

  // 编辑弹窗
  const [editOpen, setEditOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null)
  const [editAmount, setEditAmount] = useState<number | null>(null)
  const [editL1, setEditL1] = useState<string | null>(null)
  const [editL2, setEditL2] = useState<string | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editType, setEditType] = useState<RecordType>('expense')

  // 导入相关状态
  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<UploadFile | null>(null)
  const [importResult, setImportResult] = useState<ValidateResult | null>(null)
  const [importLoading, setImportLoading] = useState(false)

  const years = getAvailableYears()
  // 如果当年不在列表中，添加
  if (!years.includes(dayjs().format('YYYY'))) {
    years.unshift(dayjs().format('YYYY'))
  }

  // 月份选项：1月-12月 正序 + 全部
  const monthOptions = [
    { label: '全部', value: '' },
    ...Array.from({ length: 12 }, (_, i) => ({
      label: `${i + 1}月`,
      value: `${selectedYear}-${String(i + 1).padStart(2, '0')}`,
    })),
  ]

  const loadRecords = useCallback(() => {
    setLoading(true)
    const month = selectedMonth || undefined
    const data = getAllRecords(selectedYear, month)
    setRecords(data)
    setLoading(false)
  }, [selectedYear, selectedMonth])

  useEffect(() => {
    loadRecords()
  }, [loadRecords, refreshKey])

  // 切换年份时重置月份
  useEffect(() => {
    setSelectedMonth(null)
  }, [selectedYear])

  const handleDelete = (id: number) => {
    const result = deleteRecord(id)
    if (result.success) {
      message.success('已删除')
      loadRecords()
    } else {
      message.error('删除失败')
    }
  }

  const openEdit = (record: RecordItem) => {
    setEditingRecord(record)
    setEditType(record.type)
    setEditAmount(record.amount)
    setEditL1(record.category_l1)
    setEditL2(record.category_l2)
    setEditDate(record.date)
    setEditNote(record.note || '')
    setEditOpen(true)
  }

  const handleEditSave = async () => {
    if (!editingRecord) return
    if (!editAmount || editAmount <= 0) { message.warning('请输入正确的金额'); return }
    if (!editL1) { message.warning('请选择分类'); return }
    if (!editL2) { message.warning('请选择具体分类'); return }

    const result = updateRecord({
      id: editingRecord.id!,
      type: editType,
      amount: editAmount,
      category_l1: editL1,
      category_l2: editL2,
      date: editDate,
      note: editNote.trim(),
    })

    if (result.success) {
      message.success('修改成功')
      setEditOpen(false)
      loadRecords()
    } else {
      message.error('修改失败')
    }
  }

  // 导入处理
  const handleImport = async () => {
    if (!importFile) {
      message.warning('请先选择文件')
      return
    }
    setImportLoading(true)
    setImportResult(null)
    try {
      const file = importFile.originFileObj || (importFile as unknown as File)
      if (!file) {
        message.error('文件读取失败')
        setImportLoading(false)
        return
      }
      const rawRows = await parseFile(file as File)
      const result = validateAndImport(rawRows)
      setImportResult(result)
      if (result.successCount > 0) {
        loadRecords()
        message.success(`成功导入 ${result.successCount} 条记录`)
      }
      if (result.failCount > 0) {
        message.warning(`有 ${result.failCount} 条数据校验不通过`)
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : '导入失败')
    }
    setImportLoading(false)
  }

  const closeImport = () => {
    setImportOpen(false)
    setImportFile(null)
    setImportResult(null)
  }

  // 导出处理
  const handleExport = (format: 'excel' | 'csv') => {
    const data = getExportRecords(selectedYear, selectedMonth || undefined)
    if (data.length === 0) {
      message.warning('没有可导出的数据')
      return
    }
    if (format === 'excel') {
      exportToExcel(data)
    } else {
      exportToCSV(data)
    }
    message.success(`已导出 ${data.length} 条记录`)
  }

  const exportItems = [
    { key: 'excel', label: '导出为 Excel', onClick: () => handleExport('excel') },
    { key: 'csv', label: '导出为 CSV', onClick: () => handleExport('csv') },
  ]

  const totalExpense = records.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0)
  const totalIncome = records.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0)

  const editCategories = getCategories(editType)
  const editSubs = editL1 ? getSubCategories(editL1, editType) : []

  return (
    <div>
      {/* 筛选栏 */}
      <Card className="page-card" styles={{ body: { padding: '12px 16px' } }}>
        {/* 年份选择 */}
        <div style={{ marginBottom: 12 }}>
          <Select
            style={{ width: '100%' }}
            size="large"
            value={selectedYear}
            onChange={(val) => setSelectedYear(val)}
            options={years.map((y) => ({ value: y, label: `${y}年` }))}
          />
        </div>

        {/* 月份选择 */}
        <div style={{ overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: 4 }}>
          <Segmented
            size="large"
            value={selectedMonth || ''}
            onChange={(val) => setSelectedMonth(val as string || null)}
            options={monthOptions}
          />
        </div>

        {/* 导入导出按钮 */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <Button type="primary" icon={<UploadOutlined />} onClick={() => setImportOpen(true)}>
            导入
          </Button>
          <Dropdown menu={{ items: exportItems }}>
            <Button icon={<ExportOutlined />}>
              导出
            </Button>
          </Dropdown>
          <Button icon={<DownloadOutlined />} onClick={generateTemplate}>
            下载模板
          </Button>
        </div>

        {/* 汇总 */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 16, padding: '12px 0', background: '#fafafa', borderRadius: 8 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#999' }}>支出</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#ff4d4f' }}>¥{totalExpense.toFixed(2)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#999' }}>收入</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#52c41a' }}>¥{totalIncome.toFixed(2)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#999' }}>结余</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: totalIncome - totalExpense >= 0 ? '#1677ff' : '#ff4d4f' }}>
              ¥{(totalIncome - totalExpense).toFixed(2)}
            </div>
          </div>
        </div>
      </Card>

      {/* 记录列表 */}
      <Spin spinning={loading}>
        {records.length === 0 ? (
          <Card className="page-card">
            <Empty description="暂无记录" />
          </Card>
        ) : (
          <List
            dataSource={records}
            renderItem={(item: RecordItem) => {
              const isExpense = item.type === 'expense'
              return (
                <Card
                  className="page-card"
                  style={{ marginBottom: 10 }}
                  styles={{ body: { padding: '14px 16px' } }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: 6 }}>
                        <Tag color={isExpense ? 'red' : 'green'}>
                          {isExpense ? '支出' : '收入'}
                        </Tag>
                        <Tag color="blue">
                          {getCategoryIcon(item.category_l1, item.type)} {item.category_l1}
                        </Tag>
                        <Tag>{item.category_l2}</Tag>
                      </div>
                      <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                        {item.date}
                      </div>
                      {item.note && (
                        <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{item.note}</div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', marginLeft: 16 }}>
                      <div style={{
                        fontSize: 18, fontWeight: 600, marginBottom: 4,
                        color: isExpense ? '#ff4d4f' : '#52c41a',
                      }}>
                        {isExpense ? '-' : '+'}¥{item.amount.toFixed(2)}
                      </div>
                      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                        <EditOutlined
                          style={{ color: '#1677ff', cursor: 'pointer', fontSize: 16 }}
                          onClick={() => openEdit(item)}
                        />
                        <Popconfirm
                          title="确定删除？"
                          onConfirm={() => handleDelete(item.id!)}
                          okText="确定"
                          cancelText="取消"
                        >
                          <DeleteOutlined style={{ color: '#ff4d4f', cursor: 'pointer', fontSize: 16 }} />
                        </Popconfirm>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            }}
          />
        )}
      </Spin>

      {/* 导入弹窗 */}
      <Modal
        title="📥 批量导入"
        open={importOpen}
        onCancel={closeImport}
        onOk={handleImport}
        okText="开始导入"
        cancelText="取消"
        confirmLoading={importLoading}
        destroyOnClose
        width={600}
      >
        {/* 下载模板 */}
        <div style={{ marginBottom: 16 }}>
          <Button icon={<DownloadOutlined />} onClick={generateTemplate} size="small">
            下载导入模板
          </Button>
          <span style={{ marginLeft: 8, fontSize: 12, color: '#999' }}>
            请先下载模板，按格式填写数据后再上传
          </span>
        </div>

        {/* 文件上传 */}
        <Upload.Dragger
          accept=".xlsx,.xls,.csv"
          maxCount={1}
          beforeUpload={(file) => {
            setImportFile(file as unknown as UploadFile)
            setImportResult(null)
            return false // 阻止自动上传
          }}
          onRemove={() => {
            setImportFile(null)
            setImportResult(null)
          }}
          fileList={importFile ? [importFile] as unknown as UploadFile[] : []}
        >
          <p style={{ fontSize: 40, margin: '8px 0' }}>📁</p>
          <p style={{ fontSize: 14, color: '#666' }}>点击或拖拽文件到此处</p>
          <p style={{ fontSize: 12, color: '#999' }}>支持 .xlsx、.xls、.csv 格式</p>
        </Upload.Dragger>

        {/* 导入结果 */}
        {importResult && (
          <div style={{ marginTop: 16 }}>
            <Alert
              type={importResult.failCount === 0 ? 'success' : 'warning'}
              message={
                <span>
                  导入完成：成功 <b style={{ color: '#52c41a' }}>{importResult.successCount}</b> 条
                  {importResult.failCount > 0 && (
                    <span>，失败 <b style={{ color: '#ff4d4f' }}>{importResult.failCount}</b> 条</span>
                  )}
                </span>
              }
              style={{ marginBottom: 12 }}
            />
            {importResult.errors.length > 0 && (
              <div style={{ maxHeight: 200, overflowY: 'auto', fontSize: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>错误详情：</div>
                {importResult.errors.map((err, i) => (
                  <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0', color: '#ff4d4f' }}>
                    第 {err.row} 行 — {err.field}：{err.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 编辑弹窗 */}
      <Modal
        title="编辑记录"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={handleEditSave}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <Segmented
            block
            value={editType}
            onChange={(val) => { setEditType(val as RecordType); setEditL1(null); setEditL2(null) }}
            options={[
              { label: '支出', value: 'expense' },
              { label: '收入', value: 'income' },
            ]}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4, fontSize: 13, color: '#666' }}>金额</div>
          <InputNumber style={{ width: '100%' }} value={editAmount} onChange={(v) => setEditAmount(v)} prefix="¥" precision={2} min={0} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4, fontSize: 13, color: '#666' }}>分类</div>
          <Select style={{ width: '100%' }} value={editL1} onChange={(v) => { setEditL1(v); setEditL2(null) }} placeholder="一级分类"
            options={editCategories.map((c) => ({ value: c.name, label: `${c.icon} ${c.name}` }))} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4, fontSize: 13, color: '#666' }}>具体分类</div>
          <Select style={{ width: '100%' }} value={editL2} onChange={setEditL2} placeholder="二级分类" disabled={!editL1}
            options={editSubs.map((c) => ({ value: c.name, label: c.name }))} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4, fontSize: 13, color: '#666' }}>日期</div>
          <DatePicker style={{ width: '100%' }} value={dayjs(editDate)} onChange={(d) => setEditDate(d ? d.format('YYYY-MM-DD') : editDate)} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4, fontSize: 13, color: '#666' }}>备注</div>
          <TextArea value={editNote} onChange={(e) => setEditNote(e.target.value)} maxLength={100} showCount rows={2} />
        </div>
      </Modal>
    </div>
  )
}
