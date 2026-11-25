#!/usr/bin/env node
"use strict";

/*
 * Rebuilds data/*.json from current upstream sources.
 *
 * Sources:
 *   1. https://akashi-list.me/ (weapon list, names, improvable flags, per-weapon detail pages)
 *   2. @sakura2333/kancolle-data (structured improvement dataset, used as the primary
 *      cost/material source; akashi detail pages fill equipment missing from it)
 *
 * Usage:
 *   npm pack @sakura2333/kancolle-data@0.5.52        # inside a scratch dir, then extract
 *   node tools/update-data.js --kancolle-data=C:\path\to\package
 *   node tools/update-data.js --probe=21,236,579     # dump parsed pages for review
 *   node tools/update-data.js --akashi-only          # ignore kancolle-data, scrape everything
 *
 * Data files written (schemas consumed by index.js):
 *   equip_names.json, equip_base_cost.json,
 *   improvement_consume_step.json, improvement_consume_item.json,
 *   improvement_upgrade_target.json, improvement_arrangement.json,
 *   secretary_arrangement.json, data_manifest.json
 */

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const AKASHI_BASE = "https://akashi-list.me/";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DAY_CHARS = ["日", "月", "火", "水", "木", "金", "土"];

const JP_CATEGORY_MAP = {
  小口径主砲: "小口径主炮",
  中口径主砲: "中口径主炮",
  大口径主砲: "大口径主炮",
  副砲: "副炮",
  高角砲: "高角炮",
  機銃: "高射炮",
  魚雷: "鱼雷",
  電探: "电探",
  対潜装備: "对潜装备",
  強化弾: "强化弹",
  ソナー: "对潜装备",
  爆雷: "对潜装备",
  艦上戦闘機: "舰上战斗机",
  艦上爆撃機: "舰上爆击机",
  艦上攻撃機: "舰上攻击机",
  艦上偵察機: "舰上侦察机",
  水上機: "水上侦察机",
  水上戦闘機: "水上侦察机",
  水上偵察機: "水上侦察机",
  水上爆撃機: "水上爆击机",
  陸上攻撃機: "陆上攻击机",
  陸上戦闘機: "陆上战斗机",
  陸上偵察機: "陆上侦察机",
  輸送機: "侦察机",
  大型陸上機: "陆上攻击机",
  回転翼機: "侦察机",
  機銃装置: "高射炮",
  電探装置: "电探",
  機関部強化: "机关部强化",
  探照灯: "探照灯",
  照明弾: "其他",
  特殊潜水艦装備: "其他",
  潜水艦装備: "鱼雷",
  上陸用舟艇: "登陆装备",
  特型内火艇: "登陆装备",
  陸戦兵器: "登陆装备",
  発煙装置: "其他",
  補給物資: "其他",
  要員: "其他",
  その他: "其他",
};

function log(...args) {
  console.log(...args);
}

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(arg);
    if (!m) continue;
    out[m[1]] = m[2] === undefined ? true : m[2];
  }
  return out;
}

async function fetchNetwork(url, attempt = 0) {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, referer: AKASHI_BASE },
    });
    if (!res.ok) throw new Error("http " + res.status);
    return await res.text();
  } catch (error) {
    if (attempt >= 3) throw error;
    await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    return fetchNetwork(url, attempt + 1);
  }
}

async function fetchText(url) {
  const cacheDir = process.env.KR2_AKASHI_CACHE;
  if (cacheDir && url.indexOf("detail/w") >= 0) {
    const file = path.join(cacheDir, url.split("/").pop());
    if (fs.existsSync(file)) return fs.readFileSync(file, "utf8");
    const body = await fetchNetwork(url);
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(file, body, "utf8");
    return body;
  }
  return fetchNetwork(url);
}

async function fetchMany(ids, workerCount, handler) {
  let cursor = 0;
  const workers = [];
  for (let i = 0; i < workerCount; i += 1) {
    workers.push(
      (async () => {
        while (cursor < ids.length) {
          const id = ids[cursor];
          cursor += 1;
          try {
            await handler(id);
          } catch (error) {
            log("  ! failed id " + id + ": " + error.message);
          }
        }
      })()
    );
  }
  await Promise.all(workers);
}

