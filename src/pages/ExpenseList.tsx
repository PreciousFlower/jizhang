import { useState, useEffect, useCallback } from 'react'
import { Card, Segmented, List, Tag, Empty, Popconfirm, message, Spin, Select, Modal, InputNumber, DatePicker, Input, Button } from 'antd'
import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { getCategories, getSubCategories, getCategoryIcon } from '../constants/categories'
import { getAllRecords, deleteRecord, updateRecord, getAvailableYears } from '../database'
import type { RecordItem, RecordType } from '../types'

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
