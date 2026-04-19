const axios = require('axios')
const cheerio = require('cheerio')
const main_roles = require('@/dict/main_role')

async function request_details(data_unit_id) {
  const url = `https://wiki.warthunder.com/unit/${data_unit_id}`

  const { data: html } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
  })

  const $ = cheerio.load(html)

  // ---- ① 提取 BR ----
  // div.game-unit_br → 第二个 .game-unit_br-item → .value
  const br = $('div.game-unit_br .game-unit_br-item').eq(1).find('.value').text().trim() || null

  // ---- ② 提取 RP / SP / Main_Role ----
  // div.game-unit_header → div.game-unit_card-info → 第三个 .game-unit_card-info_line
  const infoLine = $('div.game-unit_header div.game-unit_card-info').find('div.game-unit_card-info_line').eq(2)

  const rp =
    infoLine.find('div.game-unit_card-info_item').eq(0).find('div.game-unit_card-info_value div').first().text().trim() || null

  const sp =
    infoLine.find('div.game-unit_card-info_item').eq(1).find('div.game-unit_card-info_value div').first().text().trim() || null

  const infoLine1 = $('div.game-unit_header div.game-unit_card-info').find('div.game-unit_card-info_line').eq(1)

  let main_role =
    infoLine1
      .find('div.game-unit_card-info_item')
      .eq(1)
      .find('div.game-unit_card-info_value .text-truncate')
      .first()
      .text()
      .trim() || null

  // 校验main_role是否符合预设值
  if (!main_roles.includes(main_role)) {
    // 如果不包含，说明该载具为分体式防空的发射车，需要用另一个DOM提取规则
    const infoLine0 = $('div.game-unit_header div.game-unit_card-info').find('div.game-unit_card-info_line').eq(0)

    main_role =
      infoLine0
        .find('div.game-unit_card-info_item')
        .eq(1)
        .find('div.game-unit_card-info_value .text-truncate')
        .first()
        .text()
        .trim() || null
  }

  const isPremium =
    $('div.game-unit_card-info_value').text().toLowerCase().includes('golden eagles') ||
    $('div.game-unit_header').text().toLowerCase().includes('premium')

  const result = {
    data_unit_id,
    br,
    rp: isPremium ? 0 : rp,
    sp: isPremium ? 0 : sp,
    main_role,
  }

  return result
}

module.exports = { request_details }
