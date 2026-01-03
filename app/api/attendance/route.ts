import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 출석 기록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: '날짜 매개변수가 필요합니다.' },
        { status: 400 }
      );
    }

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        date: new Date(date),
      },
      include: {
        student: true,
      },
    });

    return NextResponse.json(attendanceRecords);
  } catch (error) {
    console.error('출석 기록 조회 오류:', error);
    return NextResponse.json(
      { error: '출석 기록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 출석 기록 생성/수정
export async function POST(request: NextRequest) {
  try {
    const { studentId, date, status } = await request.json();

    if (!studentId || !date || !status) {
      return NextResponse.json(
        { error: '학생 ID, 날짜, 출석 상태는 필수입니다.' },
        { status: 400 }
      );
    }

    // 일요일 검증 추가
    const targetDate = new Date(date);
    if (targetDate.getDay() !== 0) { // 0: 일요일
      return NextResponse.json(
        { error: '출석체크는 일요일에만 가능합니다.' },
        { status: 400 }
      );
    }

    // 유효한 출석 상태인지 확인
    const validStatuses = ['present', 'absent', 'late'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: '유효하지 않은 출석 상태입니다.' },
        { status: 400 }
      );
    }

    // 기존 출석 기록이 있는지 확인
    const existingRecord = await prisma.attendance.findFirst({
      where: {
        studentId: parseInt(studentId),
        date: new Date(date),
      },
    });

    let attendanceRecord;

    if (existingRecord) {
      // 기존 기록 업데이트
      const oldStatus = existingRecord.status;
      const newStatus = status;

      // 달란트 변경 로직
      let talentChange = 0;
      if (oldStatus !== 'present' && newStatus === 'present') {
        // 결석/지각 -> 출석: +10 달란트
        talentChange = 10;
      } else if (oldStatus === 'present' && newStatus !== 'present') {
        // 출석 -> 결석/지각: -10 달란트
        talentChange = -10;
      }

      // 트랜잭션으로 출석 기록 업데이트 및 달란트 변경
      attendanceRecord = await prisma.$transaction(async (tx) => {
        const updated = await tx.attendance.update({
          where: {
            id: existingRecord.id,
          },
          data: {
            status: status,
          },
          include: {
            student: true,
          },
        });

        if (talentChange !== 0) {
          // 현재 학생 정보 조회
          const currentStudent = await tx.student.findUnique({
            where: { id: parseInt(studentId) },
          });

          if (currentStudent) {
            const beforeBalance = currentStudent.talents || 0;
            const afterBalance = beforeBalance + talentChange;

            // 학생 달란트 업데이트
            await tx.student.update({
              where: {
                id: parseInt(studentId),
              },
              data: {
                talents: afterBalance,
              },
            });

            // 학생 달란트 히스토리 기록
            await tx.talentHistory.create({
              data: {
                studentId: parseInt(studentId),
                amount: talentChange,
                beforeBalance: beforeBalance,
                afterBalance: afterBalance,
                reason: `출석 체크 (${newStatus === 'present' ? '출석' : newStatus === 'absent' ? '결석' : '지각'})`,
                type: 'attendance',
              },
            });

            // 선생님에게도 달란트 지급/차감
            const teacher = await tx.teacher.findFirst({
              where: { name: currentStudent.teacher },
            });

            if (teacher) {
              const teacherTalentChange = talentChange > 0 ? 10 : -10; // 출석 시 +10, 취소 시 -10
              const teacherBeforeBalance = teacher.talents || 0;
              const teacherAfterBalance = teacherBeforeBalance + teacherTalentChange;

              // 선생님 달란트 업데이트
              await tx.teacher.update({
                where: { id: teacher.id },
                data: { talents: teacherAfterBalance },
              });

              // 선생님 달란트 히스토리 기록
              await tx.teacherTalentHistory.create({
                data: {
                  teacherId: teacher.id,
                  amount: teacherTalentChange,
                  beforeBalance: teacherBeforeBalance,
                  afterBalance: teacherAfterBalance,
                  reason: `${currentStudent.name} 학생 출석 체크`,
                  type: 'attendance',
                },
              });
            }
          }
        }

        return updated;
      });
    } else {
      // 새 기록 생성
      const talentChange = status === 'present' ? 10 : 0;

      // 트랜잭션으로 출석 기록 생성 및 달란트 추가
      attendanceRecord = await prisma.$transaction(async (tx) => {
        const created = await tx.attendance.create({
          data: {
            studentId: parseInt(studentId),
            date: new Date(date),
            status: status,
          },
          include: {
            student: true,
          },
        });

        if (talentChange > 0) {
          // 현재 학생 정보 조회
          const currentStudent = await tx.student.findUnique({
            where: { id: parseInt(studentId) },
          });

          if (currentStudent) {
            const beforeBalance = currentStudent.talents || 0;
            const afterBalance = beforeBalance + talentChange;

            // 학생 달란트 업데이트
            await tx.student.update({
              where: {
                id: parseInt(studentId),
              },
              data: {
                talents: afterBalance,
              },
            });

            // 학생 달란트 히스토리 기록
            await tx.talentHistory.create({
              data: {
                studentId: parseInt(studentId),
                amount: talentChange,
                beforeBalance: beforeBalance,
                afterBalance: afterBalance,
                reason: '출석 체크 (출석)',
                type: 'attendance',
              },
            });

            // 선생님에게도 달란트 지급
            const teacher = await tx.teacher.findFirst({
              where: { name: currentStudent.teacher },
            });

            if (teacher) {
              const teacherBeforeBalance = teacher.talents || 0;
              const teacherAfterBalance = teacherBeforeBalance + 10; // 출석 1명당 10 달란트

              // 선생님 달란트 업데이트
              await tx.teacher.update({
                where: { id: teacher.id },
                data: { talents: teacherAfterBalance },
              });

              // 선생님 달란트 히스토리 기록
              await tx.teacherTalentHistory.create({
                data: {
                  teacherId: teacher.id,
                  amount: 10,
                  beforeBalance: teacherBeforeBalance,
                  afterBalance: teacherAfterBalance,
                  reason: `${currentStudent.name} 학생 출석 체크`,
                  type: 'attendance',
                },
              });
            }
          }
        }

        return created;
      });
    }

    return NextResponse.json(attendanceRecord);
  } catch (error) {
    console.error('출석 기록 저장 오류:', error);
    return NextResponse.json(
      { error: '출석 기록 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 출석 기록 코멘트 수정
export async function PATCH(request: NextRequest) {
  try {
    const { id, comment } = await request.json();
    if (!id) {
      return NextResponse.json(
        { error: '출석 기록 ID가 필요합니다.' },
        { status: 400 }
      );
    }
    const updated = await prisma.attendance.update({
      where: { id: parseInt(id) },
      data: { comment },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('출석 코멘트 수정 오류:', error);
    return NextResponse.json(
      { error: '출석 코멘트 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 출석 기록 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '출석 기록 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 출석 기록 조회 (달란트 차감을 위해)
    const record = await prisma.attendance.findUnique({
      where: { id: parseInt(id) },
    });

    if (!record) {
      return NextResponse.json(
        { error: '출석 기록을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 트랜잭션으로 출석 기록 삭제 및 달란트 차감
    await prisma.$transaction(async (tx) => {
      // 출석 기록 삭제
      await tx.attendance.delete({
        where: { id: parseInt(id) },
      });

      // 출석이었으면 달란트 10개 차감
      if (record.status === 'present') {
        // 현재 학생 정보 조회
        const currentStudent = await tx.student.findUnique({
          where: { id: record.studentId },
        });

        if (currentStudent) {
          const beforeBalance = currentStudent.talents || 0;
          const afterBalance = beforeBalance - 10;

          // 달란트 업데이트
          await tx.student.update({
            where: {
              id: record.studentId,
            },
            data: {
              talents: afterBalance,
            },
          });

          // 달란트 히스토리 기록
          await tx.talentHistory.create({
            data: {
              studentId: record.studentId,
              amount: -10,
              beforeBalance: beforeBalance,
              afterBalance: afterBalance,
              reason: '출석 기록 삭제',
              type: 'delete',
            },
          });
        }
      }
    });

    return NextResponse.json({ message: '출석 기록이 삭제되었습니다.' });
  } catch (error) {
    console.error('출석 기록 삭제 오류:', error);
    return NextResponse.json(
      { error: '출석 기록 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 