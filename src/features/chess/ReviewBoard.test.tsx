import { render, screen, fireEvent, act, within } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReviewTimeline } from "@/features/chess/timeline";
import type { EngineScore, EngineInfo } from "@/features/chess/engine";
import type { QuickPassCompletedJob } from "@/features/chess/quick-pass-runner";
import type { QuickPassJob } from "@/features/chess/quick-pass-planner";
import { parsePgn } from "@/features/chess/pgn";
import { buildTimeline } from "@/features/chess/timeline";
import { buildClassificationMap, buildPerformance } from "@/features/chess/ReviewBoard";
import ReviewBoard from "@/features/chess/ReviewBoard";

vi.mock("react-chessboard", () => import("@/features/chess/__mocks__/react-chessboard"));

const { mockFullGameAnalysisPanel, lifecycleEvents } = vi.hoisted(() => {
  return {
    mockFullGameAnalysisPanel: vi.fn(),
    lifecycleEvents: vi.fn(),
  };
});

vi.mock("@/features/chess/full-game-analysis-panel", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  return {
    default: function MockFullGameAnalysisPanel(props: unknown) {
      React.useEffect(() => {
        lifecycleEvents("mount");
        return () => lifecycleEvents("cleanup");
      }, []);
      mockFullGameAnalysisPanel(props);
      const panelProps = props as {
        timeline?: { analysisEligible?: boolean };
        analysisState?: {
          start?: (timeline: unknown, limit: unknown, multiPv?: number) => boolean;
          cancel?: () => void;
          status?: string;
          totalJobs?: number;
          completedJobs?: number;
          currentJobId?: string | null;
          results?: readonly unknown[];
          error?: string | null;
        };
      };
      if (panelProps.timeline?.analysisEligible === false) {
        return (
          <p
            role="status"
            aria-live="polite"
            className="mt-4 text-sm text-zinc-600 dark:text-zinc-400"
          >
            Full-game analysis is available only for completed games.
          </p>
        );
      }
      return (
        <div data-testid="mock-full-game-analysis-panel">
          <button
            type="button"
            data-testid="analyze-button"
            onClick={() => {
              panelProps.analysisState?.start?.(
                panelProps.timeline,
                panelProps.timeline
              );
            }}
          >
            Analyze full game
          </button>
          {panelProps.analysisState?.status === "running" && (
            <button
              type="button"
              data-testid="cancel-button"
              onClick={() => panelProps.analysisState?.cancel?.()}
            >
              Cancel
            </button>
          )}
        </div>
      );
    },
  };
});

let { EngineControllerSpy, capturedController } = vi.hoisted(() => {
  return {
    EngineControllerSpy: vi.fn(),
    capturedController: null as { stop: ReturnType<typeof vi.fn> } | null,
  };
});

vi.mock("@/features/chess/engine-controller", () => ({
  EngineController: vi.fn(function MockEngineController() {
    EngineControllerSpy();
    const controller = {
      status: "ready",
      subscribe: vi.fn(() => () => {}),
      initialize: vi.fn(),
      dispose: vi.fn(),
      analyze: vi.fn(),
      stop: vi.fn(),
    };
    capturedController = controller;
    return controller;
  }),
}));

vi.mock("@/features/chess/engine-worker-factory", () => ({
  createStockfishWorkerFactory: vi.fn(() => () => ({
    postMessage: vi.fn(),
    terminate: vi.fn(),
    addMessageListener: vi.fn(),
    removeMessageListener: vi.fn(),
    addErrorListener: vi.fn(),
    removeErrorListener: vi.fn(),
  })),
}));

const { mockUseQuickPassAnalysis, mockAnalysisState } = vi.hoisted(() => {
  const mockAnalysisState: {
    status: string;
    error: string | null;
    totalJobs: number;
    completedJobs: number;
    currentJobId: string | null;
    results: QuickPassCompletedJob[];
    start: ReturnType<typeof vi.fn>;
    startCriticalPass: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
  } = {
    status: "idle",
    error: null,
    totalJobs: 0,
    completedJobs: 0,
    currentJobId: null,
    results: [],
    start: vi.fn(() => true),
    startCriticalPass: vi.fn(() => true),
    cancel: vi.fn(),
  };

  return {
    mockUseQuickPassAnalysis: vi.fn(() => {
      const [, setTick] = React.useState(0);
      const forceUpdate = () => setTick((tick: number) => tick + 1);

      return {
        ...mockAnalysisState,
        start: vi.fn(() => {
          EngineControllerSpy();
          capturedController = { stop: vi.fn() };
          mockAnalysisState.status = "running";
          mockAnalysisState.totalJobs = 4;
          mockAnalysisState.currentJobId = "job-1";
          forceUpdate();
          return true;
        }),
        startCriticalPass: mockAnalysisState.startCriticalPass,
        cancel: vi.fn(() => {
          mockAnalysisState.status = "cancelled";
          mockAnalysisState.currentJobId = null;
          forceUpdate();
        }),
      };
    }),
    mockAnalysisState,
  };
});

vi.mock("@/features/chess/use-quick-pass-analysis", () => ({
  useQuickPassAnalysis: mockUseQuickPassAnalysis,
}));

const SHORT_GAME = [
  '[Event "Test"]',
  '[White "Alice"]',
  '[Black "Bob"]',
  "",
  "1. e4 e5 2. Nf3 Nc6 *",
].join("\n");

function timelineOf(pgn: string): ReviewTimeline {
  const result = parsePgn(pgn);
  if (!result.ok) throw new Error("expected successful parse");
  return buildTimeline(result.value);
}

