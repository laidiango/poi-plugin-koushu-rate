const React = require("react");
const Ctx = React.createContext({ window: typeof window !== "undefined" ? window : null });
module.exports = { WindowEnv: { Consumer: Ctx.Consumer, Provider: Ctx.Provider } };