const React = require("react");
const fs = require("fs");
const path = require("path");
const { WindowEnv } = require("views/components/etc/window-env");
const { SlotitemIcon, MaterialIcon } = require("views/components/etc/icon");

const LEVEL_ONE_ROWS = [
  { range: "★0→1", p: 1.0 },
  { range: "★1→2", p: 1.0 },
  { range: "★2→3", p: 1.0 },
  { range: "★3→4", p: 1.0 },
  { range: "★4→5", p: 1.0 },
];

const LEVEL_TWO_ROWS = [
  { range: "★5→6", label: "95%", p: 0.95, source: "phase0" },
  { range: "★6→7", label: "90%", p: 0.90, source: "phase1" },
  { range: "★7→8", label: "82%", p: 0.82, source: "phase1" },
  { range: "★8→9", label: "77%", p: 0.77, source: "phase1" },
  { range: "★9→max", label: "67%", p: 0.67, source: "phase1" },
  { range: "max→进化", label: "62%", p: 0.62, source: "upgrade" },
];

const PLAN_LEVELS_6 = [
  { from: 0, p: 1, source: "phase0" },
  { from: 1, p: 1, source: "phase0" },
  { from: 2, p: 1, source: "phase0" },
  { from: 3, p: 1, source: "phase0" },
  { from: 4, p: 1, source: "phase0" },
  { from: 5, p: 0.95, source: "phase0" },
];
const PLAN_LEVELS_MAX = PLAN_LEVELS_6.concat([
  { from: 6, p: 0.9, source: "phase1" },
  { from: 7, p: 0.82, source: "phase1" },
  { from: 8, p: 0.77, source: "phase1" },
  { from: 9, p: 0.67, source: "phase1" },
]);

const WEEKDAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const WEEKDAY_LABELS = { monday: "周一", tuesday: "周二", wednesday: "周三", thursday: "周四", friday: "周五", saturday: "周六", sunday: "周日" };
const ALL_DAYS_KEY = "all";
const RARE_MATERIAL_KEYS = new Set([
  "新型砲熕兵装資材",
  "新型兵装資材",
  "戦闘詳報",
  "勲章",
  "ネ式エンジン",
  "熟練搭乗員",
  "海外艦最新技術",
  "新型航空兵装資材",
  "工廠資源",
  "新型噴進装備開発資材",
  "潜水艦補給物資",
]);

function japanWeekdayKey() {
  const japanNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][japanNow.getUTCDay()]
}

const AKASHI_URL = "https://akashi-list.me/";
const AKASHI_UPDATE_INTERVAL = 2 * 24 * 60 * 60 * 1000;
const AKASHI_CACHE_FILE = path.join(__dirname, "runtime_data", "akashi_data.json");
const AKASHI_CACHE_VERSION = 4;
const NGA_RECO_URL = "https://bbs.nga.cn/read.php?tid=45999901&_fp=2";
const SECRETARY_ARRANGEMENT_FILE = path.join(__dirname, "data", "secretary_arrangement.json");

const KC_DEV_URL = "https://xn--uesr8qr0rdwk.cn/kc-development-tools/";
const KC_DEV_DATA_URL = KC_DEV_URL + "data/";
const KC_DEV_UPDATE_INTERVAL = 2 * 24 * 60 * 60 * 1000;
const KC_DEV_CACHE_FILE = path.join(__dirname, "runtime_data", "kc_dev_data.json");
const KC_DEV_BUNDLED_FILE = path.join(__dirname, "data", "kc_dev_data.json");
const KC_DEV_CACHE_VERSION = 2;
let kcDevRefreshPromise = null;
const KC_DEV_SPECIAL_EQUIP_ID = 168;
const KC_DEV_POOL_TYPE_LABELS = { 1: "铝开发", 2: "弹开发", 3: "油钢开发" };
const AKASHI_CATEGORY_LABELS = {
  lightGun: "小口径炮",
  mediumGun: "中口径炮",
  heavyGun: "大口径炮",
  secondaryGun: "副炮",
  torpedo: "鱼雷",
  radar: "电探",
  asw: "对潜装备",
  shell: "强化弹",
  antiAircraftGun: "高射炮",
  bulge: "机关部强化",
  searchlight: "探照灯",
  seaplane: "侦察机",
  seaplaneBomber: "水上爆击机",
  landingCraft: "登陆装备",
  fighter: "舰上战斗机",
  diveBomber: "舰上爆击机",
  aircraft: "侦察机",
  torpedoBomber: "舰上攻击机",
  landbasedAircraft: "陆上战斗机",
  landbasedAttacker: "陆上攻击机",
  etc: "其他",
};

const CATEGORY_ORDER = [
  "小口径炮",
  "中口径炮",
  "大口径炮",
  "副炮",
  "高射炮",
  "鱼雷",
  "舰上攻击机",
  "舰上爆击机",
  "舰上战斗机",
  "侦察机",
  "陆上战斗机",
  "陆上攻击机",
  "电探",
  "对潜装备",
  "机关部强化",
  "探照灯",
  "水上爆击机",
  "登陆装备",
  "强化弹",
  "其他",
];

const CATEGORY_ALIASES = {
  "小口径主炮": "小口径炮",
  "中口径主炮": "中口径炮",
  "大口径主炮": "大口径炮",
  "高角炮": "高射炮",
  "舰上侦察机": "侦察机",
  "舰载机": "侦察机",
  "水上侦察机": "侦察机",
  "侦察机": "侦察机",
  "水上爆击机": "水上爆击机",
  "舰上攻击机": "舰上攻击机",
  "舰上爆击机": "舰上爆击机",
  "舰上战斗机": "舰上战斗机",
  "陆上战斗机": "陆上战斗机",
  "陆上攻击机": "陆上攻击机",
  "电探": "电探",
  "对潜装备": "对潜装备",
  "机关部强化": "机关部强化",
  "探照灯": "探照灯",
  "登陆装备": "登陆装备",
  "强化弹": "强化弹",
  "鱼雷": "鱼雷",
  "副炮": "副炮",
  "其他": "其他",
};

const JA_TO_ZH = {
  砲: "炮", 艦: "舰", 戦: "战", 機: "机", 隊: "队", 弾: "弹", 連: "连",
  単: "单", 撃: "击", 対: "对", 潜: "潜", 電: "电", 探: "探", 発: "发",
  徹: "彻", 甲: "甲", 駆: "驱", 護: "护", 敵: "敌", 導: "导", 装: "装",
  魚: "鱼", 雷: "雷", 高: "高", 角: "角", 砲: "炮", 偵: "侦", 察: "察",
  爆: "爆", 攻: "攻", 撃: "击", 戦: "战", 斗: "斗", 飛: "飞", 艇: "艇",
  風: "风", 強: "强", 二: "二", 式: "式", 水: "水",
};

