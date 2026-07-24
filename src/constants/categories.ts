// 分类结构
export interface SubCategory {
  name: string
}

export interface Category {
  icon: string
  name: string
  children: SubCategory[]
}

// 支出分类
export const EXPENSE_CATEGORIES: Category[] = [
  {
    icon: '🍽️', name: '餐饮',
    children: [{ name: '早餐' }, { name: '午餐' }, { name: '晚餐' }, { name: '零食饮品' }, { name: '外卖' }, { name: '聚餐' }],
  },
  {
    icon: '🚗', name: '交通',
    children: [{ name: '公交地铁' }, { name: '出租车' }, { name: '网约车' }, { name: '加油充电' }, { name: '停车费' }, { name: '火车飞机' }],
  },
  {
    icon: '🛒', name: '购物',
    children: [{ name: '日用品' }, { name: '数码产品' }, { name: '家居用品' }, { name: '美妆护肤' }, { name: '书籍文具' }],
  },
  {
    icon: '🏠', name: '居住',
    children: [{ name: '房租' }, { name: '水电燃气' }, { name: '物业费' }, { name: '维修保养' }, { name: '家居日用' }],
  },
  {
    icon: '🎮', name: '娱乐',
    children: [{ name: '电影演出' }, { name: '游戏' }, { name: '旅游度假' }, { name: '运动健身' }, { name: 'KTV酒吧' }],
  },
  {
    icon: '🏥', name: '医疗',
    children: [{ name: '门诊挂号' }, { name: '药品' }, { name: '体检' }, { name: '住院' }],
  },
  {
    icon: '📚', name: '教育',
    children: [{ name: '培训课程' }, { name: '书籍资料' }, { name: '考试报名' }, { name: '学费' }],
  },
  {
    icon: '📱', name: '通讯',
    children: [{ name: '手机话费' }, { name: '宽带网络' }, { name: '快递物流' }],
  },
  {
    icon: '👔', name: '服饰',
    children: [{ name: '衣服' }, { name: '鞋子' }, { name: '箱包' }, { name: '配饰首饰' }],
  },
  {
    icon: '💰', name: '其他',
    children: [{ name: '人情往来' }, { name: '礼物红包' }, { name: '其他支出' }],
  },
]

// 收入分类
export const INCOME_CATEGORIES: Category[] = [
  {
    icon: '💼', name: '职业收入',
    children: [{ name: '工资' }, { name: '奖金' }, { name: '提成' }, { name: '兼职' }],
  },
  {
    icon: '💹', name: '投资理财',
    children: [{ name: '股票基金' }, { name: '利息' }, { name: '房租收入' }, { name: '分红' }],
  },
  {
    icon: '👪', name: '人情收入',
    children: [{ name: '红包收入' }, { name: '礼物收入' }, { name: '家人给' }],
  },
  {
    icon: '🔄', name: '其他收入',
    children: [{ name: '退款报销' }, { name: '兼职外快' }, { name: '其他收入' }],
  },
]

// 根据类型获取分类
export function getCategories(type: string): Category[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
}

// 根据一级分类名获取二级分类列表
export function getSubCategories(l1Name: string, type: string): SubCategory[] {
  const cats = getCategories(type)
  const category = cats.find((c) => c.name === l1Name)
  return category ? category.children : []
}

// 获取图标
export function getCategoryIcon(l1Name: string, type: string): string {
  const cats = getCategories(type)
  const cat = cats.find((c) => c.name === l1Name)
  return cat ? cat.icon : '💰'
}
