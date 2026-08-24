const names = require("../data/equip_names.json");
const consumeItems = require("../data/improvement_consume_item.json");
function buildFakeStore() {
  const $equips = {};
  const equips = [];
  for (const e of names) {
    const id = String(e.id);
    $equips[id] = {
      api_id: e.id,
      api_name: e.name,
      api_type_name: e.type || "",
      api_type: [1, 1, 1, e.icon || 0],
    };
    const count = 1 + (e.id % 6);
    for (let i = 0; i < count; i += 1) {
      equips.push({ api_id: e.id * 1000 + i + 1, api_slotitem_id: e.id, api_level: i === 0 ? 0 : (i % 10) });
    }
  }
  const materialKeys = Array.from(new Set(consumeItems.map((r) => r.item_material_key).filter(Boolean)));
  const $useitems = {};
  const useitems = {};
  materialKeys.forEach((name, i) => {
    const id = String(i + 1);
    $useitems[id] = { api_id: i + 1, api_name: name };
    useitems[id] = { api_id: i + 1, api_name: name, api_count: 99 };
  });
  return { const: { $equips, $useitems }, info: { equips, useitems } };
}
module.exports = { buildFakeStore };