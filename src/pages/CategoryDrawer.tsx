import { useState } from 'react'
import {
  Drawer,
  Segmented,
  Button,
  Modal,
  Input,
  Tag,
  Popconfirm,
  message,
  Empty,
} from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  MinusCircleOutlined,
  LockOutlined,
} from '@ant-design/icons'
import { getCustomCategories, addCustomCategory, updateCustomCategory, deleteCustomCategory } from '../database'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, isPresetCategory } from '../constants/categories'
import type { CustomCategory, RecordType } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  onChanged: () => void
}

// 可选 emoji 列表
const EMOJI_LIST = [
  '🐾', '🎁', '✈️', '🎓', '💻', '🎵', '🏋️', '☕',
  '🍰', '💄', '🎂', '🏖️', '🎯', '🎨', '🚌', '💊',
  '🌸', '🧹', '🛍️', '📦', '🍺', '🎮', '📸', '🚲',
  '🐱', '🐶', '🌿', '💡', '🔧', '📱', '🎸', '🎤',
]

interface SubCategoryInput {
  key: string
  name: string
}

function makeChildKey(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export default function CategoryDrawer({ open, onClose, onChanged }: Props) {
  const [viewType, setViewType] = useState<RecordType>('expense')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null) // null = 新增模式
  const [formIcon, setFormIcon] = useState('🐾')
  const [formName, setFormName] = useState('')
  const [formChildren, setFormChildren] = useState<SubCategoryInput[]>([
    { key: makeChildKey(), name: '' },
  ])
  const [saving, setSaving] = useState(false)

  const customCategories = getCustomCategories().filter((c) => c.type === viewType)
  const presetCategories = viewType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  // 打开新增弹窗
  const openAddModal = () => {
    setEditingId(null)
    setFormIcon('🐾')
    setFormName('')
    setFormChildren([{ key: makeChildKey(), name: '' }])
    setModalOpen(true)
  }

  // 打开编辑弹窗
  const openEditModal = (cat: CustomCategory) => {
    setEditingId(cat.id)
    setFormIcon(cat.icon)
    setFormName(cat.name)
    setFormChildren(cat.children.map((c) => ({ key: makeChildKey(), name: c.name })))
    setModalOpen(true)
  }

  // 添加子分类输入行
  const addChildRow = () => {
    setFormChildren((prev) => [...prev, { key: makeChildKey(), name: '' }])
  }

  // 删除子分类输入行
  const removeChildRow = (key: string) => {
    setFormChildren((prev) => {
      if (prev.length <= 1) return prev // 至少保留一个
      return prev.filter((c) => c.key !== key)
    })
  }

  // 修改子分类名称
  const updateChildName = (key: string, name: string) => {
    setFormChildren((prev) => prev.map((c) => (c.key === key ? { ...c, name } : c)))
  }

  // 保存（新增或编辑）
  const handleSave = async () => {
    // 校验
    const trimmedName = formName.trim()
    if (!trimmedName) {
      message.warning('请输入分类名称')
      return
    }

    // 检查是否与预设分类重名
    if (isPresetCategory(trimmedName, viewType)) {
      message.warning('该分类名已被预设分类使用，请换一个名称')
      return
    }

    // 检查子分类
    const validChildren = formChildren.filter((c) => c.name.trim())
    if (validChildren.length === 0) {
      message.warning('请至少添加一个子分类')
      return
    }

    const catData = {
      type: viewType,
      icon: formIcon,
      name: trimmedName,
      children: validChildren.map((c) => ({ name: c.name.trim() })),
    }

    setSaving(true)
    // 模拟短暂延迟让用户感知保存过程
    await new Promise((r) => setTimeout(r, 150))

    let result: { success: boolean; error?: string }
    if (editingId) {
      result = updateCustomCategory(editingId, catData)
    } else {
      result = addCustomCategory(catData)
    }

    setSaving(false)

    if (result.success) {
      message.success(editingId ? '分类已更新' : '分类已添加')
      setModalOpen(false)
      onChanged()
    } else {
      message.error(result.error || '保存失败')
    }
  }

  // 删除
  const handleDelete = (id: string) => {
    const result = deleteCustomCategory(id)
    if (result.success) {
      message.success('分类已删除')
      onChanged()
    } else {
      message.error('删除失败')
    }
  }

  return (
    <>
      <Drawer
        title="⚙️ 分类管理"
        placement="right"
        width={380}
        open={open}
        onClose={onClose}
        styles={{ body: { padding: '16px' } }}
      >
        {/* 支出/收入切换 */}
        <div style={{ marginBottom: 20 }}>
          <Segmented
            block
            value={viewType}
            onChange={(val) => setViewType(val as RecordType)}
            options={[
              { label: '💸 支出分类', value: 'expense' },
              { label: '💰 收入分类', value: 'income' },
            ]}
          />
        </div>

        {/* 预设分类 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#999', marginBottom: 10 }}>
            🔒 预设分类（不可修改）
          </div>
          {presetCategories.map((cat) => (
            <div
              key={cat.name}
              style={{
                background: '#fafafa',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 8,
                border: '1px solid #f0f0f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 18 }}>{cat.icon}</span>
                <span style={{ fontWeight: 500 }}>{cat.name}</span>
                <Tag color="default" icon={<LockOutlined />} style={{ marginLeft: 'auto', fontSize: 11 }}>
                  预设
                </Tag>
              </div>
              <div style={{ fontSize: 12, color: '#999', paddingLeft: 26 }}>
                {cat.children.map((c) => c.name).join('、')}
              </div>
            </div>
          ))}
        </div>

        {/* 自定义分类 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 10 }}>
            ✏️ 自定义分类
          </div>
          {customCategories.length === 0 ? (
            <Empty
              description="还没有自定义分类"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ margin: '20px 0' }}
            />
          ) : (
            customCategories.map((cat) => (
              <div
                key={cat.id}
                style={{
                  background: '#fff',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 8,
                  border: '1px solid #e8e8e8',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 18 }}>{cat.icon}</span>
                  <span style={{ fontWeight: 500 }}>{cat.name}</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    <Button
                      size="small"
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => openEditModal(cat)}
                    />
                    <Popconfirm
                      title="确定删除此分类？"
                      description="已使用此分类的记账记录不受影响"
                      onConfirm={() => handleDelete(cat.id)}
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                    >
                      <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#666', paddingLeft: 26 }}>
                  {cat.children.map((c) => c.name).join('、')}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 添加按钮 */}
        <Button
          type="dashed"
          block
          icon={<PlusOutlined />}
          onClick={openAddModal}
          style={{ marginTop: 8 }}
        >
          添加新分类
        </Button>
      </Drawer>

      {/* 添加/编辑弹窗 */}
      <Modal
        title={editingId ? '编辑分类' : '添加新分类'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        {/* 图标选择 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 14, color: '#666' }}>选择图标</div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              background: '#fafafa',
              padding: 10,
              borderRadius: 8,
              maxHeight: 160,
              overflowY: 'auto',
            }}
          >
            {EMOJI_LIST.map((emoji) => (
              <span
                key={emoji}
                onClick={() => setFormIcon(emoji)}
                style={{
                  fontSize: 22,
                  cursor: 'pointer',
                  padding: '4px 6px',
                  borderRadius: 6,
                  background: formIcon === emoji ? '#e6f4ff' : 'transparent',
                  border: formIcon === emoji ? '2px solid #1677ff' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {emoji}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: '#999' }}>
            当前选择：{formIcon} {formName || '(未命名)'}
          </div>
        </div>

        {/* 分类名称 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 14, color: '#666' }}>一级分类名称</div>
          <Input
            placeholder="例如：宠物、爱好、理财"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            maxLength={10}
            showCount
          />
        </div>

        {/* 子分类列表 */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ marginBottom: 8, fontSize: 14, color: '#666' }}>二级子分类</div>
          {formChildren.map((child, idx) => (
            <div
              key={child.key}
              style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}
            >
              <Input
                placeholder={`子分类 ${idx + 1}`}
                value={child.name}
                onChange={(e) => updateChildName(child.key, e.target.value)}
                maxLength={10}
              />
              <Button
                type="text"
                danger
                icon={<MinusCircleOutlined />}
                onClick={() => removeChildRow(child.key)}
                disabled={formChildren.length <= 1}
              />
            </div>
          ))}
          <Button
            type="dashed"
            size="small"
            icon={<PlusOutlined />}
            onClick={addChildRow}
            block
          >
            添加子分类
          </Button>
        </div>
      </Modal>
    </>
  )
}
