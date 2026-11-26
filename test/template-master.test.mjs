import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deflateSync } from 'node:zlib'
import { unzipSync, strFromU8 } from 'fflate'
import * as pptxLib from '@office-kit/pptx'
import { buildZip } from '../skills/dsh-ppt/scripts/deck-core.mjs'
import { absorbPptx } from '../skills/dsh-ppt/scripts/deck-absorb.mjs'
import { buildDeckAsync, editDeck, undoDeck, loadWorkspaceBrandKit } from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import { samplePngCenterLuminance, findBalancedElements, remapShapesXmlToSafeZone, validateNativePackageXml } from '../skills/dsh-ppt/scripts/deck-template-master.mjs'
import { main as cliMain } from '../skills/dsh-ppt/scripts/build-deck.mjs'
import { buildPptTools } from '../lib/tools.js'
import { resolvePptConfig } from '../lib/config.js'
import { PptWorkbench } from '../lib/workbench.js'

const DEFAULT_CONFIG = resolvePptConfig({})

// ---------------------------------------------------------------------------
// Test Helpers: Pure-JS PNG generator & Realistic Corporate .pptx Builders
// ---------------------------------------------------------------------------

function pngCrc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i]
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
  }
  return (c ^ 0xffffffff) >>> 0
}

function makeSolidOrPatternPng(width, height, pixelFn, filterType = 0) {
  const bpp = 4
  const stride = width * bpp
  const raw = Buffer.alloc((stride + 1) * height)
  const prev = new Uint8Array(stride)
  const curr = new Uint8Array(stride)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a = 255] = pixelFn(x, y, width, height)
      curr[x * 4] = r
      curr[x * 4 + 1] = g
      curr[x * 4 + 2] = b
      curr[x * 4 + 3] = a
    }
    const rowOff = y * (stride + 1)
    raw[rowOff] = filterType
    for (let i = 0; i < stride; i += 1) {
      const v = curr[i]
      const left = i >= bpp ? curr[i - bpp] : 0
      const up = y > 0 ? prev[i] : 0
      if (filterType === 1) raw[rowOff + 1 + i] = (v - left) & 0xff
      else if (filterType === 2) raw[rowOff + 1 + i] = (v - up) & 0xff
      else if (filterType === 3) raw[rowOff + 1 + i] = (v - ((left + up) >> 1)) & 0xff
      else raw[rowOff + 1 + i] = v
    }
    prev.set(curr)
  }
  const chunk = (type, data) => {
    const t = Buffer.from(type, 'ascii')
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length, 0)
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(pngCrc32(Buffer.concat([t, data])), 0)
    return Buffer.concat([len, t, data, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const NS_DECLS =
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"'

function makeThemeXml(name, accent1 = '0B4F8A', accent2 = 'D97706', dk1 = '0F172A', lt1 = 'FFFFFF') {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="${name}">
  <a:themeElements>
    <a:clrScheme name="${name}">
      <a:dk1><a:srgbClr val="${dk1}"/></a:dk1>
      <a:lt1><a:srgbClr val="${lt1}"/></a:lt1>
      <a:dk2><a:srgbClr val="1E293B"/></a:dk2>
      <a:lt2><a:srgbClr val="F1F5F9"/></a:lt2>
      <a:accent1><a:srgbClr val="${accent1}"/></a:accent1>
      <a:accent2><a:srgbClr val="${accent2}"/></a:accent2>
      <a:accent3><a:srgbClr val="0D9488"/></a:accent3>
      <a:accent4><a:srgbClr val="7C3AED"/></a:accent4>
      <a:accent5><a:srgbClr val="DC2626"/></a:accent5>
      <a:accent6><a:srgbClr val="475569"/></a:accent6>
      <a:hlink><a:srgbClr val="${accent1}"/></a:hlink>
      <a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="${name}">
      <a:majorFont><a:latin typeface="Calibri"/><a:ea typeface="Microsoft YaHei"/><a:cs typeface=""/></a:majorFont>
      <a:minorFont><a:latin typeface="Calibri"/><a:ea typeface="Microsoft YaHei"/><a:cs typeface=""/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="${name}">
      <a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>
      <a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>
      <a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
      <a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"><a:tint val="92000"/></a:schemeClr></a:solidFill><a:solidFill><a:schemeClr val="phClr"><a:shade val="85000"/></a:schemeClr></a:solidFill></a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`
}

/**
 * Builds a rich realistic corporate .pptx template:
 * - Dark Navy Cover (slideLayout1, type="title", showMasterSp="0", full-bleed dark PNG bg + gold accent bar + logo)
 * - Slate Section Divider (slideLayout2, type="secHead", dark blue-gray gradient bg)
 * - Daylight Content Layout (slideLayout3, type="obj", inherits master top header bar 0.90", left spine 0.85", bottom footer strip 0.62", corner logo, company footer text, dynamic <a:fld type="slidenum">, plus content placeholders that MUST be stripped!)
 * - Dark Navy Closing Layout (slideLayout4, name="封底 Closing", showMasterSp="0", dark navy solid bg)
 */
function buildFlagshipCorporateTemplatePptx({ includeSlides = true } = {}) {
  const logoPng = makeSolidOrPatternPng(120, 48, (x, y) => (x < 40 ? [217, 119, 6, 255] : [11, 79, 138, 255]))
  const coverBgPng = makeSolidOrPatternPng(160, 90, (x, y) => [10 + Math.floor((x / 160) * 14), 24 + Math.floor((y / 90) * 16), 54, 255], 1)

  const masterXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster ${NS_DECLS}>
  <p:cSld>
    <p:bg><p:bgPr><a:solidFill><a:srgbClr val="F8FAFC"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Corp Top Header Bar"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="822960"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:schemeClr val="accent1"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>
        <p:txBody><a:bodyPr anchor="ctr"/><a:lstStyle/><a:p><a:r><a:rPr lang="zh-CN" sz="1100" b="1"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:rPr><a:t>ACME ENTERPRISE · 集团标准汇报母版</a:t></a:r></a:p></p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="3" name="Corp Left Spine"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="0" y="822960"/><a:ext cx="777240" cy="5468112"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>
        <p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="4" name="Corp Footer Strip"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="0" y="6291072"/><a:ext cx="12192000" cy="566928"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>
        <p:txBody><a:bodyPr anchor="ctr" lIns="914400"/><a:lstStyle/><a:p><a:r><a:rPr lang="zh-CN" sz="950"><a:solidFill><a:srgbClr val="475569"/></a:solidFill></a:rPr><a:t>© 2026 Acme Corp · Internal Standard Template</a:t></a:r></a:p></p:txBody>
      </p:sp>
      <p:pic>
        <p:nvPicPr><p:cNvPr id="5" name="Corp Corner Logo"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>
        <p:blipFill><a:blip r:embed="rId10"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>
        <p:spPr><a:xfrm><a:off x="10800000" y="182880"/><a:ext cx="1097280" cy="438912"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
      </p:pic>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="6" name="Master Title Placeholder"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="914400" y="960120"/><a:ext cx="10515600" cy="640080"/></a:xfrm></p:spPr>
        <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="2800"/><a:t>Click to edit Master title style</a:t></a:r></a:p></p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483701" r:id="rId1"/>
    <p:sldLayoutId id="2147483702" r:id="rId2"/>
    <p:sldLayoutId id="2147483703" r:id="rId3"/>
    <p:sldLayoutId id="2147483704" r:id="rId4"/>
  </p:sldLayoutIdLst>
  <p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles>
</p:sldMaster>`

  const masterRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout3.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout4.xml"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
  <Relationship Id="rId10" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
</Relationships>`

  const layout1Cover = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout ${NS_DECLS} type="title" showMasterSp="0" preserve="1">
  <p:cSld name="封面 Cover">
    <p:bg><p:bgPr><a:blipFill dpi="0" rotWithShape="1"><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></a:blipFill><a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Cover Gold Ribbon"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="146304"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:schemeClr val="accent2"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>
        <p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>
      </p:sp>
      <p:pic>
        <p:nvPicPr><p:cNvPr id="3" name="Cover Logo"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>
        <p:blipFill><a:blip r:embed="rId3"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>
        <p:spPr><a:xfrm><a:off x="10600000" y="365760"/><a:ext cx="1188720" cy="475488"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
      </p:pic>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="4" name="Cover Title Placeholder"/><p:cNvSpPr/><p:nvPr><p:ph type="ctrTitle"/></p:nvPr></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="914400" y="1828800"/><a:ext cx="9601200" cy="1828800"/></a:xfrm></p:spPr>
        <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="zh-CN" sz="4400"/><a:t>单击此处添加标题</a:t></a:r></a:p></p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`

  const layout1Rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image2.png"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
</Relationships>`

  const layout2Section = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout ${NS_DECLS} type="secHead" showMasterSp="0" preserve="1">
  <p:cSld name="章节过渡 Section">
    <p:bg><p:bgPr><a:gradFill><a:gsLst><a:gs pos="0"><a:srgbClr val="0F172A"/></a:gs><a:gs pos="100000"><a:srgbClr val="1E3A5F"/></a:gs></a:gsLst><a:lin ang="2700000" scaled="1"/></a:gradFill><a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Section Left Accent"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="274320" cy="6858000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:schemeClr val="accent2"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>
        <p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="3" name="Section Title Placeholder"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="914400" y="2560320"/><a:ext cx="9601200" cy="1463040"/></a:xfrm></p:spPr>
        <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="3600"/><a:t>Click to add section</a:t></a:r></a:p></p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`

  const layout3Content = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout ${NS_DECLS} type="obj" preserve="1">
  <p:cSld name="通用正文 Content">
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Content Title Placeholder"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
        <p:spPr/>
        <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="2400"/><a:t>Click to add title</a:t></a:r></a:p></p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="3" name="Content Body Placeholder"/><p:cNvSpPr/><p:nvPr><p:ph idx="1"/></p:nvPr></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="960120" y="1645920"/><a:ext cx="10515600" cy="4389120"/></a:xfrm></p:spPr>
        <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="1800"/><a:t>Click to add text</a:t></a:r></a:p></p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="4" name="Slide Number Placeholder"/><p:cNvSpPr/><p:nvPr><p:ph type="sldNum" idx="12"/></p:nvPr></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="10800000" y="6382512"/><a:ext cx="1005840" cy="365760"/></a:xfrm></p:spPr>
        <p:txBody><a:bodyPr anchor="ctr"/><a:lstStyle/><a:p><a:pPr algn="r"/><a:fld id="{B6F15528-F159-4107-2D45-583254132831}" type="slidenum"><a:rPr lang="en-US" sz="1000"><a:solidFill><a:srgbClr val="334155"/></a:solidFill></a:rPr><a:t>‹#›</a:t></a:fld></a:p></p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`

  const layout4Closing = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout ${NS_DECLS} type="blank" showMasterSp="0" preserve="1">
  <p:cSld name="封底致谢 Closing">
    <p:bg><p:bgPr><a:solidFill><a:srgbClr val="0B1F3A"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Closing Bottom Accent"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="0" y="6711696"/><a:ext cx="12192000" cy="146304"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:schemeClr val="accent2"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>
        <p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`

  const stdLayoutRel = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`

  const sampleSlideXml = (title) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld ${NS_DECLS}>
  <p:cSld><p:spTree>
    <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    <p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="914400" y="1200000"/><a:ext cx="9000000" cy="700000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
      <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="zh-CN" sz="2800"/><a:t>${title}</a:t></a:r></a:p></p:txBody>
    </p:sp>
  </p:spTree></p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`

  const slideDefs = includeSlides
    ? [
        { num: 1, layout: 1, title: 'Acme 集团年度战略汇报模板' },
        { num: 2, layout: 2, title: '01 · 业务进展与核心指标' },
        { num: 3, layout: 3, title: '核心经营指标与增长拆解' },
        { num: 4, layout: 4, title: '感谢聆听 · Thank You' },
      ]
    : []

  const entries = [
    {
      name: '[Content_Types].xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout3.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout4.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  ${slideDefs.map((s) => `<Override PartName="/ppt/slides/slide${s.num}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')}
</Types>`,
    },
    {
      name: '_rels/.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>`,
    },
    {
      name: 'ppt/presentation.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation ${NS_DECLS}>
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>${slideDefs.map((s, idx) => `<p:sldId id="${256 + idx}" r:id="rId${idx + 2}"/>`).join('')}</p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000" type="screen16x9"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`,
    },
    {
      name: 'ppt/_rels/presentation.xml.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${slideDefs.map((s, idx) => `<Relationship Id="rId${idx + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${s.num}.xml"/>`).join('')}
</Relationships>`,
    },
    { name: 'ppt/slideMasters/slideMaster1.xml', data: masterXml },
    { name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: masterRelsXml },
    { name: 'ppt/slideLayouts/slideLayout1.xml', data: layout1Cover },
    { name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', data: layout1Rels },
    { name: 'ppt/slideLayouts/slideLayout2.xml', data: layout2Section },
    { name: 'ppt/slideLayouts/_rels/slideLayout2.xml.rels', data: stdLayoutRel },
    { name: 'ppt/slideLayouts/slideLayout3.xml', data: layout3Content },
    { name: 'ppt/slideLayouts/_rels/slideLayout3.xml.rels', data: stdLayoutRel },
    { name: 'ppt/slideLayouts/slideLayout4.xml', data: layout4Closing },
    { name: 'ppt/slideLayouts/_rels/slideLayout4.xml.rels', data: stdLayoutRel },
    { name: 'ppt/theme/theme1.xml', data: makeThemeXml('Acme Corporate') },
    { name: 'ppt/media/image1.png', data: logoPng },
    { name: 'ppt/media/image2.png', data: coverBgPng },
  ]
  for (const s of slideDefs) {
    entries.push({ name: `ppt/slides/slide${s.num}.xml`, data: sampleSlideXml(s.title) })
    entries.push({
      name: `ppt/slides/_rels/slide${s.num}.xml.rels`,
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout${s.layout}.xml"/></Relationships>`,
    })
  }
  return buildZip(entries)
}

