/**
 * scripts/optimize-images.js
 * 이미지 WebP 변환 + SEO 파일명 최적화
 *
 * 실행:
 *   node scripts/optimize-images.js              → 전체 변환 (이미 WebP인 것 건너뜀)
 *   node scripts/optimize-images.js --dry-run    → 변경 없이 미리보기
 *   node scripts/optimize-images.js --force      → 이미 변환된 것도 재변환
 *   node scripts/optimize-images.js --dir public/images/washed → 특정 폴더만
 *   node scripts/optimize-images.js --quality 85 → WebP 품질 지정 (기본 82)
 *
 * 준비:
 *   npm install sharp --save-dev
 */

import { readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, extname, basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = resolve(__dir, '..');
const args  = process.argv.slice(2);

const DRY     = args.includes('--dry-run');
const FORCE   = args.includes('--force');
const QUALITY = parseInt(args[args.indexOf('--quality') + 1] || '82', 10) || 82;

// --dir 옵션: 특정 디렉토리만 처리
const dirArg = args[args.indexOf('--dir') + 1];
const DIRS   = dirArg
  ? [resolve(ROOT, dirArg)]
  : [
      resolve(ROOT, 'public/images/washed'),
      resolve(ROOT, 'public/images/gallery/washed'),
      resolve(ROOT, 'public/images/reviews'),
      resolve(ROOT, 'public/images/thumbs'),
    ];

// ── 한국어 → 로마자 매핑 (지역명) ───────────────────────────────────────────
const REGION_MAP = {
  // 서울 구
  '서울특별시': 'seoul', '서울': 'seoul',
  '강남구': 'gangnam', '강남': 'gangnam',
  '강북구': 'gangbuk', '강북': 'gangbuk',
  '강서구': 'gangseo', '강서': 'gangseo',
  '강동구': 'gangdong', '강동': 'gangdong',
  '송파구': 'songpa',  '송파': 'songpa',
  '마포구': 'mapo',    '마포': 'mapo',
  '서초구': 'seocho',  '서초': 'seocho',
  '관악구': 'gwanak',  '관악': 'gwanak',
  '동작구': 'dongjak', '동작': 'dongjak',
  '노원구': 'nowon',   '노원': 'nowon',
  '은평구': 'eunpyeong','은평': 'eunpyeong',
  '성북구': 'seongbuk','성북': 'seongbuk',
  '동대문구': 'dongdaemun','동대문': 'dongdaemun',
  '중랑구': 'jungnang','중랑': 'jungnang',
  '도봉구': 'dobong',  '도봉': 'dobong',
  '양천구': 'yangcheon','양천': 'yangcheon',
  '구로구': 'guro',    '구로': 'guro',
  '금천구': 'geumcheon','금천': 'geumcheon',
  '영등포구': 'yeongdeungpo','영등포': 'yeongdeungpo',
  '광진구': 'gwangjin','광진': 'gwangjin',
  '성동구': 'seongdong','성동': 'seongdong',
  '용산구': 'yongsan', '용산': 'yongsan',
  '중구': 'junggu',
  '종로구': 'jongno',  '종로': 'jongno',
  // 서울 주요 동
  '역삼': 'yeoksam',  '논현': 'nonhyeon', '신사': 'sinsa',
  '압구정': 'apgujeong','삼성': 'samseong','대치': 'daechi',
  '개포': 'gaepo',    '도곡': 'dogok',    '청담': 'cheongdam',
  '잠실': 'jamsil',   '방이': 'bangi',    '석촌': 'seokchon',
  '합정': 'hapjeong', '망원': 'mangwon',  '상암': 'sangam',
  '여의도': 'yeouido','영등포': 'yeongdeungpo',
  // 경기
  '경기도': 'gyeonggi',
  '광명시': 'gwangmyeong', '광명': 'gwangmyeong',
  '부천시': 'bucheon',     '부천': 'bucheon',
  '군포시': 'gunpo',       '군포': 'gunpo',
  '안양시': 'anyang',      '안양': 'anyang',
  '수원시': 'suwon',       '수원': 'suwon',
  '성남시': 'seongnam',    '성남': 'seongnam',
  '용인시': 'yongin',      '용인': 'yongin',
  '고양시': 'goyang',      '고양': 'goyang',
  '안산시': 'ansan',       '안산': 'ansan',
  '화성시': 'hwaseong',    '화성': 'hwaseong',
  '평택시': 'pyeongtaek',  '평택': 'pyeongtaek',
  '의정부시': 'uijeongbu', '의정부': 'uijeongbu',
  '파주시': 'paju',        '파주': 'paju',
  '하남시': 'hanam',       '하남': 'hanam',
  '남양주시': 'namyangju', '남양주': 'namyangju',
  '구리시': 'guri',        '구리': 'guri',
  '의왕시': 'uiwang',      '의왕': 'uiwang',
  '시흥시': 'siheung',     '시흥': 'siheung',
  '오산시': 'osan',        '오산': 'osan',
  '김포시': 'gimpo',       '김포': 'gimpo',
  '광주시': 'gwangju-g',   '광주': 'gwangju-g',
  // 경기 주요 동/읍
  '철산': 'cheolsan', '하안': 'haan',     '소하': 'soha',
  '금정': 'geumjeong','산본': 'sanbon',   '당정': 'dangjung',
  '중동': 'jungdong', '상동': 'sangdong', '역곡': 'yeokgok',
  '만안': 'manan',    '동안': 'dongan',   '평촌': 'pyeongchon',
};

// ── 배관 키워드 → 영문 매핑 ──────────────────────────────────────────────────
const KEYWORD_MAP = {
  '하수구막힘': 'drain-clog',   '싱크대막힘': 'sink-clog',
  '변기막힘':   'toilet-clog',  '배관막힘':   'pipe-clog',
  '우수관막힘': 'rainpipe-clog','배수구막힘': 'drain-clog',
  '하수구역류': 'drain-backflow','싱크대역류': 'sink-backflow',
  '변기역류':   'toilet-backflow',
  '하수구':     'drain',        '싱크대':    'sink',
  '변기':       'toilet',       '배관':      'pipe',
  '우수관':     'rainpipe',     '배수구':    'drain',
  '고압세척':   'pressure-wash','고압':      'highp',
  '내시경':     'camera',       '누수':      'leak',
  '뚫음':       'unclog',       '뚫기':      'unclog',
  '막힘':       'clog',         '해결':      'fix',
  '업체':       'service',      '출장':      'callout',
  '아파트':     'apt',          '수리':      'repair',
  '전문':       'pro',          '신속':      'fast',
  '24시':       '24h',          '전지역':    'all-area',
  '혈관':       'pipe',         '세척':      'wash',
  '작업':       'work',         '완료':      'done',
};

// ── SEO 파일명 생성 ──────────────────────────────────────────────────────────
function generateSeoName(originalName, index, existingNames) {
  // 확장자 제거
  let name = originalName.replace(/\.(jpe?g|png|gif|bmp|tiff?)$/i, '');

  // pool_ 접두사, 중복 suffix (_xxx_w), 괄호 숫자 제거
  name = name.replace(/^pool_/i, '');
  name = name.replace(/_[^_]+_w$/i, '');
  name = name.replace(/\s*\(\d+\)\s*$/, '');
  name = name.replace(/\s*\(\d+\)_.*$/, '');

  // 지역명 치환 (긴 것 먼저)
  const sortedRegion = Object.entries(REGION_MAP)
    .sort((a, b) => b[0].length - a[0].length);
  for (const [ko, en] of sortedRegion) {
    name = name.split(ko).join(en);
  }

  // 배관 키워드 치환 (긴 것 먼저)
  const sortedKeyword = Object.entries(KEYWORD_MAP)
    .sort((a, b) => b[0].length - a[0].length);
  for (const [ko, en] of sortedKeyword) {
    name = name.split(ko).join(en);
  }

  // 남은 한글 제거, 특수문자 → 하이픈
  name = name
    .replace(/[가-힣ㄱ-ㅎㅏ-ㅣ]/g, '')
    .replace(/[^a-zA-Z0-9\-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 70);

  if (!name || name.length < 3) {
    name = `pipe-service-${String(index).padStart(3, '0')}`;
  }

  // 중복 방지: 같은 이름이 있으면 -01, -02... 붙이기
  let candidate = `${name}.webp`;
  let suffix = 1;
  while (existingNames.has(candidate)) {
    candidate = `${name}-${String(suffix).padStart(2, '0')}.webp`;
    suffix++;
  }
  existingNames.add(candidate);
  return candidate;
}

// ── 디렉토리 처리 ────────────────────────────────────────────────────────────
async function processDirectory(dir, sharp) {
  if (!existsSync(dir)) {
    console.log(`  ⏭  건너뜀 (없는 폴더): ${dir.replace(ROOT, '').replace(/^[/\\]/, '')}`);
    return { converted: 0, skipped: 0, errors: 0 };
  }

  const EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff']);
  const files = readdirSync(dir).filter(f => EXTS.has(extname(f).toLowerCase()));

  if (files.length === 0) {
    console.log(`  ⏭  이미지 없음`);
    return { converted: 0, skipped: 0, errors: 0 };
  }

  console.log(`  📸 ${files.length}개 이미지 발견`);
  let converted = 0, skipped = 0, errors = 0;
  const usedNames = new Set(
    readdirSync(dir).filter(f => extname(f).toLowerCase() === '.webp')
  );

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const inputPath = join(dir, file);
    const outputName = generateSeoName(file, i, usedNames);
    const outputPath = join(dir, outputName);

    if (!FORCE && existsSync(outputPath)) {
      console.log(`  ⏭  이미 존재: ${outputName}`);
      skipped++;
      continue;
    }

    const inputStat = statSync(inputPath);
    const inputKB   = Math.round(inputStat.size / 1024);

    if (DRY) {
      console.log(`  📋 [DRY] ${file} (${inputKB}KB) → ${outputName}`);
      converted++;
      continue;
    }

    try {
      const info = await sharp(inputPath)
        .webp({ quality: QUALITY, effort: 4 })
        .toFile(outputPath);
      const outputKB = Math.round(info.size / 1024);
      const pct = Math.round((1 - info.size / inputStat.size) * 100);
      console.log(`  ✅ ${file} (${inputKB}KB) → ${outputName} (${outputKB}KB, -${pct}%)`);
      converted++;
    } catch (err) {
      console.error(`  ❌ 오류: ${file} — ${err.message}`);
      errors++;
    }
  }

  return { converted, skipped, errors };
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error('\n❌ sharp 패키지가 없습니다. 먼저 실행하세요:');
  console.error('   npm install sharp --save-dev\n');
  process.exit(1);
}

console.log('\n══════════════════════════════════════════════════════');
console.log(' 이미지 WebP 변환 & SEO 파일명 최적화');
console.log(` 품질: ${QUALITY}  ${DRY ? '[DRY-RUN]' : ''}  ${FORCE ? '[FORCE]' : ''}`);
console.log('══════════════════════════════════════════════════════\n');

let total = { converted: 0, skipped: 0, errors: 0 };

for (const dir of DIRS) {
  const rel = dir.replace(ROOT, '').replace(/^[/\\]/, '');
  console.log(`\n📁 ${rel}`);
  const result = await processDirectory(dir, sharp);
  total.converted += result.converted;
  total.skipped   += result.skipped;
  total.errors    += result.errors;
}

console.log('\n══════════════════════════════════════════════════════');
console.log(` 완료 — 변환: ${total.converted}장  건너뜀: ${total.skipped}장  오류: ${total.errors}장`);
if (DRY) {
  console.log('\n 실제 변환하려면:');
  console.log('   node scripts/optimize-images.js');
}
console.log('\n 변환 후 원본 JPG는 필요 없으면 직접 삭제하세요.');
console.log('══════════════════════════════════════════════════════\n');
