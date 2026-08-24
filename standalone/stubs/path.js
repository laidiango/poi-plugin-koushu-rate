function join() {
  const parts = Array.prototype.slice.call(arguments).filter((p) => p != null && p !== "");
  return parts.join("/").replace(/\/+/g, "/");
}
function dirname(p) {
  const s = String(p).replace(/\\/g, "/");
  const i = s.lastIndexOf("/");
  return i >= 0 ? s.slice(0, i) : ".";
}
function basename(p) {
  const s = String(p).replace(/\\/g, "/");
  const i = s.lastIndexOf("/");
  return i >= 0 ? s.slice(i + 1) : s;
}
module.exports = { join, dirname, basename };