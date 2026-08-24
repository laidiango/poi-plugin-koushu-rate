const React = require("react");
const ReactDOM = require("react-dom/client");
const { WindowEnv } = require("views/components/etc/window-env");
const plugin = require("../index.js");
const { buildFakeStore } = require("./fake-store");
const fake = buildFakeStore();
window.__KR2_FAKE_STORE__ = fake;
window.getStore = (key) => {
  if (key === "info.equips") return fake.info.equips;
  return fake;
};
window.store = { getState: () => fake };
ReactDOM.createRoot(document.getElementById("root")).render(
  React.createElement(
    WindowEnv.Provider,
    { value: { window } },
    React.createElement(plugin.reactClass)
  )
);