function textOf(node) {
  return String((node && node.textContent) || "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRange(text) {
  const t = textOf(text);
  if (!t || t === "-") return null;
  const m = t.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (m) return { min: Number(m[1]), max: Number(m[2]) };
  const single = t.match(/^(\d+)$/);
  if (single) return { min: Number(single[1]), max: Number(single[1]) };
  return null;
}

function parseCount(node) {
  const t = textOf(node);
  const m = t.match(/×\s*(\d+)/);
  return m ? Number(m[1]) : 1;
}

/* ---------------------------------------------------------------- akashi home */

function parseAkashiHome(html) {
  const weapons = {};
  const re = /<div class="?[^">]*\bweapon\b[^">]*"?\s+id=w(\d+)[^>]*>/g;
  const marks = [];
  let match;
  while ((match = re.exec(html))) marks.push({ id: Number(match[1]), start: match.index, end: re.lastIndex });
  for (let i = 0; i < marks.length; i += 1) {
    const block = html.slice(marks[i].start, i + 1 < marks.length ? marks[i + 1].start : undefined);
    const alt = block.match(/\d+:\s*([^">]+)/);
    const dev = block.match(/buildkit-count[^>]*>([\s\S]{0,200}?)<\/div>/);
    const screws = block.match(/<span class=remodelkit>([^<]+)<\/span>/);
    weapons[String(marks[i].id)] = {
      id: marks[i].id,
      name: alt ? alt[1].replace(/\s+/g, " ").trim() : "",
      devText: dev ? textOf(stripTags(dev[1])) : "",
      screwText: screws ? screws[1].trim() : "",
      improvable: !!(screws && /[1-9]/.test(screws[1])),
    };
  }
  return weapons;
}

function stripTags(html) {
  return String(html || "").replace(/<[^>]*>/g, " ");
}

/* -------------------------------------------------------------- akashi detail */

function parseAkashiDetail(html, id) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const titleNode = doc.querySelector(".detail-row .name, .name.jpfont");
  let categoryJp = "";
  let name = "";
  if (titleNode) {
    const clone = titleNode.cloneNode(true);
    const wname = clone.querySelector(".wname");
    name = textOf(wname);
    if (wname) wname.remove();
    const no = clone.querySelector(".no");
    if (no) no.remove();
    for (const a of clone.querySelectorAll("a")) a.remove();
    categoryJp = textOf(clone);
  }

  const table = Array.from(doc.querySelectorAll("table")).find((t) =>
    textOf(t.querySelector("tr")).indexOf("改修必要資材") >= 0
  );

  const result = {
    id: Number(id),
    name,
    categoryJp,
    baseResource: null,
    stages: {}, // "0" | "1" -> { dev:{min,max}, screws:{min,max}, materials:[{equipmentId?, useitemName?, count}] }
    routes: [], // {kind, label, max:{dev,screws,materials}, upgrade:{targetId,targetName} | null}
    ships: [], // {kind, label, days:[bool x7]}
    developable: true,
  };

  if (table) {
    let currentKind = null;
    let currentRoute = null;
    let lastStageKey = null;
    const ensureRoute = (kind) => {
      const key = kind || "";
      let route = result.routes.find((r) => r.kind === key);
      if (!route) {
        route = { kind: key, label: "", max: null, upgrade: null };
        result.routes.push(route);
      }
      return route;
    };

    for (const row of Array.from(table.rows)) {
      const th = row.querySelector("th");
      const thText = textOf(row.querySelector("th"));
      const cls = row.className || "";

      if (cls.indexOf("upgrade") >= 0) {
        const links = Array.from(row.querySelectorAll("a[data-wid]"));
        const target = links.length ? links[links.length - 1] : null;
        const route = currentRoute || ensureRoute(currentKind);
        if (target) {
          const wid = String(target.getAttribute("data-wid") || "").replace(/^w/, "");
          route.upgrade = {
            targetId: Number(wid),
            targetName: cleanMaterialName(textOf(target)),
          };
        }
        continue;
      }

      const kindMatch = /kind(\d+)/.exec(cls) || /kind(\d+)/.exec((th && th.className) || "");
      if (th && thText.indexOf("二番艦指定") >= 0) {
        currentKind = kindMatch ? "kind" + kindMatch[1] : "kind" + (result.routes.length + 1);
        currentRoute = ensureRoute(currentKind);
        currentRoute.label = thText.replace("二番艦指定", "").trim();
        continue;
      }

      if (th && thText === "MAX") {
        const route = currentRoute || ensureRoute(currentKind);
        const cells = Array.from(row.children);
        route.max = {
          dev: parseRange(cells[1]),
          screws: parseRange(cells[2]),
          materials: parseMaterials(cells[3]),
        };
        continue;
      }

      if (thText === "0 ～ 5" || thText === "6 ～ 9") {
        const stageKey = thText === "0 ～ 5" ? "0" : "1";
        const cells = Array.from(row.children);
        result.stages[stageKey] = {
          dev: parseRange(cells[1]),
          screws: parseRange(cells[2]),
          materials: parseMaterials(cells[3]),
        };
        lastStageKey = stageKey;
        continue;
      }

      if (lastStageKey && row.querySelector(".add-material")) {
        const stage = result.stages[lastStageKey];
        if (stage) stage.extraMaterials = (stage.extraMaterials || []).concat(parseStarMaterials(row));
        continue;
      }

      const fuel = row.querySelector(".ri-fuel");
      if (fuel) {
        result.baseResource = {
          fuel: Number(textOf(fuel)) || 0,
          ammo: Number(textOf(row.querySelector(".ri-ammo"))) || 0,
          steel: Number(textOf(row.querySelector(".ri-steel"))) || 0,
          bauxite: Number(textOf(row.querySelector(".ri-bauxite"))) || 0,
        };
      }
    }

    if (!result.routes.length) {
      result.routes.push({ kind: "", label: "", max: null, upgrade: null });
    }
  }

  for (const shipNode of Array.from(doc.querySelectorAll(".support-ship-table .support-ship"))) {
    const weeks = shipNode.querySelector(".weeks");
    if (!weeks) continue;
    const kindMatch = /kind(\d+)/.exec(weeks.className || "");
    const days = DAY_CHARS.map((ch) => {
      const span = Array.from(weeks.querySelectorAll("span")).find((s) => textOf(s) === ch);
      return !!span && (span.className || "").indexOf("enable") >= 0;
    });
    const clone = shipNode.cloneNode(true);
    for (const junk of Array.from(clone.querySelectorAll("img, .weeks"))) junk.remove();
    const label = textOf(clone);
    if (!label || label === "-") continue;
    result.ships.push({ kind: kindMatch ? "kind" + kindMatch[1] : "", label, days });
  }

  if (!result.baseResource) {
    const fuel = doc.querySelector(".ri-fuel");
    if (fuel) {
      result.baseResource = {
        fuel: Number(textOf(fuel)) || 0,
        ammo: Number(textOf(doc.querySelector(".ri-ammo"))) || 0,
        steel: Number(textOf(doc.querySelector(".ri-steel"))) || 0,
        bauxite: Number(textOf(doc.querySelector(".ri-bauxite"))) || 0,
      };
    }
  }

  assignShipRoutes(result);

  const devBlock = Array.from(doc.querySelectorAll(".build-table .title")).map(textOf);
  if (devBlock.some((t) => t.indexOf("開発不可") >= 0)) result.developable = false;

  dom.window.close();
  return result;
}

function assignShipRoutes(detail) {
  const routesWithLabel = (detail.routes || []).filter((r) => r.label);
  if (!routesWithLabel.length) return;
  for (const ship of detail.ships || []) {
    let assigned = null;
    for (const route of routesWithLabel) {
      const names = String(route.label)
        .split(/[・/、]/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (names.indexOf(ship.label) >= 0) {
        assigned = route.kind || "";
        break;
      }
    }
    if (!assigned) {
      for (const route of routesWithLabel) {
        const names = String(route.label)
          .split(/[・/、]/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (names.some((n) => n.indexOf(ship.label) >= 0 || ship.label.indexOf(n) >= 0)) {
          assigned = route.kind || "";
          break;
        }
      }
    }
    if (assigned) ship.kind = assigned;
  }
}

function cleanMaterialName(name) {
  return String(name || "")
    .replace(/[×x]\s*\d+/g, "")
    .replace(/★\s*\d+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isConditionalMaterial(node) {
  let sib = node.nextElementSibling;
  while (sib) {
    if ((sib.className || "").indexOf("sub") >= 0) return true;
    if (isMaterialNode(sib)) return false;
    sib = sib.nextElementSibling;
  }
  return false;
}

function isMaterialNode(node) {
  if (!node || node.nodeType !== 1) return false;
  const cls = (node.className || "").toString();
  return cls.indexOf("icon-item") >= 0 || cls.indexOf("resource-img") >= 0;
}

function parseMaterials(cell) {
  const out = [];
  if (!cell) return out;
  const seen = new Set();
  const push = (entry) => {
    const key = (entry.equipmentId != null ? "e" + entry.equipmentId : "u" + entry.useitemName) + "|" + entry.count;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(entry);
  };

  for (const link of Array.from(cell.querySelectorAll("a[data-wid]"))) {
    if (isConditionalMaterial(link)) continue;
    const wid = String(link.getAttribute("data-wid") || "").replace(/^w/, "");
    if (!wid) continue;
    const title = link.getAttribute("title") || "";
    const titleName = title.replace(/^\d+:\s*/, "");
    push({
      equipmentId: Number(wid),
      name: cleanMaterialName(titleName || textOf(link)),
      count: parseCount(link),
    });
  }

  for (const node of Array.from(cell.querySelectorAll("div[title]"))) {
    if (node.closest("a[data-wid]")) continue;
    if (isConditionalMaterial(node)) continue;
    const title = node.getAttribute("title") || "";
    const m = /^(\d+):\s*(.+)$/.exec(title);
    if (!m) continue;
    const cellText = textOf(cell);
    const countMatch = cellText.match(/×\s*(\d+)/);
    push({
      equipmentId: Number(m[1]),
      name: cleanMaterialName(m[2]),
      count: countMatch ? Number(countMatch[1]) : 1,
    });
  }

  for (const figure of Array.from(cell.querySelectorAll("figure.icon-item"))) {
    if (figure.closest("a[data-wid]")) continue;
    if (isConditionalMaterial(figure)) continue;
    const figureTitle = figure.getAttribute("title") || "";
    const titleMatch = /^(\d+):\s*(.+)$/.exec(figureTitle);
    if (titleMatch) {
      push({
        equipmentId: Number(titleMatch[1]),
        name: cleanMaterialName(titleMatch[2]),
        count: parseCount(figure),
      });
      continue;
    }
    const img = figure.querySelector("img[alt]");
    if (!img) continue;
    push({ useitemName: String(img.getAttribute("alt") || "").trim(), count: parseCount(figure) });
  }
  return out;
}

function parseStarMaterials(row) {
  const out = [];
  const container = row.querySelector(".add-material");
  if (!container) return out;
  let star = null;
  for (const node of Array.from(container.querySelectorAll("span"))) {
    if (node.classList.contains("s-gap")) {
      const link = node.querySelector("a");
      if (!link) continue;
      const name = String(link.getAttribute("title") || "").trim();
      if (!name) continue;
      const countMatch = textOf(link).match(/×\s*(\d+)/);
      out.push({ useitemName: name, count: countMatch ? Number(countMatch[1]) : 1, star: star == null ? 9 : star });
      continue;
    }
    const m = /^★\s*(\d+)$/.exec(textOf(node));
    if (m) star = Number(m[1]);
  }
  return out;
}

/* --------------------------------------------------------------- kancolle-data */

function loadKancolleData(dir) {
  const read = (rel) => fs.readFileSync(path.join(dir, rel), "utf8");
  const equipment = JSON.parse(read("master/equipment.json"));
  const useitems = JSON.parse(read("master/useitems.json"));
  const detail = read("improvement/detail.nedb")
    .trim()
    .split(/\r?\n/)
    .map((line) => JSON.parse(line));
  return {
    equipment,
    useitems,
    detail,
    useitemNameById: new Map(useitems.map((u) => [Number(u.useitemId), String(u.name)])),
  };
}

function convertKancolleDetail(record, kc) {
  const out = {
    id: Number(record.id),
    name: String(record.name || ""),
    categoryJp: "",
    baseResource: null,
    stages: {},
    routes: [],
    ships: [],
    developable: true,
  };
  const routes = record.improvementList || [];
  routes.forEach((route, routeIndex) => {
    const kind = routeIndex === 0 ? "" : "kind" + routeIndex;
    const base = route.baseResource || null;
    if (Array.isArray(base) && base.length >= 4) {
      out.baseResource = base.slice(0, 4).map(Number);
    }
    const stageList = route.stageList || [];
    for (const stage of stageList) {
      const text = String(stage.stageText || "");
      const industry = (stage.industryResource || []).map(Number);
      const materials = (stage.consumables || []).map((c) => {
        if (Number(c.type) === 0) return { equipmentId: Number(c.id), count: Number(c.count) || 1 };
        return {
          useitemName: kc.useitemNameById.get(Number(c.id)) || "",
          count: Number(c.count) || 1,
        };
      });
      const range = { dev: { min: industry[0] || 0, max: industry[1] || 0 }, screws: { min: industry[2] || 0, max: industry[3] || 0 }, materials };
      if (text.indexOf("★0") >= 0) out.stages["0"] = range;
      else if (text.indexOf("★6") >= 0) out.stages["1"] = range;
      else if (stage.targetWeapon && Number(stage.targetWeapon.id) > 0) {
        const routeOut = out.routes.find((r) => r.kind === kind) || { kind, label: "", max: null, upgrade: null };
        routeOut.max = range;
        routeOut.upgrade = {
          targetId: Number(stage.targetWeapon.id),
          targetName: String(stage.targetWeapon.name || ""),
        };
        if (out.routes.indexOf(routeOut) < 0) out.routes.push(routeOut);
      }
    }
    const routeOut = out.routes.find((r) => r.kind === kind);
    if (!routeOut) {
      const last = stageList.length ? stageList[stageList.length - 1] : null;
      const lastTarget = last && last.targetWeapon ? Number(last.targetWeapon.id) : 0;
      out.routes.push({
        kind,
        label: "",
        max: null,
        upgrade:
          lastTarget > 0
            ? {
                targetId: lastTarget,
                targetName: String(last.targetWeapon.name || ""),
              }
            : null,
      });
    }
    for (const ship of route.shipWeekList || []) {
      const week = ship.week || [];
      out.ships.push({
        kind,
        label: String(ship.text || ""),
        days: DAY_KEYS.map((_, idx) => !!week[idx]),
      });
    }
  });
  if (!out.routes.length) out.routes.push({ kind: "", label: "", max: null, upgrade: null });
  return out;
}

/* ------------------------------------------------------------------- building */

function materialsForStep(materials, nameToKey, nameById) {
  return (materials || []).map((m) => {
    if (m.equipmentId != null) {
      return {
        item_equipment_id: m.equipmentId,
        item_material_key: null,
        item_name: m.name || nameById.get(m.equipmentId) || "",
        count: m.count || 1,
      };
    }
    const name = m.useitemName || "";
    return {
      item_equipment_id: null,
      item_material_key: nameToKey.get(name) || name,
      item_name: name,
      count: m.count || 1,
    };
  });
}

function buildDataset({ weapons, details, nameById, nameToKey, typeById, kancolleMeta }) {
  const equipNames = [];
  const baseCost = [];
  const steps = [];
  const items = [];
  const upgrades = [];
  const arrangement = [];
  const secretary = {};

  const ids = Object.keys(weapons)
    .map(Number)
    .sort((a, b) => a - b);

  for (const id of ids) {
    const weapon = weapons[String(id)] || weapons[String(id).padStart(3, "0")] || {};
    const detail = details.get(id);
    const name = detail && detail.name ? detail.name : weapon.name || "";
    const type = typeById.get(id) || "其他";
    equipNames.push({ id, type, icon: 0, name });

    if (!detail) continue;

    if (detail.baseResource) {
      const base = Array.isArray(detail.baseResource)
        ? detail.baseResource
        : [
            detail.baseResource.fuel,
            detail.baseResource.ammo,
            detail.baseResource.steel,
            detail.baseResource.bauxite,
          ];
      baseCost.push({
        id,
        consume_fuel: Number(base[0]) || 0,
        consume_ammo: Number(base[1]) || 0,
        consume_steel: Number(base[2]) || 0,
        consume_bauxite: Number(base[3]) || 0,
      });
    }

    const usableStage = (stage) => stage && stage.dev && stage.screws;
    for (const stageKey of ["0", "1"]) {
      const stage = detail.stages[stageKey];
      if (!usableStage(stage)) continue;
      steps.push({
        equipment_id: id,
        step_id: Number(stageKey),
        consume_development_min: stage.dev.min,
        consume_development_max: stage.dev.max,
        consume_improvement_min: stage.screws.min,
        consume_improvement_max: stage.screws.max,
      });
      const stageMaterials = (stage.materials || []).concat(
        (stage.extraMaterials || []).filter((m) => (stageKey === "0" ? m.star <= 5 : m.star >= 6))
      );
      for (const mat of materialsForStep(stageMaterials, nameToKey, nameById)) {
        items.push(Object.assign({ step_id: id + "_" + stageKey }, mat));
      }
    }

    const seenUpgrade = new Set();
    for (const route of detail.routes) {
      const routeKind = route.kind || null;
      if (route.max) {
        for (const mat of materialsForStep(route.max.materials, nameToKey, nameById)) {
          const stepId = route.upgrade ? id + "_max_" + route.upgrade.targetId : id + "_max";
          items.push(Object.assign({ step_id: stepId }, mat));
        }
      }
      if (route.upgrade) {
        const key = route.upgrade.targetId + "|" + (routeKind || "");
        if (seenUpgrade.has(key)) continue;
        seenUpgrade.add(key);
        upgrades.push({
          equipment_id: id,
          upgrade_id: route.upgrade.targetId,
          route_kind: routeKind,
          consume_development_min: route.max ? route.max.dev.min : 0,
          consume_development_max: route.max ? route.max.dev.max : 0,
          consume_improvement_min: route.max ? route.max.screws.min : 0,
          consume_improvement_max: route.max ? route.max.screws.max : 0,
          is_deleted: false,
        });
      }
    }

    const daysByRoute = {};
    for (const ship of detail.ships) {
      const days = ship.days || [];
      arrangement.push({
        equipment_id: id,
        route_kind: ship.kind || null,
        secretary_label: ship.label,
        sunday: !!days[0],
        monday: !!days[1],
        tuesday: !!days[2],
        wednesday: !!days[3],
        thursday: !!days[4],
        friday: !!days[5],
        saturday: !!days[6],
      });
      const bucket = (daysByRoute[ship.kind || ""] = daysByRoute[ship.kind || ""] || {});
      DAY_KEYS.forEach((day, idx) => {
        if (!days[idx]) return;
        const list = bucket[day] || (bucket[day] = []);
        if (list.indexOf(ship.label) < 0) list.push(ship.label);
      });
    }
    const merged = {};
    for (const kind of Object.keys(daysByRoute)) {
      for (const day of Object.keys(daysByRoute[kind])) {
        const list = merged[day] || (merged[day] = []);
        for (const label of daysByRoute[kind][day]) if (list.indexOf(label) < 0) list.push(label);
      }
    }
    secretary[String(id)] = {
      any: Object.keys(merged).length === 0,
      days: merged,
    };
  }

  return {
    equipNames,
    baseCost,
    steps,
    items,
    upgrades,
    arrangement,
    secretary,
    stats: {
      equipment: equipNames.length,
      improvable: steps.length ? new Set(steps.map((s) => s.equipment_id)).size : 0,
      upgradeTargets: upgrades.length,
      stage1Missing: steps.length
        ? Array.from(new Set(steps.map((s) => s.equipment_id)))
            .filter((equipId) => !steps.some((s) => s.equipment_id === equipId && s.step_id === 1))
            .sort((a, b) => a - b)
        : [],
      kancolleDataVersion: kancolleMeta || null,
    },
  };
}

async function validateAgainstKancolle(ids, kancolleDetails) {
  const problems = [];
  let checked = 0;
  await fetchMany(ids, 6, async (id) => {
    const kc = kancolleDetails.get(id);
    if (!kc) return;
    const html = await fetchText(AKASHI_BASE + "detail/w" + String(id).padStart(3, "0") + ".html");
    const akashi = parseAkashiDetail(html, id);
    checked += 1;

    const normMaterials = (list) =>
      list
        .map((m) => (m.equipmentId != null ? "E" + m.equipmentId + "x" + m.count : "U" + (m.useitemName || "") + "x" + m.count))
        .sort()
        .join(",");

    const cmpStage = (key) => {
      const a = akashi.stages[key];
      const b = kc.stages[key];
      if (!a && !b) return null;
      if (!a || !b) return "stage" + key + " missing on one side";
      const ra = a.dev && a.screws ? [a.dev.min, a.dev.max, a.screws.min, a.screws.max].join("/") : "none";
      const rb = b.dev && b.screws ? [b.dev.min, b.dev.max, b.screws.min, b.screws.max].join("/") : "none";
      if (ra !== rb) return "stage" + key + " range " + ra + " vs " + rb;
      const ma = normMaterials(a.materials);
      const mb = normMaterials(b.materials);
      if (ma !== mb) return "stage" + key + " materials " + ma + " vs " + mb;
      return null;
    };

    for (const key of ["0", "1"]) {
      const issue = cmpStage(key);
      if (issue) problems.push(id + " " + issue);
    }

    const upgA = akashi.routes
      .filter((r) => r.upgrade)
      .map((r) => String(r.upgrade.targetId))
      .sort()
      .join(",");
    const upgB = kc.routes
      .filter((r) => r.upgrade)
      .map((r) => String(r.upgrade.targetId))
      .sort()
      .join(",");
    if (upgA !== upgB) problems.push(id + " upgrade targets " + upgA + " vs " + upgB);

    const maxA = akashi.routes
      .filter((r) => r.max && r.max.dev && r.max.screws)
      .map((r) => [r.max.dev.min, r.max.dev.max, r.max.screws.min, r.max.screws.max].join("/"))
      .sort()
      .join(",");
    const maxB = kc.routes
      .filter((r) => r.max && r.max.dev && r.max.screws)
      .map((r) => [r.max.dev.min, r.max.dev.max, r.max.screws.min, r.max.screws.max].join("/"))
      .sort()
      .join(",");
    if (maxA !== maxB) problems.push(id + " max range " + maxA + " vs " + maxB);

    const matsA = normMaterials(akashi.routes.filter((r) => r.max).flatMap((r) => r.max.materials));
    const matsB = normMaterials(kc.routes.filter((r) => r.max).flatMap((r) => r.max.materials));
    if (matsA !== matsB) problems.push(id + " max materials " + matsA + " vs " + matsB);

    const namesA = akashi.ships.map((s) => s.label).sort().join(",");
    const namesB = kc.ships.map((s) => s.label).sort().join(",");
    if (namesA !== namesB) problems.push(id + " secretary names differ");

    const baseA = akashi.baseResource ? JSON.stringify(akashi.baseResource) : "none";
    const baseB = kc.baseResource
      ? JSON.stringify({ fuel: kc.baseResource[0], ammo: kc.baseResource[1], steel: kc.baseResource[2], bauxite: kc.baseResource[3] })
      : "none";
    if (baseA !== baseB) problems.push(id + " base resource " + baseA + " vs " + baseB);
  });

  log("validated", checked, "equipment; problems:", problems.length);
  for (const line of problems.slice(0, 60)) log("  " + line);
  return problems;
}

/* --------------------------------------------------------------------- probes */

function printProbe(detail) {
  log("id", detail.id, detail.name, "|", detail.categoryJp);
  log("  base", JSON.stringify(detail.baseResource), "developable", detail.developable);
  for (const key of Object.keys(detail.stages)) {
    const s = detail.stages[key];
    log(
      "  stage",
      key,
      "dev",
      JSON.stringify(s.dev),
      "screws",
      JSON.stringify(s.screws),
      "mats",
      JSON.stringify(s.materials)
    );
  }
  for (const route of detail.routes) {
    log(
      "  route",
      JSON.stringify(route.kind),
      "label",
      route.label,
      "max",
      JSON.stringify(route.max),
      "upgrade",
      JSON.stringify(route.upgrade)
    );
  }
  const byKind = {};
  for (const ship of detail.ships) {
    byKind[ship.kind || ""] = byKind[ship.kind || ""] || [];
    byKind[ship.kind || ""].push(ship.label + ":" + ship.days.map((d) => (d ? 1 : 0)).join(""));
  }
  log("  ships", JSON.stringify(byKind));
}

/* ----------------------------------------------------------------------- main */

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.probe) {
    const ids = String(args.probe).split(",").filter(Boolean);
    for (const id of ids) {
      const padded = String(id).padStart(3, "0");
      log("=== fetch w" + padded);
      const html = await fetchText(AKASHI_BASE + "detail/w" + padded + ".html");
      printProbe(parseAkashiDetail(html, Number(id)));
    }
    return;
  }

  const typeById = new Map();
  try {
    const existing = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "equip_names.json"), "utf8"));
    for (const row of existing) if (row && row.id != null) typeById.set(Number(row.id), String(row.type || ""));
  } catch (_) {}
  const materialRows = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "material.json"), "utf8"));
  const nameToKey = new Map(materialRows.map((m) => [String(m.name), String(m.key)]));

  log("fetching akashi home ...");
  const homeHtml = await fetchText(AKASHI_BASE);
  if (args["home-cache"]) fs.writeFileSync(args["home-cache"], homeHtml);
  const weapons = parseAkashiHome(homeHtml);
  const homeIds = Object.keys(weapons).sort((a, b) => Number(a) - Number(b));
  log("akashi weapons", homeIds.length);
  const nameById = new Map(homeIds.map((id) => [Number(id), weapons[id].name]));
  const improvableIds = homeIds
    .filter((id) => weapons[id].improvable)
    .map(Number);
  log("akashi improvable", improvableIds.length);

  const details = new Map();
  let kancolleMeta = null;

  if (!args["akashi-only"]) {
    if (!args["kancolle-data"]) {
      throw new Error("--kancolle-data=<extracted package dir> is required (or pass --akashi-only)");
    }
    const kc = loadKancolleData(args["kancolle-data"]);
    kancolleMeta = "kancolle-data:" + (args["kancolle-data-version"] || "unknown");
    for (const record of kc.detail) {
      details.set(Number(record.id), convertKancolleDetail(record, kc));
    }
    log("kancolle-data detail records", details.size);
    if (args.validate) {
      const limit = args.limit ? Number(args.limit) : Infinity;
      const ids = Array.from(details.keys()).slice(0, Number.isFinite(limit) ? limit : undefined);
      await validateAgainstKancolle(ids, details);
      return;
    }
  }

  const missing = improvableIds.filter((id) => !details.has(id));
  log("equipment missing from primary source, scraping akashi detail:", missing.join(",") || "none");
  await fetchMany(missing, 4, async (id) => {
    const html = await fetchText(AKASHI_BASE + "detail/w" + String(id).padStart(3, "0") + ".html");
    const parsed = parseAkashiDetail(html, id);
    details.set(id, parsed);
    log("  + scraped", id, parsed.name);
  });

  const needCategory = homeIds.map(Number).filter((id) => !typeById.get(id));
  if (needCategory.length) {
    log("fetching akashi detail for categories:", needCategory.join(","));
    await fetchMany(needCategory, 3, async (id) => {
      const html = await fetchText(AKASHI_BASE + "detail/w" + String(id).padStart(3, "0") + ".html");
      const parsed = parseAkashiDetail(html, id);
      const jp = parsed.categoryJp;
      typeById.set(id, JP_CATEGORY_MAP[jp] || jp || "其他");
      if (!details.has(id)) details.set(id, parsed);
    });
  }

  const dataset = buildDataset({ weapons, details, nameById, nameToKey, typeById, kancolleMeta });
  log("stats", JSON.stringify(dataset.stats));

  if (args.dry) {
    log("dry run: no files written");
    return;
  }

  const outDir = args.out ? path.resolve(args.out) : DATA_DIR;
  fs.mkdirSync(outDir, { recursive: true });
  const write = (name, value) => {
    fs.writeFileSync(path.join(outDir, name), JSON.stringify(value, null, 2) + "\n", "utf8");
    log("wrote", name, Array.isArray(value) ? value.length + " rows" : "");
  };

  const now = new Date();
  const iso = now.toISOString();
  const versionTag = iso.slice(0, 10).replace(/-/g, ".");

  write("equip_names.json", dataset.equipNames);
  write("equip_base_cost.json", dataset.baseCost);
  write("improvement_consume_step.json", dataset.steps);
  write("improvement_consume_item.json", dataset.items);
  write("improvement_upgrade_target.json", dataset.upgrades);
  write("improvement_arrangement.json", dataset.arrangement);
  write("secretary_arrangement.json", dataset.secretary);
  write("data_manifest.json", {
    data_version: versionTag,
    run_date: iso.slice(0, 10),
    updated_at: iso,
    version_complete: true,
    source: {
      site: AKASHI_BASE,
      detail_path: "detail/",
      structured: kancolleMeta,
    },
    stats: dataset.stats,
    target_equipment_ids: Array.from(
      new Set(dataset.steps.map((s) => Number(s.equipment_id)))
    ).sort((a, b) => a - b),
    files: [
      "equip_base_cost.json",
      "improvement_arrangement.json",
      "improvement_consume_item.json",
      "improvement_consume_step.json",
      "improvement_upgrade_target.json",
      "equip_names.json",
      "material.json",
      "secretary_arrangement.json",
    ],
  });
}

main().catch((error) => {
  console.error(error && (error.stack || error.message || error));
  process.exit(1);
});
