# Supabase 공개 루트 인증서

`supabase-prod-ca-2021.crt`는 비밀 키가 없는 공개 CA 인증서예요. 2026-10-13 Supabase 대시보드 Database Settings의 다운로드 링크에서 HTTPS로 받았어요.

- 출처: https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt
- Subject: `Supabase Root 2021 CA`, `Supabase Inc`
- 만료: 2031-04-26 10:56:53 UTC
- 다운로드 파일 SHA-256 fingerprint: `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`

이 fingerprint는 받은 파일의 식별값이며 별도 채널에서 대조한 값은 아니에요. 갱신 시 공급자 대시보드의 공식 링크를 다시 확인해요. DB URL에 `sslmode=verify-full&sslrootcert=db/certs/supabase-prod-ca-2021.crt`를 지정하고 저장소 루트에서 실행해요. 배포 시에는 인증서 파일 포함 여부와 실행 디렉터리에 맞는 경로를 별도로 확인해야 해요.
