const akashiCache = require("../../runtime_data/akashi_data.json");
const kcDevCache = require("../../runtime_data/kc_dev_data.json");
const kcDevBundled = require("../../data/kc_dev_data.json");
const secretaries = require("../../data/secretary_arrangement.json");
function keyFor(p) {
  return String(p || "").replace(/\\/g, "/");
}
function readFileSync(p, encoding) {
  const key = keyFor(p);
  if (key.indexOf("akashi_data.json") >= 0) return JSON.stringify(akashiCache);
  if (key.indexOf("kc_dev_data.json") >= 0) return JSON.stringify(key.indexOf("runtime_data") >= 0 ? kcDevCache : kcDevBundled);
  if (key.indexOf("secretary_arrangement.json") >= 0) return JSON.stringify(secretaries);
  throw new Error("standalone fs.readFileSync: " + key);
}
function existsSync(p) {
  const key = keyFor(p);
  return key.indexOf("akashi_data.json") >= 0 || key.indexOf("kc_dev_data.json") >= 0 || key.indexOf("secretary_arrangement.json") >= 0;
}
module.exports = {
  readFileSync,
  existsSync,
  mkdirSync: () => {},
  writeFileSync: () => {},
};