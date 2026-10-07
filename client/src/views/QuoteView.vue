<script setup>
import { ref, onMounted } from 'vue';
import { getQuote, downloadUrl } from '../api';
import { formatWon, formatDate } from '../utils/format';

const props = defineProps({ id: String });

const quote = ref(null);
const error = ref('');

onMounted(async () => {
  try {
    quote.value = await getQuote(props.id);
  } catch (e) {
    error.value = e.message;
  }
});

</script>

<template>
  <p v-if="error" class="error">{{ error }}</p>
  <p v-else-if="!quote" class="muted">불러오는 중...</p>

  <section v-else class="card">
    <div class="row" style="justify-content: space-between; margin-bottom: 14px">
      <div>
        <h2 style="margin: 0">{{ quote.title || '(견적명 없음)' }}</h2>
        <div class="muted">견적번호 {{ quote.quoteNo }} · 발행일 {{ formatDate(quote.createdAt) }}</div>
        <div v-if="quote.recipient" style="margin-top: 6px">
          <strong>{{ quote.recipient }}</strong> 貴中
        </div>
      </div>
      <div class="row">
        <a class="btn secondary" :href="downloadUrl(quote.id, 'xlsx')">엑셀 다운로드</a>
        <a class="btn secondary" :href="downloadUrl(quote.id, 'pdf')">PDF 다운로드</a>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>No</th><th>품목명</th><th>규격명</th>
          <th class="num">수량</th><th class="num">단가</th><th class="num">금액</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="l in quote.lines" :key="l.no">
          <td>{{ l.no }}</td>
          <td>{{ l.name }}</td>
          <td>{{ l.spec }}</td>
          <td class="num">{{ l.qty }}</td>
          <td class="num">{{ formatWon(l.unitPrice) }}</td>
          <td class="num">{{ formatWon(l.amount) }}</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div><span class="muted">공급가액</span><span>{{ formatWon(quote.supplyTotal) }}</span></div>
      <div><span class="muted">부가세 (10%)</span><span>{{ formatWon(quote.vat) }}</span></div>
      <div class="grand"><span>합계</span><span>{{ formatWon(quote.grandTotal) }}</span></div>
    </div>

    <div class="row" style="margin-top: 16px">
      <RouterLink to="/">새 견적서 작성</RouterLink>
    </div>
  </section>
</template>