function sampleRichSlides() {
  return [
    { layout: 'cover', kicker: 'Q4 EXECUTIVE BRIEF', title: '集团数字化转型年度复盘', subtitle: '全链路效率跃升与下年度战略路线' },
    { layout: 'section', kicker: '01', title: '经营结果与核心增长动能', subtitle: '营收、留存与交付周期全面达标' },
    {
      layout: 'kpi',
      title: '核心业务指标提前超额完成年度考核目标',
      items: [
        { tag: 'ARR', value: '1.85', unit: '亿', delta: '+42% YoY', title: '年度经常性收入', status: 'positive' },
        { tag: 'NRR', value: '118%', delta: '+6 pts', title: '客户净收入留存', status: 'accent' },
        { tag: 'CYCLE', value: '5', unit: '天', delta: '-64%', title: '平均交付周期', status: 'positive' },
      ],
      takeaway: '标准化母版与自动质检使交付周期压缩 64%。',
      source: 'Q4 财务与交付台账',
      notes: '本页展示核心财务与交付指标。',
    },
    {
      layout: 'chart',
      title: '各季度营收保持稳健环比扩张',
      chart: {
        kind: 'column',
        categories: ['Q1', 'Q2', 'Q3', 'Q4'],
        series: [{ name: '营收 (百万)', values: [32, 41, 49, 63] }],
        highlight: 'max',
      },
      source: '集团财务中心',
    },
    {
      layout: 'table',
      title: '重点工作流里程碑与责任矩阵',
      rows: [
        ['模块', '负责人', '目标节点', '状态'],
        ['企业母版直出引擎', '平台组', 'Q1', '已完成'],
        ['合规审计门禁', '风控组', 'Q2', '推进中'],
      ],
    },
    {
      layout: 'mermaid',
      variant: 'flowchart',
      title: '企业母版双端同构渲染架构',
      mermaid: 'flowchart LR\n  A[企业模板 PPTX] --> B{4 角色解析}\n  B --> C[原生 slideMaster]\n  B --> D[HTML SVG 母版]',
    },
    { layout: 'closing', title: '感谢聆听 · 欢迎指正', subtitle: 'Acme Enterprise Strategy · 2026' },
  ]
}

async function assertValidPptx(pptxPathOrBytes) {
  const bytes = typeof pptxPathOrBytes === 'string' ? readFileSync(pptxPathOrBytes) : pptxPathOrBytes
  const pres = await pptxLib.loadPresentation(new Uint8Array(bytes))
  const issues = pptxLib.validatePresentation(pres)
  const errors = issues.filter((i) => i.severity === 'error')
  assert.equal(errors.length, 0, `PPTX 校验出现错误：${errors.map((e) => e.message).join('；')}`)
  return { pres, zip: unzipSync(new Uint8Array(bytes)) }
}

