const http = require("http");
const fs = require("fs");
const path = require("path");
const dir = __dirname;
const port = Number(process.env.PORT || 3210);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};
http.createServer((req, res) => {
  const urlPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const file = path.join(dir, urlPath);
  if (!file.startsWith(dir) || !fs.existsSync(file)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("not found");
    return;
  }
  res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(port, () => {
  console.log("standalone test: http://127.0.0.1:" + port + "/");
});