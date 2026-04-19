const axios = require("axios");
const cheerio = require("cheerio");
const beautify = require("js-beautify").html;
require("module-alias/register");

/**
 * 抓取 War Thunder Wiki 科技树指定 div，并返回格式化后的 HTML 片段
 * @param {string} t_c - 国家代号（例如 "germany", "usa", "ussr"）
 * @param {string} type - 军种类型 "ground" / "aviation" / "helicopters"
 * @returns {Promise<string>} - 返回提取到的 HTML 字符串
 */
async function fetchTreeHTML(t_c, type = "ground") {
  const url = `https://wiki.warthunder.com/${type}?v=t&t_c=${t_c}`;
  console.log(`🛰️ 请求页面: ${url}`);

  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });

    const $ = cheerio.load(data);
    const $div = $(`div.unit-tree[data-tree-id="${t_c}"]`);

    if (!$div.length) {
      console.error(
        `❌ 未找到对应的 <div class="unit-tree" data-tree-id="${t_c}">`
      );
      return null;
    }

    // 格式化 HTML 片段
    const htmlContent = beautify($.html($div), {
      indent_size: 2,
      preserve_newlines: true,
      max_preserve_newlines: 1,
      end_with_newline: true,
    });

    console.log(`✅ 成功提取 <div data-tree-id="${t_c}">`);
    return htmlContent;
  } catch (err) {
    console.error("❌ 抓取失败:", err.message);
    return null;
  }
}

module.exports = { fetchTreeHTML };