function collectSchemaNodes(node, out = []) {
  if (!node || typeof node !== 'object') return out
  out.push(node)
  for (const val of Object.values(node)) {
    if (Array.isArray(val)) val.forEach((v) => collectSchemaNodes(v, out))
    else if (val && typeof val === 'object') collectSchemaNodes(val, out)
  }
  return out
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('1. 零冲突默认关闭：不传 extractMaster/useTemplateMaster 时行为不变，严格保持 13 工具与 <85KB wire schema', async () => {
  const tools = buildPptTools(DEFAULT_CONFIG)
  assert.equal(tools.length, 13, '必须严格保持 13 个注册工具')
  const totalWireChars = JSON.stringify(tools.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters }))).length
  assert.ok(totalWireChars < 85_000, `13 工具 wire schema 不得超 85KB，当前 ${totalWireChars}`)
  for (const t of tools) {
    const nodes = collectSchemaNodes(t.parameters)
    assert.ok(nodes.every((n) => !Array.isArray(n.type)), `${t.name} 不得存在 wire JSON Schema type 数组`)
  }

  const dir = mkdtempSync(join(tmpdir(), 'dsh-tm-off-'))
  try {
    const corpPath = join(dir, 'corp.pptx')
    writeFileSync(corpPath, buildFlagshipCorporateTemplatePptx())

    // absorbPptx default: extractMaster is false
    const absorbed = await absorbPptx({ pptxPath: corpPath, cwd: dir })
    assert.equal(absorbed.templateMaster, undefined, '默认 absorbPptx 不得启用 templateMaster')

    // buildDeckAsync default with referencePptx: useTemplateMaster is false
    const created = await buildDeckAsync({
      title: 'Default Off Deck',
      slides: sampleRichSlides(),
      referencePptx: corpPath,
      outputDir: dir,
      cwd: dir,
      autoUpgrade: false,
    })
    assert.equal(created.templateMaster, undefined, '默认 referencePptx 不得启用 templateMaster')
    const html = readFileSync(created.htmlPath, 'utf8')
    assert.ok(!html.includes('has-template-master'), '默认关闭时 HTML 不得注入企业母版层')
    const { zip } = await assertValidPptx(created.pptxPath)
    assert.equal(zip['ppt/slideLayouts/slideLayout2.xml'], undefined, '默认关闭时保持单一 slideLayout1.xml')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('2. Plan B 原生 slideMaster 直出 + Plan A 同构模式：4 角色、安全留白区、明暗对比度反转、冲突避让与去重媒体', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-tm-planb-'))
  try {
    const corpPath = join(dir, 'acme-template.pptx')
    writeFileSync(corpPath, buildFlagshipCorporateTemplatePptx())

    // Plan B (native-master)
    const builtB = await buildDeckAsync({
      title: 'Acme 年度复盘 PlanB',
      slides: sampleRichSlides(),
      referencePptx: corpPath,
      useTemplateMaster: true,
      templateMasterMode: 'native-master',
      brand: { footer: '会被企业母版页脚避让的重复页脚' },
      outputDir: dir,
      fileName: 'planb',
      cwd: dir,
      autoUpgrade: false,
    })

    assert.equal(builtB.templateMaster?.enabled, true)
    assert.equal(builtB.templateMaster?.mode, 'native-master')
    assert.equal(builtB.templateMaster?.yieldLogo, true, '应自动探测企业母版 Logo 并避让重复 Logo')
    assert.equal(builtB.templateMaster?.yieldFooter, true, '应自动探测企业母版页脚并避让重复页脚')
    assert.equal(builtB.templateMaster?.yieldSlideNumber, true, '应探测布局动态 slidenum 并避让重复页码')
    assert.ok(builtB.templateMaster.safeInsets.top >= 0.90, `顶部横幅应推高 safeInsets.top，实测 ${builtB.templateMaster.safeInsets.top}`)
    assert.ok(builtB.templateMaster.safeInsets.left >= 0.85, `左侧装饰脊应推高 safeInsets.left，实测 ${builtB.templateMaster.safeInsets.left}`)
    assert.ok(builtB.templateMaster.safeInsets.bottom >= 0.65, `底部页脚带应推高 safeInsets.bottom，实测 ${builtB.templateMaster.safeInsets.bottom}`)

    const { zip: zipB } = await assertValidPptx(builtB.pptxPath)
    // Native slideMaster & 4 role slideLayouts preserved
    const masterXml = strFromU8(zipB['ppt/slideMasters/slideMaster1.xml'])
    assert.ok(masterXml.includes('Corp Top Header Bar'), '原生 slideMaster1 应保留企业顶栏矢量形状')
    assert.ok(masterXml.includes('Corp Footer Strip'), '原生 slideMaster1 应保留企业页脚矢量条')
    assert.ok(!masterXml.includes('Click to edit Master title style'), '原生 slideMaster1 必须剥离标题占位提示词')

    assert.ok(zipB['ppt/slideLayouts/slideLayout1.xml'], '应保留封面角色 slideLayout')
    assert.ok(zipB['ppt/slideLayouts/slideLayout2.xml'], '应保留章节角色 slideLayout')
    assert.ok(zipB['ppt/slideLayouts/slideLayout3.xml'], '应保留正文角色 slideLayout')
    assert.ok(zipB['ppt/slideLayouts/slideLayout4.xml'], '应保留封底角色 slideLayout')
    const contentLayoutXml = strFromU8(zipB['ppt/slideLayouts/slideLayout3.xml'])
    assert.ok(!contentLayoutXml.includes('Click to add title'), '正文 layout 必须剥离标题占位符')
    assert.ok(!contentLayoutXml.includes('Click to add text'), '正文 layout 必须剥离正文占位符')
    assert.ok(contentLayoutXml.includes('type="slidenum"'), '正文 layout 应保留原生动态页码字段')
    assert.ok(!/<p:ph\b[^>]*type="sldNum"/i.test(contentLayoutXml), '原生动态页码应脱离占位符标记以确保 PowerPoint/LibreOffice 无须占位符克隆即直接渲染')

    // Deduplicated corporate master media (2 source images => exactly 2 corp_m_* files across whole deck)
    const corpMediaKeys = Object.keys(zipB).filter((k) => /^ppt\/media\/corp_m_\d+\./.test(k))
    assert.equal(corpMediaKeys.length, 2, '企业母版媒体应全局去重仅存 2 份')

    // Slides omit <p:bg>, use <a:masterClrMapping/>, bind distinct role layouts, yield conflicting chrome/logo/footer/page#
    const slide1Xml = strFromU8(zipB['ppt/slides/slide1.xml'])
    const slide3Xml = strFromU8(zipB['ppt/slides/slide3.xml'])
    const slide7Xml = strFromU8(zipB['ppt/slides/slide7.xml'])
    assert.ok(!slide1Xml.includes('<p:bg>'), 'Plan B 幻灯片应省略 <p:bg> 以透出原生母版背景')
    assert.ok(slide1Xml.includes('<a:masterClrMapping/>'), 'Plan B 幻灯片应使用 masterClrMapping')
    assert.ok(!slide1Xml.includes('Cover backdrop'), '封面应自动避让冲突的内置不透明背景')
    assert.ok(!slide7Xml.includes('Closing backdrop'), '封底应自动避让冲突的内置不透明背景')
    assert.ok(slide1Xml.includes('F8FAFC'), '深色封面母版上的标题文字应自动反转为浅色高对比')
    assert.ok(slide3Xml.includes('0F172A'), '浅色正文母版上的正文文字应保持深色高对比')
    assert.ok(!slide3Xml.includes('34D399'), '浅色正文母版上的正向 KPI 徽章应切换为浅底高对比深绿而非暗底浅薄荷绿')
    assert.ok(!slide3Xml.includes('name="Brand logo"'), '正文页应避让重复 Brand logo')
    assert.ok(!slide3Xml.includes('name="Brand footer"'), '正文页应避让重复 Brand footer')
    assert.ok(!slide3Xml.includes('name="Page number"'), '正文页应避让重复 Page number（改由原生 slidenum 渲染）')

    const rel1 = strFromU8(zipB['ppt/slides/_rels/slide1.xml.rels'])
    const rel2 = strFromU8(zipB['ppt/slides/_rels/slide2.xml.rels'])
    const rel3 = strFromU8(zipB['ppt/slides/_rels/slide3.xml.rels'])
    const rel7 = strFromU8(zipB['ppt/slides/_rels/slide7.xml.rels'])
    assert.notEqual(rel1, rel3, '封面与正文应绑定不同角色 slideLayout')
    assert.notEqual(rel2, rel3, '章节与正文应绑定不同角色 slideLayout')
    assert.notEqual(rel7, rel3, '封底与正文应绑定不同角色 slideLayout')

    // HTML 1:1 parity & CSP safety
    const htmlB = readFileSync(builtB.htmlPath, 'utf8')
    assert.ok(htmlB.includes('has-template-master'), 'HTML 应渲染企业母版层')
    assert.ok(htmlB.includes('corp-master-svg'), 'HTML 应输出矢量+位图同构 SVG 母版')
    assert.ok(htmlB.includes('data-master-role="cover"') && htmlB.includes('data-master-role="content"') && htmlB.includes('data-master-role="closing"'))
    assert.ok(!htmlB.includes('{{asset:'), 'HTML 中的 {{asset:...}} 占位符必须全部水合为 data URI')
    assert.ok(!htmlB.includes('class="brand-logo"'), 'HTML 应避让重复 .brand-logo')
    assert.ok(!htmlB.includes('会被企业母版页脚避让的重复页脚'), 'HTML 应避让重复 .brand-footer')

    // Plan A (overlay)
    const builtA = await buildDeckAsync({
      title: 'Acme 年度复盘 PlanA',
      slides: sampleRichSlides(),
      referencePptx: corpPath,
      useTemplateMaster: true,
      templateMasterMode: 'overlay',
      outputDir: dir,
      fileName: 'plana',
      cwd: dir,
      autoUpgrade: false,
    })
    assert.equal(builtA.templateMaster?.mode, 'overlay')
    const { zip: zipA } = await assertValidPptx(builtA.pptxPath)
    const ovMediaKeys = Object.keys(zipA).filter((k) => /^ppt\/media\/corp_ov_\d+\./.test(k))
    assert.equal(ovMediaKeys.length, 2, 'Plan A overlay 模式媒体同样应全局去重仅存 2 份')
    assert.ok(strFromU8(zipA['ppt/slides/slide1.xml']).includes('<a:blipFill'), 'Plan A 封面应使用共享底图 blipFill')
    assert.ok(strFromU8(zipA['ppt/slides/slide2.xml']).includes('<a:gradFill>'), 'Plan A 章节页应保留对角渐变背景与 Plan B 同构')
    assert.ok(strFromU8(zipA['ppt/slides/slide3.xml']).includes('Corporate Master Shape'), 'Plan A 正文应同步绘制母版矢量顶栏与底栏')
    assert.ok(strFromU8(zipA['ppt/slides/slide3.xml']).includes('lIns="914400"'), 'Plan A 正文页脚条应还原母版 lIns 文本左缩进')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('3. Brand Kit 持久化（.dsh-ppt/brand-kit.json）自动继承企业母版 + useTemplateMaster:false 显式关闭', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-tm-kit-'))
  try {
    const corpPath = join(dir, 'corp.pptx')
    writeFileSync(corpPath, buildFlagshipCorporateTemplatePptx())

    const abs = await absorbPptx({
      pptxPath: corpPath,
      cwd: dir,
      extractMaster: true,
      saveBrandKit: true,
      brandKitName: 'Acme Official Kit',
    })
    assert.ok(abs.savedBrandKitPath && existsSync(abs.savedBrandKitPath))
    const loadedKit = loadWorkspaceBrandKit(dir)
    assert.equal(loadedKit?.templateMaster?.enabled, true)
    assert.ok(loadedKit?.templateMasterAssets && Object.keys(loadedKit.templateMasterAssets).length >= 2)

    // Subsequent deck without referencePptx automatically inherits corporate master from brand-kit.json
    const autoDeck = await buildDeckAsync({
      title: 'Inherited Kit Deck',
      slides: [
        { layout: 'cover', title: '自动继承品牌宪章母版' },
        { layout: 'bullets', title: '合规正文页', bullets: ['**要点 A**：自动套用企业母版', '**要点 B**：零重复资产'] },
        { layout: 'closing', title: '谢谢' },
      ],
      outputDir: dir,
      fileName: 'inherited',
      cwd: dir,
      autoUpgrade: false,
    })
    assert.equal(autoDeck.templateMaster?.enabled, true)
    await assertValidPptx(autoDeck.pptxPath)

    // Explicit opt-out via useTemplateMaster: false
    const optOutDeck = await buildDeckAsync({
      title: 'Opt-out Master Deck',
      slides: [
        { layout: 'cover', title: '显式关闭母版' },
        { layout: 'bullets', title: '常规主题页', bullets: ['不受企业母版干扰'] },
        { layout: 'closing', title: '完' },
      ],
      useTemplateMaster: false,
      outputDir: dir,
      fileName: 'optout',
      cwd: dir,
      autoUpgrade: false,
    })
    assert.equal(optOutDeck.templateMaster, undefined)
    assert.ok(!readFileSync(optOutDeck.htmlPath, 'utf8').includes('has-template-master'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('4. 极端边界 A：0 页空壳企业模板（仅有 slideMaster + slideLayout，无任何示例页）', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-tm-zero-'))
  try {
    const zeroSlidePath = join(dir, 'empty-master-only.pptx')
    writeFileSync(zeroSlidePath, buildFlagshipCorporateTemplatePptx({ includeSlides: false }))

    const abs = await absorbPptx({ pptxPath: zeroSlidePath, cwd: dir, extractMaster: true })
    assert.equal(abs.slideCount, 0)
    assert.equal(abs.templateMaster?.enabled, true)
    assert.equal(abs.templateMaster.roles.cover.dark, true)
    assert.equal(abs.templateMaster.roles.content.dark, false)
    assert.equal(abs.templateMaster.roles.closing.dark, true)

    const built = await buildDeckAsync({
      title: 'Zero-Slide Master Test',
      slides: [
        { layout: 'cover', title: '0 页母版直出验证' },
        { layout: 'bullets', title: '标准正文页', bullets: ['第一条论据', '第二条论据'] },
        { layout: 'closing', title: '结束' },
      ],
      referencePptx: zeroSlidePath,
      useTemplateMaster: true,
      outputDir: dir,
      cwd: dir,
      autoUpgrade: false,
    })
    await assertValidPptx(built.pptxPath)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('5. 极端边界 B：示例页级贴图背景提升（Slide-level bg / full-bleed pic → 角色 slideLayout）与 PNG 亮度/忙乱底图 Scrim 探测', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-tm-promo-'))
  try {
    // Dark cover PNG (Sub filter=1), Busy high-variance checkerboard PNG (Up filter=2) for section
    const darkPng = makeSolidOrPatternPng(64, 36, () => [12, 22, 48, 255], 1)
    const busyPng = makeSolidOrPatternPng(64, 36, (x, y) => (((x >> 2) + (y >> 2)) % 2 === 0 ? [15, 15, 15, 255] : [245, 245, 245, 255]), 2)

    const darkSample = samplePngCenterLuminance(darkPng)
    assert.equal(darkSample?.dark, true)
    assert.equal(darkSample?.needsScrim, false)
    const busySample = samplePngCenterLuminance(busyPng)
    assert.equal(busySample?.needsScrim, true, '高方差明暗交替底图应触发 needsScrim 护眼衬底')

    // Build a template where ALL slides share ONE blank layout, and designer pasted full-bleed <p:pic> / <p:bg> onto slides
    const blankMaster = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster ${NS_DECLS}><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483701" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`
    const blankLayout = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout ${NS_DECLS} type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`
    const slide1CoverPic = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld ${NS_DECLS}><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr><p:pic><p:nvPicPr><p:cNvPr id="2" name="Pasted Cover BG"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="6858000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`
    const slide2SectionBg = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld ${NS_DECLS}><p:cSld><p:bg><p:bgPr><a:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></a:blipFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr><p:sp><p:nvSpPr><p:cNvPr id="2" name="S"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="914400" y="2000000"/><a:ext cx="8000000" cy="700000"/></a:xfrm></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="zh-CN" sz="3200"/><a:t>第一章 章节过渡</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`
    const slide3ContentBg = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld ${NS_DECLS}><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FBF9F5"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr><p:sp><p:nvSpPr><p:cNvPr id="2" name="B"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="914400" y="914400"/><a:ext cx="9000000" cy="700000"/></a:xfrm></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="zh-CN" sz="2400"/><a:t>标准正文页面示例</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`
    const slide4Hidden = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld ${NS_DECLS} show="0"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FF00FF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`

    const pastedTplPath = join(dir, 'slide-pasted-bg.pptx')
    writeFileSync(pastedTplPath, buildZip([
      {
        name: '[Content_Types].xml',
        data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/><Override PartName="/ppt/slides/slide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/><Override PartName="/ppt/slides/slide3.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/><Override PartName="/ppt/slides/slide4.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`,
      },
      { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>` },
      { name: 'ppt/presentation.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation ${NS_DECLS}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId2"/><p:sldId id="257" r:id="rId3"/><p:sldId id="258" r:id="rId4"/><p:sldId id="259" r:id="rId5"/></p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>` },
      { name: 'ppt/_rels/presentation.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide3.xml"/><Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide4.xml"/></Relationships>` },
      { name: 'ppt/slideMasters/slideMaster1.xml', data: blankMaster },
      { name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>` },
      { name: 'ppt/slideLayouts/slideLayout1.xml', data: blankLayout },
      { name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>` },
      { name: 'ppt/theme/theme1.xml', data: makeThemeXml('PastedBG') },
      { name: 'ppt/media/dark.png', data: darkPng },
      { name: 'ppt/media/busy.png', data: busyPng },
      { name: 'ppt/slides/slide1.xml', data: slide1CoverPic },
      { name: 'ppt/slides/_rels/slide1.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/dark.png"/></Relationships>` },
      { name: 'ppt/slides/slide2.xml', data: slide2SectionBg },
      { name: 'ppt/slides/_rels/slide2.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/busy.png"/></Relationships>` },
      { name: 'ppt/slides/slide3.xml', data: slide3ContentBg },
      { name: 'ppt/slides/_rels/slide3.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>` },
      { name: 'ppt/slides/slide4.xml', data: slide4Hidden },
      { name: 'ppt/slides/_rels/slide4.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>` },
    ]))

    const abs = await absorbPptx({ pptxPath: pastedTplPath, cwd: dir, extractMaster: true })
    assert.equal(abs.templateMaster.roles.cover.promotedFromSlide, true, '封面满幅贴图应提升至角色 slideLayout')
    assert.equal(abs.templateMaster.roles.cover.dark, true)
    assert.equal(abs.templateMaster.roles.section.needsScrim, true, '忙乱背景图应标记 needsScrim:true')
    assert.equal(abs.templateMaster.roles.content.dark, false)
    assert.notEqual(abs.templateMaster.roles.closing.bgColor, '#FF00FF', '隐藏页 show="0" 必须被跳过，不得污染封底')
    assert.ok(abs.templateMaster.nativePackage.layouts.length >= 3, '单一 Blank layout 应自动分化为多个角色原生 slideLayout')

    const built = await buildDeckAsync({
      title: 'Promoted Slide BG Deck',
      slides: [
        { layout: 'cover', title: '封面底图提升测试' },
        { layout: 'section', title: '章节页护眼衬底测试' },
        { layout: 'bullets', title: '暖白正文页', bullets: ['条目 A', '条目 B'] },
        { layout: 'closing', title: '结束' },
      ],
      referencePptx: pastedTplPath,
      useTemplateMaster: true,
      outputDir: dir,
      cwd: dir,
      autoUpgrade: false,
    })
    const { zip: busyZip } = await assertValidPptx(built.pptxPath)
    const busySectionXml = strFromU8(busyZip['ppt/slides/slide2.xml'])
    assert.ok(busySectionXml.includes('Corporate Master Reading Scrim'), '高方差背景页 PPTX 同样应注入护眼 Reading Scrim')
    assert.ok(!busySectionXml.includes('<a:srgbClr val="FFFFFF"/>') || busySectionXml.includes('0F172A'), '浅色护眼衬底上的标题文字应为深色高对比而非白字')
    assert.ok(readFileSync(built.htmlPath, 'utf8').includes('corp-master-scrim'), '高方差背景页 HTML 应渲染 corp-master-scrim')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('6. 极端边界 C：4:3 传统企业模板适配 16:9，保护角落正方形 Logo 绝不拉伸变形', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-tm-43-'))
  try {
    const logoPng = makeSolidOrPatternPng(80, 80, () => [15, 76, 129, 255])
    // 4:3 = 9144000 x 6858000 EMU (10" x 7.5")
    const master43 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster ${NS_DECLS}>
  <p:cSld>
    <p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Banner43"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="9144000" cy="548640"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="1E3A8A"/></a:solidFill></p:spPr>
        <p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>
      </p:sp>
      <p:pic>
        <p:nvPicPr><p:cNvPr id="3" name="SquareCornerLogo"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>
        <p:blipFill><a:blip r:embed="rId3"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>
        <p:spPr><a:xfrm><a:off x="7863840" y="182880"/><a:ext cx="914400" cy="914400"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
      </p:pic>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483701" r:id="rId1"/></p:sldLayoutIdLst>
  <p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles>
</p:sldMaster>`
    const layout43 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout ${NS_DECLS} type="obj" preserve="1"><p:cSld name="Content"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`
    const tpl43Path = join(dir, 'legacy-4x3.pptx')
    writeFileSync(tpl43Path, buildZip([
      { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/></Types>` },
      { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>` },
      { name: 'ppt/presentation.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation ${NS_DECLS}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst/><p:sldSz cx="9144000" cy="6858000" type="screen4x3"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>` },
      { name: 'ppt/_rels/presentation.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/></Relationships>` },
      { name: 'ppt/slideMasters/slideMaster1.xml', data: master43 },
      { name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/logo.png"/></Relationships>` },
      { name: 'ppt/slideLayouts/slideLayout1.xml', data: layout43 },
      { name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>` },
      { name: 'ppt/theme/theme1.xml', data: makeThemeXml('Legacy43') },
      { name: 'ppt/media/logo.png', data: logoPng },
    ]))

    const abs = await absorbPptx({ pptxPath: tpl43Path, cwd: dir, extractMaster: true })
    assert.equal(abs.templateMaster.adaptedAspect, true)
    const scaledMasterXml = abs.templateMaster.nativePackage.masters[0].xml
    // Banner stretches to 16:9 full width 12192000
    assert.ok(scaledMasterXml.includes('cx="12192000"'), '顶栏横幅应铺满 16:9 宽度')
    // Square 1"x1" corner logo stays square (914400 x 914400) and anchors to right edge (12192000 - 365760 - 914400 = 10911840)
    const picEl = findBalancedElements(scaledMasterXml, 'p:pic')[0]
    assert.ok(picEl && picEl.outerXml.includes('cx="914400" cy="914400"'), `正方形角落 Logo 必须等比不拉伸，实测：${picEl?.outerXml}`)
    assert.ok(picEl.outerXml.includes('x="10911840"'), '右上角 Logo 应紧贴 16:9 右边距锚定')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('7. 极端边界 D & E：多母版 + <p:bgRef> + 嵌套 <p:grpSp> + 恶意外部 rel/断链/OLE 清洗 + SVG blip + 畸形原生母版自动回退 Plan A', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-tm-hostile-'))
  try {
    const validPng = makeSolidOrPatternPng(64, 32, () => [14, 116, 144, 255])
    const validSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32"><rect width="64" height="32" fill="#0E7490"/></svg>', 'utf8')

    // Master 1 (dark cover with bgRef idx="1001" + external hlink on valid header + broken pic + svgBlip)
    const m1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster ${NS_DECLS} xmlns:asvg="http://schemas.microsoft.com/office/drawing/2016/SVG/main">
  <p:cSld>
    <p:bg><p:bgRef idx="1001"><a:schemeClr val="dk1"/></p:bgRef></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Header With External Link"><a:hlinkClick r:id="rIdExtLink"/></p:cNvPr><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="228600"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:schemeClr val="accent1"/></a:solidFill></p:spPr>
        <p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>
      </p:sp>
      <p:pic>
        <p:nvPicPr><p:cNvPr id="3" name="External Tracker Pic"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>
        <p:blipFill><a:blip r:link="rIdExtImg"/></p:blipFill>
        <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="100000" cy="100000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
      </p:pic>
      <p:pic>
        <p:nvPicPr><p:cNvPr id="4" name="Dangling Missing Pic"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>
        <p:blipFill><a:blip r:embed="rIdMissing"/></p:blipFill>
        <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="100000" cy="100000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
      </p:pic>
      <p:pic>
        <p:nvPicPr><p:cNvPr id="5" name="Valid SVG+PNG Logo"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>
        <p:blipFill><a:blip r:embed="rIdGoodPng"><a:extLst><a:ext uri="{96DAC541-7B7A-43D3-8B79-37D633B846F1}"><asvg:svgBlip r:embed="rIdGoodSvg"/></a:ext></a:extLst></a:blip><a:stretch><a:fillRect/></a:stretch></p:blipFill>
        <p:spPr><a:xfrm><a:off x="10800000" y="250000"/><a:ext cx="914400" cy="457200"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
      </p:pic>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483701" r:id="rId1"/></p:sldLayoutIdLst>
  <p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles>
</p:sldMaster>`

    // Master 2 (light content with nested <p:grpSp>)
    const m2Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster ${NS_DECLS}>
  <p:cSld>
    <p:bg><p:bgRef idx="1001"><a:schemeClr val="lt1"/></p:bgRef></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      <p:grpSp>
        <p:nvGrpSpPr><p:cNvPr id="10" name="Header Group"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
        <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="548640"/><a:chOff x="0" y="0"/><a:chExt cx="12192000" cy="548640"/></a:xfrm></p:grpSpPr>
        <p:sp>
          <p:nvSpPr><p:cNvPr id="11" name="Grouped Accent Strip"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
          <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="182880"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:schemeClr val="accent1"/></a:solidFill></p:spPr>
          <p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>
        </p:sp>
      </p:grpSp>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483702" r:id="rId1"/></p:sldLayoutIdLst>
  <p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles>
</p:sldMaster>`

    const layCover = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout ${NS_DECLS} type="title" preserve="1"><p:cSld name="Cover"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`
    const layContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout ${NS_DECLS} type="obj" preserve="1"><p:cSld name="Content"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`

    const hostilePath = join(dir, 'multi-hostile.pptx')
    writeFileSync(hostilePath, buildZip([
      { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="svg" ContentType="image/svg+xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideMasters/slideMaster2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/slideLayouts/slideLayout2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/ppt/theme/theme2.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/></Types>` },
      { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>` },
      { name: 'ppt/presentation.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation ${NS_DECLS}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/><p:sldMasterId id="2147483649" r:id="rId2"/></p:sldMasterIdLst><p:sldIdLst/><p:sldSz cx="12192000" cy="6858000" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>` },
      { name: 'ppt/_rels/presentation.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster2.xml"/></Relationships>` },
      { name: 'ppt/slideMasters/slideMaster1.xml', data: m1Xml },
      { name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/><Relationship Id="rIdExtLink" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://evil.example/" TargetMode="External"/><Relationship Id="rIdExtImg" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="https://evil.example/pixel.png" TargetMode="External"/><Relationship Id="rIdMissing" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/nonexistent.png"/><Relationship Id="rIdOle" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/oleObject" Target="../embeddings/evil.bin"/><Relationship Id="rIdGoodPng" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/good.png"/><Relationship Id="rIdGoodSvg" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/good.svg"/></Relationships>` },
      { name: 'ppt/slideMasters/slideMaster2.xml', data: m2Xml },
      { name: 'ppt/slideMasters/_rels/slideMaster2.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout2.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme2.xml"/></Relationships>` },
      { name: 'ppt/slideLayouts/slideLayout1.xml', data: layCover },
      { name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>` },
      { name: 'ppt/slideLayouts/slideLayout2.xml', data: layContent },
      { name: 'ppt/slideLayouts/_rels/slideLayout2.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster2.xml"/></Relationships>` },
      { name: 'ppt/theme/theme1.xml', data: makeThemeXml('DarkMaster', '0E7490', 'F59E0B', '0B132B', 'FFFFFF') },
      { name: 'ppt/theme/theme2.xml', data: makeThemeXml('LightMaster', '1D4ED8', '10B981', '0F172A', 'FFFFFF') },
      { name: 'ppt/media/good.png', data: validPng },
      { name: 'ppt/media/good.svg', data: validSvg },
    ]))

    const built = await buildDeckAsync({
      title: 'Multi-Master Sanitized Deck',
      slides: [
        { layout: 'cover', title: '多母版与恶意关系清洗验证' },
        { layout: 'bullets', title: '第二母版浅色正文', bullets: ['嵌套 grpSp 顶栏保留', '外部追踪像素与断链清零'] },
        { layout: 'closing', title: '完' },
      ],
      referencePptx: hostilePath,
      useTemplateMaster: true,
      outputDir: dir,
      cwd: dir,
      autoUpgrade: false,
    })

    const { zip } = await assertValidPptx(built.pptxPath)
    assert.ok(zip['ppt/slideMasters/slideMaster1.xml'] && zip['ppt/slideMasters/slideMaster2.xml'], '双母版均应完整移植')
    assert.ok(zip['ppt/theme/theme1.xml'] && zip['ppt/theme/theme2.xml'], '双主题均应完整移植')
    const outM1 = strFromU8(zip['ppt/slideMasters/slideMaster1.xml'])
    const outM1Rels = strFromU8(zip['ppt/slideMasters/_rels/slideMaster1.xml.rels'])
    assert.ok(outM1.includes('Header With External Link'), '带外链的合法标题栏图形应保留（仅剥离外链）')
    assert.ok(!outM1.includes('rIdExtLink'), '外部超链接必须被剥离')
    assert.ok(!outM1.includes('External Tracker Pic'), '外部追踪图片节点必须被剥离')
    assert.ok(!outM1.includes('Dangling Missing Pic'), '断链缺失图片节点必须被剥离')
    assert.ok(!outM1Rels.includes('evil.example') && !outM1Rels.includes('oleObject'), '外部与 OLE 关系必须全部清零')
    assert.ok(Object.keys(zip).some((k) => k.endsWith('.svg')), '合法 SVG 矢量 Logo 应保留在 ppt/media/')

    // Verify graceful automatic fallback to Plan A overlay when native master XML is corrupted
    const manifestJson = JSON.parse(readFileSync(built.jsonPath, 'utf8'))
    const brokenTm = structuredClone(manifestJson.brand.templateMaster)
    brokenTm.nativePackage.masters[0].xml = '<<<BROKEN XML NOT PARSABLE'
    const fallbackBuilt = await buildDeckAsync({
      title: 'Fallback Proof Deck',
      slides: [
        { layout: 'cover', title: '畸形原生母版自动降级验证' },
        { layout: 'bullets', title: '依然输出合法 PPTX', bullets: ['自动回退至 Plan A overlay 模式'] },
        { layout: 'closing', title: '完' },
      ],
      brand: { templateMaster: brokenTm },
      templateMasterAssets: manifestJson.assets,
      outputDir: dir,
      fileName: 'fallback',
      cwd: dir,
      autoUpgrade: false,
    })
    await assertValidPptx(fallbackBuilt.pptxPath)
    assert.equal(fallbackBuilt.templateMaster?.mode, 'overlay', '畸形原生母版回退后应诚实回报有效模式 overlay')
    assert.ok(
      (fallbackBuilt.templateMaster?.warnings || []).some((w) => /回退/.test(w)),
      '畸形原生母版回退应在 templateMaster.warnings 中记录降级提示',
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('8. editDeck / undoDeck 完整生命周期（套用母版 → 切换模式 → 暂停 → 清除 → 撤销恢复资产）', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-tm-edit-'))
  try {
    const corpPath = join(dir, 'corp.pptx')
    writeFileSync(corpPath, buildFlagshipCorporateTemplatePptx())

    const base = await buildDeckAsync({
      title: 'Lifecycle Deck',
      slides: [
        { layout: 'cover', title: '初始无母版文稿' },
        { layout: 'bullets', title: '正文页', bullets: ['条目 1', '条目 2'] },
        { layout: 'closing', title: '结束' },
      ],
      outputDir: dir,
      cwd: dir,
      autoUpgrade: false,
    })
    assert.equal(base.templateMaster, undefined)

    // 1. Apply corporate master via editDeck
    const applied = await editDeck({
      deckPath: base.jsonPath,
      expectedRevision: base.revision,
      referencePptx: corpPath,
      useTemplateMaster: true,
      cwd: dir,
    })
    assert.equal(applied.templateMaster?.enabled, true)
    assert.equal(applied.templateMaster?.mode, 'native-master')
    await assertValidPptx(applied.pptxPath)

    // 2. Switch mode native-master -> overlay
    const switched = await editDeck({
      deckPath: applied.jsonPath,
      expectedRevision: applied.revision,
      templateMasterMode: 'overlay',
      cwd: dir,
    })
    assert.equal(switched.templateMaster?.mode, 'overlay')
    await assertValidPptx(switched.pptxPath)

    // 3. Pause master
    const paused = await editDeck({
      deckPath: switched.jsonPath,
      expectedRevision: switched.revision,
      useTemplateMaster: false,
      cwd: dir,
    })
    assert.equal(paused.templateMaster, undefined)

    // 4. Clear master completely
    const cleared = await editDeck({
      deckPath: paused.jsonPath,
      expectedRevision: paused.revision,
      brand: { templateMaster: null },
      cwd: dir,
    })
    assert.equal(cleared.templateMaster, undefined)

    // 5. Undo twice: restores paused, then restores active overlay with all embedded assets intact!
    const u1 = await undoDeck({ deckPath: cleared.jsonPath, expectedRevision: cleared.revision, cwd: dir })
    const u2 = await undoDeck({ deckPath: u1.jsonPath, expectedRevision: u1.revision, cwd: dir })
    assert.equal(u2.templateMaster?.enabled, true)
    assert.equal(u2.templateMaster?.mode, 'overlay')
    await assertValidPptx(u2.pptxPath)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('9. Workbench 端到端（absorb-upload extractMaster / edit / save-brand-kit / create / 安全守卫 / client bundle）与 CLI', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-tm-wb-'))
  try {
    const corpBytes = buildFlagshipCorporateTemplatePptx()
    const corpPath = join(dir, 'corp.pptx')
    writeFileSync(corpPath, corpBytes)
    const corpDataUrl = 'data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,' + corpBytes.toString('base64')

    const wb = new PptWorkbench({ catalogPath: join(dir, 'projects.jsonl') })

    // 1. Create via Workbench with useTemplateMaster: true
    const created = await wb.action({
      operation: 'create',
      title: '工作台企业母版演示',
      content: '# 工作台企业母版演示\n\n## 核心结论\n- **提效**：原生母版直出\n- **零冲突**：默认关闭按需开启',
      referencePptxData: corpDataUrl,
      useTemplateMaster: true,
      templateMasterMode: 'native-master',
    })
    assert.equal(created.ok, true)
    assert.equal(created.project.brand?.templateMaster?.enabled, true)
    assert.equal(created.project.brand?.templateMaster?.mode, 'native-master')
    assert.ok(created.project.html.includes('has-template-master'))

    // 2. Absorb upload with extractMaster: true
    const absRes = await wb.action({
      operation: 'absorb-upload',
      id: created.project.id,
      expectedRevision: created.project.revision,
      data: corpDataUrl,
      extractMaster: true,
      sourceFile: 'C:\\secret\\host\\path\\company.pptx',
    })
    assert.equal(absRes.ok, true)
    assert.equal(absRes.absorbed.templateMaster?.sourceFile, 'company.pptx', '绝不得泄漏宿主机完整路径')
    assert.ok(absRes.absorbed.templateMasterAssets && Object.keys(absRes.absorbed.templateMasterAssets).length >= 2)

    // 3. Toggle mode & save workspace brand-kit via Workbench
    const edited = await wb.action({
      operation: 'edit',
      id: created.project.id,
      expectedRevision: created.project.revision,
      templateMasterMode: 'overlay',
    })
    assert.equal(edited.project.brand?.templateMaster?.mode, 'overlay')

    const savedKit = await wb.action({
      operation: 'save-brand-kit',
      id: created.project.id,
      expectedRevision: edited.project.revision,
      name: 'Workbench Corporate Kit',
    })
    assert.equal(savedKit.ok, true)
    assert.equal(savedKit.hasTemplateMaster, true)

    // 4. Security guard: reject host paths inside brand.templateMaster & templateMasterAssets
    await assert.rejects(
      () => wb.action({
        operation: 'edit',
        id: created.project.id,
        expectedRevision: edited.project.revision,
        brand: { templateMaster: { enabled: true, pptxPath: '/etc/passwd' } },
      }),
      /不能读取其他本地文件/,
    )
    await assert.rejects(
      () => wb.action({
        operation: 'edit',
        id: created.project.id,
        expectedRevision: edited.project.revision,
        templateMasterAssets: { ['img-' + 'a'.repeat(64)]: { data: 'file:///etc/passwd', width: 10, height: 10, mime: 'image/png' } },
      }),
      /不能读取其他本地文件/,
    )

    // 5. Verify built client bundle includes Corporate Template Master UI controls
    const clientBundle = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
    assert.ok(clientBundle.includes('Corporate Template Master'), 'lib/client.js 应包含企业模板母版 UI 控件')
    assert.ok(clientBundle.includes('save-brand-kit'), 'lib/client.js 应包含一键保存企业品牌宪章锁动作')

    // 6. CLI --absorb --extract-master & --use-template-master
    const cliLogs = []
    const code1 = await cliMain(['--absorb', corpPath, '--extract-master'], { log: (m) => cliLogs.push(m) })
    assert.equal(code1, 0)
    const parsedCliAbs = JSON.parse(cliLogs.join('\n'))
    assert.equal(parsedCliAbs.templateMaster?.enabled, true)

    const cliOutDir = join(dir, 'cli-out')
    const code2 = await cliMain([
      '--title', 'CLI Corporate Master',
      '--content', '# CLI Corporate Master\n\n## Slide 1\n- Item A\n- Item B',
      '--reference-pptx', corpPath,
      '--use-template-master',
      '--template-master-mode', 'native-master',
      '--out', cliOutDir,
      '--file', 'cli-deck',
    ], { log: () => {} })
    assert.equal(code2, 0)
    await assertValidPptx(join(cliOutDir, 'cli-deck.pptx'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('10. safeInsets 坐标映射保持正圆/图标等比不畸变', () => {
  const sampleXml =
    '<p:sp><p:nvSpPr><p:cNvPr id="10" name="Dot"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>' +
    '<p:spPr><a:xfrm><a:off x="914400" y="914400"/><a:ext cx="457200" cy="457200"/></a:xfrm><a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom></p:spPr></p:sp>'
  const mapped = remapShapesXmlToSafeZone(sampleXml, { top: 1.4, right: 0.62, bottom: 0.9, left: 1.2 })
  const extMatch = /<a:ext cx="(\d+)" cy="(\d+)"\/>/.exec(mapped)
  assert.ok(extMatch)
  assert.equal(extMatch[1], extMatch[2], '正圆在非等比安全区缩放下必须保持 cx === cy 不变扁')
})

test('11. 严格 OOXML 加固：clrMapOvr 反白、母版独占 ftr/sldNum 继承、spPr xsd:sequence、tags/悬空 rId 清洗、原子 bg 提升与多母版 theme2 校验回退', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-tm-strict-'))
  try {
    const relOpen = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    const pngBg = makeSolidOrPatternPng(64, 36, () => [12, 24, 58, 255])
    const pngLogo = makeSolidOrPatternPng(32, 32, () => [217, 119, 6, 255])
    const svgBg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="36"><rect width="64" height="36" fill="#0C183A"/></svg>', 'utf8')

    // Master with bgRef bg1, gradient TopBar with undeclared rId999, master-only ftr & sldNum, <p:custDataLst><p:tags r:id="rIdTag"/>, and <p:otherStyle>
    const masterXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster ${NS_DECLS}>
  <p:cSld>
    <p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="GradTopBar"><a:hlinkClick r:id="rId999"/></p:cNvPr><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="731520"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:gradFill><a:gsLst><a:gs pos="0"><a:srgbClr val="0B4F8A"/></a:gs><a:gs pos="100000"><a:srgbClr val="1E3A5F"/></a:gs></a:gsLst><a:lin ang="0" scaled="1"/></a:gradFill>
        </p:spPr>
        <p:txBody><a:bodyPr anchor="ctr"/><a:lstStyle/><a:p><a:r><a:rPr lang="zh-CN" sz="1100" b="1"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:rPr><a:t>ACME STRICT MASTER</a:t></a:r></a:p></p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="3" name="Master Footer"/><p:cNvSpPr/><p:nvPr><p:ph type="ftr" idx="11"/></p:nvPr></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="600000" y="6300000"/><a:ext cx="6000000" cy="360000"/></a:xfrm></p:spPr>
        <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="1000"><a:solidFill><a:srgbClr val="64748B"/></a:solidFill></a:rPr><a:t>© 2026 Contoso Master Footer</a:t></a:r></a:p></p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="4" name="Master SlideNum"/><p:cNvSpPr/><p:nvPr><p:ph type="sldNum" idx="12"/></p:nvPr></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="10800000" y="6300000"/><a:ext cx="900000" cy="360000"/></a:xfrm></p:spPr>
        <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:pPr algn="r"/><a:fld id="{11111111-1111-1111-1111-111111111111}" type="slidenum"><a:rPr lang="en-US" sz="1000"><a:solidFill><a:srgbClr val="475569"/></a:solidFill></a:rPr><a:t>‹#›</a:t></a:fld></a:p></p:txBody>
      </p:sp>
    </p:spTree>
    <p:custDataLst><p:tags r:id="rIdTag"/></p:custDataLst>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483701" r:id="rId1"/>
    <p:sldLayoutId id="2147483702" r:id="rId2"/>
    <p:sldLayoutId id="2147483703" r:id="rId3"/>
  </p:sldLayoutIdLst>
  <p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle><a:lvl1pPr><a:defRPr sz="1000"><a:solidFill><a:srgbClr val="334155"/></a:solidFill></a:defRPr></a:lvl1pPr></p:otherStyle></p:txStyles>
</p:sldMaster>`

    // Layout 1: Dark cover via clrMapOvr bg1="dk1" (inherits master bgRef bg1)
    const lay1 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout ${NS_DECLS} type="title" showMasterSp="0"><p:cSld name="Dark Override Cover"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:overrideClrMapping bg1="dk1" tx1="lt1" bg2="dk2" tx2="lt2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/></p:clrMapOvr></p:sldLayout>`
    // Layout 2: Section with 45deg 3-stop gradient
    const lay2 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout ${NS_DECLS} type="secHead" showMasterSp="0"><p:cSld name="Section"><p:bg><p:bgPr><a:gradFill><a:gsLst><a:gs pos="0"><a:srgbClr val="0F172A"/></a:gs><a:gs pos="50000"><a:srgbClr val="1D4ED8"/></a:gs><a:gs pos="100000"><a:srgbClr val="0EA5E9"/></a:gs></a:gsLst><a:lin ang="2700000" scaled="1"/></a:gradFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`
    // Layout 3: Content with sldNum lacking prstGeom & rPr (has solidFill after xfrm!) + ftr with self-closing <p:spPr bwMode="auto"/>
    const lay3 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout ${NS_DECLS} type="obj"><p:cSld name="Content"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>` +
      `<p:sp><p:nvSpPr><p:cNvPr id="4" name="SlideNum"/><p:cNvSpPr/><p:nvPr><p:ph type="sldNum" idx="12"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="10800000" y="6300000"/><a:ext cx="900000" cy="360000"/></a:xfrm><a:solidFill><a:srgbClr val="F1F5F9"/></a:solidFill></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:fld id="{22222222-2222-2222-2222-222222222222}" type="slidenum"><a:t>‹#›</a:t></a:fld></a:p></p:txBody></p:sp>` +
      `<p:sp><p:nvSpPr><p:cNvPr id="5" name="Footer"/><p:cNvSpPr/><p:nvPr><p:ph type="ftr" idx="11"/></p:nvPr></p:nvSpPr><p:spPr bwMode="auto"/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>© 2026 Contoso Layout Footer</a:t></a:r></a:p></p:txBody></p:sp>` +
      `</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`

    const strictPath = join(dir, 'strict.pptx')
    writeFileSync(strictPath, buildZip([
      { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/slideLayouts/slideLayout2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/slideLayouts/slideLayout3.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/ppt/tags/tag1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tags+xml"/></Types>' },
      { name: '_rels/.rels', data: relOpen + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>' },
      { name: 'ppt/presentation.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation ${NS_DECLS}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst/><p:sldSz cx="12192000" cy="6858000" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>` },
      { name: 'ppt/_rels/presentation.xml.rels', data: relOpen + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/></Relationships>' },
      { name: 'ppt/slideMasters/slideMaster1.xml', data: masterXml },
      { name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: relOpen + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout3.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/><Relationship Id="rIdTag" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/tags" Target="../tags/tag1.xml"/></Relationships>' },
      { name: 'ppt/slideLayouts/slideLayout1.xml', data: lay1 },
      { name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', data: relOpen + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>' },
      { name: 'ppt/slideLayouts/slideLayout2.xml', data: lay2 },
      { name: 'ppt/slideLayouts/_rels/slideLayout2.xml.rels', data: relOpen + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>' },
      { name: 'ppt/slideLayouts/slideLayout3.xml', data: lay3 },
      { name: 'ppt/slideLayouts/_rels/slideLayout3.xml.rels', data: relOpen + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>' },
      { name: 'ppt/theme/theme1.xml', data: makeThemeXml('Strict', '0B4F8A', 'D97706', '0B1F3A', 'FFFFFF') },
      { name: 'ppt/tags/tag1.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:tagLst xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:tag name="THINKCELL" val="1"/></p:tagLst>' },
    ]))

    const abs = await absorbPptx({ pptxPath: strictPath, cwd: dir, extractMaster: true })
    assert.equal(abs.templateMaster.roles.cover.dark, true, 'layout clrMapOvr bg1=dk1 必须识别为深色封面')
    assert.equal(abs.templateMaster.roles.cover.bgColor, '#0B1F3A')
    assert.equal(abs.templateMaster.roles.section.bgGradient?.angle, 45, 'bgGradient 必须保留真实角度 45°')
    assert.equal(abs.templateMaster.roles.section.bgGradient?.stops?.[1]?.pos, 0.5, '中间渐变色标 50% 必须规范化为 0.5')
    assert.doesNotThrow(() => validateNativePackageXml(abs.templateMaster.nativePackage), '清洗后的原生母版包必须通过严格 OOXML 预检')

    const outMasterXml = abs.templateMaster.nativePackage.masters[0].xml
    assert.ok(!outMasterXml.includes('rIdTag') && !outMasterXml.includes('custDataLst'), '必须剥离 <p:custDataLst> 避免 tags 悬空关系')
    assert.ok(!outMasterXml.includes('rId999'), '必须剥离未在 .rels 声明的悬空超链接 rId999')

    const outLay3Xml = abs.templateMaster.nativePackage.layouts.find((l) => l.name === 'Content').xml
    assert.ok(outLay3Xml.includes('<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill>'), '<a:prstGeom> 必须严格插在 <a:solidFill> 之前以符合 CT_ShapeProperties xsd:sequence')
    assert.ok(outLay3Xml.includes('<p:spPr bwMode="auto"><a:xfrm>'), '带属性的自闭合 <p:spPr bwMode="auto"/> 必须完整展开而非破坏 XML 结构')
    assert.ok(outLay3Xml.includes('<a:rPr lang="en-US" sz="1000">'), '未显式声明 rPr 的 sldNum/ftr 应继承母版字号与颜色样式')

    // Master-only ftr & sldNum inherited onto blank content layout
    const layBlank = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout ${NS_DECLS} type="obj"><p:cSld name="Inherited Content"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`
    const inheritPath = join(dir, 'inherit.pptx')
    writeFileSync(inheritPath, buildZip([
      { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/></Types>' },
      { name: '_rels/.rels', data: relOpen + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>' },
      { name: 'ppt/presentation.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation ${NS_DECLS}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst/><p:sldSz cx="12192000" cy="6858000" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>` },
      { name: 'ppt/_rels/presentation.xml.rels', data: relOpen + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/></Relationships>' },
      { name: 'ppt/slideMasters/slideMaster1.xml', data: masterXml },
      { name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: relOpen + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>' },
      { name: 'ppt/slideLayouts/slideLayout1.xml', data: layBlank },
      { name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', data: relOpen + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>' },
      { name: 'ppt/theme/theme1.xml', data: makeThemeXml('Inherit', '0B4F8A', 'D97706', '0B1F3A', 'FFFFFF') },
    ]))
    const absInh = await absorbPptx({ pptxPath: inheritPath, cwd: dir, extractMaster: true })
    assert.equal(absInh.templateMaster.roles.content.hasFooter, true, '母版独占 ftr 占位符应被正文版式继承并识别')
    assert.equal(absInh.templateMaster.roles.content.hasSlideNumber, true, '母版独占 sldNum 占位符应被正文版式继承并识别')
    assert.ok(absInh.templateMaster.nativePackage.layouts[0].xml.includes('Contoso Master Footer'))
    assert.ok(absInh.templateMaster.nativePackage.layouts[0].xml.includes('type="slidenum"'))

    // Atomic single-pass <p:bg> promotion with 2 embeds + external r:link + xmlns:asvg propagation
    const layWithLogo = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout ${NS_DECLS} type="blank"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr><p:pic><p:nvPicPr><p:cNvPr id="2" name="Logo"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="100000" y="100000"/><a:ext cx="500000" cy="500000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`
    const slideDualBg = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld ${NS_DECLS} xmlns:asvg="http://schemas.microsoft.com/office/drawing/2016/SVG/main"><p:cSld><p:bg><p:bgPr><a:blipFill><a:blip r:embed="rId2" r:link="rIdExt"><a:extLst><a:ext uri="{96DAC541-7B7A-43D3-8B79-37D633B846F1}"><asvg:svgBlip r:embed="rId3"/></a:ext></a:extLst></a:blip><a:stretch><a:fillRect/></a:stretch></a:blipFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`
    const dualBgPath = join(dir, 'dual-bg.pptx')
    writeFileSync(dualBgPath, buildZip([
      { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="svg" ContentType="image/svg+xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>' },
      { name: '_rels/.rels', data: relOpen + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>' },
      { name: 'ppt/presentation.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation ${NS_DECLS}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>` },
      { name: 'ppt/_rels/presentation.xml.rels', data: relOpen + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/></Relationships>' },
      { name: 'ppt/slideMasters/slideMaster1.xml', data: masterXml },
      { name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: relOpen + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>' },
      { name: 'ppt/slideLayouts/slideLayout1.xml', data: layWithLogo },
      { name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', data: relOpen + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/logo.png"/></Relationships>' },
      { name: 'ppt/slides/slide1.xml', data: slideDualBg },
      { name: 'ppt/slides/_rels/slide1.xml.rels', data: relOpen + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/bg.png"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/bg.svg"/><Relationship Id="rIdExt" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="https://evil.example/x.png" TargetMode="External"/></Relationships>' },
      { name: 'ppt/theme/theme1.xml', data: makeThemeXml('DualBg') },
      { name: 'ppt/media/logo.png', data: pngLogo },
      { name: 'ppt/media/bg.png', data: pngBg },
      { name: 'ppt/media/bg.svg', data: svgBg },
    ]))
    const builtDual = await buildDeckAsync({
      title: 'Atomic BG Promo Deck',
      slides: [{ layout: 'cover', title: '封面' }, { layout: 'bullets', title: '正文', bullets: ['条目'] }],
      referencePptx: dualBgPath,
      useTemplateMaster: true,
      outputDir: dir,
      fileName: 'dual-bg-out',
      cwd: dir,
      autoUpgrade: false,
    })
    assert.equal(builtDual.templateMaster?.mode, 'native-master')
    const { zip: dualZip } = await assertValidPptx(builtDual.pptxPath)
    const promotedLayXml = strFromU8(dualZip['ppt/slideLayouts/slideLayout1.xml'])
    assert.ok(promotedLayXml.includes('xmlns:asvg='), '提升含 asvg:svgBlip 的 <p:bg> 时必须补齐 xmlns:asvg 声明')
    assert.ok(!promotedLayXml.includes('r:link='), '提升 <p:bg> 时必须剥离外链 r:link')
    assert.ok(promotedLayXml.includes('<a:blip r:embed="rId3"') && promotedLayXml.includes('<asvg:svgBlip r:embed="rId4"'), '单次原子 rId 重映射不得导致主图与 svgBlip 互相覆盖')

    // Multi-master corrupt theme2.xml triggers strict pre-flight fallback to Plan A overlay + honest yieldSlideNumber: false
    const brokenTheme2Tm = structuredClone(abs.templateMaster)
    brokenTheme2Tm.nativePackage.themes.push({ index: 2, xml: '<a:theme><<<UNCLOSED' })
    const fbDeck = await buildDeckAsync({
      title: 'Corrupt Theme2 Fallback',
      slides: [{ layout: 'cover', title: '封面' }, { layout: 'bullets', title: '正文', bullets: ['回退测试'] }],
      brand: { templateMaster: brokenTheme2Tm },
      outputDir: dir,
      fileName: 'corrupt-theme2',
      cwd: dir,
      autoUpgrade: false,
    })
    await assertValidPptx(fbDeck.pptxPath)
    assert.equal(fbDeck.templateMaster?.mode, 'overlay')
    assert.equal(fbDeck.templateMaster?.yieldSlideNumber, false, '回退至 overlay 模式后 yieldSlideNumber 必须如实报告 false')
    assert.ok((fbDeck.templateMaster?.warnings || []).some((w) => /theme2\.xml/.test(w)))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('12. Plan A 渐变角度/三色标/渐变顶栏与 HTML 双端视觉修复（color:var(--fg)、vh/px safeInsets、独立 SVG 渐变 ID、media-footer 避让、负坐标出血保留）', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-tm-html-parity-'))
  try {
    const relOpen = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    // 4:3 master with negative bled-off decorative circle + gradient top header bar + 45deg 3-stop section gradient
    const masterXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster ${NS_DECLS}>
  <p:cSld>
    <p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Bled Off Circle"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="-457200" y="-228600"/><a:ext cx="914400" cy="914400"/></a:xfrm><a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="DBEAFE"/></a:solidFill></p:spPr>
        <p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="3" name="Grad Header"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="9144000" cy="731520"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:gradFill><a:gsLst><a:gs pos="0"><a:srgbClr val="0B4F8A"/></a:gs><a:gs pos="100000"><a:srgbClr val="1E3A5F"/></a:gs></a:gsLst><a:lin ang="0" scaled="1"/></a:gradFill>
        </p:spPr>
        <p:txBody><a:bodyPr anchor="ctr"/><a:lstStyle/><a:p><a:r><a:rPr lang="zh-CN" sz="1100" b="1"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:rPr><a:t>ACME HEADER</a:t></a:r></a:p></p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="4" name="Bottom Footer"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="0" y="6291072"/><a:ext cx="9144000" cy="566928"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill></p:spPr>
        <p:txBody><a:bodyPr anchor="ctr"/><a:lstStyle/><a:p><a:r><a:rPr lang="zh-CN" sz="950"><a:solidFill><a:srgbClr val="475569"/></a:solidFill></a:rPr><a:t>© 2026 Acme Footer</a:t></a:r></a:p></p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483701" r:id="rId1"/><p:sldLayoutId id="2147483702" r:id="rId2"/></p:sldLayoutIdLst>
  <p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles>
</p:sldMaster>`
    const laySec = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout ${NS_DECLS} type="secHead" showMasterSp="0"><p:cSld name="Section"><p:bg><p:bgPr><a:gradFill><a:gsLst><a:gs pos="0"><a:srgbClr val="0F172A"/></a:gs><a:gs pos="50000"><a:srgbClr val="1D4ED8"/></a:gs><a:gs pos="100000"><a:srgbClr val="0EA5E9"/></a:gs></a:gsLst><a:lin ang="2700000" scaled="1"/></a:gradFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`
    const layBody = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout ${NS_DECLS} type="obj"><p:cSld name="Content"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`

    const tplPath = join(dir, 'grad-4x3.pptx')
    writeFileSync(tplPath, buildZip([
      { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/slideLayouts/slideLayout2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/></Types>' },
      { name: '_rels/.rels', data: relOpen + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>' },
      { name: 'ppt/presentation.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation ${NS_DECLS}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst/><p:sldSz cx="9144000" cy="6858000" type="screen4x3"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>` },
      { name: 'ppt/_rels/presentation.xml.rels', data: relOpen + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/></Relationships>' },
      { name: 'ppt/slideMasters/slideMaster1.xml', data: masterXml },
      { name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: relOpen + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>' },
      { name: 'ppt/slideLayouts/slideLayout1.xml', data: laySec },
      { name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', data: relOpen + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>' },
      { name: 'ppt/slideLayouts/slideLayout2.xml', data: layBody },
      { name: 'ppt/slideLayouts/_rels/slideLayout2.xml.rels', data: relOpen + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>' },
      { name: 'ppt/theme/theme1.xml', data: makeThemeXml('Grad4x3') },
    ]))

    const builtB = await buildDeckAsync({
      title: 'Parity Plan B',
      slides: [
        { layout: 'section', title: '章节过渡' },
        { layout: 'bullets', title: '正文页', bullets: ['要点 A', '要点 B'] },
        { layout: 'chart', title: '图表页', chart: { kind: 'column', categories: ['Q1', 'Q2'], series: [{ name: '营收', values: [10, 20] }] }, source: '财务部' },
      ],
      referencePptx: tplPath,
      useTemplateMaster: true,
      templateMasterMode: 'native-master',
      outputDir: dir,
      fileName: 'parity-b',
      cwd: dir,
      autoUpgrade: false,
    })
    const { zip: zipB } = await assertValidPptx(builtB.pptxPath)
    const scaledMaster = strFromU8(zipB['ppt/slideMasters/slideMaster1.xml'])
    assert.ok(scaledMaster.includes('x="-457200" y="-228600"'), '4:3 -> 16:9 适配必须保留出血装饰图形的合法负坐标')

    const html = readFileSync(builtB.htmlPath, 'utf8')
    assert.ok(html.includes('.slide.has-template-master{background:transparent !important;color:var(--fg)}'), 'HTML 母版页必须显式绑定 color:var(--fg) 避免继承 body 错误极性')
    assert.ok(html.includes('--tm-pad-t-vh:') && html.includes('--tm-pad-t-px:'), 'HTML 安全区上下边距必须使用 vh/px 而非按宽度计算的 CSS %')
    assert.ok(!/padding-top:\d+(?:\.\d+)?%/.test(html), 'HTML 内联样式不得再输出按宽度计算的 padding-top:%')
    assert.ok(html.includes('id="tm_s0_g1"') && html.includes('id="tm_s1_g1"') && html.includes('id="tm_s2_g1"'), '各页内联 SVG 渐变 ID 必须按页隔离，防止被 display:none 隐藏页遮蔽')
    assert.ok(html.includes('<footer class="media-footer-bar" style="left:'), '媒体页 footer-bar 必须避让企业母版底部页脚带')
    assert.ok(html.includes('--ink-on-accent:') && html.includes('--accent2:'), '角色 CSS 变量必须覆盖完整极性 token')

    // Plan A overlay parity check
    const builtA = await buildDeckAsync({
      title: 'Parity Plan A',
      slides: [
        { layout: 'section', title: '章节过渡' },
        { layout: 'bullets', title: '正文页', bullets: ['要点 A', '要点 B'] },
      ],
      referencePptx: tplPath,
      useTemplateMaster: true,
      templateMasterMode: 'overlay',
      outputDir: dir,
      fileName: 'parity-a',
      cwd: dir,
      autoUpgrade: false,
    })
    const { zip: zipA } = await assertValidPptx(builtA.pptxPath)
    const s1Xml = strFromU8(zipA['ppt/slides/slide1.xml'])
    const s2Xml = strFromU8(zipA['ppt/slides/slide2.xml'])
    assert.ok(s1Xml.includes('ang="2700000"'), 'Plan A 章节背景必须保留 45° 渐变角度')
    assert.ok(s1Xml.includes('pos="50000"'), 'Plan A 章节背景必须保留 50% 中间色标')
    assert.ok(s2Xml.includes('<a:gradFill>'), 'Plan A 正文页 overlayShapes 必须保留母版渐变顶栏')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('13. Workbench 加固：save-brand-kit 修订号冲突拦截 + Logo 保留 + 无参考文件时 create 支持 useTemplateMaster:false 退订 + Lightbox 暗色对比度', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-tm-wb-hard-'))
  try {
    const corpBytes = buildFlagshipCorporateTemplatePptx()
    const corpDataUrl = 'data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,' + corpBytes.toString('base64')
    const logoPng = makeSolidOrPatternPng(40, 20, () => [14, 116, 144, 255])
    const logoUri = 'data:image/png;base64,' + logoPng.toString('base64')
    const wb = new PptWorkbench({ catalogPath: join(dir, 'projects.jsonl') })

    const created = await wb.action({
      operation: 'create',
      title: 'Brand Kit Logo Preserve',
      content: '# Brand Kit Logo Preserve\n\n## Slide 1\n- Point A',
      brand: { name: 'Acme', logo: logoUri },
      referencePptxData: corpDataUrl,
      useTemplateMaster: true,
    })
    assert.equal(created.project.brand?.templateMaster?.enabled, true)

    // Stale expectedRevision MUST be rejected on save-brand-kit
    await assert.rejects(
      () => wb.action({
        operation: 'save-brand-kit',
        id: created.project.id,
        expectedRevision: created.project.revision + 99,
        name: 'Stale Kit',
      }),
      /项目已被修改|修订号/,
    )

    // Valid save-brand-kit preserves BOTH templateMaster and brand.logo
    const saved = await wb.action({
      operation: 'save-brand-kit',
      id: created.project.id,
      expectedRevision: created.project.revision,
      name: 'Verified Kit',
    })
    assert.equal(saved.ok, true)
    assert.equal(saved.hasTemplateMaster, true)
    const kit = loadWorkspaceBrandKit(dir)
    assert.ok(typeof kit?.brand?.logo === 'string' && kit.brand.logo.startsWith('data:image/png;base64,'), 'save-brand-kit 必须还原保存品牌 Logo')

    // Workbench create WITHOUT referencePptxData can opt out via useTemplateMaster: false
    const optOut = await wb.action({
      operation: 'create',
      title: 'OptOut Kit Deck',
      content: '# OptOut\n\n## S1\n- Item',
      useTemplateMaster: false,
    })
    assert.ok(!optOut.project.brand?.templateMaster || optOut.project.brand.templateMaster.enabled === false)
    assert.ok(!optOut.project.html.includes('has-template-master'))

    // Built client bundle Lightbox sets contrast CSS variables and supports bgGradient
    const clientBundle = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
    assert.ok(clientBundle.includes("'--w-text': roleSpec.dark ? '#F8FAFC' : '#0F172A'"), 'Lightbox 必须设置 --w-text 避免深底暗字')
    assert.ok(clientBundle.includes('linear-gradient('), 'Lightbox 应支持渐变角色底图预览')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
