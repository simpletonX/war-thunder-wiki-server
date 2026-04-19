require('module-alias/register')
const fs = require('fs')
const path = require('path')
const { vehicle_type, country_code } = require('@/dict/country_code')
const { fetchTreeHTML } = require('./1-extract_tree_div')
const { extract_rank_tb } = require('./2-extract_rank_tb')
const { request_details } = require('./3-request_details')
const limit = 5;  // 单个details请求并发数

async function get_tree_data(t_c, type) {
  const html = await fetchTreeHTML(t_c, type)
  const result = await extract_rank_tb(html, t_c, type)
  return result
}

async function get_details(data_unit_id) {
  const result = await request_details(data_unit_id)
  return result
}

// 限制并发数量的异步任务队列 + 进度显示
async function asyncQueue(items, handler, showProgress = true) {
  const results = []
  let index = 0
  let active = 0
  let completed = 0
  const total = items.length
  const startTime = Date.now()

  const printProgress = () => {
    if (!showProgress) return
    const percent = ((completed / total) * 100).toFixed(1)
    const barLength = 30
    const filledLength = Math.round((barLength * completed) / total)
    const bar = '█'.repeat(filledLength) + '-'.repeat(barLength - filledLength)
    process.stdout.write(`\r📦 进度 [${bar}] ${percent}% (${completed}/${total})`)
  }

  return new Promise((resolve) => {
    const next = () => {
      if (index >= total && active === 0) {
        const time = ((Date.now() - startTime) / 1000).toFixed(1)
        console.log(`\n✅ 全部 ${total} 项完成，用时 ${time}s`)
        return resolve(results)
      }

      while (active < limit && index < total) {
        const current = index++
        active++
        handler(items[current])
          .then((res) => results.push(res))
          .catch((err) => console.error(`处理失败: ${err}`))
          .finally(() => {
            active--
            completed++
            printProgress()
            next()
          })
      }
    }
    next()
  })
}

// 获取 tree_data 中所有 type === "single" 的 item
function collectSingleItems(tree_data) {
  const singles = []
  for (const rank of tree_data) {
    const cols = [...(rank.researchable_vehicles || []), ...(rank.premium_vehicles || [])]
    for (const col of cols) {
      for (const item of col) {
        if (item.type === 'single') {
          singles.push(item)
        } else if (item.type === 'multiple' && Array.isArray(item.items)) {
          for (const subItem of item.items) {
            if (subItem.type === 'single') singles.push(subItem)
          }
        }
      }
    }
  }
  return singles
}

// 处理 multiple 类型 item 的 br 范围和 details
function processMultipleItems(tree_data) {
  for (const rank of tree_data) {
    const cols = [...(rank.researchable_vehicles || []), ...(rank.premium_vehicles || [])]
    for (const col of cols) {
      for (const item of col) {
        if (item.type === 'multiple' && Array.isArray(item.items)) {
          const brs = item.items.map((sub) => parseFloat(sub.br)).filter((b) => !isNaN(b))
          if (brs.length > 0) {
            const min = Math.min(...brs)
            const max = Math.max(...brs)
            item.br = min === max ? `${min.toFixed(1)}` : `${min.toFixed(1)}-${max.toFixed(1)}`
          }
          item.details = true
        }
      }
    }
  }
}

// 递归重试请求直到成功
async function retryUntilSuccess(fn, args, retryDelay = 500) {
  while (true) {
    try {
      return await fn(...args)
    } catch (err) {
      console.warn(`请求失败，重试中... (${args})`)
      await new Promise((r) => setTimeout(r, retryDelay))
    }
  }
}

// ======== 主逻辑 ========
; (async () => {
  const version_timestamp = `${+new Date()}`;
  const totalStart = Date.now()

  for (let i = 0; i < country_code.length; i++) {
    for (let j = 0; j < vehicle_type.length; j++) {
      const taskStart = Date.now()
      console.log(`\n🚀 处理 ${country_code[i]} - ${vehicle_type[j]} ...`)

      const tree_data = await get_tree_data(country_code[i], vehicle_type[j])
      const singleItems = collectSingleItems(tree_data)

      console.log(`找到 ${singleItems.length} 个需要请求 details 的单项`)

      await asyncQueue(
        singleItems,
        async (item) => {
          const res = await retryUntilSuccess(get_details, [item.data_unit_id])
          Object.assign(item, res, { details: true })
        },
        true
      )

      // 所有 single 完成后处理 multiple
      processMultipleItems(tree_data)

      // 写入本地文件
      const dir = path.join(__dirname, '..', 'database', country_code[i])
      const output = path.join(dir, `${country_code[i]}_${vehicle_type[j]}.json`)
      fs.mkdirSync(dir, { recursive: true })
      // fs.writeFileSync(output, JSON.stringify({
      //   data: tree_data,
      //   version_timestamp,
      // }, null, 2), 'utf-8')
      fs.writeFileSync(output, JSON.stringify(tree_data, null, 2), 'utf-8')
      const elapsed = ((Date.now() - taskStart) / 1000).toFixed(1)
      console.log(`✅ 写入完成: ${output} （用时 ${elapsed}s）`)
    }
  }

  const totalElapsed = ((Date.now() - totalStart) / 1000 / 60).toFixed(2)
  console.log(`\n🎉 所有国家与军种已处理完毕！总用时约 ${totalElapsed} 分钟`)
})()
