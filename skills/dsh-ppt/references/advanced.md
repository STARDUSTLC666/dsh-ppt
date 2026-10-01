# 图文、图表、工程编辑与渲染

Agent 先准备实际内容，再生成可放映 HTML 与可编辑 PPTX。用户无需填写 JSON。以下是工具接口参考。

## 创建

`ppt_templates` 提供 weekly、defense、project、pitch 四种结构参考。`ppt_create` 的 `template` 单独使用时生成待填草稿，返回 `deliveryStatus:draft`；提供完成的 content/slides 才能开始成品验收。

`slides` 新增 image/image-left/image-right/chart 布局。图片示例：`{layout:"image-left",title:"新版流程更短",image:{src:"assets/flow.png",alt:"新版流程截图",fit:"contain"},bullets:["可直接生成","可修改指定页"]}`。PNG/JPEG 本地路径按会话 cwd 解析，亦支持 data URI；每张5MiB/3200万像素、合计32MiB。图片嵌入工程和输出，移动原文件后仍可使用。contain完整显示，cover居中裁切。外链/SVG需先由明确授权的其他工具准备，不自动下载。

图表示例：`{layout:"chart",title:"完成量逐月增加",chart:{kind:"column",categories:["七月","八月","九月"],series:[{name:"完成量",values:[3,5,9]}],unit:"项"}}`。支持 column/bar/line/pie，也可用带表头 rows。长度必须一致，值必须有限；pie仅一个非负系列、正总和。原生PPTX图表包含编辑数据工作簿，HTML有SVG与读屏数据表。

共享品牌 `brand:{primaryColor:"#2C9F87",fontFamily:"Microsoft YaHei",logo:"logo.png",footer:"产品团队 · 2026"}`。还可设背景/文字色及name。选择接收方可用字体；字体诊断不自动安装字体。

## 修改与撤销

先 `ppt_check {deckPath:"report.json"}` 取得当前revision和页面ID。修改：`ppt_edit {deckPath:"report.json",expectedRevision:0,edits:[{slide:3,patch:{title:"新标题",bullets:["事实一","行动"]}}]}`。slide为1起始页码或ID，其他页保留；重复指定页拒绝。可单独修改brand；brand:null清空品牌，logo:null清空Logo，空footer清空页脚。

编辑会原子更新整套HTML/PPTX/JSON，失败回滚。历史最多20次。`ppt_undo {deckPath:"report.json",expectedRevision:1}` 恢复上次状态，包含图片/图表/品牌；revision继续增长，旧修改不可覆盖撤销。仅编辑本插件JSON工程，不导入任意外部PPTX进行修改。编辑不能新增/删除页；表格扩大到需要分页时会要求另建文稿。

## 检查与渲染

`ppt_check` 定位页面问题，包括密度、估计溢出、7–8列表格14pt、图片缺失/损坏/分辨率、图表标签和对比度。6列以内原生表格17pt。静态估算不能保证字体或视觉布局。

可选安装 `npm install --ignore-scripts @deepseek-ai/libreoffice-kit@0.1.3`。Windows还需相应架构的VC++v14运行库。`ppt_render {pptxPath:"report.pptx",format:"both"}` 读取最终PPTX，输出PNG/PDF/收据，不改源文件。默认png，width默认1440（320–3840），timeoutMs默认120000（1000–300000）；最多120页，输入64MiB、输出128MiB、单张16MP。缺失引擎返回unavailable及安装说明，普通创建仍可用。

查看每页PNG及HTML，必要时在实际PowerPoint/WPS检查编辑、备注和动画。LibreOffice不保证与Office逐像素一致，PNG/PDF不保留动画。成功渲染仍为 `visual:not-verified`，不会自动声称视觉通过。

把返回receiptPath传给 `ppt_check {deckPath:"report.json",renderReceipt:".../render-receipt.json"}`。源文件与所有输出的摘要必须匹配；修改/删除后失效，重新渲染。收据是本地完整性记录，非签名证明。

## CLI

`--slides @slides.json`、`--brand @brand.json`、`--template weekly`。

`--edit report.json --edits @edits.json --revision 0`、`--undo report.json --revision 1`。

`--check report.json`、`--render report.pptx --format both`、`--check report.json --render-receipt receipt.json`。

默认渲染目录在PPTX旁；显式 `--out` 指定基目录，已有目录追加后缀。引擎不可用/静态错误/显式收据失效返回非零退出码。
