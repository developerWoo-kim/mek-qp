import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildQuoteXlsx } from './excelService.js';

const run = promisify(execFile);

// 템플릿 글꼴(맑은 고딕 등)이 서버에 없을 때 모든 글꼴을 이 글꼴로 강제 교체하고 싶으면 PDF_FONT 를 지정한다.
// 지정하지 않으면 LibreOffice 의 글꼴 대체 기능에 맡긴다. (한글은 시스템 한글 글꼴로 대체됨)
const PDF_FONT = process.env.PDF_FONT;

// macOS 의 LibreOffice 는 시스템 글꼴을 찾지 못하는 경우가 있어 fontconfig 설정으로 글꼴 폴더를 직접 알려준다.
// 글꼴 캐시를 재사용하도록 설정 파일과 캐시 폴더는 요청마다 만들지 않고 한 번만 만든다.
const FONT_DIRS = (process.env.PDF_FONT_DIRS ?? '/System/Library/Fonts:/System/Library/Fonts/Supplemental:/Library/Fonts').split(':');
let fontConfPromise;
function ensureFontConf() {
  if (process.platform !== 'darwin') return Promise.resolve(null);
  fontConfPromise ??= (async () => {
    const base = path.join(os.tmpdir(), 'mek-qp-fonts');
    await fs.mkdir(base, { recursive: true });
    const conf = path.join(base, 'fonts.conf');
    const dirs = FONT_DIRS.map((d) => `  <dir>${d}</dir>`).join('\n');
    await fs.writeFile(
      conf,
      `<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n<fontconfig>\n${dirs}\n  <cachedir>${path.join(base, 'cache')}</cachedir>\n</fontconfig>\n`,
    );
    return conf;
  })();
  return fontConfPromise;
}

const MAC_DEFAULT = '/Applications/LibreOffice.app/Contents/MacOS/soffice';

async function findSoffice() {
  if (process.env.SOFFICE_PATH) return process.env.SOFFICE_PATH;
  try {
    await fs.access(MAC_DEFAULT);
    return MAC_DEFAULT;
  } catch {
    return 'soffice';
  }
}

// 엑셀 견적서를 LibreOffice(headless)로 PDF 변환한다.
export async function buildQuotePdf(quote) {
  const soffice = await findSoffice();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mek-qp-'));
  try {
    const xlsxPath = path.join(dir, 'quote.xlsx');
    await fs.writeFile(xlsxPath, await buildQuoteXlsx(quote, { fontName: PDF_FONT }));
    // 동시 변환 시 프로필 잠금이 충돌하지 않도록 요청마다 별도 프로필을 쓴다.
    const profile = `file://${path.join(dir, 'profile')}`;
    const fontConf = await ensureFontConf();
    await run(
      soffice,
      [`-env:UserInstallation=${profile}`, '--headless', '--convert-to', 'pdf', '--outdir', dir, xlsxPath],
      { timeout: 60_000, env: fontConf ? { ...process.env, FONTCONFIG_FILE: fontConf } : process.env },
    );
    return await fs.readFile(path.join(dir, 'quote.pdf'));
  } catch (e) {
    if (e.code === 'ENOENT') {
      const err = new Error('LibreOffice(soffice)를 찾을 수 없습니다. 설치하거나 SOFFICE_PATH 환경변수를 지정하세요.');
      err.status = 500;
      throw err;
    }
    throw e;
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
