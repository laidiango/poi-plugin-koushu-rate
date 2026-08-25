const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.resolve(__dirname, "..");
const targetsRaw = require(path.join(root, "data/improvement_upgrade_target.json"));
const arrangement = require(path.join(root, "data/improvement_arrangement.json"));
const stepEquips = Array.from(new Set(require(path.join(root, "data/improvement_consume_step.json")).map((r) => String(r.equipment_id))));
const names = require(path.join(root, "data/equip_names.json"));
const nameById = {};
for (const e of names) nameById[String(e.id)] = e.name;
const byEquip = {};
for (const r of targetsRaw) (byEquip[String(r.equipment_id)] || (byEquip[String(r.equipment_id)] = [])).push(r);
const noUpgradeId = stepEquips.find((id) => !byEquip[id]);
const multiId = Object.keys(byEquip).find((id) => byEquip[id].length >= 2);
if (!noUpgradeId || !multiId) throw new Error("cannot pick test equipment");

const virtualConsole = new VirtualConsole();
virtualConsole.on("error", (...args) => console.error("VC error:", ...args));
virtualConsole.on("jsdomError", (...args) => console.error("VC jsdomError:", ...args));
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: "http://localhost/",
  pretendToBeVisual: true,
  runScripts: "outside-only",
  virtualConsole,
});
const { window } = dom;
global.window = window;
global.document = window.document;
global.navigator = window.navigator;
global.localStorage = window.localStorage;
global.location = window.location;
global.fetch = () => Promise.reject(new Error("offline"));
try {
  window.eval(fs.readFileSync(path.join(__dirname, "bundle.js"), "utf8"));
} catch (err) {
  console.error("eval error:", err);
  process.exit(1);
}
console.log("after eval body len:", window.document.body.innerHTML.length, "root children:", window.document.getElementById("root").children.length);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function clickRow(namePart) {
  const row = Array.from(window.document.querySelectorAll(".kr2-row")).find((el) => {
    const nameEl = el.querySelector(".kr2-name");
    return nameEl && nameEl.textContent === namePart;
  });
  if (!row) throw new Error("row not found: " + namePart);
  row.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
}
function clickNav(label) {
  const btn = Array.from(window.document.querySelectorAll(".kr2-nav-btn")).find((el) => el.textContent.trim() === label);
  if (!btn) throw new Error("nav not found: " + label);
  btn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
}
function clickFavorite(namePart) {
  const row = Array.from(window.document.querySelectorAll(".kr2-row")).find((el) => {
    const nameEl = el.querySelector(".kr2-name");
    return nameEl && nameEl.textContent === namePart;
  });
  if (!row) throw new Error("favorite row not found: " + namePart);
  const btn = row.querySelector(".kr2-fav-btn");
  if (!btn) throw new Error("favorite button not found: " + namePart);
  btn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
}

