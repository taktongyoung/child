기본정보
URL
POST
https://sms.bizservice.iwinv.kr/api/v2/send/
응답
{
	"resultCode": 0,
	"message": "전송 성공",
	"requestNo": "123456",
	"msgType": "SMS"
}
							
값	타입	설명
resultCode	Integer	응답 코드
message	String	응답 코드 결과 메시지
requestNo	String	메시지 발송요청 고유번호
msgType	String	메시지 종류 ( SMS : 단문 전송 , LMS : 장문 전송, MMS : 멀티메시지 전송 , GSMS : 국제 문자 )
단문(SMS) 발송
90byte까지 단문으로 발송되며, 90byte가 넘는 경우에는 LMS로 발송됩니다.
HEADERS
Content-Type
application/json;charset=UTF-8
Secret
base64_encode ( API Key&인증 Key )
BODY
{
	"version": "1.0" ,
	"from": "01000000000" ,
	"to": ["01000000001", "01000000002"] ,
	"text": "내용" ,
	"date": "null" ,
        "msgType": "GSMS"
}
							
값	타입	필수	설명	예시
version	String	O	버전정보	1.0
from	String	O	발신번호	010-0000-0000 혹은 01000000000
to	Array	O	수신번호( 수신번호는 배열로 입력해야합니다. 대량 발송은 1회 최대 1,000명 전송 가능합니다. )	array ('010-0000-0000') 혹은 array('01000000000')
text	String	O	문자 내용	최대 90Byte 초과 시 LMS로 발송됩니다.
date	String	X	발송 시각(예약 발송인 경우 필수, 예약 발송은 현재 시간 15분 이후 한달 이전까지만 가능합니다.)	yyyy-MM-dd HH:mm:ss
msgType	String	X	국제 SMS 발송시 입력	GSMS
장문(LMS) 발송
문자에 제목을 추가할 수 있습니다. 문자는 최대 2000Byte까지 입력 가능합니다.
HEADERS
Content-Type
application/json;charset=UTF-8
Secret
base64_encode ( API Key&인증 Key )
BODY
{
	"version": "1.0" ,
	"from": "01000000000" ,
	"to": ["01000000001", "01000000002"] ,
	"title": "제목" ,
	"text": "내용" ,
	"date": "null"
}
							
값	타입	필수	설명	예시
version	String	O	버전정보	1.0
from	String	O	발신번호	010-0000-0000 혹은 01000000000
to	Array	O	수신번호( 수신번호는 배열로 입력해야합니다.대량 발송은 1회 최대 1,000명 전송 가능합니다. )	array ('010-0000-0000') 혹은 array('01000000000')
title	String	O	제목	최대 40byte 허용된 특수문자 [ ] ( ) < >
text	String	O	문자 내용	최대 2000Byte
date	String	X	발송 시각(예약 발송인 경우 필수, 예약 발송은 현재 시간 15분 이후 한달 이전까지만 가능합니다.)	yyyy-MM-dd HH:mm:ss
PHP
$_param = array();
$_param['version'] = '1.0' ;
$_param['from'] = '01000000000' ;
$_param['to'] = array('01000000001', '01000000002');
$_param['title'] = '제목' ;
$_param['text'] = '내용' ;
$encodeKey = base64_encode ( 'API Key&인증 Key' ) ;

$curl = curl_init() ;
curl_setopt ( $curl , CURLOPT_URL, 'https://sms.bizservice.iwinv.kr/api/v2/send/' ) ;
curl_setopt ( $curl , CURLOPT_TIMEOUT , 0 ) ;
curl_setopt ( $curl , CURLOPT_POST , 1 ) ;
curl_setopt ( $curl , CURLOPT_RETURNTRANSFER , 1 ) ;
curl_setopt ( $curl , CURLOPT_POSTFIELDS , json_encode($_param) ) ;
curl_setopt ( $curl , CURLOPT_HTTPHEADER ,
	array
	(
		'Content-Type:application/json;charset=UTF-8' ,
		'secret:' . $encodeKey
	)
) ;
curl_setopt ( $curl , CURLOPT_SSL_VERIFYPEER , FALSE ) ;

$result = curl_exec ( $curl ) ;
$err = curl_error ( $curl ) ;