describe("ReviewBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedController = null;
    EngineControllerSpy = vi.fn();
    mockAnalysisState.status = "idle";
    mockAnalysisState.error = null;
    mockAnalysisState.totalJobs = 0;
    mockAnalysisState.completedJobs = 0;
    mockAnalysisState.currentJobId = null;
    mockAnalysisState.results = [];
    mockAnalysisState.start.mockClear();
    mockAnalysisState.startCriticalPass.mockClear();
    mockAnalysisState.cancel.mockClear();
  });

  afterEach(() => {
    vi.doUnmock("@/features/chess/engine-controller");
    vi.doUnmock("@/features/chess/engine-worker-factory");
  });

    const INITIAL = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const AFTER_E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";
    const AFTER_NF3 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2";
    const AFTER_NC6 = "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKBNR w KQkq - 2 3";

  it("renders the review chessboard region", () => {
    render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
    expect(
      screen.getByRole("region", { name: "Review chessboard" })
    ).toBeInTheDocument();
  });

  it("renders the evaluation graph inside the review graph block", () => {
    const { container } = render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
    const graph = container.querySelector('[data-testid="evaluation-graph"]');
    expect(graph?.parentElement?.getAttribute("class")).toBe(
      "review-graph-block w-full max-w-2xl"
    );
  });

  it("starts at ply 0 with the start position label", () => {
    render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
    expect(screen.getByTestId("review-ply-status")).toHaveTextContent(
      "Start position"
    );
    expect(screen.getByTestId("review-ply-count")).toHaveTextContent("(0 / 4)");
    const board = screen.getByTestId("chessboard");
    expect(board.getAttribute("data-position")).toBe(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    );
  });

  it("disables Start and Previous initially", () => {
    render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
    expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "End" })).toBeEnabled();
  });

  it("advances one ply with Next and updates SAN", () => {
    render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByTestId("review-ply-status")).toHaveTextContent("e4");
    expect(screen.getByTestId("review-ply-count")).toHaveTextContent("(1 / 4)");
    expect(screen.getByTestId("chessboard").getAttribute("data-position")).toBe(
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
    );
  });

  it("returns one ply with Previous", () => {
    render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByTestId("review-ply-count")).toHaveTextContent("(2 / 4)");
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByTestId("review-ply-count")).toHaveTextContent("(1 / 4)");
    expect(screen.getByTestId("review-ply-status")).toHaveTextContent("e4");
  });

  it("reaches the final FEN with End and disables Next/End", () => {
    render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
    fireEvent.click(screen.getByRole("button", { name: "End" }));
    expect(screen.getByTestId("review-ply-count")).toHaveTextContent("(4 / 4)");
    expect(screen.getByTestId("review-ply-status")).toHaveTextContent("Nc6");
    expect(screen.getByTestId("chessboard").getAttribute("data-position")).toBe(
      "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3"
    );
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "End" })).toBeDisabled();
  });

  it("returns to ply 0 with Start", () => {
    render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
    fireEvent.click(screen.getByRole("button", { name: "End" }));
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(screen.getByTestId("review-ply-count")).toHaveTextContent("(0 / 4)");
    expect(screen.getByTestId("review-ply-status")).toHaveTextContent(
      "Start position"
    );
  });

  it("never navigates beyond the timeline boundaries", () => {
    render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
    fireEvent.click(screen.getByRole("button", { name: "End" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByTestId("review-ply-count")).toHaveTextContent("(4 / 4)");
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByTestId("review-ply-count")).toHaveTextContent("(0 / 4)");
  });

  it("flip changes orientation without changing ply or FEN", () => {
    render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    const before = screen.getByTestId("chessboard").getAttribute("data-position");
    fireEvent.click(screen.getByRole("button", { name: "Flip board" }));
    const board = screen.getByTestId("chessboard");
    expect(board.getAttribute("data-orientation")).toBe("black");
    expect(board.getAttribute("data-position")).toBe(before);
    expect(screen.getByTestId("review-ply-count")).toHaveTextContent("(1 / 4)");
  });

  it("accepts user moves", () => {
    render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
    expect(screen.getByTestId("simulate-drop")).toBeInTheDocument();
    expect(screen.getByTestId("chessboard").getAttribute("data-position")).toBe(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    );
  });

  it("resets to ply 0 when the timeline prop changes", () => {
    const first = timelineOf(SHORT_GAME);
    const { rerender } = render(<ReviewBoard timeline={first} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByTestId("review-ply-count")).toHaveTextContent("(1 / 4)");

    const zero = timelineOf('[Event "Empty"]\n\n');
    rerender(<ReviewBoard timeline={zero} />);
    expect(screen.getByTestId("review-ply-count")).toHaveTextContent("(0 / 0)");
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "End" })).toBeDisabled();
  });

  it("preserves ply and orientation on rerender with an equivalent rebuilt timeline", () => {
    const first = timelineOf(SHORT_GAME);
    const { rerender } = render(<ReviewBoard timeline={first} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByTestId("review-ply-count")).toHaveTextContent("(2 / 4)");
    fireEvent.click(screen.getByRole("button", { name: "Flip board" }));

    const equivalent = timelineOf(SHORT_GAME);
    expect(equivalent).not.toBe(first);
    rerender(<ReviewBoard timeline={equivalent} />);
    expect(screen.getByTestId("review-ply-count")).toHaveTextContent("(2 / 4)");
    expect(screen.getByTestId("review-ply-status")).toHaveTextContent("e5");
    expect(screen.getByTestId("chessboard").getAttribute("data-orientation")).toBe(
      "black"
    );
  });

  it("resets to ply 0 with orientation preserved on a genuinely different timeline", () => {
    const first = timelineOf(SHORT_GAME);
    const { rerender } = render(<ReviewBoard timeline={first} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Flip board" }));
    expect(screen.getByTestId("review-ply-count")).toHaveTextContent("(1 / 4)");
    expect(screen.getByTestId("chessboard").getAttribute("data-orientation")).toBe(
      "black"
    );

    const different = timelineOf('[Event "Other"]\n\n1. d4 d5 *');
    expect(different).not.toBe(first);
    rerender(<ReviewBoard timeline={different} />);
    expect(screen.getByTestId("review-ply-count")).toHaveTextContent("(0 / 2)");
    expect(screen.getByTestId("review-ply-status")).toHaveTextContent(
      "Start position"
    );
    expect(screen.getByTestId("chessboard").getAttribute("data-orientation")).toBe(
      "black"
    );
  });

  it("mount creates zero controllers and creates one after analyzing", () => {
    const eligibleTimeline = { ...timelineOf(SHORT_GAME), analysisEligible: true };
    render(<ReviewBoard timeline={eligibleTimeline} />);
    expect(EngineControllerSpy).toHaveBeenCalledTimes(0);
    fireEvent.click(screen.getByTestId("analyze-button"));
    expect(EngineControllerSpy).toHaveBeenCalledTimes(1);
  });

  it("navigating plies creates no second EngineController", () => {
    render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
    EngineControllerSpy.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "End" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(EngineControllerSpy).not.toHaveBeenCalled();
  });

  it("flipping the board creates no second EngineController", () => {
    render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
    EngineControllerSpy.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Flip board" }));
    expect(EngineControllerSpy).not.toHaveBeenCalled();
  });

  it("rendering ReviewBoard with eligible timeline then ineligible does not create second EngineController", () => {
    const timeline = { ...timelineOf(SHORT_GAME), analysisEligible: true };
    const ineligibleTimeline = { ...timeline, analysisEligible: false };
    const { rerender } = render(<ReviewBoard timeline={timeline} />);
    expect(EngineControllerSpy).toHaveBeenCalledTimes(0);
    fireEvent.click(screen.getByTestId("analyze-button"));
    expect(EngineControllerSpy).toHaveBeenCalledTimes(1);
    EngineControllerSpy.mockClear();
    rerender(<ReviewBoard timeline={ineligibleTimeline} />);
    expect(EngineControllerSpy).not.toHaveBeenCalled();
  });

  it("losing eligibility during run does not duplicate cancel", async () => {
    const timeline = timelineOf(SHORT_GAME);
    const eligibleTimeline = { ...timeline, analysisEligible: true };
    const ineligibleTimeline = { ...timeline, analysisEligible: false };
    const { rerender } = render(<ReviewBoard timeline={eligibleTimeline} />);
    fireEvent.click(screen.getByTestId("analyze-button"));
    expect(await screen.findByTestId("cancel-button")).toBeDefined();
    capturedController?.stop.mockClear();
    rerender(<ReviewBoard timeline={ineligibleTimeline} />);
    expect(capturedController?.stop).toHaveBeenCalledTimes(0);
  });

  it("passes analysisState from hook to panel", () => {
    render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
    expect(mockFullGameAnalysisPanel).toHaveBeenLastCalledWith(
      expect.objectContaining({
        analysisState: expect.objectContaining({
          status: expect.any(String),
          totalJobs: expect.any(Number),
          start: expect.any(Function),
          cancel: expect.any(Function),
        }),
      })
    );
  });

  describe("FullGameAnalysisPanel integration", () => {
    it("renders FullGameAnalysisPanel with timeline, current ply, fixed limit, multiPv 3, and analysisState", () => {
      render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
      expect(mockFullGameAnalysisPanel).toHaveBeenLastCalledWith(
        expect.objectContaining({
          timeline: expect.any(Object),
          currentPly: 0,
          limit: { kind: "depth", value: 10 },
          multiPv: 3,
        })
      );
    });

    it("updates currentPly on navigation without remounting", () => {
      render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);

      expect(lifecycleEvents).toHaveBeenCalledWith("mount");
      lifecycleEvents.mockClear();

      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      expect(mockFullGameAnalysisPanel).toHaveBeenLastCalledWith(
        expect.objectContaining({
          currentPly: 1,
        })
      );

      expect(lifecycleEvents).not.toHaveBeenCalledWith("cleanup");
      expect(lifecycleEvents).not.toHaveBeenCalledWith("mount");
    });

    it("does not change timeline or currentPly when flipped", () => {
      render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);

      fireEvent.click(screen.getByRole("button", { name: "Flip board" }));
      expect(mockFullGameAnalysisPanel).toHaveBeenLastCalledWith(
        expect.objectContaining({
          timeline: expect.any(Object),
          currentPly: 0,
        })
      );
    });

    it("resets to initial ply on new timeline without remounting panel identity", () => {
      const first = timelineOf(SHORT_GAME);
      const { rerender } = render(<ReviewBoard timeline={first} />);

      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      lifecycleEvents.mockClear();

      const second = timelineOf('[Event "Other"]\n\n1. d4 d5 *');
      rerender(<ReviewBoard timeline={second} />);

      expect(mockFullGameAnalysisPanel).toHaveBeenLastCalledWith(
        expect.objectContaining({
          timeline: second,
          currentPly: 0,
        })
      );
      expect(lifecycleEvents).not.toHaveBeenCalledWith("cleanup");
      expect(lifecycleEvents).not.toHaveBeenCalledWith("mount");
    });

    it("renders completed-games-only messaging for ineligible timelines", () => {
      const timeline = timelineOf(SHORT_GAME);
      const ineligibleTimeline = { ...timeline, analysisEligible: false };
      render(<ReviewBoard timeline={ineligibleTimeline} />);
      expect(
        screen.getByText("Full-game analysis is available only for completed games.")
      ).toBeVisible();
      expect(
        screen.queryByRole("button", { name: "Analyze full game" })
      ).not.toBeInTheDocument();
    });

    it("renders FullGameAnalysisPanel without a portal host inside the review rail", () => {
      render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
      const lastCall = mockFullGameAnalysisPanel.mock.lastCall?.[0] as
        | { controlsHost?: unknown }
        | undefined;
      expect(lastCall?.controlsHost ?? null).toBeNull();
      const rail = screen.getByRole("complementary", { name: "Review rail" });
      expect(rail).toBeInTheDocument();
    });

    it("renders the move list with exact button count and accessible names", () => {
      render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
      expect(screen.getByTestId("review-ply-status")).toBeInTheDocument();
      const moveButtons = screen.getAllByRole("button", { name: /1\. e4|1\.\.\. e5|2\. Nf3|2\.\.\. Nc6/ });
      expect(moveButtons).toHaveLength(4);
      expect(moveButtons[0]).toHaveAccessibleName("1. e4");
      expect(moveButtons[3]).toHaveAccessibleName("2... Nc6");
    });

    it("exposes the move list container with accessible name", () => {
      render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
      const list = screen.getByRole("list", { name: "Move list" });
      expect(list).toBeInTheDocument();
      const items = list.querySelectorAll("li");
      expect(items).toHaveLength(4);
    });

    it("clicking a move in the list navigates to that ply", () => {
      render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
      const nf3Button = screen.getByRole("button", { name: "2. Nf3" });
      fireEvent.click(nf3Button);
      expect(screen.getByTestId("review-ply-status")).toHaveTextContent("Nf3");
      expect(screen.getByTestId("review-ply-count")).toHaveTextContent("(3 / 4)");
    });

    it("preserves the review-ply-status element after integrating the move list", () => {
      render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      expect(screen.getByTestId("review-ply-status")).toHaveTextContent("e4");
      expect(screen.getByTestId("review-ply-count")).toHaveTextContent("(1 / 4)");
    });
  });

  describe("buildClassificationMap", () => {
    function makeJob(ply: number, fen: string): QuickPassJob {
      return {
        id: `qp-${ply}`,
        phase: "quick-pass",
        ply,
        fen,
        limit: { kind: "depth", value: 14 },
      };
    }

    function makeResult(
      job: QuickPassJob,
      info: EngineInfo | null,
    ): QuickPassCompletedJob {
      return {
        job,
        info,
        bestMove: info ? { move: "e2e4", ponder: null } : null,
        candidateLines: info ? [{ rank: 1, info }] : [],
      };
    }

    function makeScore(value: number): EngineScore {
      return { type: "cp", value, perspective: "white" };
    }

    function shortGameTimeline(): ReviewTimeline {
      return {
        steps: [
          { ply: 0, fen: INITIAL, move: null },
          { ply: 1, fen: AFTER_E4, move: { san: "e4", color: "w", from: "e2", to: "e4", before: INITIAL, after: AFTER_E4 } },
          { ply: 2, fen: AFTER_E5, move: { san: "e5", color: "b", from: "e7", to: "e5", before: AFTER_E4, after: AFTER_E5 } },
          { ply: 3, fen: AFTER_NF3, move: { san: "Nf3", color: "w", from: "g1", to: "f3", before: AFTER_E5, after: AFTER_NF3 } },
          { ply: 4, fen: AFTER_NC6, move: { san: "Nc6", color: "b", from: "b8", to: "c6", before: AFTER_NF3, after: AFTER_NC6 } },
        ],
        totalPlies: 4,
        initialFen: INITIAL,
        finalFen: AFTER_NC6,
        analysisEligible: true,
      };
    }

    function resultsFor(
      timeline: ReviewTimeline,
      scores: Array<{ ply: number; score: EngineScore }>,
    ): QuickPassCompletedJob[] {
      return scores.map((s) => {
        const job = makeJob(s.ply, timeline.steps[s.ply].fen);
        return makeResult(job, {
          depth: 14,
          score: s.score,
          pv: ["e2e4"],
        });
      });
    }

    it("returns an empty map when given empty results", () => {
      const map = buildClassificationMap(shortGameTimeline(), []);
      expect(map.size).toBe(0);
    });

    it("returns a map keyed by ply with at least two exact classification pairs", () => {
      const timeline = shortGameTimeline();
      const results = resultsFor(timeline, [
        { ply: 0, score: makeScore(100) },
        { ply: 1, score: makeScore(100) },
        { ply: 2, score: makeScore(150) },
        { ply: 3, score: makeScore(130) },
        { ply: 4, score: makeScore(130) },
      ]);
      const map = buildClassificationMap(timeline, results);
      expect(map.get(1)).toBe("best");
      expect(map.get(2)).toBe("good");
      expect(map.get(3)).toBe("excellent");
      expect(map.get(4)).toBe("best");
      expect(map.size).toBe(4);
    });

    it("returns an empty map when buildMoveAssessments fails", () => {
      const timeline: ReviewTimeline = {
        steps: [
          { ply: 0, fen: INITIAL, move: null },
          { ply: 1, fen: AFTER_E4, move: null },
        ],
        totalPlies: 1,
        initialFen: INITIAL,
        finalFen: AFTER_E4,
        analysisEligible: true,
      };
      const results = [
        makeResult(
          makeJob(1, AFTER_E4),
          { depth: 14, score: { type: "cp", value: 100, perspective: "white" }, pv: ["e2e4"] }
        ),
      ];
      const map = buildClassificationMap(timeline, results);
      expect(map.size).toBe(0);
    });

    it("excludes entries classified as unclassified from the map", () => {
      const timeline = shortGameTimeline();
      const results = resultsFor(timeline, [
        { ply: 0, score: { type: "cp", value: 100, perspective: "side-to-move", bound: "lowerbound" } },
        { ply: 1, score: makeScore(100) },
        { ply: 2, score: makeScore(100) },
        { ply: 3, score: makeScore(100) },
        { ply: 4, score: makeScore(100) },
      ]);
      const map = buildClassificationMap(timeline, results);
      expect(map.has(1)).toBe(false);
      expect(map.has(2)).toBe(true);
      expect(map.has(3)).toBe(true);
      expect(map.has(4)).toBe(true);
      expect(map.size).toBe(3);
    });
  });

  describe("buildPerformance and summary wiring", () => {
    function makeScore(value: number): EngineScore {
      return { type: "cp", value, perspective: "white" };
    }

    function makeJob(ply: number, fen: string): QuickPassJob {
      return {
        id: `qp-${ply}`,
        phase: "quick-pass",
        ply,
        fen,
        limit: { kind: "depth", value: 14 },
      };
    }

    function makeResult(
      job: QuickPassJob,
      info: EngineInfo | null,
    ): QuickPassCompletedJob {
      return {
        job,
        info,
        bestMove: info ? { move: "e2e4", ponder: null } : null,
        candidateLines: info ? [{ rank: 1, info }] : [],
      };
    }

    function shortGameTimeline(): ReviewTimeline {
      return {
        steps: [
          { ply: 0, fen: INITIAL, move: null },
          { ply: 1, fen: AFTER_E4, move: { san: "e4", color: "w", from: "e2", to: "e4", before: INITIAL, after: AFTER_E4 } },
          { ply: 2, fen: AFTER_E5, move: { san: "e5", color: "b", from: "e7", to: "e5", before: AFTER_E4, after: AFTER_E5 } },
          { ply: 3, fen: AFTER_NF3, move: { san: "Nf3", color: "w", from: "g1", to: "f3", before: AFTER_E5, after: AFTER_NF3 } },
          { ply: 4, fen: AFTER_NC6, move: { san: "Nc6", color: "b", from: "b8", to: "c6", before: AFTER_NF3, after: AFTER_NC6 } },
        ],
        totalPlies: 4,
        initialFen: INITIAL,
        finalFen: AFTER_NC6,
        analysisEligible: true,
      };
    }

    function resultsFor(
      timeline: ReviewTimeline,
      scores: Array<{ ply: number; score: EngineScore }>,
    ): QuickPassCompletedJob[] {
      return scores.map((s) => {
        const job = makeJob(s.ply, timeline.steps[s.ply].fen);
        return makeResult(job, {
          depth: 14,
          score: s.score,
          pv: ["e2e4"],
        });
      });
    }

    it("renders run-an-analysis message and no element with aria-label Game performance when results are empty", () => {
      const timeline = shortGameTimeline();
      render(<ReviewBoard timeline={timeline} />);
      expect(screen.getByText(/run a full-game analysis/i)).toBeInTheDocument();
      expect(screen.queryByRole("region", { name: "Game performance" })).toBeNull();
    });

    it("returns null for an empty results array in buildPerformance", () => {
      expect(buildPerformance(shortGameTimeline(), [])).toBeNull();
    });

    it("returns an object with white and black keys for a valid timeline and results pair in buildPerformance", () => {
      const timeline = shortGameTimeline();
      const results = resultsFor(timeline, [
        { ply: 0, score: makeScore(100) },
        { ply: 1, score: makeScore(100) },
        { ply: 2, score: makeScore(150) },
        { ply: 3, score: makeScore(130) },
        { ply: 4, score: makeScore(130) },
      ]);
      const perf = buildPerformance(timeline, results);
      expect(perf).not.toBeNull();
      expect(perf?.white.mover).toBe("white");
      expect(perf?.black.mover).toBe("black");
    });

    it("renders Game performance region when analysis results are populated", () => {
      const timeline = shortGameTimeline();
      const results = resultsFor(timeline, [
        { ply: 0, score: makeScore(100) },
        { ply: 1, score: makeScore(100) },
        { ply: 2, score: makeScore(150) },
        { ply: 3, score: makeScore(130) },
        { ply: 4, score: makeScore(130) },
      ]);
      mockAnalysisState.status = "completed";
      mockAnalysisState.results = results;
      render(<ReviewBoard timeline={timeline} />);
      expect(screen.getByRole("region", { name: "Game performance" })).toBeInTheDocument();
    });
  });

  describe("evaluation graph and bar", () => {
    function makeJob(ply: number, fen: string): QuickPassJob {
      return {
        id: `qp-${ply}`,
        phase: "quick-pass",
        ply,
        fen,
        limit: { kind: "depth", value: 14 },
      };
    }

    function makeResult(
      job: QuickPassJob,
      info: EngineInfo | null,
    ): QuickPassCompletedJob {
      return {
        job,
        info,
        bestMove: info ? { move: "e2e4", ponder: null } : null,
        candidateLines: info ? [{ rank: 1, info }] : [],
      };
    }

    function makeScore(value: number): EngineScore {
      return { type: "cp", value, perspective: "white" };
    }

    beforeEach(() => {
      mockAnalysisState.status = "idle";
      mockAnalysisState.error = null;
      mockAnalysisState.totalJobs = 0;
      mockAnalysisState.completedJobs = 0;
      mockAnalysisState.currentJobId = null;
      mockAnalysisState.results = [];
      mockAnalysisState.start.mockClear();
      mockAnalysisState.cancel.mockClear();
    });

    it("renders evaluation bar with unavailable aria-label before analysis", () => {
      render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
      expect(screen.getByTestId("evaluation-bar")).toHaveAttribute(
        "aria-label",
        "Evaluation unavailable"
      );
    });

    it("before analysis the graph renders with no segments, and the empty state is not used because every timeline step yields a point", () => {
      render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
      expect(screen.getByTestId("evaluation-graph")).toBeInTheDocument();
      expect(screen.queryAllByTestId("evaluation-graph-segment")).toHaveLength(0);
      expect(screen.queryAllByTestId("evaluation-graph-marker")).toHaveLength(0);
      expect(screen.queryByTestId("evaluation-graph-empty")).not.toBeInTheDocument();
    });

    it("renders exactly one evaluation-graph-segment with analysis results", () => {
      const timeline = timelineOf(SHORT_GAME);
      const results = [
        makeResult(
          makeJob(1, timeline.steps[1].fen),
          { depth: 14, multipv: 1, nodes: 1000, timeMs: 100, score: makeScore(100), pv: ["e2e4"] }
        ),
        makeResult(
          makeJob(2, timeline.steps[2].fen),
          { depth: 14, multipv: 1, nodes: 1000, timeMs: 100, score: makeScore(200), pv: ["e7e5"] }
        ),
      ];
      mockAnalysisState.status = "completed";
      mockAnalysisState.results = results;

      render(<ReviewBoard timeline={timeline} />);
      const segments = screen.queryAllByTestId("evaluation-graph-segment");
      const markers = screen.queryAllByTestId("evaluation-graph-marker");
      expect(segments).toHaveLength(1);
      expect(markers).toHaveLength(2);
    });

    it("clicking graph overlay button with data-ply 2 navigates the board", () => {
      const timeline = timelineOf(SHORT_GAME);
      const results = [
        makeResult(
          makeJob(0, timeline.steps[0].fen),
          { depth: 14, multipv: 1, nodes: 1000, timeMs: 100, score: makeScore(0), pv: [] }
        ),
        makeResult(
          makeJob(1, timeline.steps[1].fen),
          { depth: 14, multipv: 1, nodes: 1000, timeMs: 100, score: makeScore(100), pv: ["e2e4"] }
        ),
        makeResult(
          makeJob(2, timeline.steps[2].fen),
          { depth: 14, multipv: 1, nodes: 1000, timeMs: 100, score: makeScore(200), pv: ["e7e5"] }
        ),
        makeResult(
          makeJob(3, timeline.steps[3].fen),
          { depth: 14, multipv: 1, nodes: 1000, timeMs: 100, score: makeScore(150), pv: ["g1f3"] }
        ),
      ];
      mockAnalysisState.status = "completed";
      mockAnalysisState.results = results;

      render(<ReviewBoard timeline={timeline} />);
      fireEvent.click(screen.getByLabelText("Go to ply 2, e5"));
      expect(screen.getByTestId("review-ply-count")).toHaveTextContent("(2 / 4)");
    });

    it("graph points attribute is unchanged by flipping the board", () => {
      const timeline = timelineOf(SHORT_GAME);
      const results = [
        makeResult(
          makeJob(0, timeline.steps[0].fen),
          { depth: 14, multipv: 1, nodes: 1000, timeMs: 100, score: makeScore(0), pv: [] }
        ),
        makeResult(
          makeJob(1, timeline.steps[1].fen),
          { depth: 14, multipv: 1, nodes: 1000, timeMs: 100, score: makeScore(100), pv: ["e2e4"] }
        ),
      ];
      mockAnalysisState.status = "completed";
      mockAnalysisState.results = results;

      render(<ReviewBoard timeline={timeline} />);
      const polyline = screen.getByTestId("evaluation-graph-segment");
      const beforePoints = polyline.getAttribute("points");
      fireEvent.click(screen.getByRole("button", { name: "Flip board" }));
      expect(polyline.getAttribute("points")).toBe(beforePoints);
    });

    it("evaluation bar aria-label changes on navigation", () => {
      const timeline = timelineOf(SHORT_GAME);
      const results = [
        makeResult(
          makeJob(0, timeline.steps[0].fen),
          { depth: 14, multipv: 1, nodes: 1000, timeMs: 100, score: makeScore(0), pv: [] }
        ),
        makeResult(
          makeJob(1, timeline.steps[1].fen),
          { depth: 14, multipv: 1, nodes: 1000, timeMs: 100, score: makeScore(100), pv: ["e2e4"] }
        ),
      ];
      mockAnalysisState.status = "completed";
      mockAnalysisState.results = results;

      render(<ReviewBoard timeline={timeline} />);
      expect(screen.getByTestId("evaluation-bar")).toHaveAttribute(
        "aria-label",
        "Evaluation: equal"
      );
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      expect(screen.getByTestId("evaluation-bar")).toHaveAttribute(
        "aria-label",
        "Evaluation: White ahead by 1.0 pawns"
      );
    });

    it("overlay button for ply 1 includes the move san", () => {
      const timeline = timelineOf(SHORT_GAME);
      const results = [
        makeResult(
          makeJob(0, timeline.steps[0].fen),
          { depth: 14, multipv: 1, nodes: 1000, timeMs: 100, score: makeScore(0), pv: [] }
        ),
        makeResult(
          makeJob(1, timeline.steps[1].fen),
          { depth: 14, multipv: 1, nodes: 1000, timeMs: 100, score: makeScore(100), pv: ["e2e4"] }
        ),
        makeResult(
          makeJob(2, timeline.steps[2].fen),
          { depth: 14, multipv: 1, nodes: 1000, timeMs: 100, score: makeScore(200), pv: ["e7e5"] }
        ),
        makeResult(
          makeJob(3, timeline.steps[3].fen),
          { depth: 14, multipv: 1, nodes: 1000, timeMs: 100, score: makeScore(150), pv: ["g1f3"] }
        ),
      ];
      mockAnalysisState.status = "completed";
      mockAnalysisState.results = results;

      render(<ReviewBoard timeline={timeline} />);
      expect(screen.getByLabelText("Go to ply 1, e4")).toBeInTheDocument();
    });

    it("overlay button for ply 0 has no san suffix", () => {
      const timeline = timelineOf(SHORT_GAME);
      const results = [
        makeResult(
          makeJob(0, timeline.steps[0].fen),
          { depth: 14, multipv: 1, nodes: 1000, timeMs: 100, score: makeScore(0), pv: [] }
        ),
        makeResult(
          makeJob(1, timeline.steps[1].fen),
          { depth: 14, multipv: 1, nodes: 1000, timeMs: 100, score: makeScore(100), pv: ["e2e4"] }
        ),
      ];
      mockAnalysisState.status = "completed";
      mockAnalysisState.results = results;

      render(<ReviewBoard timeline={timeline} />);
      expect(screen.getByLabelText("Go to ply 0")).toBeInTheDocument();
    });
  });

  describe("review rail", () => {
    it("renders the explanation and analysis inside the review rail", () => {
      render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
      const rail = screen.getByRole("complementary", { name: "Review rail" });
      expect(
        within(rail).getByRole("region", { name: "Move explanation" })
      ).toBeInTheDocument();
      expect(mockFullGameAnalysisPanel).toHaveBeenCalled();
    });
  });

  describe("keyboard timeline navigation", () => {
    it("ArrowRight advances one ply from inside the review region", () => {
      render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
      fireEvent.keyDown(screen.getByRole("group", { name: "Timeline navigation" }), {
        key: "ArrowRight",
      });
      expect(screen.getByTestId("review-ply-count")).toHaveTextContent("(1 / 4)");
    });

    it("ArrowLeft steps back one ply", () => {
      render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.keyDown(screen.getByRole("group", { name: "Timeline navigation" }), {
        key: "ArrowLeft",
      });
      expect(screen.getByTestId("review-ply-count")).toHaveTextContent("(0 / 4)");
    });

    it("Home jumps to the start and End jumps to the final position", () => {
      render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
      fireEvent.keyDown(screen.getByRole("group", { name: "Timeline navigation" }), {
        key: "End",
      });
      expect(screen.getByTestId("review-ply-count")).toHaveTextContent("(4 / 4)");
      fireEvent.keyDown(screen.getByRole("group", { name: "Timeline navigation" }), {
        key: "Home",
      });
      expect(screen.getByTestId("review-ply-count")).toHaveTextContent("(0 / 4)");
    });
  });

  it("the board shows the game position when not exploring", () => {
    render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
    expect(screen.getByTestId("chessboard").getAttribute("data-position")).toBe(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    );
  });

  it("allowDragging is true on the board", () => {
    render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
    expect(screen.getByTestId("simulate-drop")).toBeInTheDocument();
    expect(screen.getByTestId("chessboard")).toHaveAttribute(
      "data-allow-dragging",
      "true"
    );
  });

  it("a legal drop changes the board position to the resulting fen", () => {
    render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
    fireEvent.click(screen.getByTestId("simulate-drop"));
    expect(screen.getByTestId("chessboard").getAttribute("data-position")).toBe(
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
    );
  });

  it("a legal drop shows that san in the explorer breadcrumb", () => {
    render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
    fireEvent.click(screen.getByTestId("simulate-drop"));
    expect(screen.getByTestId("explorer-breadcrumb")).toHaveTextContent("e4");
  });

  it("an illegal drop leaves the board position unchanged", () => {
    render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
    const before = screen.getByTestId("chessboard").getAttribute("data-position");
    fireEvent.click(screen.getByTestId("simulate-illegal-drop"));
    expect(screen.getByTestId("chessboard").getAttribute("data-position")).toBe(before);
  });

  it("an illegal drop leaves the explorer at the game position", () => {
    render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
    fireEvent.click(screen.getByTestId("simulate-illegal-drop"));
    expect(screen.getByTestId("explorer-breadcrumb")).toHaveTextContent(
      "Exploring from the game position"
    );
    expect(screen.queryAllByTestId("explorer-crumb")).toHaveLength(0);
  });

  it("two legal drops show both sans in the breadcrumb in order", () => {
    render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
    fireEvent.click(screen.getByTestId("simulate-drop"));
    fireEvent.click(screen.getByTestId("simulate-second-drop"));
    expect(screen.getByTestId("explorer-breadcrumb")).toHaveTextContent("e4 e5");
  });

  it("clicking Back returns the board to the previous position", () => {
    render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
    fireEvent.click(screen.getByTestId("simulate-drop"));
    expect(screen.getByTestId("chessboard").getAttribute("data-position")).toBe(
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
    );
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByTestId("chessboard").getAttribute("data-position")).toBe(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    );
  });

  it("clicking Return to game restores the game position", () => {
    render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
    fireEvent.click(screen.getByTestId("simulate-drop"));
    fireEvent.click(screen.getByRole("button", { name: "Return to game" }));
    expect(screen.getByTestId("chessboard").getAttribute("data-position")).toBe(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    );
  });

  it("navigating with the Next control while exploring restores the game position", () => {
    render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
    fireEvent.click(screen.getByTestId("simulate-drop"));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByTestId("explorer-breadcrumb")).toHaveTextContent(
      "Exploring from the game position"
    );
  });

  describe("engine arrows", () => {
    it("board receives no arrows before any analysis exists", () => {
      render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
      expect(screen.getByTestId("chessboard").getAttribute("data-arrows")).toBe("");
    });

    it("board clears arrows when the position changes", () => {
      render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
      expect(screen.getByTestId("chessboard").getAttribute("data-clear-arrows-on-position-change")).toBe("true");
    });

    it("board shows engine arrows for the analysed position", () => {
      const timeline = timelineOf(SHORT_GAME);
      const info1 = { depth: 14, multipv: 1, nodes: 1000, timeMs: 100, score: { type: "cp", value: 100, perspective: "white" } as const, pv: ["e2e4"] };
      const info2 = { depth: 14, multipv: 1, nodes: 1000, timeMs: 100, score: { type: "cp", value: 100, perspective: "white" } as const, pv: ["d2d4"] };
      mockAnalysisState.status = "completed";
      mockAnalysisState.results = [
        {
          job: { id: `qp-0`, phase: "quick-pass", ply: 0, fen: timeline.initialFen, limit: { kind: "depth", value: 14 } },
          info: info1,
          bestMove: { move: "e2e4", ponder: null },
          candidateLines: [
            { rank: 1, info: info1 },
            { rank: 2, info: info2 },
          ],
        },
      ];
      render(<ReviewBoard timeline={timeline} />);
      expect(screen.getByTestId("chessboard").getAttribute("data-arrows")).toBe("e2>e4:#22c55e,d2>d4:#3b82f6");
    });

    it("legend is hidden before any analysis exists", () => {
      render(<ReviewBoard timeline={timelineOf(SHORT_GAME)} />);
      expect(screen.queryByTestId("arrow-legend")).toBeNull();
    });

    it("legend labels each engine suggestion", () => {
      const timeline = timelineOf(SHORT_GAME);
      const info1 = { depth: 14, multipv: 1, nodes: 1000, timeMs: 100, score: { type: "cp", value: 100, perspective: "white" } as const, pv: ["e2e4"] };
      const info2 = { depth: 14, multipv: 1, nodes: 1000, timeMs: 100, score: { type: "cp", value: 100, perspective: "white" } as const, pv: ["d2d4"] };
      mockAnalysisState.status = "completed";
      mockAnalysisState.results = [
        {
          job: { id: `qp-0`, phase: "quick-pass", ply: 0, fen: timeline.initialFen, limit: { kind: "depth", value: 14 } },
          info: info1,
          bestMove: { move: "e2e4", ponder: null },
          candidateLines: [
            { rank: 1, info: info1 },
            { rank: 2, info: info2 },
          ],
        },
      ];
      render(<ReviewBoard timeline={timeline} />);
      const items = screen.getAllByTestId("arrow-legend-item");
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveTextContent("Best");
      expect(items[1]).toHaveTextContent("2nd best");
    });
  });

  describe("move explanation panel", () => {
    it("renders move explanation panel region", () => {
      const timeline = timelineOf(SHORT_GAME);
      render(<ReviewBoard timeline={timeline} />);
      expect(
        screen.getByRole("region", { name: "Move explanation" })
      ).toBeInTheDocument();
    });

    it("shows explanation for selected ply when at start position", () => {
      const timeline = timelineOf(SHORT_GAME);
      render(<ReviewBoard timeline={timeline} />);
      expect(
        screen.getByText("Select a move to see its explanation.")
      ).toBeInTheDocument();
    });

    it("navigating to another ply updates explanation panel text", () => {
      const timeline = timelineOf(SHORT_GAME);
      render(<ReviewBoard timeline={timeline} />);
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      expect(
        screen.queryByText("Select a move to see its explanation.")
      ).toBeNull();
      expect(screen.getByRole("heading", { name: "e4" })).toBeInTheDocument();
    });
  });

  describe("deep critical pass", () => {
    function makeJob(ply: number, fen: string): QuickPassJob {
      return {
        id: `qp-${ply}`,
        phase: "quick-pass",
        ply,
        fen,
        limit: { kind: "depth", value: 14 },
      };
    }

    function makeResult(
      job: QuickPassJob,
      info: EngineInfo | null,
    ): QuickPassCompletedJob {
      return {
        job,
        info,
        bestMove: info ? { move: "e2e4", ponder: null } : null,
        candidateLines: info ? [{ rank: 1, info }] : [],
      };
    }

    function makeScore(value: number): EngineScore {
      return { type: "cp", value, perspective: "white" };
    }

    function testTimeline(): ReviewTimeline {
      return {
        steps: [
          { ply: 0, fen: INITIAL, move: null },
          { ply: 1, fen: AFTER_E4, move: { san: "e4", color: "w", from: "e2", to: "e4", before: INITIAL, after: AFTER_E4 } },
          { ply: 2, fen: AFTER_E5, move: { san: "e5", color: "b", from: "e7", to: "e5", before: AFTER_E4, after: AFTER_E5 } },
          { ply: 3, fen: AFTER_NF3, move: { san: "Nf3", color: "w", from: "g1", to: "f3", before: AFTER_E5, after: AFTER_NF3 } },
          { ply: 4, fen: AFTER_NC6, move: { san: "Nc6", color: "b", from: "b8", to: "c6", before: AFTER_NF3, after: AFTER_NC6 } },
        ],
        totalPlies: 4,
        initialFen: INITIAL,
        finalFen: AFTER_NC6,
        analysisEligible: true,
      };
    }

    function resultsFor(
      timeline: ReviewTimeline,
      scores: Array<{ ply: number; score: EngineScore }>,
    ): QuickPassCompletedJob[] {
      return scores.map((s) => {
        const job = makeJob(s.ply, timeline.steps[s.ply].fen);
        return makeResult(job, {
          depth: 14,
          score: s.score,
          pv: ["e2e4"],
        });
      });
    }

    it("before the first pass completes, the 'Analyze critical moments' button is not rendered", () => {
      mockAnalysisState.status = "running";
      mockAnalysisState.results = [];
      render(<ReviewBoard timeline={testTimeline()} />);
      expect(screen.queryByText("Analyze critical moments")).toBeNull();
    });

    it("after the first pass completes with no critical moves, the button is not rendered", () => {
      const timeline = testTimeline();
      mockAnalysisState.status = "completed";
      mockAnalysisState.results = resultsFor(timeline, [
        { ply: 0, score: makeScore(20) },
        { ply: 1, score: makeScore(20) },
        { ply: 2, score: makeScore(20) },
        { ply: 3, score: makeScore(20) },
        { ply: 4, score: makeScore(20) },
      ]);
      render(<ReviewBoard timeline={timeline} />);
      expect(screen.queryByText("Analyze critical moments")).toBeNull();
    });

    it("after the first pass completes with at least one critical move, the button is rendered and startCriticalPass has NOT been called", () => {
      const timeline = testTimeline();
      mockAnalysisState.status = "completed";
      mockAnalysisState.results = resultsFor(timeline, [
        { ply: 0, score: makeScore(20) },
        { ply: 1, score: makeScore(20) },
        { ply: 2, score: makeScore(400) },
        { ply: 3, score: makeScore(400) },
        { ply: 4, score: makeScore(400) },
      ]);
      render(<ReviewBoard timeline={timeline} />);
      expect(screen.getByText("Analyze critical moments")).toBeInTheDocument();
      expect(mockAnalysisState.startCriticalPass).not.toHaveBeenCalled();
    });

    it("clicking the button calls startCriticalPass exactly once, and its second argument equals { kind: \"depth\", value: 18 } and its third argument equals 3", () => {
      const timeline = testTimeline();
      mockAnalysisState.status = "completed";
      mockAnalysisState.results = resultsFor(timeline, [
        { ply: 0, score: makeScore(20) },
        { ply: 1, score: makeScore(20) },
        { ply: 2, score: makeScore(400) },
        { ply: 3, score: makeScore(400) },
        { ply: 4, score: makeScore(400) },
      ]);
      render(<ReviewBoard timeline={timeline} />);
      const btn = screen.getByText("Analyze critical moments");
      fireEvent.click(btn);
      expect(mockAnalysisState.startCriticalPass).toHaveBeenCalledTimes(1);
      expect(mockAnalysisState.startCriticalPass.mock.calls[0][1]).toEqual({ kind: "depth", value: 18 });
      expect(mockAnalysisState.startCriticalPass.mock.calls[0][2]).toBe(3);
    });

    it("after the deep pass completes and the classified moves change, clicking the button again passes the SAME first argument value as the first click (selection stability)", () => {
      const timeline = testTimeline();
      mockAnalysisState.status = "completed";
      const initialResults = resultsFor(timeline, [
        { ply: 0, score: makeScore(20) },
        { ply: 1, score: makeScore(20) },
        { ply: 2, score: makeScore(400) },
        { ply: 3, score: makeScore(400) },
        { ply: 4, score: makeScore(400) },
      ]);
      mockAnalysisState.results = initialResults;

      const { rerender } = render(<ReviewBoard timeline={timeline} />);
      const btn = screen.getByText("Analyze critical moments");
      fireEvent.click(btn);

      const firstClickArg = mockAnalysisState.startCriticalPass.mock.calls[0][0];

      mockAnalysisState.status = "completed";
      mockAnalysisState.results = resultsFor(timeline, [
        { ply: 0, score: makeScore(0) },
        { ply: 1, score: makeScore(500) },
        { ply: 2, score: makeScore(-300) },
        { ply: 3, score: makeScore(600) },
        { ply: 4, score: makeScore(0) },
      ]);
      rerender(<ReviewBoard timeline={timeline} />);

      const btn2 = screen.getByText("Analyze critical moments");
      fireEvent.click(btn2);

      const secondClickArg = mockAnalysisState.startCriticalPass.mock.calls[1][0];
      expect(secondClickArg).toBe(firstClickArg);
    });

    it("the button is visible on the render caused by completion, with no further interaction", () => {
      const timeline = testTimeline();
      mockAnalysisState.status = "running";
      mockAnalysisState.results = [];
      const { rerender } = render(<ReviewBoard timeline={timeline} />);
      expect(screen.queryByText("Analyze critical moments")).toBeNull();

      act(() => {
        mockAnalysisState.results = resultsFor(timeline, [
          { ply: 0, score: makeScore(20) },
          { ply: 1, score: makeScore(20) },
          { ply: 2, score: makeScore(400) },
          { ply: 3, score: makeScore(400) },
          { ply: 4, score: makeScore(400) },
        ]);
        mockAnalysisState.status = "completed";
        rerender(<ReviewBoard timeline={timeline} />);
      });

      expect(screen.getByText("Analyze critical moments")).toBeInTheDocument();
    });

    it("loading a different timeline hides the button again", () => {
      const timeline = testTimeline();
      mockAnalysisState.status = "completed";
      mockAnalysisState.results = resultsFor(timeline, [
        { ply: 0, score: makeScore(20) },
        { ply: 1, score: makeScore(20) },
        { ply: 2, score: makeScore(400) },
        { ply: 3, score: makeScore(400) },
        { ply: 4, score: makeScore(400) },
      ]);
      const { rerender } = render(<ReviewBoard timeline={timeline} />);
      expect(screen.getByText("Analyze critical moments")).toBeInTheDocument();

      const differentTimeline = timelineOf('[Event "Other"]\n1. d4 d5 *');
      rerender(<ReviewBoard timeline={differentTimeline} />);
      expect(screen.queryByText("Analyze critical moments")).toBeNull();
    });
  });

  describe("board classification badges", () => {
    function badgeResult(
      timeline: ReviewTimeline,
      ply: number,
      score: EngineScore,
    ): QuickPassCompletedJob {
      const info: EngineInfo = { depth: 14, score, pv: ["e2e4"] };
      return {
        job: {
          id: `badge-${ply}`,
          phase: "quick-pass",
          ply,
          fen: timeline.steps[ply].fen,
          limit: { kind: "depth", value: 14 },
        },
        info,
        bestMove: { move: "e2e4", ponder: null },
        candidateLines: [{ rank: 1, info }],
      };
    }

    afterEach(() => {
      mockAnalysisState.status = "idle";
      mockAnalysisState.results = [];
    });

    it("renders exactly one badge: the currently selected move's classification", () => {
      const timeline = timelineOf(SHORT_GAME);
      mockAnalysisState.status = "completed";
      mockAnalysisState.results = [
        badgeResult(timeline, 0, { type: "cp", value: 100, perspective: "white" }),
        badgeResult(timeline, 1, { type: "cp", value: 100, perspective: "white" }),
        badgeResult(timeline, 2, { type: "cp", value: 150, perspective: "white" }),
        badgeResult(timeline, 3, { type: "cp", value: 130, perspective: "white" }),
        badgeResult(timeline, 4, { type: "cp", value: 130, perspective: "white" }),
      ];

      render(<ReviewBoard timeline={timeline} />);

      // At the start position no move is selected, so no badge exists.
      expect(screen.queryByTestId("board-classification-cell")).toBeNull();

      // 1. e4 is classified "best"; its badge sits on e4 (file e, rank 4).
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      const bestBadge = screen.getByTestId("board-classification-cell");
      expect(bestBadge.getAttribute("data-ply")).toBe("1");
      expect(
        within(bestBadge).getByTestId("board-classification-badge").getAttribute("data-classification")
      ).toBe("best");
      expect(bestBadge.style.left).toBe("50%");
      expect(bestBadge.style.top).toBe("50%");

      // Navigating on replaces the badge with the new move's verdict.
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      const badges = screen.getAllByTestId("board-classification-cell");
      expect(badges).toHaveLength(1);
      expect(badges[0].getAttribute("data-ply")).toBe("2");

      fireEvent.click(screen.getByRole("button", { name: "End" }));
      const lastBadges = screen.getAllByTestId("board-classification-cell");
      expect(lastBadges).toHaveLength(1);
      expect(lastBadges[0].getAttribute("data-ply")).toBe("4");

      fireEvent.click(screen.getByRole("button", { name: "Start" }));
      expect(screen.queryByTestId("board-classification-cell")).toBeNull();
    });

    it("shows the book badge when the current ply is an unclassified book move", () => {
      // 1. e4 is book; 1...a6 leaves it. With no ply-0 result, 1. e4 cannot be
      // assessed (delta missing) so it stays unclassified - and book.
      const timeline = timelineOf('[Event "T"]\n[White "A"]\n[Black "B"]\n1. e4 a6 *');
      mockAnalysisState.status = "completed";
      mockAnalysisState.results = [
        badgeResult(timeline, 1, { type: "cp", value: 100, perspective: "white" }),
        badgeResult(timeline, 2, { type: "cp", value: 10, perspective: "white" }),
      ];

      render(<ReviewBoard timeline={timeline} />);
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      const cell = screen.getByTestId("board-classification-cell");
      expect(cell.getAttribute("data-ply")).toBe("1");
      expect(
        within(cell).getByTestId("board-classification-badge").getAttribute("data-classification")
      ).toBe("book");
      expect(cell.style.left).toBe("50%");
      expect(cell.style.top).toBe("50%");

      // Stepping to 1...a6 replaces the book badge with the move's verdict.
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      const cell2 = screen.getByTestId("board-classification-cell");
      expect(cell2.getAttribute("data-ply")).toBe("2");
      expect(
        within(cell2).getByTestId("board-classification-badge").getAttribute("data-classification")
      ).not.toBe("book");
      expect(cell2.style.left).toBe("0%");
      expect(cell2.style.top).toBe("25%");
    });

    it("repositions the badge when the board is flipped", () => {
      const timeline = timelineOf(SHORT_GAME);
      mockAnalysisState.status = "completed";
      mockAnalysisState.results = [
        badgeResult(timeline, 0, { type: "cp", value: 100, perspective: "white" }),
        badgeResult(timeline, 1, { type: "cp", value: 100, perspective: "white" }),
        badgeResult(timeline, 2, { type: "cp", value: 150, perspective: "white" }),
        badgeResult(timeline, 3, { type: "cp", value: 130, perspective: "white" }),
        badgeResult(timeline, 4, { type: "cp", value: 130, perspective: "white" }),
      ];

      render(<ReviewBoard timeline={timeline} />);
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Flip board" }));

      const cell = screen.getByTestId("board-classification-cell");
      // e4 from Black's side: file e starts at the 3rd column edge, rank 4 the 3rd row edge.
      expect(cell.style.left).toBe("37.5%");
      expect(cell.style.top).toBe("37.5%");
    });

  describe("custom variation branches", () => {
    function scoredResults(timeline: ReviewTimeline): QuickPassCompletedJob[] {
      const scores = [100, 100, 150, 130, 130];
      const results: QuickPassCompletedJob[] = [];
      for (let ply = 0; ply < scores.length && ply <= timeline.totalPlies; ply += 1) {
        const info: EngineInfo = { depth: 14, score: { type: "cp", value: scores[ply], perspective: "white" }, pv: ["e2e4"] };
        results.push({
          job: {
            id: `cv-${ply}`,
            phase: "quick-pass",
            ply,
            fen: timeline.steps[ply].fen,
            limit: { kind: "depth", value: 14 },
          },
          info,
          bestMove: { move: "e2e4", ponder: null },
          candidateLines: [{ rank: 1, info }],
        });
      }
      return results;
    }

    function setupAnalyzedGame(pgn = SHORT_GAME) {
      const timeline = timelineOf(pgn);
      mockAnalysisState.status = "completed";
      mockAnalysisState.results = scoredResults(timeline);
      render(<ReviewBoard timeline={timeline} />);
      return timeline;
    }

    afterEach(() => {
      mockAnalysisState.status = "idle";
      mockAnalysisState.results = [];
    });

    it("creates a temporary variation when a custom move is dropped", () => {
      setupAnalyzedGame();

      fireEvent.click(screen.getByTestId("simulate-drop"));

      // The board shows the custom position; the strip gains a branch group.
      expect(screen.getByTestId("chessboard").getAttribute("data-position")).toContain("4P3");
      const branchMoves = screen.getAllByTestId("branch-move");
      expect(branchMoves).toHaveLength(1);
      expect(branchMoves[0].textContent).toContain("1. e4");
      expect(screen.getByTestId("branch-separator")).toBeInTheDocument();
      // The original game chip is untouched and still present.
      expect(screen.getAllByRole("button", { name: /1\. e4/ }).length).toBeGreaterThanOrEqual(2);
      // The custom-move panel describes the temporary branch.
      expect(screen.getByTestId("custom-move-panel")).toBeInTheDocument();
      expect(screen.getByTestId("custom-move-label").textContent).toBe("+1. e4");
    });

    it("steps back out of the variation with Previous while keeping it cached", () => {
      setupAnalyzedGame();
      fireEvent.click(screen.getByTestId("simulate-drop"));
      expect(screen.getByTestId("custom-move-panel")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Previous" }));

      // Back at the game position, the branch is no longer active…
      expect(screen.getByTestId("chessboard").getAttribute("data-position")).toContain(
        "8/8/8/8/PPPPPPPP"
      );
      expect(screen.queryByTestId("custom-move-panel")).toBeNull();
      // …but stays attached to the position so it can be re-entered.
      const branchMoves = screen.getAllByTestId("branch-move");
      expect(branchMoves).toHaveLength(1);
      expect(branchMoves[0].getAttribute("aria-current")).toBeNull();

      fireEvent.click(branchMoves[0]);

      // Re-entering reuses the cached variation without another drop.
      expect(screen.getByTestId("chessboard").getAttribute("data-position")).toContain("4P3");
      expect(screen.getByTestId("custom-move-panel")).toBeInTheDocument();
      expect(screen.getAllByTestId("branch-move")[0].getAttribute("aria-current")).toBe("true");
    });

    it("multi-move variations pop one move at a time via Previous", () => {
      setupAnalyzedGame();
      fireEvent.click(screen.getByTestId("simulate-drop"));
      fireEvent.click(screen.getByTestId("simulate-second-drop"));
      expect(screen.getAllByTestId("branch-move")).toHaveLength(2);

      fireEvent.click(screen.getByRole("button", { name: "Previous" }));
      let branchMoves = screen.getAllByTestId("branch-move");
      expect(branchMoves).toHaveLength(2);
      expect(branchMoves[0].getAttribute("aria-current")).toBe("true");
      expect(branchMoves[1].getAttribute("aria-current")).toBeNull();

      fireEvent.click(screen.getByRole("button", { name: "Previous" }));
      branchMoves = screen.getAllByTestId("branch-move");
      expect(branchMoves[0].getAttribute("aria-current")).toBeNull();
      expect(screen.queryByTestId("custom-move-panel")).toBeNull();
      expect(screen.getByTestId("chessboard").getAttribute("data-position")).not.toContain("4P3/5N2");
    });

    it("navigating the game timeline hides the active branch but keeps it cached", () => {
      setupAnalyzedGame();
      fireEvent.click(screen.getByTestId("simulate-drop"));
      fireEvent.click(screen.getByRole("button", { name: "End" }));

      expect(screen.queryByTestId("custom-move-panel")).toBeNull();

      fireEvent.click(screen.getByRole("button", { name: "Start" }));
      const branchMoves = screen.getAllByTestId("branch-move");
      expect(branchMoves).toHaveLength(1);
      expect(branchMoves[0].getAttribute("aria-current")).toBeNull();
    });
  });

    it("highlights the current move's from and to squares", () => {
      const timeline = timelineOf(SHORT_GAME);
      mockAnalysisState.status = "completed";
      mockAnalysisState.results = [
        badgeResult(timeline, 0, { type: "cp", value: 100, perspective: "white" }),
        badgeResult(timeline, 1, { type: "cp", value: 100, perspective: "white" }),
        badgeResult(timeline, 2, { type: "cp", value: 150, perspective: "white" }),
        badgeResult(timeline, 3, { type: "cp", value: 130, perspective: "white" }),
        badgeResult(timeline, 4, { type: "cp", value: 130, perspective: "white" }),
      ];

      render(<ReviewBoard timeline={timeline} />);

      // No move selected at the start position.
      expect(screen.queryByTestId("current-move-highlight")).toBeNull();

      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      const highlights = screen.getAllByTestId("current-move-highlight");
      expect(highlights).toHaveLength(2);
      // 1. e4: from e2 (file e, rank 2) and to e4 (file e, rank 4).
      const squares = highlights.map((h) => h.getAttribute("data-square")).sort();
      expect(squares).toEqual(["e2", "e4"]);

      fireEvent.click(screen.getByRole("button", { name: "Start" }));
      expect(screen.queryByTestId("current-move-highlight")).toBeNull();
    });
  });
});
