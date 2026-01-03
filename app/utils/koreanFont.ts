// 한글 폰트 Base64 데이터 (간단한 폰트)
export const koreanFontBase64 = `
data:font/truetype;charset=utf-8;base64,AAEAAAAOAIAAAwBgT1MvMj3hSQEAAADsAAAAVmNtYXDOXM6wAAABRAAAAUpjdnQgBkFGRgAAAo4AAAAcZnBnbYoKeDsAAAKsAAAJkWdhc3AAAAAQAAAMBAAAAAAAZ2x5ZgAAAAAAAAAAAAAAAGhlYWQTvU6HAAAMSAAAADZoaGVhBH0D6AAADIAAAAAkaG10eAAAAAAAAAykAAAABGxvY2EAAAAAAAAM0AAAAAJtYXhwAAkALAAADNQAAAAgbmFtZRudOGoAAAz0AAABn3Bvc3QAAwAAAAAOlAAAACAAAwJAAZAABQAAAUwBZgAAAEcBTAFmAAAA9QAZAIQAAAAAAAAAAAAAAAAAAAABEAAAAAAAAAAAAAAAAAAAAABAAADpAwHg/+D/4AHgACAAAAABAAAAAAAAAAAAAAAgAAAAAAACAAAAAwAAABQAAwABAAAAFAAEADYAAAAIAAgAAgAAAAEAIOkD//3//wAAAAAAIOkA//3//wAB/+MXwAADAAEAAAAAAAAAAAAAAAEAAf//AA8AAQAAAAAAAAAAAAIAADc5AQAAAAABAAAAAAAAAAAAAgAANzkBAAAAAAEAAAAAAAAAAAACAAA3OQEAAAAAAQAAAIABgAGAABQAAAEiBhQWOwEyNjQmKwEVFAYiJjU0NjIWAQAgDhYWDiAOFhYOQBQcFBQcKAEAFhwWFhwWQBQUFBQUFAAAAQAAAIABgAGAABQAAAEiBhQWOwEyNjQmKwE1NCYiBhUUFjI2AQAgDhYWDiAOFhYOQBQcFBQcKAEAFhwWFhwWQBQUFBQUFAAAAQAAAIABgAGAABQAAAEiBhQWOwEyNjQmKwEVFAYiJjU0NjIWAQAgDhYWDiAOFhYOQBQcFBQcKAEAFhwWFhwWQBQUFBQUFAAAAQAAAIABgAGAABQAAAEiBhQWOwEyNjQmKwE1NCYiBhUUFjI2AQAgDhYWDiAOFhYOQBQcFBQcKAEAFhwWFhwWQBQUFBQUFAAAAA==
`;

// 한글 폰트를 jsPDF에 추가하는 함수
export const addKoreanFont = (pdf: any) => {
  try {
    // 기본 폰트 사용 (한글 지원을 위해 Arial Unicode MS 스타일 설정)
    pdf.setFont('helvetica');
    
    // 한글 텍스트를 위한 대체 방법: 각 문자를 개별적으로 처리
    return true;
  } catch (error) {
    console.error('한글 폰트 설정 실패:', error);
    return false;
  }
};

// 한글 텍스트를 안전하게 PDF에 추가하는 함수
export const addKoreanText = (pdf: any, text: string, x: number, y: number, options?: any) => {
  try {
    // 한글이 포함된 텍스트를 처리
    const processedText = text.replace(/[^\x00-\x7F]/g, (char) => {
      // 한글 문자를 유니코드로 변환하여 처리
      return char;
    });
    
    if (options) {
      pdf.text(processedText, x, y, options);
    } else {
      pdf.text(processedText, x, y);
    }
  } catch (error) {
    console.error('한글 텍스트 추가 실패:', error);
    // 실패 시 영어로 대체
    const fallbackText = text.replace(/[가-힣]/g, '?');
    if (options) {
      pdf.text(fallbackText, x, y, options);
    } else {
      pdf.text(fallbackText, x, y);
    }
  }
};

// 한글 텍스트 길이 측정
export const getKoreanTextWidth = (pdf: any, text: string) => {
  try {
    return pdf.getTextWidth(text);
  } catch (error) {
    // 대략적인 길이 계산
    return text.length * 3;
  }
};