curl_close ( $curl ) ;
							
포토(MMS) 발송
단문/장문 문자에서 이미지를 첨부하여 발송할 수 있습니다.
이미지는 100kb 미만의 JPG파일만 발송할 수 있습니다.
HEADERS
Content-Type
multipart/form-data
Secret
base64_encode ( API Key&인증 Key )
BODY
array (
	'version' => '1.0' ,
	'from' => '01000000000' ,
	'to' => '01000000000' ,
	'title' => '제목' ,
	'text' => '내용' ,
	'image' => '이미지 리소스' ,
	'date' => NULL
)
							
값	타입	필수	설명	예시
version	String	O	버전정보	1.0
from	String	O	발신번호	010-0000-0000 혹은 01000000000
to	Array	O	수신번호( 수신번호는 배열로 입력해야합니다. 대량 발송은 1회 최대 1,000명 전송 가능합니다. )	
http_build_query ( array ( '01000000000' , '01000000001' ) )
title	String	O	제목	최대 40byte 허용된 특수문자 [ ] ( ) < >
image	String	O	이미지	100kb 미만의 JPG 파일
text	String	O	문자 내용	최대 2000Byte
date	String	X	발송 시각(예약 발송인 경우 필수, 예약 발송은 현재 시간 15분 이후 한달 이전까지만 가능합니다.)	yyyy-MM-dd HH:mm:ss
PHP
$k = array_keys ( $_FILES ) ;
$image = curl_file_create ( $_FILES[$k[0]]['tmp_name'] , $_FILES[$k[0]]['type'] , basename ( $_FILES[$k[0]]['name'] ) ) ;
$encodeKey = base64_encode ( 'API Key&인증 Key' ) ;

$curl = curl_init() ;

curl_setopt ( $curl , CURLOPT_URL, 'https://sms.bizservice.iwinv.kr/api/v2/send/' ) ;
curl_setopt ( $curl , CURLOPT_TIMEOUT , 0 ) ;
curl_setopt ( $curl , CURLOPT_POST , 1 ) ;
curl_setopt ( $curl , CURLOPT_RETURNTRANSFER , 1 ) ;

$toList = http_build_query ( array ( '01000000000' , '01000000001' ) );
curl_setopt ( $curl , CURLOPT_POSTFIELDS , array ( 'version' => '1.0' , 'from' => '01000000000' , 'to' => $toList , 'title' => 'MMS TITLE' , 'text' => 'MMS MESSAGE' , 'image' => $image , 'date' => NULL ) ) ;

curl_setopt ( $curl , CURLOPT_HTTPHEADER ,
	array
	(
		'Content-Type:multipart/form-data' ,
		'secret:' . $encodeKey
	)
) ;
curl_setopt ( $curl , CURLOPT_SSL_VERIFYPEER , FALSE ) ;

$result = curl_exec ( $curl ) ;
$err = curl_error ( $curl ) ;

curl_close ( $curl ) ;

if ( $err )
	echo 'Error :' . $err ;
else
	echo $result ;
							
문자 메시지 전송 결과 코드 값
코드	설명
0	전송 성공
1	메시지가 전송되지 않았습니다.
11	운영 중인 서비스가 아닙니다.
12	요금제 충전 중입니다. 잠시 후 다시 시도해 보시기 바랍니다.
13	등록되지 않은 발신번호입니다.
14	인증 요청이 올바르지 않습니다.
15	등록하지 않은 IP에서는 발송되지 않습니다.
21	장문 메시지는 2000 Bytes까지만 입력이 가능합니다.
22	제목 입력 가능 문자 : 한글, 영어, 숫자 허용된 특수문자는 [ ] ( ) < > 입니다.
23	제목은 40 Byte까지만 입력이 가능합니다.
31	파일 업로드는 100KB까지 가능합니다.
32	허용되지 않는 파일 확장자입니다.
33	이미지 업로드에 실패했습니다.
41	수신 번호를 입력하여 주세요.
42	예약 전송은 현재 시간 15분 이후 한달 이전까지만 가능
43	날짜와 시간 표현 형식(예: 2015-09-02 14:17:03)에 맞춰 입력하여 주십시오.
44	최대 1000건 전송 가능합니다.
50	SMS 자동 충전 하루 5번 충전 한도를 초과하였습니다.
기본정보
URL
POST
https://sms.bizservice.iwinv.kr/api/send/
응답
{
	"resultCode": 0,
	"message": "전송 성공",
	"requestNo": "123456",
	"msgType": "SMS"
}
							
