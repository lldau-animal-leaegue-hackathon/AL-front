---
name: backend-dto-check
description: al-front(Animal League 프론트엔드)에서 백엔드 API 응답을 다룰 때, 추측 대신 백엔드 레포(animal-league-04-back)의 실제 Java 클래스를 직접 읽어 필드 이름·타입·구조를 검증한다. 새 API를 연동하거나, 응답 필드가 의심스럽거나, 응답 매핑(키 변경/한글화/derived 필드)이나 요청 body를 작성·수정할 때 반드시 이 스킬을 사용할 것. "이 API 응답 어떻게 생겼어", "필드 매핑", "백엔드 응답 확인", "DTO 확인", "응답 구조 검증", "엔드포인트 뭐야" 같은 맥락은 물론, 사용자가 명시적으로 요청하지 않더라도 백엔드 응답을 프론트 모델로 변환하는 코드를 작성하기 전이라면 이 스킬을 적용한다. 백엔드 계약과 무관한 순수 UI/스타일 작업이나, 이 세션에서 이미 검증한 DTO를 그대로 재사용하는 경우에는 사용하지 않는다.
---

# 백엔드 DTO 검증 (Backend DTO Check)

## 왜 중요한가

프론트의 응답 매핑 버그 대부분은 "백엔드 응답이 이럴 거야"라는 추측에서 나온다.
백엔드 레포(`C:\Work\animal-league-04-back`, 패키지 `com.animal_league.main`)에 실제 클래스가
Java로 정의되어 있으므로, **추측하지 말고 원본을 읽어 확인**한다.
특히 아래 함정들은 추측으로는 절대 못 잡는다.

## 검증 절차

### 1. 요청·응답 클래스를 직접 읽는다 — 두 군데를 모두 본다

이 레포는 요청 DTO와 응답 클래스가 **서로 다른 위치**에 있다. 한쪽만 뒤지면 반드시 놓친다.

| 무엇                            | 위치                                                                  |
| ------------------------------- | --------------------------------------------------------------------- |
| **요청 DTO** (+ 일부 응답 전용) | `src/main/java/com/animal_league/main/dto/*.java` (평탄)              |
| **응답 클래스**                 | `src/main/java/com/animal_league/main/controller/<도메인>/res/*.java` |
| 엔드포인트·HTTP 메서드          | `controller/<도메인>/*Controller.java`                                |
| DB 스키마(타입 확인용)          | `entity/*.java`                                                       |

**컨트롤러 base path 실측표** (`@RequestMapping` 기준 — 규칙이 일정하지 않으니 추측하지 말 것):

| 컨트롤러            | base path            |
| ------------------- | -------------------- |
| `AccountController` | `/api/user`          |
| `ScoreController`   | `/api/user/score`    |
| `ChatController`    | `/api/user/chat`     |
| `ShopController`    | `/api/user/item`     |
| `ItemController`    | `/api/user/item/use` |
| `StatsController`   | `/api/admin/stats`   |
| `LogController`     | `/api/logs`          |
| `InCheckController` | `/api/inchecklogs`   |
| `SseController`     | `/api/sse`           |

⚠️ `/api/logs`·`/api/inchecklogs`는 **`/api/user` 아래가 아니다.** 도메인 폴더명(`log`)과
URL(`/api/logs`)도 일치하지 않는다.

- ⚠️ **`dto/`만 보고 응답 구조를 단정하지 말 것.** 응답은 대부분 `controller/*/res/`에 있다
  (예: `LoadUserScoreResponse`, `UseItemScoreResponse`, `GetLoudSpeakersResponse`).
- ⚠️ **자격 증명은 절대 열지 말 것** — `src/main/resources/` 전체(특히 `application-*.yml`), 키스토어 등.
  DTO 검증은 `dto/` · `controller/` · `entity/` 범위에서만 한다.
- 백엔드 레포를 못 읽으면 `.claude/settings.json`의 `additionalDirectories`에 해당 디렉토리가
  열려 있는지 확인하고, 없으면 **좁게(해당 디렉토리만)** 열어달라고 사용자에게 요청한다.

### 2. 컨트롤러의 Swagger 예시를 먼저 본다 (이 레포 고유 지름길)

이 백엔드는 컨트롤러 메서드에 `@ApiResponses` + `@ExampleObject(value = """ ... """)`로
**실제 JSON 응답 예시를 리터럴로 박아두었다.** 클래스 필드를 조립해 추론하기 전에 이걸 먼저 읽으면
중첩 구조·배열 여부·키 표기를 한 번에 확인할 수 있다.

```
grep -A 30 'ExampleObject' controller/score/ScoreController.java
```

- 다만 **예시는 손으로 쓴 것이라 실제 클래스와 어긋날 수 있다.** 예시로 가설을 세우고,
  `res/*.java` 필드로 확정한다. 둘이 다르면 그 사실 자체를 사용자에게 보고한다.
- 백엔드가 떠 있으면 Swagger UI(`{BACKEND_ORIGIN}/swagger-ui.html`)로도 확인할 수 있다.

### 3. 알려진 함정 체크 (이 레포 고유)

