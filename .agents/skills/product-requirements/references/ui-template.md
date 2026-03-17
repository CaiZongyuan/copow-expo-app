# UI Spec Template

Save to: `docs/ui/{feature}.md`

---

# UI Specification: [Feature Name]

**Version**: 1.0  
**Date**: [YYYY-MM-DD]  
**Source PRD**: `docs/prd/{feature}.md`  

## Pages / Routes
- **/route-a**: [页面目标、可见人群]
- **/route-b**: [...]

## Page Details

### /route-a
- **Primary Actions**: [...]
- **UI States**: loading / empty / error / success
- **Form Validation**: [规则 + 文案]
- **Accessibility**: keyboard, aria, focus order
- **Analytics**: 埋点（如需要）

## Components (可复用)
- [组件名]：props、交互、状态

## Copywriting
- 按钮/提示/错误文案（中英文策略）

---

## UI/UX Prototype（可选，但强烈推荐）

如果你对 UI/UX 还不确定，优先让用户提供“参考图/参考网站/竞品链接/手绘草图”。然后：

1. 把参考材料交给多模态 agent 生成一个静态 HTML 原型（不接后端也没关系）
2. 将原型保存为：`docs/ui/{feature}.prototype.html`
3. 在 `docs/ui/{feature}.md` 里引用该原型，并补齐页面状态：loading / empty / error / success