const CSS = `
.kr2-root {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #2f343c;
  color: #f6f7f9;
  font-family: "Microsoft YaHei", "Segoe UI", sans-serif;
  font-size: 14px;
}
.kr2-header {
  padding: 12px 14px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}
.kr2-title-row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 12px;
}
.kr2-title {
  font-size: 18px;
  font-weight: 800;
}
.kr2-title-note {
  margin-top: 2px;
  font-size: 18px;
  color: #ffa94d;
}
.kr2-sub {
  margin-top: 4px;
  color: #abb3bf;
  font-size: 12px;
}
.kr2-reco-source {
  margin-top: 2px;
  color: #abb3bf;
  font-size: 12px;
}
.kr2-link {
  color: #8abbff;
  cursor: pointer;
  text-decoration: underline;
}
.kr2-link:hover {
  color: #a8c8ff;
}
.kr2-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.kr2-days {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 12px;
}
.kr2-day {
  padding: 5px 12px;
  border: 1px solid #5f6b7c;
  border-radius: 6px;
  background: #2f343c;
  color: #f6f7f9;
  cursor: pointer;
  font-size: 13px;
}
.kr2-day:hover {
  background: #383e47;
}
.kr2-day-active {
  background: #2d72d2;
  color: #fff;
  border-color: #2d72d2;
}
.kr2-nav {
  display: flex;
  gap: 6px;
  margin: 0;
}
.kr2-nav-btn {
  min-width: 110px;
  padding: 7px 18px;
  border: 1px solid #5f6b7c;
  border-radius: 6px;
  background: #2f343c;
  color: #f6f7f9;
  cursor: pointer;
  font-size: 13px;
  text-align: center;
}
.kr2-nav-btn:hover {
  background: #383e47;
}
.kr2-nav-active {
  background: #2d72d2;
  border-color: #2d72d2;
  color: #fff;
}
.kr2-plan {
  margin-top: 12px;
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: scroll;
}
.kr2-plan-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.kr2-plan-chips {
  display: flex;
  gap: 8px;
}
.kr2-plan-chip {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  background: #232a33;
  border: 1px solid #3a4450;
  color: #c8d0da;
  cursor: pointer;
}
.kr2-plan-chip:hover {
  background: #1d3048;
  border-color: #4f9dcc;
}
.kr2-plan-summary {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  border: 1px solid #343c46;
  border-radius: 8px;
  overflow: hidden;
  background: #1c2127;
  margin-bottom: 12px;
}
.kr2-plan-sum-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 10px;
  border-right: 1px solid #2a313a;
  font-size: 13px;
  min-width: 0;
}
.kr2-plan-sum-cell:last-child {
  border-right: 0;
}
.kr2-plan-sum-icon {
  font-size: 15px;
  line-height: 1;
}
.kr2-plan-mat-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
}
.kr2-plan-sum-num {
  font-weight: 700;
  color: #f6f7f9;
  white-space: nowrap;
}
.kr2-plan-table {
  border-collapse: separate;
  border-spacing: 0;
}
.kr2-plan-table td {
  border-top: 0;
}
.kr2-plan-table thead th {
  text-align: center;
}
.kr2-plan-table thead th.kr2-plan-mat-th {
  text-align: left;
}
.kr2-plan-table th,
.kr2-plan-table td {
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}
.kr2-plan-table tbody tr:last-child td {
  border-bottom: 0;
}
.kr2-plan-main-table {
  table-layout: fixed;
  width: 100%;
}
.kr2-plan-main-table th,
.kr2-plan-main-table td {
  vertical-align: middle;
}
.kr2-plan-main-table th:nth-child(1),
.kr2-plan-main-table td:nth-child(1) { width: 40px; }
.kr2-plan-main-table th:nth-child(2),
.kr2-plan-main-table td:nth-child(2) { width: 170px; }
.kr2-plan-main-table th:nth-child(3),
.kr2-plan-main-table td:nth-child(3) { width: 90px; }
.kr2-plan-main-table th:nth-child(4),
.kr2-plan-main-table td:nth-child(4) { width: 190px; }
.kr2-plan-main-table th:nth-child(5),
.kr2-plan-main-table td:nth-child(5) { width: 105px; }
.kr2-plan-main-table th:nth-child(6),
.kr2-plan-main-table td:nth-child(6) { width: 90px; }
.kr2-plan-main-table th:nth-child(7),
.kr2-plan-main-table td:nth-child(7) { width: 90px; }
.kr2-plan-main-table td.kr2-plan-mat-col {
  white-space: normal;
  word-break: break-word;
}
.kr2-plan-target-group {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-wrap: wrap;
  width: 100%;
}
.kr2-plan-current {
  font-size: 12px;
}
.kr2-plan-current-stock {
  font-size: 11px;
}
.kr2-plan-bar-left {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}
.kr2-plan-total-label {
  font-size: 12px;
  color: #abb3bf;
}
.kr2-plan-dev-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #ffd54f;
  cursor: pointer;
  white-space: nowrap;
}
.kr2-plan-table td.kr2-plan-mat-col,
.kr2-plan-table td.kr2-plan-consumed {
  text-align: left;
}
.kr2-plan-table td.kr2-plan-name {
  text-align: left;
  vertical-align: middle;
}
.kr2-plan-table .kr2-plan-name-inner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
}
.kr2-plan-evo-target-line {
  color: #4fc3f7;
  font-weight: 700;
  white-space: normal;
  word-break: break-word;
}
.kr2-plan-evo-target-name {
  color: #4fc3f7;
}
.kr2-plan-table .kr2-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
  flex: 0 0 24px;
}
.kr2-plan-qty {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.kr2-plan-qty-btn {
  width: 22px;
  height: 22px;
  border: 1px solid #46515e;
  background: #2f343c;
  color: #e8ebef;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.kr2-plan-qty-btn:hover {
  background: #1d3048;
  border-color: #4f9dcc;
}
.kr2-plan-qty-input {
  width: 42px;
  height: 24px;
  border: 1px solid #46515e;
  border-radius: 4px;
  background: #1c2127;
  color: #f6f7f9;
  text-align: center;
  font-size: 13px;
}
.kr2-plan-mat-btn {
  display: inline-block;
  padding: 3px 10px;
  border: 1px solid #5f6b7c;
  border-radius: 4px;
  background: #2f343c;
  color: #f6f7f9;
  font-size: 12px;
  cursor: pointer;
}
.kr2-plan-mat-btn:hover {
  background: #1d3048;
  border-color: #4f9dcc;
  color: #d6e4f5;
}
.kr2-plan-stock-default {
  color: #f6f7f9;
}
.kr2-plan-stock-low {
  color: #ff6b6b;
  font-weight: 700;
}
.kr2-plan-stock-enough {
  color: #009900;
  font-weight: 700;
}
.kr2-plan-sec {
  margin-top: 16px;
}
.kr2-plan-sec h3 {
  font-size: 14px;
  color: #d6dce3;
  margin-bottom: 8px;
}
.kr2-plan-target-btn {
  min-width: 56px;
  height: 24px;
  padding: 0 8px;
  border: 1px solid #5f6b7c;
  border-radius: 4px;
  background: #2f343c;
  color: #f6f7f9;
  font-size: 12px;
  text-align: center;
  cursor: pointer;
}
.kr2-plan-target-btn.kr2-plan-target-active {
  background: #2d72d2;
  border-color: #2d72d2;
  color: #fff;
}
.kr2-plan-target-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.kr2-level-max-blue {
  color: #4fc3f7;
  font-weight: 700;
}
.kr2-plan-evo-wrap {
  display: inline-block;
  vertical-align: middle;
}
.kr2-plan-evo-btn {
  min-width: 56px;
  height: 24px;
  padding: 0 8px;
  border: 1px solid #5f6b7c;
  border-radius: 4px;
  background: #2f343c;
  color: #f6f7f9;
  font-size: 12px;
  text-align: center;
  white-space: nowrap;
  cursor: pointer;
}
.kr2-plan-evo-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.kr2-plan-evo-btn.kr2-plan-evo-active {
  background: #2d72d2;
  border-color: #2d72d2;
  color: #fff;
}
.kr2-evo-modal {
  width: 420px;
  max-width: 100%;
}
.kr2-evo-scroll {
  max-height: 280px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
}
.kr2-evo-option {
  padding: 8px 10px;
  border: 1px solid #5f6b7c;
  border-radius: 4px;
  background: #2f343c;
  color: #f6f7f9;
  text-align: left;
  font-size: 13px;
  cursor: pointer;
}
.kr2-evo-option:hover {
  background: #383e47;
}
.kr2-evo-option.kr2-evo-option-active {
  background: #1d3048;
  border-color: #4f9dcc;
  color: #d6e4f5;
}

.kr2-strong {
  margin-top: 12px;
  flex: 1;
  min-height: 60vh;
  overflow-x: hidden;
  overflow-y: auto;
}
.kr2-strong-table {
  border-collapse: separate;
  border-spacing: 0;
}
.kr2-strong-cat-th {
  position: relative;
  cursor: pointer;
  user-select: none;
}
.kr2-strong-cat-title {
  margin-right: 4px;
}
.kr2-strong-cat-arrow {
  color: #abb3bf;
  font-size: 11px;
}
.kr2-strong-cat-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 40;
  min-width: 180px;
  background: #252a31;
  border: 1px solid #5f6b7c;
  border-radius: 6px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.kr2-strong-cat-option {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #f6f7f9;
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
}
.kr2-strong-cat-option input {
  margin: 0;
}

.kr2-strong-cat {
  white-space: nowrap;
}
.kr2-strong-table th,
.kr2-strong-table td {
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}
.kr2-strong-table tbody tr:last-child td {
  border-bottom: 0;
}
.kr2-strong-equip {
  text-align: left !important;
  white-space: normal;
}
.kr2-strong-level {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  min-width: 30px;
  height: 20px;
  color: #4fc3f7;
  font-weight: 700;
}
.kr2-strong-target {
  color: #ffffff;
  font-weight: 700;
}
.kr2-strong-stock {
  white-space: normal;
}
.kr2-strong-stock-name {
  color: #ffffff;
  font-weight: 700;
}
.kr2-strong-stock-ok {
  color: #f6f7f9;
}
.kr2-strong-stock-short {
  color: #ff6b6b;
  font-weight: 700;
}
.kr2-strong-stock-missing {
  color: #abb3bf;
}
.kr2-strong-stock-notfound {
  color: #ff6b6b;
  font-weight: 700;
}
.kr2-strong-stock-notfound .kr2-strong-stock-name {
  color: #ff6b6b;
}
.kr2-strong-stock-clear {
  color: #4fc3f7;
  font-weight: 700;
}
.kr2-strong-clear-row {
  background: rgba(79, 195, 247, 0.14);
}
.kr2-strong-owned {
  color: #f6f7f9;
  font-weight: 700;
}
.kr2-strong-owned.kr2-strong-stock-short {
  color: #ff6b6b;
}
.kr2-strong-owned.kr2-strong-stock-clear {
  color: #4fc3f7;
}
.kr2-strong-clear-row td {
  color: #4fc3f7;
}
.kr2-strong-clear-row .kr2-strong-target,
.kr2-strong-clear-row .kr2-strong-stock-name,
.kr2-strong-clear-row .kr2-strong-owned {
  color: #4fc3f7;
}
.kr2-search {
  width: 240px;
  padding: 6px 10px;
  border: 1px solid #5f6b7c;
  border-radius: 6px;
  background: #2f343c;
  color: #f6f7f9;
  font-size: 14px;
  outline: none;
}
.kr2-search:focus {
  border-color: #4f9dcc;
  box-shadow: 0 0 0 2px rgba(79, 157, 204, 0.25);
}
.kr2-button {
  padding: 6px 12px;
  border: 1px solid #5f6b7c;
  border-radius: 6px;
  background: #2f343c;
  color: #f6f7f9;
  cursor: pointer;
  font-size: 13px;
}
.kr2-button:hover {
  background: #383e47;
}
.kr2-list-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: #1c2127;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  color: #abb3bf;
  font-size: 12px;
}
.kr2-head-name {
  flex: 1 1 0;
  min-width: 0;
  padding-left: 82px;
}
.kr2-head-secretary {
  flex: 1 1 0;
  min-width: 0;
  text-align: center;
}
.kr2-head-meta {
  flex: 1 1 0;
  min-width: 0;
  text-align: center;
}
.kr2-head-reco {
  flex: 1 1 0;
  min-width: 0;
  text-align: center;
}
.kr2-head-reco .kr2-sort-btn {
  white-space: nowrap;
}
.kr2-list {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: scroll;
}
.kr2-plan::-webkit-scrollbar,
.kr2-strong::-webkit-scrollbar,
.kr2-list::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.kr2-plan::-webkit-scrollbar-track,
.kr2-strong::-webkit-scrollbar-track,
.kr2-list::-webkit-scrollbar-track {
  background: #1c2127;
}
.kr2-plan::-webkit-scrollbar-thumb,
.kr2-strong::-webkit-scrollbar-thumb,
.kr2-list::-webkit-scrollbar-thumb {
  background: #5f6b7c;
  border-radius: 5px;
}
.kr2-plan::-webkit-scrollbar-thumb:hover,
.kr2-strong::-webkit-scrollbar-thumb:hover,
.kr2-list::-webkit-scrollbar-thumb:hover {
  background: #8b95a1;
}

.kr2-dropdown {
  position: relative;
}
.kr2-cat {
  width: 140px;
  padding: 6px 10px;
  border: 1px solid #5f6b7c;
  border-radius: 6px;
  background: #2f343c;
  color: #f6f7f9;
  font-size: 13px;
  outline: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  cursor: pointer;
  text-align: left;
}
.kr2-cat-arrow {
  color: #abb3bf;
  font-size: 11px;
}
.kr2-cat-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 20;
  width: 170px;
  max-height: 220px;
  overflow-y: scroll;
  border: 1px solid #5f6b7c;
  border-radius: 6px;
  background: #252a31;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.55);
}
.kr2-cat-option {
  padding: 7px 10px;
  color: #f6f7f9;
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;
}
.kr2-cat-option:hover {
  background: #383e47;
}
.kr2-cat-option-active {
  background: #2d72d2;
  color: #fff;
}
.kr2-cat-menu::-webkit-scrollbar {
  width: 10px;
}
.kr2-cat-menu::-webkit-scrollbar-track {
  background: #1c2127;
}
.kr2-cat-menu::-webkit-scrollbar-thumb {
  background: #5f6b7c;
  border-radius: 5px;
}
.kr2-status {
  color: #abb3bf;
  font-size: 12px;
}
.kr2-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  user-select: none;
}
.kr2-row:hover {
  background: #252a31;
}
.kr2-row-not-improveable {
  color: #abb3bf;
  cursor: default;
}
.kr2-row-not-improveable .kr2-name,
.kr2-row-not-improveable .kr2-secretary,
.kr2-row-not-improveable .kr2-meta {
  color: #abb3bf;
}
.kr2-reco-empty {
  min-height: 34px;
}
.kr2-not-improveable-group {
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}
.kr2-collapse-toggle {
  width: 100%;
  padding: 10px 14px;
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: #252a31;
  color: #abb3bf;
  text-align: center;
  font-size: 14px;
  cursor: pointer;
}
.kr2-collapse-toggle:hover {
  background: #2f343c;
}
.kr2-improveable-group {
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}
.kr2-fav-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.kr2-fav-btn {
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #5f6b7c;
  border-radius: 4px;
  background: #2f343c;
  color: #8b95a1;
  font-size: 13px;
  cursor: pointer;
}
.kr2-fav-btn:hover {
  background: #383e47;
  color: #ffd166;
}
.kr2-fav-btn.kr2-fav-active {
  background: #4a2f17;
  border-color: #ffd166;
  color: #ffd166;
}
.kr2-fav-toggle {
  margin-left: auto;
}
.kr2-fav-toggle.kr2-fav-active {
  background: #4a2f17;
  border-color: #ffd166;
  color: #ffd166;
}
.kr2-expand {
  position: relative;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #5f6b7c;
  border-radius: 6px;
  background: #2f343c;
  cursor: pointer;
  overflow: hidden;
}
.kr2-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.kr2-arrow {
  position: absolute;
  right: 1px;
  bottom: 1px;
  padding: 0 2px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.12);
  color: #abb3bf;
  font-size: 9px;
  line-height: 1.2;
}
.kr2-name {
  flex: 1 1 0;
  min-width: 0;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.kr2-secretary {
  flex: 1 1 0;
  min-width: 0;
  text-align: center;
  white-space: normal;
  overflow: visible;
  line-height: 1.5;
}
.kr2-meta {
  flex: 1 1 0;
  min-width: 0;
  text-align: center;
  white-space: normal;
  overflow: visible;
  line-height: 1.5;
}
.kr2-reco {
  flex: 1 1 0;
  min-width: 0;
  color: #abb3bf;
  font-size: 12px;
  white-space: nowrap;
  text-align: center;
}
.kr2-reco-line {
  display: block;
  line-height: 1.5;
}
.kr2-reco-label {
  display: inline-block;
  width: 4.4em;
  text-align: left;
  margin-right: 4px;
  color: #8b95a1;
}
.kr2-stars {
  color: #ff6b6b;
  font-weight: 700;
}
.kr2-stars-priority {
  color: #ff6b6b;
}
.kr2-stars-activity {
  color: #ff9e9e;
}
.kr2-detail {
  padding: 4px 14px 14px;
  background: #1c2127;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}
.kr2-phase {
  margin-top: 12px;
  border: 1px solid #383e47;
  border-radius: 6px;
  overflow: hidden;
}
.kr2-phase-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 8px 10px;
  background: #252a31;
}
.kr2-level-head {
  cursor: pointer;
  user-select: none;
}
.kr2-level-head:hover {
  background: #2f343c;
}
.kr2-phase-title {
  font-weight: 700;
}
.kr2-phase-res {
  color: #abb3bf;
  font-size: 12px;
}
.kr2-table {
  width: 100%;
  table-layout: auto;
  border-collapse: collapse;
  background: #1c2127;
}
.kr2-table th {
  padding: 7px 10px;
  background: #252a31;
  color: #f6f7f9;
  font-size: 12px;
  text-align: left;
  white-space: nowrap;
}
.kr2-table td {
  padding: 7px 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  white-space: nowrap;
}
.kr2-rate-table th:not(:first-child),
.kr2-rate-table td:not(:first-child) {
  text-align: center;
}
.kr2-rate-table .kr2-material-cell {
  align-items: center;
}
.kr2-rate-evol-cell {
  white-space: normal;
}
.kr2-evol-target {
  color: #4f9dcc;
}
.kr2-evol-secretaries {
  margin-top: 2px;
  color: #abb3bf;
  font-size: 11px;
  white-space: normal;
}
.kr2-table tbody tr:hover td,
.kr2-rate-row:hover td {
  background: #2f343c;
}
.kr2-rate-btn {
  display: inline-block;
  min-width: 116px;
  padding: 2px 10px;
  border: 1px solid #5f6b7c;
  border-radius: 4px;
  background: #2f343c;
  color: #f6f7f9;
  white-space: nowrap;
  text-align: center;
}
.kr2-rate-btn-open {
  background: #1d3048;
  border-color: #4f9dcc;
}
.kr2-rate-btn-ensure {
  color: var(--poi-yellow, #ffd166);
}
.kr2-rate-btn-save {
  color: var(--poi-green, #7fd6a4);
}
.kr2-material-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}
.kr2-rare-warning {
  color: #ff6b6b;
  font-size: 11px;
  white-space: nowrap;
}
.kr2-material-list {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}
.kr2-material-item {
  padding: 4px 10px;
  border: 1px solid #5f6b7c;
  border-radius: 4px;
  background: #2f343c;
  color: #f6f7f9;
  font-size: 12px;
}
.kr2-material-btn {
  cursor: pointer;
}
.kr2-material-btn:hover {
  background: #1d3048;
  border-color: #4f9dcc;
  color: #d6e4f5;
}
.kr2-material-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}
.kr2-stock-btn {
  padding: 2px 8px;
  border: 1px solid #5f6b7c;
  border-radius: 4px;
  background: #2f343c;
  color: #8abbff;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
}
.kr2-stock-btn:hover {
  background: #1d3048;
  border-color: #4f9dcc;
  color: #d6e4f5;
}
.kr2-stock-text {
  color: #8abbff;
  font-size: 11px;
  white-space: nowrap;
}
.kr2-stock-label {
  color: #f6f7f9;
}
.kr2-stock-qty {
  color: #f6f7f9;
}
.kr2-stock-qty.kr2-stock-low {
  color: #ff6b6b;
}
.kr2-stock-qty.kr2-stock-enough {
  color: #009900;
}
.kr2-inv-table {
  width: 100%;
}
.kr2-inv-table th,
.kr2-inv-table td {
  padding: 6px 10px;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.kr2-material-empty {
  color: #abb3bf;
  font-size: 12px;
}
.kr2-material-col {
  text-align: right;
  white-space: normal;
}
.kr2-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.kr2-modal {
  width: 760px;
  max-width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: #1c2127;
  border: 1px solid #383e47;
  border-radius: 8px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55);
  overflow: hidden;
}
.kr2-modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  background: #252a31;
  flex-wrap: wrap;
}
.kr2-modal-title {
  font-size: 16px;
  font-weight: 800;
}
.kr2-modal-sub {
  color: #abb3bf;
  font-size: 12px;
  margin-top: 2px;
}
.kr2-modal-actions {
  display: flex;
  gap: 8px;
}
.kr2-dev-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
.kr2-dev-scroll::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.kr2-dev-scroll::-webkit-scrollbar-track {
  background: #1c2127;
}
.kr2-dev-scroll::-webkit-scrollbar-thumb {
  background: #5f6b7c;
  border-radius: 5px;
}
.kr2-dev-scroll::-webkit-scrollbar-thumb:hover {
  background: #8b95a1;
}
.kr2-sort-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border: 1px solid #5f6b7c;
  border-radius: 4px;
  background: #2f343c;
  color: #abb3bf;
  font-size: 12px;
  cursor: pointer;
}
.kr2-sort-btn:hover {
  background: #383e47;
  color: #f6f7f9;
}
.kr2-sort-btn.kr2-sort-active {
  background: #1d3048;
  border-color: #4f9dcc;
  color: #f6f7f9;
}
.kr2-sort-arrow {
  font-size: 9px;
  line-height: 1;
}
.kr2-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}
.kr2-badge-save {
  background: #173a29;
  color: var(--poi-green, #7fd6a4);
}
.kr2-badge-ensure {
  background: #4a2f17;
  color: var(--poi-yellow, #ffd166);
}
.kr2-badge-same {
  background: #2b3a49;
  color: #abb3bf;
}
.kr2-empty {
  padding: 40px;
  text-align: center;
  color: #abb3bf;
}
.kr2-error {
  margin: 14px;
  padding: 12px;
  border: 1px solid #7a3a3a;
  border-radius: 6px;
  background: #241a1a;
  color: #ffb3b3;
  white-space: pre-wrap;
  word-break: break-word;
}
`

function normalizeText(value) {
  let s = String(value == null ? "" : value).toLowerCase().trim()
  s = s.replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
  s = s.replace(/[\s·・、,，.。!！?？:：;；"'()（）\[\]【】\-\/_]+/g, "")
  let out = ""
  for (const ch of s) {
    if (Object.prototype.hasOwnProperty.call(JA_TO_ZH, ch)) out += JA_TO_ZH[ch]
    else out += ch
  }
  return out
}

function fuzzyScore(row, query) {
  const target = row.searchText || ""
  if (!target) return 0
  if (target.includes(query)) return 1000 + (100 - target.length)
  let score = 0
  let ti = 0
  for (const ch of query) {
    const found = target.indexOf(ch, ti)
    if (found < 0) return 0
    score += 1
    ti = found + 1
  }
  return score + (100 - target.length)
}

function translateTypeName(name) {
  if (!name) return ""
  return normalizeText(name)
}

function parseAkashiWeeks(html) {
  const weeks = {}
  const re = /weaponWeeks\.w(\d+)="([^"]+)"/g
  let m
  while ((m = re.exec(html))) {
    const days = m[2].split(",").map((d) => {
      if (d === "sun") return "sunday"
      if (d === "mon") return "monday"
      if (d === "tue") return "tuesday"
      if (d === "wed") return "wednesday"
      if (d === "thu") return "thursday"
      if (d === "fry") return "friday"
      if (d === "sat") return "saturday"
      return null
    }).filter(Boolean)
    weeks[m[1]] = days
  }
  return weeks
}

