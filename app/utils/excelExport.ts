import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// 학생 데이터 엑셀 내보내기
export const exportStudentsToExcel = (students: any[]) => {
  const worksheet = XLSX.utils.json_to_sheet(
    students.map(student => ({
      'ID': student.id,
      '이름': student.name,
      '반': student.className,
      '담임선생님': student.teacher,
      '전화번호': student.phone,
      '주소': student.address,
      '생년월일': student.birthDate ? new Date(student.birthDate).toLocaleDateString('ko-KR') : '',
      '등록일': new Date(student.createdAt).toLocaleDateString('ko-KR'),
      '비고': student.notes || ''
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '학생목록');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const fileName = `학생목록_${new Date().toLocaleDateString('ko-KR').replace(/\./g, '')}.xlsx`;
  saveAs(data, fileName);
};

// 출석 데이터 엑셀 내보내기
export const exportAttendanceToExcel = (attendanceData: any[], selectedDate: string) => {
  const worksheet = XLSX.utils.json_to_sheet(
    attendanceData.map(record => ({
      'ID': record.student.id,
      '이름': record.student.name,
      '반': record.student.className,
      '출석상태': record.status === 'present' ? '출석' : record.status === 'absent' ? '결석' : '지각',
      '날짜': new Date(record.date).toLocaleDateString('ko-KR'),
      '코멘트': record.comment || ''
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '출석기록');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const fileName = `출석기록_${selectedDate.replace(/-/g, '')}.xlsx`;
  saveAs(data, fileName);
};

// 통계 데이터 엑셀 내보내기
export const exportStatsToExcel = (statsData: any) => {
  const workbook = XLSX.utils.book_new();

  // 전체 통계 시트
  const totalStatsSheet = XLSX.utils.json_to_sheet([
    {
      '구분': '전체 통계',
      '출석': statsData.totalStats.present,
      '결석': statsData.totalStats.absent,
      '지각': statsData.totalStats.late,
      '총계': statsData.totalStats.total,
      '출석률': `${statsData.totalStats.attendanceRate}%`
    }
  ]);
  XLSX.utils.book_append_sheet(workbook, totalStatsSheet, '전체통계');

  // 반별 통계 시트
  const classStatsData = Object.keys(statsData.classStats).map(className => ({
    '반': className,
    '출석': statsData.classStats[className].present,
    '결석': statsData.classStats[className].absent,
    '지각': statsData.classStats[className].late,
    '총계': statsData.classStats[className].total,
    '출석률': `${statsData.classStats[className].attendanceRate}%`
  }));
  const classStatsSheet = XLSX.utils.json_to_sheet(classStatsData);
  XLSX.utils.book_append_sheet(workbook, classStatsSheet, '반별통계');

  // 개별 학생 통계 시트
  const studentStatsData = statsData.studentStats.map((student: any) => ({
    'ID': student.id,
    '이름': student.name,
    '반': student.className,
    '출석': student.present,
    '결석': student.absent,
    '지각': student.late,
    '총계': student.total,
    '출석률': `${student.attendanceRate}%`
  }));
  const studentStatsSheet = XLSX.utils.json_to_sheet(studentStatsData);
  XLSX.utils.book_append_sheet(workbook, studentStatsSheet, '개별학생통계');

  // 주별 통계 시트
  const weeklyStatsData = statsData.weeklyStats.map((week: any) => ({
    '날짜': new Date(week.date).toLocaleDateString('ko-KR'),
    '출석': week.present,
    '결석': week.absent,
    '지각': week.late,
    '총계': week.total,
    '출석률': `${week.attendanceRate}%`
  }));
  const weeklyStatsSheet = XLSX.utils.json_to_sheet(weeklyStatsData);
  XLSX.utils.book_append_sheet(workbook, weeklyStatsSheet, '주별통계');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const fileName = `출석통계_${statsData.period.startDate}_${statsData.period.endDate}.xlsx`;
  saveAs(data, fileName);
};

// 개별 학생 출석 기록 엑셀 내보내기
export const exportStudentAttendanceToExcel = (student: any, attendanceRecords: any[]) => {
  const worksheet = XLSX.utils.json_to_sheet(
    attendanceRecords.map(record => ({
      '날짜': new Date(record.date).toLocaleDateString('ko-KR'),
      '출석상태': record.status === 'present' ? '출석' : record.status === 'absent' ? '결석' : '지각',
      '코멘트': record.comment || ''
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '출석기록');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const fileName = `${student.name}_출석기록_${new Date().toLocaleDateString('ko-KR').replace(/\./g, '')}.xlsx`;
  saveAs(data, fileName);
};