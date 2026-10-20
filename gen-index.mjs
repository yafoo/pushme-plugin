#!/usr/bin/env node
/**
 * 生成插件商店索引 index.json。
 *
 * 用法（在插件仓库根目录）：
 *   node gen-index.mjs
 *
 * 它做的事：
 *   1. 扫描 plugins/ 和 example/ 下的 *.js
 *   2. 从文件头的 JSDoc 里读 @name / @description / @author / @version / @dependencies / @env / @key
 *   3. 算 sha256、按 @version 推 versionCode
 *   4. 和已有的 index.json 对比，做两条校验（见下）
 *   5. 写出新的 index.json
 *
 * 两条校验（CI 里靠它们挡住手滑）：
 *   - 文件内容变了但 @version 没变 → 报错。否则 App 永远不会提示更新。
 *   - versionCode 比上一版小 → 报错。版本号只能往前。
 */

import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join, basename, extname } from 'node:path'

const SCAN_DIRS = ['plugins', 'example']
const INDEX_FILE = 'index.json'

/** 读文件头的块注释，取指定 @tag 的值 */
function parseHeader(source) {
  const match = source.replace(/^\uFEFF/, '').match(/^\s*\/\*\*([\s\S]*?)\*\//)
  if (!match) return {}
  const body = match[1]

  const pick = (tag) => {
    const hit = body.match(new RegExp('@' + tag + '\\s+([^\\r\\n]*)'))
    return hit ? hit[1].trim() : ''
  }

  const splitList = (value) =>
    value
      .split(/[、,，\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)

  return {
    key: pick('key'),
    name: pick('name'),
    description: pick('description'),
    author: pick('author'),
    version: pick('version'),
    dependencies: splitList(pick('dependencies')),
    env: splitList(pick('env')),
  }
}

/** 1.0.2 → 10200。App 端用整数比较，比字符串比较可靠 */
function toVersionCode(version) {
  const m = String(version).match(/^(\d+)\.(\d+)\.(\d+)$/)
  if (!m) return null
  return Number(m[1]) * 10000 + Number(m[2]) * 100 + Number(m[3])
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

/**
 * 归一化：统一行尾为 LF、去 BOM、去首尾空白、去掉末尾多余分号。
 *
 * ⚠️ **必须和 App 端 `PluginInstaller.normalize()` 一字不差**，因为 sha256 算的是归一化之后的内容。
 * 如果这里按原始文件字节算，而 App 先把末尾换行/分号去掉再算，
 * 两边的 hash 永远对不上 → 每次安装都会报「文件校验失败」。
 *
 * ⚠️ **行尾必须先统一**：Windows 上 `core.autocrlf=true`，checkout 出来是 CRLF，
 * 而 Linux/CI 上是 LF。同一份源码在不同机器上算出的 sha256 不一样，
 * 用户装插件就会「莫名其妙全部校验失败」。统一成 LF 后与平台无关。
 */
function normalize(text) {
  let s = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim()
  while (s.endsWith(';')) {
    s = s.slice(0, -1).trimEnd()
  }
  return s
}

function walk(dir) {
  const full = join(process.cwd(), dir)
  if (!existsSync(full) || !statSync(full).isDirectory()) return []
  return readdirSync(full)
    .filter((f) => extname(f).toLowerCase() === '.js')
    .map((f) => join(dir, f))
}

function fail(message) {
  console.error('✗ ' + message)
  process.exitCode = 1
}

const oldIndex = existsSync(INDEX_FILE)
  ? JSON.parse(readFileSync(INDEX_FILE, 'utf8'))
  : { schema: 1, plugins: [] }
const oldByKey = new Map((oldIndex.plugins || []).map((p) => [p.key, p]))

const files = SCAN_DIRS.flatMap(walk)
if (files.length === 0) {
  fail('没有找到任何插件文件（plugins/*.js 或 example/*.js）')
  process.exit(1)
}

const plugins = []
const usedKeys = new Set()

for (const file of files.sort()) {
  const buffer = readFileSync(file)
  const source = buffer.toString('utf8')
  const header = parseHeader(source)

  // key 默认取文件名，改了文件名就等于换了个插件 —— 要固定就用 @key
  const fallbackKey = 'official.' + basename(file, extname(file))
  const key = header.key || fallbackKey

  if (!header.name) {
    fail(`${file}: 缺少 @name`)
    continue
  }
  if (!header.version) {
    fail(`${file}: 缺少 @version（如 @version 1.0.0）`)
    continue
  }
  const versionCode = toVersionCode(header.version)
  if (versionCode === null) {
    fail(`${file}: @version 必须是 x.y.z 形式，当前是 ${header.version}`)
    continue
  }
  if (!/^official\.[A-Za-z0-9_.-]+$/.test(key)) {
    fail(`${file}: key 不合法（${key}），必须是 official.xxx 形式`)
    continue
  }
  if (usedKeys.has(key)) {
    fail(`${file}: key 重复（${key}）`)
    continue
  }
  usedKeys.add(key)

  const hash = sha256(Buffer.from(normalize(source), 'utf8'))
  const old = oldByKey.get(key)

  if (old) {
    if (old.sha256 !== hash && old.versionCode === versionCode) {
      fail(`${file}: 内容变了但 @version 还是 ${header.version}，请升版本（否则用户永远收不到更新）`)
      continue
    }
    if (versionCode < old.versionCode) {
      fail(`${file}: versionCode 回退（${old.versionCode} → ${versionCode}）`)
      continue
    }
  }

  plugins.push({
    key,
    name: header.name,
    description: header.description,
    author: header.author,
    version: header.version,
    versionCode,
    minAppVersion: '',
    tags: [],
    dependencies: header.dependencies,
    env: header.env,
    file: file.split('\\').join('/'),
    sha256: hash,
    size: buffer.length,
  })
}

if (process.exitCode) {
  console.error('\n索引未更新，请先修掉上面的问题。')
  process.exit(1)
}

// 内容没变就沿用旧的 updatedAt。
// 否则每次 CI 都会写出一个只差时间戳的 index.json，产生一条毫无意义的提交。
const sameAsOld = JSON.stringify(plugins) === JSON.stringify(oldIndex.plugins || [])

const index = {
  schema: 1,
  updatedAt: sameAsOld && oldIndex.updatedAt ? oldIndex.updatedAt : new Date().toISOString(),
  plugins,
}

writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2) + '\n', 'utf8')
console.log(`✓ 已生成 ${INDEX_FILE}，共 ${plugins.length} 个插件`)
