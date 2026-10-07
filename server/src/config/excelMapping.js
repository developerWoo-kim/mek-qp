// 엑셀 템플릿(templates/quote.xlsx)의 셀 위치 설정. 양식이 바뀌면 템플릿 파일 교체 후 이 파일만 수정한다.
// 행 번호는 "품목이 1줄일 때" 기준이며, 품목이 늘어나면 itemRow 아래 모든 행이 그만큼 밀린다.
export default {
  header: {
    recipient: { cell: 'B3', template: '{귀중}   貴中' }, // {귀중} 만 치환, 나머지 문구 유지
    title: { cell: 'B4', template: '견적명 : {견적명}' },
    amountText: 'B6', // 일금 : ○○원정 (한글 금액)
    vatNotice: 'B7', // ₩○○ VAT포함 입니다.
  },
  items: {
    itemRow: 11, // 템플릿의 품목 1줄 행. 이 행을 복제해 삽입한다.
    columns: { name: 'B', spec: 'C', unit: 'D', qty: 'E', unitPrice: 'F', amount: 'G' },
  },
  // 품목 아래쪽 행들 (품목 1줄 기준)
  totals: {
    materialSubtotal: 'G13',
    dashes: ['G16', 'G18', 'G20', 'G22'], // MVP: 인건비/일반관리비/안전관리비/이윤은 '-' 고정
    supply: 'G23',
    vat: 'G24',
    grand: 'G25',
  },
  // 템플릿에서 병합되어 있고 품목 아래에 위치한 영역 (삽입 시 함께 이동)
  // 오른쪽 상단 텍스트 상자(작성일자/견적번호/회사 정보)의 글자를 표 머리글에서 띄우는 아래쪽 여백 (EMU, 12700 = 1pt)
  textBoxBottomInsetEmu: 114300,
  printArea: { firstCol: 'A', lastCol: 'H', lastRow: 47 },
};
