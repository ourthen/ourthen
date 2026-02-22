import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

describe("landing page", () => {
  it("shows the ourthen brand headline", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: /우리그때/i })).toBeInTheDocument();
  });

  it("shows a beta waitlist call-to-action", () => {
    render(<Home />);
    expect(screen.getByRole("link", { name: /베타 신청하기/i })).toHaveAttribute(
      "href",
      expect.stringMatching(/^mailto:/),
    );
  });

  it("explains the core puzzle loop", () => {
    render(<Home />);
    expect(screen.getByText(/약속 1개 = 퍼즐 1개/i)).toBeInTheDocument();
    expect(screen.getByText(/mentioned 한 번 \+ 댓글/i)).toBeInTheDocument();
  });
});