- **필드 표기가 camelCase / snake_case로 섞여 있다.** `LoadUserScoreDto.score_id`,
  응답의 `score_id`는 **snake_case**인데 `AccountDto.createdIp`는 camelCase다.
  Lombok `@Data`가 만든 getter 이름이 그대로 JSON 키가 되므로 **Java 필드명 = JSON 키**다.
  → 프론트 타입에 `scoreId`로 적으면 조용히 `undefined`가 된다. **필드명을 눈으로 확인하고 그대로 옮긴다.**
- **응답이 envelope 없이 bare 배열/객체로 온다.** 상위 5명 조회는 `{ data: [...] }`가 아니라
  `[{ score_id, name, score }, ...]` 그대로다. `res.data`로 접근하지 말 것.
- **요청 DTO에 "서버가 주입하는 필드"가 섞여 있다.** `AccountDto.createdIp`에는
  `// 서버가 주입 (클라이언트 입력 아님)` 주석이 달려 있다. 이런 필드를 프론트에서 보내지 않는다.
  → 요청 DTO를 볼 땐 **주석과 `@NotBlank`/`@Size` 검증 애너테이션을 함께 읽는다.**
  검증 제약(`@Size(min = 2, max = 32)` 등)은 **프론트 폼 검증에 그대로 반영**해야 서버 400을 막는다.
- **`dto/` 평탄 폴더에는 요청 전용과 응답 전용 클래스가 섞여 있다** — 위치·이름만으로 방향을 알 수 없다.
  실측: `ItemDto`·`LoadUserScoreDto`·`UpdateUserScoreDto`·`AccountDto`는 **요청 전용**,
  `UserScore`·`SchoolScore`는 **응답 조립·SSE 푸시 전용**이다
  (`UserScore`는 `ScoreController`에서 builder로 조립되고 `@RequestBody`로는 어디서도 받지 않는다).
  요청·응답 양쪽에 쓰이는 클래스는 현재 **하나도 없다.**
  → 이름만 보고 방향을 단정하지 말고 컨트롤러 시그니처(`@RequestBody`/`@ModelAttribute` vs 반환 타입)로 확인한다.
- **⭐ 같은 DTO가 엔드포인트마다 전송 방식이 다르다.** 이 레포 최악의 함정이다.
  `LoadUserScoreDto`는 —
  - `ScoreController.loadUserScore`에서 **`@ModelAttribute`** → **query string**으로 보내야 하고
  - `ItemController.watergunLvl1/2/3`, `spreadWatergunLvl1/2/3`에서 **`@RequestBody`** → **JSON body**로 보내야 한다.

  **DTO 클래스만 보고 전송 방식을 단정하면 반드시 틀린다.** 매번 그 엔드포인트의
  **메서드 시그니처를 직접 열어** `@ModelAttribute`인지 `@RequestBody`인지 확인한다.
  잘못 보내면 400/415가 난다.

  ```
  grep -n "@ModelAttribute\|@RequestBody" controller/<도메인>/XxxController.java
  ```

- **엔드포인트 base path에 이미 `/api`가 들어 있다** (`@RequestMapping("/api/user/score")`).
  프론트의 `publicEnv.apiBaseUrl`도 기본값이 `/api`이므로 **`/api`를 두 번 붙이지 않도록** 주의한다
  (`api.get("/user/score/...")`가 맞다).
- **응답용 enum이 사실상 없다.** 백엔드 전체에서 Java enum은 `service/chat/ChatGuardService.ChatResult`
  하나뿐이고, 그마저 서비스 내부 판정용이라 응답 계약이 아니다. 즉 상태값은 문자열/숫자로 온다 —
  **`res/*.java`에서 실제 타입을 확인하고 프론트에서 유니온 타입으로 좁힌다.**
  나중에 응답용 enum이 생기면 **FE가 미러하는 맵은 보고된 값만이 아니라 enum 전체를 1:1 전수 대조**한다
  (enum 밖의 키는 전부 죽은 코드다).

> 새로 발견한 함정은 이 목록에 추가한다. 이 절이 이 스킬의 핵심 자산이다.

### 4. 매핑 위치 원칙 확인

`src/api/`는 백엔드 raw response를 **그대로 반환**한다.
키 이름 변경·한글화·derived 필드 같은 화면용 변환은 **훅/컴포넌트에서** 한다.
변환 코드를 API 계층에 넣지 않는다.

### 5. 타입 선언

확인한 DTO는 해당 `src/api/<도메인>.ts`에 TypeScript 타입으로 선언한다.
`any`를 쓰지 않는다. nullable 여부가 불확실하면 `| null`을 붙이고 그 근거를 주석으로 남긴다.

## 보고 형식

```
대상:       <엔드포인트 — METHOD /api/...>
컨트롤러:   <controller/<도메인>/XxxController.java — @RequestBody / @ModelAttribute 여부>
요청 DTO:   <dto/Xxx.java — 필드:타입 + 검증 제약 + 서버주입 필드>
응답 클래스: <controller/<도메인>/res/XxxResponse.java — 필드:타입 / 중첩·배열 구조>
함정 해당:  없음 / <예: score_id는 snake_case, bare 배열 응답>
매핑 위치:  API 계층 raw 반환 + 화면 단 변환 — 확인됨 / 위반(상세)
```

확인된 클래스와 실제 사용 코드가 어긋나면, **어디가 어떻게 다른지 먼저 알린 뒤** 수정한다.
백엔드가 틀린 것 같으면 임의로 프론트에서 우회하지 말고 사용자에게 보고한다.
