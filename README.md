# 看见之外 · cov7seg

**如果数码屏被挡住或坏了几段，还能知道它原来显示什么吗？怎样在容错与熟悉的字形之间取舍？**

这是可复现研究与浏览器设计器：先经历一个 6/8 歧义，再从画布、字符与要求开始设计自己的显示器。所有当前设计的校验、警告、匹配度与候选搜索都在 JavaScript 中运行。

## 在线玩与离线下载

- **直接玩**：[打开看见之外](https://ZisIsNotZis.github.io/cov7segDsp/)
- **离线版**：[下载单文件 cov7seg.html](https://ZisIsNotZis.github.io/cov7segDsp/cov7seg.html)（也可用网页页脚的“下载离线单文件”按钮）
- **源码**：[GitHub 仓库](https://github.com/ZisIsNotZis/cov7segDsp)

无需安装、登录或服务器端计算。离线文件已经内嵌全部交互 JS、CSS、研究数据和图表，双击即可使用。跳转完整研究文档或历史页面需要网络。本机保存使用浏览器存储；跨浏览器/设备请导出设计 JSON。

## 本地开发与单文件构建

```bash
python -m http.server 8000 --bind 127.0.0.1
# 浏览器访问 http://127.0.0.1:8000/
```

源码按 HTML、JS、CSS 分开维护，直接打开源码 `index.html` 需要保留同目录资产。发布文件才是真正自包含的单 HTML，不要只复制源码首页。

```bash
python -m foundation.build_site
# dist/index.html：在线首页，自包含
# dist/cov7seg.html：可单独携带、离线打开的完整页面
```

构建只使用 Python 标准库，无 npm 安装步骤。`dist/` 是生成物，不提交；构建还会输出已内嵌资源的历史页面及 SHA-256 清单。JSON 设计文件保存完整结构、字形、独立目标、规则与权重。

## 部署

GitHub Pages 使用 `.github/workflows/pages.yml`。推送到 `master` 后，Actions 先跑研究、前端与打包验证，通过后构建并发布 `dist/`；PR 只验证，不部署。Actions 同时保留 `cov7seg-single-html` 下载产物。网站是静态文件，无需后端、数据库、API 密钥或额外域名。

## 五步设计

1. **画布与硬件**：选择格子数、正交与两种斜线、独立灯点，逐根启用/禁用可用段。硬件结构与某个字形是否点亮是不同状态。
2. **字符库存**：叠加预设、逐字选择或自定义输入，选择是否区分大小写。
3. **容错要求**：添加多条规则，每侧分别设置恢复/检测深度，可叠加未知坏灭、常亮或翻转段。百分比表示几何遮挡深度，不是发生概率。
4. **独立期望与权重**：比较完整及遮挡后的预期形状、最近目标和拓扑。目标可以单独编辑，不随当前设计自动变化。
5. **验证与搜索**：逐字红色错误、黄色匹配偏差、规则反例、模型分数；按当前配置现场搜索参考候选，报告预算、剩余违例和复验结果。

“唯一恢复”是对已知字库与规则的理想解码保证，不等于真人能直觉读懂。百分比模型采用几何裁切：残留任意非零长度的段仍携带一位信息；微小残段的现实可见性需要另外建模。未知遮挡枚举触及预算时不会标成验证通过。

线宽按零处理，绘图留白不占遮挡比例：0% 不遮挡，任意正深度遮住最外边，50% 恰好遮住中线。遮挡前沿包含在被遮区域中。

## 原研究没有被替换

网页末章展示精确计数、四格匹配构造、广义 Hamming 族、well-covered 判据、字形优化取舍、最近标准检查与故障容量。相关表格由既有结果文件生成，可把研究字体载入设计器重新检验。

经典七段理想整侧遮挡模型的几个结果（任意图案容量，不是可读字符数量）：

| 情景 | 不静默替换 | 唯一恢复 |
|---|---:|---:|
| 左右任选，无故障 | 32 | 32 |
| 四侧任选、方向未知，无故障 | 28 | 28 |
| 左右同时，无故障 | 8 | 8 |
| 左右任选 + 至多一段坏灭 | 16 | 6 |
| 四侧任选 + 至多一段坏灭 | 9 | 6 |

这些容量不能直接套到自定义几何、任意百分比或人工目标上。新设计器验证具体字库；未证明的新容量不冒充已知定理。搜索是在预算内寻找候选，启发式失败不等于不存在答案；经典 Hamming 码也不是本项目首创。

## 验证与复现

```bash
python tests/test_foundation.py
python -m foundation.verify_sevenseg
python -m unittest discover -s tests -p "test_channels.py" -v
python -m unittest discover -s tests -p "test_calibration_snapshot.py" -v
node --test lab/*.test.js

# 重新生成浏览器中的原研究表格
python -m foundation.build_archive_data
python -m foundation.build_channel_data
# 完整复现经典故障模型的144项精确容量，需要可选OR-Tools
uv run --no-project --python 3.14 --with ortools python -m foundation.channel_experiments --sat
```

当前工作与入口见 [LAB](docs/LAB.md)、[实现地图](docs/9_IMPLEMENTATION.md)、[路线图](docs/0_ROADMAP.md)。研究正文见 [FOUNDATION](docs/FOUNDATION.md)、[RECOGNITION](docs/RECOGNITION.md)、[CHANNELS](docs/CHANNELS.md)。

`workshop-v1.html` 保留第一版故事/预设实验，`legacy.html` 保留最初的中英文诊断台、倒计时与探索性识别测验。旧测验 v1 会泄露隐藏信息且未记录编辑字形，不能作为可靠感知证据；修正后的 v2 仍未经独立感知实验验证。

源代码采用 [AGPL-3.0-or-later](LICENSE)。不将模型分数、机器可解码性或演示字形表述为道路设备安全认证。
