/* ================================================================
   🍁 축제 정보 파일 — 이 파일만 고치면 초청장 내용이 바뀝니다.

   고치는 규칙 (꼭 지켜 주세요)
   1. 따옴표("  ") 안의 글자만 바꾸세요.
   2. 줄 끝의 쉼표(,)와 괄호({ } [ ])는 지우지 마세요.
   3. "(임시)"라고 적힌 곳은 아직 확정되지 않은 정보입니다.
      확정되면 내용을 고치고 "(임시)" 글자를 지우세요.
   4. // 뒤의 글은 설명(메모)이라 화면에 나오지 않습니다.

   ※ 공지 문구 · 응답 마감일 · 아티스트 공개일은
     운영진 화면(admin.html)에서 바꾼 값이 이 파일보다 우선합니다.
   ================================================================ */

window.FESTIVAL = {

  /* ---------- 기본 정보 ---------- */
  name: "2026 해양대 가을 축제",          // (임시) 축제 공식 이름이 정해지면 바꾸세요
  nameIsTemp: true,                       // 이름이 확정되면 false 로 바꾸세요 ("임시" 표시가 사라져요)
  school: "국립한국해양대학교",
  dateText: "2026. 10. 27(화) ~ 28(수)",  // 화면에 보이는 날짜 글자

  // 축제 시작·끝 시각 (카운트다운 기준, 한국 시간)
  // 모양: "연-월-일T시:분:초+09:00"  ← +09:00 은 한국 시간이라는 뜻이라 지우면 안 돼요
  start: "2026-10-27T10:00:00+09:00",     // (임시) 시작 시각 오전 10시
  end:   "2026-10-28T22:00:00+09:00",     // (임시) 끝나는 시각 밤 10시

  /* ---------- 운영진 화면에서도 바꿀 수 있는 값 ---------- */
  notice: "초청장을 받으신 모든 분을 환영합니다. 자세한 공지는 추후 안내드립니다. (임시)",
  rsvpDeadline: "2026-10-24T23:59:59+09:00",     // (임시) 참석 응답 마감
  artistRevealDate: "2026-10-13T12:00:00+09:00", // (임시) 아티스트 한꺼번에 공개되는 날

  /* ---------- 장소 ---------- */
  location: {
    name: "국립한국해양대학교",
    address: "부산광역시 영도구 태종로 727",
    lat: 35.0764,    // (임시) 길찾기용 위도 — 지도 앱에서 한 번 확인 필요
    lng: 129.0874    // (임시) 길찾기용 경도
  },

  /* ---------- 사이트 연결 정보 (보통 제가 넣어 드려요) ---------- */
  siteUrl: "https://park03059-netizen.github.io/festival-invitation/",
  apiUrl: "",        // (임시) 구글 시트 연결 주소 — 설정안내.md 1번을 마치면 넣어요
  kakaoAppKey: "",   // (임시) 카카오 JavaScript 키 — 설정안내.md 2번을 마치면 넣어요
  heroImage: "",     // 첫 화면 학교 사진 (예: "images/campus.jpg"). 비어 있으면 바다색 그림
  mapImage: "",      // 학교 맵 사진 (예: "images/campus-map.jpg"). 비어 있으면 "준비 중" 그림

  /* ---------- 날짜별 일정 ----------
     highlights = 첫 화면의 "주요 일정" 카드
     timetable  = ② 아티스트 시간표 (시간 순서대로 알아서 정렬돼요)

     timetable 한 칸 모양:
       { start: "18:00", end: "18:40", type: "종류", title: "제목", desc: "설명",
         headliner: true,   ← 헤드라이너면 넣기 (포스터에 HEADLINER 표시)
         artist: { name: "", nameEn: "", photo: "", photos: [], video: "", desc: "" }, revealAt: "" }

     🎤 아티스트 칸 채우는 법 (시간표 맨 위 "LINE-UP" 포스터와 소개 영상이 자동으로 만들어져요)
       name   : 아티스트 이름 (예: "해양밴드")
       nameEn : 영어 이름 (포스터에 크게 들어가요, 비워도 됨)
       photo  : 포스터 대표 사진 — 세로 사진 추천 (예: "images/artists/haeyang.jpg")
       photos : 소개 영상에서 빠르게 넘어갈 사진들 (예: ["images/artists/h1.jpg", "images/artists/h2.jpg"])
       video  : 진짜 소개 영상 파일이 있으면 (예: "images/artists/haeyang.mp4") → 이 영상이 대신 재생돼요
       ※ 사진·영상은 소속사/본인 허락을 받은 것만! CREDITS.md 에 출처를 적어 주세요.
       ※ 미리 보기: 주소 끝에 ?demo=lineup 을 붙이면 샘플 아티스트로 채워서 보여 줘요.
     type(종류): "artist" 아티스트 / "club" 동아리 공연 / "booth" 부스
                 "fireworks" 불꽃놀이 / "event" 행사
     아티스트 이름(name)을 비워 두면 실루엣과 "추후 공개"로 보여요.
     이름을 넣어도 공개일(artistRevealDate) 전에는 "추후 공개"로 보여요.
     revealAt 에 날짜를 넣으면 그 칸만 따로 그 날짜에 공개돼요.
  ------------------------------------------------------------ */
  days: [
    {
      id: "10/27",
      date: "2026-10-27",
      label: "1일차",
      title: "10월 27일 (화)",
      highlights: [
        { time: "10:00", title: "축제 개막 · 부스 운영 시작", desc: "학과·동아리 부스와 먹거리 (임시)" },
        { time: "14:00", title: "동아리 공연 무대", desc: "밴드·댄스·보컬 동아리 공연 (임시)" },
        { time: "18:30", title: "1일차 아티스트 공연", desc: "추후 공개 (임시)" }
      ],
      timetable: [
        { start: "10:00", end: "17:00", type: "booth", title: "학과·동아리 부스 운영", desc: "먹거리·체험 부스 (임시)" },
        { start: "11:00", end: "11:30", type: "event", title: "개막식", desc: "(임시)" },
        { start: "14:00", end: "14:40", type: "club", title: "동아리 공연 ①", desc: "밴드 동아리 (임시)" },
        { start: "15:00", end: "15:40", type: "club", title: "동아리 공연 ②", desc: "댄스 동아리 (임시)" },
        { start: "18:30", end: "19:10", type: "artist", title: "아티스트 공연", artist: { name: "", nameEn: "", photo: "", photos: [], video: "", desc: "" } },
        { start: "19:30", end: "20:20", type: "artist", title: "아티스트 공연", artist: { name: "", nameEn: "", photo: "", photos: [], video: "", desc: "" } }
      ]
    },
    {
      id: "10/28",
      date: "2026-10-28",
      label: "2일차",
      title: "10월 28일 (수)",
      highlights: [
        { time: "10:00", title: "부스 운영", desc: "학과·동아리 부스와 먹거리 (임시)" },
        { time: "18:30", title: "2일차 아티스트 공연", desc: "추후 공개 (임시)" },
        { time: "21:30", title: "바다 위 불꽃놀이", desc: "폐막 불꽃놀이 (임시)" }
      ],
      timetable: [
        { start: "10:00", end: "17:00", type: "booth", title: "학과·동아리 부스 운영", desc: "먹거리·체험 부스 (임시)" },
        { start: "14:00", end: "14:40", type: "club", title: "동아리 공연 ③", desc: "보컬 동아리 (임시)" },
        { start: "18:30", end: "19:10", type: "artist", title: "아티스트 공연", artist: { name: "", nameEn: "", photo: "", photos: [], video: "", desc: "" } },
        { start: "19:30", end: "20:20", type: "artist", title: "아티스트 공연", artist: { name: "", nameEn: "", photo: "", photos: [], video: "", desc: "" } },
        { start: "20:40", end: "21:30", type: "artist", title: "헤드라이너 공연", headliner: true, artist: { name: "", nameEn: "", photo: "", photos: [], video: "", desc: "" } },
        { start: "21:30", end: "21:45", type: "fireworks", title: "폐막 불꽃놀이", desc: "(임시)" }
      ]
    }
  ],

  /* ---------- 지난 축제 사진첩 ----------
     src: 사진 파일 위치 (images 폴더에 넣고 "images/사진이름.jpg")
     credit: 사진 출처 (예: "사진: 총학생회 홍보부")
     ※ 무료로 써도 되는 사진만! 넣은 사진은 CREDITS.md 에도 적어 주세요. */
  gallery: [
    { src: "", caption: "지난 축제 사진 1", credit: "사진 준비 중 (임시)" },
    { src: "", caption: "지난 축제 사진 2", credit: "사진 준비 중 (임시)" },
    { src: "", caption: "지난 축제 사진 3", credit: "사진 준비 중 (임시)" }
  ],

  /* ---------- 학교 맵 위 아이콘 ----------
     type: "stage" 무대 / "booth" 부스 / "food" 먹거리 / "toilet" 화장실
           "medical" 의무실 / "parking" 주차장
     x, y: 맵 왼쪽 위에서부터의 위치 (%, 0~100). 맵 사진이 오면 함께 맞춰요. */
  mapMarkers: [
    { type: "stage",   label: "메인 무대 (임시)", x: 50, y: 35 },
    { type: "booth",   label: "부스 거리 (임시)", x: 30, y: 55 },
    { type: "food",    label: "먹거리 (임시)",    x: 68, y: 58 },
    { type: "toilet",  label: "화장실 (임시)",    x: 20, y: 30 },
    { type: "medical", label: "의무실 (임시)",    x: 78, y: 28 },
    { type: "parking", label: "주차장 (임시)",    x: 86, y: 74 }
  ],

  /* ---------- 교통 안내 (펼쳐 보는 칸) ---------- */
  transport: [
    { title: "🚌 버스로 오기", lines: [
      "101 · 135 · 30 · 88번 버스",
      "'해양대입구' 정류장에서 내린 뒤 걸어서 약 13분"
    ]},
    { title: "🚆 부산역에서 오기", lines: [
      "부산역 앞 버스정류장에서 101번 등을 타고 '해양대입구'에서 내리세요.",
      "(임시) 정확한 탑승 정류장·소요 시간은 확인 후 안내"
    ]},
    { title: "🚇 남포역에서 오기", lines: [
      "지하철 1호선 남포역 근처 정류장에서 영도 방면 버스로 갈아타세요.",
      "(임시) 정확한 출구 번호·버스 번호는 확인 후 안내"
    ]},
    { title: "🅿️ 주차 안내", lines: [ "(임시) 축제 기간 주차 가능 여부는 추후 안내" ]},
    { title: "🚐 셔틀버스", lines: [ "(임시) 셔틀 운행 여부·시간은 추후 안내" ]}
  ]
};
