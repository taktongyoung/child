import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { addKoreanFont, addKoreanText } from './koreanFont';

// 차트를 이미지로 캡처하여 다운로드하는 함수
export const captureChartAsImage = async (chartElementId: string, fileName: string) => {
  try {
    const chartElement = document.getElementById(chartElementId);
    if (!chartElement) {
      console.error(`Chart element with id ${chartElementId} not found`);
      alert('차트를 찾을 수 없습니다.');
      return;
    }

    const canvas = await html2canvas(chartElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true
    });

    // 이미지 다운로드
    const link = document.createElement('a');
    link.download = `${fileName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

  } catch (error) {
    console.error('차트 캡처 중 오류 발생:', error);
    alert('차트 캡처 중 오류가 발생했습니다.');
  }
};

// 모든 차트를 이미지로 다운로드하는 함수
export const exportAllChartsAsImages = async (statsData: any) => {
  const chartIds = [
    'total-stats-chart',
    'class-stats-chart', 
    'class-attendance-chart',
    'weekly-trend-chart',
    'weekly-attendance-count-chart',
    'class-weekly-attendance-chart'
  ];

  const chartNames = [
    '전체_출석_현황',
    '반별_출석률',
    '반별_출석_현황',
    '주별_출석률_추이',
    '주별_출석_인원수_추이',
    '반별_주간_출석_인원수_비교'
  ];

  const dateStr = new Date().toLocaleDateString('ko-KR').replace(/\./g, '');
  
  for (let i = 0; i < chartIds.length; i++) {
    const element = document.getElementById(chartIds[i]);
    if (element) {
      await new Promise(resolve => setTimeout(resolve, 500)); // 각 캡처 사이에 딜레이
      await captureChartAsImage(chartIds[i], `${chartNames[i]}_${dateStr}`);
    }
  }

  alert('모든 차트 이미지가 다운로드되었습니다!');
};

// 통계 데이터를 텍스트 파일로 다운로드하는 함수
export const exportStatsToPPT = async (statsData: any) => {
  try {
    // 통계 데이터를 텍스트 형태로 정리
    const reportContent = `
출석 통계 보고서
================

기간: ${statsData.period.startDate} ~ ${statsData.period.endDate}
생성일: ${new Date().toLocaleDateString('ko-KR')}

1. 전체 통계
-----------
출석: ${statsData.totalStats.present}명
결석: ${statsData.totalStats.absent}명
지각: ${statsData.totalStats.late}명
총계: ${statsData.totalStats.total}명
출석률: ${statsData.totalStats.attendanceRate}%

2. 반별 통계
-----------
${Object.keys(statsData.classStats).map(className => {
  const stats = statsData.classStats[className];
  return `${className}반:
  - 출석: ${stats.present}명
  - 결석: ${stats.absent}명
  - 지각: ${stats.late}명
  - 총계: ${stats.total}명
  - 출석률: ${stats.attendanceRate}%`;
}).join('\n\n')}

3. 출석 인원수 분석
-----------------
최대 출석 인원: ${Math.max(...statsData.weeklyStats.map((w: any) => w.present))}명
최소 출석 인원: ${Math.min(...statsData.weeklyStats.map((w: any) => w.present))}명
평균 출석 인원: ${Math.round(statsData.weeklyStats.reduce((sum: number, w: any) => sum + w.present, 0) / statsData.weeklyStats.length)}명
총 주차 수: ${statsData.weeklyStats.length}주

4. 주별 출석 현황
---------------
${statsData.weeklyStats
  .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
  .map((week: any) => {
    const date = new Date(week.date).toLocaleDateString('ko-KR');
    return `${date}: 출석 ${week.present}명, 결석 ${week.absent}명, 지각 ${week.late}명 (출석률: ${week.attendanceRate}%)`;
  }).join('\n')}

5. 상위 출석률 학생 (TOP 10)
--------------------------
${statsData.studentStats
  .sort((a: any, b: any) => b.attendanceRate - a.attendanceRate)
  .slice(0, 10)
  .map((student: any, index: number) => 
    `${index + 1}. ${student.name} (${student.className}) - 출석률: ${student.attendanceRate}%`
  ).join('\n')}
`;

    // 텍스트 파일로 다운로드
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `출석통계보고서_${statsData.period.startDate}_${statsData.period.endDate}.txt`;
    link.click();

    alert('통계 보고서가 텍스트 파일로 다운로드되었습니다!');

  } catch (error) {
    console.error('보고서 생성 중 오류 발생:', error);
    alert('보고서 생성 중 오류가 발생했습니다.');
  }
};

// PDF 보고서 생성 함수
export const exportStatsToPDF = async (statsData: any) => {
  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    // 한글 폰트 설정
    addKoreanFont(pdf);
    
    // 제목 페이지
    pdf.setFontSize(24);
    addKoreanText(pdf, 'Attendance Statistics Report', pageWidth / 2, 40, { align: 'center' });
    addKoreanText(pdf, '(출석 통계 보고서)', pageWidth / 2, 50, { align: 'center' });
    
    pdf.setFontSize(14);
    addKoreanText(pdf, `Period: ${statsData.period.startDate} ~ ${statsData.period.endDate}`, pageWidth / 2, 70, { align: 'center' });
    addKoreanText(pdf, `Generated: ${new Date().toLocaleDateString('en-US')}`, pageWidth / 2, 85, { align: 'center' });
    
    // 전체 통계
    pdf.setFontSize(18);
    addKoreanText(pdf, '1. Overall Statistics', margin, 120);
    
    pdf.setFontSize(12);
    let yPos = 140;
    addKoreanText(pdf, `Present: ${statsData.totalStats.present}`, margin, yPos);
    addKoreanText(pdf, `Absent: ${statsData.totalStats.absent}`, margin, yPos + 10);
    addKoreanText(pdf, `Late: ${statsData.totalStats.late}`, margin, yPos + 20);
    addKoreanText(pdf, `Total: ${statsData.totalStats.total}`, margin, yPos + 30);
    addKoreanText(pdf, `Attendance Rate: ${statsData.totalStats.attendanceRate}%`, margin, yPos + 40);
    
    // 반별 통계
    pdf.setFontSize(18);
    addKoreanText(pdf, '2. Class Statistics', margin, yPos + 70);
    
    pdf.setFontSize(12);
    yPos += 90;
    Object.keys(statsData.classStats).forEach((className, index) => {
      const stats = statsData.classStats[className];
      addKoreanText(pdf, `${className} Class:`, margin, yPos);
      addKoreanText(pdf, `  Present: ${stats.present}, Absent: ${stats.absent}, Late: ${stats.late}`, margin, yPos + 10);
      addKoreanText(pdf, `  Total: ${stats.total}, Rate: ${stats.attendanceRate}%`, margin, yPos + 20);
      yPos += 35;
      
      // 페이지 넘김 체크
      if (yPos > pageHeight - 40) {
        pdf.addPage();
        yPos = 30;
      }
    });
    
    // 새 페이지 - 차트들
    pdf.addPage();
    yPos = 30;
    
    pdf.setFontSize(18);
    addKoreanText(pdf, '3. Visual Statistics Charts', margin, yPos);
    yPos += 30;
    
    // 차트 캡처 및 PDF에 추가
    const chartIds = [
      'total-stats-chart',
      'class-stats-chart', 
      'class-attendance-chart',
      'weekly-trend-chart',
      'weekly-attendance-count-chart',
      'class-weekly-attendance-chart'
    ];

    const chartTitles = [
      'Overall Attendance Status',
      'Class Attendance Rates',
      'Class Attendance Details',
      'Weekly Attendance Trends',
      'Weekly Attendance Count',
      'Class Weekly Attendance Comparison'
    ];

    for (let i = 0; i < chartIds.length; i++) {
      const chartElement = document.getElementById(chartIds[i]);
      if (chartElement) {
        try {
          const canvas = await html2canvas(chartElement, {
            backgroundColor: '#ffffff',
            scale: 1.5,
            logging: false,
            useCORS: true
          });

          const imgData = canvas.toDataURL('image/png');
          const imgWidth = contentWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          // 페이지 넘김 체크
          if (yPos + imgHeight + 30 > pageHeight - margin) {
            pdf.addPage();
            yPos = 30;
          }
          
          pdf.setFontSize(14);
          addKoreanText(pdf, chartTitles[i], margin, yPos);
          yPos += 15;
          
          pdf.addImage(imgData, 'PNG', margin, yPos, imgWidth, imgHeight);
          yPos += imgHeight + 20;
          
        } catch (error) {
          console.error(`차트 ${chartIds[i]} 캡처 실패:`, error);
        }
      }
      
      // 각 차트 사이에 딜레이
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // 출석 인원수 분석 페이지
    pdf.addPage();
    yPos = 30;
    
    pdf.setFontSize(18);
    addKoreanText(pdf, '4. Attendance Count Analysis', margin, yPos);
    yPos += 30;
    
    pdf.setFontSize(12);
    const maxAttendance = Math.max(...statsData.weeklyStats.map((w: any) => w.present));
    const minAttendance = Math.min(...statsData.weeklyStats.map((w: any) => w.present));
    const avgAttendance = Math.round(
      statsData.weeklyStats.reduce((sum: number, w: any) => sum + w.present, 0) / 
      statsData.weeklyStats.length
    );
    
    addKoreanText(pdf, `Max Attendance: ${maxAttendance}`, margin, yPos);
    addKoreanText(pdf, `Min Attendance: ${minAttendance}`, margin, yPos + 15);
    addKoreanText(pdf, `Avg Attendance: ${avgAttendance}`, margin, yPos + 30);
    addKoreanText(pdf, `Total Weeks: ${statsData.weeklyStats.length}`, margin, yPos + 45);
    
    // 주별 출석 현황
    yPos += 80;
    pdf.setFontSize(18);
    addKoreanText(pdf, '5. Weekly Attendance Details', margin, yPos);
    yPos += 25;
    
    pdf.setFontSize(10);
    const sortedWeeklyStats = statsData.weeklyStats
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    sortedWeeklyStats.forEach((week: any, index: number) => {
      const date = new Date(week.date).toLocaleDateString('en-US');
      const text = `${date}: Present ${week.present}, Absent ${week.absent}, Late ${week.late} (Rate: ${week.attendanceRate}%)`;
      
      if (yPos > pageHeight - 30) {
        pdf.addPage();
        yPos = 30;
      }
      
      addKoreanText(pdf, text, margin, yPos);
      yPos += 12;
    });
    
    // 상위 출석률 학생
    if (yPos > pageHeight - 100) {
      pdf.addPage();
      yPos = 30;
    } else {
      yPos += 20;
    }
    
    pdf.setFontSize(18);
    addKoreanText(pdf, '6. Top 10 Students by Attendance Rate', margin, yPos);
    yPos += 25;
    
    pdf.setFontSize(10);
    const topStudents = statsData.studentStats
      .sort((a: any, b: any) => b.attendanceRate - a.attendanceRate)
      .slice(0, 10);
    
    topStudents.forEach((student: any, index: number) => {
      const text = `${index + 1}. ${student.name} (${student.className}) - Rate: ${student.attendanceRate}%`;
      addKoreanText(pdf, text, margin, yPos);
      yPos += 12;
    });
    
    // PDF 다운로드
    const fileName = `Attendance_Report_${statsData.period.startDate}_${statsData.period.endDate}.pdf`;
    pdf.save(fileName);
    
    alert('PDF 보고서가 성공적으로 생성되었습니다! (PDF report generated successfully!)');
    
  } catch (error) {
    console.error('PDF 생성 중 오류 발생:', error);
    alert('PDF 생성 중 오류가 발생했습니다.');
  }
};

// 고급 내보내기 함수 (차트 이미지 + 텍스트 보고서)
export const exportAdvancedStatsToPPT = async (statsData: any) => {
  try {
    // PDF 보고서 생성
    await exportStatsToPDF(statsData);

  } catch (error) {
    console.error('고급 내보내기 중 오류 발생:', error);
    alert('고급 내보내기 중 오류가 발생했습니다.');
  }
};