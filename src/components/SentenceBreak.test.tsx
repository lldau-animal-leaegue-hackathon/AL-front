import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SentenceBreak } from "./SentenceBreak";

describe("SentenceBreak", () => {
  it("문장기호 뒤 공백에서만 줄을 바꾼다", () => {
    const { container } = render(
      <p data-testid="p">
        <SentenceBreak text="첫 문장이다. 둘째 문장이다." />
      </p>,
    );
    expect(container.querySelectorAll("br")).toHaveLength(1);
    expect(screen.getByTestId("p")).toHaveTextContent("첫 문장이다.");
  });

  it("소수점은 공백이 없으므로 자르지 않는다", () => {
    const { container } = render(<SentenceBreak text="레티놀 1.5% 함유" />);
    expect(container.querySelectorAll("br")).toHaveLength(0);
  });
});
