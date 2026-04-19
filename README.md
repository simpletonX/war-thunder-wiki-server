### WarThunder Wiki 科技树后端自动化脚本

`Node.js` `cheerio` `axios` `express` `js-beautify` `module-alias` `cors`

推荐环境：`Node.js v21.7.3` `npm v10.5.2`  本项目创建于Node.js v21.7.3环境，包管理器建议使用npm，部分代码逻辑附文请参考doc/目录。



#### 在项目根目录打开终端：

1 首次拉取本项目时，执行以下命令安装所需依赖：

```bash
npm install
```

2 启动脚本拉取科技树数据：

```bash
npm run pull
```

- 或者直接执行：

```bash
node ./src/4-fill_tree_details.js
```

3 项目正常启动时，终端会输出：

```bash
> server@1.0.0 pull
> node ./src/4-fill_tree_details.js


🚀 处理 usa - ground ...
🛰️ 请求页面: https://wiki.warthunder.com/ground?v=t&t_c=usa
✅ 成功提取 <div data-tree-id="usa">
✅ usa-ground 的 tree_data 解析完成，共 8 个 rank
找到 150 个需要请求 details 的单项
📦 进度 [███---------------------------] 10.7% (16/150)
```

- 位于末行的 `📦 进度 [███---------------------------]` 是动态输出的，等待所有国家&军种全部拉取完毕可能需要20～30分钟左右，甚至会更久。

4 当所有请求全部完成时，终端会输出：

```js
🎉 所有国家与军种已处理完毕！总用时约xx分钟
```

- 这时，所有的数据将已全部写入本地目录 `/database` 中，该文件夹将作为前端科技树视图渲染的数据来源。



#### 注意事项：

请求并发数默认为5，可在 `src/4-fill_tree_details.js` 中通过修改 `limit` 变量调整：

```js
...
const { request_details } = require('./3-request_details')
const limit = 5;  // 单个details请求并发数

async function get_tree_data(t_c, type) {
...
```

⚠️ `limit` 数值过大会降低请求稳定性，甚至还可能会触发Gaijin官网风控，导致短时间内IP被拉黑名单导致无法请求。

随着稳定性的下降，失败的请求会增多（重试的请求也就会增多），降低整体的请求速度。因此 `limit` 不是越大越好，建议设置为5（这是经过测试后比较理想的值），当然你也可以根据自己的喜好进行微调。



——@Blind-Thunder
