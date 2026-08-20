import { Fragment } from "react";

/**
 * 문장 단위 줄바꿈 — 마침표(.) 뒤에서만 줄을 바꾼다(사용자 요청 2026-08-20).
 * 안내 문단이 뷰포트 폭 때문에 문장 중간에서 어색하게 접히는 대신,
 * 문장 하나가 한 줄(넘치면 그 안에서만 자연 줄바꿈)이 되게 한다.
 *
 * 정적 안내 문구(문단·빈 상태·힌트)에만 쓴다 — 버튼 라벨·칩처럼 짧은 텍스트나
 * 서버가 만든 동적 메시지에는 불필요하다.
 */
export function SentenceBreak({ text }: { text: string }) {
  // 문장기호(.!?) 뒤 공백에서만 자른다 — "1.5%" 같은 소수점은 공백이 없어 안 잘린다.
  const sentences = text.split(/(?<=[.!?])\s+/);
  return (
    <>
      {sentences.map((sentence, index) => (
        <Fragment key={index}>
          {sentence}
          {index < sentences.length - 1 && <br />}
        </Fragment>
      ))}
    </>
  );
}
