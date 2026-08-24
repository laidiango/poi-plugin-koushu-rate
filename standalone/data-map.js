const files = {
  "data_manifest.json": require("../data/data_manifest.json"),
  "improvement_arrangement.json": require("../data/improvement_arrangement.json"),
  "improvement_upgrade_target.json": require("../data/improvement_upgrade_target.json"),
  "improvement_consume_step.json": require("../data/improvement_consume_step.json"),
  "improvement_consume_item.json": require("../data/improvement_consume_item.json"),
  "equip_base_cost.json": require("../data/equip_base_cost.json"),
  "equip_names.json": require("../data/equip_names.json"),
};
module.exports = {
  get(name) {
    return files[name] || null;
  },
};