값	타입	설명
resultCode	Integer	응답 코드
message	String	응답 코드 결과 메시지
requestNo	String	메시지 발송요청 고유번호
msgType	String	메시지 종류
단문(SMS) 발송
90byte까지 단문으로 발송되며, 90byte가 넘는 경우에는 LMS로 발송됩니다.
HEADERS
Content-Type
application/json;charset=UTF-8
Secret
base64_encode ( API Key&인증 Key )
BODY
{
	"version": "1.0" ,
	"from": "01000000000" ,
	"to": ["01000000001", "01000000002"] ,
	"text": "내용" ,
	"date": "null"
}
							
값	타입	필수	설명	예시
version	String	O	버전정보	1.0
from	String	O	발신번호	010-0000-0000 혹은 01000000000
to	Array	O	수신번호( 대량 발송시 수신번호 배열로 입력하시면 됩니다. 대량 발송은 1회 최대 1,000명 전송 가능합니다. )	010-0000-0000 혹은 01000000000
text	String	O	문자 내용	최대 90Byte 초과 시 LMS로 발송됩니다.
date	String	X	발송 시각(예약 발송인 경우 필수, 예약 발송은 현재 시간 15분 이후 한달 이전까지만 가능합니다.)	yyyy-MM-dd HH:mm:ss
장문(LMS) 발송
문자에 제목을 추가할 수 있습니다. 문자는 최대 2000Byte까지 입력 가능합니다.
HEADERS
Content-Type
application/json;charset=UTF-8
Secret
base64_encode ( API Key&인증 Key )
BODY
{
	"version": "1.0" ,
	"from": "01000000000" ,
	"to": ["01000000001", "01000000002"] ,
	"title": "제목" ,
	"text": "내용" ,
	"date": "null"
}
							
값	타입	필수	설명	예시
version	String	O	버전정보	1.0
from	String	O	발신번호	010-0000-0000 혹은 01000000000
to	Array	O	수신번호( 대량 발송시 수신번호 배열로 입력하시면 됩니다. 대량 발송은 1회 최대 1,000명 전송 가능합니다. )	010-0000-0000 혹은 01000000000
title	String	O	제목	최대 40byte 허용된 특수문자 [ ] ( ) < >
text	String	O	문자 내용	최대 2000Byte
date	String	X	발송 시각(예약 발송인 경우 필수, 예약 발송은 현재 시간 15분 이후 한달 이전까지만 가능합니다.)	yyyy-MM-dd HH:mm:ss
PHP
$_param = array();
$_param['version'] = '1.0' ;
$_param['from'] = '01000000000' ;
$_param['to'] = array('01000000001', '01000000002');
$_param['title'] = '제목' ;
$_param['text'] = '내용' ;
$encodeKey = base64_encode ( 'API Key&인증 Key' ) ;

$curl = curl_init() ;
curl_setopt ( $curl , CURLOPT_URL, 'https://sms.bizservice.iwinv.kr/api/send/' ) ;
curl_setopt ( $curl , CURLOPT_TIMEOUT , 0 ) ;
curl_setopt ( $curl , CURLOPT_POST , 1 ) ;
curl_setopt ( $curl , CURLOPT_RETURNTRANSFER , 1 ) ;
curl_setopt ( $curl , CURLOPT_POSTFIELDS , json_encode($_param) ) ;
curl_setopt ( $curl , CURLOPT_HTTPHEADER ,
	array
	(
		'Content-Type:application/json;charset=UTF-8' ,
		'secret:' . $encodeKey
	)
) ;
curl_setopt ( $curl , CURLOPT_SSL_VERIFYPEER , FALSE ) ;

$result = curl_exec ( $curl ) ;
$err = curl_error ( $curl ) ;

curl_close ( $curl ) ;
							
