<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { searchItems, createQuote } from '../api';
import { useDraftStore } from '../stores/draft';
import { formatWon } from '../utils/format';

const router = useRouter();
const draft = useDraftStore();

const query = ref('');
const results = ref(null); // null: 아직 검색 전, []: 결과 없음
const qtys = ref({}); // 검색 결과별 수량 입력값 { itemNo: qty }
const searchError = ref('');
const searching = ref(false);

const createError = ref('');
const creating = ref(false);

const canCreate = computed(() => draft.quoteNo.trim() !== '' && draft.lines.length > 0);

// 입력할 때마다(잠깐 멈추면) 자동으로 검색해서 미리보기 목록을 보여준다.
const DEBOUNCE_MS = 200;
let timer = null;
let requestSeq = 0; // 늦게 도착한 이전 응답이 최신 결과를 덮어쓰지 않도록 요청 번호로 구분한다.

async function search() {
  clearTimeout(timer);
  const seq = (requestSeq += 1);
  const q = query.value.trim();
  searchError.value = '';
  if (!/[0-9A-Za-z가-힣]/.test(q)) {
    results.value = null;
    searching.value = false;
    return;
  }
  searching.value = true;
  try {
    const found = await searchItems(q);
    if (seq !== requestSeq) return;
    results.value = found;
    // 이미 입력한 수량은 유지하고, 새로 나온 품목만 1 로 초기화한다.
    qtys.value = Object.fromEntries(found.map((i) => [i.itemNo, qtys.value[i.itemNo] ?? 1]));
  } catch (e) {
    if (seq === requestSeq) searchError.value = e.message;
  } finally {
    if (seq === requestSeq) searching.value = false;
  }
}

watch(query, () => {
  clearTimeout(timer);
  timer = setTimeout(search, DEBOUNCE_MS);
});
onBeforeUnmount(() => clearTimeout(timer));

function addToDraft(item) {
  const n = Number(qtys.value[item.itemNo]);
  if (!Number.isInteger(n) || n < 1) {
    searchError.value = '수량은 1 이상의 정수여야 합니다.';
    return;
  }
  searchError.value = '';
  draft.add(item, n);
}

function setQty(line, value) {
  const n = Math.floor(Number(value));
  line.qty = Number.isFinite(n) && n >= 1 ? n : 1;
}

async function create() {
  createError.value = '';
  creating.value = true;
  try {
    const quote = await createQuote({
      quoteNo: draft.quoteNo.trim(),
      recipient: draft.recipient.trim(),
      title: draft.title.trim(),
      lines: draft.lines.map((l) => ({ itemNo: l.itemNo, qty: l.qty })),
    });
    draft.clear();
    router.push(`/quotes/${quote.id}`);
  } catch (e) {
    createError.value = e.message;
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <section class="card">
    <h2>1. 견적 정보</h2>
    <div class="form-grid">
      <label>
        <span class="muted">견적번호 <b class="required">*</b></span>
        <input v-model="draft.quoteNo" maxlength="30" placeholder="예: 서충청513-1045" required />
      </label>
      <label>
        <span class="muted">귀중(현장명)</span>
        <input v-model="draft.recipient" maxlength="30" placeholder="수신처 (30자 이내)" />
        <span class="muted hint">{{ draft.recipient.length }}/30</span>
      </label>
      <label>
        <span class="muted">견적명</span>
        <input v-model="draft.title" placeholder="견적명을 입력하세요" />
      </label>
    </div>
  </section>

  <section class="card">
    <h2>2. 품목 조회</h2>
    <form class="row" @submit.prevent="search">
      <input v-model="query" placeholder="아이템 넘버 (일부만 입력해도 자동 검색)" class="grow" autofocus />
      <button type="submit" :disabled="searching">조회</button>
    </form>
    <p v-if="searchError" class="error">{{ searchError }}</p>

    <p v-if="results && !results.length" class="empty">검색 결과가 없습니다.</p>
    <table v-if="results && results.length" class="stack" style="margin-top: 16px">
      <thead>
        <tr>
          <th>아이템 넘버</th><th>품목명</th><th>규격명</th><th class="num">가격</th><th class="num">수량</th><th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in results" :key="item.itemNo">
          <td data-label="아이템 넘버">{{ item.itemNo }}</td>
          <td data-label="품목명">{{ item.name }}</td>
          <td data-label="규격명">{{ item.spec }}</td>
          <td class="num" data-label="가격">{{ formatWon(item.price) }}</td>
          <td class="num" data-label="수량">
            <input
              v-model.number="qtys[item.itemNo]" type="number" min="1" step="1" style="width: 80px"
              @keyup.enter="addToDraft(item)"
            />
          </td>
          <td class="num"><button @click="addToDraft(item)">추가</button></td>
        </tr>
      </tbody>
    </table>
  </section>

  <section class="card">
    <h2>3. 견적 품목</h2>
    <p v-if="!draft.lines.length" class="empty">추가된 품목이 없습니다.</p>
    <template v-else>
      <table class="stack">
        <thead>
          <tr>
            <th>아이템 넘버</th><th>품목명</th><th>규격명</th>
            <th class="num">단가</th><th class="num">수량</th><th class="num">금액</th><th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in draft.lines" :key="l.itemNo">
            <td data-label="아이템 넘버">{{ l.itemNo }}</td>
            <td data-label="품목명">{{ l.name }}</td>
            <td data-label="규격명">{{ l.spec }}</td>
            <td class="num" data-label="단가">{{ formatWon(l.price) }}</td>
            <td class="num" data-label="수량">
              <input
                :value="l.qty" type="number" min="1" step="1" style="width: 80px"
                @change="setQty(l, $event.target.value)"
              />
            </td>
            <td class="num" data-label="금액">{{ formatWon(l.price * l.qty) }}</td>
            <td class="num"><button class="link" @click="draft.remove(l.itemNo)">삭제</button></td>
          </tr>
        </tbody>
      </table>

      <div class="totals">
        <div><span class="muted">공급가액</span><span>{{ formatWon(draft.supplyTotal) }}</span></div>
        <div><span class="muted">부가세 (10%)</span><span>{{ formatWon(draft.vat) }}</span></div>
        <div class="grand"><span>합계</span><span>{{ formatWon(draft.grandTotal) }}</span></div>
      </div>

      <div class="row" style="justify-content: flex-end; margin-top: 16px">
        <span v-if="!draft.quoteNo.trim()" class="error" style="margin: 0">견적번호를 입력하세요.</span>
        <button class="secondary" @click="draft.clear()">전체 삭제</button>
        <button :disabled="creating || !canCreate" @click="create">견적서 생성</button>
      </div>
      <p v-if="createError" class="error">{{ createError }}</p>
    </template>
  </section>
</template>
