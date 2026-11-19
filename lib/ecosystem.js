import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, extname, join, resolve } from 'node:path';
const MAX_CITE_FILE_BYTES = 8 * 1024 * 1024;
const REMOTION_VERSION = '4.0.539';
function cleanStr(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
}
export function normalizeDoi(raw) {
    const s = cleanStr(raw);
    if (!s)
        return '';
    const stripped = s.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '').trim();
    return /^10\.\d{4,9}\/\S+$/i.test(stripped) ? stripped.toLowerCase() : '';
}
function stripLatexBraces(value) {
    return value
        .replace(/\\&/g, '&')
        .replace(/\\%/g, '%')
        .replace(/\\_/g, '_')
        .replace(/\\['"`^~=.uvHcdbtr]\{?([A-Za-z])\}?/g, '$1')
        .replace(/[{}]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
function parseBibtexAuthors(raw) {
    if (!raw.trim())
        return [];
    return raw
        .split(/\s+and\s+/i)
        .map(part => stripLatexBraces(part))
        .filter(Boolean)
        .map(person => {
        if (person.includes(',')) {
            const [family, given] = person.split(',').map(s => s.trim());
            return { family: family || '', given: given || '', name: [given, family].filter(Boolean).join(' ') };
        }
        const tokens = person.split(/\s+/).filter(Boolean);
        if (tokens.length === 1)
            return { family: tokens[0], given: '', name: tokens[0] };
        const family = tokens.at(-1) || '';
        const given = tokens.slice(0, -1).join(' ');
        return { family, given, name: person };
    });
}
export function parseBibtexEntries(text) {
    const entries = [];
    const src = String(text ?? '');
    let i = 0;
    while (i < src.length) {
        const at = src.indexOf('@', i);
        if (at < 0)
            break;
        const head = /@([A-Za-z]+)\s*[({]\s*([^,\s]+)\s*,/y;
        head.lastIndex = at;
        const m = head.exec(src);
        if (!m) {
            i = at + 1;
            continue;
        }
        const entryType = m[1].toLowerCase();
        const bibKey = m[2].trim();
        if (['string', 'preamble', 'comment'].includes(entryType)) {
            i = head.lastIndex;
            continue;
        }
        const braceOffset = src.slice(at + 1 + m[1].length).search(/[({]/);
        const openChar = braceOffset >= 0 ? src[at + 1 + m[1].length + braceOffset] : '{';
        let depth = 1;
        let pos = head.lastIndex;
        while (pos < src.length && depth > 0) {
            const ch = src[pos];
            if (ch === '{' || (openChar === '(' && ch === '('))
                depth++;
            else if (ch === '}' || (openChar === '(' && ch === ')'))
                depth--;
            pos++;
        }
        const body = src.slice(head.lastIndex, Math.max(head.lastIndex, pos - 1));
        i = pos;
        const fields = {};
        let fPos = 0;
        while (fPos < body.length) {
            while (fPos < body.length && /[\s,]/.test(body[fPos]))
                fPos++;
            if (fPos >= body.length)
                break;
            const keyMatch = /([A-Za-z_][A-Za-z0-9_-]*)\s*=\s*/y;
            keyMatch.lastIndex = fPos;
            const km = keyMatch.exec(body);
            if (!km) {
                fPos++;
                continue;
            }
            const fieldName = km[1].toLowerCase();
            fPos = keyMatch.lastIndex;
            let val = '';
            if (body[fPos] === '{') {
                let d = 1;
                let p = fPos + 1;
                while (p < body.length && d > 0) {
                    if (body[p] === '{')
                        d++;
                    else if (body[p] === '}')
                        d--;
                    p++;
                }
                val = body.slice(fPos + 1, Math.max(fPos + 1, p - 1));
                fPos = p;
            }
            else if (body[fPos] === '"') {
                let p = fPos + 1;
                while (p < body.length) {
                    if (body[p] === '"' && body[p - 1] !== '\\')
                        break;
                    p++;
                }
                val = body.slice(fPos + 1, p);
                fPos = p + 1;
            }
            else {
                const bare = /[^,\r\n}]+/y;
                bare.lastIndex = fPos;
                const bm = bare.exec(body);
                if (bm) {
                    val = bm[0];
                    fPos = bare.lastIndex;
                }
            }
            fields[fieldName] = stripLatexBraces(val);
        }
        const yearMatch = /\d{4}/.exec(fields.year || '');
        const doi = normalizeDoi(fields.doi || '');
        entries.push({
            id: bibKey,
            bibKey,
            doi,
            title: fields.title || '',
            authors: parseBibtexAuthors(fields.author || ''),
            containerTitle: fields.journal || fields.booktitle || fields.series || '',
            publisher: fields.publisher || '',
            year: yearMatch ? Number(yearMatch[0]) : 0,
            volume: fields.volume || '',
            issue: fields.number || fields.issue || '',
            page: fields.pages || fields.page || '',
            url: cleanStr(fields.url || ''),
            type: entryType,
        });
    }
    return entries;
}
function normalizeJsonCitationRecord(raw, fallbackIndex = 0) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return null;
    const r = raw;
    const work = (r.work && typeof r.work === 'object' ? r.work : r);
    const rawAuthors = Array.isArray(work.authors) ? work.authors : Array.isArray(work.author) ? work.author : [];
    const authors = rawAuthors
        .map(a => {
        if (typeof a === 'string') {
            const parsed = parseBibtexAuthors(a);
            return parsed[0] || { given: '', family: a, name: a };
        }
        if (!a || typeof a !== 'object')
            return null;
        const ao = a;
        const given = cleanStr(ao.given);
        const family = cleanStr(ao.family);
        const name = cleanStr(ao.name) || [given, family].filter(Boolean).join(' ');
        return (given || family || name) ? { given, family, name } : null;
    })
        .filter((a) => a !== null);
    let year = 0;
    if (typeof work.year === 'number' && Number.isInteger(work.year) && work.year > 0)
        year = work.year;
    else if (typeof work.year === 'string' && /^\d{4}$/.test(work.year.trim()))
        year = Number(work.year.trim());
    else if (work.issued && typeof work.issued === 'object') {
        const dp = work.issued['date-parts'];
        if (Array.isArray(dp) && Array.isArray(dp[0]) && typeof dp[0][0] === 'number')
            year = dp[0][0];
    }
    const doi = normalizeDoi(work.doi ?? work.DOI);
    const title = cleanStr(work.title);
    const bibKey = cleanStr(r.bibKey || r.citeKey || r.citekey || r.key || r.id || (doi ? doi : `ref-${fallbackIndex + 1}`));
    const containerTitle = cleanStr(work.containerTitle ?? work['container-title'] ?? work.journal ?? work.venue);
    if (!title && !doi && !authors.length)
        return null;
    return {
        id: cleanStr(r.id) || bibKey,
        bibKey,
        doi,
        title,
        authors,
        containerTitle,
        publisher: cleanStr(work.publisher),
        year,
        volume: cleanStr(work.volume),
        issue: cleanStr(work.issue),
        page: cleanStr(work.page),
        url: cleanStr(work.url ?? work.URL),
        type: cleanStr(work.type) || 'article',
    };
}
function readVerifiedFile(path) {
    const st = lstatSync(path);
    if (!st.isFile() || st.isSymbolicLink() || st.size > MAX_CITE_FILE_BYTES) {
        throw new Error('dsh-ppt：文献库文件无效或超过 8 MiB');
    }
    return readFileSync(path, 'utf8');
}
export function loadCitationEntriesFromFile(filePath) {
    const ext = extname(filePath).toLowerCase();
    const text = readVerifiedFile(filePath);
    if (ext === '.bib')
        return parseBibtexEntries(text);
    if (ext === '.jsonl') {
        const out = [];
        for (const line of text.split(/\r?\n/)) {
            if (!line.trim())
                continue;
            try {
                const rec = normalizeJsonCitationRecord(JSON.parse(line), out.length);
                if (rec)
                    out.push(rec);
            }
            catch { /* skip malformed line */ }
        }
        return out;
    }
    const parsed = JSON.parse(text);
    const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.entries)
            ? parsed.entries
            : Array.isArray(parsed?.works)
                ? parsed.works
                : Array.isArray(parsed?.items)
                    ? parsed.items
                    : [];
    return list
        .map((item, idx) => normalizeJsonCitationRecord(item, idx))
        .filter((x) => x !== null);
}
export function discoverCitationStorePath(cwd) {
    const candidates = [
        join(cwd, '.dsh-cite', 'library.json'),
        join(cwd, 'dsh-cite', 'library.json'),
        join(cwd, 'references.bib'),
        join(cwd, 'citations.bib'),
        join(cwd, 'references.json'),
        join(cwd, 'citations.json'),
        join(cwd, 'citations.jsonl'),
        join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'data', 'dsh-cite', 'library.json'),
    ];
    for (const candidate of candidates) {
        try {
            if (!existsSync(candidate))
                continue;
            const st = lstatSync(candidate);
            if (st.isFile() && !st.isSymbolicLink() && st.size <= MAX_CITE_FILE_BYTES)
                return candidate;
        }
        catch { /* ignore */ }
    }
    return undefined;
}
function authorShortName(a) {
    if (a.family)
        return a.family;
    if (a.name) {
        const parts = a.name.trim().split(/\s+/);
        return parts.length > 1 ? parts.at(-1) : a.name.trim();
    }
    return a.given;
}
function formatAuthorsList(authors, style) {
    if (!authors.length)
        return '';
    const names = authors.map(a => {
        if (a.family && a.given) {
            return style === 'apa'
                ? `${a.family}, ${a.given[0]}.`
                : `${a.family} ${a.given}`;
        }
        return a.name || a.family || a.given;
    }).filter(Boolean);
    if (names.length === 0)
        return '';
    if (names.length <= 3)
        return names.join(style === 'apa' ? ', & ' : ', ');
    return `${names.slice(0, 3).join(', ')}, et al.`;
}
function shortVenueLabel(venue) {
    const clean = venue.trim();
    if (clean.length > 24) {
        const acronym = /\(([A-Za-z][A-Za-z0-9-]{1,15})\)/.exec(clean);
        if (acronym)
            return acronym[1];
    }
    return clean;
}
export function formatShortSourceCitation(entry, num, includeDoi = true) {
    const first = entry.authors[0] ? authorShortName(entry.authors[0]) : '';
    const authorPart = entry.authors.length > 2
        ? `${first} et al.`
        : entry.authors.length === 2
            ? `${first} & ${authorShortName(entry.authors[1])}`
            : first;
    const venue = shortVenueLabel(entry.containerTitle);
    const venueYear = [venue, entry.year ? String(entry.year) : ''].filter(Boolean).join(' ');
    const core = [authorPart, venueYear].filter(Boolean).join(', ');
    const doiPart = entry.doi && (includeDoi || !core) ? `doi:${entry.doi}` : '';
    const parts = [core, doiPart].filter(Boolean);
    if (parts.length === 0 && entry.title)
        parts.push(entry.title.slice(0, 60));
    return `[${num}] ${parts.join(' · ')}`.trim();
}
export function formatReferenceEntry(entry, num, style = 'gb-t-7714') {
    if (!entry.title && !entry.authors.length && entry.doi) {
        return `[${num}] doi:${entry.doi}`;
    }
    const authors = formatAuthorsList(entry.authors, style);
    const authorToken = authors ? (authors.endsWith('.') ? authors : `${authors}.`) : '';
    const title = entry.title || (entry.doi ? `doi:${entry.doi}` : entry.bibKey);
    const venue = entry.containerTitle || entry.publisher;
    const year = entry.year ? String(entry.year) : '';
    const doi = entry.doi ? (style === 'apa' || style === 'chicago' ? `https://doi.org/${entry.doi}` : `DOI: ${entry.doi}`) : '';
    if (style === 'apa') {
        const head = [authors, year ? `(${year}).` : ''].filter(Boolean).join(' ');
        const volIssue = entry.volume ? `${entry.volume}${entry.issue ? `(${entry.issue})` : ''}` : '';
        const venuePart = [venue, volIssue, entry.page].filter(Boolean).join(', ');
        return `[${num}] ${[head, `${title}.`, venuePart ? `${venuePart}.` : '', doi].filter(Boolean).join(' ')}`.trim();
    }
    if (style === 'mla' || style === 'chicago') {
        const venuePart = [venue, entry.volume ? `vol. ${entry.volume}` : '', year, entry.page ? `pp. ${entry.page}` : ''].filter(Boolean).join(', ');
        return `[${num}] ${[authorToken, `"${title}."`, venuePart ? `${venuePart}.` : '', doi].filter(Boolean).join(' ')}`.trim();
    }
    // GB/T 7714 default
    const volPart = [year, entry.volume ? `${entry.volume}${entry.issue ? `(${entry.issue})` : ''}` : ''].filter(Boolean).join(', ');
    const pubLine = [venue, volPart + (entry.page ? `: ${entry.page}` : '')].filter(Boolean).join(', ');
    return `[${num}] ${[authorToken, `${title}${venue ? '[J]' : ''}.`, pubLine ? `${pubLine}.` : '', doi].filter(Boolean).join(' ')}`.trim();
}
function readManifestFromDeck(deckPath, engine) {
    const engAny = engine;
    if (engAny && typeof engAny.readDeckProject === 'function') {
        return engAny.readDeckProject({ deckPath });
    }
    const st = lstatSync(deckPath);
    if (!st.isFile() || st.isSymbolicLink() || st.size > 64 * 1024 * 1024) {
        throw new Error('dsh-ppt：工程文件无效或过大');
    }
    return { manifest: JSON.parse(readFileSync(deckPath, 'utf8')), path: deckPath };
}
function collectSlideSearchText(slide) {
    const parts = [];
    for (const k of ['title', 'subtitle', 'takeaway', 'text', 'source', 'notes']) {
        if (typeof slide?.[k] === 'string' && slide[k])
            parts.push(slide[k]);
    }
    if (Array.isArray(slide?.bullets))
        parts.push(...slide.bullets.filter((b) => typeof b === 'string'));
    if (Array.isArray(slide?.items)) {
        for (const it of slide.items) {
            if (!it || typeof it !== 'object')
                continue;
            for (const k of ['tag', 'title', 'text', 'body']) {
                if (typeof it[k] === 'string' && it[k])
                    parts.push(it[k]);
            }
            if (Array.isArray(it.bullets))
                parts.push(...it.bullets.filter((b) => typeof b === 'string'));
        }
    }
    if (Array.isArray(slide?.rows)) {
        for (const row of slide.rows) {
            if (Array.isArray(row))
                parts.push(row.map(c => String(c ?? '')).join(' '));
        }
    }
    return parts.join('\n');
}
function isReferencesSlide(slide) {
    const title = cleanStr(slide?.title).toLowerCase();
    const kicker = cleanStr(slide?.kicker).toLowerCase();
    return kicker === 'references' || /^(references|参考文献|bibliography|引用文献)(\s*[·/|].*)?$/i.test(title);
}
export async function attachCitationsToDeck(options) {
    options.signal?.throwIfAborted();
    const cwd = options.cwd ?? process.cwd();
    const deckPath = resolve(cwd, options.deckPath);
    const style = options.style && ['gb-t-7714', 'apa', 'mla', 'chicago'].includes(options.style)
        ? options.style
        : 'gb-t-7714';
    const { manifest } = readManifestFromDeck(deckPath, options.engine);
    const loaded = [];
    let sourcePath;
    if (typeof options.citePath === 'string' && options.citePath.trim()) {
        sourcePath = resolve(cwd, options.citePath.trim());
        loaded.push(...loadCitationEntriesFromFile(sourcePath));
    }
    else {
        const discovered = discoverCitationStorePath(cwd);
        if (discovered) {
            sourcePath = discovered;
            loaded.push(...loadCitationEntriesFromFile(discovered));
        }
    }
    const inlineEntries = [];
    if (typeof options.bibtex === 'string' && options.bibtex.trim()) {
        const parsedBib = parseBibtexEntries(options.bibtex);
        inlineEntries.push(...parsedBib);
        loaded.push(...parsedBib);
    }
    const byKey = new Map();
    const byDoi = new Map();
    const byId = new Map();
    for (const entry of loaded) {
        if (entry.bibKey)
            byKey.set(entry.bibKey.toLowerCase(), entry);
        if (entry.doi)
            byDoi.set(entry.doi.toLowerCase(), entry);
        if (entry.id)
            byId.set(entry.id.toLowerCase(), entry);
    }
    if (Array.isArray(options.dois)) {
        for (const rawDoi of options.dois) {
            const doi = normalizeDoi(rawDoi);
            if (!doi)
                continue;
            if (!byDoi.has(doi)) {
                const doiOnly = {
                    id: doi,
                    bibKey: doi,
                    doi,
                    title: '',
                    authors: [],
                    containerTitle: '',
                    publisher: '',
                    year: 0,
                    volume: '',
                    issue: '',
                    page: '',
                    url: `https://doi.org/${doi}`,
                    type: 'article',
                };
                byDoi.set(doi, doiOnly);
                byKey.set(doi, doiOnly);
                inlineEntries.push(doiOnly);
                loaded.push(doiOnly);
            }
            else {
                inlineEntries.push(byDoi.get(doi));
            }
        }
    }
    const resolveToken = (token) => {
        const t = token.trim().replace(/^@/, '');
        if (!t)
            return undefined;
        const doi = normalizeDoi(t);
        if (doi && byDoi.has(doi))
            return byDoi.get(doi);
        return byKey.get(t.toLowerCase()) || byId.get(t.toLowerCase());
    };
    const orderedEntries = [];
    const numByEntryKey = new Map();
    const missingKeys = [];
    const slideMatches = new Map();
    const registerMatch = (entry) => {
        const mapKey = (entry.doi || entry.bibKey || entry.id).toLowerCase();
        const existing = numByEntryKey.get(mapKey);
        if (existing !== undefined)
            return existing;
        orderedEntries.push(entry);
        const num = orderedEntries.length;
        numByEntryKey.set(mapKey, num);
        return num;
    };
    const slides = Array.isArray(manifest.slides) ? manifest.slides : [];
    for (const slide of slides) {
        if (isReferencesSlide(slide))
            continue;
        const haystack = collectSlideSearchText(slide);
        const foundOnSlide = [];
        const citeRe = /\[@([A-Za-z0-9_.:/-]+(?:\s*[,;]\s*@?[A-Za-z0-9_.:/-]+)*)\]/g;
        let match;
        while ((match = citeRe.exec(haystack)) !== null) {
            const tokens = match[1].split(/[,;]/).map(s => s.trim().replace(/^@/, '')).filter(Boolean);
            for (const tok of tokens) {
                const entry = resolveToken(tok);
                if (entry) {
                    registerMatch(entry);
                    if (!foundOnSlide.includes(entry))
                        foundOnSlide.push(entry);
                }
                else if (!missingKeys.includes(tok)) {
                    missingKeys.push(tok);
                }
            }
        }
        const doiRe = /\[doi:(10\.\d{4,9}\/[^\s\]]+)\]/gi;
        while ((match = doiRe.exec(haystack)) !== null) {
            const doi = normalizeDoi(match[1]);
            if (!doi)
                continue;
            let entry = byDoi.get(doi);
            if (!entry) {
                entry = {
                    id: doi,
                    bibKey: doi,
                    doi,
                    title: '',
                    authors: [],
                    containerTitle: '',
                    publisher: '',
                    year: 0,
                    volume: '',
                    issue: '',
                    page: '',
                    url: `https://doi.org/${doi}`,
                    type: 'article',
                };
                byDoi.set(doi, entry);
            }
            registerMatch(entry);
            if (!foundOnSlide.includes(entry))
                foundOnSlide.push(entry);
        }
        if (foundOnSlide.length)
            slideMatches.set(slide.id, foundOnSlide);
    }
    if (Array.isArray(options.citeKeys)) {
        for (const rawKey of options.citeKeys) {
            const tok = String(rawKey ?? '').trim();
            if (!tok)
                continue;
            const entry = resolveToken(tok);
            if (entry)
                registerMatch(entry);
            else if (!missingKeys.includes(tok))
                missingKeys.push(tok);
        }
    }
    else if (orderedEntries.length === 0 && inlineEntries.length > 0) {
        for (const entry of inlineEntries)
            registerMatch(entry);
    }
    if (orderedEntries.length === 0) {
        return {
            ok: true,
            matchedCount: 0,
            citedKeys: [],
            missingKeys,
            ...(sourcePath ? { sourcePath } : {}),
        };
    }
    const edits = [];
    for (const slide of slides) {
        if (isReferencesSlide(slide))
            continue;
        const foundOnSlide = slideMatches.get(slide.id);
        if (!foundOnSlide?.length)
            continue;
        let formatted = foundOnSlide.map(entry => {
            const num = registerMatch(entry);
            return formatShortSourceCitation(entry, num, true);
        });
        if (foundOnSlide.length >= 3 && formatted.join(' · ').length > 115) {
            formatted = foundOnSlide.map(entry => {
                const num = registerMatch(entry);
                return formatShortSourceCitation(entry, num, false);
            });
        }
        const existingSource = cleanStr(slide.source);
        const toAdd = formatted.filter(item => {
            const tagMatch = /^\[\d+\]/.exec(item);
            return tagMatch ? !existingSource.includes(tagMatch[0]) : !existingSource.includes(item);
        });
        if (toAdd.length) {
            edits.push({
                slide: slide.id,
                patch: {
                    source: existingSource ? `${existingSource} · ${toAdd.join(' · ')}` : toAdd.join(' · '),
                },
            });
        }
    }
    const append = [];
    let referencesSlideIndex;
    if (options.appendReferences !== false) {
        const refLines = orderedEntries.map((entry, idx) => formatReferenceEntry(entry, idx + 1, style));
        const existingRefIdx = slides.findIndex(isReferencesSlide);
        const refTitle = manifest.language === 'en' ? 'References' : '参考文献 · References';
        if (existingRefIdx >= 0) {
            referencesSlideIndex = existingRefIdx + 1;
            edits.push({
                slide: slides[existingRefIdx].id,
                patch: {
                    layout: 'bullets',
                    kicker: 'REFERENCES',
                    title: refTitle,
                    bullets: refLines,
                    source: sourcePath ? `dsh-cite · ${basename(sourcePath)}` : 'dsh-cite verified bibliography',
                },
            });
        }
        else {
            referencesSlideIndex = slides.length + 1;
            append.push({
                layout: 'bullets',
                variant: 'clean',
                kicker: 'REFERENCES',
                title: refTitle,
                bullets: refLines,
                source: sourcePath ? `dsh-cite · ${basename(sourcePath)}` : 'dsh-cite verified bibliography',
                notes: manifest.language === 'en'
                    ? `Verified references (${orderedEntries.length} citations).`
                    : `经 dsh-cite 核验的参考文献列表（共 ${orderedEntries.length} 条）。`,
            });
        }
    }
    let deck;
    if (edits.length > 0 || append.length > 0) {
        deck = await options.engine.editDeck({
            deckPath,
            expectedRevision: options.expectedRevision ?? manifest.revision,
            saveAs: options.saveAs === true,
            ...(edits.length ? { edits } : {}),
            ...(append.length ? { append } : {}),
            cwd,
            signal: options.signal,
        });
    }
    return {
        ok: true,
        matchedCount: orderedEntries.length,
        citedKeys: orderedEntries.map(e => e.bibKey || e.doi || e.id),
        missingKeys,
        ...(sourcePath ? { sourcePath } : {}),
        ...(referencesSlideIndex !== undefined ? { referencesSlideIndex } : {}),
        ...(deck ? { deck } : {}),
    };
}
const DIAGRAM_LAYOUTS = new Set([
    'chart', 'chart-split', 'waterfall', 'table', 'harvey', 'marimekko', 'sankey',
    'swot', 'value-chain', 'gantt', 'architecture', 'tam', 'org', 'mermaid', 'flowchart', 'sequence',
]);
export function computePaceBudgetFallback(manifest, targetMinutesOverride) {
    const slides = Array.isArray(manifest?.slides) ? manifest.slides : [];
    const rawTarget = targetMinutesOverride ?? manifest?.targetMinutes;
    const targetMinutes = typeof rawTarget === 'number' && Number.isFinite(rawTarget) && rawTarget > 0
        ? Math.round(rawTarget * 10) / 10
        : null;
    const rawBudgets = slides.map((slide, idx) => {
        const layout = String(slide?.layout || 'bullets');
        const notesText = cleanStr(slide?.notes);
        const copyText = [
            slide?.title,
            slide?.subtitle,
            slide?.takeaway,
            slide?.text,
            ...(Array.isArray(slide?.bullets) ? slide.bullets : []),
            ...(Array.isArray(slide?.items) ? slide.items.flatMap((it) => [it?.title, it?.text, ...(it?.bullets ?? [])]) : []),
        ].filter(Boolean).join(' ');
        const spoken = notesText || copyText;
        const cjk = (spoken.match(/[\u3400-\u9fff]/g) || []).length;
        const latin = (spoken.replace(/[\u3400-\u9fff]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length;
        let sec = cjk / (220 / 60) + latin / (145 / 60);
        if (DIAGRAM_LAYOUTS.has(layout) || slide?.chart || slide?.rows || slide?.formula || slide?.mermaid)
            sec += 12;
        const isFraming = ['cover', 'closing', 'section'].includes(layout);
        sec = Math.max(isFraming ? 12 : 20, Math.min(240, Math.round(sec)));
        return {
            slide: idx + 1,
            ...(typeof slide?.id === 'string' ? { slideId: slide.id } : {}),
            title: cleanStr(slide?.title) || `Slide ${idx + 1}`,
            layout,
            seconds: sec,
            minutes: Math.round((sec / 60) * 100) / 100,
        };
    });
    const estimatedSeconds = rawBudgets.reduce((s, b) => s + b.seconds, 0);
    const estimatedMinutes = Math.round((estimatedSeconds / 60) * 10) / 10;
    const targetTotalSeconds = targetMinutes ? targetMinutes * 60 : estimatedSeconds;
    const perSlideBudget = slides.length > 0 ? targetTotalSeconds / slides.length : 60;
    const evaluated = rawBudgets.map(item => {
        const isOver = item.seconds > 150 || (targetMinutes !== null && item.seconds > perSlideBudget * 1.45);
        const isUnder = targetMinutes !== null && item.seconds < perSlideBudget * 0.45 && !['cover', 'closing', 'section'].includes(item.layout);
        return {
            ...item,
            status: isOver ? 'over-budget' : isUnder ? 'under-budget' : 'ok',
        };
    });
    const overrunSlides = evaluated.filter(s => s.status === 'over-budget').map(s => s.slide);
    const deltaMinutes = targetMinutes !== null ? Math.round((estimatedMinutes - targetMinutes) * 10) / 10 : 0;
    const overBudget = targetMinutes !== null ? estimatedMinutes > targetMinutes * 1.05 || overrunSlides.length > 0 : overrunSlides.length > 0;
    return {
        slideCount: slides.length,
        estimatedSeconds,
        estimatedMinutes,
        targetMinutes,
        deltaMinutes,
        deltaSeconds: targetMinutes !== null ? estimatedSeconds - targetMinutes * 60 : 0,
        overBudget,
        overrunSlides,
        overBudgetSlides: overrunSlides,
        status: overBudget ? 'over-budget' : 'on-track',
        slides: evaluated,
    };
}
export function renderOnePagerHtmlFallback(manifest, lang) {
    const effectiveLang = lang || manifest?.language || 'zh';
    const en = effectiveLang === 'en';
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const title = cleanStr(manifest?.title) || (en ? 'Executive One-Pager' : '高管一页纸摘要');
    const slides = Array.isArray(manifest?.slides) ? manifest.slides : [];
    const pace = computePaceBudgetFallback(manifest);
    const primary = manifest?.brand?.primaryColor || '#0057B8';
    const bg = manifest?.brand?.backgroundColor || '#F8FAFC';
    const fg = manifest?.brand?.textColor || '#0F172A';
    const cardsHtml = slides.map((s, idx) => {
        const items = Array.isArray(s.items) ? s.items.slice(0, 4).map((it) => `<li><strong>${esc([it.tag, it.value, it.title].filter(Boolean).join(' · '))}</strong>${it.text ? ` — ${esc(it.text)}` : ''}</li>`).join('') : '';
        const bullets = Array.isArray(s.bullets) ? s.bullets.slice(0, 4).map((b) => `<li>${esc(b)}</li>`).join('') : '';
        const summary = s.takeaway ? `<p class="takeaway">${esc(s.takeaway)}</p>` : (s.subtitle ? `<p class="sub">${esc(s.subtitle)}</p>` : '');
        return `<article class="card">
      <div class="meta"><span>#${idx + 1}</span><span>${esc(s.layout || 'bullets')}</span><span>${pace.slides[idx]?.seconds || 30}s</span></div>
      <h3>${esc(s.title || `Slide ${idx + 1}`)}</h3>
      ${summary}
      ${items || bullets ? `<ul>${items || bullets}</ul>` : ''}
      ${s.source ? `<div class="src">${esc(s.source)}</div>` : ''}
    </article>`;
    }).join('');
    return `<!doctype html>
<html lang="${en ? 'en' : 'zh-CN'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — ${en ? 'Executive One-Pager' : '高管一页纸'}</title>
<style>
  :root{--accent:${esc(primary)};--bg:${esc(bg)};--fg:${esc(fg)}}
  *{box-sizing:border-box}
  body{margin:0;padding:24px;background:var(--bg);color:var(--fg);font-family:system-ui,"Microsoft YaHei",sans-serif;line-height:1.5}
  .wrap{max-width:1120px;margin:0 auto}
  .wrap.mobile{max-width:440px}
  .wrap.mobile .grid{grid-template-columns:1fr}
  header{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;border-bottom:3px solid var(--accent);padding-bottom:12px;margin-bottom:16px;flex-wrap:wrap}
  h1{margin:0;font-size:24px}
  .badges{display:flex;gap:8px;flex-wrap:wrap;font-size:12px;color:#475569}
  .badge{padding:3px 10px;border-radius:999px;background:#fff;border:1px solid #cbd5e1}
  .toggle{padding:6px 12px;border-radius:8px;border:1px solid var(--accent);background:var(--accent);color:#fff;cursor:pointer;font-size:12px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
  .card{background:#fff;border:1px solid #e2e8f0;border-top:3px solid var(--accent);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:6px}
  .meta{display:flex;justify-content:space-between;font-size:11px;color:#64748b;text-transform:uppercase}
  h3{margin:0;font-size:15px}
  .sub,.takeaway{margin:0;font-size:12.5px;color:#334155}
  .takeaway{font-weight:600;color:var(--accent)}
  ul{margin:4px 0 0;padding-left:18px;font-size:12.5px}
  .src{margin-top:auto;font-size:11px;color:#64748b;border-top:1px dashed #e2e8f0;padding-top:4px}
  @media print{body{padding:0;background:#fff}.toggle{display:none}@page{size:A4 landscape;margin:10mm}}
</style>
</head>
<body>
<div id="onepager" class="wrap">
  <header>
    <div>
      <h1>${esc(title)}</h1>
      <div class="badges">
        <span class="badge">${slides.length} ${en ? 'slides' : '页'}</span>
        <span class="badge">${en ? 'Est. Pace' : '预计时长'}: ~${pace.estimatedMinutes} ${en ? 'min' : '分钟'}</span>
        ${pace.targetMinutes ? `<span class="badge">${en ? 'Target' : '目标'}: ${pace.targetMinutes} ${en ? 'min' : '分钟'}</span>` : ''}
      </div>
    </div>
    <button class="toggle" type="button" onclick="document.getElementById('onepager').classList.toggle('mobile')">${en ? 'Toggle Mobile Long-Card' : '切换长图战报'}</button>
  </header>
  <main class="grid">${cardsHtml}</main>
</div>
</body>
</html>`;
}
function parseKpiNumeric(raw) {
    const s = cleanStr(raw);
    const m = /^([^0-9+-]*)([+-]?\d[\d,]*(?:\.\d+)?)(.*)$/.exec(s);
    if (!m)
        return { numericValue: null, prefix: '', suffix: '', decimals: 0 };
    const cleanNum = m[2].replace(/,/g, '');
    const num = Number(cleanNum);
    if (!Number.isFinite(num))
        return { numericValue: null, prefix: '', suffix: '', decimals: 0 };
    const decMatch = /\.(\d+)/.exec(cleanNum);
    return {
        numericValue: num,
        prefix: m[1] || '',
        suffix: m[3] || '',
        decimals: decMatch ? decMatch[1].length : 0,
    };
}
function buildTimedCaptions(text, durationFrames, fps) {
    const cleaned = cleanStr(text);
    if (!cleaned)
        return [];
    const rawSegments = cleaned
        .split(/(?<=[。！？.!?；;])\s+|\n+/)
        .map(s => s.trim())
        .filter(Boolean);
    const segments = rawSegments.length > 0 ? rawSegments : [cleaned];
    const usableStart = Math.min(Math.round(fps * 0.25), Math.floor(durationFrames * 0.1));
    const usableEnd = Math.max(usableStart + 10, durationFrames - Math.round(fps * 0.25));
    const totalSpan = Math.max(1, usableEnd - usableStart);
    const weights = segments.map(s => Math.max(4, s.length));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let cursor = usableStart;
    return segments.map((seg, idx) => {
        const share = idx === segments.length - 1
            ? usableEnd - cursor
            : Math.max(12, Math.round((weights[idx] / totalWeight) * totalSpan));
        const startFrame = cursor;
        const endFrame = Math.min(usableEnd, cursor + share);
        cursor = endFrame;
        return { startFrame, endFrame: Math.max(startFrame + 1, endFrame), text: seg };
    });
}
const FORMAT_DIMENSIONS = {
    landscape: [1920, 1080],
    portrait: [1080, 1920],
    square: [1080, 1080],
};
export function buildRemotionBundleFiles(manifest, options = {}) {
    const fps = options.fps && [24, 30, 60].includes(options.fps) ? options.fps : 30;
    const format = options.format && Object.hasOwn(FORMAT_DIMENSIONS, options.format) ? options.format : 'landscape';
    const [width, height] = FORMAT_DIMENSIONS[format];
    const pace = options.paceBudget ?? computePaceBudgetFallback(manifest);
    const slides = Array.isArray(manifest?.slides) ? manifest.slides : [];
    const palette = options.themeTokens || {};
    const themeTokens = {
        themeId: String(manifest?.theme || 'consulting'),
        bg: manifest?.brand?.backgroundColor || palette.bg || '#FFFFFF',
        panel: palette.panel || '#F8FAFC',
        fg: manifest?.brand?.textColor || palette.fg || '#0F172A',
        muted: palette.muted || '#475569',
        accent: manifest?.brand?.primaryColor || palette.accent || '#0057B8',
        accent2: manifest?.brand?.secondaryColor || palette.accent2 || '#0E7490',
        headingFont: manifest?.brand?.headingFont || palette.headingFont || 'Microsoft YaHei, system-ui, sans-serif',
        bodyFont: manifest?.brand?.fontFamily || palette.bodyFont || 'Microsoft YaHei, system-ui, sans-serif',
    };
    let frameCursor = 0;
    const scenes = slides.map((slide, idx) => {
        const budgetSec = pace.slides[idx]?.seconds ?? (['cover', 'closing', 'section'].includes(slide?.layout) ? 12 : 24);
        const clampedSec = Math.max(3, Math.min(30, Math.round(budgetSec)));
        const durationInFrames = clampedSec * fps;
        const startFrame = frameCursor;
        frameCursor += durationInFrames;
        const items = (Array.isArray(slide?.items) ? slide.items : []).map((it) => {
            const kpiParsed = parseKpiNumeric(it?.value);
            return {
                tag: cleanStr(it?.tag),
                title: cleanStr(it?.title),
                text: cleanStr(it?.text),
                value: cleanStr(it?.value),
                unit: cleanStr(it?.unit),
                delta: cleanStr(it?.delta),
                status: cleanStr(it?.status),
                numericValue: kpiParsed.numericValue,
                prefix: kpiParsed.prefix,
                suffix: kpiParsed.suffix,
                decimals: kpiParsed.decimals,
                start: typeof it?.start === 'number' ? it.start : undefined,
                span: typeof it?.span === 'number' ? it.span : undefined,
                bullets: Array.isArray(it?.bullets) ? it.bullets.map((b) => cleanStr(b)).filter(Boolean) : [],
            };
        });
        const chartBars = Array.isArray(slide?.chart?.series?.[0]?.values)
            ? slide.chart.series[0].values.map((val, ci) => ({
                label: cleanStr(slide.chart.categories?.[ci] ?? `${ci + 1}`),
                value: Number(val) || 0,
            }))
            : [];
        const captionSource = cleanStr(slide?.notes) || cleanStr(slide?.takeaway) || cleanStr(slide?.subtitle) || cleanStr(slide?.title);
        const captions = buildTimedCaptions(captionSource, durationInFrames, fps);
        return {
            index: idx + 1,
            id: String(slide?.id || `slide-${idx + 1}`),
            layout: String(slide?.layout || 'bullets'),
            variant: cleanStr(slide?.variant),
            kicker: cleanStr(slide?.kicker),
            title: cleanStr(slide?.title) || `Slide ${idx + 1}`,
            subtitle: cleanStr(slide?.subtitle),
            takeaway: cleanStr(slide?.takeaway),
            source: cleanStr(slide?.source),
            formula: typeof slide?.formula === 'string' ? slide.formula.trim() : '',
            mermaid: typeof slide?.mermaid === 'string' ? slide.mermaid.trim() : '',
            bullets: Array.isArray(slide?.bullets) ? slide.bullets.map((b) => cleanStr(b)).filter(Boolean) : [],
            items,
            rows: Array.isArray(slide?.rows) ? slide.rows.slice(0, 8) : [],
            chartBars,
            notes: cleanStr(slide?.notes),
            startFrame,
            durationInFrames,
            durationSeconds: clampedSec,
            captions,
        };
    });
    const totalFrames = Math.max(fps * 3, frameCursor);
    const totalSeconds = Math.round((totalFrames / fps) * 10) / 10;
    const deckTitle = cleanStr(manifest?.title) || 'Presentation Video';
    const slidesData = {
        schemaVersion: 1,
        generator: 'dsh-ppt',
        title: deckTitle,
        language: String(manifest?.language || 'zh'),
        fps,
        width,
        height,
        totalFrames,
        totalSeconds,
        themeTokens,
        slides: scenes,
    };
    const storyboard = {
        schemaVersion: 1,
        generator: 'dsh-ppt',
        targetEngine: 'dsh-remotion',
        compositionId: 'DeckVideo',
        title: deckTitle,
        fps,
        width,
        height,
        totalFrames,
        totalSeconds,
        themeTokens,
        paceBudget: {
            estimatedMinutes: pace.estimatedMinutes,
            targetMinutes: pace.targetMinutes,
            overBudget: pace.overBudget,
        },
        scenes: scenes.map(sc => ({
            index: sc.index,
            id: sc.id,
            layout: sc.layout,
            title: sc.title,
            startFrame: sc.startFrame,
            durationInFrames: sc.durationInFrames,
            durationSeconds: sc.durationSeconds,
            animations: [
                'spring-title-entrance',
                ...(sc.layout === 'kpi' ? ['kpi-numeric-countup'] : []),
                ...(sc.chartBars.length || ['sankey', 'marimekko', 'gantt', 'process'].includes(sc.layout) ? ['progressive-bar-flow'] : []),
                ...(sc.captions.length ? ['synced-subtitle-captions'] : []),
            ],
            captions: sc.captions,
        })),
    };
    const deckVideoTsx = `import React from 'react';
import { AbsoluteFill, Sequence, spring, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import slidesData from './slides-data.json';

type SlideScene = (typeof slidesData.slides)[number];

const TOKENS = slidesData.themeTokens;

const SlideView: React.FC<{ scene: SlideScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleEnter = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 120, mass: 0.8 },
  });
  const fadeOut = interpolate(
    frame,
    [Math.max(1, scene.durationInFrames - 10), scene.durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const progressGrowth = interpolate(frame, [8, 36], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const activeCaption = scene.captions.find(
    (c) => frame >= c.startFrame && frame <= c.endFrame,
  )?.text || scene.captions[0]?.text || '';

  const maxBar = Math.max(1, ...scene.chartBars.map((b) => Math.abs(b.value)));
  const isFraming = scene.layout === 'cover' || scene.layout === 'closing' || scene.layout === 'section';

  return (
    <AbsoluteFill
      style={{
        backgroundColor: isFraming ? TOKENS.accent : TOKENS.bg,
        color: isFraming ? '#FFFFFF' : TOKENS.fg,
        fontFamily: TOKENS.bodyFont,
        padding: '64px 88px 110px',
        opacity: fadeOut,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: isFraming ? 'center' : 'flex-start',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 12,
          backgroundColor: isFraming ? TOKENS.accent2 : TOKENS.accent,
        }}
      />

      {scene.kicker ? (
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: isFraming ? 'rgba(255,255,255,0.85)' : TOKENS.accent,
            marginBottom: 14,
            opacity: titleEnter,
          }}
        >
          {scene.kicker}
        </div>
      ) : null}

      <h1
        style={{
          margin: 0,
          fontFamily: TOKENS.headingFont,
          fontSize: isFraming ? 68 : 48,
          lineHeight: 1.18,
          transform: \`translateY(\${(1 - titleEnter) * 28}px)\`,
          opacity: titleEnter,
        }}
      >
        {scene.title}
      </h1>

      {scene.subtitle ? (
        <p
          style={{
            marginTop: 14,
            fontSize: isFraming ? 30 : 24,
            color: isFraming ? 'rgba(255,255,255,0.9)' : TOKENS.muted,
            opacity: titleEnter,
          }}
        >
          {scene.subtitle}
        </p>
      ) : null}

      {scene.items.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: \`repeat(\${Math.min(3, Math.max(1, scene.items.length))}, minmax(0, 1fr))\`,
            gap: 24,
            marginTop: 32,
          }}
        >
          {scene.items.slice(0, 6).map((item, idx) => {
            const cardSpring = spring({
              frame: Math.max(0, frame - idx * 4),
              fps,
              config: { damping: 14, stiffness: 110 },
            });
            const animatedValue =
              item.numericValue !== null
                ? (() => {
                    const v = interpolate(frame, [6 + idx * 3, 36 + idx * 3], [0, item.numericValue], {
                      extrapolateLeft: 'clamp',
                      extrapolateRight: 'clamp',
                    });
                    return \`\${item.prefix}\${v.toFixed(item.decimals)}\${item.suffix}\`;
                  })()
                : item.value;

            return (
              <div
                key={idx}
                style={{
                  backgroundColor: isFraming ? 'rgba(255,255,255,0.12)' : TOKENS.panel,
                  border: \`1px solid \${TOKENS.muted}33\`,
                  borderTop: \`5px solid \${TOKENS.accent}\`,
                  borderRadius: 12,
                  padding: '24px 26px',
                  transform: \`translateY(\${(1 - cardSpring) * 24}px)\`,
                  opacity: cardSpring,
                }}
              >
                {item.tag ? (
                  <div style={{ fontSize: 18, fontWeight: 700, color: TOKENS.accent, marginBottom: 6 }}>
                    {item.tag}
                  </div>
                ) : null}
                {animatedValue ? (
                  <div style={{ fontSize: 54, fontWeight: 800, color: TOKENS.accent, lineHeight: 1.1 }}>
                    {animatedValue}
                    {item.unit ? <span style={{ fontSize: 24, marginLeft: 4 }}>{item.unit}</span> : null}
                  </div>
                ) : null}
                {item.title ? <div style={{ fontSize: 26, fontWeight: 700, marginTop: 8 }}>{item.title}</div> : null}
                {item.text ? (
                  <div style={{ fontSize: 20, color: isFraming ? 'rgba(255,255,255,0.86)' : TOKENS.muted, marginTop: 8 }}>
                    {item.text}
                  </div>
                ) : null}
                {item.span !== undefined ? (
                  <div style={{ marginTop: 14, height: 12, borderRadius: 99, backgroundColor: \`\${TOKENS.muted}26\`, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: \`\${Math.min(100, Math.max(15, item.span * 25)) * progressGrowth}%\`,
                        backgroundColor: TOKENS.accent2,
                        borderRadius: 99,
                      }}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {scene.chartBars.length > 0 ? (
        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {scene.chartBars.slice(0, 6).map((bar, bi) => (
            <div key={bi} style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ width: 220, fontSize: 22, fontWeight: 600 }}>{bar.label}</div>
              <div style={{ flex: 1, height: 28, backgroundColor: \`\${TOKENS.muted}22\`, borderRadius: 8, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: \`\${(Math.abs(bar.value) / maxBar) * 100 * progressGrowth}%\`,
                    backgroundColor: bi === 0 ? TOKENS.accent : TOKENS.accent2,
                  }}
                />
              </div>
              <div style={{ width: 120, fontSize: 22, fontWeight: 700, textAlign: 'right' }}>{bar.value}</div>
            </div>
          ))}
        </div>
      ) : null}

      {scene.bullets.length > 0 && scene.items.length === 0 ? (
        <ul style={{ marginTop: 28, paddingLeft: 32, fontSize: 28, lineHeight: 1.65 }}>
          {scene.bullets.slice(0, 6).map((b, bi) => {
            const bulletOpacity = interpolate(frame, [6 + bi * 5, 18 + bi * 5], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              <li key={bi} style={{ marginBottom: 12, opacity: bulletOpacity }}>
                {b}
              </li>
            );
          })}
        </ul>
      ) : null}

      {scene.takeaway ? (
        <div
          style={{
            marginTop: 'auto',
            padding: '16px 22px',
            borderRadius: 10,
            backgroundColor: isFraming ? 'rgba(255,255,255,0.14)' : \`\${TOKENS.accent}14\`,
            borderLeft: \`6px solid \${TOKENS.accent}\`,
            fontSize: 24,
            fontWeight: 600,
          }}
        >
          {scene.takeaway}
        </div>
      ) : null}

      {activeCaption ? (
        <div
          style={{
            position: 'absolute',
            left: 88,
            right: 88,
            bottom: 28,
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              padding: '10px 24px',
              borderRadius: 999,
              backgroundColor: 'rgba(15, 23, 42, 0.84)',
              color: '#F8FAFC',
              fontSize: 24,
              lineHeight: 1.4,
            }}
          >
            {activeCaption}
          </span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const DeckVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: TOKENS.bg }}>
      {slidesData.slides.map((scene) => (
        <Sequence
          key={scene.id}
          from={scene.startFrame}
          durationInFrames={scene.durationInFrames}
          name={\`Slide-\${scene.index}\`}
        >
          <SlideView scene={scene} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
`;
    const indexTs = `import React from 'react';
import { registerRoot, Composition } from 'remotion';
import { DeckVideo } from './DeckVideo';
import slidesData from './slides-data.json';

const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="DeckVideo"
      component={DeckVideo}
      durationInFrames={slidesData.totalFrames}
      fps={slidesData.fps}
      width={slidesData.width}
      height={slidesData.height}
    />
  );
};

registerRoot(RemotionRoot);
`;
    const pkgJson = JSON.stringify({
        name: 'dsh-ppt-remotion-video',
        private: true,
        version: '1.0.0',
        scripts: {
            preview: 'remotion studio src/index.ts --no-open',
            render: 'remotion render src/index.ts DeckVideo out/deck-video.mp4 --concurrency 1 --codec h264',
        },
        dependencies: {
            '@remotion/cli': REMOTION_VERSION,
            remotion: REMOTION_VERSION,
            react: '18.3.1',
            'react-dom': '18.3.1',
        },
        devDependencies: {
            '@types/react': '18.3.12',
            typescript: '5.6.3',
        },
    }, null, 2);
    const sceneTable = scenes
        .map(sc => `| ${sc.index} | ${sc.layout} | ${sc.title.replace(/\|/g, '\\|')} | ${sc.startFrame} | ${sc.durationInFrames} (${sc.durationSeconds}s) |`)
        .join('\n');
    const readme = `# ${deckTitle} — Remotion Storyboard Bundle

Generated by **dsh-ppt** for **dsh-remotion** / Remotion ${REMOTION_VERSION}.

- **Canvas**: \`${width}x${height}\` @ \`${fps} fps\`
- **Total Duration**: \`${totalSeconds}s\` (\`${totalFrames}\` frames across ${scenes.length} slides)
- **Theme**: \`${themeTokens.themeId}\` (\`accent: ${themeTokens.accent}\`, \`bg: ${themeTokens.bg}\`)

## Quick Start

\`\`\`bash
npm install
npm run preview
npm run render
\`\`\`

## Storyboard Timeline

| # | Layout | Title | Start Frame | Duration |
| --- | --- | --- | --- | --- |
${sceneTable}
`;
    return {
        files: {
            'remotion-storyboard.json': JSON.stringify(storyboard, null, 2),
            'src/slides-data.json': JSON.stringify(slidesData, null, 2),
            'src/DeckVideo.tsx': deckVideoTsx,
            'src/index.ts': indexTs,
            'package.json': pkgJson,
            'README.md': readme,
        },
        storyboard,
        fps,
        totalFrames,
        totalSeconds,
    };
}
export async function exportRemotionBundle(options) {
    options.signal?.throwIfAborted();
    const cwd = options.cwd ?? process.cwd();
    const deckPath = resolve(cwd, options.deckPath);
    const { manifest } = readManifestFromDeck(deckPath, options.engine);
    const resolvedTheme = typeof options.engine.resolveTheme === 'function'
        ? options.engine.resolveTheme(manifest.theme)
        : undefined;
    const palette = (resolvedTheme?.palette ?? {});
    const paceBudget = typeof options.engine.computePaceBudget === 'function'
        ? options.engine.computePaceBudget(manifest, manifest.targetMinutes)
        : computePaceBudgetFallback(manifest);
    const bundle = buildRemotionBundleFiles(manifest, {
        fps: options.fps,
        format: options.format,
        themeTokens: palette,
        paceBudget,
    });
    const baseName = basename(deckPath, '.json') + '-remotion';
    let outDir = options.outputDir?.trim()
        ? resolve(cwd, options.outputDir.trim())
        : join(dirname(deckPath), baseName);
    if (!options.overwrite && existsSync(outDir)) {
        let n = 2;
        while (existsSync(`${outDir}-${n}`))
            n++;
        outDir = `${outDir}-${n}`;
    }
    mkdirSync(join(outDir, 'src'), { recursive: true });
    const writtenFiles = [];
    for (const [relPath, content] of Object.entries(bundle.files)) {
        const abs = join(outDir, relPath);
        mkdirSync(dirname(abs), { recursive: true });
        writeFileSync(abs, content, 'utf8');
        writtenFiles.push(abs);
    }
    return {
        ok: true,
        outputDir: outDir,
        storyboardPath: join(outDir, 'remotion-storyboard.json'),
        files: writtenFiles,
        fps: bundle.fps,
        totalFrames: bundle.totalFrames,
        totalSeconds: bundle.totalSeconds,
        slideCount: Array.isArray(manifest.slides) ? manifest.slides.length : 0,
    };
}
