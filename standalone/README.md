# 独立测试版

不需要打开 poi，直接双击 `index.html` 即可查看插件界面。页面使用模拟库存数据，便于快速检查改修列表、素材计算、进化分支等界面。

## 重新构建

修改 `index.js` 或数据文件后：

```
npm run build:standalone
```

重新生成 `bundle.js`，刷新浏览器即可。

## 本地服务方式

```
npm run standalone:serve
```

访问 http://127.0.0.1:3210/

## 冒烟测试

```
npm run test:standalone
```

脚本会用 jsdom 加载独立测试页，检查界面能渲染、非进化装备不显示 `MAX→进化`、多进化分支正常显示。