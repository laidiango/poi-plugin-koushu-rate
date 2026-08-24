const React = require("react");
function SlotitemIcon(props) {
  return React.createElement("span", { className: props.className }, props.alt || ("#" + String(props.slotitemId == null ? "" : props.slotitemId)));
}
function MaterialIcon(props) {
  return React.createElement("span", { className: props.className }, props.alt || ("M" + String(props.materialId == null ? "" : props.materialId)));
}
module.exports = { SlotitemIcon, MaterialIcon };