function parseAkashiOrder(html) {
  const m = html.match(/O=\[(.*?)\];function we/s)
  if (!m) return []
  const out = []
  const re = /\{id:"(\d+)"/g
  let obj
  while ((obj = re.exec(m[1]))) out.push(obj[1])
  return out
}

function parseAkashiCategories(html) {
  const categories = {}
  const m = html.match(/O=\[(.*?)\];function we/s)
  if (!m) return categories
  const typeVars = {}
  const varRe = /(?:^|[;,]\s*)([A-Za-z_$][\w$]*)\s*=\s*"([A-Za-z][A-Za-z ]*)"/g
  let vm
  while ((vm = varRe.exec(html))) {
    typeVars[vm[1]] = vm[2]
  }
  const re = /\{([^{}]*)\}/g
  let obj
  while ((obj = re.exec(m[1]))) {
    const body = obj[1]
    const idMatch = body.match(/id:"(\d+)"/)
    const typeMatch = body.match(/type:("([a-zA-Z]+)"|([A-Za-z_$][\w$]*))/)
    if (!idMatch || !typeMatch) continue
    const type = typeMatch[2] || typeVars[typeMatch[3]] || ""
    categories[idMatch[1]] = {
      type,
      reco: body.includes("reco:!0"),
    }
  }
  return categories
}

function parseAkashiWeapons(html) {
  const weapons = {}
  const parts = html.split('<div class=weapon id=w')
  for (let i = 1; i < parts.length; i += 1) {
    const chunk = parts[i]
    const idMatch = chunk.match(/^(\d+)/)
    if (!idMatch) continue
    const next = chunk.indexOf('<div class=weapon id=w')
    const block = next >= 0 ? chunk.slice(0, next) : chunk
    const alt = block.match(/\d+:([^">]+)/)
    const kit = block.match(/remodelkit[^>]*>([^<]+)</)
    weapons[idMatch[1]] = {
      name: alt ? alt[1] : "",
      remodelKit: kit ? kit[1].trim() : "",
    }
  }
  return weapons
}

function parseAkashiHtml(html) {
  const weeks = parseAkashiWeeks(html)
  const categories = parseAkashiCategories(html)
  const weapons = parseAkashiWeapons(html)
  const order = parseAkashiOrder(html)
  const merged = {}
  for (const id of Object.keys(weapons)) {
    const cat = categories[id] || {}
    merged[id] = {
      name: weapons[id].name,
      remodelKit: weapons[id].remodelKit,
      type: cat.type || "",
      reco: !!cat.reco,
      weeks: weeks[id] || [],
    }
  }
  return { updatedAt: new Date().toISOString(), weapons: merged, order }
}

function parseAkashiSupportShips(html) {
  const start = html.indexOf('<div class=support-ship-table>')
  if (start < 0) return { any: true, days: {} }
  const end = html.indexOf('</table>', start)
  if (end < 0) return { any: true, days: {} }
  const section = html.slice(start, end)
  const parts = section.split('<div class=support-ship>')
  const result = { any: false, days: {} }
  const dayChars = ["日", "月", "火", "水", "木", "金", "土"]
  const siteDayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
  let named = 0
  for (let i = 1; i < parts.length; i += 1) {
    const block = parts[i].split('<div class=support-ship>')[0]
    const weeksMatch = block.match(/<div class=["']?weeks[^>]*>([\s\S]*?)<\/div>/)
    if (!weeksMatch) continue
    const weeks = []
    for (let d = 0; d < 7; d += 1) {
      if (weeksMatch[1].indexOf('<span class=enable>' + dayChars[d] + '</span>') >= 0) weeks.push(siteDayKeys[d])
    }
    const after = block.slice(block.indexOf(weeksMatch[0]) + weeksMatch[0].length)
    const nameMatch = after.match(/^\s*(.*?)\s*<\/div>/)
    const raw = nameMatch ? nameMatch[1] : ""
    const name = raw.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim()
    if (!name || name === "-") continue
    named += 1
    for (const day of weeks) {
      const list = result.days[day] || (result.days[day] = [])
      if (list.indexOf(name) < 0) list.push(name)
    }
  }
  if (named === 0) return { any: true, days: {} }
  return result
}

async function fetchAkashiSupportShips(ids) {
  const list = (ids || []).map((id) => String(id))
  const map = {}
  let cursor = 0
  async function worker() {
    while (cursor < list.length) {
      const id = list[cursor]
      cursor += 1
      try {
        const res = await httpFetch(AKASHI_URL + "detail/w" + String(id).padStart(3, "0") + ".html")
        if (!res.ok) continue
        const html = await res.text()
        map[id] = parseAkashiSupportShips(html)
      } catch (_) {}
    }
  }
  const count = Math.min(8, list.length)
  const workers = []
  for (let i = 0; i < count; i += 1) workers.push(worker())
  await Promise.all(workers)
  return map
}

function readAkashiCache() {
  try {
    if (fs.existsSync(AKASHI_CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(AKASHI_CACHE_FILE, "utf8"))
      if (!data || data.cacheVersion !== AKASHI_CACHE_VERSION) return null
      return data
    }
  } catch (_) {}
  return null
}

function writeAkashiCache(data) {
  try {
    fs.mkdirSync(path.dirname(AKASHI_CACHE_FILE), { recursive: true })
    data.cacheVersion = AKASHI_CACHE_VERSION
    fs.writeFileSync(AKASHI_CACHE_FILE, JSON.stringify(data), "utf8")
  } catch (_) {}
}

async function httpFetch(url) {
  if (typeof fetch === "function") return fetch(url, { cache: "no-store" })
  if (typeof window !== "undefined" && typeof window.fetch === "function") return window.fetch(url, { cache: "no-store" })
  throw new Error("fetch unavailable")
}

async function checkAkashiUpdate(force) {
  const cached = readAkashiCache()
  const fresh = cached && cached.updatedAt && Date.now() - new Date(cached.updatedAt).getTime() < AKASHI_UPDATE_INTERVAL
  if (!force && fresh) {
    return { ok: true, skipped: true, data: cached }
  }
  try {
    const res = await httpFetch(AKASHI_URL)
    if (!res.ok) throw new Error("akashi http " + res.status)
    const html = await res.text()
    const data = parseAkashiHtml(html)
    const ids = data.order && data.order.length > 0 ? data.order : Object.keys(data.weapons)
    try {
      data.supportShips = await fetchAkashiSupportShips(ids)
    } catch (_) {
      data.supportShips = {}
    }
    writeAkashiCache(data)
    return { ok: true, skipped: false, data }
  } catch (error) {
    if (cached) return { ok: false, skipped: false, data: cached, error: String(error && (error.stack || error)) }
    throw error
  }
}

function readKcDevCache() {
  try {
    if (fs.existsSync(KC_DEV_CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(KC_DEV_CACHE_FILE, "utf8"))
      if (!data || data.cacheVersion !== KC_DEV_CACHE_VERSION) return null
      return data
    }
  } catch (_) {}
  return null
}

function writeKcDevCache(data) {
  try {
    fs.mkdirSync(path.dirname(KC_DEV_CACHE_FILE), { recursive: true })
    data.cacheVersion = KC_DEV_CACHE_VERSION
    fs.writeFileSync(KC_DEV_CACHE_FILE, JSON.stringify(data), "utf8")
  } catch (_) {}
}

async function fetchJson(url) {
  const res = await httpFetch(url)
  if (!res.ok) throw new Error("kc-dev http " + res.status)
  return res.json()
}

function loadBundledKcDevData() {
  try {
    return JSON.parse(fs.readFileSync(KC_DEV_BUNDLED_FILE, "utf8"))
  } catch (_) {
    return null
  }
}

async function refreshKcDevData() {
  if (!kcDevRefreshPromise) {
    kcDevRefreshPromise = loadKcDevData(true).finally(() => {
      kcDevRefreshPromise = null
    })
  }
  return kcDevRefreshPromise
}

async function loadKcDevData(force) {
  const cached = readKcDevCache()
  const fresh = cached && cached.updatedAt && Date.now() - new Date(cached.updatedAt).getTime() < KC_DEV_UPDATE_INTERVAL
  if (!force && fresh) return cached
  if (!force) {
    const bundled = loadBundledKcDevData()
    if (bundled) {
      refreshKcDevData().catch(() => {})
      return bundled
    }
  }
  try {
    const [pools, start2, ctype] = await Promise.all([
      fetchJson(KC_DEV_DATA_URL + "DevelopmentPool.json"),
      fetchJson(KC_DEV_DATA_URL + "start2.json"),
      fetchJson(KC_DEV_DATA_URL + "ctype.json"),
    ])
    const equip = {}
    for (const row of start2.api_mst_slotitem || []) {
      if (!row || row.api_id == null) continue
      equip[String(row.api_id)] = {
        id: Number(row.api_id),
        name: String(row.api_name || ""),
        broken: Array.isArray(row.api_broken) ? row.api_broken.map((v) => Number(v) || 0) : [0, 0, 0, 0],
        types: Array.isArray(row.api_type) ? row.api_type.map((v) => Number(v) || 0) : [],
      }
    }
    const shipMap = {}
    for (const row of start2.api_mst_ship || []) {
      if (!row || row.api_id == null) continue
      shipMap[String(row.api_id)] = {
        id: Number(row.api_id),
        name: String(row.api_name || ""),
        stype: Number(row.api_stype || 0),
        ctype: Number(row.api_ctype || 0),
        afterid: Number(row.api_aftershipid || 0),
      }
    }
    const order = (start2.api_mst_ship || []).map((row) => Number(row.api_id))
    const sameShipMap = buildKcDevSameShipMap(shipMap)
    const enrichedPools = enrichKcDevPools(pools, ctype, shipMap, sameShipMap, order)
    const data = { cacheVersion: KC_DEV_CACHE_VERSION, updatedAt: new Date().toISOString(), pools: enrichedPools, equip }
    writeKcDevCache(data)
    return data
  } catch (error) {
    if (cached) return cached
    const bundled = loadBundledKcDevData()
    if (bundled) return bundled
    throw error
  }
}

function kcDevFormula(poolId, selectedIds, equip) {
  const base = [10, 10, 10, 10]
  if (selectedIds.indexOf(KC_DEV_SPECIAL_EQUIP_ID) >= 0) {
    base[0] = 240
    base[1] = 260
    base[3] = 250
  }
  for (const id of selectedIds) {
    const item = equip[String(id)]
    if (item) {
      for (let b = 0; b < 4; b += 1) base[b] = Math.max(base[b], item.broken[b] * 10)
    }
  }
  if (poolId === 1) {
    const c = [...base]
    if (c[3] <= c[0]) c[3] = c[0] + 1
    if (c[3] <= c[1]) c[3] = c[1] + 1
    if (c[3] <= c[2]) c[3] = c[2] + 1
    return [c]
  }
  if (poolId === 2) {
    const c = [...base]
    if (c[1] <= c[0]) c[1] = c[0] + 1
    if (c[1] <= c[2]) c[1] = c[2] + 1
    if (c[1] < c[3]) c[1] = c[3]
    return [c]
  }
  const fuelDominant = base[0] >= base[1] && base[0] >= base[3]
  const steelDominant = base[2] >= base[1] && base[2] >= base[3]
  if (fuelDominant || steelDominant) return [[...base]]
  const fuelFormula = [...base]
  if (fuelFormula[0] < fuelFormula[1]) fuelFormula[0] = fuelFormula[1]
  if (fuelFormula[0] < fuelFormula[3]) fuelFormula[0] = fuelFormula[3]
  const steelFormula = [...base]
  if (steelFormula[2] < steelFormula[1]) steelFormula[2] = steelFormula[1]
  if (steelFormula[2] < steelFormula[3]) steelFormula[2] = steelFormula[3]
  return [fuelFormula, steelFormula]
}

const KC_DEV_STYPE_IDS = {
  NULL: 0, DE: 1, DD: 2, CL: 3, CLT: 4, CA: 5, CAV: 6, CVL: 7,
  FBB: 8, BB: 9, BBV: 10, CV: 11, 超弩級戦艦: 12, SS: 13, SSV: 14,
  敌AO: 15, AV: 16, LHA: 17, CVB: 18, AR: 19, AS: 20, CT: 21, AO: 22,
};

function buildKcDevSameShipMap(shipMap) {
  const ids = Object.keys(shipMap).map(Number).sort((a, b) => a - b)
  const ships = new Map()
  for (const id of ids) if (id < 1500 && shipMap[id]) ships.set(id, shipMap[id])
  const visited = new Set()
  const groups = []
  const targets = new Set()
  for (const ship of ships.values()) if (ship.afterid !== 0) targets.add(ship.afterid)
  const makeGroup = (id) => ({ name: (ships.get(id) || {}).name || "", ids: [] })
  const collect = (id, group, seen) => {
    if (seen.has(id) || visited.has(id)) return
    group.ids.push(id)
    seen.add(id)
    visited.add(id)
    const ship = ships.get(id)
    if (ship && ship.afterid !== 0 && ships.has(ship.afterid)) collect(ship.afterid, group, seen)
  }
  for (const id of ships.keys()) {
    if (targets.has(id) || visited.has(id)) continue
    const group = makeGroup(id)
    collect(id, group, new Set())
    groups.push(group)
  }
  const chain = (id) => {
    const out = []
    const seen = new Set()
    let cur = id
    while (cur !== 0 && ships.has(cur)) {
      if (seen.has(cur)) return out
      out.push(cur)
      seen.add(cur)
      cur = ships.get(cur).afterid
    }
    return []
  }
  const collectCycle = (id, group, seen, pool) => {
    if (seen.has(id) || !pool.has(id)) return
    group.ids.push(id)
    seen.add(id)
    visited.add(id)
    const ship = ships.get(id)
    if (ship && ship.afterid !== 0 && ships.has(ship.afterid) && pool.has(ship.afterid)) {
      collectCycle(ship.afterid, group, seen, pool)
    }
  }
  let remaining = [...ships.keys()].filter((id) => !visited.has(id))
  while (remaining.length > 0) {
    const path = chain(remaining[0])
    if (path.length === 0) throw new Error("kc-dev same-ship chain failed")
    const maxId = Math.max(...path)
    const group = makeGroup(maxId)
    collectCycle(maxId, group, new Set(), new Set(path))
    groups.push(group)
    for (const id of path) visited.add(id)
    remaining = [...ships.keys()].filter((id) => !visited.has(id))
  }
  const all = {}
  for (const group of groups) for (const id of group.ids) if (all[id] == null) all[id] = group
  return all
}

function kcDevResolveShipNames(names, shipMap, sameShipMap, order, exact) {
  const out = []
  if (exact) {
    for (const ship of Object.values(shipMap)) if (names.indexOf(ship.name) >= 0) out.push(ship.id)
    return out
  }
  for (const name of names) {
    const found = order.find((id) => (shipMap[String(id)] || {}).name === name)
    if (found == null) return out
    const group = sameShipMap[String(found)]
    if (!group) continue
    let started = false
    for (const id of group.ids) {
      if (id === found) {
        out.push(id)
        started = true
      } else if (started) {
        out.push(id)
      }
    }
  }
  return out
}

function enrichKcDevPools(pools, ctypeMap, shipMap, sameShipMap, order) {
  const out = []
  for (const raw of pools || []) {
    const pool = Object.assign({}, raw, {
      舰ID: Array.isArray(raw.舰ID) ? raw.舰ID.slice() : [],
      不包含舰ID: Array.isArray(raw.不包含舰ID) ? raw.不包含舰ID.slice() : [],
      舰名: Array.isArray(raw.舰名) ? raw.舰名.slice() : [],
      舰种: Array.isArray(raw.舰种) ? raw.舰种.slice() : [],
      舰型: Array.isArray(raw.舰型) ? raw.舰型.slice() : [],
    })
    if (pool.舰种 && pool.舰种.length) {
      const types = []
      for (const name of pool.舰种) {
        const id = KC_DEV_STYPE_IDS[name]
        if (typeof id === "number") types.push(id)
      }
      for (const [id, ship] of Object.entries(shipMap)) {
        const nid = Number(id)
        if (nid < 1500 && types.indexOf(ship.stype) >= 0) pool.舰ID.push(nid)
      }
    }
    if (pool.舰型 && pool.舰型.length) {
      const types = []
      for (const value of pool.舰型) {
        const num = Number(value)
        if (!Number.isNaN(num)) {
          types.push(num)
          continue
        }
        for (const [ctypeId, name] of Object.entries(ctypeMap || {})) {
          if (name === value) {
            types.push(Number(ctypeId))
            break
          }
        }
      }
      for (const [id, ship] of Object.entries(shipMap)) {
        const nid = Number(id)
        if (nid < 1500 && types.indexOf(ship.ctype) >= 0) pool.舰ID.push(nid)
      }
    }
    if (pool.舰名 && pool.舰名.length) {
      pool.舰ID.push(...kcDevResolveShipNames(pool.舰名, shipMap, sameShipMap, order, false))
    }
    if (pool.不包含舰ID) {
      for (const removeId of pool.不包含舰ID) {
        const idx = pool.舰ID.indexOf(removeId)
        if (idx >= 0) pool.舰ID.splice(idx, 1)
      }
    }
    pool.舰ID集 = pool.舰ID.slice()
    out.push(pool)
  }
  return out
}

function kcDevShipSetContains(shipSet, baseSet) {
  const has = new Set(shipSet || [])
  for (const id of baseSet || []) if (!has.has(id)) return false
  return true
}

function kcDevRecipes(data, equipId) {
  const selectedId = Number(equipId)
  const selectedIds = [selectedId]
  const pools = data.pools || []
  const existNames = []
  const seen = {}
  for (const pool of pools) {
    const poolId = Number(pool.开发池ID)
    if (poolId >= 0 && !pool.最低资源 && !seen[pool.开发池名称]) {
      seen[pool.开发池名称] = true
      existNames.push(pool.开发池名称)
    }
  }
  const out = []
  const special = selectedIds.indexOf(KC_DEV_SPECIAL_EQUIP_ID) >= 0
  for (const name of existNames) {
    for (let d = 1; d <= 3; d += 1) {
      const base = pools.find((pool) => pool.开发池名称 === name && Number(pool.开发池ID) === d)
      if (!base) continue
      const rates = new Map()
      for (const pool of pools) {
        if (Math.abs(Number(pool.开发池ID)) !== d) continue
        if (!kcDevShipSetContains(pool.舰ID集, base.舰ID集)) continue
        const entries = pool.出货率 || {}
        const poolId = Number(pool.开发池ID)
        if (special || poolId > 0) {
          for (const [k, v] of Object.entries(entries)) {
            const id = Number(k)
            rates.set(id, (rates.get(id) || 0) + (Number(v) || 0))
          }
        } else {
          for (const k of Object.keys(entries)) {
            const id = Number(k)
            if (!rates.has(id)) rates.set(id, 0)
          }
        }
      }
      const rate = rates.get(selectedId) || 0
      if (rate <= 0) continue
      for (const formula of kcDevFormula(d, selectedIds, data.equip)) {
        let otherFail = 0
        for (const [id, v] of rates) {
          if (id === selectedId) continue
          const item = data.equip[String(id)]
          if (!item) continue
          let producible = true
          for (let p = 0; p < 4; p += 1) {
            if (formula[p] < item.broken[p] * 10) {
              producible = false
              break
            }
          }
          if (producible) otherFail += v
        }
        out.push({
          poolName: name,
          poolId: d,
          poolType: KC_DEV_POOL_TYPE_LABELS[d] || "",
          formula,
          total: formula.reduce((a, b) => a + b, 0),
          rate,
          failRate: 100 - rate - otherFail,
        })
      }
    }
  }
  out.sort((a, b) => {
    if (a.rate !== b.rate) return b.rate - a.rate
    if (a.failRate !== b.failRate) return b.failRate - a.failRate
    if (Math.abs(a.total - b.total) > 1) return a.total - b.total
    return 0
  })
  return out
}

let kcDevBestCache = {}
let kcDevBestCacheKey = ""
function kcDevBestFormula(data, equipId) {
  if (!data) return null
  const dataKey = String(data.updatedAt || data.generatedAt || "bundled")
  if (kcDevBestCacheKey !== dataKey) {
    kcDevBestCache = {}
    kcDevBestCacheKey = dataKey
  }
  const key = String(equipId)
  if (Object.prototype.hasOwnProperty.call(kcDevBestCache, key)) return kcDevBestCache[key]
  const bestList = kcDevRecipes(data, key).slice().sort((a, b) => b.rate - a.rate || a.failRate - b.failRate || (Math.abs(a.total - b.total) > 1 ? a.total - b.total : 0))
  const best = bestList.length ? bestList[0] : null
  kcDevBestCache[key] = best
  return best
}

function openExternalUrl(url) {
  try {
    let remote = null
    try {
      remote = require("@electron/remote")
    } catch (_) {}
    if (!remote) {
      try {
        remote = require("electron").remote
      } catch (_) {}
    }
    if (remote && remote.shell && typeof remote.shell.openExternal === "function") {
      remote.shell.openExternal(url)
      return
    }
  } catch (_) {}
  if (typeof window !== "undefined" && typeof window.open === "function") window.open(url, "_blank")
}

function loadRecommendations() {
  try {
    const data = require("./data/recommend.json") || {}
    return data.byEquip || {}
  } catch (_) {
    return {}
  }
}

function loadSecretaryArrangement(akashiData) {
  if (akashiData && akashiData.supportShips && typeof akashiData.supportShips === "object") {
    return akashiData.supportShips
  }
  try {
    return JSON.parse(fs.readFileSync(SECRETARY_ARRANGEMENT_FILE, "utf8"))
  } catch (_) {
    return {}
  }
}

function recommendStarValues(row) {
  const rec = row && row.recommend
  const priority = rec && Number.isFinite(Number(rec.priority)) ? Number(rec.priority) : 0
  const activity = rec && Number.isFinite(Number(rec.activity)) ? Number(rec.activity) : 0
  return { priority, activity }
}

function secretaryText(secretaries, day) {
  if (!secretaries) return "-"
  if (secretaries.any) return "任意"
  const list =
    day === ALL_DAYS_KEY
      ? WEEKDAY_KEYS.reduce((acc, d) => {
          for (const label of secretaries.days[d] || []) {
            if (acc.indexOf(label) < 0) acc.push(label)
          }
          return acc
        }, [])
      : secretaries.days[day] || []
  return list.length > 0 ? list.join("/") : "-"
}

function starText(n) {
  const v = Number(n)
  if (!Number.isFinite(v) || v <= 0) return ""
  let out = ""
  const full = Math.floor(v)
  for (let k = 0; k < full; k += 1) out += "★"
  if (v - full >= 0.25) out += "☆"
  return out
}

function loadJson(name) {
  try {
    return require("./data/" + name)
  } catch (_) {}
  try {
    return require("poi-plugin-kai-planner/src/data/static/" + name)
  } catch (_) {}
  return null
}

function toInt(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function loadStaticData() {
  const improvementArrangement = loadJson("improvement_arrangement.json") || []
  const improvementUpgradeTarget = loadJson("improvement_upgrade_target.json") || []
  const improvementConsumeStep = loadJson("improvement_consume_step.json") || []
  const improvementConsumeItem = loadJson("improvement_consume_item.json") || []
  const equipBaseCost = loadJson("equip_base_cost.json") || []
  const dataManifest = loadJson("data_manifest.json") || {}

  const materialsByStep = {}
  for (const r of improvementConsumeItem || []) {
    const key = String(r.step_id)
    if (!materialsByStep[key]) materialsByStep[key] = []
    materialsByStep[key].push({
      item_equipment_id: r.item_equipment_id == null ? null : toInt(r.item_equipment_id),
      item_material_key: r.item_material_key == null ? null : String(r.item_material_key),
      item_name: String(r.item_name || ""),
      count: toInt(r.count),
    })
  }

  return {
    dataManifest,
    improvementArrangement: improvementArrangement.map((r) => ({
      equipment_id: toInt(r.equipment_id),
      monday: !!r.monday,
      tuesday: !!r.tuesday,
      wednesday: !!r.wednesday,
      thursday: !!r.thursday,
      friday: !!r.friday,
      saturday: !!r.saturday,
      sunday: !!r.sunday,
      route_kind: r.route_kind == null ? null : String(r.route_kind),
      secretary_label: r.secretary_label == null ? null : String(r.secretary_label),
    })),
    improvementUpgradeTarget: improvementUpgradeTarget.map((r) => ({
      equipment_id: toInt(r.equipment_id),
      upgrade_id: toInt(r.upgrade_id),
      consume_development_min: toInt(r.consume_development_min),
      consume_development_max: toInt(r.consume_development_max),
      consume_improvement_min: toInt(r.consume_improvement_min),
      consume_improvement_max: toInt(r.consume_improvement_max),
      route_kind: r.route_kind == null ? null : String(r.route_kind),
      is_deleted: !!r.is_deleted,
      materials: materialsByStep[String(toInt(r.equipment_id)) + "_max"] || [],
    })),
    improvementConsumeStep: improvementConsumeStep.map((r) => ({
      equipment_id: toInt(r.equipment_id),
      step_id: toInt(r.step_id),
      consume_development_min: toInt(r.consume_development_min),
      consume_development_max: toInt(r.consume_development_max),
      consume_improvement_min: toInt(r.consume_improvement_min),
      consume_improvement_max: toInt(r.consume_improvement_max),
      materials: materialsByStep[String(toInt(r.equipment_id)) + "_" + String(toInt(r.step_id))] || [],
    })),
    equipBaseCost: equipBaseCost.map((r) => ({
      id: toInt(r.id),
      consume_fuel: toInt(r.consume_fuel),
      consume_ammo: toInt(r.consume_ammo),
      consume_steel: toInt(r.consume_steel),
      consume_bauxite: toInt(r.consume_bauxite),
    })),
  }
}

function getReduxState(envWindow) {
  try {
    const candidates = []
    if (envWindow) candidates.push(envWindow)
    if (typeof window !== "undefined" && window) candidates.push(window)
    for (const w of candidates) {
      if (w && typeof w.getStore === "function") {
        const value = w.getStore()
        if (value) return value
      }
      if (w && w.store && typeof w.store.getState === "function") {
        const value = w.store.getState()
        if (value) return value
      }
      if (w && w.app && w.app.store && typeof w.app.store.getState === "function") {
        const value = w.app.store.getState()
        if (value) return value
      }
    }
  } catch (_) {}
  return null
}

function getEquipInventory(equips) {
  const list = Array.isArray(equips)
    ? equips
    : equips && typeof equips === "object"
      ? Object.keys(equips).map((key) => equips[key])
      : []
  const byEquip = {}
  for (const equip of list) {
    if (!equip || equip.api_slotitem_id == null) continue
    const masterId = String(equip.api_slotitem_id)
    const level = Number.isFinite(Number(equip.api_level)) ? Number(equip.api_level) : 0
    const bucket = byEquip[masterId] || (byEquip[masterId] = { total: 0, stock: 0, levels: {} })
    bucket.total += 1
    if (level === 0) bucket.stock += 1
    bucket.levels[String(level)] = (bucket.levels[String(level)] || 0) + 1
  }
  return byEquip
}

function getInventoryEquips(envWindow) {
  try {
    const state = getReduxState(envWindow)
    const info = state && state.info
    const infoEquips = (info && (info.equips || info.slotitems)) || (state && (state.equips || state.slotitems))
    if (infoEquips) return infoEquips
    const candidates = []
    if (envWindow) candidates.push(envWindow)
    if (typeof window !== "undefined" && window) candidates.push(window)
    for (const w of candidates) {
      if (w && typeof w.getStore === "function") {
        const direct = w.getStore("info.equips") || w.getStore("info.slotitems")
        if (direct) return direct
      }
    }
    return infoEquips || {}
  } catch (_) {
    return {}
  }
}

function getUseItemCounts(envWindow) {
  try {
    const state = getReduxState(envWindow)
    const info = state && state.info
    const constData = (state && state.const) || {}
    const useItems = (info && (info.useitems || info.items)) || {}
    const $useItems = (constData.$useitems || constData.useitems) || {}
    const byName = {}
    for (const id of Object.keys(useItems)) {
      const item = useItems[id] || {}
      const master = $useItems[id] || (item.api_id != null ? $useItems[String(item.api_id)] : null) || {}
      const name = master.api_name || item.api_name
      const count = item.api_count != null ? item.api_count : item.count
      if (name && count != null) byName[String(name)] = count
    }
    return byName
  } catch (_) {
    return {}
  }
}

function getMasterEquips(envWindow) {
  try {
    const state = getReduxState(envWindow)
    const constData = (state && state.const) || {}
    return constData.$equips || constData.equips || (state && (state.$equips || state.equips)) || {}
  } catch (_) {
    return {}
  }
}

function buildFallbackNameMap() {
  const raw = loadJson("equip_names.json") || []
  const map = {}
  for (const row of raw) {
    if (row && row.id != null) map[String(row.id)] = row
  }
  return map
}

function buildAvailability(staticData) {
  const hasArrangement = {}
  const daysByEquip = {}
  for (const r of staticData.improvementArrangement || []) {
    if (!r || r.equipment_id == null) continue
    const key = String(r.equipment_id)
    hasArrangement[key] = true
    if (!daysByEquip[key]) daysByEquip[key] = []
    for (const day of WEEKDAY_KEYS) {
      if (r[day] && daysByEquip[key].indexOf(day) < 0) daysByEquip[key].push(day)
    }
  }
  return { hasArrangement, daysByEquip }
}

function buildRows(staticData, masterEquips, fallbackNames, akashi, recommendations, secretaryMap) {
  const stepsByEquip = {}
  for (const r of staticData.improvementConsumeStep || []) {
    if (!r || r.equipment_id == null) continue
    const key = String(r.equipment_id)
    if (!stepsByEquip[key]) stepsByEquip[key] = {}
    stepsByEquip[key][String(r.step_id)] = r
  }

  const baseById = {}
  for (const r of staticData.equipBaseCost || []) {
    if (!r || r.id == null) continue
    baseById[String(r.id)] = r
  }

  const arrangementSecretariesByEquipRoute = {}
  for (const r of staticData.improvementArrangement || []) {
    if (!r || r.equipment_id == null) continue
    const equipKey = String(r.equipment_id)
    const routeKey = r.route_kind == null ? "" : String(r.route_kind)
    const mapKey = equipKey + "|" + routeKey
    if (!arrangementSecretariesByEquipRoute[mapKey]) arrangementSecretariesByEquipRoute[mapKey] = []
    const label = String(r.secretary_label || "").trim()
    if (label && label !== "-" && arrangementSecretariesByEquipRoute[mapKey].indexOf(label) < 0) {
      arrangementSecretariesByEquipRoute[mapKey].push(label)
    }
  }

  const upgradesByEquip = {}
  for (const r of staticData.improvementUpgradeTarget || []) {
    if (!r || r.equipment_id == null || r.is_deleted === true) continue
    const key = String(r.equipment_id)
    if (!upgradesByEquip[key]) upgradesByEquip[key] = []
    const routeKey = r.route_kind == null ? "" : String(r.route_kind)
    const secretaries = arrangementSecretariesByEquipRoute[key + "|" + routeKey] || []
    const targetId = String(r.upgrade_id)
    const targetMaster = masterEquips[targetId] || {}
    const targetFallback = fallbackNames[targetId] || {}
    upgradesByEquip[key].push(
      Object.assign({}, r, {
        targetName: String(targetMaster.api_name || targetFallback.name || ("装备 " + r.upgrade_id)),
        targetCategory: String(targetMaster.api_type_name || targetFallback.type || ""),
        targetBase: baseById[targetId] || null,
        secretaries: secretaries.slice(),
      })
    )
  }

  const availability = buildAvailability(staticData)
  const akashiByName = {}
  if (akashi && akashi.weapons) {
    for (const entry of Object.values(akashi.weapons)) {
      const key = normalizeText(entry && entry.name)
      if (key && !akashiByName[key]) akashiByName[key] = entry
    }
  }
  const rows = []
  for (const key of Object.keys(stepsByEquip)) {
    const id = key
    const master = masterEquips[id] || {}
    const fallback = fallbackNames[id] || {}
    const steps = stepsByEquip[key]
    const base = baseById[id] || null
    const days = availability.hasArrangement[key] ? (availability.daysByEquip[key] || []) : WEEKDAY_KEYS.slice()
    const paddedId = String(id).padStart(3, "0")
    let akashiEntry = (akashi && akashi.weapons && (akashi.weapons[id] || akashi.weapons[paddedId])) || null
    if (!akashiEntry) {
      const akashiMatchName = master.api_name || fallback.name
      if (akashiMatchName) akashiEntry = akashiByName[normalizeText(akashiMatchName)] || null
    }
    if (!akashiEntry) akashiEntry = {}
    const recommend = (recommendations && recommendations[id]) || null
    const secretaries = (secretaryMap && secretaryMap[id]) || null
    const category =
      AKASHI_CATEGORY_LABELS[akashiEntry.type] ||
      CATEGORY_ALIASES[translateTypeName(fallback.type || master.api_type_name)] ||
      "其他"
    const name = String(master.api_name || fallback.name || ("装备 " + id))
    const searchText = normalizeText(
      [name, category, akashiEntry.name, fallback.name, master.api_name, id].join(" ")
    )
    rows.push({
      id,
      name,
      typeName: String(fallback.type || master.api_type_name || ""),
      icon: master.api_type && master.api_type[3] != null ? Number(master.api_type[3]) : (fallback.icon != null ? Number(fallback.icon) : 0),
      base,
      days,
      category,
      reco: !!akashiEntry.reco,
      akashiName: akashiEntry.name || "",
      recommend,
      secretaries,
      searchText,
      phase0: steps["0"] || null,
      phase1: steps["1"] || null,
      upgrades: upgradesByEquip[key] || null,
    })
  }

  const orderIndex = {}
  if (akashi && Array.isArray(akashi.order)) {
    akashi.order.forEach((id, idx) => {
      const key = String(Number(id))
      if (orderIndex[key] == null) orderIndex[key] = idx
    })
  }
  const categoryRank = {}
  CATEGORY_ORDER.forEach((category, idx) => {
    categoryRank[category] = idx
  })
  rows.sort((a, b) => {
    const ca = categoryRank[a.category] != null ? categoryRank[a.category] : CATEGORY_ORDER.length
    const cb = categoryRank[b.category] != null ? categoryRank[b.category] : CATEGORY_ORDER.length
    if (ca !== cb) return ca - cb
    const ia = orderIndex[a.id]
    const ib = orderIndex[b.id]
    if (ia >= 0 && ib >= 0) return ia - ib
    if (ia >= 0) return -1
    if (ib >= 0) return 1
    return Number(a.id) - Number(b.id)
  })
  const improveableKeys = new Set(Object.keys(stepsByEquip))
  const nonImproveableIds = Object.keys(fallbackNames).filter((id) => !improveableKeys.has(id)).map(Number).sort((a, b) => a - b)
  for (const id of nonImproveableIds) {
    const key = String(id)
    const fallback = fallbackNames[key] || {}
    const master = masterEquips[key] || {}
    const category = CATEGORY_ALIASES[translateTypeName(fallback.type || master.api_type_name)] || "其他"
    const name = String(master.api_name || fallback.name || ("装备 " + id))
    rows.push({
      id: key,
      name,
      typeName: String(fallback.type || master.api_type_name || ""),
      icon: master.api_type && master.api_type[3] != null ? Number(master.api_type[3]) : (fallback.icon != null ? Number(fallback.icon) : 0),
      base: null,
      days: [],
      category,
      reco: false,
      akashiName: "",
      recommend: null,
      secretaries: null,
      searchText: normalizeText([name, category, id].join(" ")),
      phase0: null,
      phase1: null,
      upgrades: null,
      improveable: false,
    })
  }
  return rows
}

function fmt(n) {
  return Number.isFinite(n) ? n.toFixed(2) : "--"
}

function buildRecommendation(normal, certain, p) {
  if (!Number.isFinite(normal) || !Number.isFinite(certain) || !Number.isFinite(p) || p <= 0) {
    return { expected: NaN, text: "--", tone: "same" }
  }
  const expected = normal / p
  const diff = certain - expected
  if (diff > 0.005) return { expected, text: "不确保（省 " + diff.toFixed(2) + "）", tone: "save" }
  if (diff < -0.005) return { expected, text: "确保（省 " + (-diff).toFixed(2) + "）", tone: "ensure" }
  return { expected, text: "相同", tone: "same" }
}

function hasRareMaterial(materials, kcDevData) {
  return (materials || []).some((item) => {
    if (!item) return false
    if (RARE_MATERIAL_KEYS.has(String(item.item_material_key || item.item_name || ""))) return true
    if (item.item_equipment_id != null && kcDevData) {
      const recipes = kcDevRecipes(kcDevData, String(item.item_equipment_id))
      return !recipes || recipes.length === 0
    }
    return false
  })
}

function MaterialDetail({ materials, onMaterialClick, inventoryByEquip, onInventoryClick, useItemCounts }) {
  const items = (materials || []).filter((item) => item && (item.item_name || item.item_material_key || item.item_equipment_id != null))
  if (items.length === 0) {
    return React.createElement("div", { className: "kr2-material-empty" }, "无消耗装备")
  }
  return React.createElement(
    "div",
    { className: "kr2-material-list" },
    items.map((item, idx) => {
      const label = String(item.item_name || item.item_material_key || ("装备 " + item.item_equipment_id)) + " ×" + String(item.count || 1)
      const equipId = item.item_equipment_id != null ? String(item.item_equipment_id) : null
      const inventory = equipId ? (inventoryByEquip || {})[equipId] : null
      const stock = inventory && Number.isFinite(inventory.stock) ? inventory.stock : null
      const materialStock = item.item_material_key ? (useItemCounts || {})[item.item_material_key] : null
      const required = Number(item.count) > 0 ? Number(item.count) : 1
      const stockClass = stock == null ? "" : stock < required ? " kr2-stock-low" : " kr2-stock-enough"
      const materialClass = materialStock == null ? "" : materialStock < required ? " kr2-stock-low" : " kr2-stock-enough"
      const props = { className: "kr2-material-item" + (equipId ? " kr2-material-btn" : "") }
      if (equipId) {
        props.onClick = () => onMaterialClick && onMaterialClick(item)
        props.title = "查看该装备的开发配方"
      }
      const materialNode = React.createElement(equipId ? "button" : "span", props, label)
      const stockNode = equipId
        ? React.createElement(
            "button",
            { className: "kr2-stock-btn", onClick: () => onInventoryClick && onInventoryClick(item), title: "按改修度查看持有数量" },
            React.createElement("span", { className: "kr2-stock-label" }, "可用"),
            " ",
            React.createElement("span", { className: "kr2-stock-qty" + stockClass }, stock == null ? "--" : String(stock))
          )
        : item.item_material_key
          ? React.createElement(
              "span",
              { className: "kr2-stock-text" },
              React.createElement("span", { className: "kr2-stock-label" }, "可用"),
              " ",
              React.createElement("span", { className: "kr2-stock-qty" + materialClass }, materialStock == null ? "--" : String(materialStock))
            )
          : null
      return React.createElement("div", { key: idx, className: "kr2-material-row" }, materialNode, stockNode)
    })
  )
}

function InventoryModal({ equipId, name, inventory, onClose }) {
  const levels = inventory ? Object.keys(inventory.levels || {}).map(Number).sort((a, b) => a - b) : []
  const total = inventory ? inventory.total : 0
  return React.createElement(
    "div",
    { className: "kr2-modal-backdrop", onClick: onClose },
    React.createElement(
      "div",
      { className: "kr2-modal", onClick: (e) => e.stopPropagation() },
      React.createElement(
        "div",
        { className: "kr2-modal-head" },
        React.createElement(
          "div",
          null,
          React.createElement("div", { className: "kr2-modal-title" }, "装备库存"),
          React.createElement(
            "div",
            { className: "kr2-modal-sub" },
            name + (equipId != null ? " · 装备ID " + equipId : "") + (total > 0 ? " · 合计 " + total : "")
          )
        ),
        React.createElement(
          "div",
          { className: "kr2-modal-actions" },
          React.createElement("button", { className: "kr2-button", onClick: onClose }, "关闭")
        )
      ),
      React.createElement(
        "div",
        { className: "kr2-dev-scroll" },
        total > 0
          ? React.createElement(
              "table",
              { className: "kr2-table kr2-inv-table" },
              React.createElement(
                "thead",
                null,
                React.createElement("tr", null, React.createElement("th", null, "改修度"), React.createElement("th", null, "数量"))
              ),
              React.createElement(
                "tbody",
                null,
                levels.map((level) =>
                  React.createElement(
                    "tr",
                    { key: level },
                    React.createElement("td", null, level === 10 ? "★max" : "★" + String(level)),
                    React.createElement("td", null, String((inventory.levels || {})[String(level)] || 0))
                  )
                )
              )
            )
          : React.createElement("div", { className: "kr2-empty" }, "暂无库存数据，请先在游戏内加载装备数据")
      )
    )
  )
}

function planCurrentLevel(row, inventoryByEquip) {
  const inv = (inventoryByEquip || {})[row.id]
  if (inv && inv.levels) {
    const keys = Object.keys(inv.levels).map(Number)
    if (keys.length) return Math.max(0, Math.min(10, Math.max.apply(null, keys)))
  }
  return 0
}

function planInventoryLevels(row, inventoryByEquip) {
  const inv = (inventoryByEquip || {})[row.id]
  const out = []
  if (inv && inv.levels) {
    for (const level of Object.keys(inv.levels)) {
      const lv = Number(level)
      const count = Math.max(0, Math.round(Number(inv.levels[level]) || 0))
      for (let i = 0; i < count; i += 1) out.push(lv)
    }
  }
  out.sort((a, b) => b - a)
  return out
}

function planCopyCosts(row, target, current, upgradeId) {
  const levels = target === "max" ? PLAN_LEVELS_MAX : PLAN_LEVELS_6
  const out = { screws: 0, dev: 0, fuel: 0, ammo: 0, steel: 0, bauxite: 0, materials: [] }
  for (const lv of levels) {
    if (lv.from < current) continue
    const step = lv.source === "phase0" ? row.phase0 : row.phase1
    if (!step) continue
    const rec = buildRecommendation(step.consume_improvement_min, step.consume_improvement_max, lv.p)
    const ensure = rec.tone === "ensure"
    const expected = Number.isFinite(rec.expected) ? rec.expected : step.consume_improvement_min / lv.p
    const screws = ensure ? step.consume_improvement_max : expected
    const attempts = ensure ? 1 : expected
    const dev = ensure ? step.consume_development_max : step.consume_development_min * attempts
    out.screws += screws
    out.dev += dev
    const base = row.base || {}
    out.fuel += (base.consume_fuel || 0) * attempts
    out.ammo += (base.consume_ammo || 0) * attempts
    out.steel += (base.consume_steel || 0) * attempts
    out.bauxite += (base.consume_bauxite || 0) * attempts
    for (const m of step.materials || []) {
      out.materials.push({ item: m, count: m.count || 1 })
    }
  }
  if (upgradeId != null && target === "max") {
    const upg = (row.upgrades || []).find((u) => String(u.upgrade_id) === String(upgradeId))
    if (upg) {
      const rec = buildRecommendation(upg.consume_improvement_min, upg.consume_improvement_max, 0.62)
      const ensure = rec.tone === "ensure"
      const expected = Number.isFinite(rec.expected) ? rec.expected : upg.consume_improvement_min / 0.62
      const screws = ensure ? upg.consume_improvement_max : expected
      const attempts = ensure ? 1 : expected
      const dev = ensure ? upg.consume_development_max : upg.consume_development_min * attempts
      out.screws += screws
      out.dev += dev
      const base = upg.targetBase || row.base || {}
      out.fuel += (base.consume_fuel || 0) * attempts
      out.ammo += (base.consume_ammo || 0) * attempts
      out.steel += (base.consume_steel || 0) * attempts
      out.bauxite += (base.consume_bauxite || 0) * attempts
      for (const m of upg.materials || []) {
        out.materials.push({ item: m, count: m.count || 1 })
      }
    }
  }
  return out
}

function planRowCosts(row, target, qty, inventoryByEquip, upgradeId) {
  const count = Math.max(1, Math.min(99, Math.round(Number(qty) || 1)))
  let starts = []
  if (count === 1) {
    starts = [planCurrentLevel(row, inventoryByEquip)]
  } else {
    const levels = planInventoryLevels(row, inventoryByEquip)
    for (let i = 0; i < count; i += 1) starts.push(i < levels.length ? levels[i] : 0)
  }
  const out = { screws: 0, dev: 0, fuel: 0, ammo: 0, steel: 0, bauxite: 0, materials: [] }
  for (const current of starts) {
    const c = planCopyCosts(row, target, current, upgradeId)
    out.screws += c.screws
    out.dev += c.dev
    out.fuel += c.fuel
    out.ammo += c.ammo
    out.steel += c.steel
    out.bauxite += c.bauxite
    for (const m of c.materials) out.materials.push(m)
  }
  out.materials = planAggregateMaterials(out.materials)
  return out
}

function planCurrentDisplay(row, sel, inventoryByEquip) {
  if (Math.round(Number(sel.qty || 1)) === 1) return "★ " + String(planCurrentLevel(row, inventoryByEquip))
  const inv = (inventoryByEquip || {})[row.id]
  return "库存 " + String(inv && Number.isFinite(inv.total) ? inv.total : 0)
}

function planMaterialKey(m) {
  return m.item_equipment_id != null ? "equip:" + String(m.item_equipment_id) : "material:" + String(m.item_material_key || m.item_name || "")
}

function planAggregateMaterials(materials) {
  const byKey = {}
  const out = []
  for (const m of materials || []) {
    const key = planMaterialKey(m.item)
    const target = byKey[key] || (byKey[key] = { item: m.item, count: 0 })
    target.count += m.count || 1
  }
  return Object.keys(byKey).map((k) => byKey[k])
}

function planStockValue(m, inventoryByEquip, useItemCounts) {
  if (m.item_equipment_id != null) {
    const inv = (inventoryByEquip || {})[String(m.item_equipment_id)]
    if (inv) return Number.isFinite(inv.stock) ? inv.stock : 0
    const inventoryLoaded = inventoryByEquip && Object.keys(inventoryByEquip).length > 0
    return inventoryLoaded ? 0 : null
  }
  const name = String(m.item_name || m.item_material_key || "")
  const v = (useItemCounts || {})[name]
  return v == null ? null : Number(v)
}

function planFormatNumber(n) {
  const v = Number(n) || 0
  return String(Math.max(0, Math.ceil(v - 1e-9)).toLocaleString())
}

function planFormatScrews(n) {
  const v = Number(n) || 0
  if (Math.abs(v - Math.round(v)) < 0.05) return String(Math.round(v).toLocaleString())
  return v.toFixed(1)
}

function planDevExpectedValue(item, count, kcDevData) {
  if (!item || item.item_equipment_id == null || !kcDevData) return 0
  const best = kcDevBestFormula(kcDevData, item.item_equipment_id)
  if (!best || !Number.isFinite(best.rate) || best.rate <= 0) return 0
  const qty = Number(count) > 0 ? Number(count) : 1
  return qty * (100 / best.rate)
}

function planDevExpectedText(item, count, kcDevData) {
  const v = planDevExpectedValue(item, count, kcDevData)
  return v > 0 ? planFormatScrews(v) : "--"
}

function planMaterialDevExpected(costs, kcDevData) {
  let total = 0
  for (const m of costs.materials || []) total += planDevExpectedValue(m.item, m.count, kcDevData)
  return total
}

class EvolutionButton extends React.Component {
  state = { open: false, selected: null }

  open = () => {
    const branches = this.props.branches || []
    if (branches.length <= 1) {
      const id = branches[0] ? String(branches[0].upgrade_id) : null
      if (id == null || !this.props.onSelect) return
      this.props.onSelect(this.props.rowId, this.props.value === id ? null : id)
      return
    }
    this.setState({ open: true, selected: this.props.value || null })
  }

  close = () => {
    if (this.props.onSelect) this.props.onSelect(this.props.rowId, this.state.selected)
    this.setState({ open: false })
  }

  render() {
    const branches = this.props.branches || []
    if (branches.length === 0) {
      return React.createElement("button", { type: "button", className: "kr2-plan-evo-btn", disabled: true }, "无进化")
    }
    const active = !!this.props.value
    const selected = branches.find((b) => String(b.upgrade_id) === String(this.props.value))
    const label = "进化"
    return React.createElement(
      "div",
      { className: "kr2-plan-evo-wrap" },
      React.createElement("button", { type: "button", className: "kr2-plan-evo-btn" + (active ? " kr2-plan-evo-active" : ""), onClick: this.open }, label),
      this.state.open
        ? React.createElement(
            "div",
            { className: "kr2-modal-backdrop", onClick: this.close },
            React.createElement(
              "div",
              { className: "kr2-modal kr2-evo-modal", onClick: (e) => e.stopPropagation() },
              React.createElement(
                "div",
                { className: "kr2-modal-head" },
                React.createElement("div", { className: "kr2-modal-title" }, "选择进化分支"),
                React.createElement(
                  "div",
                  { className: "kr2-modal-actions" },
                  React.createElement("button", { className: "kr2-button", onClick: this.close }, "关闭")
                )
              ),
              React.createElement(
                "div",
                { className: "kr2-evo-scroll" },
                branches.map((b) =>
                  React.createElement(
                    "button",
                    { key: String(b.upgrade_id), type: "button", className: "kr2-evo-option" + (this.state.selected === String(b.upgrade_id) ? " kr2-evo-option-active" : ""), onClick: () => this.setState({ selected: String(b.upgrade_id) }) },
                    b.targetName
                  )
                )
              )
            )
          )
        : null
    )
  }
}

function PlanningPage({ rows, inventoryByEquip, useItemCounts, selection, onToggle, onTarget, onQty, onSelectAll, onMaterialClick, kcDevData, includeDevExpected, onToggleIncludeDevExpected, onEvo }) {
  const planRows = rows.map((row) => {
    const sel = (selection || {})[row.id] || { selected: true, target: "max", qty: 1 }
    const evoUpgradeId = sel.evoUpgradeId || null
    const evoBranch = evoUpgradeId ? (row.upgrades || []).find((u) => String(u.upgrade_id) === String(evoUpgradeId)) : null
    const target = evoUpgradeId ? "max" : sel.target
    const costs = planRowCosts(row, target, sel.qty, inventoryByEquip, evoUpgradeId)
    return { row, sel, costs, matDev: planMaterialDevExpected(costs, kcDevData), display: planCurrentDisplay(row, sel, inventoryByEquip), target, evoUpgradeId, evoBranch }
  })
  const selected = planRows.filter((p) => p.sel.selected)
  const totals = { screws: 0, dev: 0, fuel: 0, ammo: 0, steel: 0, bauxite: 0 }
  const materialMap = {}
  const includeDev = !!includeDevExpected
  for (const p of selected) {
    totals.screws += p.costs.screws
    totals.dev += p.costs.dev + (includeDev ? p.matDev : 0)
    totals.fuel += p.costs.fuel
    totals.ammo += p.costs.ammo
    totals.steel += p.costs.steel
    totals.bauxite += p.costs.bauxite
    for (const m of p.costs.materials) {
      const key = planMaterialKey(m.item)
      const entry = materialMap[key] || (materialMap[key] = { name: String(m.item.item_name || m.item.item_material_key || ("装备 " + m.item.item_equipment_id)), item: m.item, required: 0, stock: null, equips: [] })
      entry.required += m.count
      if (entry.stock == null) entry.stock = planStockValue(m.item, inventoryByEquip, useItemCounts)
      if (entry.equips.indexOf(p.row.name) < 0) entry.equips.push(p.row.name)
    }
  }
  const materialList = Object.keys(materialMap).map((k) => materialMap[k]).sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"))
  const stockClass = (stock, required) => stock == null ? "kr2-plan-stock-default" : stock < required ? "kr2-plan-stock-low" : "kr2-plan-stock-enough"
  const summaryItems = [
    { materialId: 8, title: "螺丝", value: totals.screws },
    { materialId: 7, title: "资材", value: totals.dev },
    { materialId: 1, title: "油", value: totals.fuel },
    { materialId: 2, title: "弹", value: totals.ammo },
    { materialId: 3, title: "钢", value: totals.steel },
    { materialId: 4, title: "铝", value: totals.bauxite },
  ]
  return React.createElement(
    "div",
    { className: "kr2-plan" },
    React.createElement(
      "div",
      { className: "kr2-plan-bar" },
      React.createElement(
        "div",
        { className: "kr2-plan-bar-left" },
        React.createElement("span", { className: "kr2-plan-total-label" }, "总资源消耗"),
        React.createElement("span", { className: "kr2-status" }, "已选 " + selected.length + " / " + planRows.length + " 件收藏装备"),
        React.createElement("label", { className: "kr2-plan-dev-toggle" }, React.createElement("input", { type: "checkbox", checked: !!includeDevExpected, onChange: onToggleIncludeDevExpected }), "统计素材开发的紫菜消耗期望")
      ),
      React.createElement(
        "div",
        { className: "kr2-plan-chips" },
        React.createElement("button", { className: "kr2-plan-chip", onClick: () => onSelectAll(true) }, "全选"),
        React.createElement("button", { className: "kr2-plan-chip", onClick: () => onSelectAll(false) }, "全不选")
      )
    ),
    React.createElement(
      "div",
      { className: "kr2-plan-summary" },
      summaryItems.map((item) =>
        React.createElement(
          "div",
          { key: item.title, className: "kr2-plan-sum-cell", title: item.title },
          React.createElement(MaterialIcon, { materialId: item.materialId, className: "kr2-plan-mat-icon", alt: item.title }),
          React.createElement("span", { className: "kr2-plan-sum-num" }, item.materialId === 8 ? planFormatScrews(item.value) : planFormatNumber(item.value))
        )
      )
    ),
    React.createElement(
      "table",
      { className: "kr2-table kr2-plan-table kr2-plan-main-table" },
      React.createElement(
        "thead",
        null,
        React.createElement(
          "tr",
          null,
          React.createElement("th", { style: { width: 36 } }, "选用"),
          React.createElement("th", null, "装备"),
          React.createElement("th", null, "当前"),
          React.createElement("th", null, "目标"),
          React.createElement("th", null, "目标数量"),
          React.createElement("th", null, "开发资材"),
          React.createElement("th", null, "螺丝"),
          React.createElement("th", null, "素材")
        )
      ),
      React.createElement(
        "tbody",
        null,
        planRows.map((p) => {
          const matText = p.costs.materials.map((m) => String(m.item.item_name || m.item.item_material_key || ("装备 " + m.item.item_equipment_id)) + " ×" + String(m.count)).join(" / ") || "无"
          return React.createElement(
            "tr",
            { key: p.row.id },
            React.createElement("td", null, React.createElement("input", { type: "checkbox", checked: !!p.sel.selected, onChange: () => onToggle(p.row.id) })),
            React.createElement("td", { className: "kr2-plan-name" }, React.createElement("span", { className: "kr2-plan-name-inner" }, React.createElement(SlotitemIcon, { slotitemId: p.row.icon, className: "kr2-icon" }), " ", p.row.name, p.evoBranch ? React.createElement("span", { className: "kr2-plan-evo-target-line" }, "→ ", React.createElement("span", { className: "kr2-plan-evo-target-name" }, p.evoBranch.targetName)) : null)),
            React.createElement("td", { className: Math.round(Number(p.sel.qty || 1)) === 1 ? "kr2-plan-current" : "kr2-plan-current-stock" }, p.display),
            React.createElement(
              "td",
              null,
              React.createElement(
                "div",
                { className: "kr2-plan-target-group" },
                React.createElement("button", { type: "button", disabled: p.row.improveable === false, className: "kr2-plan-target-btn" + (!p.evoUpgradeId && p.target !== "max" ? " kr2-plan-target-active" : ""), onClick: () => onTarget(p.row.id, "6") }, "+6"),
              React.createElement("button", { type: "button", disabled: p.row.improveable === false, className: "kr2-plan-target-btn" + (!p.evoUpgradeId && p.target === "max" ? " kr2-plan-target-active" : ""), onClick: () => onTarget(p.row.id, "max") }, "max"),
                React.createElement(EvolutionButton, { rowId: p.row.id, branches: p.row.upgrades || [], value: p.evoUpgradeId, onSelect: onEvo })
              )
            ),
            React.createElement(
              "td",
              null,
              React.createElement(
                "span",
                { className: "kr2-plan-qty" },
                React.createElement("button", { type: "button", className: "kr2-plan-qty-btn", onClick: () => onQty(p.row.id, Number(p.sel.qty || 1) - 1) }, "−"),
                React.createElement("input", { className: "kr2-plan-qty-input", value: String(p.sel.qty || 1), onChange: (e) => onQty(p.row.id, e.target.value) }),
                React.createElement("button", { type: "button", className: "kr2-plan-qty-btn", onClick: () => onQty(p.row.id, Number(p.sel.qty || 1) + 1) }, "+")
              )
            ),
            React.createElement("td", null, planFormatNumber(p.costs.dev + (includeDev ? p.matDev : 0))),
            React.createElement("td", null, planFormatScrews(p.costs.screws)),
            React.createElement("td", { className: "kr2-plan-mat-col" }, matText)
          )
        })
      )
    ),
    React.createElement(
      "div",
      { className: "kr2-plan-sec" },
      React.createElement("h3", null, "素材需求汇总（按素材分别统计）"),
      React.createElement(
        "table",
        { className: "kr2-table kr2-plan-table" },
        React.createElement(
          "thead",
          null,
          React.createElement("tr", null, React.createElement("th", { className: "kr2-plan-mat-th" }, "素材名称"), React.createElement("th", null, "需求"), React.createElement("th", null, "库存"), React.createElement("th", null, "紫菜开发期望"), React.createElement("th", { className: "kr2-plan-mat-th" }, "消耗于装备"))
        ),
        React.createElement(
          "tbody",
          null,
          materialList.length === 0
            ? React.createElement("tr", null, React.createElement("td", { colSpan: 5 }, "暂无素材需求"))
            : materialList.map((m) =>
                React.createElement(
                  "tr",
                  { key: m.name },
                  React.createElement("td", { className: "kr2-plan-name" }, React.createElement("button", { className: "kr2-plan-mat-btn", onClick: () => onMaterialClick && onMaterialClick(m.item) }, m.name)),
                  React.createElement("td", null, String(m.required)),
                  React.createElement("td", { className: stockClass(m.stock, m.required) }, m.stock == null ? "--" : String(m.stock)),
                  React.createElement("td", null, planDevExpectedText(m.item, m.required, kcDevData)),
                  React.createElement("td", { className: "kr2-plan-consumed" }, m.equips.join("、"))
                )
              )
        )
      )
    )
  )
}

class StrongPage extends React.Component {
  catRef = React.createRef()
  state = {
    categoryOpen: false,
    selectedCategories: readStrongCategories(),
    catPos: null,
  }

  toggleCategoryOpen = () => {
    if (this.state.categoryOpen) {
      this.setState({ categoryOpen: false, catPos: null })
      return
    }
    const el = this.catRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    this.setState({
      categoryOpen: true,
      catPos: { top: rect.bottom + 4, left: rect.left, width: rect.width },
    })
  }

  toggleCategory = (name) => {
    const all = Array.from(new Set((this.props.rows || []).map((row) => row.category).filter(Boolean)))
    this.setState((prev) => {
      let next
      if (prev.selectedCategories == null) {
        next = all.filter((c) => c !== name)
      } else if (prev.selectedCategories.indexOf(name) >= 0) {
        next = prev.selectedCategories.filter((c) => c !== name)
      } else {
        next = prev.selectedCategories.concat([name])
      }
      if (next.length === all.length) next = null
      saveStrongCategories(next)
      return { selectedCategories: next }
    })
  }

  render() {
    const { rows, inventoryByEquip, selection } = this.props
    const inventoryLoaded = inventoryByEquip && Object.keys(inventoryByEquip).length > 0
    const entries = []
    const levelText = (level) => {
      const n = Number(level)
      if (n >= 10) return "max"
      return "+" + String(n)
    }
    const demandMap = {}
    for (const row of rows || []) {
      const sel = (selection || {})[row.id] || { selected: true, target: "max", qty: 1 }
      const qty = Math.max(1, Math.min(99, Math.round(Number(sel.qty) || 1)))
      const evoUpgradeId = sel.evoUpgradeId || null
      const evoUpgrade = evoUpgradeId ? (row.upgrades || []).find((u) => String(u.upgrade_id) === String(evoUpgradeId)) : null
      const displayRow = evoUpgrade
        ? Object.assign({}, row, { id: row.id + ":evo:" + evoUpgrade.upgrade_id, name: evoUpgrade.targetName, category: evoUpgrade.targetCategory || row.category })
        : row
      const targetEquipId = evoUpgrade ? String(evoUpgrade.upgrade_id) : row.id
      const targetLevelValue = evoUpgrade ? 0 : (row.improveable === false ? 0 : (sel.target === "max" ? 10 : 6))
      const bucket = demandMap[targetEquipId] || (demandMap[targetEquipId] = { equipId: targetEquipId, displayRow, demands: {} })
      bucket.demands[String(targetLevelValue)] = (bucket.demands[String(targetLevelValue)] || 0) + qty
    }
    for (const bucket of Object.values(demandMap)) {
      const inv = (inventoryByEquip || {})[bucket.equipId]
      const inventoryLevels = []
      if (inv && inv.levels) {
        for (const level of Object.keys(inv.levels)) {
          const count = Math.max(0, Math.round(Number(inv.levels[level]) || 0))
          if (count > 0) inventoryLevels.push({ level: Number(level), count })
        }
        inventoryLevels.sort((a, b) => b.level - a.level)
      }
      const remaining = {}
      for (const lv of inventoryLevels) remaining[String(lv.level)] = lv.count
      const targetLevels = Object.keys(bucket.demands).map(Number).sort((a, b) => b - a)
      const allocation = {}
      const shortfall = {}
      for (const tl of targetLevels) {
        let need = bucket.demands[String(tl)] || 0
        for (const lv of inventoryLevels) {
          if (need <= 0) break
          const avail = remaining[String(lv.level)] || 0
          if (avail <= 0) continue
          const take = Math.min(need, avail)
          const key = String(tl) + "|" + String(lv.level)
          const alloc = allocation[key] || (allocation[key] = { targetLevelValue: tl, inventoryLevel: lv.level, qty: 0, stock: 0 })
          alloc.qty += take
          alloc.stock += take
          remaining[String(lv.level)] = avail - take
          need -= take
        }
        if (need > 0) shortfall[String(tl)] = need
      }
      for (const key of Object.keys(allocation)) {
        const alloc = allocation[key]
        entries.push({ key: bucket.equipId + ":" + key, row: bucket.displayRow, targetLevel: levelText(alloc.targetLevelValue), targetLevelValue: alloc.targetLevelValue, qty: alloc.qty, inventoryLevel: alloc.inventoryLevel, stock: alloc.stock })
      }
      for (const tl of Object.keys(shortfall)) {
        const value = Number(tl)
        entries.push({ key: bucket.equipId + ":short:" + tl, row: bucket.displayRow, targetLevel: levelText(value), targetLevelValue: value, qty: shortfall[tl], inventoryLevel: null, stock: inventoryLoaded ? 0 : null, notFound: true })
      }
    }
    for (const item of entries) {
      item.clear = item.qty > 0 && item.stock != null && item.inventoryLevel === item.targetLevelValue && item.stock >= item.qty
      item.levelShort = item.inventoryLevel != null && item.inventoryLevel < item.targetLevelValue
      item.countShort = item.stock != null && item.qty > 0 && item.stock < item.qty
      item.countEnough = item.stock != null && item.stock >= item.qty
    }
    entries.sort((a, b) => (b.clear ? 1 : 0) - (a.clear ? 1 : 0))
    const categories = Array.from(new Set(entries.map((item) => item.row.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"))
    const selectedCategories = this.state.selectedCategories
    const visibleEntries = selectedCategories == null ? entries : entries.filter((item) => selectedCategories.indexOf(item.row.category) >= 0)
    const stockText = (item) => {
      const nameNode = React.createElement("span", { className: "kr2-strong-stock-name" }, item.row.name)
      if (item.notFound || item.stock == null) return nameNode
      const levelPart = levelText(item.inventoryLevel)
      return React.createElement("span", null, nameNode, " ", levelPart)
    }
    const stockClass = (item) => item.notFound || item.stock == null ? "kr2-strong-stock-notfound" : item.clear ? "kr2-strong-stock-clear" : item.levelShort ? "kr2-strong-stock-short" : "kr2-strong-stock-ok"
    const ownedClass = (item) => item.stock == null ? "kr2-strong-stock-missing" : item.clear || item.countEnough ? "kr2-strong-stock-clear" : item.countShort ? "kr2-strong-stock-short" : "kr2-strong-stock-ok"
    const catStyle = this.state.catPos ? { position: "fixed", top: this.state.catPos.top, left: this.state.catPos.left, minWidth: Math.max(180, this.state.catPos.width) } : null
    const categoryHead = React.createElement(
      "th",
      { className: "kr2-strong-cat-th", ref: this.catRef, onClick: this.toggleCategoryOpen },
      React.createElement("span", { className: "kr2-strong-cat-title" }, "装备分类"),
      React.createElement("span", { className: "kr2-strong-cat-arrow" }, this.state.categoryOpen ? "▲" : "▼"),
      this.state.categoryOpen
        ? React.createElement(
            "div",
            { className: "kr2-strong-cat-menu", style: catStyle, onClick: (e) => e.stopPropagation() },
            categories.map((cat) =>
              React.createElement(
                "label",
                { key: cat, className: "kr2-strong-cat-option" },
                React.createElement("input", { type: "checkbox", checked: selectedCategories == null || selectedCategories.indexOf(cat) >= 0, onChange: () => this.toggleCategory(cat) }),
                cat
              )
            )
          )
        : null
    )
    return React.createElement(
      "div",
      { className: "kr2-strong" },
      React.createElement(
        "table",
        { className: "kr2-table kr2-plan-table kr2-strong-table" },
        React.createElement(
          "thead",
          null,
          React.createElement("tr", null, categoryHead, React.createElement("th", null, "目标装备"), React.createElement("th", null, "目标数"), React.createElement("th", null, "库存"), React.createElement("th", null, "完成数"))
        ),
        React.createElement(
          "tbody",
          null,
          visibleEntries.length === 0
            ? React.createElement("tr", null, React.createElement("td", { colSpan: 5 }, "无匹配分类"))
            : visibleEntries.map((item) =>
                React.createElement(
                  "tr",
                  { key: item.key, className: item.clear ? "kr2-strong-clear-row" : null },
                  React.createElement("td", { className: "kr2-strong-cat" }, item.row.category || "-"),
                  React.createElement("td", { className: "kr2-strong-equip" }, item.row.name, " ", React.createElement("span", { className: "kr2-strong-level" }, item.targetLevel)),
                  React.createElement("td", { className: "kr2-strong-target" }, String(item.qty)),
                  React.createElement("td", { className: "kr2-strong-stock " + stockClass(item) }, stockText(item)),
                  React.createElement("td", { className: "kr2-strong-owned " + ownedClass(item) }, item.stock == null ? "--" : item.clear ? "clear!" : String(item.stock))
                )
              )
        )
      )
    )
  }
}
function RateCell({ range, open, onToggle, tone }) {
  return React.createElement(
    "span",
    { className: "kr2-rate-btn" + (open ? " kr2-rate-btn-open" : "") + (tone ? " kr2-rate-btn-" + tone : ""), onClick: onToggle },
    range + (open ? " ▲" : " ▼")
  )
}

class LevelOneTable extends React.Component {
  state = { open: {} }

  toggle = (key) => {
    this.setState((prev) => ({ open: Object.assign({}, prev.open, { [key]: !prev.open[key] }) }))
  }

  render() {
    const phase = this.props.phase
    const kcDevData = this.props.kcDevData
    if (!phase) {
      return React.createElement(
        "div",
        { className: "kr2-empty", style: { padding: 16 } },
        "该装备没有0★→5★的改修数据"
      )
    }
    const normal = phase.consume_improvement_min
    const materials = phase.materials || []
    const hasMaterials = materials.some((item) => item && (item.item_name || item.item_material_key || item.item_equipment_id != null))
    const rareWarning = hasRareMaterial(materials, kcDevData) ? React.createElement("div", { className: "kr2-rare-warning" }, "稀有素材消耗注意！") : null
    const rows = []
    LEVEL_ONE_ROWS.forEach((rate) => {
      const key = rate.range
      rows.push(
        React.createElement(
          "tr",
          { key, className: "kr2-rate-row" },
          React.createElement("td", null, key),
          React.createElement("td", null, "100%"),
          React.createElement("td", null, String(normal)),
          React.createElement("td", null, fmt(normal)),
          React.createElement(
            "td",
            { className: "kr2-material-col" },
            hasMaterials
              ? React.createElement(
                  "div",
                  { className: "kr2-material-cell" },
                  React.createElement(RateCell, { range: "素材详情", open: !!this.state.open[key], onToggle: () => this.toggle(key) }),
                  rareWarning,
                  !!this.state.open[key]
                    ? React.createElement(MaterialDetail, { materials, onMaterialClick: this.props.onMaterialClick, inventoryByEquip: this.props.inventoryByEquip, useItemCounts: this.props.useItemCounts, onInventoryClick: this.props.onInventoryClick })
                    : null
                )
              : React.createElement("span", { className: "kr2-material-empty" }, "无")
          )
        )
      )
    })

    return React.createElement(
      "table",
      { className: "kr2-table kr2-rate-table" },
      React.createElement(
        "thead",
        null,
        React.createElement(
          "tr",
          null,
          React.createElement("th", null, "改修度"),
          React.createElement("th", null, "成功率"),
          React.createElement("th", null, "不确保改修资材"),
          React.createElement("th", null, "不确保期望"),
          React.createElement("th", { className: "kr2-material-col" }, "确保推荐")
        )
      ),
      React.createElement("tbody", null, rows)
    )
  }
}

class LevelTwoTable extends React.Component {
  state = { open: {} }

  toggle = (key) => {
    this.setState((prev) => ({ open: Object.assign({}, prev.open, { [key]: !prev.open[key] }) }))
  }

  render() {
    const phase0 = this.props.phase0
    const phase1 = this.props.phase1
    const upgrades = this.props.upgrades || null
    const kcDevData = this.props.kcDevData
    const rows = []
    const pushRateRow = (step, range, label, key, p, subText, evolTarget, maxBlue) => {
      const normal = step ? step.consume_improvement_min : null
      const certain = step ? step.consume_improvement_max : null
      const rec = buildRecommendation(normal, certain, p)
      const materials = step ? step.materials || [] : []
      const hasMaterials = materials.some((item) => item && (item.item_name || item.item_material_key || item.item_equipment_id != null))
      const rareWarning = hasRareMaterial(materials, kcDevData) ? React.createElement("div", { className: "kr2-rare-warning" }, "稀有素材消耗注意！") : null
      const rangeNode = maxBlue
        ? React.createElement("span", null, "★9→", React.createElement("span", { className: "kr2-level-max-blue" }, "max"))
        : range
      rows.push(
        React.createElement(
          "tr",
          { key, className: "kr2-rate-row" },
          React.createElement(
            "td",
            { className: subText ? "kr2-rate-evol-cell" : null },
            subText
              ? React.createElement(
                  "div",
                  null,
                  React.createElement(
                    "div",
                    null,
                    React.createElement("span", null, range),
                    evolTarget ? React.createElement("span", { className: "kr2-evol-target" }, evolTarget) : null
                  ),
                  React.createElement("div", { className: "kr2-evol-secretaries" }, subText)
                )
              : rangeNode
          ),
          React.createElement("td", null, label),
          React.createElement("td", null, normal == null ? "--" : String(normal)),
          React.createElement("td", null, fmt(rec.expected)),
          React.createElement("td", null, certain == null ? "--" : String(certain)),
          React.createElement(
            "td",
            { className: "kr2-material-col" },
            hasMaterials
              ? React.createElement(
                  "div",
                  { className: "kr2-material-cell" },
                  React.createElement(RateCell, { range: rec.text, open: !!this.state.open[key], onToggle: () => this.toggle(key), tone: rec.tone }),
                  rareWarning,
                  !!this.state.open[key]
                    ? React.createElement(MaterialDetail, { materials, onMaterialClick: this.props.onMaterialClick, inventoryByEquip: this.props.inventoryByEquip, useItemCounts: this.props.useItemCounts, onInventoryClick: this.props.onInventoryClick })
                    : null
                )
              : React.createElement("span", { className: "kr2-badge kr2-badge-" + rec.tone }, rec.text)
          )
        )
      )
    }
    LEVEL_TWO_ROWS.forEach((rate) => {
      if (rate.source === "upgrade") {
        const branches = upgrades && upgrades.length ? upgrades : upgrades ? [upgrades] : []
        branches.forEach((branch, idx) => {
          const secretaryText = branch && branch.secretaries && branch.secretaries.length ? branch.secretaries.join("/") : ""
          const targetName = branch ? (branch.targetName || ("装备 " + branch.upgrade_id)) : ""
          const range = branch ? "进化→" : rate.range
          const key = branch ? "upgrade-" + String(branch.upgrade_id) + "-" + String(idx) : rate.range
          pushRateRow(branch, range, rate.label, key, rate.p, secretaryText, targetName)
        })
        return
      }
      const step = rate.source === "phase0" ? phase0 : phase1
      pushRateRow(step, rate.range, rate.label, rate.range, rate.p, "", "", rate.range === "★9→max" && !upgrades)
    })

    return React.createElement(
      "table",
      { className: "kr2-table kr2-rate-table" },
      React.createElement(
        "thead",
        null,
        React.createElement(
          "tr",
          null,
          React.createElement("th", null, "改修度"),
          React.createElement("th", null, "成功率"),
          React.createElement("th", null, "不确保改修资材"),
          React.createElement("th", null, "不确保期望"),
          React.createElement("th", null, "确保改修资材"),
          React.createElement("th", { className: "kr2-material-col" }, "确保推荐")
        )
      ),
      React.createElement("tbody", null, rows)
    )
  }
}

class LevelSection extends React.Component {
  state = {
    open: !!this.props.defaultOpen,
  }

  toggle = () => {
    this.setState((prev) => ({ open: !prev.open }))
  }

  render() {
    const { title, resourceText, children } = this.props
    return React.createElement(
      "div",
      { className: "kr2-phase" },
      React.createElement(
        "div",
        { className: "kr2-phase-head kr2-level-head", onClick: this.toggle },
        React.createElement("span", { className: "kr2-phase-title" }, title),
        React.createElement(
          "span",
          { className: "kr2-phase-res" },
          resourceText + " · " + (this.state.open ? "−" : "+")
        )
      ),
      this.state.open
        ? React.createElement("div", { className: "kr2-level-body" }, children)
        : null
    )
  }
}

function EquipmentRow({ row, expanded, onToggle, onMaterialClick, inventoryByEquip, useItemCounts, onInventoryClick, isFavorite, onFavoriteClick, secretaryText, kcDevData }) {
  return React.createElement(
    "div",
    null,
    React.createElement(
      "div",
      { className: "kr2-row" + (row.improveable === false ? " kr2-row-not-improveable" : ""), onClick: row.improveable === false ? null : onToggle },
      React.createElement(
        "button",
        { className: "kr2-fav-btn" + (isFavorite ? " kr2-fav-active" : ""), onClick: (e) => { e.stopPropagation(); onFavoriteClick && onFavoriteClick(row.id) }, title: isFavorite ? "取消收藏" : "收藏" },
        isFavorite ? "★" : "☆"
      ),
      React.createElement(
        "span",
        { className: "kr2-expand" },
        React.createElement(SlotitemIcon, { slotitemId: row.icon, className: "kr2-icon" }),
        React.createElement("span", { className: "kr2-arrow" }, row.improveable === false ? "" : expanded ? "▼" : "▶")
      ),
      React.createElement("span", { className: "kr2-name" }, row.name),
      React.createElement("span", { className: "kr2-secretary" }, row.improveable === false ? "" : (secretaryText || "-")),
      React.createElement(
        "span",
        { className: "kr2-meta" },
        row.improveable === false ? "改修未开放" : (row.days && row.days.length >= 7 ? "每日可改修" : (row.days || []).map((d) => WEEKDAY_LABELS[d] || d).join("·"))
      ),
      row.improveable === false
        ? React.createElement("div", { className: "kr2-reco kr2-reco-empty" }, "")
        : React.createElement(
            "span",
            { className: "kr2-reco" },
            React.createElement(
              "span",
              { className: "kr2-reco-line" },
              React.createElement("span", { className: "kr2-reco-label" }, "推荐星级"),
              React.createElement("span", { className: "kr2-stars kr2-stars-priority" }, row.recommend && Number(row.recommend.priority) > 0 ? starText(row.recommend.priority) : "")
            ),
            React.createElement(
              "span",
              { className: "kr2-reco-line" },
              React.createElement("span", { className: "kr2-reco-label" }, "活动强度"),
              React.createElement("span", { className: "kr2-stars kr2-stars-activity" }, row.recommend && Number(row.recommend.activity) > 0 ? starText(row.recommend.activity) : "")
            )
          )
    ),
    row.improveable !== false && expanded
      ? React.createElement(
          "div",
          { className: "kr2-detail" },
          React.createElement(
            "div",
            { className: "kr2-level" },
            React.createElement(
              LevelSection,
              { title: "0→5", defaultOpen: false, resourceText: "成功率100% · 改修资材 " + (row.phase0 ? row.phase0.consume_improvement_min : "--") },
              React.createElement(LevelOneTable, { phase: row.phase0, onMaterialClick, inventoryByEquip, useItemCounts, onInventoryClick, kcDevData })
            )
          ),
          React.createElement(
            "div",
            { className: "kr2-level" },
            React.createElement(
              LevelSection,
              { title: "6→max", defaultOpen: true, resourceText: "成功率 95 / 90 / 82 / 77 / 67 / 62 %" },
              React.createElement(LevelTwoTable, { phase0: row.phase0, phase1: row.phase1, upgrades: row.upgrades, onMaterialClick, inventoryByEquip, useItemCounts, onInventoryClick, kcDevData })
            )
          )
        )
      : null
  )
}

const FAVORITES_STORAGE_KEY = "poi-plugin-koushu-rate:favorites";
const FAVORITES_FILE_NAME = "favorites.json";

function getFavoritesFilePath() {
  try {
    let remote = null
    try {
      remote = require("@electron/remote")
    } catch (_) {}
    if (!remote) {
      try {
        remote = require("electron").remote
      } catch (_) {}
    }
    const app = remote && (remote.app || (remote.default && remote.default.app))
    if (app && typeof app.getPath === "function") {
      return path.join(String(app.getPath("userData")), "poi-plugin-koushu-rate", FAVORITES_FILE_NAME)
    }
  } catch (_) {}
  return null
}

function readFavoritesFromLocalStorage() {
  try {
    const storage = typeof localStorage !== "undefined" ? localStorage : (typeof window !== "undefined" ? window.localStorage : null)
    if (!storage) return {}
    const raw = storage.getItem(FAVORITES_STORAGE_KEY)
    if (!raw) return {}
    const out = {}
    for (const id of JSON.parse(raw) || []) if (id != null) out[String(id)] = true
    return out
  } catch (_) {
    return {}
  }
}

function saveFavoritesToLocalStorage(favorites) {
  try {
    const storage = typeof localStorage !== "undefined" ? localStorage : (typeof window !== "undefined" ? window.localStorage : null)
    if (storage) storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Object.keys(favorites)))
  } catch (_) {}
}

function readFavorites() {
  const file = getFavoritesFilePath()
  let fileFavorites = null
  if (file) {
    try {
      if (fs.existsSync(file)) {
        const parsed = JSON.parse(fs.readFileSync(file, "utf8"))
        const list = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.favorites) ? parsed.favorites : null
        if (Array.isArray(list)) {
          const out = {}
          for (const id of list) if (id != null) out[String(id)] = true
          fileFavorites = out
        }
      }
    } catch (_) {}
  }
  const local = readFavoritesFromLocalStorage()
  if (Object.keys(local).length > 0) {
    if (file) {
      try {
        fs.mkdirSync(path.dirname(file), { recursive: true })
        fs.writeFileSync(file, JSON.stringify({ version: 1, favorites: Object.keys(local) }, null, 2), "utf8")
      } catch (_) {}
    }
    return local
  }
  return fileFavorites || {}
}

function saveFavorites(favorites) {
  const file = getFavoritesFilePath()
  if (file) {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, JSON.stringify({ version: 1, favorites: Object.keys(favorites) }, null, 2), "utf8")
    } catch (_) {}
  }
  saveFavoritesToLocalStorage(favorites)
}

const UI_STATE_STORAGE_KEY = "poi-plugin-koushu-rate:ui-state";
const FAVORITES_ONLY_STORAGE_KEY = "poi-plugin-koushu-rate:favorites-only";
const UI_STATE_FILE_NAME = "ui-state.json";

function getUiStateFilePath() {
  try {
    let remote = null
    try {
      remote = require("@electron/remote")
    } catch (_) {}
    if (!remote) {
      try {
        remote = require("electron").remote
      } catch (_) {}
    }
    const app = remote && (remote.app || (remote.default && remote.default.app))
    if (app && typeof app.getPath === "function") {
      return path.join(String(app.getPath("userData")), "poi-plugin-koushu-rate", UI_STATE_FILE_NAME)
    }
  } catch (_) {}
  return null
}

function readUiStateFromLocalStorage() {
  const out = {}
  try {
    const storage = typeof localStorage !== "undefined" ? localStorage : (typeof window !== "undefined" ? window.localStorage : null)
    if (!storage) return out
    const raw = storage.getItem(UI_STATE_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) Object.assign(out, parsed)
    }
    const legacy = storage.getItem(FAVORITES_ONLY_STORAGE_KEY)
    if (legacy != null && out.favoritesOnly == null) out.favoritesOnly = legacy === "1"
  } catch (_) {}
  return out
}

function writeUiStateToLocalStorage(state) {
  try {
    const storage = typeof localStorage !== "undefined" ? localStorage : (typeof window !== "undefined" ? window.localStorage : null)
    if (storage) storage.setItem(UI_STATE_STORAGE_KEY, JSON.stringify(state || {}))
  } catch (_) {}
}

function readUiState() {
  const file = getUiStateFilePath()
  let fileState = {}
  if (file) {
    try {
      if (fs.existsSync(file)) {
        const parsed = JSON.parse(fs.readFileSync(file, "utf8"))
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) fileState = parsed
      }
    } catch (_) {}
  }
  return Object.assign({}, fileState, readUiStateFromLocalStorage())
}

function saveUiState(patch) {
  const next = Object.assign({}, readUiState(), patch || {})
  for (const key of ["query", "day", "category", "activeTab"]) delete next[key]
  const file = getUiStateFilePath()
  if (file) {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, JSON.stringify(next, null, 2), "utf8")
    } catch (_) {}
  }
  writeUiStateToLocalStorage(next)
  try {
    const storage = typeof localStorage !== "undefined" ? localStorage : (typeof window !== "undefined" ? window.localStorage : null)
    if (storage) storage.setItem(FAVORITES_ONLY_STORAGE_KEY, next.favoritesOnly ? "1" : "0")
  } catch (_) {}
  return next
}

function readFavoritesOnly() {
  return !!readUiState().favoritesOnly
}

function saveFavoritesOnly(value) {
  saveUiState({ favoritesOnly: !!value })
}

function readStrongCategories() {
  const value = readUiState().strongCategories
  return Array.isArray(value) ? value : null
}

function saveStrongCategories(value) {
  saveUiState({ strongCategories: Array.isArray(value) ? value : null })
}
const PLAN_SELECTION_STORAGE_KEY = "poi-plugin-koushu-rate:plan-selection";

function readPlanSelection() {
  try {
    const storage = typeof localStorage !== "undefined" ? localStorage : (typeof window !== "undefined" ? window.localStorage : null)
    if (!storage) return {}
    const raw = storage.getItem(PLAN_SELECTION_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}
  } catch (_) {
    return {}
  }
}

function savePlanSelection(selection) {
  try {
    const storage = typeof localStorage !== "undefined" ? localStorage : (typeof window !== "undefined" ? window.localStorage : null)
    if (storage) storage.setItem(PLAN_SELECTION_STORAGE_KEY, JSON.stringify(selection || {}))
  } catch (_) {}
}

const PLAN_INCLUDE_DEV_STORAGE_KEY = "poi-plugin-koushu-rate:plan-include-dev";

function readPlanIncludeDev() {
  try {
    const storage = typeof localStorage !== "undefined" ? localStorage : (typeof window !== "undefined" ? window.localStorage : null)
    if (!storage) return false
    return storage.getItem(PLAN_INCLUDE_DEV_STORAGE_KEY) === "1"
  } catch (_) {
    return false
  }
}

function savePlanIncludeDev(value) {
  try {
    const storage = typeof localStorage !== "undefined" ? localStorage : (typeof window !== "undefined" ? window.localStorage : null)
    if (storage) storage.setItem(PLAN_INCLUDE_DEV_STORAGE_KEY, value ? "1" : "0")
  } catch (_) {}
}

class KoushuRateApp extends React.Component {
  state = {
    query: "",
    day: japanWeekdayKey(),
    category: "all",
    categoryOpen: false,
    expanded: {},
    rows: [],
    version: "",
    updatedAt: "",
    akashi: null,
    akashiUpdatedAt: "",
    akashiStatus: "",
    error: null,
    kcDevPopup: null,
    inventoryPopup: null,
    inventoryByEquip: {},
    useItemCounts: {},
    kcDevData: null,
    favorites: readFavorites(),
    favoritesOnly: readFavoritesOnly(),
    starSort: readUiState().starSort || null,
    activeTab: "list",
    improveableOpen: true,
    nonImproveableOpen: false,
    planSelection: readPlanSelection(),
    includeDevExpected: readPlanIncludeDev(),
  }

  componentDidMount() {
    this.refresh()
    this.checkAkashiUpdate(false)
    refreshKcDevData().catch(() => {})
    this.loadKcDevExpectations()
    this.refreshInventory()
    this.inventoryTimer = setInterval(() => this.refreshInventory(), 1000)
  }

  componentWillUnmount() {
    if (this.inventoryTimer) clearInterval(this.inventoryTimer)
  }

  loadKcDevExpectations = () => {
    loadKcDevData(false)
      .then((data) => this.setState({ kcDevData: data }))
      .catch(() => {})
  }

  refreshInventory = () => {
    const nextEquips = getEquipInventory(getInventoryEquips(this.props.envWindow))
    const nextUseItems = getUseItemCounts(this.props.envWindow)
    this.setState((prev) => {
      const curEquips = prev.inventoryByEquip || {}
      const curUseItems = prev.useItemCounts || {}
      if (JSON.stringify(nextEquips) === JSON.stringify(curEquips) && JSON.stringify(nextUseItems) === JSON.stringify(curUseItems)) return null
      return { inventoryByEquip: nextEquips, useItemCounts: nextUseItems }
    })
  }

  checkAkashiUpdate = async (force) => {
    this.setState({ akashiStatus: force ? "正在更新明石数据..." : "" })
    try {
      const result = await checkAkashiUpdate(force)
      this.setState({
        akashi: result.data,
        akashiUpdatedAt: result.data && result.data.updatedAt ? String(result.data.updatedAt) : "",
        akashiStatus: result.ok
          ? (result.skipped ? "明石数据已是最新" : "明石数据已更新")
          : "明石数据更新失败，使用缓存",
      })
    } catch (error) {
      this.setState({
        akashiStatus: "明石数据更新失败",
        error: String(error && (error.stack || error)),
      })
    }
    this.refresh()
  }

  refresh = () => {
    try {
      const staticData = loadStaticData()
      const masterEquips = getMasterEquips(this.props.envWindow)
      const rows = buildRows(staticData, masterEquips, buildFallbackNameMap(), this.state.akashi, loadRecommendations(), loadSecretaryArrangement(this.state.akashi))
      const manifest = staticData.dataManifest || {}
      this.setState({
        rows,
        version: String(manifest.data_version || "未知"),
        updatedAt: String(manifest.updated_at || ""),
        error: null,
      })
    } catch (error) {
      this.setState({ error: String(error && error.stack ? error.stack : error) })
    }
  }

  toggle = (id) => {
    this.setState((prev) => ({
      expanded: Object.assign({}, prev.expanded, { [id]: !prev.expanded[id] }),
    }))
  }

  toggleFavorite = (id) => {
    this.setState((prev) => {
      const favorites = Object.assign({}, prev.favorites)
      if (favorites[id]) delete favorites[id]
      else favorites[id] = true
      saveFavorites(favorites)
      return { favorites }
    })
  }

  toggleFavoritesOnly = () => {
    this.setState((prev) => {
      const favoritesOnly = !prev.favoritesOnly
      saveFavoritesOnly(favoritesOnly)
      return { favoritesOnly }
    })
  }

  toggleStarSort = () => {
    this.setState((prev) => {
      const starSort = prev.starSort === "desc" ? "asc" : prev.starSort === "asc" ? null : "desc"
      saveUiState({ starSort })
      return { starSort }
    })
  }

  toggleCategory = () => {
    this.setState((prev) => ({ categoryOpen: !prev.categoryOpen }))
  }

  selectCategory = (value) => {
    this.setState({ category: value, categoryOpen: false })
  }

  openKcDevPopup = (item) => {
    const equipId = item && item.item_equipment_id != null ? String(item.item_equipment_id) : null
    const name = String((item && item.item_name) || (equipId != null ? "装备 " + equipId : "未知素材"))
    if (equipId == null) {
      this.setState({ kcDevPopup: { equipId: null, name, loading: false, error: "该素材不是装备，没有开发配方", formulas: [], sort: { key: "rate", dir: "desc" } } })
      return
    }
    this.setState({ kcDevPopup: { equipId, name, loading: true, error: "", formulas: [], sort: { key: "rate", dir: "desc" } } })
    this.loadKcDevFormulas(equipId, name)
  }

  loadKcDevFormulas = async (equipId, name) => {
    try {
      const data = await loadKcDevData(false)
      const formulas = kcDevRecipes(data, equipId)
      this.setState((prev) =>
        prev.kcDevPopup && prev.kcDevPopup.equipId === String(equipId)
          ? {
              kcDevPopup: {
                equipId: String(equipId),
                name,
                loading: false,
                error: formulas.length > 0 ? "" : "该装备暂无可用开发配方",
                formulas,
                sort: (prev.kcDevPopup && prev.kcDevPopup.sort) || { key: "rate", dir: "desc" },
              },
            }
          : prev
      )
    } catch (error) {
      this.setState((prev) =>
        prev.kcDevPopup && prev.kcDevPopup.equipId === String(equipId)
          ? {
              kcDevPopup: {
                equipId: String(equipId),
                name,
                loading: false,
                error: String(error && (error.stack || error)),
                formulas: [],
                sort: (prev.kcDevPopup && prev.kcDevPopup.sort) || { key: "rate", dir: "desc" },
              },
            }
          : prev
      )
    }
  }

  closeKcDevPopup = () => {
    this.setState({ kcDevPopup: null })
  }

  openInventoryPopup = (item) => {
    const equipId = item && item.item_equipment_id != null ? String(item.item_equipment_id) : null
    const name = String((item && item.item_name) || (equipId != null ? "装备 " + equipId : "未知素材"))
    this.setState({ inventoryPopup: { equipId, name } })
  }

  closeInventoryPopup = () => {
    this.setState({ inventoryPopup: null })
  }

  setActiveTab = (tab) => {
    this.setState({ activeTab: tab })
  }

  planDefaultSel = (id) => ({ selected: true, target: "max", qty: 1 })

  togglePlanRow = (id) => {
    this.setState((prev) => {
      const cur = prev.planSelection[id] || this.planDefaultSel(id)
      const planSelection = Object.assign({}, prev.planSelection, { [id]: Object.assign({}, cur, { selected: !cur.selected }) })
      savePlanSelection(planSelection)
      return { planSelection }
    })
  }

  setPlanTarget = (id, target) => {
    this.setState((prev) => {
      const cur = prev.planSelection[id] || this.planDefaultSel(id)
      const next = Object.assign({}, cur, { target, evoUpgradeId: null })
      const planSelection = Object.assign({}, prev.planSelection, { [id]: next })
      savePlanSelection(planSelection)
      return { planSelection }
    })
  }

  setPlanEvo = (id, upgradeId) => {
    this.setState((prev) => {
      const cur = prev.planSelection[id] || this.planDefaultSel(id)
      const next = Object.assign({}, cur, { target: "max", evoUpgradeId: upgradeId == null ? null : String(upgradeId) })
      const planSelection = Object.assign({}, prev.planSelection, { [id]: next })
      savePlanSelection(planSelection)
      return { planSelection }
    })
  }

  setPlanQty = (id, qty) => {
    const n = Math.max(1, Math.min(99, Math.round(Number(qty) || 1)))
    this.setState((prev) => {
      const cur = prev.planSelection[id] || this.planDefaultSel(id)
      const planSelection = Object.assign({}, prev.planSelection, { [id]: Object.assign({}, cur, { qty: n }) })
      savePlanSelection(planSelection)
      return { planSelection }
    })
  }

  selectAllPlan = (selected) => {
    this.setState((prev) => {
      const planSelection = Object.assign({}, prev.planSelection)
      for (const row of prev.rows) {
        if (!prev.favorites[row.id]) continue
        const cur = planSelection[row.id] || this.planDefaultSel(row.id)
        planSelection[row.id] = Object.assign({}, cur, { selected })
      }
      savePlanSelection(planSelection)
      return { planSelection }
    })
  }

  toggleIncludeDevExpected = () => {
    this.setState((prev) => {
      const includeDevExpected = !prev.includeDevExpected
      savePlanIncludeDev(includeDevExpected)
      return { includeDevExpected }
    })
  }

  setKcDevSort = (key) => {
    this.setState((prev) => {
      const popup = prev.kcDevPopup
      if (!popup) return prev
      const dir = popup.sort && popup.sort.key === key ? (popup.sort.dir === "asc" ? "desc" : "asc") : "desc"
      return { kcDevPopup: Object.assign({}, popup, { sort: { key, dir } }) }
    })
  }

  openKcDevSite = () => {
    openExternalUrl(KC_DEV_URL)
  }

  render() {
    const query = normalizeText(this.state.query)
    const day = this.state.day || ALL_DAYS_KEY
    const category = this.state.category || "all"
    const categories = Array.from(new Set(this.state.rows.map((row) => row.category).filter(Boolean))).sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a)
      const ib = CATEGORY_ORDER.indexOf(b)
      if (ia >= 0 && ib >= 0) return ia - ib
      if (ia >= 0) return -1
      if (ib >= 0) return 1
      return a.localeCompare(b, "zh-Hans-CN")
    })
    const kcDevPopup = this.state.kcDevPopup
    const inventoryPopup = this.state.inventoryPopup
    const kcDevSort = (kcDevPopup && kcDevPopup.sort) || { key: "rate", dir: "desc" }
    const kcDevFormulas = kcDevPopup && Array.isArray(kcDevPopup.formulas) ? kcDevPopup.formulas.slice() : []
    if (kcDevSort.key === "rate" || kcDevSort.key === "failRate") {
      kcDevFormulas.sort((a, b) => {
        const diff = a[kcDevSort.key] - b[kcDevSort.key]
        return kcDevSort.dir === "asc" ? diff : -diff
      })
    }
    const inventoryByEquip = this.state.inventoryByEquip || {}
    const useItemCounts = this.state.useItemCounts || {}
    const favoritesOnly = !!this.state.favoritesOnly
    let rows = this.state.rows.filter((row) => {
      if (favoritesOnly && !this.state.favorites[row.id]) return false
      if (row.improveable !== false && day !== ALL_DAYS_KEY && (row.days || []).indexOf(day) < 0) return false
      if (category !== "all" && row.category !== category) return false
      return true
    })
    if (query) {
      rows = rows
        .map((row) => ({ row, score: fuzzyScore(row, query) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.row)
    }
    const starSort = this.state.starSort
    if (starSort === "desc" || starSort === "asc") {
      rows = rows
        .map((row, index) => ({ row, index, stars: recommendStarValues(row) }))
        .sort((a, b) => {
          const dir = starSort === "desc" ? 1 : -1
          if (a.stars.priority !== b.stars.priority) return (b.stars.priority - a.stars.priority) * dir
          if (a.stars.activity !== b.stars.activity) return (b.stars.activity - a.stars.activity) * dir
          return a.index - b.index
        })
        .map((item) => item.row)
    }
    const improveableRows = rows.filter((row) => row.improveable !== false)
    const notImproveableRows = rows.filter((row) => row.improveable === false)
    const renderEquipmentRow = (row) =>
      React.createElement(EquipmentRow, {
        key: row.id,
        row,
        expanded: !!this.state.expanded[row.id],
        onToggle: () => this.toggle(row.id),
        onMaterialClick: this.openKcDevPopup,
        inventoryByEquip,
        useItemCounts,
        onInventoryClick: this.openInventoryPopup,
        isFavorite: !!this.state.favorites[row.id],
        onFavoriteClick: this.toggleFavorite,
        secretaryText: secretaryText(row.secretaries, day),
        kcDevData: this.state.kcDevData,
      })

    return React.createElement(
      "div",
      { className: "kr2-root" },
      React.createElement("style", { dangerouslySetInnerHTML: { __html: CSS } }),
      React.createElement(
        "div",
        { className: "kr2-header" },

        React.createElement(
          "div",
          { className: "kr2-title-row" },
          React.createElement(
            "div",
            null,
            React.createElement("div", { className: "kr2-title" }, "螺丝计算器"),
            React.createElement(
              "div",
              { className: "kr2-title-note" },
              "螺丝确保仅供参考，稀有素材消耗请酌情考虑～(∠・ω< )⌒★"
            ),
            React.createElement(
              "div",
              { className: "kr2-sub" },
              "数据版本 " + this.state.version + (this.state.updatedAt ? " · " + this.state.updatedAt : ""),
              this.state.akashiUpdatedAt
                ? React.createElement(
                    "span",
                    null,
                    " · ",
                    React.createElement(
                      "a",
                      { className: "kr2-link", href: AKASHI_URL, onClick: (e) => { e.preventDefault(); openExternalUrl(AKASHI_URL) } },
                      "明石数据"
                    ),
                    " " + this.state.akashiUpdatedAt.slice(0, 10)
                  )
                : null
            ),
            React.createElement(
              "div",
              { className: "kr2-reco-source" },
              "推荐星级参考",
              React.createElement(
                "a",
                { className: "kr2-link", href: NGA_RECO_URL, onClick: (e) => { e.preventDefault(); openExternalUrl(NGA_RECO_URL) } },
                "梦美的日常改修推荐"
              )
            )
          ),
          React.createElement(
            "div",
            { className: "kr2-nav" },
            React.createElement("button", { className: "kr2-nav-btn" + (this.state.activeTab === "list" ? " kr2-nav-active" : ""), onClick: () => this.setActiveTab("list") }, "改修列表"),
            React.createElement("button", { className: "kr2-nav-btn" + (this.state.activeTab === "plan" ? " kr2-nav-active" : ""), onClick: () => this.setActiveTab("plan") }, "素材计算"),
            React.createElement("button", { className: "kr2-nav-btn" + (this.state.activeTab === "strong" ? " kr2-nav-active" : ""), onClick: () => this.setActiveTab("strong") }, "我变强了！")
          ),
          React.createElement(
            "div",
            { className: "kr2-toolbar", style: this.state.activeTab === "plan" || this.state.activeTab === "strong" ? { display: "none" } : null },
            React.createElement("input", {
              className: "kr2-search",
              value: this.state.query,
              placeholder: "搜索装备名称...",
              onChange: (e) => this.setState({ query: e.target.value }),
            }),
            React.createElement(
              "div",
              { className: "kr2-dropdown", onBlur: () => this.setState({ categoryOpen: false }) },
              React.createElement(
                "button",
                { type: "button", className: "kr2-cat", onClick: this.toggleCategory },
                category === ALL_DAYS_KEY ? "全部分类" : category,
                React.createElement("span", { className: "kr2-cat-arrow" }, this.state.categoryOpen ? "▲" : "▼")
              ),
              this.state.categoryOpen
                ? React.createElement(
                    "div",
                    { className: "kr2-cat-menu", onMouseDown: (e) => e.preventDefault() },
                    React.createElement(
                      "div",
                      { className: "kr2-cat-option" + (category === ALL_DAYS_KEY ? " kr2-cat-option-active" : ""), onClick: () => this.selectCategory(ALL_DAYS_KEY) },
                      "全部分类"
                    ),
                    categories.map((c) =>
                      React.createElement(
                        "div",
                        { className: "kr2-cat-option" + (category === c ? " kr2-cat-option-active" : ""), key: c, onClick: () => this.selectCategory(c) },
                        c
                      )
                    )
                  )
                : null
            ),
            React.createElement("button", { className: "kr2-button", onClick: () => this.checkAkashiUpdate(true) }, "更新数据"),
            React.createElement("button", { className: "kr2-button", onClick: this.refresh }, "刷新"),
            this.state.akashiStatus
              ? React.createElement("span", { className: "kr2-status" }, this.state.akashiStatus)
              : null
          )
        ),

        React.createElement(
          "div",
          { className: "kr2-days", style: this.state.activeTab === "plan" || this.state.activeTab === "strong" ? { display: "none" } : null },
          React.createElement(
            "button",
            { className: "kr2-day" + (day === ALL_DAYS_KEY ? " kr2-day-active" : ""), onClick: () => this.setState({ day: ALL_DAYS_KEY }) },
            "全部"
          ),
          WEEKDAY_KEYS.map((key) =>
            React.createElement(
              "button",
              { className: "kr2-day" + (day === key ? " kr2-day-active" : ""), onClick: () => this.setState({ day: key }) },
              WEEKDAY_LABELS[key]
            )
          ),
          React.createElement(
            "button",
            { className: "kr2-day kr2-fav-toggle" + (favoritesOnly ? " kr2-fav-active" : ""), onClick: this.toggleFavoritesOnly, title: favoritesOnly ? "显示全部装备" : "只显示收藏装备" },
            favoritesOnly ? "★收藏" : "☆收藏"
          )
        )
      ),
      this.state.error
        ? React.createElement("pre", { className: "kr2-error" }, this.state.error)
        : null,
      React.createElement(
        "div",
        { className: "kr2-list-head", style: this.state.activeTab === "plan" || this.state.activeTab === "strong" ? { display: "none" } : null },
        React.createElement("span", { className: "kr2-head-name" }, "装备"),
        React.createElement("span", { className: "kr2-head-secretary" }, "秘书舰"),
        React.createElement("span", { className: "kr2-head-meta" }, "可改修日期"),
        React.createElement(
          "span",
          { className: "kr2-head-reco" },
          React.createElement(
            "button",
      { className: "kr2-sort-btn" + (this.state.starSort ? " kr2-sort-active" : ""), onClick: this.toggleStarSort, title: "按推荐星级排序（推荐星级优先，活动强度次之）" },
            "推荐星级/素材消耗",
            React.createElement("span", { className: "kr2-sort-arrow" }, this.state.starSort === "desc" ? "▼" : this.state.starSort === "asc" ? "▲" : "↕")
          )
        )
      ),
      React.createElement(
        "div",
        { className: "kr2-list", style: this.state.activeTab === "plan" || this.state.activeTab === "strong" ? { display: "none" } : null },
        rows.length === 0
          ? React.createElement("div", { className: "kr2-empty" }, favoritesOnly ? "还没有收藏装备" : "没有匹配的装备")
          : [
              React.createElement(
                "div",
                { key: "improveable-group", className: "kr2-improveable-group" },
                React.createElement(
                  "button",
                  { type: "button", className: "kr2-collapse-toggle", onClick: () => this.setState((prev) => ({ improveableOpen: !prev.improveableOpen })) },
                  this.state.improveableOpen ? "▼ " : "▶ ",
                  "可改修装备 (",
                  String(improveableRows.length),
                  ")"
                ),
                this.state.improveableOpen ? improveableRows.map((row) => renderEquipmentRow(row)) : null
              ),
              notImproveableRows.length > 0
                ? React.createElement(
                    "div",
                    { key: "not-improveable-group", className: "kr2-not-improveable-group" },
                    React.createElement(
                      "button",
                      { type: "button", className: "kr2-collapse-toggle", onClick: () => this.setState((prev) => ({ nonImproveableOpen: !prev.nonImproveableOpen })) },
                      this.state.nonImproveableOpen ? "▼ " : "▶ ",
                      "不可改修装备 (",
                      String(notImproveableRows.length),
                      ")"
                    ),
                    this.state.nonImproveableOpen ? notImproveableRows.map((row) => renderEquipmentRow(row)) : null
                  )
                : null,
            ]
      ),
      this.state.activeTab === "plan"
        ? React.createElement(PlanningPage, {
            rows: this.state.rows.filter((row) => !!this.state.favorites[row.id]),
            inventoryByEquip,
            useItemCounts,
            selection: this.state.planSelection || {},
            onToggle: this.togglePlanRow,
            onTarget: this.setPlanTarget,
            onEvo: this.setPlanEvo,
            onQty: this.setPlanQty,
            onSelectAll: this.selectAllPlan,
            onMaterialClick: this.openKcDevPopup,
            kcDevData: this.state.kcDevData,
            includeDevExpected: !!this.state.includeDevExpected,
            onToggleIncludeDevExpected: this.toggleIncludeDevExpected,
          })
        : null,
      this.state.activeTab === "strong"
        ? React.createElement(StrongPage, {
            rows: this.state.rows.filter((row) => !!this.state.favorites[row.id]),
            inventoryByEquip,
            selection: this.state.planSelection || {},
          })
        : null,
      kcDevPopup
        ? React.createElement(
            "div",
            { className: "kr2-modal-backdrop", onClick: this.closeKcDevPopup },
            React.createElement(
              "div",
              { className: "kr2-modal", onClick: (e) => e.stopPropagation() },
              React.createElement(
                "div",
                { className: "kr2-modal-head" },
                React.createElement(
                  "div",
                  null,
                  React.createElement("div", { className: "kr2-modal-title" }, "开发配方"),
                  React.createElement(
                    "div",
                    { className: "kr2-modal-sub" },
                    kcDevPopup.name + (kcDevPopup.equipId != null ? " · 装备ID " + kcDevPopup.equipId : "")
                  )
                ),
                React.createElement(
                  "div",
                  { className: "kr2-modal-actions" },
                  React.createElement("button", { className: "kr2-button", onClick: this.openKcDevSite }, "打开网站"),
                  React.createElement("button", { className: "kr2-button", onClick: this.closeKcDevPopup }, "关闭")
                )
              ),
              kcDevPopup.loading
                ? React.createElement("div", { className: "kr2-empty" }, "正在获取开发配方数据...")
                : kcDevPopup.error
                  ? React.createElement("pre", { className: "kr2-error" }, kcDevPopup.error)
                  : kcDevFormulas.length === 0
                    ? React.createElement("div", { className: "kr2-empty" }, "该装备暂无可用开发配方")
                    : React.createElement(
                        "div",
                        { className: "kr2-dev-scroll" },
                        React.createElement(
                          "table",
                          { className: "kr2-table" },
                          React.createElement(
                            "thead",
                            null,
                            React.createElement(
                              "tr",
                              null,
                              React.createElement("th", null, "秘书舰"),
                              React.createElement("th", null, "油"),
                              React.createElement("th", null, "弹"),
                              React.createElement("th", null, "钢"),
                              React.createElement("th", null, "铝"),
                              React.createElement("th", null, "总资源"),
                              React.createElement("th", null, "池类型"),
                              React.createElement(
                                "th",
                                null,
                                React.createElement(
                                  "button",
                                  { className: "kr2-sort-btn" + (kcDevSort.key === "rate" ? " kr2-sort-active" : ""), onClick: () => this.setKcDevSort("rate") },
                                  "出货率",
                                  React.createElement("span", { className: "kr2-sort-arrow" }, kcDevSort.key === "rate" ? (kcDevSort.dir === "desc" ? "▼" : "▲") : "↕")
                                )
                              ),
                              React.createElement(
                                "th",
                                null,
                                React.createElement(
                                  "button",
                                  { className: "kr2-sort-btn" + (kcDevSort.key === "failRate" ? " kr2-sort-active" : ""), onClick: () => this.setKcDevSort("failRate") },
                                  "失败率",
                                  React.createElement("span", { className: "kr2-sort-arrow" }, kcDevSort.key === "failRate" ? (kcDevSort.dir === "desc" ? "▼" : "▲") : "↕")
                                )
                              )
                            )
                          ),
                          React.createElement(
                            "tbody",
                            null,
                            kcDevFormulas.map((f, idx) =>
                              React.createElement(
                                "tr",
                                { key: idx },
                                React.createElement("td", null, f.poolName),
                                React.createElement("td", null, String(f.formula[0])),
                                React.createElement("td", null, String(f.formula[1])),
                                React.createElement("td", null, String(f.formula[2])),
                                React.createElement("td", null, String(f.formula[3])),
                                React.createElement("td", null, String(f.total)),
                                React.createElement("td", null, f.poolType),
                                React.createElement("td", null, f.rate.toFixed(2) + "%"),
                                React.createElement("td", null, f.failRate.toFixed(2) + "%")
                              )
                            )
                          )
                        )
                      )
            )
          )
        : null,
        inventoryPopup
          ? React.createElement(InventoryModal, {
              equipId: inventoryPopup.equipId,
              name: inventoryPopup.name,
              inventory: inventoryPopup.equipId != null ? inventoryByEquip[inventoryPopup.equipId] : null,
              onClose: this.closeInventoryPopup,
            })
          : null
    )
  }
}

function KoushuRateAppWithEnv() {
  return React.createElement(WindowEnv.Consumer, null, (ctx) => {
    const w =
      (ctx && ctx.window) ||
      (ctx && ctx.env && ctx.env.window) ||
      (ctx && ctx.remoteWindow) ||
      null
    return React.createElement(KoushuRateApp, { envWindow: w })
  })
}

module.exports = {
  reactClass: KoushuRateAppWithEnv,
  windowMode: true,
}
