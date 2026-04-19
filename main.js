require('module-alias/register')
const express = require('express')
const cors = require('cors')

const { fetchTreeHTML } = require('@/src/1-extract_tree_div')
const { extract_rank_tb } = require('@/src/2-extract_rank_tb')
const { vehicle_type, country_code } = require('@/dict/country_code')
const { request_details } = require('./src/3-request_details')

const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json())

app.get('/api/:type', async (req, res) => {
  try {
    const type = req.params.type?.toLowerCase()
    const t_c = req.query.t_c?.toLowerCase()

    // ✅ 参数校验
    if (!vehicle_type.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `无效的类型 '${type}'，仅支持 ${vehicle_type.join(', ')}`,
      })
    }

    if (!t_c) {
      return res.status(400).json({
        success: false,
        error: '缺少 t_c 参数',
      })
    }

    if (!country_code.includes(t_c)) {
      return res.status(400).json({
        success: false,
        error: `无效的国家代号 '${t_c}'，仅支持 ${country_code.join(', ')}`,
      })
    }

    // ✅ 抓取 War Thunder Wiki 页面 HTML
    console.log(`📥 正在抓取 WIKI 页面: ${t_c} - ${type} 科技树...`)
    const html = await fetchTreeHTML(t_c, type)

    if (!html) {
      return res.status(500).json({
        success: false,
        error: '未能获取到有效的 HTML 数据',
      })
    }

    // ✅ 解析 rank 表结构
    console.log(`📊 正在解析: ${t_c} 的 rank 表...`)
    const result = await extract_rank_tb(html, t_c, type)

    // ✅ 直接返回数据，不进行服务器缓存
    res.json({
      success: true,
      t_c,
      type,
      cached: false,
      data: result,
    })
  } catch (err) {
    console.error('❌ 接口出错:', err)
    res.status(500).json({
      success: false,
      error: err.message || '服务器内部错误',
    })
  }
})

app.get('/api/unit/:data_unit_id', async (req, res) => {
  const data_unit_id = req.params.data_unit_id?.toLowerCase()

  if (!data_unit_id) {
    return res.status(400).json({ success: false, error: '缺少 data_unit_id 参数' })
  }

  const url = `https://wiki.warthunder.com/unit/${data_unit_id}`
  console.log(`🛰️ 抓取details: ${url}`)

  try {
    const result = await request_details(data_unit_id)

    res.json({
      success: true,
      data: result,
    })

    console.log(`✅ 已解析 ${data_unit_id}:`, JSON.stringify(result))
  } catch (err) {
    console.error('❌ 抓取或解析details失败:', err.message)
    res.status(500).json({
      success: false,
      error: err.message || '服务器内部错误',
    })
  }
})

app.listen(PORT, () => {
  console.log(`✅ 服务器已启动: http://localhost:${PORT}`)
})

// 指向箭头来源
// class="wt-tree-canvas"