(async () => {
  await sleep(1500);
  const html = window.document.body.innerHTML;
  console.log("after wait body len:", html.length, "title:", html.includes("螺丝计算器"), "rows:", window.document.querySelectorAll(".kr2-row").length);
  if (!html.includes("螺丝计算器")) throw new Error("app did not render");
  const titleEl = window.document.querySelector(".kr2-title");
  const navEl = window.document.querySelector(".kr2-nav");
  const searchEl = window.document.querySelector(".kr2-search");
  const isBefore = (a, b) => a && b && (a.compareDocumentPosition(b) & 4) !== 0;
  if (!isBefore(titleEl, navEl) || !isBefore(navEl, searchEl)) {
    throw new Error("layout order must be title -> nav -> search");
  }
  const improveToggle = window.document.querySelectorAll(".kr2-collapse-toggle")[0];
  if (!improveToggle) throw new Error("improveable toggle missing");
  if (window.document.querySelectorAll(".kr2-improveable-group .kr2-row").length === 0) {
    throw new Error("improveable rows should be expanded by default");
  }
  const notImpToggle = window.document.querySelectorAll(".kr2-collapse-toggle")[1];
  if (!notImpToggle) throw new Error("non-improveable toggle missing");
  if (window.document.querySelectorAll(".kr2-row-not-improveable").length !== 0) {
    throw new Error("non-improveable rows should be collapsed by default");
  }
  notImpToggle.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(200);
  const allRows = Array.from(window.document.querySelectorAll(".kr2-row"));
  if (allRows.length === 0 || !allRows[allRows.length - 1].classList.contains("kr2-row-not-improveable")) {
    throw new Error("non-improveable rows should be at bottom");
  }
  if (allRows.filter((r) => r.classList.contains("kr2-row-not-improveable")).length === 0) {
    throw new Error("non-improveable rows missing");
  }
  const expandedHtml = window.document.body.innerHTML;
  if (!expandedHtml.includes("改修未开放")) {
    throw new Error("non-improveable date column missing");
  }
  clickRow("46cm三連装砲");
  await sleep(300);
  if (!window.document.querySelector(".kr2-rare-warning")) {
    throw new Error("rare material warning missing");
  }
  const zeroRateRows = Array.from(window.document.querySelectorAll(".kr2-rate-row")).filter((tr) => /^★[0-4]→/.test(tr.children[0].textContent));
  if (zeroRateRows.some((tr) => tr.querySelector(".kr2-rare-warning, .kr2-rare-warning-secondary"))) {
    throw new Error("0-5 phase should not show rare warning");
  }
  const secondaryCandidates = ["8cm高角砲", "彗星一二型甲", "10cm連装高角砲(砲架)", "毘式40mm連装機銃", "紫雲", "TBF"];
  const secondaryRowName = secondaryCandidates.find((name) => Array.from(window.document.querySelectorAll(".kr2-name")).some((el) => el.textContent === name));
  if (!secondaryRowName) throw new Error("no secondary candidate row found");
  clickRow(secondaryRowName);
  await sleep(300);
  if (!window.document.querySelector(".kr2-rare-warning")) {
    throw new Error("merged rare material warning missing");
  }
  const zeroRateRows2 = Array.from(window.document.querySelectorAll(".kr2-rate-row")).filter((tr) => /^★[0-4]→/.test(tr.children[0].textContent));
  if (zeroRateRows2.some((tr) => tr.querySelector(".kr2-rare-warning, .kr2-rare-warning-secondary"))) {
    throw new Error("0-5 phase should not show secondary rare warning");
  }
  clickRow("46cm三連装砲");
  await sleep(300);
  const favBtn = window.document.querySelector(".kr2-fav-btn");
  if (!favBtn) throw new Error("favorite button missing");
  favBtn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(100);
  const favRaw = window.localStorage.getItem("poi-plugin-koushu-rate:favorites");
  if (!favRaw || JSON.parse(favRaw).length !== 1) throw new Error("favorite did not persist to localStorage fallback");
  const favOnlyBtn = window.document.querySelector(".kr2-fav-toggle");
  if (!favOnlyBtn) throw new Error("favorites-only button missing");
  favOnlyBtn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(100);
  if (window.localStorage.getItem("poi-plugin-koushu-rate:favorites-only") !== "1") {
    throw new Error("favorites-only pressed state did not persist");
  }
  favOnlyBtn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(100);
  clickNav("我变强了！");
  await sleep(200);
  const strongHtml = window.document.body.innerHTML;
  if (!strongHtml.includes("装备分类") || !strongHtml.includes("目标装备") || !strongHtml.includes("目标数") || !strongHtml.includes("库存") || !strongHtml.includes("完成数")) {
    throw new Error("strong page headers missing");
  }
  if (!strongHtml.includes("max") || !strongHtml.includes("+")) {
    throw new Error("strong page level format missing max/+n");
  }
  if (window.document.querySelectorAll(".kr2-strong-stock-short").length === 0) {
    throw new Error("strong page stock level-short color missing");
  }
  const catHead = window.document.querySelector(".kr2-strong-cat-th");
  if (!catHead) throw new Error("strong page category header missing");
  catHead.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(100);
  const firstCategoryCheck = window.document.querySelector(".kr2-strong-cat-option input");
  if (!firstCategoryCheck) throw new Error("strong page category dropdown missing");
  firstCategoryCheck.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(100);
  if (window.document.querySelectorAll(".kr2-strong-cat").length !== 0) {
    throw new Error("category filter did not hide rows");
  }
  const reopenedCheck = window.document.querySelector(".kr2-strong-cat-option input");
  reopenedCheck.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(100);
  if (window.document.querySelectorAll(".kr2-strong-cat").length === 0) {
    throw new Error("category filter did not restore rows");
  }
  if (window.document.querySelectorAll(".kr2-strong-stock-name").length === 0) {
    throw new Error("strong page stock name missing");
  }
  const targetNums = Array.from(window.document.querySelectorAll(".kr2-strong-target")).map((td) => Number(td.textContent));
  const targetSum = targetNums.reduce((a, b) => a + b, 0);
  if (targetSum !== 1) throw new Error("split target count sum must equal 1, got " + targetSum);
  if (targetNums.some((n) => n <= 0)) throw new Error("zero target rows should be hidden");
  if (window.document.querySelectorAll(".kr2-strong-owned.kr2-strong-stock-clear").length === 0) {
    throw new Error("owned count equal should be sky blue");
  }
  if (window.document.querySelectorAll(".kr2-strong-owned").length === 0) {
    throw new Error("strong page owned column missing");
  }
  if (window.document.querySelectorAll(".kr2-strong-level").length === 0) {
    throw new Error("strong page has no target rows");
  }
  clickNav("改修列表");
  await sleep(200);

  clickRow(nameById[noUpgradeId]);
  await sleep(300);
  const noUpgradeHtml = window.document.body.innerHTML;
  if (noUpgradeHtml.includes("MAX→进化")) throw new Error("non-evolvable row still shows MAX→进化");
  if (!noUpgradeHtml.includes("kr2-level-max-blue")) {
    throw new Error("non-evolvable 9→max should show blue max");
  }

  clickRow(nameById[multiId]);
  await sleep(300);
  const multiHtml = window.document.body.innerHTML;
  const upgradeRows = (multiHtml.match(/进化→/g) || []).length;
  const firstTarget = byEquip[multiId][0];
  const routeKey = firstTarget.route_kind == null ? "" : String(firstTarget.route_kind);
  const branchLabels = arrangement
    .filter((r) => String(r.equipment_id) === multiId && String(r.route_kind || "") === routeKey)
    .map((r) => r.secretary_label)
    .filter((label) => label && label !== "-");
  const targetName = nameById[String(firstTarget.upgrade_id)];
  const evolCell = Array.from(window.document.querySelectorAll(".kr2-rate-evol-cell")).find((cell) =>
    cell.textContent.includes("进化→" + targetName)
  );
  const evolTarget = evolCell && evolCell.querySelector(".kr2-evol-target");
  if (!evolTarget || evolTarget.textContent !== targetName) {
    throw new Error("evolved equipment name is not blue-colored");
  }
  if (!evolCell || !evolCell.textContent.includes(branchLabels.join("/"))) {
    throw new Error("secretary line missing under evolution row");
  }
  if (upgradeRows < byEquip[multiId].length) throw new Error("multi-branch rows missing: id=" + multiId + " name=" + nameById[multiId] + " branches=" + byEquip[multiId].length + " found=" + upgradeRows + " hasText=" + multiHtml.includes("进化→"));

  clickFavorite(nameById[multiId]);
  await sleep(200);
  clickFavorite("12.7cm連装砲D型改二");
  await sleep(200);
  clickNav("素材计算");
  await sleep(300);
  const planTable = window.document.querySelector(".kr2-plan-table");
  const planRow = Array.from(planTable.querySelectorAll("tbody tr")).find((el) => el.textContent.includes(nameById[multiId]));
  if (!planRow) throw new Error("plan row not found: " + nameById[multiId]);
  if (!planTable.classList.contains("kr2-plan-main-table")) {
    throw new Error("plan main table fixed width class missing");
  }
  if (!planTable.querySelector(".kr2-plan-target-group")) {
    throw new Error("plan target button group missing");
  }
  if (!planTable.querySelector(".kr2-plan-target-btn")) {
    throw new Error("plan target buttons missing");
  }
  const dTypeRow = Array.from(planTable.querySelectorAll("tbody tr")).find((el) => el.textContent.includes("12.7cm連装砲D型改二"));
  if (!dTypeRow) throw new Error("plan row not found:12.7cm連装砲D型改二");
  const dTypeDevCell = dTypeRow.querySelectorAll("td")[5];
  const dTypeLevel = Number((dTypeRow.querySelectorAll("td")[2].textContent.match(/\d+/) || [])[0] || 0);
  const dTypeSteps = {};
  for (const s of require(path.join(root, "data/improvement_consume_step.json"))) {
    if (Number(s.equipment_id) === 267) dTypeSteps[String(s.step_id)] = s;
  }
  const dTypePlanLevels = [
    { from: 0, p: 1, phase: "0" }, { from: 1, p: 1, phase: "0" }, { from: 2, p: 1, phase: "0" },
    { from: 3, p: 1, phase: "0" }, { from: 4, p: 1, phase: "0" }, { from: 5, p: 0.95, phase: "0" },
    { from: 6, p: 0.9, phase: "1" }, { from: 7, p: 0.82, phase: "1" },
    { from: 8, p: 0.77, phase: "1" }, { from: 9, p: 0.67, phase: "1" },
  ];
  let dTypeDev = 0;
  for (const lv of dTypePlanLevels) {
    if (lv.from < dTypeLevel) continue;
    const step = dTypeSteps[lv.phase];
    dTypeDev += Number(step.consume_development_min) * (1 / lv.p);
  }
  const dTypeExpected = Math.ceil(dTypeDev - 1e-9);
  if (!dTypeDevCell || Number(dTypeDevCell.textContent.replace(/,/g, "")) !== dTypeExpected) {
    throw new Error("D型改二 dev expected " + dTypeExpected + ", got " + (dTypeDevCell && dTypeDevCell.textContent));
  }
  const devBeforeEvo = Number(planRow.querySelectorAll("td")[5].textContent.replace(/,/g, ""));
  const evoBtn = planRow.querySelector(".kr2-plan-evo-btn");
  if (!evoBtn) throw new Error("plan evolution button missing");
  evoBtn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(100);
  const evoOptions = Array.from(window.document.querySelectorAll(".kr2-evo-option"));
  if (evoOptions.length < 2) throw new Error("evolution branch popup missing branches");
  evoOptions[0].dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(100);
  if (!window.document.querySelector(".kr2-evo-option-active")) {
    throw new Error("evolution branch selection not highlighted");
  }
  const evoClose = window.document.querySelector(".kr2-evo-modal .kr2-button");
  if (!evoClose) throw new Error("evolution popup close button missing");
  evoClose.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(200);
  const planSel = JSON.parse(window.localStorage.getItem("poi-plugin-koushu-rate:plan-selection") || "{}");
  if (!planSel[multiId] || !planSel[multiId].evoUpgradeId) {
    throw new Error("evolution selection did not persist");
  }
  if (!window.document.querySelector(".kr2-plan-evo-active")) {
    throw new Error("evolution button is not lit after selection");
  }
  const planRowAfter = Array.from(window.document.querySelector(".kr2-plan-table").querySelectorAll("tbody tr")).find((el) => el.textContent.includes(nameById[multiId]));
  const devAfterEvo = Number(planRowAfter.querySelectorAll("td")[5].textContent.replace(/,/g, ""));
  const upg0 = byEquip[multiId][0];
  const expScrew0 = Number(upg0.consume_improvement_min) / 0.62;
  const ensure0 = Number(upg0.consume_improvement_max) - expScrew0 < -0.005;
  const expectedEvoDelta = ensure0 ? Number(upg0.consume_development_max) : Number(upg0.consume_development_min) / 0.62;
  if (Math.abs((devAfterEvo - devBeforeEvo) - expectedEvoDelta) > 0.5) {
    throw new Error("evolution dev delta wrong: before=" + devBeforeEvo + " after=" + devAfterEvo + " expectedDelta=" + expectedEvoDelta);
  }
  const evoLabel = planRowAfter && planRowAfter.querySelector(".kr2-plan-evo-btn");
  if (!evoLabel || evoLabel.textContent !== "进化") {
    throw new Error("evolution button text should stay 进化");
  }
  const evoNameEl = planRowAfter.querySelector(".kr2-plan-evo-target-name");
  if (!evoNameEl || evoNameEl.textContent !== targetName) {
    throw new Error("equipment column should show evolved equipment name in blue");
  }
  if (!planRowAfter.textContent.includes("→ " + targetName)) {
    throw new Error("equipment column should contain arrow + evolved equipment");
  }
  if (planRowAfter.querySelectorAll(".kr2-plan-target-active").length !== 0) {
    throw new Error("max/+6 should be deselected when evolution is active");
  }
  const targetGroup = planRowAfter.querySelector(".kr2-plan-target-group");
  if (!targetGroup || targetGroup.children.length !== 3) {
    throw new Error("target group should contain +6/max/evolution on same level");
  }
  const mainTable = window.document.querySelector(".kr2-plan-table");
  const devSortBtn = mainTable.querySelectorAll("thead th")[5].querySelector(".kr2-sort-btn");
  if (!devSortBtn) throw new Error("plan dev sort button missing");
  devSortBtn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(100);
  const devAsc = Array.from(mainTable.querySelectorAll("tbody tr")).map((tr) => Number(tr.querySelectorAll("td")[5].textContent.replace(/,/g, "")));
  if (!devAsc.every((v, idx) => idx === 0 || v >= devAsc[idx - 1])) throw new Error("plan dev asc sort failed");
  const devSortBtn2 = window.document.querySelector(".kr2-plan-table").querySelectorAll("thead th")[5].querySelector(".kr2-sort-btn");
  devSortBtn2.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(100);
  const devDesc = Array.from(window.document.querySelector(".kr2-plan-table").querySelectorAll("tbody tr")).map((tr) => Number(tr.querySelectorAll("td")[5].textContent.replace(/,/g, "")));
  if (!devDesc.every((v, idx) => idx === 0 || v <= devDesc[idx - 1])) throw new Error("plan dev desc sort failed");
  const summaryTable = window.document.querySelectorAll(".kr2-plan-table")[1];
  if (!summaryTable) throw new Error("summary table missing");
  for (const idx of [1, 2, 3]) {
    if (!summaryTable.querySelectorAll("thead th")[idx].querySelector(".kr2-sort-btn")) throw new Error("summary sort button missing idx=" + idx);
  }
  summaryTable.querySelectorAll("thead th")[1].querySelector(".kr2-sort-btn").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(100);
  const reqVals = Array.from(summaryTable.querySelectorAll("tbody tr")).filter((tr) => tr.children.length === 5).map((tr) => Number(tr.children[1].textContent));
  if (!reqVals.every((v, idx) => idx === 0 || v >= reqVals[idx - 1])) throw new Error("summary required asc sort failed");
  clickNav("改修列表");
  await sleep(200);
  clickFavorite(targetName);
  await sleep(200);
  clickNav("素材计算");
  await sleep(300);
  clickNav("我变强了！");
  await sleep(300);
  const strongEvoCells = Array.from(window.document.querySelectorAll(".kr2-strong-equip"));
  const hasPreEvo = strongEvoCells.some((cell) => cell.textContent.startsWith(nameById[multiId] + " "));
  const hasEvoTarget = strongEvoCells.some((cell) => cell.textContent.startsWith(targetName + " "));
  if (hasPreEvo || !hasEvoTarget) {
    throw new Error("strong page should show evolved equipment only");
  }
  const evoStrongCell = strongEvoCells.find((cell) => cell.textContent.startsWith(targetName + " ") && cell.textContent.endsWith(" +0"));
  if (!evoStrongCell) {
    throw new Error("evolved target should default to +0");
  }
  const strongRows = Array.from(window.document.querySelectorAll(".kr2-strong-table tbody tr"));
  const nameRows = strongRows.filter((tr) => tr.querySelector(".kr2-strong-equip").textContent.startsWith(targetName + " "));
  const hasMaxRow = nameRows.some((tr) => tr.querySelector(".kr2-strong-equip").textContent.endsWith(" max"));
  const hasZeroRow = nameRows.some((tr) => tr.querySelector(".kr2-strong-equip").textContent.endsWith(" +0"));
  if (nameRows.length < 2 || !hasMaxRow || !hasZeroRow) {
    throw new Error("same-name max/+0 targets should share inventory rows");
  }
  const sharedSum = nameRows.reduce((sum, tr) => sum + Number(tr.querySelector(".kr2-strong-target").textContent), 0);
  if (sharedSum !== 2) throw new Error("shared target sum should equal 2, got " + sharedSum);
  const strongRowsAll = Array.from(window.document.querySelectorAll(".kr2-strong-table tbody tr")).filter((tr) => tr.children.length === 5);
  const clearIdx = strongRowsAll.findIndex((tr) => tr.classList.contains("kr2-strong-clear-row"));
  const firstOther = strongRowsAll.findIndex((tr) => !tr.classList.contains("kr2-strong-clear-row"));
  if (clearIdx !== -1 && firstOther !== -1 && clearIdx > firstOther) throw new Error("clear rows should be on top");
  const parseStockLevel = (tr) => {
    const m = tr.children[3].textContent.match(/(max|\+\d+)\s*$/)
    if (!m) return -1
    return m[1] === "max" ? 10 : Number(m[1].slice(1))
  }
  const clearRowsList = strongRowsAll.filter((tr) => tr.classList.contains("kr2-strong-clear-row"));
  for (let idx = 1; idx < clearRowsList.length; idx += 1) {
    const aQty = Number(clearRowsList[idx - 1].children[2].textContent)
    const bQty = Number(clearRowsList[idx].children[2].textContent)
    if (aQty === bQty && parseStockLevel(clearRowsList[idx - 1]) < parseStockLevel(clearRowsList[idx])) {
      throw new Error("clear tie should sort by stock level desc");
    }
  }
  const nonClearRows = strongRowsAll.filter((tr) => !tr.classList.contains("kr2-strong-clear-row"));
  const ownedNums = nonClearRows.map((tr) => Number(tr.children[4].textContent === "--" ? -1 : tr.children[4].textContent));
  if (!ownedNums.every((v, idx) => idx === 0 || v <= ownedNums[idx - 1])) throw new Error("strong non-clear rows should sort by completion desc");
  for (let idx = 1; idx < nonClearRows.length; idx += 1) {
    const aOwn = Number(nonClearRows[idx - 1].children[4].textContent === "--" ? -1 : nonClearRows[idx - 1].children[4].textContent);
    const bOwn = Number(nonClearRows[idx].children[4].textContent === "--" ? -1 : nonClearRows[idx].children[4].textContent);
    if (aOwn === bOwn) {
      const aQty = Number(nonClearRows[idx - 1].children[2].textContent)
      const bQty = Number(nonClearRows[idx].children[2].textContent)
      if (aQty < bQty) throw new Error("strong tie should sort by target desc")
      if (aQty === bQty && parseStockLevel(nonClearRows[idx - 1]) < parseStockLevel(nonClearRows[idx])) {
        throw new Error("strong tie should sort by stock level desc");
      }
    }
  }
  clickNav("素材计算");
  await sleep(300);
  const rowMax = Array.from(window.document.querySelector(".kr2-plan-table").querySelectorAll("tbody tr")).find((el) => el.textContent.includes(nameById[multiId]));
  const maxBtn = rowMax && Array.from(rowMax.querySelectorAll(".kr2-plan-target-btn")).find((b) => b.textContent === "max");
  if (!maxBtn) throw new Error("max target button missing");
  maxBtn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(200);
  const rowMaxAfter = Array.from(window.document.querySelector(".kr2-plan-table").querySelectorAll("tbody tr")).find((el) => el.textContent.includes(nameById[multiId]));
  if (rowMaxAfter.querySelector(".kr2-plan-evo-active")) {
    throw new Error("selecting max should deselect evolution");
  }
  const activeTarget = rowMaxAfter.querySelector(".kr2-plan-target-active");
  if (!activeTarget || activeTarget.textContent !== "max") {
    throw new Error("selecting max should activate max only");
  }

  clickNav("改修列表");
  await sleep(300);
  const firstNonImpRow = window.document.querySelector(".kr2-row-not-improveable");
  if (!firstNonImpRow) throw new Error("non-improveable row not found for favorite test");
  const nonImpName = firstNonImpRow.querySelector(".kr2-name").textContent;
  const nonImpFav = firstNonImpRow.querySelector(".kr2-fav-btn");
  nonImpFav.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await sleep(200);
  clickNav("素材计算");
  await sleep(300);
  const planText = window.document.querySelector(".kr2-plan-table").textContent;
  if (!planText.includes(nonImpName)) {
    throw new Error("non-improveable equipment should enter plan page");
  }
  const nonImpPlanRow = Array.from(window.document.querySelector(".kr2-plan-table").querySelectorAll("tbody tr")).find((el) => el.textContent.includes(nonImpName));
  const disabledPlanBtns = nonImpPlanRow ? Array.from(nonImpPlanRow.querySelectorAll(".kr2-plan-target-btn, .kr2-plan-evo-btn")) : [];
  if (disabledPlanBtns.length !== 3 || !disabledPlanBtns.every((b) => b.disabled)) {
    throw new Error("non-improveable target buttons should be disabled");
  }
  clickNav("我变强了！");
  await sleep(300);
  const nonImpStrongCell = Array.from(window.document.querySelectorAll(".kr2-strong-equip")).find((cell) => cell.textContent.startsWith(nonImpName + " "));
  if (!nonImpStrongCell || !nonImpStrongCell.textContent.endsWith(" +0")) {
    throw new Error("non-improveable equipment should default to +0 in strong page");
  }

  console.log(JSON.stringify({ ok: true, noUpgradeId, multiId, multiBranches: byEquip[multiId].length, upgradeRows }));
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});