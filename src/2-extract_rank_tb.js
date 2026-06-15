/**
 * step 2 - extract_rank_tb.js
 * 从 HTML 字符串提取各等级 rank 结构，生成完整 tree_data 对象
 */

require("module-alias/register");
const cheerio = require("cheerio");
// const { get_unlock_quantity } = require("@dict/unlock_quantity");

/** 解析单个 wt-tree_item */
function parse_single_item($item, is_premium = false) {
  const data_unit_id = $item.attr("data-unit-id");
  const title = $item.find(".wt-tree_item-text span").text().trim();
  const icon_style = $item.find(".wt-tree_item-icon").attr("style") || "";
  const vehicle_icon_match = icon_style.match(/url\(['"]?(.*?)['"]?\)/);
  const vehicle_icon = vehicle_icon_match ? vehicle_icon_match[1] : "";

  let class_name = "";
  if (is_premium) {
    if ($item.hasClass("wt-tree_item--prem")) class_name = "prem";
    else if ($item.hasClass("wt-tree_item--squad")) class_name = "squad";
  }

  return {
    type: "single",
    title,
    vehicle_icon,
    br: null,
    rp: -1,
    rp_view: "",
    sp: 0,
    sp_view: "",
    data_unit_id,
    class_name
  };
}

/** 解析 wt-tree_group（多载具组合） */
function parse_multiple_item($group, is_premium = false, $) {
  const data_unit_id = $group.attr("data-unit-id");
  const title = $group.find(".wt-tree_group-folder .wt-tree_item-text span").text().trim();
  const icon_style = $group.find(".wt-tree_group-folder .wt-tree_item-icon").attr("style") || "";
  const vehicle_icon_match = icon_style.match(/url\(['"]?(.*?)['"]?\)/);
  const vehicle_icon = vehicle_icon_match ? vehicle_icon_match[1] : "";

  let class_name = "";
  if (is_premium) {
    if ($group.hasClass("wt-tree_group--prem")) class_name = "prem";
    else if ($group.hasClass("wt-tree_group--squad")) class_name = "squad";
  }

  const items = [];
  $group.find(".wt-tree_group-items .wt-tree_item").each((_, el) => {
    items.push(parse_single_item($(el), is_premium));
  });

  return {
    type: "multiple",
    title,
    vehicle_icon,
    br: "",
    data_unit_id,
    class_name,
    items,
  };
}

/** 解析 td 内所有 wt-tree_item / wt-tree_group */
function parse_column($td, is_premium = false, $) {
  const column = [];
  $td.children(".wt-tree_item, .wt-tree_group").each((_, el) => {
    const $el = $(el);
    if ($el.hasClass("wt-tree_item")) column.push(parse_single_item($el, is_premium));
    else if ($el.hasClass("wt-tree_group")) column.push(parse_multiple_item($el, is_premium, $));
  });
  return column;
}

/** 解析 table.wt-tree_rank-instance */
function parse_table($table, is_premium = false, $) {
  const columns = [];
  $table.find("tr").each((_, tr) => {
    const $tr = $(tr);
    $tr.find("td").each((colIndex, td) => {
      if (!columns[colIndex]) columns[colIndex] = [];
      const col_items = parse_column($(td), is_premium, $);
      columns[colIndex].push(...col_items);
    });
  });
  return columns;
}

/**
 * 从 HTML 字符串中提取完整科技树结构
 * @param {string} html - HTML片段字符串
 * @param {string} t_c - 国家代号
 * @param {string} type - 军种类型
 * @returns {Array} tree_data 结构
 */
function extract_rank_tb(html, t_c, type = "ground") {
  if (!html) {
    console.error("❌ extract_rank_tb: 缺少 HTML 输入");
    return [];
  }

  const $ = cheerio.load(html);
  const tree_data = [];

  const headers = $("div.wt-tree_r-header.wt-tree_row");
  const ranks = $("div.wt-tree_rank.wt-tree_row");

  headers.each((index, header) => {
    const rank_label = $(header).find("div.wt-tree_r-header_label span").text().trim();
    const $rank_div = $(ranks[index]);
    if (!rank_label || !$rank_div.length) return;

    // 左右表（可研发 / 金鹰）
    const $tables = $rank_div.find("table.wt-tree_rank-instance");
    const $left_table = $tables.first();
    const $right_table = $tables.length > 1 ? $tables.last() : null;

    const researchable_vehicles = $left_table.length ? parse_table($left_table, false, $) : [];
    const premium_vehicles = $right_table ? parse_table($right_table, true, $) : [];

    const rank_obj = {
      rank: rank_label,
      researchable_vehicles,
      premium_vehicles,
      // unlock_quantity: get_unlock_quantity(t_c, type, rank_label),
      unlock_quantity: 0,
    };

    tree_data.push(rank_obj);
  });

  console.log(`✅ ${t_c}-${type} 的 tree_data 解析完成，共 ${tree_data.length} 个 rank`);
  return tree_data;
}

module.exports = { extract_rank_tb };