포토(MMS) 발송
단문/장문 문자에서 이미지를 첨부하여 발송할 수 있습니다.
이미지는 100kb 미만의 JPG파일만 발송할 수 있습니다.
HEADERS
Content-Type
multipart/form-data
Secret
base64_encode ( API Key&인증 Key )
BODY
array (
	'version' => '1.0' ,
	'from' => '01000000000' ,
	'to' => '01000000000' ,
	'title' => '제목' ,
	'text' => '내용' ,
	'image' => '이미지 리소스' ,
	'date' => NULL
)
							
값	타입	필수	설명	예시
version	String	O	버전정보	1.0
from	String	O	발신번호	010-0000-0000 혹은 01000000000
to	String	O	수신번호( 대량 발송시 수신번호 배열로 입력하시면 됩니다. 대량 발송은 1회 최대 1,000명 전송 가능합니다. )	
http_build_query ( array ( '01000000000' , '01000000001' ) )
title	String	O	제목	최대 40byte 허용된 특수문자 [ ] ( ) < >
image	String	O	이미지	100kb 미만의 JPG 파일
text	String	O	문자 내용	최대 2000Byte
date	String	X	발송 시각(예약 발송인 경우 필수, 예약 발송은 현재 시간 15분 이후 한달 이전까지만 가능합니다.)	yyyy-MM-dd HH:mm:ss
PHP
$k = array_keys ( $_FILES ) ;
$image = curl_file_create ( $_FILES[$k[0]]['tmp_name'] , $_FILES[$k[0]]['type'] , basename ( $_FILES[$k[0]]['name'] ) ) ;
$encodeKey = base64_encode ( 'API Key&인증 Key' ) ;

$curl = curl_init() ;

curl_setopt ( $curl , CURLOPT_URL, 'https://sms.bizservice.iwinv.kr/api/send/' ) ;
curl_setopt ( $curl , CURLOPT_TIMEOUT , 0 ) ;
curl_setopt ( $curl , CURLOPT_POST , 1 ) ;
curl_setopt ( $curl , CURLOPT_RETURNTRANSFER , 1 ) ;

$toList = http_build_query ( array ( '01000000000' , '01000000001' ) );
curl_setopt ( $curl , CURLOPT_POSTFIELDS , array ( 'version' => '1.0' , 'from' => '01000000000' , 'to' => $toList , 'title' => 'MMS TITLE' , 'text' => 'MMS MESSAGE' , 'image' => $image , 'date' => NULL ) ) ;

curl_setopt ( $curl , CURLOPT_HTTPHEADER ,
	array
	(
		'Content-Type:multipart/form-data' ,
		'secret:' . $encodeKey
	)
) ;
curl_setopt ( $curl , CURLOPT_SSL_VERIFYPEER , FALSE ) ;

$result = curl_exec ( $curl ) ;
$err = curl_error ( $curl ) ;

curl_close ( $curl ) ;

if ( $err )
	echo 'Error :' . $err ;
else
	echo $result ;
							
문자 메시지 전송 결과 코드 값
코드	설명
0	전송 성공
1	메시지가 전송되지 않았습니다.
11	운영 중인 서비스가 아닙니다.
12	요금제 충전 중입니다. 잠시 후 다시 시도해 보시기 바랍니다.
13	등록되지 않은 발신번호입니다.
14	인증 요청이 올바르지 않습니다.
15	등록하지 않은 IP에서는 발송되지 않습니다.
21	장문 메시지는 2000 Bytes까지만 입력이 가능합니다.
22	제목 입력 가능 문자 : 한글, 영어, 숫자 허용된 특수문자는 [ ] ( ) < > 입니다.
23	제목은 40 Byte까지만 입력이 가능합니다.
31	파일 업로드는 100KB까지 가능합니다.
32	허용되지 않는 파일 확장자입니다.
33	이미지 업로드에 실패했습니다.
41	수신 번호를 입력하여 주세요.
42	예약 전송은 현재 시간 15분 이후 한달 이전까지만 가능
43	날짜와 시간 표현 형식(예: 2015-09-02 14:17:03)에 맞춰 입력하여 주십시오.
44	최대 1000건 전송 가능합니다.
50	SMS 자동 충전 하루 5번 충전 한도를 초과하였습니다.