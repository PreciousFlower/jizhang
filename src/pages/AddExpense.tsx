import { useState } from 'react'
import { Card, InputNumber, DatePicker, Input, Button, Select, Segmented, message } from 'antd'
import dayjs from 'dayjs'
import { getCategories, getSubCategories } from '../constants/categories'
import { addRecord } from '../database'
import type { RecordType } from '../types'

const { TextArea } = Input

interface Props {
  onSuccess: () => void
}

export default function AddExpense({ onSuccess }: Props) {
  const [recordType, setRecordType] = useState<RecordType>('expense')
  const [amount, setAmount] = useState<number | null>(null)
  const [l1Category, setL1Category] = useState<string | null>(null)
  const [l2Category, setL2Category] = useState<string | null>(null)
  const [date, setDate] = useState<string>(dayjs().format('YYYY-MM-DD'))
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const categories = getCategories(recordType)
  const subCategories = l1Category ? getSubCategories(l1Category, recordType) : []

  const handleSubmit = async () => {
    if (!amount || amount <= 0) {
      message.warning('请输入正确的金额')
      return
    }
    if (!l1Category) {
      message.warning('请选择分类')
      return
    }
    if (!l2Category) {
      message.warning('请选择具体分类')
      return
    }

    setLoading(true)
    await new Promise((r) => setTimeout(r, 200))

    const result = addRecord({
      type: recordType,
      amount,
      category_l1: l1Category,
      category_l2: l2Category,
      date,
      note: note.trim(),
    })

    setLoading(false)

    if (result.success) {
      message.success(recordType === 'expense' ? '记账成功！' : '收入记录成功！')
      setAmount(null)
      setL1Category(null)
      setL2Category(null)
      setDate(dayjs().format('YYYY-MM-DD'))
      setNote('')
      onSuccess()
    } else {
      message.error('保存失败，请重试')
    }
  }

  const isExpense = recordType === 'expense'

  return (
    <div>
      <Card className="page-card" title={isExpense ? '💸 记支出' : '💰 记收入'}>
        {/* 收支切换 */}
        <div style={{ marginBottom: 20 }}>
          <Segmented
            block
            size="large"
            value={recordType}
            onChange={(val) => {
              setRecordType(val as RecordType)
              setL1Category(null)
              setL2Category(null)
            }}
            options={[
              { label: '💸 支出', value: 'expense' },
              { label: '💰 收入', value: 'income' },
            ]}
          />
        </div>

        {/* 金额输入 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 8, fontSize: 14, color: '#666' }}>金额 (元)</div>
          <InputNumber
            style={{ width: '100%' }}
            size="large"
            placeholder="输入金额"
            value={amount}
            onChange={(val) => setAmount(val)}
            prefix="¥"
            precision={2}
            min={0}
            max={9999999}
            controls={false}
          />
        </div>

        {/* 一级分类 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 8, fontSize: 14, color: '#666' }}>分类</div>
          <Select
            style={{ width: '100%' }}
            size="large"
            placeholder="选择一级分类"
            value={l1Category}
            onChange={(val) => {
              setL1Category(val)
              setL2Category(null)
            }}
            options={categories.map((c) => ({
              value: c.name,
              label: `${c.icon} ${c.name}`,
            }))}
          />
        </div>

        {/* 二级分类 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 8, fontSize: 14, color: '#666' }}>具体分类</div>
          <Select
            style={{ width: '100%' }}
            size="large"
            placeholder={l1Category ? '选择具体分类' : '请先选择大类'}
            value={l2Category}
            onChange={setL2Category}
            disabled={!l1Category}
            options={subCategories.map((c) => ({
              value: c.name,
              label: c.name,
            }))}
          />
        </div>

        {/* 日期 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 8, fontSize: 14, color: '#666' }}>日期</div>
          <DatePicker
            style={{ width: '100%' }}
            size="large"
            value={dayjs(date)}
            onChange={(d) => setDate(d ? d.format('YYYY-MM-DD') : date)}
            allowClear={false}
          />
        </div>

        {/* 备注 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 8, fontSize: 14, color: '#666' }}>备注（选填）</div>
          <TextArea
            placeholder="写点备注..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={100}
            showCount
            rows={2}
          />
        </div>

        {/* 提交按钮 */}
        <Button
          type="primary"
          size="large"
          block
          onClick={handleSubmit}
          loading={loading}
          style={{ background: isExpense ? '#1677ff' : '#52c41a' }}
        >
          {isExpense ? '记录支出' : '记录收入'}
        </Button>
      </Card>
    </div>
  )
}
