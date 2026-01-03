import { NextRequest, NextResponse } from 'next/server';

const SMS_API_KEY = 'HKZASUT260NJGR5OFYL673294927AA1E';
const SMS_API_SECRET = '75b820f26edadf4311c2145cd32884cf3c31f8be1c71a89379feab29b8413f79';
const SMS_FROM_NUMBER = '01072977895';
const SMS_API_URL = 'https://sms.bizservice.iwinv.kr/api/v2/send/';

export async function POST(request: NextRequest) {
  try {
    const { to, text, title } = await request.json();

    if (!to || !text) {
      return NextResponse.json(
        { error: '수신번호와 문자 내용은 필수입니다.' },
        { status: 400 }
      );
    }

    // 전화번호 배열 확인
    const recipients = Array.isArray(to) ? to : [to];
    
    // 전화번호 형식 검증
    const phoneRegex = /^01[0-9]{8,9}$/;
    for (const phone of recipients) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        return NextResponse.json(
          { error: `유효하지 않은 전화번호입니다: ${phone}` },
          { status: 400 }
        );
      }
    }

    // Clean phone numbers (숫자만 남기기)
    const cleanRecipients = recipients.map(phone => phone.replace(/[^0-9]/g, ''));

    // API 인증 키 생성 (API Key&인증 Key를 base64로 인코딩)
    const authString = `${SMS_API_KEY}&${SMS_API_SECRET}`;
    const encodedAuth = Buffer.from(authString).toString('base64');

    // 90자 기준으로 SMS/LMS 자동 구분
    const isLMS = text.length > 90 || (title && title.trim().length > 0);

    // SMS 발송 데이터 준비
    const smsData = {
      version: '1.0',
      from: SMS_FROM_NUMBER,
      to: cleanRecipients,
      text: text,
      ...(isLMS && title && { title: title.trim() }) // LMS이고 제목이 있을 때만 제목 포함
    };

    // SMS API 호출
    const response = await fetch(SMS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'secret': encodedAuth,
      },
      body: JSON.stringify(smsData),
    });

    const result = await response.json();

    if (result.resultCode === 0) {
      return NextResponse.json({
        success: true,
        message: '문자가 성공적으로 발송되었습니다.',
        requestNo: result.requestNo,
        msgType: result.msgType,
        recipients: cleanRecipients.length,
        actualMsgType: isLMS ? 'LMS' : 'SMS' // 실제 발송 타입 추가
      });
    } else {
      // SMS API 에러 코드에 따른 메시지 설정
      const errorMessages: { [key: number]: string } = {
        1: '메시지가 전송되지 않았습니다.',
        11: '운영 중인 서비스가 아닙니다.',
        12: '요금제 충전 중입니다. 잠시 후 다시 시도해 보시기 바랍니다.',
        13: '등록되지 않은 발신번호입니다.',
        14: '인증 요청이 올바르지 않습니다.',
        15: '등록하지 않은 IP에서는 발송되지 않습니다.',
        21: '장문 메시지는 2000 Bytes까지만 입력이 가능합니다.',
        22: '제목 입력 가능 문자: 한글, 영어, 숫자 허용된 특수문자는 [ ] ( ) < > 입니다.',
        23: '제목은 40 Byte까지만 입력이 가능합니다.',
        31: '파일 업로드는 100KB까지 가능합니다.',
        32: '허용되지 않는 파일 확장자입니다.',
        33: '이미지 업로드에 실패했습니다.',
        41: '수신 번호를 입력하여 주세요.',
        42: '예약 전송은 현재 시간 15분 이후 한달 이전까지만 가능',
        43: '날짜와 시간 표현 형식(예: 2015-09-02 14:17:03)에 맞춰 입력하여 주십시오.',
        44: '최대 1000건 전송 가능합니다.',
        50: 'SMS 자동 충전 하루 5번 충전 한도를 초과하였습니다.'
      };

      const errorMessage = errorMessages[result.resultCode] || result.message || '문자 발송에 실패했습니다.';

      return NextResponse.json(
        { 
          error: errorMessage,
          resultCode: result.resultCode
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('SMS 발송 오류:', error);
    return NextResponse.json(
      { error: '문자 발송 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 