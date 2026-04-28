# Vibe Todo Starter

这是一个为 Vibe coding 入门准备的最小待办网页项目。

## 怎么打开

因为项目已经接入 Google 登录，建议用本地服务打开，而不是直接打开文件：

```bash
python3 -m http.server 8000
```

然后访问：

```text
http://localhost:8000
```

## 当前功能

- 新增待办
- 标记完成
- 删除待办
- 按“全部 / 进行中 / 已完成”筛选
- Google 登录
- 云端保存任务
- 换设备登录后同步数据
- 手机宽度下可用

## Supabase 配置

这个项目使用 Supabase Auth 和 `todos` 表保存数据。Google 登录需要在 Supabase 的 URL Configuration 中允许你的本地和线上地址，例如：

- `http://localhost:8000`
- Vercel 部署后的正式域名

## 你可以怎么继续练

拿这个项目做一轮一轮小改动，每次只提一个明确需求给 Codex，例如：

- “把已完成任务放到列表底部”
- “给每个待办加截止日期”
- “加一个编辑按钮”
- “把界面改得更像习惯打卡 App”
- “解释一下这里的数据是怎么从输入框流到页面上的”

## 这个项目里最值得理解的点

- `addTodo(title)`：把输入内容变成一条任务
- `toggleTodo(id)`：切换完成状态
- `deleteTodo(id)`：删除任务
- `filterTodos(status)`：切换当前筛选
- Supabase：把任务保存到云端，登录后跨设备同步

## 建议你的下一步

1. 先自己新增 3 条任务，点一遍完成、删除、筛选。
2. 然后挑 1 个你最想加的功能，让 Codex 帮你改。
3. 每改完一次，就用产品经理视角做一轮验收。
